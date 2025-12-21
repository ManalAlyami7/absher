"""
========================================
Tanabbah - FastAPI Backend
========================================
Purpose: API endpoints for message/URL analysis
Author: Manal Alyami
Version: 2.0.0
========================================
"""

import os
import re
import math
import json
import warnings
from datetime import datetime
from typing import List, Optional, Dict
from collections import Counter
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

# Suppress warnings
warnings.filterwarnings('ignore', category=UserWarning)

# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

app = FastAPI(
    title="Tanabbah Enhanced URL & Message Phishing Detection API",
    description="API for detecting phishing using ML + LLM",
    version="2.0.0"
)

# ============================================================================
# CORS CONFIGURATION
# ============================================================================

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# LLM INITIALIZATION
# ============================================================================

# Initialize HuggingFace client for LLM analysis
HF_API_KEY = os.getenv("HF_API_KEY")
llm_client = None

try:
    from huggingface_hub import InferenceClient
    
    if HF_API_KEY:
        llm_client = InferenceClient(token=HF_API_KEY)
        print(f"✅ HuggingFace LLM initialized with API key")
    else:
        llm_client = InferenceClient()
        print(f"⚠️ HuggingFace LLM initialized (free tier - rate limited)")
        print(f"💡 Set HF_API_KEY environment variable for better reliability")
except Exception as e:
    print(f"⚠️ LLM disabled: {e}")
    llm_client = None

LLM_MODEL = "mistralai/Mistral-7B-Instruct-v0.2"

# ============================================================================
# ML MODEL LOADING
# ============================================================================

model = None
MODEL_LOADED = False

def load_model():
    """Lazy load the ML model"""
    global model, MODEL_LOADED
    
    if MODEL_LOADED:
        return model
    
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

# Try to load model at startup
print("\n" + "="*60)
print("🚀 API Starting - Attempting to load ML model...")
print("="*60 + "\n")

model = load_model()
if model:
    print("✅ ML Model loaded successfully at startup!")
else:
    print("⚠️ ML Model not available - using rule-based detection only")

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class AnalyzeRequest(BaseModel):
    """Request model for message analysis"""
    message: str
    enable_llm: Optional[bool] = True
    
    @field_validator('message')
    @classmethod
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError('Message cannot be empty')
        if len(v) > 5000:
            raise ValueError('Message too long (max 5000 characters)')
        return v.strip()


class URLPrediction(BaseModel):
    """Model for URL prediction result"""
    url: str
    prediction: int
    probability: float
    features: Dict[str, float]


class LLMAnalysis(BaseModel):
    """Model for LLM analysis result"""
    is_phishing: bool
    confidence: float
    reasoning: str
    red_flags: List[str]
    context_score: int
    model_used: str


class AnalyzeResponse(BaseModel):
    """Response model for message analysis"""
    message: str
    urls_found: int
    url_predictions: List[URLPrediction]
    ml_risk_score: float
    llm_analysis: Optional[LLMAnalysis]
    combined_risk_score: float
    status: str


class ReportRequest(BaseModel):
    """Request model for fraud report"""
    message: str
    timestamp: str
    language: str

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

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
    """Extract 41 features from URL for ML model"""
    features = {}
    
    # URL-level features
    features['url_length'] = len(url)
    features['number_of_dots_in_url'] = url.count('.')
    features['having_repeated_digits_in_url'] = 1 if re.search(r'(\d)\1', url) else 0
    features['number_of_digits_in_url'] = sum(c.isdigit() for c in url)
    
    # Special characters
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
    
    return list(set(urls))


def predict_url(url: str) -> URLPrediction:
    """Predict if a URL is phishing or legitimate"""
    import numpy as np
    
    current_model = load_model()
    features = extract_url_features(url)
    
    if current_model is None:
        # Heuristic scoring when model not available
        suspicious_score = 0.5
        
        if any(shortener in url.lower() for shortener in ['bit.ly', 'tinyurl', 'goo.gl']):
            suspicious_score += 0.3
        if url.count('.') > 3:
            suspicious_score += 0.2
        if any(char in url for char in ['@', '%']):
            suspicious_score += 0.1
            
        suspicious_score = min(1.0, suspicious_score)
        
        return URLPrediction(
            url=url,
            prediction=1 if suspicious_score > 0.6 else 0,
            probability=round(suspicious_score, 4),
            features=features
        )
    
    # Use ML model
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


async def analyze_message_with_llm(message: str, urls: List[str]) -> Optional[LLMAnalysis]:
    """Use HuggingFace LLM to analyze message for phishing indicators"""
    if not llm_client:
        return None
    
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

Respond ONLY with valid JSON in this exact format (no other text):
{"is_phishing": true/false, "confidence": 0-100, "reasoning": "brief explanation", "red_flags": ["flag1", "flag2"], "context_score": 0-100}"""

    user_message = f"""Analyze this message:

MESSAGE:
{message}

URLS FOUND:
{urls_text}"""

    try:
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ]
        
        response = llm_client.chat_completion(
            messages=messages,
            model=LLM_MODEL,
            max_tokens=500,
            temperature=0.3
        )
        
        response_text = response.choices[0].message.content
        
        # Extract JSON from response
        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text, re.DOTALL)
        
        if json_match:
            json_str = json_match.group().strip()
            json_str = json_str.replace('```', '').strip()
            analysis_data = json.loads(json_str)
            
            return LLMAnalysis(
                is_phishing=analysis_data.get("is_phishing", False),
                confidence=float(analysis_data.get("confidence", 50)),
                reasoning=analysis_data.get("reasoning", "Analysis completed"),
                red_flags=analysis_data.get("red_flags", []),
                context_score=int(analysis_data.get("context_score", 50)),
                model_used=LLM_MODEL
            )
        
    except Exception as e:
        print(f"❌ LLM error: {e}")
    
    return None

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Tanabbah Enhanced Phishing Detection API",
        "model_loaded": MODEL_LOADED,
        "llm_enabled": llm_client is not None,
        "version": "2.0.0",
        "message": "API is running. Use /docs for documentation."
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    import sys
    
    return {
        "status": "healthy",
        "model_loaded": MODEL_LOADED,
        "llm_enabled": llm_client is not None,
        "python_version": sys.version,
        "endpoints": ["/", "/health", "/api/analyze", "/api/report"]
    }


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_message(request: AnalyzeRequest):
    """Analyze a message for phishing URLs and content"""
    try:
        message = request.message
        enable_llm = request.enable_llm
        
        print(f"\n{'='*60}")
        print(f"📨 New Analysis Request")
        print(f"{'='*60}")
        print(f"Message: {message[:100]}...")
        
        # Extract URLs
        urls = extract_urls(message)
        print(f"🔗 URLs Found: {len(urls)}")
        
        # ML: Predict each URL
        url_predictions = []
        total_phishing_probability = 0.0
        
        for url in urls:
            try:
                prediction = predict_url(url)
                url_predictions.append(prediction)
                total_phishing_probability += prediction.probability
                print(f"  • {url}: {prediction.probability:.2%} phishing")
            except Exception as e:
                print(f"⚠️ Error predicting URL {url}: {e}")
        
        # Calculate ML risk score
        ml_risk_score = round(
            (total_phishing_probability / len(url_predictions) * 100) 
            if url_predictions else 0.0,
            2
        )
        
        print(f"🤖 ML Risk Score: {ml_risk_score}%")
        
        # LLM: Analyze message
        llm_analysis = None
        if enable_llm and llm_client:
            print(f"🧠 Starting LLM analysis...")
            llm_analysis = await analyze_message_with_llm(message, urls)
            if llm_analysis:
                print(f"✅ LLM Analysis Complete")
        
        # Combine scores
        combined_risk_score = ml_risk_score
        
        if llm_analysis:
            llm_score = llm_analysis.context_score if llm_analysis.is_phishing else (100 - llm_analysis.context_score)
            combined_risk_score = round((ml_risk_score * 0.4) + (llm_score * 0.6), 2)
        
        print(f"🎯 Combined Risk Score: {combined_risk_score}%")
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
        print(f"❌ Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/report")
async def report_message(request: ReportRequest):
    """Endpoint for reporting fraudulent messages"""
    try:
        print(f"📋 Report received:")
        print(f"   Language: {request.language}")
        print(f"   Timestamp: {request.timestamp}")
        
        return {
            "status": "success",
            "message": "Report received successfully",
            "report_id": f"RPT-{hash(request.message) % 1000000}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report submission failed: {str(e)}")


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8080))
    
    print("\n" + "="*60)
    print("🚀 Starting Tanabbah Enhanced API Server...")
    print("="*60)
    print(f"📊 ML Model status: {'✅ Loaded' if MODEL_LOADED else '⚠️ Not loaded'}")
    print(f"🤖 LLM status: {'✅ Enabled' if llm_client else '⚠️ Disabled'}")
    print(f"🌐 Port: {port}")
    print("="*60 + "\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )