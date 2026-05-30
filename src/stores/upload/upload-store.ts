import { create } from "zustand";

export interface UploadedFileInfo {
  fileName: string;
  fileSize: number; // in bytes
  rows: number | null;
  columns: number | null;
  uploadTime: Date;
}

export interface UploadStoreState {
  uploadedFile: UploadedFileInfo | null;
  setUploadedFile: (info: UploadedFileInfo) => void;
  clearUploadedFile: () => void;
}

export const useUploadStore = create<UploadStoreState>()((set) => ({
  uploadedFile: null,
  setUploadedFile: (info) => set({ uploadedFile: info }),
  clearUploadedFile: () => set({ uploadedFile: null }),
}));
