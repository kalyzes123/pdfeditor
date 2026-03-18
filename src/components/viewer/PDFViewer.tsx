import { useRef, useEffect, useCallback, useState } from 'react';
import { useDocumentStore } from '../../store/documentStore';
import { useUIStore } from '../../store/uiStore';
import { PDFPage } from './PDFPage';

export function PDFViewer() {
  const { pageCount, pages: pagesMeta } = useDocumentStore();
  const {
    zoom, setCurrentPage, setViewerDimensions,
    scrollTargetPage, clearScrollTarget,
    searchResults, currentMatchIndex,
  } = useUIStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Virtualization: only fully render pages near the viewport.
  // Pages outside the buffer zone are replaced with sized placeholders to
  // preserve scroll position without keeping Fabric canvases alive.
  const [visiblePages, setVisiblePages] = useState<Set<number>>(
    () => new Set([0, 1, 2].filter((i) => i < pageCount))
  );

  // Track viewer container dimensions for fit-to-width/page
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewerDimensions(entry.contentRect.width, entry.contentRect.height);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [setViewerDimensions]);

  // Scroll to target page when requested
  useEffect(() => {
    if (scrollTargetPage == null) return;
    const el = pageRefs.current.get(scrollTargetPage - 1);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    clearScrollTarget();
  }, [scrollTargetPage, clearScrollTarget]);

  // Track which page is most visible (current page indicator in status bar)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0;
        let visiblePage = 1;
        entries.forEach((entry) => {
          const pageIndex = Number(entry.target.getAttribute('data-page'));
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            visiblePage = pageIndex + 1;
          }
        });
        if (maxRatio > 0) setCurrentPage(visiblePage);
      },
      { root: container, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pageCount, setCurrentPage]);

  // Virtualization observer: mount/unmount PDFPage based on proximity to viewport.
  // rootMargin of 800px pre-loads pages before they scroll into view.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            const idx = Number(entry.target.getAttribute('data-page'));
            if (entry.isIntersecting) {
              // Load the page and its immediate neighbors as a buffer
              for (let i = Math.max(0, idx - 1); i <= Math.min(pageCount - 1, idx + 2); i++) {
                next.add(i);
              }
            } else {
              next.delete(idx);
            }
          });
          return next;
        });
      },
      { root: container, rootMargin: '800px 0px', threshold: 0 }
    );
    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pageCount]);

  const setPageRef = useCallback((pageIndex: number, el: HTMLDivElement | null) => {
    if (el) pageRefs.current.set(pageIndex, el);
    else pageRefs.current.delete(pageIndex);
  }, []);

  const currentMatch = searchResults[currentMatchIndex];

  return (
    <div ref={containerRef} className="flex-1 overflow-auto bg-surface-base p-4">
      <div className="flex flex-col items-center gap-4">
        {Array.from({ length: pageCount }, (_, pageIndex) => {
          // Use stored page meta for placeholder dimensions so scroll position is
          // preserved even when the page isn't rendered.
          const meta = pagesMeta[pageIndex];
          const w = meta ? Math.round(meta.width * zoom) : 600;
          const h = meta ? Math.round(meta.height * zoom) : 800;
          const pageMatches = searchResults.filter((m) => m.pageIndex === pageIndex);

          return (
            <div
              key={pageIndex}
              ref={(el) => setPageRef(pageIndex, el)}
              data-page={pageIndex}
              className="relative"
            >
              {visiblePages.has(pageIndex) ? (
                <PDFPage pageIndex={pageIndex} scale={zoom} />
              ) : (
                // Placeholder: same size as the page so scrollbar stays accurate
                <div
                  className="bg-white shadow-xl shadow-black/50"
                  style={{ width: w, height: h }}
                />
              )}

              {/* Search highlight overlays — shown regardless of visibility */}
              {pageMatches.map((match, i) => {
                const globalIdx = searchResults.indexOf(match);
                const isCurrent = currentMatch && match === currentMatch;
                return (
                  <div
                    key={i}
                    className="absolute pointer-events-none"
                    style={{
                      left: match.x,
                      top: match.y,
                      width: Math.max(match.width, 20),
                      height: Math.max(match.height, 12),
                      backgroundColor: isCurrent ? 'rgba(255,165,0,0.5)' : 'rgba(255,255,0,0.35)',
                      zIndex: 10,
                    }}
                    data-match-index={globalIdx}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
