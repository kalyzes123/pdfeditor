import { useCallback } from 'react';
import { useDocumentStore } from '../../store/documentStore';
import { useUIStore } from '../../store/uiStore';
import { isValidPDF } from '../../utils/fileUtils';
import { Toast } from '../common/Toast';
import { Button } from '../common/Button';
import { annotationManagers } from '../../services/annotationRegistry';
import { AnnotationManager } from '../../services/annotationManager';
import { useAnnotationStore } from '../../store/annotationStore';
import { pdfRenderer } from '../../services/pdfRenderer';
import { extractTextViaOCR } from '../../services/ocrService';
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
import { MergeDialog } from '../dialogs/MergeDialog';
import { SplitDialog } from '../dialogs/SplitDialog';

export function AppShell() {
  const { isDocumentLoaded, loadDocument, saveDocument, closeDocument, pageCount, isModified } =
    useDocumentStore();
  const {
    sidebarOpen, isLoading, loadingMessage, setLoading, currentPage, zoom, setTool,
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

        const textAnnotations = manager.extractTextAnnotations();
        const nonTextDataURL = manager.exportNonTextToPNG();
        const { width: canvasWidth, height: canvasHeight } = manager.getDimensions();

        if (textAnnotations.length > 0 || nonTextDataURL) {
          pageAnnotations.push({
            pageIndex: i,
            nonTextDataURL,
            textAnnotations,
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
        const { textAnnotations, nonTextDataURL } = await AnnotationManager.extractFromJSON(json, w, h);

        if (textAnnotations.length > 0 || nonTextDataURL) {
          pageAnnotations.push({
            pageIndex: i,
            nonTextDataURL,
            textAnnotations,
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

  const handleEditText = useCallback(async () => {
    const pageIndex = currentPage - 1;
    const manager = annotationManagers.get(pageIndex);
    if (!manager) return;

    setLoading(true, 'Extracting text from page…');
    try {
      const page = await pdfRenderer.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: zoom });
      const textContent = await page.getTextContent();
      const widthScale = viewport.width / page.getViewport({ scale: 1 }).width;

      type PosItem = { str: string; left: number; top: number; w: number; h: number; fontSize: number };
      const posItems: PosItem[] = [];

      for (const item of textContent.items) {
        if (!('str' in item)) continue;
        const ti = item as { str: string; transform: number[]; width: number; height: number };
        if (!ti.str.trim()) continue;
        const [, , , d, tx, ty] = ti.transform;
        const [vpx, vpy] = viewport.convertToViewportPoint(tx, ty);
        const fontSize = Math.max(Math.abs(d) * zoom, 6);
        // Prefer ti.height; fall back to font size when zero (common in many PDFs)
        const rawH = Math.abs(ti.height);
        const h = Math.max(rawH > 0 ? rawH * zoom : fontSize * 1.2, 8);
        const w = Math.max(ti.width * widthScale, 10);
        posItems.push({ str: ti.str, left: vpx, top: vpy - h, w, h, fontSize });
      }

      // Also extract form field values (Widget annotations) — getTextContent() misses these
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawAnnotations: any[] = await page.getAnnotations();
      const naturalVp = page.getViewport({ scale: 1 });
      const naturalH = naturalVp.height;
      for (const ann of rawAnnotations) {
        if (ann.subtype === 'Widget' && ann.fieldType === 'Tx' && ann.fieldValue) {
          const [x1, y1, x2, y2] = ann.rect as [number, number, number, number];
          // Convert PDF coords (origin bottom-left) to viewport coords (origin top-left)
          const pt1 = viewport.convertToViewportPoint(x1, naturalH - y1);
          const pt2 = viewport.convertToViewportPoint(x2, naturalH - y2);
          const left = Math.min(pt1[0], pt2[0]);
          const top = Math.min(pt1[1], pt2[1]);
          const w = Math.max(Math.abs(pt2[0] - pt1[0]), 20);
          const h = Math.max(Math.abs(pt2[1] - pt1[1]), 10);
          const fontSize = Math.max(h * 0.6, 6);
          posItems.push({ str: String(ann.fieldValue), left, top, w, h, fontSize });
        }
      }

      if (posItems.length > 0) {
        // Group into lines — tolerance is relative to item height to handle varying font sizes
        posItems.sort((a, b) => a.top - b.top);
        const lines: PosItem[][] = [];
        for (const item of posItems) {
          const last = lines[lines.length - 1];
          const tolerance = Math.max(item.h * 0.25, 3);
          if (last && Math.abs(item.top - last[0].top) < tolerance) {
            last.push(item);
          } else {
            lines.push([item]);
          }
        }

        // Within each line, sort by x and merge only tightly adjacent items (kerning/spacing)
        const fabricObjects: object[] = [];
        const COVER_PAD = 2; // px padding on cover rects to ensure full PDF text coverage
        for (const line of lines) {
          line.sort((a, b) => a.left - b.left);
          const groups: PosItem[][] = [];
          for (const item of line) {
            const last = groups[groups.length - 1];
            if (last) {
              const prev = last[last.length - 1];
              // Only merge items that are truly adjacent (word spacing), not separate columns/sections
              if (item.left - (prev.left + prev.w) < prev.fontSize * 0.6) {
                last.push(item);
                continue;
              }
            }
            groups.push([item]);
          }

          for (const group of groups) {
            const left = group[0].left;
            const top = Math.min(...group.map((g) => g.top));
            const right = Math.max(...group.map((g) => g.left + g.w));
            const bottom = Math.max(...group.map((g) => g.top + g.h));
            const w = Math.max(right - left, 10);
            const h = Math.max(bottom - top, 8);
            const text = group.map((g) => g.str).join('');
            const fontSize = group[0].fontSize;

            // 1. White cover rectangle with padding — fully hides original PDF text
            fabricObjects.push({
              type: 'Rect',
              left: left - COVER_PAD,
              top: top - COVER_PAD,
              width: w + COVER_PAD * 2,
              height: h + COVER_PAD * 2,
              fill: '#ffffff',
              strokeWidth: 0,
              selectable: false, evented: false,
              hasControls: false, hasBorders: false,
            });
            // 2. Editable text box on top
            fabricObjects.push({
              type: 'Textbox',
              left, top, width: w, height: h,
              text, fontSize,
              fill: '#000000',
              fontFamily: 'Helvetica',
              originX: 'left', originY: 'top',
              selectable: true, editable: true,
            });
          }
        }

        await manager.addRawObjects(fabricObjects);
        setTool('select');
        return;
      }

      // Fallback: OCR via Tesseract.js (for scanned/image PDFs with no text layer)
      setLoading(true, 'No text layer found — running OCR (may take ~5 sec)…');
      const { dataURL, width: imgW, height: imgH } = await pdfRenderer.renderPageForOCR(pageIndex + 1);
      const ocrBlocks = await extractTextViaOCR(dataURL);
      const scaleX = viewport.width / imgW;
      const scaleY = viewport.height / imgH;

      const ocrObjects: object[] = [];
      for (const b of ocrBlocks) {
        const left = b.x * scaleX;
        const top = b.y * scaleY;
        const w = Math.max(b.width * scaleX, 20);
        const h = Math.max(b.height * scaleY, 10);
        ocrObjects.push({
          type: 'Rect',
          left, top, width: w, height: h,
          fill: '#ffffff', strokeWidth: 0,
          selectable: false, evented: false,
          hasControls: false, hasBorders: false,
        });
        ocrObjects.push({
          type: 'Textbox',
          left, top, width: w, height: h,
          text: b.text,
          fontSize: Math.max(h * 0.75, 6),
          fill: '#000000',
          fontFamily: 'Helvetica',
          originX: 'left', originY: 'top',
          selectable: true, editable: true,
        });
      }

      await manager.addRawObjects(ocrObjects);
      setTool('select');
    } catch (err) {
      console.error('Edit Text failed:', err);
      addToast('error', 'Failed to extract text from this page.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, zoom, setLoading, setTool]);

  return (
    <div className="flex flex-col h-screen bg-surface-base">
      <div className="no-print">
        <Toolbar onOpenFile={handleOpenFile} onSave={handleSave} onEditText={handleEditText} onClose={handleClose} />
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
      <MergeDialog />
      <SplitDialog />

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
