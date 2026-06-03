# Backend Refactor Checklist (Auto EDA Dashboard)

- [ ] Refactor `backend/main.py`:
  - [ ] Add metadata persistence on `/api/upload` into `backend/data/raw/active_dataset_meta.json`
  - [ ] Implement fallback-capable endpoints:
    - [ ] `POST /api/preview` with `file: Optional[UploadFile]`
    - [ ] `POST /api/analysis/numeric` with `file: Optional[UploadFile]`
    - [ ] `POST /api/analysis/categorical` with `file: Optional[UploadFile]`
  - [ ] Ensure each analysis/preview endpoint:
    - [ ] If file provided => parse + update `active_dataset.pkl` + metadata
    - [ ] If file not provided => load from `active_dataset.pkl` else return HTTP 400
  - [ ] Keep helper/statistical functions unchanged
  - [ ] Add compatibility alias if existing routes differ

- [ ] Refactor frontend:
  - [ ] Remove “Muat Preview” / preview-upload button from the top-right of every menu (except upload page)
  - [ ] Ensure menus read dataset from `dataset-context` and call backend automatically without requiring re-upload

