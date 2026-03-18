import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';

class PDFManipulatorService {
  private async load(bytes: Uint8Array): Promise<PDFDocument> {
    return PDFDocument.load(bytes, { ignoreEncryption: true });
  }

  async reorderPages(
    bytes: Uint8Array,
    newOrder: number[]
  ): Promise<Uint8Array> {
    const doc = await this.load(bytes);
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(doc, newOrder);
    copiedPages.forEach((p) => newDoc.addPage(p));
    return newDoc.save();
  }

  async deletePage(
    bytes: Uint8Array,
    pageIndex: number
  ): Promise<Uint8Array> {
    const doc = await this.load(bytes);
    doc.removePage(pageIndex);
    return doc.save();
  }

  async rotatePage(
    bytes: Uint8Array,
    pageIndex: number,
    rotationDegrees: number
  ): Promise<Uint8Array> {
    const doc = await this.load(bytes);
    const page = doc.getPage(pageIndex);
    const current = page.getRotation().angle;
    // Use double-modulo to ensure positive result (JS % can return negative for negative input)
    const newAngle = ((current + rotationDegrees) % 360 + 360) % 360;
    page.setRotation(degrees(newAngle));
    return doc.save();
  }

  async mergeDocuments(filesBytes: Uint8Array[]): Promise<Uint8Array> {
    const mergedDoc = await PDFDocument.create();
    for (const bytes of filesBytes) {
      const doc = await this.load(bytes);
      const indices = Array.from(
        { length: doc.getPageCount() },
        (_, i) => i
      );
      const copiedPages = await mergedDoc.copyPages(doc, indices);
      copiedPages.forEach((p) => mergedDoc.addPage(p));
    }
    return mergedDoc.save();
  }

  async splitDocument(
    bytes: Uint8Array,
    splitPoints: number[]
  ): Promise<Uint8Array[]> {
    const doc = await this.load(bytes);
    const totalPages = doc.getPageCount();
    const points = [...splitPoints, totalPages];

    const results: Uint8Array[] = [];
    let start = 0;
    for (const point of points) {
      const partDoc = await PDFDocument.create();
      const indices = Array.from(
        { length: point - start },
        (_, i) => start + i
      );
      const pages = await partDoc.copyPages(doc, indices);
      pages.forEach((p) => partDoc.addPage(p));
      results.push(await partDoc.save());
      start = point;
    }
    return results;
  }

  async embedAnnotations(
    bytes: Uint8Array,
    annotationImages: Array<{ pageIndex: number; dataURL: string }>
  ): Promise<Uint8Array> {
    const doc = await this.load(bytes);

    for (const { pageIndex, dataURL } of annotationImages) {
      if (!dataURL) continue;
      const page = doc.getPage(pageIndex);
      const { width, height } = page.getSize();

      const base64 = dataURL.split(',')[1];
      const pngBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const pngImage = await doc.embedPng(pngBytes);

      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width,
        height,
        opacity: 1,
      });
    }

    return doc.save();
  }

  // Map common CSS font families to pdf-lib standard fonts
  private mapToStandardFont(fontFamily: string): StandardFonts {
    const lower = fontFamily.toLowerCase();
    if (lower.includes('courier') || lower.includes('mono')) return StandardFonts.Courier;
    if (lower.includes('times') || lower.includes('georgia') || lower.includes('serif')) return StandardFonts.TimesRoman;
    if (lower.includes('comic')) return StandardFonts.Courier; // No comic sans in PDF standard
    return StandardFonts.Helvetica; // Arial, Helvetica, Verdana, etc.
  }

  // Parse hex color to rgb values (0-1). Falls back to black for non-hex values (e.g. 'transparent').
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    if (!hex || !hex.startsWith('#') || hex.length < 7) return { r: 0, g: 0, b: 0 };
    const h = hex.slice(1);
    return {
      r: parseInt(h.substring(0, 2), 16) / 255,
      g: parseInt(h.substring(2, 4), 16) / 255,
      b: parseInt(h.substring(4, 6), 16) / 255,
    };
  }

  async embedAnnotationsHD(
    bytes: Uint8Array,
    pageAnnotations: Array<{
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
    }>
  ): Promise<Uint8Array> {
    const doc = await this.load(bytes);

    for (const { pageIndex, nonTextDataURL, textAnnotations, canvasWidth, canvasHeight } of pageAnnotations) {
      const page = doc.getPage(pageIndex);
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // 1. Embed non-text rasterized content (shapes, drawings, signatures) at HD
      if (nonTextDataURL) {
        const base64 = nonTextDataURL.split(',')[1];
        const pngBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const pngImage = await doc.embedPng(pngBytes);
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
          opacity: 1,
        });
      }

      // 2. Embed text as vector PDF text (crisp at any zoom, like Acrobat)
      // Use actual canvas pixel dimensions for exact conversion rather than zoom ratio,
      // since pdfjs viewport and pdf-lib page sizes can differ (CropBox vs MediaBox, rotation, etc.)
      const scaleX = pageWidth / canvasWidth;
      const scaleY = pageHeight / canvasHeight;

      for (const ta of textAnnotations) {
        const stdFont = this.mapToStandardFont(ta.fontFamily);
        const font = await doc.embedFont(stdFont);
        const { r, g, b } = this.hexToRgb(ta.color);

        // Convert canvas coordinates (origin top-left, Y down) → PDF (origin bottom-left, Y up)
        const pdfFontSize = ta.fontSize * scaleY;
        const pdfX = ta.x * scaleX;
        // Baseline = bottom of the ascender region ≈ top of bounding box + 80% of font size
        const pdfY = pageHeight - (ta.y * scaleY) - pdfFontSize * 0.85;

        // Handle multi-line text
        const lines = ta.text.split('\n');
        lines.forEach((line, i) => {
          page.drawText(line, {
            x: pdfX,
            y: pdfY - (i * pdfFontSize * 1.2),
            size: pdfFontSize,
            font,
            color: rgb(r, g, b),
          });
        });
      }
    }

    return doc.save();
  }

  async flattenFormFields(
    bytes: Uint8Array,
    formValues: Record<string, string>
  ): Promise<Uint8Array> {
    const doc = await this.load(bytes);
    try {
      const form = doc.getForm();
      for (const [fieldName, value] of Object.entries(formValues)) {
        try {
          const field = form.getTextField(fieldName);
          field.setText(value);
        } catch {
          // Field might be checkbox/dropdown — skip for now
        }
      }
      form.flatten();
    } catch {
      // No form fields in this PDF
    }
    return doc.save();
  }
}

export const pdfManipulator = new PDFManipulatorService();
