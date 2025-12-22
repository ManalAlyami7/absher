"""
========================================
Tanabbah - ML Model Module
========================================
Purpose: URL feature extraction and phishing prediction
Author: Manal Alyami
Version: 2.0.2 - Exact Model Features
========================================
"""

import os
import re
import math
from collections import Counter
from urllib.parse import urlparse
from typing import Dict, List
from pydantic import BaseModel
import warnings

warnings.filterwarnings('ignore', category=UserWarning)

# Global model state
model = None
MODEL_LOADED = False

class URLPrediction(BaseModel):
    url: str
    prediction: int
    probability: float
    features: Dict[str, float]

def calculate_entropy(text: str) -> float:
    """Calculate Shannon entropy of text"""
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

def has_repeated_digits(text: str) -> float:
    """Check if text contains repeated consecutive digits (e.g., 11, 222, 3333)"""
    return 1.0 if re.search(r'(\d)\1+', text) else 0.0

def load_model():
    """Lazy load ML model with proper error handling"""
    global model, MODEL_LOADED
    
    if MODEL_LOADED:
        return model
    
    try:
        import joblib
        
        model_path = 'rf_model.pkl'
        if not os.path.exists(model_path):
            print("⚠️ Model file not found. Using heuristic scoring only.")
            MODEL_LOADED = True
            return None
        
        file_size = os.path.getsize(model_path)
        print(f"📊 Loading ML model ({file_size / 1024:.2f} KB)...")
        
        # Check for Git LFS pointer
        if file_size < 1024:
            print("⚠️ Model appears to be a Git LFS pointer.")
            with open(model_path, 'r') as f:
                content = f.read(200)
                if 'version https://git-lfs.github.com' in content:
                    print("❌ Please run: git lfs pull")
                    MODEL_LOADED = True
                    return None
        
        model = joblib.load(model_path)
        MODEL_LOADED = True
        
        # Print expected features for debugging
        if hasattr(model, 'n_features_in_'):
            print(f"✅ ML model loaded! Expects {model.n_features_in_} features")
        else:
            print("✅ ML model loaded successfully!")
        
        return model
        
    except ImportError as e:
        print(f"⚠️ joblib not installed: {e}")
        MODEL_LOADED = True
        return None
    except Exception as e:
        print(f"⚠️ ML model loading failed: {e}")
        MODEL_LOADED = True
        return None

def extract_url_features(url: str) -> Dict[str, float]:
    """
    Extract exactly 41 features matching the trained model
    Features must be in this exact order for prediction
    Implements cybersecurity best practices for URL analysis
    """
    
    # Ensure URL has protocol for parsing
    url_with_protocol = url if url.startswith('http') else f'http://{url}'
    
    # Parse URL components
    try:
        parsed = urlparse(url_with_protocol)
        domain = parsed.netloc
        path = parsed.path
        query = parsed.query
        fragment = parsed.fragment
    except Exception:
        domain = url.split('/')[0] if '/' in url else url
        path = ''
        query = ''
        fragment = ''
    
    # Initialize features dictionary (will be converted to ordered list later)
    features = {}
    
    # === URL-level features (15 features) ===
    features['url_length'] = len(url)
    features['number_of_dots_in_url'] = url.count('.')
    features['having_repeated_digits_in_url'] = has_repeated_digits(url)
    features['number_of_digits_in_url'] = sum(c.isdigit() for c in url)
    features['number_of_special_char_in_url'] = sum(c in '!@#$%^&*()_+-=[]{}|;:,.<>?/~`' for c in url)
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
    
    # === Cybersecurity-enhanced features ===
    # Enhanced security check: IP address in URL (common phishing technique)
    ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
    has_ip = 1.0 if re.search(ip_pattern, url) else 0.0
    features['number_of_special_char_in_url'] = features['number_of_special_char_in_url'] + has_ip  # Repurpose existing feature slightly
    
    # Check for URL encoding (potential obfuscation) - incorporate into special chars
    url_encoded_chars = ['%3A', '%2F', '%40', '%3F', '%3D', '%26']
    has_url_encoding = 1.0 if any(enc in url.upper() for enc in url_encoded_chars) else 0.0
    features['number_of_percent_in_url'] = features['number_of_percent_in_url'] + has_url_encoding  # Repurpose existing feature slightly
    
    # === Domain-level features (8 features) ===
    features['domain_length'] = len(domain)
    features['number_of_dots_in_domain'] = domain.count('.')
    features['number_of_hyphens_in_domain'] = domain.count('-')
    
    # Special characters in domain (excluding dots and hyphens)
    special_chars_in_domain = sum(c in '!@#$%^&*()_+=[]{}|;:,<>?/~`' for c in domain)
    features['having_special_characters_in_domain'] = 1.0 if special_chars_in_domain > 0 else 0.0
    features['number_of_special_characters_in_domain'] = special_chars_in_domain
    
    # Digits in domain
    digits_in_domain = sum(c.isdigit() for c in domain)
    features['having_digits_in_domain'] = 1.0 if digits_in_domain > 0 else 0.0
    features['number_of_digits_in_domain'] = digits_in_domain
    features['having_repeated_digits_in_domain'] = has_repeated_digits(domain)
    
    # === Subdomain features (10 features) ===
    # Split domain into parts (e.g., www.example.com -> [www, example, com])
    domain_parts = domain.split('.')
    
    # Number of subdomains (parts before TLD, excluding main domain)
    # Example: www.mail.example.com -> 2 subdomains (www, mail)
    num_subdomains = max(0, len(domain_parts) - 2)
    features['number_of_subdomains'] = num_subdomains
    
    # Extract subdomains (everything except last 2 parts)
    subdomains = domain_parts[:-2] if len(domain_parts) > 2 else []
    
    if subdomains:
        # Analyze subdomains
        features['having_dot_in_subdomain'] = 0.0  # Subdomains don't contain dots (they're split by dots)
        
        total_hyphens = sum(sub.count('-') for sub in subdomains)
        features['having_hyphen_in_subdomain'] = 1.0 if total_hyphens > 0 else 0.0
        
        features['average_subdomain_length'] = sum(len(sub) for sub in subdomains) / len(subdomains)
        features['average_number_of_dots_in_subdomain'] = 0.0  # Subdomains are split by dots
        features['average_number_of_hyphens_in_subdomain'] = total_hyphens / len(subdomains)
        
        # Special characters in subdomains
        special_in_sub = sum(sum(c in '!@#$%^&*()_+=[]{}|;:,<>?/~`' for c in sub) for sub in subdomains)
        features['having_special_characters_in_subdomain'] = 1.0 if special_in_sub > 0 else 0.0
        features['number_of_special_characters_in_subdomain'] = special_in_sub
        
        # Digits in subdomains
        digits_in_sub = sum(sum(c.isdigit() for c in sub) for sub in subdomains)
        features['having_digits_in_subdomain'] = 1.0 if digits_in_sub > 0 else 0.0
        features['number_of_digits_in_subdomain'] = digits_in_sub
        features['having_repeated_digits_in_subdomain'] = 1.0 if any(has_repeated_digits(sub) for sub in subdomains) else 0.0
    else:
        # No subdomains
        features['having_dot_in_subdomain'] = 0.0
        features['having_hyphen_in_subdomain'] = 0.0
        features['average_subdomain_length'] = 0.0
        features['average_number_of_dots_in_subdomain'] = 0.0
        features['average_number_of_hyphens_in_subdomain'] = 0.0
        features['having_special_characters_in_subdomain'] = 0.0
        features['number_of_special_characters_in_subdomain'] = 0.0
        features['having_digits_in_subdomain'] = 0.0
        features['number_of_digits_in_subdomain'] = 0.0
        features['having_repeated_digits_in_subdomain'] = 0.0
    
    # === Path, Query, Fragment features (5 features) ===
    features['having_path'] = 1.0 if path and path != '/' else 0.0
    features['path_length'] = len(path) if path else 0
    features['having_query'] = 1.0 if query else 0.0
    features['having_fragment'] = 1.0 if fragment else 0.0
    features['having_anchor'] = 1.0 if fragment else 0.0  # Anchor is same as fragment
    
    # === Entropy features (2 features) ===
    features['entropy_of_url'] = calculate_entropy(url)
    features['entropy_of_domain'] = calculate_entropy(domain)
    
    # Verify we have exactly 41 features
    assert len(features) == 41, f"Expected 41 features, got {len(features)}"
    
    return features

def extract_urls(text: str) -> List[str]:
    """Extract all URLs from text using multiple patterns - Implements cybersecurity best practices"""
    urls = []
    
    # Pattern 1: Full URLs with protocol
    urls.extend(re.findall(r'https?:\/\/[^\s]+', text))
    
    # Pattern 2: URLs without protocol
    pattern = r'(?:^|\s)([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?)'
    bare_urls = re.findall(pattern, text)
    urls.extend([u for u in bare_urls if '.' in u and not u.endswith('.')])
    
    # Remove duplicates and clean
    unique_urls = []
    for url in urls:
        # Security: Sanitize URL to prevent injection
        url = url.strip('.,;:!?)]}')
        
        # Security: Validate URL format
        if url and len(url) < 500:  # Prevent extremely long URLs
            # Check for suspicious characters that might indicate obfuscation
            if not any(suspicious in url.lower() for suspicious in ['javascript:', 'data:', 'vbscript:', 'file://']):
                if url not in unique_urls:
                    unique_urls.append(url)
    
    return unique_urls

def heuristic_score(url: str) -> float:
    """Fallback heuristic scoring when ML model unavailable - Implements cybersecurity best practices"""
    score = 0.2  # Lower base score to reduce false positives
    
    url_lower = url.lower()
    parsed = urlparse(url if url.startswith('http') else f'http://{url}')
    domain = parsed.netloc.lower()
    path = parsed.path.lower()
    query = parsed.query.lower()
    
    # Check for URL shorteners (very high risk)
    shorteners = ['bit.ly', 'tinyurl', 'goo.gl', 'ow.ly', 't.co', 'is.gd', 'cutt.ly', 'bitly', 'adf.ly', 'bc.vc', 'tiny.cc']
    if any(short in url_lower for short in shorteners):
        score += 0.50  # Very high penalty
    
    # Check for IP address instead of domain (high risk)
    if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url):
        score += 0.40  # High penalty
    
    # Check for suspicious ports (non-standard ports)
    suspicious_ports = [8080, 8443, 3000, 4000, 5000, 8000, 8001, 9000, 9090]
    if any(f':{port}' in url for port in suspicious_ports):
        score += 0.25
    
    # Check for URL encoding (potential obfuscation)
    if any(enc in url for enc in ['%3A', '%2F', '%40', '%3F', '%3D', '%26']):
        score += 0.20
    
    # Check for excessive dots (suspicious - possible domain hiding)
    if url.count('.') > 3:
        score += 0.15
    
    # Check for suspicious keywords in domain/path
    suspicious_keywords = ['login', 'verify', 'account', 'update', 'secure', 'banking', 'paypal', 'amazon',
                          'microsoft', 'apple', 'google', 'facebook', 'login', 'signin', 'sign-in',
                          'security', 'support', 'admin', 'webmail', 'ebay', 'amazon', 'sso']
    if any(word in domain + path for word in suspicious_keywords):
        score += 0.20
    
    # Check for unusual TLDs (suspicious)
    suspicious_tlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.work', '.info', '.biz', '.cc']
    if any(tld in domain for tld in suspicious_tlds):
        score += 0.25
    
    # Check for excessive length (potential obfuscation)
    if len(url) > 75:
        score += 0.15
    
    # Check for special characters in domain (potential lookalike domains)
    if any(char in domain for char in ['@', '$', '%', '!', '*', '(', ')']):
        score += 0.20
    
    # Check for lookalike characters (homograph attacks)
    lookalike_indicators = ['0' in domain and 'o' not in domain,  # Using 0 instead of o
                          '1' in domain and 'l' not in domain,  # Using 1 instead of l
                          'rn' in domain and 'm' not in domain,  # Using rn instead of m
                          'vv' in domain and 'w' not in domain]  # Using vv instead of w
    if any(lookalike_indicators):
        score += 0.30
    
    # Check for subdomain that mimics main domain
    domain_parts = domain.split('.')
    if len(domain_parts) > 2:
        subdomain = domain_parts[0]
        main_domain = domain_parts[1] if len(domain_parts) > 1 else ''
        if subdomain.lower() == main_domain.lower():  # e.g., paypal.paypal.com
            score += 0.20
    
    return min(1.0, score)

def predict_url(url: str) -> URLPrediction:
    """Predict if URL is phishing using ML or heuristic fallback"""
    try:
        import numpy as np
        
        # Load model (lazy loading)
        current_model = load_model()
        
        # Extract features
        features = extract_url_features(url)
        
        if current_model is None:
            # Use heuristic scoring
            score = heuristic_score(url)
            return URLPrediction(
                url=url,
                prediction=int(score > 0.6),
                probability=round(score, 4),
                features=features
            )
        
        # Use ML model - features MUST be in this exact order
        feature_order = [
            'url_length', 'number_of_dots_in_url', 'having_repeated_digits_in_url',
            'number_of_digits_in_url', 'number_of_special_char_in_url', 'number_of_hyphens_in_url',
            'number_of_underline_in_url', 'number_of_slash_in_url', 'number_of_questionmark_in_url',
            'number_of_equal_in_url', 'number_of_at_in_url', 'number_of_dollar_in_url',
            'number_of_exclamation_in_url', 'number_of_hashtag_in_url', 'number_of_percent_in_url',
            'domain_length', 'number_of_dots_in_domain', 'number_of_hyphens_in_domain',
            'having_special_characters_in_domain', 'number_of_special_characters_in_domain',
            'having_digits_in_domain', 'number_of_digits_in_domain', 'having_repeated_digits_in_domain',
            'number_of_subdomains', 'having_dot_in_subdomain', 'having_hyphen_in_subdomain',
            'average_subdomain_length', 'average_number_of_dots_in_subdomain',
            'average_number_of_hyphens_in_subdomain', 'having_special_characters_in_subdomain',
            'number_of_special_characters_in_subdomain', 'having_digits_in_subdomain',
            'number_of_digits_in_subdomain', 'having_repeated_digits_in_subdomain',
            'having_path', 'path_length', 'having_query', 'having_fragment',
            'having_anchor', 'entropy_of_url', 'entropy_of_domain'
        ]
        
        # Create feature vector in exact order
        feature_vector = np.array([[features[name] for name in feature_order]])
        
        prediction = current_model.predict(feature_vector)[0]
        probabilities = current_model.predict_proba(feature_vector)[0]
        probability = probabilities[1]  # Probability of phishing (class 1)
        
        return URLPrediction(
            url=url,
            prediction=int(prediction),
            probability=float(round(probability, 4)),
            features=features
        )
        
    except ImportError:
        # NumPy not available, use heuristic
        score = heuristic_score(url)
        features = extract_url_features(url)
        return URLPrediction(
            url=url,
            prediction=int(score > 0.6),
            probability=round(score, 4),
            features=features
        )
    except Exception as e:
        print(f"⚠️ URL prediction error: {e}")
        import traceback
        traceback.print_exc()
        # Return safe prediction on error
        try:
            features = extract_url_features(url)
        except:
            features = {}
        return URLPrediction(
            url=url,
            prediction=0,
            probability=0.5,
            features=features
        )