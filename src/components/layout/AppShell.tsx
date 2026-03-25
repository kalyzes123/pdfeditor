import { useCallback } from 'react';
import { useDocumentStore } from '../../store/documentStore';
import { useUIStore } from '../../store/uiStore';
import { isValidPDF } from '../../utils/fileUtils';
import { Toast } from '../common/Toast';
import { Button } from '../common/Button';
import { annotationManagers } from '../../services/annotationRegistry';
import { AnnotationManager } from '../../services/annotationManager';
import { useAnnotationStore } from '../../store/annotationStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';
import { PDFViewer } from '../viewer/PDFViewer';
import { AnnotationToolbar } from '../toolbar/AnnotationToolbar';
import { FindBar } from '../toolbar/FindBar';
import { PagePanel } from '../sidebar/PagePanel';
import { PropertiesPanel } from '../panels/PropertiesPanel';
import { DropZone } from '../common/DropZone';
import { Spinner } from '../common/Spinner';
import { SignatureDialog } from '../dialogs/SignatureDialog';

export function AppShell() {
  const { isDocumentLoaded, loadDocument, saveDocument, closeDocument, pageCount, isModified } =
    useDocumentStore();
  const {
    sidebarOpen, isLoading, loadingMessage, setLoading,
    addToast, showConfirm, dismissConfirm, confirmDialog,
  } = useUIStore();
  useKeyboardShortcuts();

  const handleOpenFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!(await isValidPDF(file))) {
        addToast('error', 'Invalid file: not a PDF.');
        return;
      }
      setLoading(true, 'Loading PDF...');
      try {
        await loadDocument(file);
      } catch (err) {
        console.error('Failed to load PDF:', err);
        addToast('error', 'Failed to load PDF. The file may be corrupted or password-protected.');
      } finally {
        setLoading(false);
      }
    };
    input.click();
  }, [loadDocument, setLoading]);

  const handleSave = useCallback(async () => {
    setLoading(true, 'Saving PDF...');
    try {
      // Collect HD annotation data: vector text + rasterized non-text
      const pageAnnotations: Array<{
        pageIndex: number;
        nonTextDataURL: string;
        textAnnotations: Array<{
          text: string;
          x: number;
          y: number;
          fontSize: number;
          fontFamily: string;
          color: string;
          width: number;
          height: number;
        }>;
        canvasScale: number;
        canvasWidth: number;
        canvasHeight: number;
      }> = [];

      const zoom = useUIStore.getState().zoom;

      for (let i = 0; i < pageCount; i++) {
        const manager = annotationManagers.get(i);
        if (!manager) continue;

        const nonTextDataURL = manager.exportNonTextToPNG();
        const { width: canvasWidth, height: canvasHeight } = manager.getDimensions();

        if (nonTextDataURL) {
          pageAnnotations.push({
            pageIndex: i,
            nonTextDataURL,
            textAnnotations: [],
            canvasScale: zoom,
            canvasWidth,
            canvasHeight,
          });
        }
      }

      // Second pass: pages scrolled away (no active manager) but with saved annotations.
      // Uses a headless off-screen canvas to extract their content.
      const savedAnnotations = useAnnotationStore.getState().annotations;
      const docPages = useDocumentStore.getState().pages;
      for (const [pageIdxStr, pageAnn] of Object.entries(savedAnnotations)) {
        const i = Number(pageIdxStr);
        if (annotationManagers.has(i)) continue; // already handled above

        const json = pageAnn.fabricJSON;
        if (
          !json || typeof json !== 'object' || !('objects' in json) ||
          !((json as { objects: unknown[] }).objects?.length)
        ) continue;

        const pageMeta = docPages[i];
        if (!pageMeta) continue;

        const w = Math.round(pageMeta.width * zoom);
        const h = Math.round(pageMeta.height * zoom);
        const { nonTextDataURL } = await AnnotationManager.extractFromJSON(json, w, h);

        if (nonTextDataURL) {
          pageAnnotations.push({
            pageIndex: i,
            nonTextDataURL,
            textAnnotations: [],
            canvasScale: zoom,
            canvasWidth: w,
            canvasHeight: h,
          });
        }
      }

      const saved = await saveDocument(pageAnnotations);
      if (saved) addToast('success', 'PDF saved to Downloads.');
    } catch (err) {
      console.error('Failed to save PDF:', err);
      addToast('error', 'Failed to save PDF.');
    } finally {
      setLoading(false);
    }
  }, [pageCount, saveDocument, setLoading]);

  const handleClose = useCallback(() => {
    if (isModified) {
      showConfirm('Close document? Any unsaved changes will be lost.', () => closeDocument());
    } else {
      closeDocument();
    }
  }, [closeDocument, isModified, showConfirm]);


  return (
    <div className="flex flex-col h-screen bg-surface-base">
      <div className="no-print">
        <Toolbar onOpenFile={handleOpenFile} onSave={handleSave} onClose={handleClose} />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-surface-base/80 flex items-center justify-center z-40">
            <Spinner size={40} message={loadingMessage} />
          </div>
        )}

        {isDocumentLoaded ? (
          <>
            <div className="no-print overflow-hidden">
              <AnnotationToolbar />
            </div>
            {sidebarOpen && <div className="no-print"><PagePanel /></div>}
            <PDFViewer />
            <PropertiesPanel />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full">
              <DropZone
                onFileSelect={async (file) => {
                  if (!(await isValidPDF(file))) {
                    addToast('error', 'Invalid file: not a PDF.');
                    return;
                  }
                  setLoading(true, 'Loading PDF...');
                  try {
                    await loadDocument(file);
                  } catch (err) {
                    console.error('Failed to load PDF:', err);
                    addToast('error', 'Failed to load PDF.');
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="no-print">
        <StatusBar />
      </div>

      {/* Find bar */}
      <FindBar />

      {/* Dialogs */}
      <SignatureDialog />

      {/* Confirm dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-raised border border-border-moderate rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <p className="text-text-primary mb-5">{confirmDialog.message}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={dismissConfirm}>Cancel</Button>
              <Button
                variant="ghost"
                onClick={() => { confirmDialog.onConfirm(); dismissConfirm(); }}
                className="text-red-400 hover:text-red-300"
              >
                Close anyway
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <Toast />
    </div>
  );
}
