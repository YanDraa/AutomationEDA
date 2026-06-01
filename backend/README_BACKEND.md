Automation EDA FastAPI backend.

Run:
1) python -m venv .venv
2) .venv\Scripts\activate   (Windows)
3) pip install -r requirements.txt
4) uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Endpoints:
- POST /api/upload
- POST /api/analysis/numeric
- POST /api/analysis/categorical
- POST /api/analysis/association

