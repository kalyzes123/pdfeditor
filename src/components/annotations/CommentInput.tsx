import { useState, useEffect, useRef } from 'react';

interface CommentInputProps {
  commentId: string;
  bounds: { x: number; y: number; width: number; height: number };
  scale: number;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export function CommentInput({ bounds, scale, onSubmit, onCancel }: CommentInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Position just to the right of the click point, slightly below so the pin is visible
  const left = bounds.x * scale + 16;
  const top = bounds.y * scale - 4;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && text.trim()) {
      onSubmit(text.trim());
    }
  };

  return (
    <div
      className="absolute pointer-events-auto"
      style={{ left, top, zIndex: 25, width: 200 }}
    >
      <div className="bg-surface-raised border border-border-moderate rounded-lg shadow-xl overflow-hidden">
        <textarea
          ref={textareaRef}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment…"
          className="w-full px-3 py-2 text-sm text-text-primary bg-surface-overlay resize-none focus:outline-none placeholder:text-text-muted"
        />
        <div className="flex items-center justify-between px-2 py-1.5 border-t border-border-subtle">
          <button
            onClick={onCancel}
            className="text-xs text-text-muted hover:text-text-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (text.trim()) onSubmit(text.trim()); }}
            disabled={!text.trim()}
            className="text-xs font-medium px-2 py-0.5 rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
