"""
========================================
Tanabbah - Enhanced LLM Analysis Module
========================================
Purpose: AI-powered message analysis with trust recognition
Author: Manal Alyami
Version: 2.1.0 - Trust Override & Arabic UX
========================================
"""

import os
import re
import json
from typing import List, Optional, Dict
from pydantic import BaseModel

try:
    from huggingface_hub import InferenceClient
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False
    print("⚠️ huggingface_hub not installed. LLM analysis disabled.")

# Configuration
HF_API_KEY = os.getenv("HF_API_KEY")
LLM_MODEL = "meta-llama/Meta-Llama-3-8B-Instruct"

# Trusted Saudi Government Domains
TRUSTED_DOMAINS = [
    'absher.sa',
    'najiz.sa',
    'moi.gov.sa',
    'moj.gov.sa',
    'spa.gov.sa',
    'my.gov.sa',
    '.gov.sa'  # All .gov.sa domains
]

# Initialize client
llm_client = None
if HF_AVAILABLE and HF_API_KEY:
    try:
        llm_client = InferenceClient(token=HF_API_KEY)
        print(f"✅ LLM client initialized with model: {LLM_MODEL}")
    except Exception as e:
        print(f"⚠️ LLM client initialization failed: {e}")
elif HF_AVAILABLE:
    try:
        llm_client = InferenceClient()
        print(f"⚠️ LLM client initialized without API key (rate limited)")
    except Exception as e:
        print(f"⚠️ LLM client initialization failed: {e}")


class LLMAnalysis(BaseModel):
    is_phishing: bool
    confidence: float
    reasoning: str
    red_flags: List[str]
    red_flags_ar: List[str]  # Arabic translations
    context_score: int
    model_used: str
    is_trusted_source: bool = False


def is_trusted_domain(url: str) -> bool:
    """Check if URL belongs to trusted Saudi government domain"""
    url_lower = url.lower()
    return any(domain in url_lower for domain in TRUSTED_DOMAINS)


def translate_red_flag(flag: str) -> str:
    """Translate red flag to user-friendly Arabic"""
    translations = {
        'urgency': 'أسلوب الاستعجال والضغط',
        'urgent': 'أسلوب الاستعجال والضغط',
        'pressure': 'أسلوب ضغط وإكراه',
        'suspicious url': 'رابط غير موثوق',
        'shortened url': 'روابط مختصرة مشبوهة',
        'url shortener': 'روابط مختصرة مشبوهة',
        'shortener': 'روابط مختصرة',
        'personal information': 'طلب معلومات حساسة',
        'personal info': 'طلب معلومات حساسة',
        'password': 'طلب كلمة مرور',
        'impersonation': 'انتحال هوية جهة رسمية',
        'government': 'انتحال صفة جهة حكومية',
        'threat': 'تهديدات وإنذارات',
        'threatening': 'لغة تهديدية',
        'reward': 'وعود بجوائز ومكافآت',
        'prize': 'وعود بجوائز وهمية',
        'suspicious domain': 'نطاق غير موثوق',
        'insecure': 'اتصال غير آمن',
        'social engineering': 'محاولة خداع نفسي',
        'phishing': 'محاولة احتيال',
        'sensitive data': 'طلب بيانات حساسة'
    }
    
    flag_lower = flag.lower()
    for key, value in translations.items():
        if key in flag_lower:
            return value
    
    return flag  # Return original if no translation found


def create_enhanced_prompt(message: str, urls: List[str]) -> tuple:
    """Create enhanced system and user prompts with trust recognition"""
    
    urls_text = "\n".join([f"- {url}" for url in urls]) if urls else "None"
    
    # Check if all URLs are trusted
    all_urls_trusted = all(is_trusted_domain(url) for url in urls) if urls else False
    
    system_message = """You are a cybersecurity analyst specializing in phishing detection for Saudi users.

CRITICAL TRUST RULES:
1. If ALL URLs belong to verified Saudi government domains (absher.sa, *.gov.sa, moj.gov.sa, moi.gov.sa), the message is LIKELY LEGITIMATE
2. Government notifications may include reference numbers, ticket IDs, or requests to visit official websites - this is NORMAL
3. Formal, neutral government language is NOT a phishing indicator
4. Only flag as phishing if there are STRONG indicators like:
   - URL shorteners (bit.ly, tinyurl, etc.)
   - Requests for passwords, OTPs, or card details
   - Aggressive threats or extreme urgency
   - Lookalike domains (abshar.sa instead of absher.sa)

Respond ONLY with valid JSON:
{
  "is_phishing": true or false,
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "red_flags": ["specific", "indicators"],
  "context_score": 0-100
}

For legitimate government messages:
- is_phishing: false
- confidence: LOW (20-40)
- red_flags: []"""

    user_message = f"""Analyze this message for phishing:

MESSAGE:
{message}

URLS FOUND:
{urls_text}

TRUSTED DOMAINS: {', '.join(TRUSTED_DOMAINS)}
ALL URLS TRUSTED: {all_urls_trusted}

Respond with JSON only."""

    return system_message, user_message


def parse_llm_response(response_text: str) -> Optional[dict]:
    """Parse JSON from LLM response, handling various formats"""
    
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass
    
    json_patterns = [
        r'```json\s*(\{.*?\})\s*```',
        r'```\s*(\{.*?\})\s*```',
        r'(\{[^{}]*"is_phishing"[^{}]*\})',
    ]
    
    for pattern in json_patterns:
        match = re.search(pattern, response_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                continue
    
    return None


def create_enhanced_analysis(message: str, urls: List[str]) -> LLMAnalysis:
    """
    Create enhanced heuristic analysis with trust recognition
    This implements the TRUST OVERRIDE logic
    """
    
    red_flags = []
    score = 20  # Lower base score
    
    message_lower = message.lower()
    
    # === TRUST CHECK ===
    all_urls_trusted = all(is_trusted_domain(url) for url in urls) if urls else False
    has_urls = len(urls) > 0
    
    # Check for URL shorteners (HIGH RISK even with trusted domains)
    shorteners = ['bit.ly', 'tinyurl', 'goo.gl', 'ow.ly', 't.co', 'is.gd']
    has_shorteners = any(short in url.lower() for url in urls for short in shorteners)
    
    # Check for sensitive data requests (HIGH RISK)
    sensitive_keywords = ['password', 'pin', 'otp', 'cvv', 'card number', 
                         'كلمة المرور', 'كلمة السر', 'رمز التحقق', 'بطاقة']
    requests_sensitive = any(word in message_lower for word in sensitive_keywords)
    
    # Check for aggressive urgency/threats
    threat_words = ['suspended', 'terminated', 'locked', 'blocked', 'deleted',
                   'تم إيقاف', 'تم حظر', 'سيتم حذف', 'معلق']
    has_threats = any(word in message_lower for word in threat_words)
    
    # === TRUST OVERRIDE LOGIC ===
    if all_urls_trusted and has_urls and not has_shorteners and not requests_sensitive:
        # Legitimate government message
        return LLMAnalysis(
            is_phishing=False,
            confidence=25.0,  # Low confidence = safe
            reasoning="رسالة رسمية من جهة حكومية موثوقة",
            red_flags=[],
            red_flags_ar=["لم يتم اكتشاف مؤشرات احتيال واضحة"],
            context_score=20,
            model_used="heuristic_with_trust",
            is_trusted_source=True
        )
    
    # === PHISHING INDICATORS ===
    
    # URL shorteners (STRONG indicator)
    if has_shorteners:
        score += 35
        red_flags.append("suspicious shortened URLs")
    
    # Sensitive data requests (STRONG indicator)
    if requests_sensitive:
        score += 40
        red_flags.append("requests sensitive data")
    
    # Threats/urgency (MODERATE indicator)
    if has_threats:
        score += 25
        red_flags.append("threatening language")
    
    # Moderate urgency (WEAK indicator)
    urgency_words = ['urgent', 'immediately', 'now', 'today', 'عاجل', 'فوراً', 'حالاً']
    if any(word in message_lower for word in urgency_words):
        score += 15
        red_flags.append("urgency tactics")
    
    # Government impersonation without trusted domains
    gov_services = ['أبشر', 'absher', 'ناجز', 'najiz', 'وزارة', 'ministry']
    if any(s in message_lower for s in gov_services):
        if not all_urls_trusted and has_urls:
            score += 35
            red_flags.append("potential government impersonation")
    
    # Insecure links
    if urls and any(url.lower().startswith('http://') for url in urls):
        score += 20
        red_flags.append("insecure links")
    
    # Cap score
    score = min(100, score)
    is_phishing = score > 55  # Adjusted threshold
    
    # Translate red flags
    red_flags_ar = [translate_red_flag(flag) for flag in red_flags] if red_flags else ["لم يتم اكتشاف مؤشرات احتيال واضحة"]
    
    return LLMAnalysis(
        is_phishing=is_phishing,
        confidence=float(min(score, 90)),
        reasoning="تحليل قائم على مؤشرات معروفة" if is_phishing else "لم يتم اكتشاف مؤشرات خطر واضحة",
        red_flags=red_flags if red_flags else ["no significant red flags"],
        red_flags_ar=red_flags_ar,
        context_score=score,
        model_used="heuristic_with_trust",
        is_trusted_source=all_urls_trusted if has_urls else False
    )


async def analyze_message_with_llm(message: str, urls: List[str]) -> Optional[LLMAnalysis]:
    """Analyze message using LLM with trust override"""
    
    # First, check for immediate trust override
    if urls:
        all_urls_trusted = all(is_trusted_domain(url) for url in urls)
        has_shorteners = any(short in url.lower() for url in urls 
                            for short in ['bit.ly', 'tinyurl', 'goo.gl'])
        
        message_lower = message.lower()
        sensitive_keywords = ['password', 'pin', 'otp', 'cvv', 
                             'كلمة المرور', 'رمز التحقق']
        requests_sensitive = any(word in message_lower for word in sensitive_keywords)
        
        # TRUST OVERRIDE: If trusted domains + no major red flags = SAFE
        if all_urls_trusted and not has_shorteners and not requests_sensitive:
            return LLMAnalysis(
                is_phishing=False,
                confidence=20.0,  # Low confidence = SAFE message
                reasoning="الرسالة من مصدر رسمي موثوق",
                red_flags=[],
                red_flags_ar=["لم يتم اكتشاف مؤشرات احتيال واضحة"],
                context_score=15,
                model_used="trust_override",
                is_trusted_source=True
            )
    
    # If LLM unavailable, use enhanced heuristic
    if not llm_client:
        return create_enhanced_analysis(message, urls)
    
    try:
        system_message, user_message = create_enhanced_prompt(message, urls)
        
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ]
        
        try:
            response = llm_client.chat.completions.create(
                model=LLM_MODEL,
                messages=messages,
                temperature=0.1,  # Lower temperature for consistency
                max_tokens=500,
            )
            
            if hasattr(response, 'choices') and response.choices:
                response_text = response.choices[0].message.content
            else:
                response_text = str(response)
                
        except AttributeError:
            response = llm_client.chat(
                model=LLM_MODEL,
                messages=messages,
                temperature=0.1
            )
            response_text = response.get("generated_text", str(response))
        
        data = parse_llm_response(response_text)
        
        if data:
            # Apply trust override to LLM results
            is_trusted = urls and all(is_trusted_domain(url) for url in urls)
            
            # Get red flags
            raw_flags = list(data.get("red_flags", []))
            red_flags_ar = [translate_red_flag(flag) for flag in raw_flags] if raw_flags else ["لم يتم اكتشاف مؤشرات احتيال واضحة"]
            
            # Extract values with proper handling
            is_phishing = bool(data.get("is_phishing", False))
            confidence = float(data.get("confidence", 50))
            
            # TRUST OVERRIDE: Cap risk for trusted sources
            if is_trusted and not any(word in message.lower() for word in ['password', 'pin', 'otp', 'كلمة المرور']):
                is_phishing = False
                confidence = min(confidence, 30.0)  # Cap at 30%
                red_flags_ar = ["لم يتم اكتشاف مؤشرات احتيال واضحة"]
            
            return LLMAnalysis(
                is_phishing=is_phishing,
                confidence=confidence,
                reasoning=str(data.get("reasoning", "Analysis completed")),
                red_flags=raw_flags if raw_flags else ["no significant red flags"],
                red_flags_ar=red_flags_ar,
                context_score=int(data.get("context_score", 50)),
                model_used=LLM_MODEL,
                is_trusted_source=is_trusted
            )
        else:
            return create_enhanced_analysis(message, urls)
            
    except Exception as e:
        print(f"❌ LLM analysis error: {e}")
        return create_enhanced_analysis(message, urls)


def is_llm_available() -> bool:
    """Check if LLM analysis is available"""
    return llm_client is not None