import { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, ArrowLeftRight, Maximize } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../common/Button';

export function ZoomControl() {
  const { zoom, zoomIn, zoomOut, setZoom, fitToWidth, fitToPage } = useUIStore();
  const [isEditing, setIsEditing] = useState(false);
  const [zoomInput, setZoomInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setZoomInput(String(Math.round(zoom * 100)));
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const parsed = parseInt(zoomInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setZoom(parsed / 100);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button icon={<ArrowLeftRight size={14} />} variant="ghost" size="sm" onClick={fitToWidth} title="Fit to width" />
      <Button icon={<Maximize size={14} />} variant="ghost" size="sm" onClick={fitToPage} title="Fit to page" />
      <div className="w-px h-4 bg-border-subtle mx-0.5" />
      <Button icon={<ZoomOut size={16} />} variant="ghost" size="sm" onClick={zoomOut} title="Zoom out" />
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={zoomInput}
          onChange={(e) => setZoomInput(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="px-2 py-1 text-xs font-medium text-text-secondary bg-surface-overlay border border-accent rounded min-w-[52px] text-center outline-none"
        />
      ) : (
        <button
          className="px-2 py-1 text-xs font-medium text-text-secondary hover:bg-surface-overlay rounded min-w-[52px] text-center"
          onClick={startEditing}
          onDoubleClick={() => setZoom(1)}
          title="Click to set zoom, double-click to reset"
        >
          {Math.round(zoom * 100)}%
        </button>
      )}
      <Button icon={<ZoomIn size={16} />} variant="ghost" size="sm" onClick={zoomIn} title="Zoom in" />
    </div>
  );
}
