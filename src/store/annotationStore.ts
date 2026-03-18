import { create } from 'zustand';
import type { PageAnnotations, StickyNote } from '../types/annotation.types';
import type { SignatureData } from '../types/signature.types';

interface AnnotationStore {
  annotations: Record<number, PageAnnotations>;
  stickyNotes: StickyNote[];
  savedSignatures: SignatureData[];
  history: Record<number, object[]>;
  historyIndex: Record<number, number>;

  savePageAnnotations: (pageIndex: number, fabricJSON: object) => void;
  updateFormValue: (
    pageIndex: number,
    fieldName: string,
    value: string
  ) => void;
  getFormValues: () => Record<string, string>;
  addStickyNote: (note: Omit<StickyNote, 'id' | 'createdAt'>) => void;
  updateStickyNote: (id: string, content: string) => void;
  deleteStickyNote: (id: string) => void;
  addSignature: (sig: Omit<SignatureData, 'id'>) => void;
  deleteSignature: (id: string) => void;
  canUndo: (pageIndex: number) => boolean;
  canRedo: (pageIndex: number) => boolean;
  pushHistory: (pageIndex: number, fabricJSON: object) => void;
  undo: (pageIndex: number) => object | null;
  redo: (pageIndex: number) => object | null;
  remapAnnotations: (newOrder: number[]) => void;
  clearPageAnnotations: (pageIndex: number) => void;
  clearAll: () => void;
}

let nextId = 0;
const genId = () => `ann_${++nextId}_${Date.now()}`;

export const useAnnotationStore = create<AnnotationStore>((set, get) => ({
  annotations: {},
  stickyNotes: [],
  savedSignatures: [],
  history: {},
  historyIndex: {},

  savePageAnnotations: (pageIndex, fabricJSON) =>
    set((s) => ({
      annotations: {
        ...s.annotations,
        [pageIndex]: {
          pageIndex,
          fabricJSON,
          formValues: s.annotations[pageIndex]?.formValues ?? {},
        },
      },
    })),

  updateFormValue: (pageIndex, fieldName, value) =>
    set((s) => {
      const existing = s.annotations[pageIndex] ?? {
        pageIndex,
        fabricJSON: {},
        formValues: {},
      };
      return {
        annotations: {
          ...s.annotations,
          [pageIndex]: {
            ...existing,
            formValues: { ...existing.formValues, [fieldName]: value },
          },
        },
      };
    }),

  getFormValues: () => {
    const all: Record<string, string> = {};
    for (const ann of Object.values(get().annotations)) {
      Object.assign(all, ann.formValues);
    }
    return all;
  },

  addStickyNote: (note) =>
    set((s) => ({
      stickyNotes: [
        ...s.stickyNotes,
        { ...note, id: genId(), createdAt: new Date().toISOString() },
      ],
    })),

  updateStickyNote: (id, content) =>
    set((s) => ({
      stickyNotes: s.stickyNotes.map((n) =>
        n.id === id ? { ...n, content } : n
      ),
    })),

  deleteStickyNote: (id) =>
    set((s) => ({
      stickyNotes: s.stickyNotes.filter((n) => n.id !== id),
    })),

  addSignature: (sig) =>
    set((s) => ({
      savedSignatures: [...s.savedSignatures, { ...sig, id: genId() }],
    })),

  deleteSignature: (id) =>
    set((s) => ({
      savedSignatures: s.savedSignatures.filter((sig) => sig.id !== id),
    })),

  canUndo: (pageIndex) => {
    const s = get();
    const idx = s.historyIndex[pageIndex] ?? -1;
    return idx > 0;
  },

  canRedo: (pageIndex) => {
    const s = get();
    const idx = s.historyIndex[pageIndex] ?? -1;
    const pageHistory = s.history[pageIndex] ?? [];
    return idx < pageHistory.length - 1;
  },

  pushHistory: (pageIndex, fabricJSON) =>
    set((s) => {
      const pageHistory = s.history[pageIndex] ?? [];
      const idx = s.historyIndex[pageIndex] ?? -1;
      const trimmed = pageHistory.slice(0, idx + 1);
      const updated = [...trimmed, fabricJSON].slice(-50);
      return {
        history: { ...s.history, [pageIndex]: updated },
        historyIndex: {
          ...s.historyIndex,
          [pageIndex]: updated.length - 1,
        },
      };
    }),

  undo: (pageIndex) => {
    const s = get();
    const idx = s.historyIndex[pageIndex] ?? -1;
    if (idx <= 0) return null;
    const newIdx = idx - 1;
    set({
      historyIndex: { ...s.historyIndex, [pageIndex]: newIdx },
    });
    return s.history[pageIndex]?.[newIdx] ?? null;
  },

  redo: (pageIndex) => {
    const s = get();
    const idx = s.historyIndex[pageIndex] ?? -1;
    const pageHistory = s.history[pageIndex] ?? [];
    if (idx >= pageHistory.length - 1) return null;
    const newIdx = idx + 1;
    set({
      historyIndex: { ...s.historyIndex, [pageIndex]: newIdx },
    });
    return pageHistory[newIdx] ?? null;
  },

  remapAnnotations: (newOrder) =>
    set((s) => {
      const newAnnotations: Record<number, PageAnnotations> = {};
      newOrder.forEach((oldIdx, newIdx) => {
        if (s.annotations[oldIdx]) {
          newAnnotations[newIdx] = {
            ...s.annotations[oldIdx],
            pageIndex: newIdx,
          };
        }
      });
      return { annotations: newAnnotations, history: {}, historyIndex: {} };
    }),

  clearPageAnnotations: (pageIndex) =>
    set((s) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [pageIndex]: _removed, ...rest } = s.annotations;
      return { annotations: rest };
    }),

  clearAll: () =>
    set({
      annotations: {},
      stickyNotes: [],
      history: {},
      historyIndex: {},
    }),
}));
