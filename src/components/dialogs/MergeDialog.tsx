import { useState, useCallback } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useDocumentStore } from '../../store/documentStore';
import { DialogBase } from './DialogBase';
import { Button } from '../common/Button';

export function MergeDialog() {
  const isOpen = useUIStore((s) => s.mergeDialogOpen);
  const closeDialog = useUIStore((s) => s.closeDialog);
  const { mergeDocuments, isDocumentLoaded, fileName } = useDocumentStore();

  const [files, setFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  const handleClose = () => {
    closeDialog('merge');
    setFiles([]);
  };

  const handleAddFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFiles = Array.from(e.target.files ?? []);
      setFiles((prev) => [...prev, ...newFiles]);
      e.target.value = '';
    },
    []
  );

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMerge = async () => {
    if (files.length === 0) return;
    setIsMerging(true);
    try {
      await mergeDocuments(files);
      handleClose();
    } catch (err) {
      console.error('Merge failed:', err);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <DialogBase title="Merge PDFs" isOpen={isOpen} onClose={handleClose}>
      <div className="space-y-4">
        {isDocumentLoaded && (
          <div className="flex items-center gap-2 p-2 bg-accent-dim rounded-lg text-sm text-accent">
            <span className="font-medium">Current:</span> {fileName}
          </div>
        )}

        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-surface-overlay rounded-lg"
            >
              <span className="text-sm text-text-primary truncate">
                {file.name}
              </span>
              <button
                onClick={() => handleRemoveFile(index)}
                className="p-1 text-text-muted hover:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <label className="flex items-center gap-2 p-3 border-2 border-dashed border-border-moderate rounded-lg cursor-pointer hover:border-zinc-500 hover:bg-surface-overlay">
          <Plus size={16} className="text-text-muted" />
          <span className="text-sm text-text-secondary">Add PDF files</span>
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleAddFiles}
            className="hidden"
          />
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleMerge}
            disabled={files.length === 0 || isMerging}
          >
            {isMerging ? 'Merging...' : 'Merge All'}
          </Button>
        </div>
      </div>
    </DialogBase>
  );
}
