from fastapi import FastAPI, HTTPException, Header, Depends
from typing import List, Optional
from pydantic import BaseModel
import os

app = FastAPI(
    title="Promexa ML Recommendation Service",
    description="Servicio interno de Machine Learning para cálculo de recomendaciones y afinidad de usuarios.",
    version="1.0.0"
)

class CandidateUser(BaseModel):
    id: str
    name: str
    avatar: Optional[str] = None
    profile_type: Optional[str] = "personal"
    is_verified: Optional[bool] = False
    location: Optional[str] = None
    mutual_count: Optional[int] = 0
    tags: Optional[List[str]] = []

class UserFeatures(BaseModel):
    id: str
    tags: Optional[List[str]] = []
    location: Optional[str] = None

class RecommendationRequest(BaseModel):
    user_id: str
    limit: Optional[int] = 12
    user_features: Optional[UserFeatures] = None
    candidates: Optional[List[CandidateUser]] = []

class RecommendedUserItem(BaseModel):
    id: str
    score: float
    mutual_count: int
    recommendation_reason: str
    model_version: str = "promexa-graph-v1"

class RecommendationResponse(BaseModel):
    user_id: str
    recommended_users: List[RecommendedUserItem]
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
    candidates = req.candidates or []
    scored_items = []

    user_tags = set(t.lower() for t in (req.user_features.tags if req.user_features and req.user_features.tags else []))
    user_location = (req.user_features.location or "").lower() if req.user_features else ""

    for candidate in candidates:
        candidate_tags = set(t.lower() for t in (candidate.tags or []))

        # 1. Jaccard similarity de intereses/tags
        tag_similarity = 0.0
        if user_tags and candidate_tags:
            intersection = len(user_tags.intersection(candidate_tags))
            union = len(user_tags.union(candidate_tags))
            tag_similarity = (intersection / union) if union > 0 else 0.0
        elif candidate_tags:
            tag_similarity = 0.35

        # 2. Graph mutual friends affinity
        mutual_count = candidate.mutual_count or 0
        graph_score = min(1.0, mutual_count / 5.0) if mutual_count > 0 else 0.2

        # 3. Location proximity score
        cand_location = (candidate.location or "").lower()
        location_score = 1.0 if user_location and cand_location and user_location in cand_location else 0.6

        # 4. Score final ponderado (Grafo: 45%, Tags: 35%, Ubicación: 20%)
        final_score = (graph_score * 0.45) + (tag_similarity * 0.35) + (location_score * 0.20)
        final_percentage = round(min(99.0, max(55.0, final_score * 100)), 1)

        # Motivo de la recomendación basado en el modelo ML
        if mutual_count >= 2:
            reason = f"{mutual_count} amigos en común · Alta afinidad en red"
        elif tag_similarity >= 0.3:
            reason = "Intereses compartidos y publicaciones afines"
        elif candidate.is_verified:
            reason = "Miembro destacado de la comunidad local"
        else:
            reason = "Conexión sugerida en tu área"

        scored_items.append(RecommendedUserItem(
            id=candidate.id,
            score=final_percentage,
            mutual_count=mutual_count,
            recommendation_reason=reason,
            model_version="promexa-graph-v1"
        ))

    # Ordenar por afinidad ML descendente
    scored_items.sort(key=lambda x: x.score, reverse=True)
    limit = req.limit or 12

    return RecommendationResponse(
        user_id=req.user_id,
        recommended_users=scored_items[:limit],
        model_version="promexa-graph-v1"
    )
