import { useState, useCallback } from 'react';
import { Scissors } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useDocumentStore } from '../../store/documentStore';
import { downloadBlob } from '../../utils/fileUtils';
import { DialogBase } from './DialogBase';
import { Button } from '../common/Button';

export function SplitDialog() {
  const isOpen = useUIStore((s) => s.splitDialogOpen);
  const closeDialog = useUIStore((s) => s.closeDialog);
  const { pageCount, splitDocument, fileName } = useDocumentStore();

  const [splitPoints, setSplitPoints] = useState<Set<number>>(new Set());
  const [isSplitting, setIsSplitting] = useState(false);

  const handleClose = () => {
    closeDialog('split');
    setSplitPoints(new Set());
  };

  const toggleSplitPoint = useCallback((pageIndex: number) => {
    setSplitPoints((prev) => {
      const next = new Set(prev);
      if (next.has(pageIndex)) {
        next.delete(pageIndex);
      } else {
        next.add(pageIndex);
      }
      return next;
    });
  }, []);

  const handleSplit = async () => {
    const points = Array.from(splitPoints).sort((a, b) => a - b);
    if (points.length === 0) return;

    setIsSplitting(true);
    try {
      const parts = await splitDocument(points);
      const baseName = fileName.replace(/\.pdf$/i, '');

      parts.forEach((bytes, i) => {
        const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
        downloadBlob(blob, `${baseName}_part${i + 1}.pdf`);
      });

      handleClose();
    } catch (err) {
      console.error('Split failed:', err);
    } finally {
      setIsSplitting(false);
    }
  };

  const pages = Array.from({ length: pageCount }, (_, i) => i);

  return (
    <DialogBase
      title="Split PDF"
      isOpen={isOpen}
      onClose={handleClose}
      width="max-w-2xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Click between pages to add split points. The PDF will be divided at those points.
        </p>

        <div className="flex flex-wrap gap-1 items-center">
          {pages.map((pageIndex) => (
            <div key={pageIndex} className="flex items-center">
              <div
                className={`w-14 h-18 flex items-center justify-center rounded border text-xs font-medium ${
                  splitPoints.has(pageIndex) && pageIndex > 0
                    ? 'border-l-2 border-l-red-500'
                    : ''
                } border-border-subtle bg-surface-overlay text-text-primary`}
              >
                {pageIndex + 1}
              </div>
              {pageIndex < pageCount - 1 && (
                <button
                  onClick={() => toggleSplitPoint(pageIndex + 1)}
                  className={`mx-0.5 w-4 h-14 flex items-center justify-center rounded transition-colors ${
                    splitPoints.has(pageIndex + 1)
                      ? 'bg-danger-dim text-danger'
                      : 'hover:bg-surface-overlay text-surface-sunken'
                  }`}
                  title={`Split after page ${pageIndex + 1}`}
                >
                  <Scissors size={10} className="rotate-90" />
                </button>
              )}
            </div>
          ))}
        </div>

        {splitPoints.size > 0 && (
          <p className="text-sm text-text-secondary">
            Will create <strong>{splitPoints.size + 1}</strong> files
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSplit}
            disabled={splitPoints.size === 0 || isSplitting}
          >
            {isSplitting ? 'Splitting...' : 'Split & Download'}
          </Button>
        </div>
      </div>
    </DialogBase>
  );
}
