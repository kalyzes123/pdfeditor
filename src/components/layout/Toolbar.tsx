import { useState, useRef, useEffect } from 'react';
import {
  FolderOpen,
  Save,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Pencil,
  Printer,
  Undo2,
  Redo2,
  FilePlus2,
  Scissors,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useDocumentStore } from '../../store/documentStore';
import { useAnnotationStore } from '../../store/annotationStore';
import { annotationManagers } from '../../services/annotationRegistry';
import { Button } from '../common/Button';
import { ZoomControl } from '../toolbar/ZoomControl';

interface ToolbarProps {
  onOpenFile: () => void;
  onSave: () => void;
  onClose: () => void;
}

export function Toolbar({ onOpenFile, onSave, onClose }: ToolbarProps) {
  const { sidebarOpen, toggleSidebar, currentPage, activeTool, openDialog } = useUIStore();
  const { isDocumentLoaded, isModified, fileName, setFileName } = useDocumentStore();
  const { undo, redo, canUndo, canRedo } = useAnnotationStore();

  const handleUndo = () => {
    const pageIndex = currentPage - 1;
    const manager = annotationManagers.get(pageIndex);
    if (activeTool === 'eraser' && manager?.undoLastDelete()) return;
    const json = undo(pageIndex);
    if (json) manager?.loadFromJSON(json);
  };

  const handleRedo = () => {
    const pageIndex = currentPage - 1;
    const json = redo(pageIndex);
    if (json) annotationManagers.get(pageIndex)?.loadFromJSON(json);
  };
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const startEditing = () => {
    setNameValue(fileName.replace(/\.pdf$/i, ''));
    setEditingName(true);
  };

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed) {
      const newName = trimmed.endsWith('.pdf') ? trimmed : trimmed + '.pdf';
      setFileName(newName);
    }
    setEditingName(false);
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-surface-raised border-b border-border-subtle">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">P</span>
          </div>
          <span className="font-semibold text-text-primary text-sm">
            PDF Editor
          </span>
        </div>

        <Button
          icon={<FolderOpen size={16} />}
          variant="ghost"
          size="sm"
          onClick={onOpenFile}
        >
          Open
        </Button>

        {isDocumentLoaded && (
          <>
            <Button
              icon={<Save size={16} />}
              variant="ghost"
              size="sm"
              onClick={onSave}
            >
              Save
            </Button>

            <div className="w-px h-5 bg-border-subtle" />

            <Button
              icon={<Undo2 size={16} />}
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={!canUndo(currentPage - 1)}
              title="Undo (Ctrl+Z)"
            />
            <Button
              icon={<Redo2 size={16} />}
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              disabled={!canRedo(currentPage - 1)}
              title="Redo (Ctrl+Y)"
            />

            <div className="w-px h-5 bg-border-subtle" />

            <Button
              icon={<Printer size={16} />}
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
            >
              Print
            </Button>

            <div className="w-px h-5 bg-border-subtle" />

            <Button
              icon={<FilePlus2 size={16} />}
              variant="ghost"
              size="sm"
              onClick={() => openDialog('merge')}
              title="Merge another PDF into this document"
            >
              Merge
            </Button>
            <Button
              icon={<Scissors size={16} />}
              variant="ghost"
              size="sm"
              onClick={() => openDialog('split')}
              title="Split this document into multiple files"
            >
              Split
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isDocumentLoaded && (
          <>
            {editingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className="text-xs text-text-primary bg-surface-overlay border border-accent rounded px-2 py-0.5 w-50 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            ) : (
              <button
                onClick={startEditing}
                className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary max-w-50 group"
                title={isModified ? 'Unsaved changes — click to rename' : 'Click to rename'}
              >
                {isModified && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                )}
                <span className="truncate">{fileName}</span>
                <Pencil size={10} className="opacity-0 group-hover:opacity-100 shrink-0" />
              </button>
            )}
            <ZoomControl />
            <Button
              icon={
                sidebarOpen ? (
                  <PanelLeftClose size={16} />
                ) : (
                  <PanelLeftOpen size={16} />
                )
              }
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              title="Toggle page panel"
            />
            <Button
              icon={<X size={16} />}
              variant="ghost"
              size="sm"
              onClick={onClose}
              title="Close document"
            />
          </>
        )}
      </div>
    </div>
  );
}
