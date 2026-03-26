import { useCallback, useState } from 'react';
import {
  Hand,
  MousePointer2,
  Type,
  Minus,
  Square,
  Circle,
  Pencil,
  PenTool,
  Eraser,
  MoveRight,
  Stamp,
  Image,
  Scissors,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import type { AnnotationTool } from '../../types/annotation.types';

const tools: { tool: AnnotationTool; icon: React.ReactNode; label: string; shortcut?: string }[] = [
  { tool: 'pan', icon: <Hand size={18} />, label: 'Read / Select Text' },
  { tool: 'select', icon: <MousePointer2 size={18} />, label: 'Select', shortcut: 'V' },
  { tool: 'text', icon: <Type size={18} />, label: 'Text', shortcut: 'T' },
  { tool: 'freehand', icon: <Pencil size={18} />, label: 'Draw', shortcut: 'P' },
  { tool: 'underline', icon: <Minus size={18} />, label: 'Line' },
  { tool: 'arrow', icon: <MoveRight size={18} />, label: 'Arrow', shortcut: 'A' },
  { tool: 'rectangle', icon: <Square size={18} />, label: 'Rectangle', shortcut: 'R' },
  { tool: 'circle', icon: <Circle size={18} />, label: 'Circle' },
  { tool: 'stamp', icon: <Stamp size={18} />, label: 'Stamp' },
  { tool: 'signature', icon: <PenTool size={18} />, label: 'Signature' },
  { tool: 'eraser', icon: <Eraser size={18} />, label: 'Eraser', shortcut: 'E' },
  { tool: 'redact' as AnnotationTool, icon: <Scissors size={18} />, label: 'Redact' },
  { tool: 'image' as AnnotationTool, icon: <Image size={18} />, label: 'Insert Image' },
];

const stampLabels = ['APPROVED', 'REJECTED', 'DRAFT', 'CONFIDENTIAL', 'FOR REVIEW', 'VOID'];
const stampColors: Record<string, string> = {
  APPROVED: '#16a34a',
  REJECTED: '#dc2626',
  DRAFT: '#ca8a04',
  CONFIDENTIAL: '#dc2626',
  'FOR REVIEW': '#2563eb',
  VOID: '#dc2626',
};

export function AnnotationToolbar() {
  const {
    activeTool, setTool,
    activeStrokeWidth, setStrokeWidth,
    activeStampLabel, setStampLabel,
    openDialog,
  } = useUIStore();

  const [tooltip, setTooltip] = useState<{ label: string; top: number; left: number } | null>(null);

  const showTooltip = useCallback((e: React.MouseEvent, label: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 8 });
  }, []);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  const handleToolClick = (tool: AnnotationTool) => {
    if (tool === 'signature') { openDialog('signature'); return; }
    setTool(tool);
  };

  const showStrokeOptions = ['freehand', 'underline', 'rectangle', 'circle', 'arrow'].includes(activeTool);
  const showStampOptions = activeTool === 'stamp';

  return (
    <div className="flex flex-col gap-1 p-2 bg-surface-raised border-r border-border-subtle w-18 items-center h-full overflow-y-auto">
      {tools.map(({ tool, icon, label, shortcut }) => (
        <button
          key={tool}
          onClick={() => handleToolClick(tool)}
          onMouseEnter={(e) => showTooltip(e, `${label}${shortcut ? ` (${shortcut})` : ''}`)}
          onMouseLeave={hideTooltip}
          className={`w-full flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg transition-colors ${
            activeTool === tool
              ? 'bg-accent-dim text-accent'
              : 'text-text-muted hover:bg-surface-overlay hover:text-text-primary'
          }`}
        >
          {icon}
          <span className="text-[9px] leading-none">{label}</span>
        </button>
      ))}

      <div className="w-10 border-t border-border-subtle my-1" />

      {/* Stroke width */}
      {showStrokeOptions && (
        <>
          <select
            value={activeStrokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            onMouseEnter={(e) => showTooltip(e, 'Stroke Width')}
            onMouseLeave={hideTooltip}
            className="w-full h-7 text-[10px] text-text-secondary bg-surface-overlay border border-border-subtle rounded cursor-pointer hover:bg-surface-sunken appearance-none text-center"
          >
            {[1, 2, 3, 4, 5, 8, 10].map((w) => <option key={w} value={w}>{w}px</option>)}
          </select>
          <div className="w-full border-t border-border-subtle my-1" />
        </>
      )}

      {/* Stamp label */}
      {showStampOptions && (
        <>
          <div className="flex flex-col gap-0.5 w-full">
            {stampLabels.map((l) => (
              <button
                key={l}
                onClick={() => setStampLabel(l)}
                onMouseEnter={(e) => showTooltip(e, l)}
                onMouseLeave={hideTooltip}
                className={`w-full px-1 py-0.5 rounded text-[8px] font-bold border transition-colors text-center leading-tight truncate overflow-hidden ${
                  activeStampLabel === l
                    ? 'bg-surface-overlay border-current'
                    : 'border-surface-overlay hover:bg-surface-overlay'
                }`}
                style={{ color: stampColors[l] ?? '#dc2626', borderColor: activeStampLabel === l ? (stampColors[l] ?? '#dc2626') : undefined }}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="w-full border-t border-border-subtle my-1" />
        </>
      )}


      {/* Fixed tooltip */}
      {tooltip && (
        <div
          className="fixed px-2 py-1 bg-zinc-700 text-text-primary text-xs rounded whitespace-nowrap z-50 pointer-events-none"
          style={{ top: tooltip.top, left: tooltip.left, transform: 'translateY(-50%)' }}
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
}
