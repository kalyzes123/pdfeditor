import { create } from 'zustand';
import type { PageAnnotations, StickyNote, Comment } from '../types/annotation.types';
import type { SignatureData } from '../types/signature.types';

interface AnnotationStore {
  annotations: Record<number, PageAnnotations>;
  stickyNotes: StickyNote[];
  comments: Comment[];
  savedSignatures: SignatureData[];
  history: Record<number, object[]>;
  historyIndex: Record<number, number>;
  formHistory: Record<number, Record<string, string>[]>;
  formHistoryIndex: Record<number, number>;
  pageEditOrder: number[];

  savePageAnnotations: (pageIndex: number, fabricJSON: object) => void;
  updateFormValue: (
    pageIndex: number,
    fieldName: string,
    value: string
  ) => void;
  applyFormValues: (pageIndex: number, formValues: Record<string, string>) => void;
  canUndoForm: (pageIndex: number) => boolean;
  canRedoForm: (pageIndex: number) => boolean;
  undoFormValues: (pageIndex: number) => Record<string, string> | null;
  redoFormValues: (pageIndex: number) => Record<string, string> | null;
  getFormValues: () => Record<string, string>;
  addStickyNote: (note: Omit<StickyNote, 'id' | 'createdAt'>) => void;
  updateStickyNote: (id: string, content: string) => void;
  deleteStickyNote: (id: string) => void;
  addComment: (comment: Omit<Comment, 'id' | 'createdAt'>) => void;
  updateComment: (id: string, text: string) => void;
  deleteComment: (id: string) => void;
  addSignature: (sig: Omit<SignatureData, 'id'>) => void;
  deleteSignature: (id: string) => void;
  canUndo: (pageIndex: number) => boolean;
  canRedo: (pageIndex: number) => boolean;
  pushHistory: (pageIndex: number, fabricJSON: object) => void;
  globalUndo: () => { pageIndex: number; json: object } | null;
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
  comments: [],
  savedSignatures: [],
  history: {},
  historyIndex: {},
  formHistory: {},
  formHistoryIndex: {},
  pageEditOrder: [],

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
      const existing = s.annotations[pageIndex] ?? { pageIndex, fabricJSON: {}, formValues: {} };
      const newFormValues = { ...existing.formValues, [fieldName]: value };
      const pageFormHistory = s.formHistory[pageIndex] ?? [];
      const fi = s.formHistoryIndex[pageIndex] ?? -1;
      const trimmed = pageFormHistory.slice(0, fi + 1);
      const updated = [...trimmed, newFormValues].slice(-30);
      return {
        annotations: {
          ...s.annotations,
          [pageIndex]: { ...existing, formValues: newFormValues },
        },
        formHistory: { ...s.formHistory, [pageIndex]: updated },
        formHistoryIndex: { ...s.formHistoryIndex, [pageIndex]: updated.length - 1 },
      };
    }),

  applyFormValues: (pageIndex, formValues) =>
    set((s) => ({
      annotations: {
        ...s.annotations,
        [pageIndex]: {
          ...(s.annotations[pageIndex] ?? { pageIndex, fabricJSON: {}, formValues: {} }),
          formValues,
        },
      },
    })),

  canUndoForm: (pageIndex) => {
    const s = get();
    return (s.formHistoryIndex[pageIndex] ?? -1) > 0;
  },

  canRedoForm: (pageIndex) => {
    const s = get();
    const fi = s.formHistoryIndex[pageIndex] ?? -1;
    return fi < (s.formHistory[pageIndex]?.length ?? 0) - 1;
  },

  undoFormValues: (pageIndex) => {
    const s = get();
    const fi = s.formHistoryIndex[pageIndex] ?? -1;
    if (fi <= 0) return null;
    const newFi = fi - 1;
    set({ formHistoryIndex: { ...s.formHistoryIndex, [pageIndex]: newFi } });
    return s.formHistory[pageIndex]?.[newFi] ?? null;
  },

  redoFormValues: (pageIndex) => {
    const s = get();
    const fi = s.formHistoryIndex[pageIndex] ?? -1;
    const pageFormHistory = s.formHistory[pageIndex] ?? [];
    if (fi >= pageFormHistory.length - 1) return null;
    const newFi = fi + 1;
    set({ formHistoryIndex: { ...s.formHistoryIndex, [pageIndex]: newFi } });
    return pageFormHistory[newFi] ?? null;
  },

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

  addComment: (comment) =>
    set((s) => ({
      comments: [
        ...s.comments,
        { ...comment, id: genId(), createdAt: new Date().toISOString() },
      ],
    })),

  updateComment: (id, text) =>
    set((s) => ({
      comments: s.comments.map((c) => (c.id === id ? { ...c, text } : c)),
    })),

  deleteComment: (id) =>
    set((s) => ({
      comments: s.comments.filter((c) => c.id !== id),
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
        historyIndex: { ...s.historyIndex, [pageIndex]: updated.length - 1 },
        pageEditOrder: [...s.pageEditOrder, pageIndex].slice(-100),
      };
    }),

  globalUndo: () => {
    const s = get();
    // Walk backward through pageEditOrder to find a page with something to undo
    for (let i = s.pageEditOrder.length - 1; i >= 0; i--) {
      const pi = s.pageEditOrder[i];
      const idx = s.historyIndex[pi] ?? -1;
      if (idx > 0) {
        const newIdx = idx - 1;
        set({
          historyIndex: { ...s.historyIndex, [pi]: newIdx },
          pageEditOrder: [...s.pageEditOrder.slice(0, i), ...s.pageEditOrder.slice(i + 1)],
        });
        const json = s.history[pi]?.[newIdx];
        return json ? { pageIndex: pi, json } : null;
      }
    }
    return null;
  },

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
      return { annotations: newAnnotations, history: {}, historyIndex: {}, formHistory: {}, formHistoryIndex: {}, pageEditOrder: [] };
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
      comments: [],
      history: {},
      historyIndex: {},
      formHistory: {},
      formHistoryIndex: {},
      pageEditOrder: [],
    }),
}));
