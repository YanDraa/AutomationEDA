# TODO

## Backend + Frontend sync for automated EDA

- [x] Replace `backend/main.py` with complete implementation of `POST /api/data/analyze` that:
  - [x] Accepts `UploadFile`
  - [x] Preserves all rows (no global drops)
  - [x] Computes `summary_stats`, `pearson_matrix`, `cramers_v_matrix`
  - [x] Returns `data_preview` = first 50 raw rows as list-of-dicts
  - [x] Ensures all response values are JSON-safe native Python types

- [ ] Update `frontend/src/app/(main)/dashboard/data-preview/page.tsx`:
  - [ ] Switch from `/api/data/clean` to `/api/data/analyze`
  - [ ] Render raw table preview from `response.data.data_preview`
  - [ ] Generate headers dynamically from preview rows
  - [ ] Add example access for `summary_stats`, `pearson_matrix`, `cramers_v_matrix`



