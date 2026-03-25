import { useCallback, useState } from 'react';
import {
  Hand,
  MousePointer2,
  Type,
  Highlighter,
  Minus,
  Square,
  Circle,
  Pencil,
  PenTool,
  Eraser,
  MoveRight,
  Stamp,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Image,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import type { AnnotationTool } from '../../types/annotation.types';

const tools: { tool: AnnotationTool; icon: React.ReactNode; label: string; shortcut?: string }[] = [
  { tool: 'pan', icon: <Hand size={18} />, label: 'Read / Select Text' },
  { tool: 'select', icon: <MousePointer2 size={18} />, label: 'Select', shortcut: 'V' },
  { tool: 'text', icon: <Type size={18} />, label: 'Text', shortcut: 'T' },
  { tool: 'freehand', icon: <Pencil size={18} />, label: 'Draw', shortcut: 'P' },
  { tool: 'highlight', icon: <Highlighter size={18} />, label: 'Highlight', shortcut: 'H' },
  { tool: 'underline', icon: <Minus size={18} />, label: 'Line' },
  { tool: 'arrow', icon: <MoveRight size={18} />, label: 'Arrow', shortcut: 'A' },
  { tool: 'rectangle', icon: <Square size={18} />, label: 'Rectangle', shortcut: 'R' },
  { tool: 'circle', icon: <Circle size={18} />, label: 'Circle' },
  { tool: 'stamp', icon: <Stamp size={18} />, label: 'Stamp' },
  { tool: 'signature', icon: <PenTool size={18} />, label: 'Signature' },
  { tool: 'eraser', icon: <Eraser size={18} />, label: 'Eraser', shortcut: 'E' },
  { tool: 'image' as AnnotationTool, icon: <Image size={18} />, label: 'Insert Image' },
];

const presetColors = ['#000000', '#FF0000', '#FFFF00', '#008000', '#FF8C00'];

const fontFamilies = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia',
  'Courier New', 'Verdana', 'Trebuchet MS', 'Comic Sans MS',
];

const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

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
    activeColor, setColor,
    activeOpacity, setOpacity,
    activeFontSize, setFontSize,
    activeFontFamily, setFontFamily,
    activeFontBold, setFontBold,
    activeFontItalic, setFontItalic,
    activeFontUnderline, setFontUnderline,
    activeFontStrikethrough, setFontStrikethrough,
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

  const showTextOptions = activeTool === 'text' || activeTool === 'select';
  const showStrokeOptions = ['freehand', 'underline', 'rectangle', 'circle', 'arrow'].includes(activeTool);
  const showStampOptions = activeTool === 'stamp';

  return (
    <div className="flex flex-col gap-1.5 p-2 bg-surface-raised border-r border-border-subtle w-14 items-center h-full overflow-y-auto">
      {tools.map(({ tool, icon, label, shortcut }) => (
        <button
          key={tool}
          onClick={() => handleToolClick(tool)}
          onMouseEnter={(e) => showTooltip(e, `${label}${shortcut ? ` (${shortcut})` : ''}`)}
          onMouseLeave={hideTooltip}
          className={`p-2 rounded-lg transition-colors ${
            activeTool === tool
              ? 'bg-accent-dim text-accent'
              : 'text-text-muted hover:bg-surface-overlay hover:text-text-primary'
          }`}
        >
          {icon}
        </button>
      ))}

      <div className="w-10 border-t border-border-subtle my-1" />

      {/* Font controls */}
      {showTextOptions && (
        <>
          <select
            value={activeFontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            onMouseEnter={(e) => showTooltip(e, 'Font Family')}
            onMouseLeave={hideTooltip}
            className="w-9 h-7 text-[9px] text-text-secondary bg-surface-overlay border border-border-subtle rounded cursor-pointer hover:bg-surface-sunken appearance-none text-center"
          >
            {fontFamilies.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select
            value={activeFontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            onMouseEnter={(e) => showTooltip(e, 'Font Size')}
            onMouseLeave={hideTooltip}
            className="w-9 h-7 text-[10px] text-text-secondary bg-surface-overlay border border-border-subtle rounded cursor-pointer hover:bg-surface-sunken appearance-none text-center"
          >
            {fontSizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* B / I / U / S — stacked vertically */}
          <div className="flex flex-col gap-0.5">
            {([
              { key: 'bold', icon: <Bold size={14} />, label: 'Bold', active: activeFontBold, toggle: () => setFontBold(!activeFontBold) },
              { key: 'italic', icon: <Italic size={14} />, label: 'Italic', active: activeFontItalic, toggle: () => setFontItalic(!activeFontItalic) },
              { key: 'underline', icon: <Underline size={14} />, label: 'Underline', active: activeFontUnderline, toggle: () => setFontUnderline(!activeFontUnderline) },
              { key: 'strike', icon: <Strikethrough size={14} />, label: 'Strikethrough', active: activeFontStrikethrough, toggle: () => setFontStrikethrough(!activeFontStrikethrough) },
            ] as const).map(({ key, icon, label, active, toggle }) => (
              <button
                key={key}
                onClick={toggle}
                onMouseEnter={(e) => showTooltip(e, label)}
                onMouseLeave={hideTooltip}
                className={`p-1 rounded transition-colors ${active ? 'bg-accent-dim text-accent' : 'text-text-muted hover:bg-surface-overlay hover:text-text-primary'}`}
              >
                {icon}
              </button>
            ))}
          </div>

          <div className="w-10 border-t border-border-subtle my-1" />
        </>
      )}

      {/* Stroke width */}
      {showStrokeOptions && (
        <>
          <select
            value={activeStrokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            onMouseEnter={(e) => showTooltip(e, 'Stroke Width')}
            onMouseLeave={hideTooltip}
            className="w-9 h-7 text-[10px] text-text-secondary bg-surface-overlay border border-border-subtle rounded cursor-pointer hover:bg-surface-sunken appearance-none text-center"
          >
            {[1, 2, 3, 4, 5, 8, 10].map((w) => <option key={w} value={w}>{w}px</option>)}
          </select>
          <div className="w-10 border-t border-border-subtle my-1" />
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
                className={`w-full px-1 py-0.5 rounded text-[8px] font-bold border transition-colors text-center leading-tight ${
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
          <div className="w-10 border-t border-border-subtle my-1" />
        </>
      )}

      {/* Opacity slider */}
      <div
        className="flex flex-col items-center gap-0.5"
        onMouseEnter={(e) => showTooltip(e, `Opacity ${Math.round(activeOpacity * 100)}%`)}
        onMouseLeave={hideTooltip}
      >
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={activeOpacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="w-8 accent-accent cursor-pointer"
          style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '48px' }}
        />
        <span className="text-[8px] text-text-muted">{Math.round(activeOpacity * 100)}%</span>
      </div>

      <div className="w-10 border-t border-border-subtle my-1" />

      {/* Custom color picker + presets */}
      <span className="text-[8px] text-text-muted">Color</span>
      <div className="flex flex-col items-center gap-1">
        <div
          onMouseEnter={(e) => showTooltip(e, 'Pick color')}
          onMouseLeave={hideTooltip}
          className="relative"
        >
          <input
            type="color"
            value={activeColor}
            onChange={(e) => setColor(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border border-border-subtle bg-transparent p-0"
            title="Pick color"
          />
        </div>
        {presetColors.map((color) => (
          <button
            key={color}
            onClick={() => setColor(color)}
            onMouseEnter={(e) => showTooltip(e, color)}
            onMouseLeave={hideTooltip}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${
              activeColor === color ? 'border-accent scale-110' : 'border-surface-sunken'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

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
