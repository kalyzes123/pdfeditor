import { create } from 'zustand';
import type { AnnotationTool } from '../types/annotation.types';
import { useDocumentStore } from './documentStore';

type DialogName = 'signature' | 'merge' | 'split';
type DialogKeys = `${DialogName}DialogOpen`;

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface ConfirmOptions {
  message: string;
  onConfirm: () => void;
}

export interface SelectedObjectProps {
  type: 'text' | 'shape' | 'group' | 'freehand' | 'image';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  underline?: boolean;
  linethrough?: boolean;
}

export interface SearchMatch {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UIStore {
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  activeOpacity: number;
  activeFontSize: number;
  activeFontFamily: string;
  activeFontBold: boolean;
  activeFontItalic: boolean;
  activeFontUnderline: boolean;
  activeFontStrikethrough: boolean;
  activeStampLabel: string;
  zoom: number;
  currentPage: number;
  sidebarOpen: boolean;
  isLoading: boolean;
  loadingMessage: string;
  signatureDialogOpen: boolean;
  mergeDialogOpen: boolean;
  splitDialogOpen: boolean;
  viewerContainerWidth: number;
  viewerContainerHeight: number;
  scrollTargetPage: number | null;
  selectedObjectProps: SelectedObjectProps | null;
  findBarOpen: boolean;
  searchQuery: string;
  searchResults: SearchMatch[];
  currentMatchIndex: number;
  toasts: ToastMessage[];
  confirmDialog: ConfirmOptions | null;

  setTool: (tool: AnnotationTool) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setFontBold: (v: boolean) => void;
  setFontItalic: (v: boolean) => void;
  setFontUnderline: (v: boolean) => void;
  setFontStrikethrough: (v: boolean) => void;
  setStampLabel: (label: string) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToWidth: () => void;
  fitToPage: () => void;
  setCurrentPage: (page: number) => void;
  setViewerDimensions: (width: number, height: number) => void;
  scrollToPage: (page: number) => void;
  clearScrollTarget: () => void;
  toggleSidebar: () => void;
  setLoading: (loading: boolean, message?: string) => void;
  openDialog: (dialog: DialogName) => void;
  closeDialog: (dialog: DialogName) => void;
  setSelectedObjectProps: (props: SelectedObjectProps | null) => void;
  openFindBar: () => void;
  closeFindBar: () => void;
  setSearchQuery: (q: string) => void;
  setSearchResults: (results: SearchMatch[]) => void;
  setCurrentMatchIndex: (i: number) => void;
  nextMatch: () => void;
  prevMatch: () => void;
  addToast: (type: ToastMessage['type'], message: string) => void;
  dismissToast: (id: string) => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
  dismissConfirm: () => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  activeTool: 'select',
  activeColor: '#000000',
  activeStrokeWidth: 2,
  activeOpacity: 1,
  activeFontSize: 16,
  activeFontFamily: 'Arial',
  activeFontBold: false,
  activeFontItalic: false,
  activeFontUnderline: false,
  activeFontStrikethrough: false,
  activeStampLabel: 'APPROVED',
  zoom: 1,
  currentPage: 1,
  sidebarOpen: true,
  isLoading: false,
  loadingMessage: '',
  signatureDialogOpen: false,
  mergeDialogOpen: false,
  splitDialogOpen: false,
  viewerContainerWidth: 0,
  viewerContainerHeight: 0,
  scrollTargetPage: null,
  selectedObjectProps: null,
  findBarOpen: false,
  searchQuery: '',
  searchResults: [],
  currentMatchIndex: 0,
  toasts: [],
  confirmDialog: null,

  setTool: (tool) => set({ activeTool: tool }),
  setColor: (color) => set({ activeColor: color }),
  setStrokeWidth: (width) => set({ activeStrokeWidth: width }),
  setOpacity: (opacity) => set({ activeOpacity: opacity }),
  setFontSize: (size) => set({ activeFontSize: size }),
  setFontFamily: (family) => set({ activeFontFamily: family }),
  setFontBold: (v) => set({ activeFontBold: v }),
  setFontItalic: (v) => set({ activeFontItalic: v }),
  setFontUnderline: (v) => set({ activeFontUnderline: v }),
  setFontStrikethrough: (v) => set({ activeFontStrikethrough: v }),
  setStampLabel: (label) => set({ activeStampLabel: label }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(5, zoom)) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(5, s.zoom + 0.25) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(0.25, s.zoom - 0.25) })),

  fitToWidth: () => {
    const { viewerContainerWidth } = get();
    if (!viewerContainerWidth) return;
    const { pages, isDocumentLoaded } = useDocumentStore.getState();
    if (!isDocumentLoaded || pages.length === 0) return;
    const currentPageIndex = get().currentPage - 1;
    const page = pages[Math.min(currentPageIndex, pages.length - 1)];
    const padding = 32;
    const newZoom = (viewerContainerWidth - padding * 2) / page.width;
    set({ zoom: Math.max(0.25, Math.min(5, newZoom)) });
  },

  fitToPage: () => {
    const { viewerContainerWidth, viewerContainerHeight } = get();
    if (!viewerContainerWidth || !viewerContainerHeight) return;
    const { pages, isDocumentLoaded } = useDocumentStore.getState();
    if (!isDocumentLoaded || pages.length === 0) return;
    const currentPageIndex = get().currentPage - 1;
    const page = pages[Math.min(currentPageIndex, pages.length - 1)];
    const padding = 32;
    const fitW = (viewerContainerWidth - padding * 2) / page.width;
    const fitH = (viewerContainerHeight - padding * 2) / page.height;
    const newZoom = Math.min(fitW, fitH);
    set({ zoom: Math.max(0.25, Math.min(5, newZoom)) });
  },

  setCurrentPage: (page) => set({ currentPage: page }),
  setViewerDimensions: (width, height) =>
    set({ viewerContainerWidth: width, viewerContainerHeight: height }),
  scrollToPage: (page) => set({ scrollTargetPage: page }),
  clearScrollTarget: () => set({ scrollTargetPage: null }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setLoading: (loading, message = '') =>
    set({ isLoading: loading, loadingMessage: message }),
  openDialog: (dialog) => set({ [`${dialog}DialogOpen`]: true } as Pick<UIStore, DialogKeys>),
  closeDialog: (dialog) => set({ [`${dialog}DialogOpen`]: false } as Pick<UIStore, DialogKeys>),
  setSelectedObjectProps: (props) => set({ selectedObjectProps: props }),
  openFindBar: () => set({ findBarOpen: true }),
  closeFindBar: () => set({ findBarOpen: false, searchQuery: '', searchResults: [], currentMatchIndex: 0 }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchResults: (results) => set({ searchResults: results, currentMatchIndex: 0 }),
  setCurrentMatchIndex: (i) => set({ currentMatchIndex: i }),
  nextMatch: () => {
    const { searchResults, currentMatchIndex } = get();
    if (!searchResults.length) return;
    set({ currentMatchIndex: (currentMatchIndex + 1) % searchResults.length });
  },
  prevMatch: () => {
    const { searchResults, currentMatchIndex } = get();
    if (!searchResults.length) return;
    set({ currentMatchIndex: (currentMatchIndex - 1 + searchResults.length) % searchResults.length });
  },
  addToast: (type, message) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  showConfirm: (message, onConfirm) => set({ confirmDialog: { message, onConfirm } }),
  dismissConfirm: () => set({ confirmDialog: null }),
}));
