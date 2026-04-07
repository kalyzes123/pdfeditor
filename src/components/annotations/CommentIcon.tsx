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
  // Place the pin directly at the click point; offset so the tail tip aligns with the point
  const left = b.x * scale - 12;
  const top = b.y * scale - 28;

  return (
    <div
      className="absolute pointer-events-auto"
      style={{ left, top, zIndex: 21 }}
    >
      <button
        onClick={() => onClick(id)}
        title="View comment"
        className={`flex flex-col items-center transition-transform hover:scale-110 ${isActive ? 'scale-110' : ''}`}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}
      >
        {/* Adobe-style comment pin: rounded square body + triangular tail */}
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: isActive ? '#FFC200' : '#FFD700',
            border: `1.5px solid ${isActive ? '#b38600' : '#cc9900'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MessageSquare size={13} fill="#7a5a00" color="#7a5a00" />
        </div>
        {/* Tail pointing down to the click location */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: `6px solid ${isActive ? '#FFC200' : '#FFD700'}`,
            marginTop: -1,
          }}
        />
      </button>
    </div>
  );
}
