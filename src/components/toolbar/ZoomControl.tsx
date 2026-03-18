import { ZoomIn, ZoomOut, ArrowLeftRight, Maximize } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../common/Button';

export function ZoomControl() {
  const { zoom, zoomIn, zoomOut, setZoom, fitToWidth, fitToPage } = useUIStore();

  return (
    <div className="flex items-center gap-1">
      <Button icon={<ArrowLeftRight size={14} />} variant="ghost" size="sm" onClick={fitToWidth} title="Fit to width" />
      <Button icon={<Maximize size={14} />} variant="ghost" size="sm" onClick={fitToPage} title="Fit to page" />
      <div className="w-px h-4 bg-border-subtle mx-0.5" />
      <Button icon={<ZoomOut size={16} />} variant="ghost" size="sm" onClick={zoomOut} title="Zoom out" />
      <button
        className="px-2 py-1 text-xs font-medium text-text-secondary hover:bg-surface-overlay rounded min-w-[52px] text-center"
        onClick={() => setZoom(1)}
        title="Reset zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <Button icon={<ZoomIn size={16} />} variant="ghost" size="sm" onClick={zoomIn} title="Zoom in" />
    </div>
  );
}
