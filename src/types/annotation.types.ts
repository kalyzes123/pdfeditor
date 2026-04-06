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
  | 'redact'
  | 'comment';

export interface PageAnnotations {
  pageIndex: number;
  fabricJSON: object;
  formValues: Record<string, string>;
}

export interface Comment {
  id: string;
  pageIndex: number;
  highlightBounds: { x: number; y: number; width: number; height: number };
  text: string;
  createdAt: string;
  fabricObjectId?: string;
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
