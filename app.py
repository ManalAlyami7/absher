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

# Suppress sklearn version warnings
warnings.filterwarnings('ignore', category=UserWarning)

app = FastAPI(
    title="Tanabbah URL Phishing Detection API",
    description="API for detecting phishing URLs using Machine Learning",
    version="1.0.0"
)

# CORS middleware - update origins for production
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the trained model
model = None  # Initialize as None
MODEL_LOADED = False

try:
    import joblib
    import os
    
    # Check if model file exists
    if not os.path.exists('rf_model.pkl'):
        print("⚠️ Model file 'rf_model.pkl' not found. Running without ML predictions.")
    else:
        file_size = os.path.getsize('rf_model.pkl')
        print(f"📊 Model file size: {file_size / 1024:.2f} KB")
        
        if file_size < 1024:  # Less than 1 KB - likely a Git LFS pointer
            print("⚠️ Model file appears to be a Git LFS pointer, not the actual model.")
            print("💡 Please run 'git lfs pull' and redeploy.")
        else:
            try:
                # Try joblib first (recommended for sklearn)
                model = joblib.load('rf_model.pkl')
                MODEL_LOADED = True
                print("✅ Model loaded successfully with joblib")
            except Exception as e:
                print(f"⚠️ Joblib loading failed: {e}")
                try:
                    # Fallback to pickle
                    with open('rf_model.pkl', 'rb') as f:
                        model = pickle.load(f)
                    MODEL_LOADED = True
                    print("✅ Model loaded successfully with pickle")
                except Exception as e2:
                    print(f"⚠️ Pickle loading failed: {e2}")
                    print("❌ Running without ML predictions.")
                    
except Exception as e:
    print(f"❌ Unexpected error loading model: {e}")
    print("🔄 API will run without ML predictions.")

print(f"\n{'='*50}")
print(f"🤖 Model Status: {'✅ LOADED' if MODEL_LOADED else '⚠️ NOT LOADED (Rule-based only)'}")
print(f"{'='*50}\n")


# Request/Response Models
class AnalyzeRequest(BaseModel):
    message: str
    
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
    prediction: int  # 0: legitimate, 1: phishing
    probability: float
    features: Dict[str, float]


class AnalyzeResponse(BaseModel):
    message: str
    urls_found: int
    url_predictions: List[URLPrediction]
    ml_risk_score: float
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
    if model is None:
        # Fallback prediction if model not loaded
        return URLPrediction(
            url=url,
            prediction=0,
            probability=0.5,
            features={}
        )
    
    # Extract features
    features = extract_url_features(url)
    
    # Prepare feature vector in correct order
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
    
    # Make prediction
    prediction = model.predict(feature_vector)[0]
    probability = model.predict_proba(feature_vector)[0][1]  # Probability of phishing
    
    return URLPrediction(
        url=url,
        prediction=int(prediction),
        probability=round(float(probability), 4),
        features=features
    )


# API Endpoints
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Tanabbah URL Phishing Detection API",
        "model_loaded": model is not None,
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy" if model is not None else "degraded",
        "model_loaded": model is not None,
        "endpoints": ["/", "/health", "/api/analyze", "/api/report"]
    }


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_message(request: AnalyzeRequest):
    """
    Analyze a message for phishing URLs
    
    - Extracts URLs from the message
    - Predicts if each URL is phishing or legitimate
    - Returns overall risk score
    """
    try:
        message = request.message
        
        # Extract URLs from message
        urls = extract_urls(message)
        
        # Predict each URL
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
            except Exception as e:
                print(f"Error predicting URL {url}: {e}")
                continue
        
        # Calculate overall ML risk score
        if len(url_predictions) > 0:
            avg_probability = total_phishing_probability / len(url_predictions)
            ml_risk_score = round(avg_probability * 100, 2)
        else:
            ml_risk_score = 0.0
        
        return AnalyzeResponse(
            message=message,
            urls_found=len(urls),
            url_predictions=url_predictions,
            ml_risk_score=ml_risk_score,
            status="success"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/report")
async def report_message(request: ReportRequest):
    """
    Endpoint for reporting fraudulent messages
    
    In production, this would:
    - Store reports in database
    - Send to authorities
    - Track patterns
    """
    try:
        # For now, just log the report
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
    
    # Get port from environment variable (Railway sets this)
    port = int(os.getenv("PORT", 8080))
    
    print("\n" + "="*60)
    print("🚀 Starting Tanabbah API Server...")
    print("="*60)
    print(f"📊 Model status: {'✅ Loaded' if model else '⚠️ Not loaded'}")
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