import { useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { pdfRenderer } from '../../services/pdfRenderer';

export function FindBar() {
  const {
    findBarOpen, closeFindBar,
    searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    currentMatchIndex, nextMatch, prevMatch,
    zoom, scrollToPage,
  } = useUIStore();

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when bar opens
  useEffect(() => {
    if (findBarOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [findBarOpen]);

  // Run search whenever query or zoom changes
  useEffect(() => {
    if (!findBarOpen || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    pdfRenderer.searchText(searchQuery, zoom).then((results) => {
      if (!cancelled) setSearchResults(results);
    });

    return () => { cancelled = true; };
  }, [searchQuery, zoom, findBarOpen, setSearchResults]);

  // Scroll to current match page
  useEffect(() => {
    if (!searchResults.length) return;
    const match = searchResults[currentMatchIndex];
    if (match) scrollToPage(match.pageIndex + 1);
  }, [currentMatchIndex, searchResults, scrollToPage]);

  if (!findBarOpen) return null;

  return (
    <div className="fixed top-12 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-surface-raised border border-border-moderate rounded-lg shadow-2xl shadow-black/60">
      <Search size={14} className="text-text-muted shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { if (e.shiftKey) prevMatch(); else nextMatch(); }
          if (e.key === 'Escape') closeFindBar();
        }}
        placeholder="Find in document…"
        className="w-48 bg-transparent text-text-primary text-sm focus:outline-none placeholder:text-text-muted"
      />
      <span className="text-xs text-text-muted whitespace-nowrap min-w-[40px] text-right">
        {searchResults.length > 0
          ? `${currentMatchIndex + 1}/${searchResults.length}`
          : searchQuery ? '0 results' : ''}
      </span>
      <button
        onClick={prevMatch}
        disabled={!searchResults.length}
        className="p-0.5 text-text-muted hover:text-text-primary disabled:opacity-40"
        title="Previous (Shift+Enter)"
      >
        <ChevronUp size={16} />
      </button>
      <button
        onClick={nextMatch}
        disabled={!searchResults.length}
        className="p-0.5 text-text-muted hover:text-text-primary disabled:opacity-40"
        title="Next (Enter)"
      >
        <ChevronDown size={16} />
      </button>
      <button
        onClick={closeFindBar}
        className="p-0.5 text-text-muted hover:text-text-primary"
        title="Close (Esc)"
      >
        <X size={16} />
      </button>
    </div>
  );
}
