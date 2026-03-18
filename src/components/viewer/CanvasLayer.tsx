import { useEffect, useRef } from 'react';
import { pdfRenderer } from '../../services/pdfRenderer';
import { useDocumentStore } from '../../store/documentStore';
import type { RenderTask } from 'pdfjs-dist';

interface CanvasLayerProps {
  pageIndex: number;
  scale: number;
}

export function CanvasLayer({ pageIndex, scale }: CanvasLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const docVersion = useDocumentStore((s) => s.docVersion);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    const render = async () => {
      // Cancel any in-progress render from a previous run
      try { renderTaskRef.current?.cancel(); } catch { /* ignore */ }
      renderTaskRef.current = null;

      try {
        const page = await pdfRenderer.getPage(pageIndex + 1);
        if (cancelled) return;
        const task = pdfRenderer.renderPage(page, canvas, scale);
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'RenderingCancelledException') return;
        if (cancelled) return;
        console.error('Error rendering page', pageIndex, err);
      }
    };

    render();

    return () => {
      cancelled = true;
      try { renderTaskRef.current?.cancel(); } catch { /* ignore */ }
      renderTaskRef.current = null;
    };
  }, [pageIndex, scale, docVersion]);

  return (
    <canvas
      ref={canvasRef}
      className="block"
      style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
    />
  );
}
