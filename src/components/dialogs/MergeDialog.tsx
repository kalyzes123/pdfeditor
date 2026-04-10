import { useState, useRef, useCallback } from 'react';
import { Upload, X, ChevronUp, ChevronDown, FileText } from 'lucide-react';
import { DialogBase } from './DialogBase';
import { Button } from '../common/Button';
import { useUIStore } from '../../store/uiStore';
import { useDocumentStore } from '../../store/documentStore';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MergeDialog() {
  const mergeDialogOpen = useUIStore((s) => s.mergeDialogOpen);
  const closeDialog = useUIStore((s) => s.closeDialog);
  const addToast = useUIStore((s) => s.addToast);
  const mergeDocuments = useDocumentStore((s) => s.mergeDocuments);

  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    if (isLoading) return;
    setFiles([]);
    setError(null);
    closeDialog('merge');
  };

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const valid: File[] = [];
    const invalid: string[] = [];

    Array.from(incoming).forEach((f) => {
      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
        invalid.push(f.name);
      } else {
        valid.push(f);
      }
    });

    if (invalid.length) {
      setError(`Skipped non-PDF files: ${invalid.join(', ')}`);
    } else {
      setError(null);
    }

    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}|${f.size}`));
      const deduped = valid.filter((f) => !existing.has(`${f.name}|${f.size}`));
      return [...prev, ...deduped];
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const moveUp = (i: number) => {
    if (i === 0) return;
    setFiles((prev) => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  };

  const moveDown = (i: number) => {
    setFiles((prev) => {
      if (i === prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleMerge = async () => {
    if (!files.length) return;
    setIsLoading(true);
    setError(null);
    try {
      await mergeDocuments(files);
      addToast('success', `Merged ${files.length} file${files.length > 1 ? 's' : ''} successfully.`);
      handleClose();
    } catch (err) {
      console.error('Merge failed:', err);
      setError('Failed to merge PDFs. One or more files may be corrupted.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogBase title="Merge PDF" isOpen={mergeDialogOpen} onClose={handleClose} width="max-w-2xl">
      <div className="flex flex-col gap-4">
        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-accent bg-accent/10'
              : 'border-border-moderate hover:border-accent hover:bg-surface-overlay'
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload size={24} className="mx-auto mb-2 text-text-muted" />
          <p className="text-base text-text-secondary">
            Drop PDF files here or <span className="text-accent">browse</span>
          </p>
          <p className="text-sm text-text-muted mt-1">Files will be appended after the current document</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded px-3 py-2">{error}</p>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-text-muted mb-1">{files.length} file{files.length > 1 ? 's' : ''} to append:</p>
            {files.map((file, i) => (
              <div
                key={`${file.name}|${file.size}|${i}`}
                className="flex items-center gap-2 px-3 py-2 bg-surface-overlay rounded-lg"
              >
                <FileText size={14} className="text-text-muted shrink-0" />
                <span className="text-base text-text-primary truncate flex-1">{file.name}</span>
                <span className="text-sm text-text-muted shrink-0">{formatBytes(file.size)}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    className="p-0.5 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveDown(i)}
                    disabled={i === files.length - 1}
                    className="p-0.5 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    onClick={() => removeFile(i)}
                    className="p-0.5 rounded text-text-muted hover:text-red-400"
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleMerge}
            disabled={files.length === 0 || isLoading}
          >
            {isLoading ? 'Merging…' : `Merge ${files.length > 0 ? files.length + ' file' + (files.length > 1 ? 's' : '') : ''}`}
          </Button>
        </div>
      </div>
    </DialogBase>
  );
}
