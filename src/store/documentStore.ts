import { create } from 'zustand';
import type { PageMeta } from '../types/pdf.types';
import { pdfRenderer } from '../services/pdfRenderer';
import { pdfManipulator } from '../services/pdfManipulator';
import { readFileAsArrayBuffer, downloadBlob } from '../utils/fileUtils';
import { useAnnotationStore } from './annotationStore';

interface DocumentStore {
  fileName: string;
  pageCount: number;
  rawBytes: Uint8Array | null;
  pages: PageMeta[];
  isDocumentLoaded: boolean;
  isModified: boolean; // true when there are unsaved changes
  docVersion: number; // increments on every loadFromBytes, forces page re-render

  loadDocument: (file: File) => Promise<void>;
  loadFromBytes: (bytes: Uint8Array, fileName: string) => Promise<void>;
  reorderPages: (newOrder: number[]) => Promise<void>;
  deletePage: (pageIndex: number) => Promise<void>;
  rotatePage: (pageIndex: number, degrees: number) => Promise<void>;
  mergeDocuments: (files: File[]) => Promise<void>;
  splitDocument: (splitPoints: number[]) => Promise<Uint8Array[]>;
  saveDocument: (pageAnnotations: Array<{
    pageIndex: number;
    nonTextDataURL: string;
    textAnnotations: Array<{
      text: string;
      x: number;
      y: number;
      fontSize: number;
      fontFamily: string;
      color: string;
      width: number;
      height: number;
    }>;
    canvasScale: number;
    canvasWidth: number;
    canvasHeight: number;
  }>) => Promise<boolean>;
  setFileName: (name: string) => void;
  setModified: (v: boolean) => void;
  closeDocument: () => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  fileName: '',
  pageCount: 0,
  rawBytes: null,
  pages: [],
  isDocumentLoaded: false,
  isModified: false,
  docVersion: 0,

  loadDocument: async (file: File) => {
    const buffer = await readFileAsArrayBuffer(file);
    const bytes = new Uint8Array(buffer);
    await get().loadFromBytes(bytes, file.name);
  },

  loadFromBytes: async (bytes: Uint8Array, fileName: string) => {
    const proxy = await pdfRenderer.loadDocument(bytes);
    const pageCount = proxy.numPages;
    const pages: PageMeta[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await proxy.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const annotations = await pdfRenderer.getRawAnnotations(i);
      pages.push({
        pageIndex: i - 1,
        width: viewport.width,
        height: viewport.height,
        rotation: page.rotate,
        annotations,
      });
    }

    set((state) => ({
      fileName,
      pageCount,
      rawBytes: bytes,
      pages,
      isDocumentLoaded: true,
      isModified: false,
      docVersion: state.docVersion + 1,
    }));
  },

  reorderPages: async (newOrder: number[]) => {
    const { rawBytes, fileName } = get();
    if (!rawBytes) return;

    const newBytes = await pdfManipulator.reorderPages(rawBytes, newOrder);
    useAnnotationStore.getState().remapAnnotations(newOrder);
    await get().loadFromBytes(newBytes, fileName);
    set({ isModified: true });
  },

  deletePage: async (pageIndex: number) => {
    const { rawBytes, fileName, pageCount } = get();
    if (!rawBytes || pageCount <= 1) return;

    const newBytes = await pdfManipulator.deletePage(rawBytes, pageIndex);
    useAnnotationStore.getState().clearPageAnnotations(pageIndex);
    await get().loadFromBytes(newBytes, fileName);
    set({ isModified: true });
  },

  rotatePage: async (pageIndex: number, degrees: number) => {
    const { rawBytes, fileName } = get();
    if (!rawBytes) return;

    // Flush any in-progress canvas edits to the annotation store before reloading
    const { annotationManagers } = await import('../services/annotationRegistry');
    const manager = annotationManagers.get(pageIndex);
    if (manager) {
      const json = manager.toJSON();
      if (json) useAnnotationStore.getState().savePageAnnotations(pageIndex, json);
    }

    // Clear this page's annotations — coordinates are invalid after rotation
    useAnnotationStore.getState().clearPageAnnotations(pageIndex);

    const newBytes = await pdfManipulator.rotatePage(rawBytes, pageIndex, degrees);
    await get().loadFromBytes(newBytes, fileName);
    set({ isModified: true });
  },

  mergeDocuments: async (files: File[]) => {
    const allBytes: Uint8Array[] = [];
    const { rawBytes } = get();

    if (rawBytes) {
      allBytes.push(rawBytes);
    }

    for (const file of files) {
      const buffer = await readFileAsArrayBuffer(file);
      allBytes.push(new Uint8Array(buffer));
    }

    const mergedBytes = await pdfManipulator.mergeDocuments(allBytes);
    useAnnotationStore.getState().clearAll();
    await get().loadFromBytes(mergedBytes, 'merged.pdf');
    set({ isModified: true });
  },

  splitDocument: async (splitPoints: number[]) => {
    const { rawBytes } = get();
    if (!rawBytes) return [];
    return pdfManipulator.splitDocument(rawBytes, splitPoints);
  },

  saveDocument: async (pageAnnotations) => {
    const { fileName } = get();
    let { rawBytes } = get();
    if (!rawBytes) return false;

    // Flatten form fields
    const formValues = useAnnotationStore.getState().getFormValues();
    if (Object.keys(formValues).length > 0) {
      rawBytes = await pdfManipulator.flattenFormFields(rawBytes, formValues);
    }

    // Embed annotations HD: vector text + rasterized non-text
    if (pageAnnotations.length > 0) {
      rawBytes = await pdfManipulator.embedAnnotationsHD(rawBytes, pageAnnotations);
    }

    const blob = new Blob([rawBytes as BlobPart], { type: 'application/pdf' });
    const outputName = fileName.replace(/\.pdf$/i, '') + '_edited.pdf';

    // Use Save File dialog when available (Chrome/Edge), fallback to auto-download
    if ('showSaveFilePicker' in window) {
      try {
        type FileSystemWritableFileStream = { write(b: Blob): Promise<void>; close(): Promise<void> };
        type FileSystemFileHandle = { createWritable(): Promise<FileSystemWritableFileStream> };
        const handle = await (window as unknown as {
          showSaveFilePicker(opts: object): Promise<FileSystemFileHandle>;
        }).showSaveFilePicker({
          suggestedName: outputName,
          types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        set({ isModified: false });
        return true;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return false; // user cancelled
        // Other error — fall through to auto-download
      }
    }

    downloadBlob(blob, outputName);
    set({ isModified: false });
    return true;
  },

  setFileName: (name: string) => set({ fileName: name }),
  setModified: (v: boolean) => set({ isModified: v }),

  closeDocument: () => {
    pdfRenderer.destroy();
    useAnnotationStore.getState().clearAll();
    set({
      fileName: '',
      pageCount: 0,
      rawBytes: null,
      pages: [],
      isDocumentLoaded: false,
      isModified: false,
    });
  },
}));

// Mark document modified whenever annotation state changes.
// documentStore already imports annotationStore so no circular dep.
useAnnotationStore.subscribe((state, prev) => {
  if (state.annotations !== prev.annotations || state.stickyNotes !== prev.stickyNotes) {
    if (useDocumentStore.getState().isDocumentLoaded) {
      useDocumentStore.getState().setModified(true);
    }
  }
});
