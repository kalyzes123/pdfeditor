import { useEffect, useRef } from 'react';
import { RotateCw, RotateCcw, Trash2 } from 'lucide-react';

interface PageContextMenuProps {
  x: number;
  y: number;
  pageIndex: number;
  onRotateCW: () => void;
  onRotateCCW: () => void;
  onDelete: () => void;
  onClose: () => void;
  canDelete: boolean;
}

export function PageContextMenu({
  x,
  y,
  onRotateCW,
  onRotateCCW,
  onDelete,
  onClose,
  canDelete,
}: PageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const items: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }[] = [
    {
      icon: <RotateCw size={14} />,
      label: 'Rotate clockwise',
      onClick: onRotateCW,
    },
    {
      icon: <RotateCcw size={14} />,
      label: 'Rotate counter-clockwise',
      onClick: onRotateCCW,
    },
    ...(canDelete
      ? [
          {
            icon: <Trash2 size={14} />,
            label: 'Delete page',
            onClick: onDelete,
            danger: true,
          },
        ]
      : []),
  ];

  return (
    <div
      ref={menuRef}
      className="fixed bg-surface-raised border border-border-subtle rounded-lg shadow-2xl shadow-black/60 py-1 z-50 min-w-[180px]"
      style={{ left: x, top: y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-surface-overlay ${
            item.danger ? 'text-danger' : 'text-text-primary'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
