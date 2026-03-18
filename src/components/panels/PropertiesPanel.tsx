import { useUIStore } from '../../store/uiStore';
import { annotationManagers } from '../../services/annotationRegistry';
import { Bold, Italic, Underline, Strikethrough } from 'lucide-react';

const fontFamilies = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia',
  'Courier New', 'Verdana', 'Trebuchet MS', 'Comic Sans MS',
];
const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

export function PropertiesPanel() {
  const { selectedObjectProps, currentPage } = useUIStore();

  if (!selectedObjectProps) return null;

  const update = (props: Parameters<typeof import('../../services/annotationManager').AnnotationManager.prototype.updateSelectedObject>[0]) => {
    annotationManagers.get(currentPage - 1)?.updateSelectedObject(props);
  };

  const { type, fill, stroke, strokeWidth, opacity, fontSize, fontFamily, fontWeight, fontStyle, underline, linethrough } = selectedObjectProps;

  return (
    <div className="w-[180px] bg-surface-raised border-l border-border-subtle flex flex-col overflow-y-auto">
      <div className="px-3 py-2 border-b border-border-subtle text-xs font-semibold text-text-secondary uppercase tracking-wider">
        Properties
      </div>

      <div className="flex flex-col gap-4 p-3">
        {/* Appearance */}
        <section className="flex flex-col gap-2">
          <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Appearance</span>

          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">Fill</span>
            <div className="flex items-center gap-1">
              <button
                title={fill === 'transparent' ? 'No fill (click to add)' : 'Click to remove fill'}
                onClick={() => update({ fill: fill === 'transparent' ? '#ff0000' : 'transparent' })}
                className={`w-4 h-4 rounded border text-[9px] flex items-center justify-center transition-colors ${fill === 'transparent' ? 'border-border-moderate text-text-muted bg-surface-overlay' : 'border-border-subtle bg-white'}`}
                style={fill === 'transparent' ? {} : { background: 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 6px 6px' }}
              >
                {fill === 'transparent' ? '∅' : ''}
              </button>
              <input
                type="color"
                value={typeof fill === 'string' && fill.startsWith('#') ? fill : '#ff0000'}
                onChange={(e) => update({ fill: e.target.value })}
                disabled={fill === 'transparent'}
                className="w-7 h-6 rounded cursor-pointer border border-border-subtle bg-transparent p-0 disabled:opacity-30"
              />
            </div>
          </div>

          {type !== 'text' && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">Stroke</span>
              <input
                type="color"
                value={typeof stroke === 'string' && stroke.startsWith('#') ? stroke : '#000000'}
                onChange={(e) => update({ stroke: e.target.value })}
                className="w-7 h-6 rounded cursor-pointer border border-border-subtle bg-transparent p-0"
              />
            </div>
          )}

          {type !== 'text' && strokeWidth !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">Width</span>
              <input
                type="number"
                min={1}
                max={20}
                value={strokeWidth}
                onChange={(e) => update({ strokeWidth: Number(e.target.value) })}
                className="w-12 text-xs text-right bg-surface-overlay border border-border-subtle rounded px-1 py-0.5 text-text-primary focus:outline-none"
              />
            </div>
          )}
        </section>

        {/* Opacity */}
        <section className="flex flex-col gap-2">
          <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Opacity</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={opacity ?? 1}
              onChange={(e) => update({ opacity: Number(e.target.value) })}
              className="flex-1 accent-accent"
            />
            <span className="text-xs text-text-secondary w-8 text-right">
              {Math.round((opacity ?? 1) * 100)}%
            </span>
          </div>
        </section>

        {/* Text properties */}
        {type === 'text' && (
          <section className="flex flex-col gap-2">
            <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Text</span>

            <select
              value={fontFamily ?? 'Arial'}
              onChange={(e) => update({ fontFamily: e.target.value })}
              className="w-full text-xs bg-surface-overlay border border-border-subtle rounded px-1 py-1 text-text-primary focus:outline-none"
            >
              {fontFamilies.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>

            <select
              value={fontSize ?? 16}
              onChange={(e) => update({ fontSize: Number(e.target.value) })}
              className="w-full text-xs bg-surface-overlay border border-border-subtle rounded px-1 py-1 text-text-primary focus:outline-none"
            >
              {fontSizes.map((s) => <option key={s} value={s}>{s}px</option>)}
            </select>

            <div className="flex gap-1">
              {([
                { icon: <Bold size={12} />, title: 'Bold', active: fontWeight === 'bold', onClick: () => update({ fontWeight: fontWeight === 'bold' ? 'normal' : 'bold' }) },
                { icon: <Italic size={12} />, title: 'Italic', active: fontStyle === 'italic', onClick: () => update({ fontStyle: fontStyle === 'italic' ? 'normal' : 'italic' }) },
                { icon: <Underline size={12} />, title: 'Underline', active: underline, onClick: () => update({ underline: !underline }) },
                { icon: <Strikethrough size={12} />, title: 'Strikethrough', active: linethrough, onClick: () => update({ linethrough: !linethrough }) },
              ] as const).map((btn) => (
                <button
                  key={btn.title}
                  onClick={btn.onClick}
                  title={btn.title}
                  className={`flex-1 py-1 rounded text-xs transition-colors ${btn.active ? 'bg-accent-dim text-accent' : 'text-text-muted hover:bg-surface-overlay hover:text-text-primary'}`}
                >
                  {btn.icon}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
