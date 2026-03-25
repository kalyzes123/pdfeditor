import { useUIStore } from '../../store/uiStore';
import { annotationManagers } from '../../services/annotationRegistry';
import { Bold, Italic, Underline, Strikethrough } from 'lucide-react';
import { useCallback, useEffect } from 'react';

const fontFamilies = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia',
  'Courier New', 'Verdana', 'Trebuchet MS', 'Comic Sans MS',
];
const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

export function PropertiesPanel() {
  const {
    selectedObjectProps, currentPage,
    setFontSize, setFontFamily, setFontBold, setFontItalic, setFontUnderline, setFontStrikethrough,
    setColor, setOpacity,
  } = useUIStore();

  // When a text object is selected, sync its current properties into the store
  // so the next textbox created will inherit them.
  useEffect(() => {
    if (!selectedObjectProps || selectedObjectProps.type !== 'text') return;
    const { fontSize, fontFamily, fontWeight, fontStyle, underline, linethrough, fill, opacity } = selectedObjectProps;
    if (fontSize !== undefined) setFontSize(fontSize);
    if (fontFamily !== undefined) setFontFamily(fontFamily);
    if (fontWeight !== undefined) setFontBold(fontWeight === 'bold');
    if (fontStyle !== undefined) setFontItalic(fontStyle === 'italic');
    if (underline !== undefined) setFontUnderline(underline);
    if (linethrough !== undefined) setFontStrikethrough(linethrough);
    if (fill !== undefined && fill !== 'transparent') setColor(fill);
    if (opacity !== undefined) setOpacity(opacity);
  }, [selectedObjectProps, setFontSize, setFontFamily, setFontBold, setFontItalic, setFontUnderline, setFontStrikethrough, setColor, setOpacity]);

  const update = useCallback((props: Parameters<typeof import('../../services/annotationManager').AnnotationManager.prototype.updateSelectedObject>[0]) => {
    annotationManagers.get(currentPage - 1)?.updateSelectedObject(props);
  }, [currentPage]);

  if (!selectedObjectProps) return null;

  const { type, fill, stroke, strokeWidth, opacity, fontSize, fontFamily, fontWeight, fontStyle, underline, linethrough } = selectedObjectProps;

  return (
    <div className="w-55 bg-surface-raised border-l border-border-subtle flex flex-col overflow-y-auto shrink-0">
      <div className="px-4 py-2.5 border-b border-border-subtle text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
        Properties
      </div>

      <div className="flex flex-col gap-5 p-4">
        {/* Appearance */}
        <section className="flex flex-col gap-3">
          <span className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">Appearance</span>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-text-secondary shrink-0">Fill</span>
            <div className="flex items-center gap-2">
              <button
                title={fill === 'transparent' ? 'No fill — click to enable' : 'Click to remove fill'}
                onClick={() => update({ fill: fill === 'transparent' ? '#ff0000' : 'transparent' })}
                className={`w-5 h-5 rounded border text-[9px] flex items-center justify-center transition-colors shrink-0 ${fill === 'transparent' ? 'border-border-moderate text-text-muted bg-surface-overlay' : 'border-border-subtle'}`}
                style={fill !== 'transparent' ? { background: 'repeating-conic-gradient(#999 0% 25%, #eee 0% 50%) 0 0 / 6px 6px' } : {}}
              >
                {fill === 'transparent' ? '∅' : ''}
              </button>
              <input
                type="color"
                value={typeof fill === 'string' && fill.startsWith('#') ? fill : '#ff0000'}
                onChange={(e) => update({ fill: e.target.value })}
                disabled={fill === 'transparent'}
                className="w-8 h-7 rounded cursor-pointer border border-border-subtle bg-transparent p-0 disabled:opacity-30 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {type !== 'text' && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-secondary shrink-0">Stroke</span>
              <input
                type="color"
                value={typeof stroke === 'string' && stroke.startsWith('#') ? stroke : '#000000'}
                onChange={(e) => update({ stroke: e.target.value })}
                className="w-8 h-7 rounded cursor-pointer border border-border-subtle bg-transparent p-0"
              />
            </div>
          )}

          {type !== 'text' && strokeWidth !== undefined && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-secondary shrink-0">Stroke width</span>
              <input
                type="number"
                min={1}
                max={20}
                value={strokeWidth}
                onChange={(e) => update({ strokeWidth: Number(e.target.value) })}
                className="w-14 text-xs text-right bg-surface-overlay border border-border-subtle rounded px-2 py-1 text-text-primary focus:outline-none"
              />
            </div>
          )}
        </section>

        {/* Opacity */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">Opacity</span>
            <span className="text-xs font-medium text-text-primary tabular-nums">
              {Math.round((opacity ?? 1) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={opacity ?? 1}
            onChange={(e) => update({ opacity: Number(e.target.value) })}
            className="w-full accent-accent"
          />
        </section>

        {/* Text properties */}
        {type === 'text' && (
          <section className="flex flex-col gap-3">
            <span className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">Text</span>

            <select
              value={fontFamily ?? 'Arial'}
              onChange={(e) => update({ fontFamily: e.target.value })}
              className="w-full text-xs bg-surface-overlay border border-border-subtle rounded px-2 py-1.5 text-text-primary focus:outline-none"
            >
              {fontFamilies.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>

            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary shrink-0">Size</span>
              <select
                value={fontSize ?? 16}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
                className="flex-1 text-xs bg-surface-overlay border border-border-subtle rounded px-2 py-1.5 text-text-primary focus:outline-none"
              >
                {fontSizes.map((s) => <option key={s} value={s}>{s}px</option>)}
              </select>
            </div>

            <div className="flex gap-1">
              {([
                { icon: <Bold size={13} />, title: 'Bold', active: fontWeight === 'bold', onClick: () => update({ fontWeight: fontWeight === 'bold' ? 'normal' : 'bold' }) },
                { icon: <Italic size={13} />, title: 'Italic', active: fontStyle === 'italic', onClick: () => update({ fontStyle: fontStyle === 'italic' ? 'normal' : 'italic' }) },
                { icon: <Underline size={13} />, title: 'Underline', active: underline, onClick: () => update({ underline: !underline }) },
                { icon: <Strikethrough size={13} />, title: 'Strikethrough', active: linethrough, onClick: () => update({ linethrough: !linethrough }) },
              ] as const).map((btn) => (
                <button
                  key={btn.title}
                  onClick={btn.onClick}
                  title={btn.title}
                  className={`flex-1 py-1.5 rounded text-xs transition-colors flex items-center justify-center ${btn.active ? 'bg-accent-dim text-accent' : 'text-text-muted hover:bg-surface-overlay hover:text-text-primary'}`}
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
