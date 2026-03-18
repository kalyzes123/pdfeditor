import { useEffect, useRef, useState } from 'react';
import { pdfRenderer } from '../../services/pdfRenderer';
import { detectFormFields, type FormFieldInfo } from '../../services/formFieldDetector';
import { useAnnotationStore } from '../../store/annotationStore';
import { useDocumentStore } from '../../store/documentStore';

interface TextLayerProps {
  pageIndex: number;
  scale: number;
}

export function TextLayer({ pageIndex, scale }: TextLayerProps) {
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [formFields, setFormFields] = useState<FormFieldInfo[]>([]);
  const updateFormValue = useAnnotationStore((s) => s.updateFormValue);
  const annotations = useAnnotationStore((s) => s.annotations);
  const docVersion = useDocumentStore((s) => s.docVersion);

  useEffect(() => {
    const container = textLayerRef.current;
    if (!container) return;

    let cancelled = false;

    const render = async () => {
      try {
        const page = await pdfRenderer.getPage(pageIndex + 1);
        if (cancelled) return;

        // Clear only the pdf.js text spans, keep React children
        const existingSpans = container.querySelectorAll(':scope > span');
        existingSpans.forEach((span) => span.remove());

        await pdfRenderer.renderTextLayer(page, container, scale);

        // Detect form fields
        const fields = await detectFormFields(page, scale);
        if (!cancelled) setFormFields(fields);
      } catch (err) {
        if (!cancelled) console.error('Error rendering text layer', err);
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [pageIndex, scale, docVersion]);

  return (
    <div
      ref={textLayerRef}
      className="textLayer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 2,
      }}
    >
      {formFields.map((field) => (
        <FormFieldOverlay
          key={field.id}
          field={field}
          pageIndex={pageIndex}
          value={annotations[pageIndex]?.formValues?.[field.name] ?? field.defaultValue ?? ''}
          onChange={(val) => updateFormValue(pageIndex, field.name, val)}
        />
      ))}
    </div>
  );
}

function FormFieldOverlay({
  field,
  value,
  onChange,
}: {
  field: FormFieldInfo;
  pageIndex: number;
  value: string;
  onChange: (val: string) => void;
}) {
  const { cssRect, type, name, multiline } = field;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: cssRect.left,
    top: cssRect.top,
    width: cssRect.width,
    height: cssRect.height,
    zIndex: 10,
    pointerEvents: 'all',
    boxSizing: 'border-box',
  };

  if (type === 'checkbox') {
    return (
      <input
        type="checkbox"
        checked={value === 'true'}
        onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
        style={baseStyle}
        title={name}
      />
    );
  }

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Click to edit"
        style={{
          ...baseStyle,
          resize: 'none',
          fontSize: Math.max(10, cssRect.height * 0.5) + 'px',
          padding: '2px 4px',
        }}
        className="border border-transparent bg-transparent hover:border-accent/50 hover:bg-accent/10 focus:border-accent focus:bg-white/95 focus:outline-none"
        title={name}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Click to edit"
      style={{
        ...baseStyle,
        fontSize: Math.max(10, cssRect.height * 0.6) + 'px',
        padding: '1px 4px',
      }}
      className="border border-transparent bg-transparent hover:border-accent/50 hover:bg-accent/10 focus:border-accent focus:bg-white/95 focus:outline-none"
      title={name}
    />
  );
}
