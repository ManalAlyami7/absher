import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict
import pickle
import re
from urllib.parse import urlparse
import numpy as np
import math
from collections import Counter
import warnings
import json
from huggingface_hub import InferenceClient
from datetime import datetime

# Suppress sklearn version warnings
warnings.filterwarnings('ignore', category=UserWarning)

app = FastAPI(
    title="Tanabbah Enhanced URL & Message Phishing Detection API",
    description="API for detecting phishing using ML + LLM",
    version="2.0.0"
)

# CORS middleware
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize HuggingFace client
HF_API_KEY = os.getenv("HF_API_KEY")  # REQUIRED for LLM to work reliably
llm_client = None

# BEST FREE MODELS FOR PHISHING DETECTION (verified working):
# 1. "mistralai/Mistral-7B-Instruct-v0.2" - Most reliable, always works
# 2. "google/flan-t5-large" - Fast, simple format
# 3. "bigscience/bloom-560m" - Lightweight fallback

LLM_MODEL = "mistralai/Mistral-7B-Instruct-v0.2"  # Most reliable

if HF_API_KEY:
    try:
        llm_client = InferenceClient(token=HF_API_KEY)
        print(f"✅ HuggingFace LLM initialized with API key: {LLM_MODEL}")
    except Exception as e:
        print(f"⚠️ Failed to initialize HuggingFace: {e}")
        llm_client = None
else:
    # Free tier without API key (rate limited but should work)
    try:
        llm_client = InferenceClient()
        print(f"⚠️ HuggingFace LLM initialized (free tier - rate limited): {LLM_MODEL}")
        print(f"💡 Set HF_API_KEY environment variable for better reliability")
    except Exception as e:
        print(f"⚠️ LLM disabled: {e}")
        llm_client = None

# LAZY LOAD MODEL
model = None
MODEL_LOADED = False
MODEL_LOADING = False

def load_model():
    """Lazy load the model only when needed"""
    global model, MODEL_LOADED, MODEL_LOADING
    
    if MODEL_LOADED:
        return model
    
    if MODEL_LOADING:
        return None
    
    MODEL_LOADING = True
    
    try:
        import joblib
        
        if not os.path.exists('rf_model.pkl'):
            print("⚠️ Model file not found. Using rule-based detection only.")
            return None
        
        file_size = os.path.getsize('rf_model.pkl')
        print(f"📊 Loading model ({file_size / 1024:.2f} KB)...")
        
        if file_size < 1024:
            print("⚠️ Model appears to be a Git LFS pointer.")
            return None
        
        model = joblib.load('rf_model.pkl')
        MODEL_LOADED = True
        print("✅ Model loaded successfully!")
        return model
        
    except Exception as e:
        print(f"⚠️ Model loading failed: {e}")
        return None
    finally:
        MODEL_LOADING = False

print("\n" + "="*50)
print("🚀 API Starting - Model will load on first use")
print("="*50 + "\n")


# Request/Response Models
class AnalyzeRequest(BaseModel):
    message: str
    enable_llm: Optional[bool] = True  # Allow disabling LLM for faster response
    
    @field_validator('message')
    @classmethod
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError('Message cannot be empty')
        if len(v) > 5000:
            raise ValueError('Message too long (max 5000 characters)')
        return v.strip()


class URLPrediction(BaseModel):
    url: str
    prediction: int
    probability: float
    features: Dict[str, float]


class LLMAnalysis(BaseModel):
    is_phishing: bool
    confidence: float  # 0-100
    reasoning: str
    red_flags: List[str]
    context_score: int  # 0-100
    model_used: str


class AnalyzeResponse(BaseModel):
    message: str
    urls_found: int
    url_predictions: List[URLPrediction]
    ml_risk_score: float
    llm_analysis: Optional[LLMAnalysis]
    combined_risk_score: float
    status: str


class ReportRequest(BaseModel):
    message: str
    timestamp: str
    language: str


# Helper Functions
def calculate_entropy(text: str) -> float:
    """Calculate Shannon entropy of a string"""
    if not text:
        return 0.0
    
    counter = Counter(text)
    length = len(text)
    entropy = 0.0
    
    for count in counter.values():
        probability = count / length
        if probability > 0:
            entropy -= probability * math.log2(probability)
    
    return round(entropy, 4)


def extract_url_features(url: str) -> Dict[str, float]:
    """Extract all 41 features from URL"""
    features = {}
    
    # URL-level features
    features['url_length'] = len(url)
    features['number_of_dots_in_url'] = url.count('.')
    features['having_repeated_digits_in_url'] = 1 if re.search(r'(\d)\1', url) else 0
    features['number_of_digits_in_url'] = sum(c.isdigit() for c in url)
    
    # Special characters in URL
    special_chars = set('!@#$%^&*()_+-=[]{}|;:,.<>?/~`')
    features['number_of_special_char_in_url'] = sum(c in special_chars for c in url)
    features['number_of_hyphens_in_url'] = url.count('-')
    features['number_of_underline_in_url'] = url.count('_')
    features['number_of_slash_in_url'] = url.count('/')
    features['number_of_questionmark_in_url'] = url.count('?')
    features['number_of_equal_in_url'] = url.count('=')
    features['number_of_at_in_url'] = url.count('@')
    features['number_of_dollar_in_url'] = url.count('$')
    features['number_of_exclamation_in_url'] = url.count('!')
    features['number_of_hashtag_in_url'] = url.count('#')
    features['number_of_percent_in_url'] = url.count('%')
    
    # Parse URL components
    try:
        parsed = urlparse(url)
        domain = parsed.netloc
        path = parsed.path
        query = parsed.query
        fragment = parsed.fragment
    except:
        domain = path = query = fragment = ''
    
    # Domain features
    features['domain_length'] = len(domain)
    features['number_of_dots_in_domain'] = domain.count('.')
    features['number_of_hyphens_in_domain'] = domain.count('-')
    features['having_special_characters_in_domain'] = 1 if any(c in special_chars for c in domain) else 0
    features['number_of_special_characters_in_domain'] = sum(c in special_chars for c in domain)
    features['having_digits_in_domain'] = 1 if any(c.isdigit() for c in domain) else 0
    features['number_of_digits_in_domain'] = sum(c.isdigit() for c in domain)
    features['having_repeated_digits_in_domain'] = 1 if re.search(r'(\d)\1', domain) else 0
    
    # Subdomain features
    subdomains = domain.split('.')
    features['number_of_subdomains'] = len(subdomains) - 1 if len(subdomains) > 1 else 0
    
    if len(subdomains) > 1:
        subdomain_part = '.'.join(subdomains[:-2]) if len(subdomains) > 2 else subdomains[0]
        features['having_dot_in_subdomain'] = 1 if '.' in subdomain_part else 0
        features['having_hyphen_in_subdomain'] = 1 if '-' in subdomain_part else 0
        features['average_subdomain_length'] = sum(len(s) for s in subdomains[:-1]) / max(len(subdomains)-1, 1)
        features['average_number_of_dots_in_subdomain'] = subdomain_part.count('.') / max(len(subdomains)-1, 1)
        features['average_number_of_hyphens_in_subdomain'] = subdomain_part.count('-') / max(len(subdomains)-1, 1)
        features['having_special_characters_in_subdomain'] = 1 if any(c in special_chars for c in subdomain_part) else 0
        features['number_of_special_characters_in_subdomain'] = sum(c in special_chars for c in subdomain_part)
        features['having_digits_in_subdomain'] = 1 if any(c.isdigit() for c in subdomain_part) else 0
        features['number_of_digits_in_subdomain'] = sum(c.isdigit() for c in subdomain_part)
        features['having_repeated_digits_in_subdomain'] = 1 if re.search(r'(\d)\1', subdomain_part) else 0
    else:
        features['having_dot_in_subdomain'] = 0
        features['having_hyphen_in_subdomain'] = 0
        features['average_subdomain_length'] = 0
        features['average_number_of_dots_in_subdomain'] = 0
        features['average_number_of_hyphens_in_subdomain'] = 0
        features['having_special_characters_in_subdomain'] = 0
        features['number_of_special_characters_in_subdomain'] = 0
        features['having_digits_in_subdomain'] = 0
        features['number_of_digits_in_subdomain'] = 0
        features['having_repeated_digits_in_subdomain'] = 0
    
    # Path and query features
    features['having_path'] = 1 if path and path != '/' else 0
    features['path_length'] = len(path) if path else 0
    features['having_query'] = 1 if query else 0
    features['having_fragment'] = 1 if fragment else 0
    features['having_anchor'] = features['having_fragment']
    
    # Entropy features
    features['entropy_of_url'] = calculate_entropy(url)
    features['entropy_of_domain'] = calculate_entropy(domain)
    
    return features


def extract_urls(text: str) -> List[str]:
    """Extract URLs from text"""
    urls = []
    
    # Extract full URLs with protocol
    full_url_pattern = r'https?://[^\s]+'
    full_urls = re.findall(full_url_pattern, text, re.IGNORECASE)
    urls.extend(full_urls)
    
    # Extract URLs without protocol
    bare_url_pattern = r'(?:^|\s)([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?)'
    bare_urls = re.findall(bare_url_pattern, text)
    
    for url in bare_urls:
        if url not in urls and not url.endswith('.') and '.' in url:
            urls.append(url)
    
    return list(set(urls))  # Remove duplicates


def predict_url(url: str) -> URLPrediction:
    """Predict if a URL is phishing or legitimate"""
    current_model = load_model()
    
    if current_model is None:
        return URLPrediction(
            url=url,
            prediction=0,
            probability=0.5,
            features={}
        )
    
    features = extract_url_features(url)
    
    feature_names = [
        'url_length', 'number_of_dots_in_url', 'having_repeated_digits_in_url',
        'number_of_digits_in_url', 'number_of_special_char_in_url',
        'number_of_hyphens_in_url', 'number_of_underline_in_url',
        'number_of_slash_in_url', 'number_of_questionmark_in_url',
        'number_of_equal_in_url', 'number_of_at_in_url',
        'number_of_dollar_in_url', 'number_of_exclamation_in_url',
        'number_of_hashtag_in_url', 'number_of_percent_in_url',
        'domain_length', 'number_of_dots_in_domain', 'number_of_hyphens_in_domain',
        'having_special_characters_in_domain', 'number_of_special_characters_in_domain',
        'having_digits_in_domain', 'number_of_digits_in_domain',
        'having_repeated_digits_in_domain', 'number_of_subdomains',
        'having_dot_in_subdomain', 'having_hyphen_in_subdomain',
        'average_subdomain_length', 'average_number_of_dots_in_subdomain',
        'average_number_of_hyphens_in_subdomain',
        'having_special_characters_in_subdomain',
        'number_of_special_characters_in_subdomain',
        'having_digits_in_subdomain', 'number_of_digits_in_subdomain',
        'having_repeated_digits_in_subdomain', 'having_path', 'path_length',
        'having_query', 'having_fragment', 'having_anchor',
        'entropy_of_url', 'entropy_of_domain'
    ]
    
    feature_vector = np.array([[features[name] for name in feature_names]])
    
    prediction = current_model.predict(feature_vector)[0]
    probability = current_model.predict_proba(feature_vector)[0][1]
    
    return URLPrediction(
        url=url,
        prediction=int(prediction),
        probability=round(float(probability), 4),
        features=features
    )


# LLM Analysis Function
async def analyze_message_with_llm(message: str, urls: List[str]) -> Optional[LLMAnalysis]:
    """
    Use HuggingFace LLM to analyze message for phishing indicators
    Using chat_completion API instead of text_generation
    """
    if not llm_client:
        print("⚠️ LLM client not initialized")
        return None
    
    # Models that work with conversational/chat API
    models_to_try = [
        "mistralai/Mistral-7B-Instruct-v0.2",
        "meta-llama/Meta-Llama-3-8B-Instruct",
        "microsoft/Phi-3-mini-4k-instruct",
    ]
    
    # Prepare URLs list
    urls_text = "\n".join([f"- {url}" for url in urls]) if urls else "None"
    
    system_message = """You are an expert cybersecurity analyst specializing in phishing detection for Saudi Arabia.

Analyze messages for phishing indicators focusing on:
1. Government impersonation (Absher, Najiz, MOI, etc.)
2. Urgency and pressure tactics
3. Suspicious URLs and link manipulation
4. Social engineering techniques
5. Arabic and English phishing patterns
6. Requests for sensitive information

Official Saudi domains: absher.sa, najiz.sa, *.gov.sa

Respond ONLY with valid JSON in this exact format (no other text or explanation):
{"is_phishing": true/false, "confidence": 0-100, "reasoning": "brief explanation", "red_flags": ["flag1", "flag2"], "context_score": 0-100}"""

    user_message = f"""Analyze this message:

MESSAGE:
{message}

URLS FOUND:
{urls_text}"""

    # Try each model with chat completion API
    for model_name in models_to_try:
        try:
            print(f"🔍 Trying LLM with chat API: {model_name}")
            
            # Use chat_completion instead of text_generation
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ]
            
            response = llm_client.chat_completion(
                messages=messages,
                model=model_name,
                max_tokens=500,
                temperature=0.3,
                top_p=0.9
            )
            
            # Extract response text
            response_text = response.choices[0].message.content
            
            print(f"✅ LLM Response received ({len(response_text)} chars): {response_text[:150]}...")
            
            # Parse JSON response - try multiple patterns
            json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text, re.DOTALL)
            
            if not json_match:
                # Try finding JSON after common prefixes
                for prefix in ["```json", "```", "JSON:", "Response:", "Here's the analysis:"]:
                    if prefix.lower() in response_text.lower():
                        parts = response_text.lower().split(prefix.lower(), 1)
                        if len(parts) > 1:
                            after_prefix = response_text[len(parts[0]) + len(prefix):]
                            json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', after_prefix, re.DOTALL)
                            if json_match:
                                break
            
            if json_match:
                try:
                    json_str = json_match.group().strip()
                    # Clean up common JSON issues
                    json_str = json_str.replace('```', '').strip()
                    analysis_data = json.loads(json_str)
                    print(f"✅ JSON parsed successfully from {model_name}")
                    
                    return LLMAnalysis(
                        is_phishing=analysis_data.get("is_phishing", False),
                        confidence=float(analysis_data.get("confidence", 50)),
                        reasoning=analysis_data.get("reasoning", "Analysis completed"),
                        red_flags=analysis_data.get("red_flags", []),
                        context_score=int(analysis_data.get("context_score", 50)),
                        model_used=model_name
                    )
                except json.JSONDecodeError as je:
                    print(f"⚠️ JSON parse error: {je}")
                    print(f"Matched text: {json_match.group()}")
                    continue
            else:
                print(f"⚠️ No valid JSON found in response from {model_name}")
                print(f"Full response: {response_text}")
                continue
                
        except Exception as e:
            print(f"❌ Error with {model_name}: {type(e).__name__}: {e}")
            continue
    
    # All models failed
    print(f"❌ All LLM models failed. Falling back to ML-only analysis.")
    return None


# API Endpoints
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Tanabbah Enhanced Phishing Detection API",
        "model_loaded": MODEL_LOADED,
        "llm_enabled": llm_client is not None,
        "llm_model": LLM_MODEL if llm_client else None,
        "version": "2.0.0",
        "message": "API is running. Use /docs for documentation."
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    import sys
    
    # Test LLM quickly using chat API
    llm_status = "disabled"
    llm_error = None
    if llm_client:
        try:
            # Quick test with chat completion
            test_response = llm_client.chat_completion(
                messages=[{"role": "user", "content": "Say hello"}],
                model="mistralai/Mistral-7B-Instruct-v0.2",
                max_tokens=10,
                temperature=0.1
            )
            llm_status = "working"
        except Exception as e:
            llm_status = "error"
            llm_error = str(e)
    
    return {
        "status": "healthy",
        "model_loaded": MODEL_LOADED,
        "llm_enabled": llm_client is not None,
        "llm_status": llm_status,
        "llm_error": llm_error,
        "has_api_key": HF_API_KEY is not None and len(HF_API_KEY) > 0,
        "python_version": sys.version,
        "endpoints": ["/", "/health", "/api/analyze", "/api/report"]
    }


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_message(request: AnalyzeRequest):
    """
    Analyze a message for phishing URLs and content
    
    - Extracts URLs from the message
    - Predicts if each URL is phishing (ML model)
    - Analyzes message content with LLM
    - Returns combined risk score
    """
    try:
        message = request.message
        enable_llm = request.enable_llm
        
        print(f"\n{'='*60}")
        print(f"📨 New Analysis Request")
        print(f"{'='*60}")
        print(f"Message: {message[:100]}...")
        print(f"LLM Enabled: {enable_llm}")
        
        # Extract URLs from message
        urls = extract_urls(message)
        print(f"🔗 URLs Found: {len(urls)}")
        
        # ML: Predict each URL
        url_predictions = []
        phishing_count = 0
        total_phishing_probability = 0.0
        
        for url in urls:
            try:
                prediction = predict_url(url)
                url_predictions.append(prediction)
                
                if prediction.prediction == 1:
                    phishing_count += 1
                total_phishing_probability += prediction.probability
                print(f"  • {url}: {prediction.probability:.2%} phishing")
            except Exception as e:
                print(f"⚠️ Error predicting URL {url}: {e}")
                continue
        
        # Calculate ML risk score
        if len(url_predictions) > 0:
            avg_probability = total_phishing_probability / len(url_predictions)
            ml_risk_score = round(avg_probability * 100, 2)
        else:
            ml_risk_score = 0.0
        
        print(f"🤖 ML Risk Score: {ml_risk_score}%")
        
        # LLM: Analyze message context
        llm_analysis = None
        if enable_llm and llm_client:
            print(f"🧠 Starting LLM analysis...")
            llm_analysis = await analyze_message_with_llm(message, urls)
            if llm_analysis:
                print(f"✅ LLM Analysis Complete:")
                print(f"   Is Phishing: {llm_analysis.is_phishing}")
                print(f"   Confidence: {llm_analysis.confidence}%")
                print(f"   Context Score: {llm_analysis.context_score}%")
            else:
                print(f"⚠️ LLM analysis returned None")
        else:
            if not enable_llm:
                print(f"⏭️ LLM disabled by request")
            else:
                print(f"⏭️ LLM client not available")
        
        # Combine scores
        combined_risk_score = ml_risk_score
        
        if llm_analysis:
            # Weight: 40% ML + 60% LLM (LLM is better at context)
            llm_score = llm_analysis.context_score if llm_analysis.is_phishing else (100 - llm_analysis.context_score)
            combined_risk_score = round((ml_risk_score * 0.4) + (llm_score * 0.6), 2)
            print(f"🎯 Combined Risk Score: {combined_risk_score}% (ML: {ml_risk_score}%, LLM: {llm_score}%)")
        else:
            print(f"🎯 Final Risk Score: {combined_risk_score}% (ML only)")
        
        print(f"{'='*60}\n")
        
        return AnalyzeResponse(
            message=message,
            urls_found=len(urls),
            url_predictions=url_predictions,
            ml_risk_score=ml_risk_score,
            llm_analysis=llm_analysis,
            combined_risk_score=combined_risk_score,
            status="success"
        )
        
    except Exception as e:
        print(f"❌ Analysis failed: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/report")
async def report_message(request: ReportRequest):
    """
    Endpoint for reporting fraudulent messages
    """
    try:
        print(f"📋 Report received:")
        print(f"   Language: {request.language}")
        print(f"   Timestamp: {request.timestamp}")
        print(f"   Message: {request.message[:100]}...")
        
        return {
            "status": "success",
            "message": "Report received successfully",
            "report_id": f"RPT-{hash(request.message) % 1000000}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report submission failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    import sys
    
    port = int(os.getenv("PORT", 8080))
    
    print("\n" + "="*60)
    print("🚀 Starting Tanabbah Enhanced API Server...")
    print("="*60)
    print(f"📊 ML Model status: {'✅ Loaded' if MODEL_LOADED else '⚠️ Not loaded'}")
    print(f"🤖 LLM status: {'✅ Enabled' if llm_client else '⚠️ Disabled'}")
    if llm_client:
        print(f"🔧 LLM Model: {LLM_MODEL}")
    if not HF_API_KEY:
        print(f"⚠️ WARNING: No HF_API_KEY set - LLM may be rate limited")
    print(f"🌐 Port: {port}")
    print(f"📚 API Docs: /docs")
    print(f"🧪 Health: /health")
    print("="*60)
    print("💡 Press CTRL+C to stop the server\n")
    sys.stdout.flush()
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True
    )