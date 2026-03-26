import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  multiple?: boolean;
  onMultipleFiles?: (files: File[]) => void;
}

export function DropZone({
  onFileSelect,
  accept = 'application/pdf,.pdf',
  multiple = false,
  onMultipleFiles,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.toLowerCase().endsWith('.pdf')
      );
      if (files.length === 0) return;

      if (multiple && onMultipleFiles) {
        onMultipleFiles(files);
      } else {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect, multiple, onMultipleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;

      if (multiple && onMultipleFiles) {
        onMultipleFiles(files);
      } else {
        onFileSelect(files[0]);
      }
      e.target.value = '';
    },
    [onFileSelect, multiple, onMultipleFiles]
  );

  return (
    <div
      className={`flex flex-col items-center justify-center w-full h-full min-h-[400px] border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
        isDragging
          ? 'border-accent bg-accent-dim'
          : 'border-border-moderate bg-surface-raised hover:border-zinc-500 hover:bg-surface-overlay'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById('pdf-file-input')?.click()}
    >
      <Upload className="w-16 h-16 text-text-muted mb-4" />
      <p className="text-xl font-medium text-text-secondary mb-2">
        Drop your PDF here
      </p>
      <p className="text-sm text-text-muted">or click to browse files</p>
      <input
        id="pdf-file-input"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}
