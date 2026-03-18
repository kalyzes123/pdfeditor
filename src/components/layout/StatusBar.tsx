import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDocumentStore } from '../../store/documentStore';

export function StatusBar() {
  const { currentPage, zoom, scrollToPage } = useUIStore();
  const { pageCount, fileName } = useDocumentStore();
  const [pageInput, setPageInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  if (!fileName) return null;

  const displayValue = isEditing ? pageInput : String(currentPage);

  const commitPage = () => {
    const num = Math.max(1, Math.min(pageCount, parseInt(pageInput, 10) || 1));
    scrollToPage(num);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between px-4 py-1 bg-surface-raised border-t border-border-subtle text-xs text-text-secondary">
      <span>{fileName}</span>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          Page{' '}
          <input
            data-page-input
            type="text"
            value={displayValue}
            onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ''))}
            onFocus={() => { setIsEditing(true); setPageInput(String(currentPage)); }}
            onBlur={commitPage}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitPage();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-8 text-center bg-surface-overlay border border-border-subtle rounded px-1 py-0 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          />{' '}
          of {pageCount}
        </span>
        <span>{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}
