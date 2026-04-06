import { useState, useEffect, useCallback } from 'react';
import { Scissors } from 'lucide-react';
import { DialogBase } from './DialogBase';
import { Button } from '../common/Button';
import { useUIStore } from '../../store/uiStore';
import { useDocumentStore } from '../../store/documentStore';
import { pdfRenderer } from '../../services/pdfRenderer';
import { downloadBlob } from '../../utils/fileUtils';

function buildRanges(pageCount: number, markers: Set<number>): number[][] {
  const sorted = Array.from(markers).sort((a, b) => a - b);
  const ranges: number[][] = [];
  let start = 1;
  for (const m of sorted) {
    ranges.push([start, m]);
    start = m + 1;
  }
  ranges.push([start, pageCount]);
  return ranges;
}

export function SplitDialog() {
  const splitDialogOpen = useUIStore((s) => s.splitDialogOpen);
  const closeDialog = useUIStore((s) => s.closeDialog);
  const addToast = useUIStore((s) => s.addToast);
  const { splitDocument, pageCount, fileName } = useDocumentStore();

  const [splitMarkers, setSplitMarkers] = useState<Set<number>>(new Set());
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isLoadingThumbs, setIsLoadingThumbs] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredGap, setHoveredGap] = useState<number | null>(null);

  // Generate thumbnails when dialog opens
  useEffect(() => {
    if (!splitDialogOpen || pageCount === 0) return;

    let cancelled = false;
    setIsLoadingThumbs(true);
    setSplitMarkers(new Set());
    setThumbnails([]);

    (async () => {
      const results: string[] = [];
      for (let i = 1; i <= pageCount; i++) {
        if (cancelled) return;
        try {
          const url = await pdfRenderer.generateThumbnail(i, 140);
          results.push(url);
        } catch {
          results.push('');
        }
      }
      if (!cancelled) {
        setThumbnails(results);
        setIsLoadingThumbs(false);
      }
    })();

    return () => { cancelled = true; };
  }, [splitDialogOpen, pageCount]);

  const toggleMarker = useCallback((afterPage: number) => {
    setSplitMarkers((prev) => {
      const next = new Set(prev);
      if (next.has(afterPage)) {
        next.delete(afterPage);
      } else {
        next.add(afterPage);
      }
      return next;
    });
  }, []);

  const handleClose = () => {
    if (isLoading) return;
    setSplitMarkers(new Set());
    closeDialog('split');
  };

  const handleSplit = async () => {
    if (splitMarkers.size === 0) return;
    setIsLoading(true);
    try {
      const splitPoints = Array.from(splitMarkers).sort((a, b) => a - b);
      const parts = await splitDocument(splitPoints);
      const baseName = fileName.replace(/\.pdf$/i, '').replace(/[/\\:*?"<>|]/g, '_');

      parts.forEach((bytes, idx) => {
        const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
        downloadBlob(blob, `${baseName}_part${idx + 1}.pdf`);
      });

      addToast('success', `Split into ${parts.length} files.`);
      handleClose();
    } catch (err) {
      console.error('Split failed:', err);
      addToast('error', 'Failed to split PDF.');
    } finally {
      setIsLoading(false);
    }
  };

  const ranges = buildRanges(pageCount, splitMarkers);
  const isSinglePage = pageCount <= 1;

  return (
    <DialogBase title="Split PDF" isOpen={splitDialogOpen} onClose={handleClose} width="max-w-4xl">
      <div className="flex flex-col gap-4">
        {isSinglePage ? (
          <p className="text-sm text-text-secondary text-center py-8">
            Cannot split a single-page document.
          </p>
        ) : (
          <>
            <p className="text-xs text-text-muted">
              Click between pages to place a split marker. Each marker starts a new file.
            </p>

            {/* Thumbnail strip */}
            <div className="overflow-x-auto pb-2">
              <div className="flex items-start gap-0 min-w-max">
                {Array.from({ length: pageCount }).map((_, i) => {
                  const isMarked = splitMarkers.has(i + 1);
                  const showGap = i < pageCount - 1;

                  return (
                    <div key={i} className="flex items-start">
                      {/* Page thumbnail */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="bg-zinc-800 border border-border-subtle rounded shadow-sm overflow-hidden">
                          {thumbnails[i] ? (
                            <img
                              src={thumbnails[i]}
                              alt={`Page ${i + 1}`}
                              className="block w-[80px]"
                              draggable={false}
                            />
                          ) : (
                            <div className="w-[80px] h-[110px] flex items-center justify-center bg-surface-overlay">
                              {isLoadingThumbs ? (
                                <span className="text-xs text-text-muted">…</span>
                              ) : (
                                <span className="text-xs text-text-muted">{i + 1}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-text-secondary">{i + 1}</span>
                      </div>

                      {/* Gap / split marker */}
                      {showGap && (
                        <button
                          className="flex items-center justify-center w-8 h-[110px] relative group flex-shrink-0 mt-0"
                          onClick={() => toggleMarker(i + 1)}
                          onMouseEnter={() => setHoveredGap(i + 1)}
                          onMouseLeave={() => setHoveredGap(null)}
                          title={isMarked ? 'Remove split here' : 'Split here'}
                        >
                          {/* Vertical line */}
                          <div
                            className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 transition-colors ${
                              isMarked
                                ? 'bg-red-500'
                                : hoveredGap === i + 1
                                ? 'bg-red-400/60 border-dashed'
                                : 'bg-transparent'
                            }`}
                            style={
                              isMarked || hoveredGap === i + 1
                                ? undefined
                                : { borderLeft: '2px dashed transparent' }
                            }
                          />
                          {/* Scissors icon */}
                          <Scissors
                            size={14}
                            className={`relative z-10 transition-colors ${
                              isMarked
                                ? 'text-red-500'
                                : hoveredGap === i + 1
                                ? 'text-red-400'
                                : 'text-transparent group-hover:text-red-400'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            {splitMarkers.size > 0 && (
              <div className="text-xs text-text-secondary bg-surface-overlay rounded-lg px-3 py-2">
                <span className="font-medium">Split into {ranges.length} documents: </span>
                {ranges.map((r, i) => (
                  <span key={i}>
                    {i > 0 && <span className="mx-1 text-text-muted">|</span>}
                    pages {r[0]}–{r[1]}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSplit}
            disabled={splitMarkers.size === 0 || isSinglePage || isLoading}
          >
            {isLoading
              ? 'Splitting…'
              : splitMarkers.size > 0
              ? `Split into ${splitMarkers.size + 1} files`
              : 'Split'}
          </Button>
        </div>
      </div>
    </DialogBase>
  );
}
