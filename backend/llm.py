"""
========================================
Tanabbah - LLM Analysis Module
========================================
Purpose: AI-powered message analysis using LLM
Author: Manal Alyami
Version: 2.0.0
========================================
"""

import os
import re
import json
from typing import List, Optional
from pydantic import BaseModel

# Try to import HuggingFace client
try:
    from huggingface_hub import InferenceClient
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False
    print("⚠️ huggingface_hub not installed. LLM analysis disabled.")

# Configuration
HF_API_KEY = os.getenv("HF_API_KEY")
LLM_MODEL = "meta-llama/Meta-Llama-3-8B-Instruct"

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
        llm_client = InferenceClient()  # Try without token
        print(f"⚠️ LLM client initialized without API key (rate limited)")
    except Exception as e:
        print(f"⚠️ LLM client initialization failed: {e}")

class LLMAnalysis(BaseModel):
    is_phishing: bool
    confidence: float
    reasoning: str
    red_flags: List[str]
    context_score: int
    model_used: str

def create_analysis_prompt(message: str, urls: List[str]) -> tuple:
    """Create system and user prompts for LLM analysis"""
    
    urls_text = "\n".join([f"- {url}" for url in urls]) if urls else "None"
    
    system_message = """You are a cybersecurity analyst specializing in phishing detection. 
Analyze messages for phishing indicators and respond ONLY with valid JSON in this exact format:
{
  "is_phishing": true or false,
  "confidence": number between 0-100,
  "reasoning": "brief explanation",
  "red_flags": ["list", "of", "flags"],
  "context_score": number between 0-100
}

Red flags to look for:
- Urgency/pressure tactics
- Requests for personal information
- Suspicious URLs or link shorteners
- Impersonation of legitimate entities
- Promises of rewards/prizes
- Threats or warnings
- Poor grammar/spelling (if obvious)"""

    user_message = f"""Analyze this message for phishing:

MESSAGE:
{message}

URLS FOUND:
{urls_text}

Respond with JSON only."""

    return system_message, user_message

def parse_llm_response(response_text: str) -> Optional[dict]:
    """Parse JSON from LLM response, handling various formats"""
    
    try:
        # Try direct JSON parse
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass
    
    # Try to extract JSON from markdown code blocks
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

def create_fallback_analysis(message: str, urls: List[str]) -> LLMAnalysis:
    """Create heuristic-based analysis when LLM unavailable"""
    
    red_flags = []
    score = 30  # Base score
    
    message_lower = message.lower()
    
    # Check for urgency keywords
    urgency_words = ['urgent', 'immediately', 'now', 'today', 'asap', 'عاجل', 'فوراً', 'حالاً']
    if any(word in message_lower for word in urgency_words):
        red_flags.append("urgency tactics")
        score += 20
    
    # Check for personal info requests
    personal_keywords = ['password', 'pin', 'account', 'verify', 'confirm', 'كلمة المرور', 'حساب', 'تأكيد']
    if any(word in message_lower for word in personal_keywords):
        red_flags.append("requests personal information")
        score += 25
    
    # Check for threats
    threat_words = ['suspend', 'block', 'locked', 'terminated', 'تعليق', 'إيقاف', 'حظر']
    if any(word in message_lower for word in threat_words):
        red_flags.append("threatening language")
        score += 20
    
    # Check for rewards
    reward_words = ['prize', 'winner', 'reward', 'free', 'جائزة', 'مكافأة', 'مجاني']
    if any(word in message_lower for word in reward_words):
        red_flags.append("promises rewards")
        score += 15
    
    # Check for URL shorteners
    if urls and any(short in url.lower() for url in urls for short in ['bit.ly', 'tinyurl', 'goo.gl']):
        red_flags.append("suspicious shortened URLs")
        score += 25
    
    # Check for government impersonation
    gov_keywords = ['government', 'ministry', 'أبشر', 'absher', 'ناجز', 'وزارة']
    if any(word in message_lower for word in gov_keywords):
        official_domains = ['absher.sa', 'najiz.sa', '.gov.sa']
        if not any(domain in url.lower() for url in urls for domain in official_domains):
            red_flags.append("potential government impersonation")
            score += 30
    
    score = min(100, score)
    is_phishing = score > 60
    
    return LLMAnalysis(
        is_phishing=is_phishing,
        confidence=float(min(score, 85)),  # Cap confidence for heuristic
        reasoning="Heuristic analysis based on known phishing patterns" if is_phishing else "No strong phishing indicators detected",
        red_flags=red_flags if red_flags else ["no significant red flags"],
        context_score=score,
        model_used="heuristic_fallback"
    )

async def analyze_message_with_llm(message: str, urls: List[str]) -> Optional[LLMAnalysis]:
    """Analyze message using LLM or fallback to heuristics"""
    
    # Check if LLM is available
    if not llm_client:
        print("⚠️ LLM unavailable, using heuristic analysis")
        return create_fallback_analysis(message, urls)
    
    try:
        # Create prompts
        system_message, user_message = create_analysis_prompt(message, urls)
        
        # Prepare messages for chat API
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ]
        
        # Call LLM with timeout and error handling
        try:
            response = llm_client.chat.completions.create(
                model=LLM_MODEL,
                messages=messages,
                temperature=0.2,
                max_tokens=500,
                timeout=10.0
            )
            
            # Extract response text
            if hasattr(response, 'choices') and response.choices:
                response_text = response.choices[0].message.content
            else:
                response_text = str(response)
                
        except AttributeError:
            # Try alternative API format
            response = llm_client.chat(
                model=LLM_MODEL,
                messages=messages,
                temperature=0.2
            )
            response_text = response.get("generated_text", str(response))
        
        # Parse response
        data = parse_llm_response(response_text)
        
        if data:
            return LLMAnalysis(
                is_phishing=bool(data.get("is_phishing", False)),
                confidence=float(data.get("confidence", 50)),
                reasoning=str(data.get("reasoning", "Analysis completed")),
                red_flags=list(data.get("red_flags", [])),
                context_score=int(data.get("context_score", 50)),
                model_used=LLM_MODEL
            )
        else:
            print("⚠️ Could not parse LLM response, using fallback")
            return create_fallback_analysis(message, urls)
            
    except Exception as e:
        print(f"❌ LLM analysis error: {e}")
        return create_fallback_analysis(message, urls)

def is_llm_available() -> bool:
    """Check if LLM analysis is available"""
    return llm_client is not None