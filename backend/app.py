import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from backend.ml import predict_url, extract_urls, MODEL_LOADED, URLPrediction, load_model
from backend.llm import analyze_message_with_llm, llm_client, LLMAnalysis

app = FastAPI(
    title="Tanabbah Enhanced Phishing Detection API",
    version="2.0.0"
)

# ---------------------- CORS ----------------------
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# ---------------------- Models ----------------------
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

# ---------------------- Health ----------------------
@app.get("/")
async def root():
    return {"status":"online","model_loaded":MODEL_LOADED,"llm_enabled":llm_client is not None}

@app.get("/health")
async def health_check():
    return {"status":"healthy","model_loaded":MODEL_LOADED,"llm_enabled":llm_client is not None}

# ---------------------- Analyze ----------------------
@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_message(request: AnalyzeRequest):
    try:
        message = request.message
        enable_llm = request.enable_llm

        urls = extract_urls(message)
        url_predictions = []
        total_prob = 0.0
        for url in urls:
            pred = predict_url(url)
            url_predictions.append(pred)
            total_prob += pred.probability

        ml_risk_score = round((total_prob / len(url_predictions) * 100) if url_predictions else 0.0,2)

        llm_analysis = None
        if enable_llm and llm_client:
            llm_analysis = await analyze_message_with_llm(message, urls)

        combined_risk_score = ml_risk_score
        if llm_analysis:
            llm_score = llm_analysis.context_score if llm_analysis.is_phishing else (100 - llm_analysis.context_score)
            combined_risk_score = round((ml_risk_score*0.4) + (llm_score*0.6),2)

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
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------- Main ----------------------
if __name__=="__main__":
    import uvicorn
    port = int(os.getenv("PORT",8080))
    print(f"Starting API on port {port} | ML Loaded: {MODEL_LOADED} | LLM Enabled: {llm_client is not None}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
