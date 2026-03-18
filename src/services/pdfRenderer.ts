import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';
import type { PDFAnnotationRaw } from '../types/pdf.types';
import { getDPR } from '../utils/canvasUtils';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

class PDFRendererService {
  private documentProxy: PDFDocumentProxy | null = null;

  async loadDocument(data: Uint8Array): Promise<PDFDocumentProxy> {
    this.destroy();
    const dataCopy = new Uint8Array(data);
    this.documentProxy = await pdfjsLib.getDocument({ data: dataCopy }).promise;
    return this.documentProxy;
  }

  getProxy(): PDFDocumentProxy | null {
    return this.documentProxy;
  }

  async getPage(pageNumber: number): Promise<PDFPageProxy> {
    if (!this.documentProxy) throw new Error('No document loaded');
    return this.documentProxy.getPage(pageNumber);
  }

  // Returns the RenderTask so callers can cancel in-progress renders.
  // Synchronous setup (viewport, canvas sizing) runs immediately; rendering is async via task.promise.
  renderPage(
    page: PDFPageProxy,
    canvas: HTMLCanvasElement,
    scale: number,
    rotation: number = 0
  ): RenderTask {
    const viewport = page.getViewport({ scale, rotation });
    const dpr = getDPR();
    const ctx = canvas.getContext('2d')!;

    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    ctx.scale(dpr, dpr);

    return page.render({ canvas, canvasContext: ctx, viewport });
  }

  async getRawAnnotations(pageNum: number): Promise<PDFAnnotationRaw[]> {
    if (!this.documentProxy) return [];
    const page = await this.documentProxy.getPage(pageNum);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const annots: any[] = await page.getAnnotations();
    const result: PDFAnnotationRaw[] = [];
    for (const ann of annots) {
      if (ann.subtype === 'FreeText' && ann.contents) {
        result.push({
          subtype: 'FreeText',
          content: ann.contents as string,
          rect: ann.rect as [number, number, number, number],
          fontSize: (ann.defaultStyle?.fontSize ?? ann.fontSize) as number | undefined,
        });
      } else if (ann.subtype === 'Widget' && ann.fieldType === 'Tx' && ann.fieldValue) {
        result.push({
          subtype: 'Widget',
          content: String(ann.fieldValue),
          rect: ann.rect as [number, number, number, number],
        });
      }
    }
    return result;
  }

  async renderTextLayer(
    page: PDFPageProxy,
    container: HTMLDivElement,
    scale: number,
    rotation: number = 0
  ): Promise<void> {
    const viewport = page.getViewport({ scale, rotation });
    container.innerHTML = '';
    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;

    const textContent = await page.getTextContent();
    const textLayer = new pdfjsLib.TextLayer({
      textContentSource: textContent,
      container,
      viewport,
    });
    await textLayer.render();
  }

  getPageViewport(page: PDFPageProxy, scale: number, rotation: number = 0) {
    return page.getViewport({ scale, rotation });
  }

  /** Render a page to a data URL with full annotation visibility (for OCR input). */
  async renderPageForOCR(pageNum: number, targetWidth = 1800): Promise<{ dataURL: string; width: number; height: number }> {
    if (!this.documentProxy) throw new Error('No document loaded');
    const page = await this.documentProxy.getPage(pageNum);
    const unscaled = page.getViewport({ scale: 1 });
    const scale = targetWidth / unscaled.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    // Render WITH annotations so OCR can read all visible text
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    return { dataURL: canvas.toDataURL('image/png'), width: viewport.width, height: viewport.height };
  }

  async generateThumbnail(
    pageNumber: number,
    maxWidth: number = 150
  ): Promise<string> {
    const page = await this.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = maxWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.6);
  }

  async getOutline(): Promise<OutlineNode[]> {
    if (!this.documentProxy) return [];
    try {
      const outline = await this.documentProxy.getOutline();
      if (!outline) return [];
      return outline as unknown as OutlineNode[];
    } catch {
      return [];
    }
  }

  async getPageForDest(dest: string | unknown[]): Promise<number> {
    if (!this.documentProxy) return 1;
    try {
      let resolvedDest: unknown[];
      if (typeof dest === 'string') {
        resolvedDest = await this.documentProxy.getDestination(dest) as unknown[];
      } else {
        resolvedDest = dest as unknown[];
      }
      if (!resolvedDest || !resolvedDest[0]) return 1;
      const pageRef = resolvedDest[0] as { num: number; gen: number };
      const pageIndex = await this.documentProxy.getPageIndex(pageRef);
      return pageIndex + 1;
    } catch {
      return 1;
    }
  }

  async searchText(query: string, scale: number): Promise<SearchResult[]> {
    if (!this.documentProxy || !query.trim()) return [];
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    const totalPages = this.documentProxy.numPages;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await this.documentProxy.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const textContent = await page.getTextContent();

      // Build full text and track item positions
      let fullText = '';
      const items: Array<{ str: string; startIndex: number; transform: number[]; width: number; height: number }> = [];
      for (const item of textContent.items) {
        if (!('str' in item)) continue;
        const textItem = item as { str: string; transform: number[]; width: number; height: number };
        items.push({ ...textItem, startIndex: fullText.length });
        fullText += textItem.str;
      }

      // Search for matches
      const lowerFull = fullText.toLowerCase();
      let idx = 0;
      while ((idx = lowerFull.indexOf(lowerQuery, idx)) !== -1) {
        // Find which item contains this index
        let matchItem: typeof items[0] | undefined;
        for (let i = items.length - 1; i >= 0; i--) {
          if (items[i].startIndex <= idx) { matchItem = items[i]; break; }
        }
        if (matchItem) {
          const [, , , , tx, ty] = matchItem.transform;
          // Convert PDF coordinates to viewport coordinates
          const pt = viewport.convertToViewportPoint(tx, ty);
          const widthScale = viewport.width / page.getViewport({ scale: 1 }).width;
          results.push({
            pageIndex: pageNum - 1,
            x: pt[0],
            y: pt[1] - matchItem.height * scale,
            width: matchItem.width * widthScale,
            height: matchItem.height * scale,
          });
        }
        idx += lowerQuery.length;
      }
    }

    return results;
  }

  destroy(): void {
    this.documentProxy?.destroy();
    this.documentProxy = null;
  }
}

export interface OutlineNode {
  title: string;
  dest: string | unknown[] | null;
  items: OutlineNode[];
  bold?: boolean;
  italic?: boolean;
  color?: number[];
}

export interface SearchResult {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const pdfRenderer = new PDFRendererService();
