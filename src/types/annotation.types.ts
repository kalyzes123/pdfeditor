export type AnnotationTool =
  | 'pan'
  | 'select'
  | 'text'
  | 'underline'
  | 'rectangle'
  | 'circle'
  | 'freehand'
  | 'signature'
  | 'eraser'
  | 'arrow'
  | 'stamp'
  | 'image'
  | 'redact';

export interface PageAnnotations {
  pageIndex: number;
  fabricJSON: object;
  formValues: Record<string, string>;
}

export interface StickyNote {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  content: string;
  color: string;
  createdAt: string;
}
