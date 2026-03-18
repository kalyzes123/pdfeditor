import type { PDFPageProxy } from 'pdfjs-dist';

export interface FormFieldInfo {
  id: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'button';
  name: string;
  rect: [number, number, number, number];
  cssRect: { top: number; left: number; width: number; height: number };
  options?: string[];
  multiline?: boolean;
  required?: boolean;
  defaultValue?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfAnnotation = Record<string, any>;

export async function detectFormFields(
  page: PDFPageProxy,
  scale: number,
  rotation: number = 0
): Promise<FormFieldInfo[]> {
  const viewport = page.getViewport({ scale, rotation });
  const annotations: PdfAnnotation[] = await page.getAnnotations();

  return annotations
    .filter((a) => a.subtype === 'Widget')
    .map((a) => {
      const [x1, y1, x2, y2] = a.rect;
      const [tx1, ty1] = viewport.convertToViewportPoint(x1, y1);
      const [tx2, ty2] = viewport.convertToViewportPoint(x2, y2);

      const cssRect = {
        left: Math.min(tx1, tx2),
        top: Math.min(ty1, ty2),
        width: Math.abs(tx2 - tx1),
        height: Math.abs(ty2 - ty1),
      };

      return {
        id: a.id,
        type: mapFieldType(a.fieldType),
        name: a.fieldName ?? '',
        rect: a.rect as [number, number, number, number],
        cssRect,
        options: a.options?.map((o: PdfAnnotation) => o.displayValue) ?? undefined,
        multiline: a.multiLine ?? false,
        required: a.required ?? false,
        defaultValue: a.fieldValue ?? '',
      };
    });
}

function mapFieldType(ft: string): FormFieldInfo['type'] {
  switch (ft) {
    case 'Tx':
      return 'text';
    case 'Btn':
      return 'checkbox';
    case 'Ch':
      return 'dropdown';
    default:
      return 'text';
  }
}
