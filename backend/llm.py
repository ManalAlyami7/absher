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

INDUSTRY-RECOGNIZED PHISHING INDICATORS (HIGH RISK - Flag these):
1. URL shorteners (bit.ly, tinyurl, goo.gl, etc.) - EVEN if pointing to trusted domains (common redirection attack)
2. Requests for sensitive information: passwords, OTPs, PINs, card details, personal IDs, national ID
3. Threatening language: account suspension, blocking, deletion unless immediate action taken
4. Urgency pressure: "act now", "limited time", "immediately", "today only" (exploits psychological pressure)
5. Lookalike domains: abshar.sa vs absher.sa, g0v.sa vs gov.sa (homograph attacks)
6. Suspicious sender claims: "urgent from security team", "fraud department"
7. Unexpected prize/lottery notifications
8. Unexpected account activity alerts
9. IP addresses instead of domain names in URLs
10. Suspicious URL encoding or obfuscation
11. Non-standard ports in URLs (8080, 8443, etc.)
12. Excessive subdomains or very long domain names

CYBERSECURITY BEST PRACTICES FOR ASSESSMENT:
- Zero-trust approach: Verify all elements independently
- Defense in depth: Multiple indicators strengthen the assessment
- Threat intelligence: Consider tactics, techniques, and procedures (TTPs)
- Risk-based scoring: Higher confidence for technical indicators

SECURITY-FOCUSED LEGITIMATE INDICATORS (LOW RISK - Do NOT flag these):
1. ALL URLs are from verified Saudi government domains (absher.sa, najiz.sa, *.gov.sa, moi.gov.sa, moj.gov.sa)
2. Government messages with reference numbers, case IDs, or ticket numbers
3. Formal government language without urgency pressure
4. Notifications about scheduled system maintenance or updates
5. Standard appointment confirmations
6. General awareness messages without personal data requests
7. Messages with official government letterheads or signatures
8. Standard security notifications without requests for sensitive information

BALANCED ASSESSMENT RULES:
- Trust indicators should LOWER risk but not eliminate it if strong phishing indicators exist
- Multiple weak indicators can combine to create moderate risk
- Single strong technical indicator (IP address, URL shortener, password request) = HIGH risk
- Government domain + URL shortener = PHISHING (redirection attack)
- Government domain + password request = PHISHING (credential harvesting)
- Government domain + suspicious port = PHISHING (malicious hosting)

Respond ONLY with valid JSON:
{
  "is_phishing": true or false,
  "confidence": 0-100,
  "reasoning": "detailed explanation of why message is flagged or not, including specific security indicators",
  "red_flags": ["specific", "indicators"],
  "context_score": 0-100
}

For legitimate government messages:
- is_phishing: false
- confidence: LOW (15-35)
- red_flags: []
- reasoning: explain why trusted domain + content is legitimate"""

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
    Implements cybersecurity best practices for phishing detection
    Follows industry standards for threat assessment
    """
    
    red_flags = []
    score = 10  # Lower base score to reduce false positives
    
    message_lower = message.lower()
    
    # === TRUST CHECK ===
    all_urls_trusted = all(is_trusted_domain(url) for url in urls) if urls else False
    has_urls = len(urls) > 0
    
    # Check for URL shorteners (HIGH RISK even with trusted domains)
    shorteners = ['bit.ly', 'tinyurl', 'goo.gl', 'ow.ly', 't.co', 'is.gd', 'cutt.ly', 'bitly', 'adf.ly', 'bc.vc']
    has_shorteners = any(short in url.lower() for url in urls for short in shorteners)
    
    # Check for sensitive data requests (HIGH RISK)
    sensitive_keywords = ['password', 'pin', 'otp', 'cvv', 'card number', 'credit card', 'id card', 'national id', 'iban', 'bank account',
                         'كلمة المرور', 'كلمة السر', 'رقم التعريف', 'الرقم الوطني', 'رمز التحقق', 'البطاقة', 'رقم الحساب', 'ايبان']
    requests_sensitive = any(word in message_lower for word in sensitive_keywords)
    
    # Check for aggressive urgency/threats (HIGH RISK)
    threat_words = ['suspended', 'terminated', 'locked', 'blocked', 'deleted', 'disabled', 'deactivated',
                   'تم إيقاف', 'تم حظر', 'سيتم حذف', 'معلق', 'تم تعطيل', 'تم إلغاء']
    has_threats = any(word in message_lower for word in threat_words)
    
    # Check for urgency pressure
    urgency_words = ['urgent', 'immediately', 'now', 'today', 'within 24 hours', 'act now', 'limited time', 'act immediately',
                    'عاجل', 'فوراً', 'حالاً', 'خلال 24 ساعة', '限期', 'مباشرة']
    has_urgency = any(word in message_lower for word in urgency_words)
    
    # Check for prize/reward promises (MEDIUM RISK)
    prize_words = ['winner', 'prize', 'lottery', 'congratulations', 'you won', 'free money', 'cash prize',
                  'فائز', 'جائزة', 'فرصة', 'مجاناً', 'لقد ربحت']
    has_prizes = any(word in message_lower for word in prize_words)
    
    # Check for impersonation attempts
    impersonation_words = ['urgent from security', 'fraud department', 'security team', 'fraud alert',
                          'security alert', 'fraud detection', 'security department']
    has_impersonation = any(word in message_lower for word in impersonation_words)
    
    # === TRUST OVERRIDE LOGIC ===
    if all_urls_trusted and has_urls and not has_shorteners and not requests_sensitive:
        # Legitimate government message - check for suspicious elements
        if not has_threats and not has_urgency and not has_prizes and not has_impersonation:
            return LLMAnalysis(
                is_phishing=False,
                confidence=15.0,  # Very low confidence = safe
                reasoning="رسالة رسمية من جهة حكومية موثوقة",
                red_flags=[],
                red_flags_ar=["لم يتم اكتشاف مؤشرات احتيال واضحة"],
                context_score=15,
                model_used="heuristic_with_trust",
                is_trusted_source=True
            )
        else:
            # Even trusted domains with suspicious elements should be flagged
            if has_threats:
                score += 25
                red_flags.append("threatening language")
            if has_urgency:
                score += 20
                red_flags.append("urgency tactics")
            if has_prizes:
                score += 30
                red_flags.append("prize/lucky winner claim")
            if has_impersonation:
                score += 35
                red_flags.append("impersonation attempt")
    
    # === PHISHING INDICATORS ===
    
    # URL shorteners (STRONG indicator - even with trusted domains)
    if has_shorteners:
        score += 40  # Higher weight for URL shorteners
        red_flags.append("suspicious shortened URLs")
    
    # Sensitive data requests (STRONG indicator)
    if requests_sensitive:
        score += 45  # Higher weight for sensitive data requests
        red_flags.append("requests sensitive data")
    
    # Threats (STRONG indicator)
    if has_threats:
        score += 35
        red_flags.append("threatening language")
    
    # Impersonation attempts (STRONG indicator)
    if has_impersonation:
        score += 35
        red_flags.append("impersonation attempt")
    
    # Prize claims (MEDIUM indicator)
    if has_prizes:
        score += 25
        red_flags.append("prize/lucky winner claim")
    
    # Moderate urgency (MEDIUM indicator)
    if has_urgency:
        score += 20
        red_flags.append("urgency tactics")
    
    # Government impersonation without trusted domains
    gov_services = ['أبشر', 'absher', 'ناجز', 'najiz', 'وزارة', 'ministry', 'government']
    if any(s in message_lower for s in gov_services):
        if not all_urls_trusted and has_urls:
            score += 30
            red_flags.append("potential government impersonation")
    
    # Insecure links
    if urls and any(url.lower().startswith('http://') for url in urls):
        score += 15
        red_flags.append("insecure links")
    
    # Lookalike domains
    if urls:
        for url in urls:
            # Check for common lookalike substitutions
            lookalike_indicators = ['0' in url and 'o' not in url,  # Using 0 instead of o
                                  '1' in url and 'l' not in url,  # Using 1 instead of l
                                  'rn' in url and 'm' not in url]  # Using rn instead of m
            if any(lookalike_indicators):
                score += 25
                red_flags.append("potential lookalike domain")
                break
    
    # Multiple risk indicators - apply penalty for combination
    risk_indicators_count = sum([
        bool(has_shorteners), bool(requests_sensitive), bool(has_threats),
        bool(has_urgency), bool(has_prizes), bool(has_impersonation)
    ])
    
    if risk_indicators_count >= 2:
        score += risk_indicators_count * 10  # Additional penalty for multiple indicators
    
    # Cap score
    score = min(100, max(0, score))  # Ensure score is between 0 and 100
    is_phishing = score > 45  # Lowered threshold to catch more phishing
    
    # Translate red flags
    red_flags_ar = [translate_red_flag(flag) for flag in red_flags] if red_flags else ["لم يتم اكتشاف مؤشرات احتيال واضحة"]
    
    # Adjust confidence based on score
    confidence = float(score if is_phishing else 100 - score)
    
    return LLMAnalysis(
        is_phishing=is_phishing,
        confidence=min(confidence, 95),
        reasoning="تحليل قائم على مؤشرات احتيال متعددة" if is_phishing else "لم يتم اكتشاف مؤشرات خطر واضحة",
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
            response = llm_client.chat_completion(
            model=LLM_MODEL,
            messages=messages,
            temperature=0.1,
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
            
            # TRUST OVERRIDE: More nuanced approach
            if is_trusted:
                # Check for conflicting signals - trusted domain but suspicious content
                has_suspicious_content = any(word in message.lower() for word in ['password', 'pin', 'otp', 'cvv', 'card', 'كلمة المرور', 'رمز التحقق', 'رقم الحساب'])
                has_urgent_threats = any(word in message.lower() for word in ['suspended', 'blocked', 'deleted', 'locked', 'terminate', 'suspend', 'حظر', 'حذف', 'إيقاف'])
                has_prize_claims = any(word in message.lower() for word in ['winner', 'prize', 'congratulations', 'won', 'free money', 'جائزة', 'فائز', 'لقد ربحت'])
                
                if has_suspicious_content or has_urgent_threats or has_prize_claims:
                    # Even trusted domains with suspicious content should be flagged
                    is_phishing = True
                    confidence = max(confidence, 60.0)  # Increase confidence for suspicious content
                else:
                    # Legitimate trusted source
                    is_phishing = False
                    confidence = min(confidence, 25.0)  # Cap at 25% for trusted sources
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