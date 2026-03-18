import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, BookOpen } from 'lucide-react';
import { pdfRenderer, type OutlineNode } from '../../services/pdfRenderer';
import { useUIStore } from '../../store/uiStore';
import { useDocumentStore } from '../../store/documentStore';

function OutlineItem({ node, depth }: { node: OutlineNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const { scrollToPage } = useUIStore();
  const hasChildren = node.items && node.items.length > 0;

  const handleClick = async () => {
    if (node.dest) {
      const page = await pdfRenderer.getPageForDest(node.dest);
      scrollToPage(page);
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 py-0.5 px-2 rounded hover:bg-surface-overlay cursor-pointer group"
        style={{ paddingLeft: `${(depth + 1) * 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-text-muted hover:text-text-primary shrink-0"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <button
          onClick={handleClick}
          className="text-xs text-text-secondary group-hover:text-text-primary text-left truncate flex-1"
        >
          {node.title}
        </button>
      </div>
      {expanded && hasChildren && node.items.map((child, i) => (
        <OutlineItem key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function OutlinePanel() {
  // Track which docVersion we've loaded for so we can derive loading state
  // without calling setState synchronously in the effect body.
  const [fetched, setFetched] = useState<{ version: number; nodes: OutlineNode[] }>({ version: -1, nodes: [] });
  const { docVersion } = useDocumentStore();

  useEffect(() => {
    let cancelled = false;
    pdfRenderer.getOutline().then((nodes) => {
      if (!cancelled) setFetched({ version: docVersion, nodes });
    });
    return () => { cancelled = true; };
  }, [docVersion]);

  const loading = fetched.version !== docVersion;
  const outline = fetched.nodes;

  if (loading) {
    return (
      <div className="p-3 text-xs text-text-muted text-center">Loading…</div>
    );
  }

  if (!outline.length) {
    return (
      <div className="p-4 flex flex-col items-center gap-2 text-center">
        <BookOpen size={24} className="text-text-muted" />
        <span className="text-xs text-text-muted">No outline available</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col py-1">
      {outline.map((node, i) => (
        <OutlineItem key={i} node={node} depth={0} />
      ))}
    </div>
  );
}
