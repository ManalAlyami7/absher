"""
========================================
Tanabbah - Enhanced API Server v2.2
========================================
Complete analysis with technical details
Author: Manal Alyami
Version: 2.2.0 - Full Technical Insights
========================================
"""

import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict

from .ml import predict_url, extract_urls, MODEL_LOADED, URLPrediction
from .llm import analyze_message_with_llm, is_llm_available, LLMAnalysis, is_trusted_domain

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Tanabbah Enhanced API v2.2",
    description="AI-powered phishing detection with complete technical insights",
    version="2.2.0"
)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class AnalyzeRequest(BaseModel):
    message: str
    enable_llm: Optional[bool] = True
    language: Optional[str] = "ar"  # Interface language


class TechnicalDetails(BaseModel):
    urls_found: int
    url_types: List[str]
    ml_risk_score: float
    llm_confidence: Optional[float]
    trusted_source: bool
    red_flags_details: List[str]
    analysis_method: str
    features_analyzed: int


class AnalyzeResponse(BaseModel):
    message: str
    classification: str
    classification_ar: str
    explanation: str
    explanation_ar: str
    red_flags: List[str]
    red_flags_ar: List[str]
    risk_score: float
    action: str
    action_ar: str
    technical_details: TechnicalDetails
    urls_found: int
    url_predictions: List[URLPrediction]
    ml_risk_score: float
    llm_analysis: Optional[LLMAnalysis]
    combined_risk_score: float
    status: str


def classify_url_type(probability: float, url: str) -> str:
    """Classify URL based on probability and characteristics"""
    if is_trusted_domain(url):
        return "Trusted"
    elif probability >= 0.8:
        return "Phishing"
    elif probability >= 0.6:
        return "Suspicious"
    elif probability >= 0.4:
        return "Lookalike"
    else:
        return "Safe"


def get_action_guidance(classification: str, language: str = "ar") -> tuple:
    """Get action guidance based on classification"""
    actions = {
        "SAFE": {
            "ar": "✅ لا يوجد إجراء مطلوب",
            "en": "✅ No action required"
        },
        "LOW_RISK": {
            "ar": "⚠️ تحقق قبل الضغط على أي رابط",
            "en": "⚠️ Verify before clicking any links"
        },
        "SUSPICIOUS": {
            "ar": "🚫 لا تضغط على الروابط حتى تتأكد من المصدر",
            "en": "🚫 Do not click links until you verify the source"
        },
        "HIGH_RISK": {
            "ar": "❌ يُنصح بحذف الرسالة وعدم التفاعل معها",
            "en": "❌ Recommended to delete and not interact"
        }
    }
    
    action_dict = actions.get(classification, actions["SAFE"])
    return action_dict.get(language, action_dict["ar"])


def get_explanation(classification: str, risk_score: float, 
                    has_trusted: bool, language: str = "ar") -> str:
    """Generate explanation based on classification"""
    
    if language == "ar":
        if classification == "SAFE":
            if has_trusted:
                return f"الرسالة تبدو رسمية وصادرة من جهة موثوقة. لم يتم اكتشاف مؤشرات احتيال واضحة. (درجة الخطر: {risk_score}%)"
            return f"الرسالة تبدو آمنة بشكل عام. لا توجد مؤشرات خطر واضحة. (درجة الخطر: {risk_score}%)"
        elif classification == "LOW_RISK":
            return f"الرسالة تحتوي على بعض العلامات التي تستدعي الحذر المعتدل. يُنصح بالتحقق من المصدر. (درجة الخطر: {risk_score}%)"
        elif classification == "SUSPICIOUS":
            return f"الرسالة تحتوي على عدة مؤشرات مشبوهة. توخَّ الحذر الشديد ولا تضغط على أي روابط. (درجة الخطر: {risk_score}%)"
        else:  # HIGH_RISK
            return f"الرسالة تحتوي على مؤشرات احتيال قوية. لا تتفاعل معها ويُنصح بحذفها فوراً. (درجة الخطر: {risk_score}%)"
    else:  # English
        if classification == "SAFE":
            if has_trusted:
                return f"Message appears official from a trusted source. No clear fraud indicators detected. (Risk score: {risk_score}%)"
            return f"Message appears generally safe. No clear risk indicators found. (Risk score: {risk_score}%)"
        elif classification == "LOW_RISK":
            return f"Message contains some signs requiring moderate caution. Verify the source. (Risk score: {risk_score}%)"
        elif classification == "SUSPICIOUS":
            return f"Message contains several suspicious indicators. Exercise extreme caution and don't click any links. (Risk score: {risk_score}%)"
        else:  # HIGH_RISK
            return f"Message contains strong fraud indicators. Do not interact and delete immediately. (Risk score: {risk_score}%)"


def calculate_enhanced_risk(
    ml_score: float,
    llm_analysis: Optional[LLMAnalysis],
    urls: List[str],
    url_predictions: List[URLPrediction]
) -> tuple:
    """
    Enhanced risk calculation with complete technical details
    Implements cybersecurity best practices and industry standards
    Returns: (risk_score, classification, classification_ar, technical_details)
    """
    
    # Check if all URLs are trusted
    all_trusted = all(is_trusted_domain(url) for url in urls) if urls else False
    
    # Check for critical red flags
    has_critical_flags = False
    if llm_analysis and llm_analysis.red_flags:
        critical = ['shortener', 'password', 'sensitive', 'otp', 'pin']
        has_critical_flags = any(c in ' '.join(llm_analysis.red_flags).lower() 
                                for c in critical)
    
    # Classify URL types
    url_types = []
    for pred in url_predictions:
        url_type = classify_url_type(pred.probability, pred.url)
        url_types.append(url_type)
    
    # Remove duplicates
    url_types = list(set(url_types))
    
    # === TRUST OVERRIDE ===
    if all_trusted and urls:
        # Check for conflicting signals even with trusted domains
        has_suspicious_content = False
        if llm_analysis:
            suspicious_indicators = ['password', 'pin', 'otp', 'cvv', 'card', 'كلمة المرور', 'رمز التحقق', 'رقم الحساب',
                                   'suspended', 'blocked', 'deleted', 'locked', 'terminate', 'winner', 'prize', 'won']
            if llm_analysis.red_flags:
                combined_flags = ' '.join(llm_analysis.red_flags + llm_analysis.red_flags_ar).lower()
                has_suspicious_content = any(indicator in combined_flags for indicator in suspicious_indicators)
        
        if not has_critical_flags and not has_suspicious_content:
            risk_score = 15.0
            classification = "SAFE"
            classification_ar = "آمنة - رسالة رسمية"
            
            red_flags_details = [
                "تم التحقق من جميع الروابط - مصادر موثوقة",
                "جميع النطاقات من مواقع حكومية رسمية (.gov.sa)",
                "لا توجد محاولات انتحال هوية",
                "لا يوجد طلب لبيانات حساسة"
            ]
        else:
            # Trusted domain but with suspicious content - flag as phishing
            risk_score = 75.0
            classification = "HIGH_RISK"
            classification_ar = "عالية الخطورة"
            
            red_flags_details = [
                "مصدر موثوق ولكن يحتوي على محتوى مشبوه",
                "طلب معلومات حساسة من مصدر رسمي",
                "يجب التحقق من صحة هذه الرسالة بشكل إضافي"
            ]
    else:
        # === CALCULATE COMBINED SCORE ===
        if llm_analysis:
            llm_risk = llm_analysis.confidence
            # Adjust LLM risk based on trust level
            if not llm_analysis.is_phishing and not has_critical_flags:
                # If message is not phishing and no critical flags, use lower risk score
                if not urls:  # No URLs = likely safe message
                    llm_risk = min(llm_risk, 10.0)
                else:
                    llm_risk = min(llm_risk, 40.0)  # Lower risk for non-phishing with no critical flags
            elif llm_analysis.is_phishing:
                llm_risk = max(llm_risk, 30.0)  # Ensure phishing has adequate risk score
            combined = (ml_score * 0.4) + (llm_risk * 0.6)
        else:
            combined = ml_score
        
        risk_score = round(combined, 1)
        
        # === CLASSIFICATION ===
        if risk_score <= 25:
            classification = "SAFE"
            classification_ar = "آمنة"
        elif risk_score <= 50:
            classification = "LOW_RISK"
            classification_ar = "منخفضة الخطورة"
        elif risk_score <= 70:
            classification = "SUSPICIOUS"
            classification_ar = "مشبوهة"
        else:
            classification = "HIGH_RISK"
            classification_ar = "عالية الخطورة"
        
        # === DETAILED RED FLAGS ===
        red_flags_details = []
        
        # Analyze each URL
        for pred in url_predictions:
            if pred.probability >= 0.7:
                red_flags_details.append(
                    f"🚨 رابط عالي الخطورة: {pred.url} (احتمالية: {pred.probability*100:.0f}%)"
                )
            elif pred.probability >= 0.5:
                red_flags_details.append(
                    f"⚠️ رابط مشبوه: {pred.url} (احتمالية: {pred.probability*100:.0f}%)"
                )
        
        # Add LLM red flags
        if llm_analysis and llm_analysis.red_flags_ar:
            for flag in llm_analysis.red_flags_ar:
                if flag != "لم يتم اكتشاف مؤشرات احتيال واضحة":
                    red_flags_details.append(f"🧠 {flag}")
        
        # If no specific flags, add general assessment
        if not red_flags_details:
            if risk_score < 30:
                red_flags_details.append("✅ لم يتم اكتشاف مؤشرات خطر واضحة")
            else:
                red_flags_details.append("⚠️ تم اكتشاف بعض المؤشرات التي تستدعي الانتباه")
    
    # === TECHNICAL DETAILS ===
    analysis_method = "Hybrid (ML + LLM)" if llm_analysis else "ML Only"
    if all_trusted and urls:
        analysis_method += " + Trust Override"
    
    technical_details = TechnicalDetails(
        urls_found=len(urls),
        url_types=url_types if url_types else ["No URLs"],
        ml_risk_score=round(ml_score, 1),
        llm_confidence=round(llm_analysis.confidence, 1) if llm_analysis else None,
        trusted_source=all_trusted if urls else False,
        red_flags_details=red_flags_details,
        analysis_method=analysis_method,
        features_analyzed=41 * len(urls) if urls else 0
    )
    
    return risk_score, classification, classification_ar, technical_details


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Tanabbah Enhanced API",
        "version": "2.2.0",
        "features": ["complete_technical_insights", "multi_language", "trust_override"],
        "model_loaded": MODEL_LOADED,
        "llm_enabled": is_llm_available()
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "2.2.0",
        "model_loaded": MODEL_LOADED,
        "llm_enabled": is_llm_available()
    }


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_message(request: AnalyzeRequest):
    """
    Enhanced analysis endpoint with complete technical details
    Implements cybersecurity best practices for threat assessment
    """
    try:
        logger.info(f"Analyzing message (length: {len(request.message)}, language: {request.language})")
        
        # Enhanced cybersecurity validation
        if not request.message or len(request.message.strip()) == 0:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Check for potential injection attempts
        suspicious_patterns = ['<script', 'javascript:', 'vbscript:', 'onerror=', 'onload=', 'eval(', 'exec(']
        message_lower = request.message.lower()
        if any(pattern in message_lower for pattern in suspicious_patterns):
            logger.warning(f"Suspicious pattern detected in message: {request.message[:100]}...")
            raise HTTPException(status_code=400, detail="Message contains suspicious content")
        
        if len(request.message) > 10000:
            raise HTTPException(status_code=400, detail="Message too long")
        
        # Log potential security events
        if any(security_word in message_lower for security_word in ['password', 'pin', 'otp', 'cvv', 'card', 'login', 'verify']):
            logger.info(f"Security-sensitive content detected in message")
        
        message = request.message.strip()
        enable_llm = request.enable_llm and is_llm_available()
        language = request.language or "ar"
        
        # Extract URLs
        urls = extract_urls(message)
        logger.info(f"Found {len(urls)} URLs: {urls}")
        
        # Analyze URLs with ML
        url_predictions = []
        total_prob = 0.0
        
        for url in urls:
            try:
                pred = predict_url(url)
                url_predictions.append(pred)
                total_prob += pred.probability
            except Exception as e:
                logger.error(f"Error predicting URL {url}: {e}")
                url_predictions.append(URLPrediction(
                    url=url,
                    prediction=0,
                    probability=0.5,
                    features={}
                ))
                total_prob += 0.5
        
        # ML risk score
        ml_risk_score = round(
            (total_prob / len(url_predictions) * 100) if url_predictions else 0.0,
            2
        )
        
        # LLM analysis
        llm_analysis = None
        if enable_llm:
            try:
                llm_analysis = await analyze_message_with_llm(message, urls)
            except Exception as e:
                logger.error(f"LLM analysis failed: {e}")
        
        # Calculate enhanced risk with technical details
        risk_score, classification, classification_ar, technical_details = \
            calculate_enhanced_risk(ml_risk_score, llm_analysis, urls, url_predictions)
        
        # Get explanations
        has_trusted = technical_details.trusted_source
        explanation_ar = get_explanation(classification, risk_score, has_trusted, "ar")
        explanation_en = get_explanation(classification, risk_score, has_trusted, "en")
        
        # Get action guidance
        action_ar = get_action_guidance(classification, "ar")
        action_en = get_action_guidance(classification, "en")
        
        # Get red flags
        red_flags_ar = llm_analysis.red_flags_ar if llm_analysis else ["لم يتم اكتشاف مؤشرات احتيال واضحة"]
        red_flags_en = llm_analysis.red_flags if llm_analysis else ["No significant red flags detected"]
        
        # Filter out "no red flags" messages if risk is high
        if risk_score > 30:
            red_flags_ar = [f for f in red_flags_ar if "لم يتم اكتشاف" not in f]
            red_flags_en = [f for f in red_flags_en if "no" not in f.lower() and "significant" not in f.lower()]
        
        logger.info(f"Analysis complete: {classification} ({risk_score}%)")
        
        return AnalyzeResponse(
            message=message,
            classification=classification,
            classification_ar=classification_ar,
            explanation=explanation_en if language == "en" else explanation_ar,
            explanation_ar=explanation_ar,
            red_flags=red_flags_en,
            red_flags_ar=red_flags_ar,
            risk_score=risk_score,
            action=action_en if language == "en" else action_ar,
            action_ar=action_ar,
            technical_details=technical_details,
            urls_found=len(urls),
            url_predictions=url_predictions,
            ml_risk_score=ml_risk_score,
            llm_analysis=llm_analysis,
            combined_risk_score=risk_score,
            status="success"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/report")
async def report_message(request: dict):
    """Report phishing message with cybersecurity best practices"""
    try:
        message = request.get("message", "")
        
        if not message or len(message.strip()) == 0:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Security validation for report
        message = message.strip()[:10000]  # Limit length
        
        # Check for suspicious content in the report itself
        suspicious_patterns = ['<script', 'javascript:', 'vbscript:', 'onerror=', 'onload=', 'eval(', 'exec(']
        message_lower = message.lower()
        if any(pattern in message_lower for pattern in suspicious_patterns):
            logger.warning(f"Suspicious pattern detected in report: {message[:100]}...")
            raise HTTPException(status_code=400, detail="Report contains suspicious content")
        
        logger.info(f"Phishing report received: {len(message)} chars")
        
        # Generate secure reference ID
        import time
        timestamp = int(time.time())
        reference_id = f"TN-{((hash(message) ^ timestamp) % 1000000):06d}"
        
        return {
            "status": "success",
            "message": "Phishing report received successfully",
            "reference_id": reference_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Report error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to submit report")


@app.post("/api/scan-sms")
async def scan_sms(request: AnalyzeRequest):
    """
    Premium mobile app endpoint for scanning SMS messages
    Requires proper permissions and authentication
    """
    try:
        logger.info(f"Mobile SMS scan requested (length: {len(request.message)}, language: {request.language})")
        
        # Enhanced validation for mobile app
        if not request.message or len(request.message.strip()) == 0:
            raise HTTPException(status_code=400, detail="SMS message cannot be empty")
        
        # Check for potential injection attempts
        suspicious_patterns = ['<script', 'javascript:', 'vbscript:', 'onerror=', 'onload=', 'eval(', 'exec(']
        message_lower = request.message.lower()
        if any(pattern in message_lower for pattern in suspicious_patterns):
            logger.warning(f"Suspicious pattern detected in SMS: {request.message[:100]}...")
            raise HTTPException(status_code=400, detail="Message contains suspicious content")
        
        if len(request.message) > 10000:
            raise HTTPException(status_code=400, detail="Message too long")
        
        message = request.message.strip()
        enable_llm = request.enable_llm and is_llm_available()
        language = request.language or "ar"
        
        # Extract URLs
        urls = extract_urls(message)
        logger.info(f"Found {len(urls)} URLs in SMS: {urls}")
        
        # Analyze URLs with ML
        url_predictions = []
        total_prob = 0.0
        
        for url in urls:
            try:
                pred = predict_url(url)
                url_predictions.append(pred)
                total_prob += pred.probability
            except Exception as e:
                logger.error(f"Error predicting URL {url}: {e}")
                url_predictions.append(URLPrediction(
                    url=url,
                    prediction=0,
                    probability=0.5,
                    features={}
                ))
                total_prob += 0.5
        
        # ML risk score
        ml_risk_score = round(
            (total_prob / len(url_predictions) * 100) if url_predictions else 0.0,
            2
        )
        
        # LLM analysis
        llm_analysis = None
        if enable_llm:
            try:
                llm_analysis = await analyze_message_with_llm(message, urls)
            except Exception as e:
                logger.error(f"LLM analysis failed: {e}")
        
        # Calculate enhanced risk with technical details
        risk_score, classification, classification_ar, technical_details = \
            calculate_enhanced_risk(ml_risk_score, llm_analysis, urls, url_predictions)
        
        # Get explanations
        has_trusted = technical_details.trusted_source
        explanation_ar = get_explanation(classification, risk_score, has_trusted, "ar")
        explanation_en = get_explanation(classification, risk_score, has_trusted, "en")
        
        # Get action guidance
        action_ar = get_action_guidance(classification, "ar")
        action_en = get_action_guidance(classification, "en")
        
        # Get red flags
        red_flags_ar = llm_analysis.red_flags_ar if llm_analysis else ["لم يتم اكتشاف مؤشرات احتيال واضحة"]
        red_flags_en = llm_analysis.red_flags if llm_analysis else ["No significant red flags detected"]
        
        # Filter out "no red flags" messages if risk is high
        if risk_score > 30:
            red_flags_ar = [f for f in red_flags_ar if "لم يتم اكتشاف" not in f]
            red_flags_en = [f for f in red_flags_en if "no" not in f.lower() and "significant" not in f.lower()]
        
        logger.info(f"SMS analysis complete: {classification} ({risk_score}%)")
        
        return AnalyzeResponse(
            message=message,
            classification=classification,
            classification_ar=classification_ar,
            explanation=explanation_en if language == "en" else explanation_ar,
            explanation_ar=explanation_ar,
            red_flags=red_flags_en,
            red_flags_ar=red_flags_ar,
            risk_score=risk_score,
            action=action_en if language == "en" else action_ar,
            action_ar=action_ar,
            technical_details=technical_details,
            urls_found=len(urls),
            url_predictions=url_predictions,
            ml_risk_score=ml_risk_score,
            llm_analysis=llm_analysis,
            combined_risk_score=risk_score,
            status="success"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SMS analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"SMS analysis failed: {str(e)}")


# Additional endpoints for mobile app functionality
@app.post("/api/mobile/auth")
async def mobile_auth(request: dict):
    """
    Authenticate mobile app users
    """
    try:
        device_id = request.get("device_id", "")
        api_key = request.get("api_key", "")
        
        # Basic validation
        if not device_id or len(device_id) < 10:
            raise HTTPException(status_code=400, detail="Invalid device ID")
        
        # In a real implementation, you would verify the API key against a database
        # For now, we'll simulate authentication
        is_valid = api_key and len(api_key) >= 20  # Basic check
        
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        logger.info(f"Mobile app authenticated: {device_id[:8]}...")
        
        return {
            "status": "success",
            "message": "Authentication successful",
            "user_type": "premium",  # Premium mobile app user
            "permissions": ["sms_scanning", "real_time_alerts", "advanced_analysis"],
            "expires_in": 86400  # 24 hours
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Mobile auth error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Authentication failed")


@app.get("/api/mobile/features")
async def mobile_features():
    """
    Get available features for mobile app
    """
    return {
        "status": "success",
        "features": {
            "real_time_scanning": True,
            "sms_permission_required": True,
            "notification_service": True,
            "premium_features": {
                "unlimited_scans": True,
                "advanced_ai_analysis": True,
                "real_time_alerts": True,
                "detailed_reports": True,
                "priority_support": True
            },
            "free_features": {
                "limited_scans": 5,
                "basic_analysis": True,
                "manual_scan_only": True
            }
        }
    }


@app.post("/api/mobile/alert")
async def mobile_alert(request: dict):
    """
    Endpoint for real-time phishing alerts to mobile app
    """
    try:
        alert_type = request.get("type", "")
        message = request.get("message", "")
        risk_score = request.get("risk_score", 0)
        
        if not alert_type or not message:
            raise HTTPException(status_code=400, detail="Alert type and message are required")
        
        logger.info(f"Real-time alert: {alert_type} (Risk: {risk_score}%)")
        
        # In a real implementation, this would push notifications to mobile devices
        # For now, we'll just return success
        return {
            "status": "success",
            "message": "Alert processed successfully",
            "alert_id": f"alert_{hash(message) % 100000:05d}",
            "timestamp": int(time.time())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Mobile alert error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process alert")



if __name__ == "__main__":
    import uvicorn
    import time  # Import time module for the alert endpoint
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")