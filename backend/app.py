"""
========================================
Tanabbah - Main API Server
========================================
Purpose: FastAPI server with ML and LLM integration
Author: Manal Alyami
Version: 2.0.0
========================================
"""

import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

# Import our modules
from backend.ml import (
    predict_url, 
    extract_urls, 
    MODEL_LOADED, 
    URLPrediction
)
from backend.llm import (
    analyze_message_with_llm, 
    is_llm_available,
    LLMAnalysis
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Tanabbah Enhanced Phishing Detection API",
    description="AI-powered phishing detection with ML and LLM analysis",
    version="2.0.0"
)

# ============================================================================
# CORS Configuration
# ============================================================================

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# ============================================================================
# Request/Response Models
# ============================================================================

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
    status: str

class ReportRequest(BaseModel):
    message: str
    timestamp: Optional[str] = None
    language: Optional[str] = "ar"

# ============================================================================
# Global Error Handler
# ============================================================================

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

# ============================================================================
# Health Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint with system status"""
    return {
        "status": "online",
        "service": "Tanabbah Phishing Detection API",
        "version": "2.0.0",
        "model_loaded": MODEL_LOADED,
        "llm_enabled": is_llm_available()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": MODEL_LOADED,
        "llm_enabled": is_llm_available(),
        "endpoints": ["/", "/health", "/api/analyze", "/api/report"]
    }

# ============================================================================
# Analysis Endpoint
# ============================================================================

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_message(request: AnalyzeRequest):
    """
    Analyze message for phishing indicators
    
    - Extracts URLs and analyzes them with ML model
    - Performs contextual analysis with LLM
    - Returns combined risk score and detailed findings
    """
    try:
        logger.info(f"Analyzing message (length: {len(request.message)})")
        
        # Validate input
        if not request.message or len(request.message.strip()) == 0:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        if len(request.message) > 10000:
            raise HTTPException(status_code=400, detail="Message too long (max 10000 characters)")
        
        message = request.message.strip()
        enable_llm = request.enable_llm and is_llm_available()
        
        # Extract URLs
        urls = extract_urls(message)
        logger.info(f"Found {len(urls)} URLs")
        
        # Analyze URLs with ML model
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
                # Add safe prediction on error
                url_predictions.append(URLPrediction(
                    url=url,
                    prediction=0,
                    probability=0.5,
                    features={}
                ))
                total_prob += 0.5
        
        # Calculate ML risk score
        ml_risk_score = round(
            (total_prob / len(url_predictions) * 100) if url_predictions else 0.0,
            2
        )
        logger.info(f"ML Risk Score: {ml_risk_score}%")
        
        # Perform LLM analysis if enabled
        llm_analysis = None
        if enable_llm:
            try:
                logger.info("Performing LLM analysis...")
                llm_analysis = await analyze_message_with_llm(message, urls)
                if llm_analysis:
                    logger.info(f"LLM Analysis: is_phishing={llm_analysis.is_phishing}, score={llm_analysis.context_score}")
            except Exception as e:
                logger.error(f"LLM analysis failed: {e}")
                # Continue without LLM analysis
        
        # Calculate combined risk score
        combined_risk_score = ml_risk_score
        
        if llm_analysis:
            # If LLM says phishing, use context_score
            # If LLM says not phishing, invert the score
            llm_score = llm_analysis.context_score if llm_analysis.is_phishing else (100 - llm_analysis.context_score)
            
            # Weighted combination: 40% ML, 60% LLM
            combined_risk_score = round((ml_risk_score * 0.4) + (llm_score * 0.6), 2)
            logger.info(f"Combined Risk Score: {combined_risk_score}% (ML: {ml_risk_score}%, LLM: {llm_score}%)")
        
        # Return response
        return AnalyzeResponse(
            message=message,
            urls_found=len(urls),
            url_predictions=url_predictions,
            ml_risk_score=ml_risk_score,
            llm_analysis=llm_analysis,
            combined_risk_score=combined_risk_score,
            status="success"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )

# ============================================================================
# Report Endpoint
# ============================================================================

@app.post("/api/report")
async def report_message(request: ReportRequest):
    """
    Report a phishing message to authorities
    
    Note: This is a placeholder endpoint.
    In production, integrate with actual reporting systems.
    """
    try:
        logger.info(f"Report received: {len(request.message)} chars, lang={request.language}")
        
        # Validate input
        if not request.message or len(request.message.strip()) == 0:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # In production: Send to authorities, save to database, etc.
        # For now, just log and acknowledge
        
        return {
            "status": "success",
            "message": "Report received successfully",
            "reference_id": f"TN-{hash(request.message) % 100000:05d}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Report error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to submit report"
        )

# ============================================================================
# Startup Event
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Log system status on startup"""
    logger.info("=" * 60)
    logger.info("Tanabbah API Starting...")
    logger.info(f"ML Model Loaded: {MODEL_LOADED}")
    logger.info(f"LLM Enabled: {is_llm_available()}")
    logger.info(f"CORS Origins: {ALLOWED_ORIGINS}")
    logger.info("=" * 60)

# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8080))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    logger.info(f"Starting server on port {port} (debug={debug})")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="debug" if debug else "info",
        access_log=True
    )