Automation EDA FastAPI backend.

Run:
1) python -m venv .venv
2) .venv\Scripts\activate   (Windows)
3) pip install -r requirements.txt
4) uvicorn main:app --reload

Endpoints:
- GET  /                      (health check)
- GET  /api/current-dataset
- POST /api/upload            (.csv, .xlsx, .xls, .txt, .json)
- POST /api/preview
- POST /api/analysis/numeric
- POST /api/analysis/categorical
- POST /api/insights/univariate
- POST /api/insights/bivariate

