import { useEffect } from 'react';
import * as fabric from 'fabric';
import { useUIStore } from '../store/uiStore';
import { useAnnotationStore } from '../store/annotationStore';
import { annotationManagers } from '../services/annotationRegistry';

export function useKeyboardShortcuts() {
  const { currentPage, activeTool, setTool, zoomIn, zoomOut, setZoom, fitToWidth, fitToPage, scrollToPage, openFindBar } = useUIStore();
  const { undo, redo, canUndo, canUndoForm, undoFormValues, applyFormValues, globalUndo } = useAnnotationStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;

      // Check if a fabric.js IText is currently being edited
      const pageIndex = currentPage - 1;
      const currentManager = annotationManagers.get(pageIndex);
      const fabricCanvas = currentManager?.getCanvas();
      const activeObject = fabricCanvas?.getActiveObject();
      const isEditingText = activeObject && 'isEditing' in activeObject && (activeObject as fabric.IText).isEditing;

      // Always let copy/paste pass through to the active element
      if (isCmd && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
        // Don't intercept — let native/fabric handle copy, paste, cut, select-all
        return;
      }

      // If editing text in fabric, let Ctrl+Z/Y be handled by the textarea (native undo)
      if (isEditingText && isCmd && (e.key === 'z' || e.key === 'y')) {
        return;
      }

      const manager = annotationManagers.get(pageIndex);

      // Undo: Ctrl+Z — per-page fabric > form field > global cross-page
      if (isCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();

        if (canUndo(pageIndex)) {
          const json = undo(pageIndex);
          if (json && manager) {
            const { width, height } = manager.getDimensions();
            manager.loadFromJSON(json).then(() => manager.resize(width, height));
          }
          return;
        }

        // Try form field undo on current page
        if (canUndoForm(pageIndex)) {
          const prevValues = undoFormValues(pageIndex);
          if (prevValues) applyFormValues(pageIndex, prevValues);
          return;
        }

        // Global undo: undo on the most recently edited other page
        const result = globalUndo();
        if (result?.json) {
          const targetManager = annotationManagers.get(result.pageIndex);
          if (targetManager) {
            const { width, height } = targetManager.getDimensions();
            targetManager.loadFromJSON(result.json).then(() => targetManager.resize(width, height));
          }
          scrollToPage(result.pageIndex + 1);
        }
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (isCmd && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        const json = redo(pageIndex);
        if (json && manager) {
          const { width, height } = manager.getDimensions();
          manager.loadFromJSON(json).then(() => manager.resize(width, height));
        }
        return;
      }

      // Zoom: Ctrl+ / Ctrl-
      if (isCmd && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
        return;
      }
      if (isCmd && e.key === '-') {
        e.preventDefault();
        zoomOut();
        return;
      }
      if (isCmd && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        return;
      }

      // Ctrl+G: jump-to-page (focus the page input)
      if (isCmd && e.key === 'g') {
        e.preventDefault();
        const pageInput = document.querySelector('[data-page-input]') as HTMLInputElement;
        if (pageInput) pageInput.focus();
        return;
      }

      // Ctrl+F: find/search
      if (isCmd && e.key === 'f') {
        e.preventDefault();
        openFindBar();
        return;
      }

      // Ctrl+P: print
      if (isCmd && e.key === 'p') {
        e.preventDefault();
        window.print();
        return;
      }

      // Tool shortcuts (single keys, only when not typing in input)
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Also skip tool shortcuts when a Fabric IText is in editing mode
      // (Fabric's hidden textarea may not always be the keydown target)
      if (isEditingText) {
        return;
      }

      switch (e.key) {
        case 'v':
          setTool('select');
          break;
        case 't':
          setTool('text');
          break;
        case 'p':
          setTool('freehand');
          break;
        case 'h':
          setTool('highlight');
          break;
        case 'r':
          setTool('rectangle');
          break;
        case 'a':
          setTool('arrow');
          break;
        case 'e':
          setTool('eraser');
          break;
        case 'Delete':
        case 'Backspace':
          annotationManagers.get(currentPage - 1)?.deleteSelected();
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [currentPage, setTool, undo, redo, canUndo, canUndoForm, undoFormValues, applyFormValues, globalUndo, zoomIn, zoomOut, setZoom, fitToWidth, fitToPage, scrollToPage, activeTool, openFindBar]);
}
