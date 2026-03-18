export type AnnotationTool =
  | 'pan'
  | 'select'
  | 'text'
  | 'highlight'
  | 'underline'
  | 'rectangle'
  | 'circle'
  | 'freehand'
  | 'sticky'
  | 'signature'
  | 'eraser'
  | 'arrow'
  | 'stamp';

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
