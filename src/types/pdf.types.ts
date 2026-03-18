export interface PDFAnnotationRaw {
  subtype: 'FreeText' | 'Widget';
  content: string;
  rect: [number, number, number, number]; // [x1, y1, x2, y2] in PDF user space
  fontSize?: number;
}

export interface PageMeta {
  pageIndex: number;
  width: number;
  height: number;
  rotation: number;
  annotations?: PDFAnnotationRaw[];
}
