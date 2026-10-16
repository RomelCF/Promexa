from fastapi import FastAPI, HTTPException, Header, Depends
from typing import List, Optional
from pydantic import BaseModel
import os

app = FastAPI(
    title="Promexa ML Recommendation Service",
    description="Servicio interno de Machine Learning para cálculo de recomendaciones y afinidad de usuarios.",
    version="1.0.0"
)

class RecommendationRequest(BaseModel):
    user_id: str
    limit: Optional[int] = 10
    categories: Optional[List[str]] = None

class RecommendationResponse(BaseModel):
    user_id: str
    recommended_items: List[str]
    model_version: str

def verify_internal_token(x_internal_token: Optional[str] = Header(None)):
    expected_token = os.getenv("ML_INTERNAL_API_KEY", "internal_ml_service_token")
    if x_internal_token and x_internal_token != expected_token:
        raise HTTPException(status_code=403, detail="Invalid internal token")
    return True

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ml-recommendation-engine"}

@app.post("/recommendations/users", response_model=RecommendationResponse, dependencies=[Depends(verify_internal_token)])
def get_user_recommendations(req: RecommendationRequest):
    # TODO: Implementar lógica con scikit-learn / pandas extrayendo grafos de Neo4j y datos de PostgreSQL
    return RecommendationResponse(
        user_id=req.user_id,
        recommended_items=[],
        model_version="baseline-v1"
    )
