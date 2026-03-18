import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useUIStore } from '../../store/uiStore';
import { useAnnotationStore } from '../../store/annotationStore';
import { annotationManagers } from '../../services/annotationRegistry';
import { DialogBase } from './DialogBase';
import { Button } from '../common/Button';

type Tab = 'draw' | 'type';

export function SignatureDialog() {
  const isOpen = useUIStore((s) => s.signatureDialogOpen);
  const closeDialog = useUIStore((s) => s.closeDialog);
  const currentPage = useUIStore((s) => s.currentPage);
  const addSignature = useAnnotationStore((s) => s.addSignature);

  const [tab, setTab] = useState<Tab>('draw');
  const [typedText, setTypedText] = useState('');
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  const handleClose = () => closeDialog('signature');

  const handleClear = () => {
    if (tab === 'draw') {
      sigCanvasRef.current?.clear();
    } else {
      setTypedText('');
    }
  };

  const handlePlace = () => {
    let dataURL = '';

    if (tab === 'draw') {
      if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) return;
      // Export directly from the canvas — no trimming to avoid issues
      dataURL = sigCanvasRef.current.toDataURL('image/png');
    } else {
      if (!typedText.trim()) return;
      // Render typed signature - measure text to fit tightly
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const font = 'italic 40px "Georgia", serif';
      ctx.font = font;
      const metrics = ctx.measureText(typedText);
      const textWidth = Math.ceil(metrics.width) + 20;
      const textHeight = 60;
      canvas.width = textWidth;
      canvas.height = textHeight;
      // Re-set font after resize
      ctx.font = font;
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedText, 10, textHeight / 2);
      dataURL = canvas.toDataURL('image/png');
    }

    if (!dataURL) return;

    addSignature({ mode: tab, dataURL });

    // Place on current page's annotation canvas
    const pageIndex = currentPage - 1;
    const manager = annotationManagers.get(pageIndex);
    if (manager) {
      manager.addSignatureImage(dataURL, 100, 100);
    }

    handleClose();
  };

  return (
    <DialogBase title="Add Signature" isOpen={isOpen} onClose={handleClose}>
      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-1.5 text-sm rounded-lg ${
            tab === 'draw'
              ? 'bg-accent-dim text-accent font-medium'
              : 'text-text-muted hover:bg-surface-overlay'
          }`}
          onClick={() => setTab('draw')}
        >
          Draw
        </button>
        <button
          className={`px-4 py-1.5 text-sm rounded-lg ${
            tab === 'type'
              ? 'bg-accent-dim text-accent font-medium'
              : 'text-text-muted hover:bg-surface-overlay'
          }`}
          onClick={() => setTab('type')}
        >
          Type
        </button>
      </div>

      {tab === 'draw' ? (
        <div className="border border-border-subtle rounded-lg overflow-hidden bg-white">
          <SignatureCanvas
            ref={sigCanvasRef}
            canvasProps={{
              width: 460,
              height: 180,
              className: 'signature-pad',
              style: { width: '460px', height: '180px' },
            }}
            penColor="#000000"
            minWidth={1}
            maxWidth={3}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder="Type your signature..."
            className="w-full px-3 py-2 border border-border-moderate bg-surface-overlay text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="border border-border-subtle rounded-lg p-4 bg-surface-overlay min-h-[80px] flex items-center">
            <span
              className="text-3xl text-text-primary"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
            >
              {typedText || 'Preview'}
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={handleClear}>
          Clear
        </Button>
        <Button variant="primary" onClick={handlePlace}>
          Place Signature
        </Button>
      </div>
    </DialogBase>
  );
}
