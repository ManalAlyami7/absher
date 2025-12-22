"""
========================================
Tanabbah - Enhanced API Server
========================================
Purpose: Corrected risk scoring and classification logic
Author: Manal Alyami
Version: 2.1.0 - Trust Override & Arabic UX
========================================
"""

import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

from backend.ml import predict_url, extract_urls, MODEL_LOADED, URLPrediction
from backend.llm import analyze_message_with_llm, is_llm_available, LLMAnalysis, is_trusted_domain

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Tanabbah Enhanced API v2.1",
    description="AI-powered phishing detection with trust recognition",
    version="2.1.0"
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


class AnalyzeResponse(BaseModel):
    message: str
    urls_found: int
    url_predictions: List[URLPrediction]
    ml_risk_score: float
    llm_analysis: Optional[LLMAnalysis]
    combined_risk_score: float
    classification: str
    classification_ar: str
    explanation_ar: str
    status: str


class ReportRequest(BaseModel):
    message: str
    timestamp: Optional[str] = None
    language: Optional[str] = "ar"


def calculate_combined_risk(
    ml_score: float,
    llm_analysis: Optional[LLMAnalysis],
    urls: List[str]
) -> tuple[float, str, str, str]:
    """
    Calculate combined risk score with trust override
    Returns: (risk_score, classification, classification_ar, explanation_ar)
    """
    
    # Check if all URLs are trusted
    all_trusted = all(is_trusted_domain(url) for url in urls) if urls else False
    
    # Check for critical red flags
    has_critical_flags = False
    if llm_analysis and llm_analysis.red_flags:
        critical = ['shortener', 'password', 'sensitive', 'otp', 'pin']
        has_critical_flags = any(c in ' '.join(llm_analysis.red_flags).lower() 
                                for c in critical)
    
    # === TRUST OVERRIDE ===
    if all_trusted and urls and not has_critical_flags:
        # Official government message
        return (
            15.0,  # Very low risk
            "SAFE",
            "آمنة - رسالة رسمية",
            "الرسالة تبدو رسمية وصادرة من جهة موثوقة. لا توجد مؤشرات خطر واضحة."
        )
    
    # === CALCULATE COMBINED SCORE ===
    if llm_analysis:
        # CRITICAL FIX: Use confidence DIRECTLY (not inverted)
        # Low confidence = safe, High confidence = risky
        llm_risk = llm_analysis.confidence
        
        # If LLM says NOT phishing, use LOW score regardless of confidence
        if not llm_analysis.is_phishing:
            llm_risk = min(llm_risk, 35.0)  # Cap at 35% for non-phishing
        
        # Weighted combination: 40% ML + 60% LLM
        combined = (ml_score * 0.4) + (llm_risk * 0.6)
    else:
        combined = ml_score
    
    # Round to 1 decimal
    combined = round(combined, 1)
    
    # === CLASSIFICATION WITH ADJUSTED THRESHOLDS ===
    if combined <= 30:
        classification = "SAFE"
        classification_ar = "آمنة"
        explanation = "الرسالة تبدو آمنة بشكل عام. لا توجد مؤشرات خطر واضحة."
    elif combined <= 55:
        classification = "LOW_RISK"
        classification_ar = "منخفضة الخطورة"
        explanation = "الرسالة تحتوي على بعض العلامات التي تستدعي الحذر المعتدل."
    elif combined <= 75:
        classification = "SUSPICIOUS"
        classification_ar = "مشبوهة"
        explanation = "الرسالة تحتوي على عدة مؤشرات مشبوهة. توخَّ الحذر الشديد."
    else:
        classification = "HIGH_RISK"
        classification_ar = "عالية الخطورة"
        explanation = "الرسالة تحتوي على مؤشرات احتيال قوية. لا تتفاعل معها."
    
    return combined, classification, classification_ar, explanation


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "An internal error occurred",
            "detail": str(exc) if os.getenv("DEBUG") else "Internal server error"
        }
    )


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Tanabbah Enhanced API",
        "version": "2.1.0",
        "features": ["trust_override", "arabic_ux", "corrected_scoring"],
        "model_loaded": MODEL_LOADED,
        "llm_enabled": is_llm_available()
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "2.1.0",
        "model_loaded": MODEL_LOADED,
        "llm_enabled": is_llm_available()
    }


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_message(request: AnalyzeRequest):
    """
    Enhanced analysis endpoint with trust recognition
    """
    try:
        logger.info(f"Analyzing message (length: {len(request.message)})")
        
        # Validation
        if not request.message or len(request.message.strip()) == 0:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        if len(request.message) > 10000:
            raise HTTPException(status_code=400, detail="Message too long")
        
        message = request.message.strip()
        enable_llm = request.enable_llm and is_llm_available()
        
        # Extract URLs
        urls = extract_urls(message)
        logger.info(f"Found {len(urls)} URLs: {urls}")
        
        # Check if trusted
        all_trusted = all(is_trusted_domain(url) for url in urls) if urls else False
        logger.info(f"All URLs trusted: {all_trusted}")
        
        # Analyze URLs with ML
        url_predictions = []
        total_prob = 0.0
        
        for url in urls:
            try:
                pred = predict_url(url)
                url_predictions.append(pred)
                total_prob += pred.probability
                logger.debug(f"URL {url}: {pred.probability:.2f}")
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
        logger.info(f"ML Risk Score: {ml_risk_score}%")
        
        # LLM analysis
        llm_analysis = None
        if enable_llm:
            try:
                logger.info("Performing LLM analysis with trust recognition...")
                llm_analysis = await analyze_message_with_llm(message, urls)
                if llm_analysis:
                    logger.info(f"LLM: is_phishing={llm_analysis.is_phishing}, "
                              f"confidence={llm_analysis.confidence}, "
                              f"trusted={llm_analysis.is_trusted_source}")
            except Exception as e:
                logger.error(f"LLM analysis failed: {e}")
        
        # Calculate combined score with trust override
        combined_score, classification, classification_ar, explanation_ar = \
            calculate_combined_risk(ml_risk_score, llm_analysis, urls)
        
        logger.info(f"FINAL: Risk={combined_score}%, Class={classification}, Trusted={all_trusted}")
        
        return AnalyzeResponse(
            message=message,
            urls_found=len(urls),
            url_predictions=url_predictions,
            ml_risk_score=ml_risk_score,
            llm_analysis=llm_analysis,
            combined_risk_score=combined_score,
            classification=classification,
            classification_ar=classification_ar,
            explanation_ar=explanation_ar,
            status="success"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/report")
async def report_message(request: ReportRequest):
    """Report phishing message"""
    try:
        logger.info(f"Report received: {len(request.message)} chars")
        
        if not request.message or len(request.message.strip()) == 0:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        return {
            "status": "success",
            "message": "Report received successfully",
            "reference_id": f"TN-{hash(request.message) % 100000:05d}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Report error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to submit report")


@app.on_event("startup")
async def startup_event():
    logger.info("=" * 60)
    logger.info("Tanabbah Enhanced API v2.1 Starting...")
    logger.info(f"ML Model: {MODEL_LOADED}")
    logger.info(f"LLM: {is_llm_available()}")
    logger.info(f"Features: Trust Override, Arabic UX, Corrected Scoring")
    logger.info("=" * 60)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")