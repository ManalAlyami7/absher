import os
import re
import math
from collections import Counter
from urllib.parse import urlparse
from typing import Dict
from pydantic import BaseModel
import warnings

warnings.filterwarnings('ignore', category=UserWarning)

# ----------------------
# URL Prediction Model
# ----------------------

model = None
MODEL_LOADED = False

class URLPrediction(BaseModel):
    url: str
    prediction: int
    probability: float
    features: Dict[str, float]

def calculate_entropy(text: str) -> float:
    if not text:
        return 0.0
    counter = Counter(text)
    length = len(text)
    entropy = 0.0
    for count in counter.values():
        p = count / length
        if p > 0:
            entropy -= p * math.log2(p)
    return round(entropy, 4)

def load_model():
    """Lazy load ML model"""
    global model, MODEL_LOADED
    if MODEL_LOADED:
        return model
    try:
        import joblib
        if not os.path.exists('rf_model.pkl'):
            print("⚠️ Model file not found. Using heuristic scoring only.")
            return None
        file_size = os.path.getsize('rf_model.pkl')
        print(f"📊 Loading ML model ({file_size / 1024:.2f} KB)...")
        if file_size < 1024:
            print("⚠️ Model appears to be a Git LFS pointer.")
            return None
        model = joblib.load('rf_model.pkl')
        MODEL_LOADED = True
        print("✅ ML model loaded successfully!")
        return model
    except Exception as e:
        print(f"⚠️ ML model loading failed: {e}")
        return None

def extract_url_features(url: str) -> Dict[str, float]:
    """Extract features from a URL for ML"""
    features = {}
    features['url_length'] = len(url)
    features['number_of_dots_in_url'] = url.count('.')
    features['number_of_digits_in_url'] = sum(c.isdigit() for c in url)
    features['number_of_special_char_in_url'] = sum(c in '!@#$%^&*()_+-=[]{}|;:,.<>?/~`' for c in url)
    parsed = urlparse(url)
    domain = parsed.netloc
    path = parsed.path
    features['domain_length'] = len(domain)
    features['number_of_dots_in_domain'] = domain.count('.')
    features['entropy_of_url'] = calculate_entropy(url)
    features['entropy_of_domain'] = calculate_entropy(domain)
    return features

def extract_urls(text: str):
    """Extract URLs from text"""
    urls = []
    urls += re.findall(r'https?://[^\s]+', text)
    urls += [u for u in re.findall(r'(?:^|\s)([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?)', text) if '.' in u]
    return list(set(urls))

def predict_url(url: str) -> URLPrediction:
    """Predict phishing URL using ML or heuristic scoring"""
    import numpy as np
    current_model = load_model()
    features = extract_url_features(url)

    if current_model is None:
        score = 0.5
        if any(short in url.lower() for short in ['bit.ly','tinyurl','goo.gl']):
            score += 0.3
        if url.count('.') > 3:
            score += 0.2
        score = min(1.0, score)
        return URLPrediction(url=url, prediction=int(score>0.6), probability=round(score,4), features=features)

    feature_names = list(features.keys())
    feature_vector = np.array([[features[name] for name in feature_names]])
    pred = current_model.predict(feature_vector)[0]
    prob = current_model.predict_proba(feature_vector)[0][1]
    return URLPrediction(url=url, prediction=int(pred), probability=float(round(prob,4)), features=features)
