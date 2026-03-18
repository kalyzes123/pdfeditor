import { useEffect, useState } from 'react';
import { pdfRenderer } from '../../services/pdfRenderer';
import { CanvasLayer } from './CanvasLayer';
import { TextLayer } from './TextLayer';
import { AnnotationLayer } from './AnnotationLayer';

interface PDFPageProps {
  pageIndex: number;
  scale: number;
}

export function PDFPage({ pageIndex, scale }: PDFPageProps) {
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadDimensions = async () => {
      try {
        const page = await pdfRenderer.getPage(pageIndex + 1);
        if (cancelled) return;
        const viewport = pdfRenderer.getPageViewport(page, scale);
        setDimensions({ width: viewport.width, height: viewport.height });
      } catch (err) {
        if (!cancelled) console.error('Error loading page dimensions', err);
      }
    };
    loadDimensions();
    return () => { cancelled = true; };
  }, [pageIndex, scale]);

  if (!dimensions) {
    return (
      <div className="flex items-center justify-center bg-surface-raised rounded" style={{ width: 600, height: 800 }}>
        <div className="text-text-muted text-sm">Loading page {pageIndex + 1}...</div>
      </div>
    );
  }

  return (
    <div
      className="relative bg-white shadow-xl shadow-black/50"
      style={{
        width: dimensions.width,
        height: dimensions.height,
      }}
    >
      <CanvasLayer pageIndex={pageIndex} scale={scale} />
      <TextLayer pageIndex={pageIndex} scale={scale} />
      <AnnotationLayer
        pageIndex={pageIndex}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}
