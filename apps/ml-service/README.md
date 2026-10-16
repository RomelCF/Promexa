# ML Recommendation Service (Python)

Servicio desacoplado en Python encargado del procesamiento de datos y modelos de Machine Learning (Pandas, Scikit-learn, Numpy) para la generación de recomendaciones personalizadas de usuarios, publicaciones y productos.

## Arquitectura del Servicio
- **FastAPI**: API interna de alto rendimiento consumida de manera privada por el Backend NestJS.
- **Fuentes de Datos**:
  - Extrae características de afinidad y caminos relacionales desde **Neo4j**.
  - Extrae metadatos transaccionales e historial de interacción desde **PostgreSQL**.
- **Modelos**:
  - Algoritmos de filtrado colaborativo y basado en contenido (Scikit-learn).
  - Pipelines de preprocesamiento y clustering con Pandas.

## Ejecución Local
```bash
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
