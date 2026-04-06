import { useState, useRef, useEffect } from 'react';
import { X, Pencil, Trash2 } from 'lucide-react';
import type { Comment } from '../../types/annotation.types';
import { useUIStore } from '../../store/uiStore';

interface CommentPopupProps {
  comment: Comment;
  scale: number;
  onClose: () => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function CommentPopup({ comment, scale, onClose, onEdit, onDelete }: CommentPopupProps) {
  const showConfirm = useUIStore((s) => s.showConfirm);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const { highlightBounds: b } = comment;
  const left = (b.x + b.width) * scale + 8;
  const top = b.y * scale;

  const handleDelete = () => {
    showConfirm('Delete this comment?', () => onDelete(comment.id));
  };

  const commitEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== comment.text) {
      onEdit(comment.id, trimmed);
    }
    setEditing(false);
  };

  return (
    <div
      className="absolute pointer-events-auto"
      style={{ left, top, zIndex: 25, width: 240 }}
    >
      <div className="bg-surface-raised border border-border-moderate rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
          <span className="text-xs text-text-muted">{formatDate(comment.createdAt)}</span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-3 py-2">
          {editing ? (
            <textarea
              ref={textareaRef}
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setEditing(false); setEditText(comment.text); }
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commitEdit();
              }}
              className="w-full text-sm text-text-primary bg-surface-overlay border border-border-moderate rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-accent"
            />
          ) : (
            <p className="text-sm text-text-primary whitespace-pre-wrap break-words">{comment.text}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-1 px-2 py-1.5 border-t border-border-subtle">
          {editing ? (
            <>
              <button
                onClick={() => { setEditing(false); setEditText(comment.text); }}
                className="text-xs text-text-muted hover:text-text-secondary px-2 py-0.5"
              >
                Cancel
              </button>
              <button
                onClick={commitEdit}
                disabled={!editText.trim()}
                className="text-xs font-medium px-2 py-0.5 rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-40"
              >
                Save
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary px-1.5 py-0.5 rounded hover:bg-surface-overlay"
              >
                <Pencil size={11} /> Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-surface-overlay"
              >
                <Trash2 size={11} /> Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
