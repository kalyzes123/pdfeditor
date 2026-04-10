import { useEffect, useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { pdfRenderer } from '../../services/pdfRenderer';
import { useUIStore } from '../../store/uiStore';

interface PageThumbnailProps {
  pageIndex: number;
  id: string;
  onContextMenu: (e: React.MouseEvent, pageIndex: number) => void;
}

export function PageThumbnail({
  pageIndex,
  id,
  onContextMenu,
}: PageThumbnailProps) {
  const [thumbnail, setThumbnail] = useState<string>('');
  const currentPage = useUIStore((s) => s.currentPage);
  const scrollToPage = useUIStore((s) => s.scrollToPage);
  const isActive = currentPage === pageIndex + 1;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    let cancelled = false;
    pdfRenderer.generateThumbnail(pageIndex + 1, 140).then((dataUrl) => {
      if (!cancelled) setThumbnail(dataUrl);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [pageIndex]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu(e, pageIndex);
    },
    [onContextMenu, pageIndex]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex flex-col items-center gap-1 p-1.5 rounded-lg cursor-grab transition-colors ${
        isActive ? 'bg-accent-dim ring-2 ring-accent/60' : 'hover:bg-surface-overlay'
      }`}
      onClick={() => scrollToPage(pageIndex + 1)}
      onContextMenu={handleContextMenu}
    >
      <div className="bg-zinc-800 border border-border-subtle rounded shadow-sm overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`Page ${pageIndex + 1}`}
            className="block w-[120px]"
            draggable={false}
          />
        ) : (
          <div className="w-[120px] h-[160px] flex items-center justify-center bg-surface-overlay">
            <span className="text-xs text-text-muted">Loading...</span>
          </div>
        )}
      </div>
      <span className="text-xs text-text-secondary">{pageIndex + 1}</span>
    </div>
  );
}
