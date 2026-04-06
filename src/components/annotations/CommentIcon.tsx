import { MessageSquare } from 'lucide-react';
import type { Comment } from '../../types/annotation.types';

interface CommentIconProps {
  comment: Comment;
  scale: number;
  isActive: boolean;
  onClick: (id: string) => void;
}

export function CommentIcon({ comment, scale, isActive, onClick }: CommentIconProps) {
  const { highlightBounds: b, id } = comment;
  const left = (b.x + b.width) * scale - 12;
  const top = b.y * scale - 12;

  return (
    <div
      className="absolute pointer-events-auto"
      style={{ left, top, zIndex: 21 }}
    >
      <button
        onClick={() => onClick(id)}
        title="View comment"
        className={`flex items-center justify-center w-6 h-6 rounded-full shadow transition-transform hover:scale-110 ${
          isActive ? 'scale-110' : ''
        }`}
        style={{ background: '#FFD700', border: '1.5px solid #cc9900' }}
      >
        <MessageSquare size={13} fill="#7a5a00" color="#7a5a00" />
      </button>
    </div>
  );
}
