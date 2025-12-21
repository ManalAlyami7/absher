import os
import re
import json
from typing import List, Optional
from pydantic import BaseModel
from huggingface_hub import InferenceClient

HF_API_KEY = os.getenv("HF_API_KEY")
LLM_MODEL = "meta-llama/Meta-Llama-3-8B-Instruct"

# Initialize HuggingFace client
llm_client = InferenceClient(token=HF_API_KEY) if HF_API_KEY else InferenceClient()

class LLMAnalysis(BaseModel):
    is_phishing: bool
    confidence: float
    reasoning: str
    red_flags: List[str]
    context_score: int
    model_used: str

async def analyze_message_with_llm(message: str, urls: List[str]) -> Optional[LLMAnalysis]:
    """Analyze message using Meta-Llama chat API"""
    if not llm_client:
        return None

    urls_text = "\n".join([f"- {url}" for url in urls]) if urls else "None"
    system_message = """You are a cybersecurity analyst. Respond ONLY with JSON:
{"is_phishing": true/false, "confidence": 0-100, "reasoning": "...", "red_flags": ["flag1"], "context_score": 0-100}"""
    user_message = f"MESSAGE:\n{message}\nURLS FOUND:\n{urls_text}"

    try:
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ]

        response = llm_client.chat(model=LLM_MODEL, messages=messages, temperature=0.2)
        response_text = response["generated_text"]

        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return LLMAnalysis(
                is_phishing=data.get("is_phishing", False),
                confidence=float(data.get("confidence",50)),
                reasoning=data.get("reasoning","Analysis completed"),
                red_flags=data.get("red_flags",[]),
                context_score=int(data.get("context_score",50)),
                model_used=LLM_MODEL
            )
    except Exception as e:
        print(f"❌ LLM error: {e}")

    return None
