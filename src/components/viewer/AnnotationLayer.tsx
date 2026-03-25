import { useEffect, useRef, useCallback } from 'react';
import { AnnotationManager } from '../../services/annotationManager';
import { annotationManagers } from '../../services/annotationRegistry';
import { useAnnotationStore } from '../../store/annotationStore';
import { useUIStore } from '../../store/uiStore';
import { useDocumentStore } from '../../store/documentStore';

interface AnnotationLayerProps {
  pageIndex: number;
  width: number;
  height: number;
}

export function AnnotationLayer({ pageIndex, width, height }: AnnotationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<AnnotationManager | null>(null);
  const {
    activeTool, activeColor, activeStrokeWidth, activeOpacity,
    activeFontSize, activeFontFamily,
    activeFontBold, activeFontItalic, activeFontUnderline, activeFontStrikethrough,
    activeStampLabel, setSelectedObjectProps, pendingSignatureDataURL,
  } = useUIStore();
  const { savePageAnnotations, pushHistory, annotations } = useAnnotationStore();
  const { pages } = useDocumentStore();

  const onChange = useCallback(
    (json: object) => {
      savePageAnnotations(pageIndex, json);
      pushHistory(pageIndex, json);
    },
    [pageIndex, savePageAnnotations, pushHistory]
  );

  // Save-only callback: persists annotations without pushing to undo history.
  // Used by resize() so that zoom changes don't pollute the undo stack.
  const onSaveOnly = useCallback(
    (json: object) => {
      savePageAnnotations(pageIndex, json);
    },
    [pageIndex, savePageAnnotations]
  );

  // ── Effect 1: INIT — only on mount / page change ──────────────────────────
  // Never re-runs on zoom change so annotations survive zooming.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const manager = new AnnotationManager(onChange);
    manager.initialize(canvas, width, height);
    manager.onSaveOnly(onSaveOnly);
    manager.onSelectionChange((props) => setSelectedObjectProps(props));
    managerRef.current = manager;
    annotationManagers.set(pageIndex, manager);

    // Load existing annotations (user-added via fabric)
    const existing = annotations[pageIndex];
    const hasFabricAnnotations =
      existing?.fabricJSON &&
      typeof existing.fabricJSON === 'object' &&
      'objects' in (existing.fabricJSON as object) &&
      ((existing.fabricJSON as { objects: unknown[] }).objects?.length ?? 0) > 0;

    if (hasFabricAnnotations) {
      manager.loadFromJSON(existing.fabricJSON);
    } else {
      // No existing fabric annotations — load editable objects from PDF's own annotations
      const pageMeta = pages[pageIndex];
      const rawAnnotations = pageMeta?.annotations ?? [];
      if (rawAnnotations.length > 0) {
        const naturalW = pageMeta.width;
        const naturalH = pageMeta.height;
        const scaleX = width / naturalW;
        const scaleY = height / naturalH;

        const objects = rawAnnotations.map((ann) => {
          const [x1, y1, x2, y2] = ann.rect;
          // Convert PDF coords (origin bottom-left, y up) to viewport coords (origin top-left, y down)
          const left = x1 * scaleX;
          const top = (naturalH - y2) * scaleY;
          const w = (x2 - x1) * scaleX;
          const h = (y2 - y1) * scaleY;
          const fontSize = ann.fontSize ?? Math.max(Math.round(h * 0.65), 8);

          return {
            type: 'Textbox',
            left,
            top,
            width: w,
            height: h,
            text: ann.content,
            fontSize,
            fill: '#000000',
            fontFamily: 'Helvetica',
            originX: 'left',
            originY: 'top',
            selectable: true,
            editable: true,
          };
        });

        manager.loadFromJSON({ version: '6.0.0', objects });
      }
    }

    return () => {
      annotationManagers.delete(pageIndex);
      manager.destroy();
      managerRef.current = null;
      setSelectedObjectProps(null);
    };
    // Intentionally excludes width/height — zoom-driven resizes handled by Effect 2
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex]);

  // ── Effect 2: RESIZE — runs when zoom changes (width/height change) ────────
  // Scales all existing objects proportionally instead of destroying the canvas.
  useEffect(() => {
    managerRef.current?.resize(width, height);
  }, [width, height]);

  // Update tool when it changes
  useEffect(() => {
    managerRef.current?.setTool(activeTool, {
      color: activeColor,
      opacity: activeOpacity,
      strokeWidth: activeStrokeWidth,
      fontSize: activeFontSize,
      fontFamily: activeFontFamily,
      fontBold: activeFontBold,
      fontItalic: activeFontItalic,
      fontUnderline: activeFontUnderline,
      fontStrikethrough: activeFontStrikethrough,
      stampLabel: activeStampLabel,
      signatureDataURL: pendingSignatureDataURL ?? undefined,
    });
  }, [
    activeTool, activeColor, activeOpacity, activeStrokeWidth,
    activeFontSize, activeFontFamily,
    activeFontBold, activeFontItalic, activeFontUnderline, activeFontStrikethrough,
    activeStampLabel, pendingSignatureDataURL,
  ]);

  return (
    <div
      className="annotation-canvas-container"
      style={{
        position: 'absolute', top: 0, left: 0, width, height, zIndex: 3,
        // Pan mode: pass all pointer events through to the text/form layer below
        pointerEvents: activeTool === 'pan' ? 'none' : 'auto',
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
