"""
Pruebas automatizadas del ML Recommendation Service — Promexa
Criterio: Pruebas automatizadas y evidencia de resultados

Ejecutar con:  python -m pytest tests/ -v
"""
import sys
import os

# Añadir el directorio raíz al path para importar la app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

INTERNAL_TOKEN = "internal_ml_service_token"


# ---------------------------------------------------------------------------
# 1. Health check
# ---------------------------------------------------------------------------

def test_health_check():
    """El servicio responde con status ok y nombre del servicio."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data


# ---------------------------------------------------------------------------
# 2. Endpoint de recomendaciones — casos base
# ---------------------------------------------------------------------------

def test_empty_candidates_returns_empty_list():
    """Con lista de candidatos vacía, el resultado debe ser una lista vacía."""
    response = client.post(
        "/recommendations/users",
        headers={"x-internal-token": INTERNAL_TOKEN},
        json={"user_id": "alice", "candidates": []},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "alice"
    assert data["recommended_users"] == []


def test_single_candidate_is_scored_and_returned():
    """Un candidato único siempre aparece con score en rango [55, 99]."""
    response = client.post(
        "/recommendations/users",
        headers={"x-internal-token": INTERNAL_TOKEN},
        json={
            "user_id": "alice",
            "candidates": [
                {"id": "bob", "name": "Bob", "mutual_count": 3, "tags": ["tech"], "location": "Lima"}
            ],
            "user_features": {"id": "alice", "tags": ["tech"], "location": "Lima"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["recommended_users"]) == 1
    item = data["recommended_users"][0]
    assert item["id"] == "bob"
    assert 55.0 <= item["score"] <= 99.0


# ---------------------------------------------------------------------------
# 3. Lógica de scoring — Jaccard similarity de tags
# ---------------------------------------------------------------------------

def test_shared_tags_increase_score_compared_to_no_tags():
    """
    Postcondición: candidato con tags compartidos obtiene score >= candidato sin tags.
    Verifica la componente de Jaccard en el modelo de recomendación.
    """
    def score_for(tags_candidate, tags_user):
        response = client.post(
            "/recommendations/users",
            headers={"x-internal-token": INTERNAL_TOKEN},
            json={
                "user_id": "alice",
                "user_features": {"id": "alice", "tags": tags_user, "location": ""},
                "candidates": [{"id": "bob", "name": "Bob", "tags": tags_candidate, "mutual_count": 0}],
            },
        )
        return response.json()["recommended_users"][0]["score"]

    score_shared = score_for(["tech", "music"], ["tech", "music"])  # Jaccard = 1.0
    score_none = score_for([], [])                                   # Jaccard = 0.0
    assert score_shared >= score_none, (
        f"Tags compartidos deberían dar score mayor: {score_shared} >= {score_none}"
    )


def test_partial_tag_overlap_gives_intermediate_score():
    """Jaccard parcial produce score intermedio (monotonía del scoring)."""
    def score_for(tags_candidate, tags_user):
        response = client.post(
            "/recommendations/users",
            headers={"x-internal-token": INTERNAL_TOKEN},
            json={
                "user_id": "alice",
                "user_features": {"id": "alice", "tags": tags_user, "location": ""},
                "candidates": [{"id": "bob", "name": "Bob", "tags": tags_candidate, "mutual_count": 0}],
            },
        )
        return response.json()["recommended_users"][0]["score"]

    score_full = score_for(["a", "b", "c"], ["a", "b", "c"])    # Jaccard = 1.0
    score_partial = score_for(["a", "x", "y"], ["a", "b", "c"]) # Jaccard = 0.2
    score_zero = score_for(["x", "y", "z"], ["a", "b", "c"])    # Jaccard = 0.0
    assert score_full >= score_partial >= score_zero


# ---------------------------------------------------------------------------
# 4. Lógica de scoring — mutual friends (graph affinity)
# ---------------------------------------------------------------------------

def test_mutual_friends_increase_score():
    """
    Más amigos en común → mayor score del grafo.
    Verifica la componente de afinidad de grafo (45% del score total).
    """
    def score_for(mutual_count):
        response = client.post(
            "/recommendations/users",
            headers={"x-internal-token": INTERNAL_TOKEN},
            json={
                "user_id": "alice",
                "candidates": [{"id": "bob", "name": "Bob", "mutual_count": mutual_count}],
            },
        )
        return response.json()["recommended_users"][0]["score"]

    assert score_for(5) >= score_for(2) >= score_for(0)


def test_recommendation_reason_reflects_mutual_friends():
    """
    Candidatos con >= 2 amigos en común reciben razón que menciona 'amigos' o 'común'.
    Verifica la postcondición sobre el campo recommendation_reason.
    """
    response = client.post(
        "/recommendations/users",
        headers={"x-internal-token": INTERNAL_TOKEN},
        json={
            "user_id": "alice",
            "candidates": [{"id": "bob", "name": "Bob", "mutual_count": 3}],
        },
    )
    item = response.json()["recommended_users"][0]
    reason = item["recommendation_reason"].lower()
    assert "amigos" in reason or "común" in reason, f"Razón inesperada: {item['recommendation_reason']}"


# ---------------------------------------------------------------------------
# 5. Ordenamiento — los candidatos deben estar ordenados por score descendente
# ---------------------------------------------------------------------------

def test_results_are_sorted_by_score_descending():
    """
    Invariante de la respuesta: recommended_users está ordenado por score descendente.
    """
    response = client.post(
        "/recommendations/users",
        headers={"x-internal-token": INTERNAL_TOKEN},
        json={
            "user_id": "alice",
            "user_features": {"id": "alice", "tags": ["tech", "music"], "location": "Lima"},
            "candidates": [
                {"id": "c1", "name": "C1", "mutual_count": 0, "tags": [], "location": ""},
                {"id": "c2", "name": "C2", "mutual_count": 5, "tags": ["tech", "music"], "location": "Lima"},
                {"id": "c3", "name": "C3", "mutual_count": 2, "tags": ["tech"], "location": ""},
                {"id": "c4", "name": "C4", "mutual_count": 1, "tags": [], "location": "Lima"},
            ],
        },
    )
    assert response.status_code == 200
    scores = [item["score"] for item in response.json()["recommended_users"]]
    assert scores == sorted(scores, reverse=True), f"Scores no están ordenados: {scores}"


# ---------------------------------------------------------------------------
# 6. Límite de candidatos devueltos
# ---------------------------------------------------------------------------

def test_limit_parameter_caps_results():
    """El parámetro `limit` debe restringir la cantidad de resultados devueltos."""
    candidates = [{"id": f"user-{i}", "name": f"User {i}", "mutual_count": i} for i in range(20)]
    response = client.post(
        "/recommendations/users",
        headers={"x-internal-token": INTERNAL_TOKEN},
        json={"user_id": "alice", "limit": 5, "candidates": candidates},
    )
    assert response.status_code == 200
    assert len(response.json()["recommended_users"]) == 5


def test_default_limit_is_12():
    """Sin parámetro limit, el default es 12."""
    candidates = [{"id": f"user-{i}", "name": f"User {i}", "mutual_count": i} for i in range(20)]
    response = client.post(
        "/recommendations/users",
        headers={"x-internal-token": INTERNAL_TOKEN},
        json={"user_id": "alice", "candidates": candidates},
    )
    assert len(response.json()["recommended_users"]) == 12


# ---------------------------------------------------------------------------
# 7. Seguridad — token interno inválido
# ---------------------------------------------------------------------------

def test_invalid_internal_token_returns_403():
    """Precondición de seguridad: token interno inválido es rechazado con 403."""
    response = client.post(
        "/recommendations/users",
        headers={"x-internal-token": "wrong-token"},
        json={"user_id": "alice", "candidates": []},
    )
    assert response.status_code == 403


def test_missing_token_is_allowed_by_default():
    """
    Sin token, el endpoint acepta la petición.
    Comportamiento documentado: token es opcional para compatibilidad interna.
    """
    response = client.post(
        "/recommendations/users",
        json={"user_id": "alice", "candidates": []},
    )
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# 8. Modelo version y estructura de respuesta
# ---------------------------------------------------------------------------

def test_response_includes_model_version():
    """La respuesta siempre incluye model_version como metadato del modelo."""
    response = client.post(
        "/recommendations/users",
        headers={"x-internal-token": INTERNAL_TOKEN},
        json={
            "user_id": "alice",
            "candidates": [{"id": "bob", "name": "Bob", "mutual_count": 1}],
        },
    )
    data = response.json()
    assert "model_version" in data
    assert data["model_version"] == "promexa-graph-v1"
    item = data["recommended_users"][0]
    assert item["model_version"] == "promexa-graph-v1"
