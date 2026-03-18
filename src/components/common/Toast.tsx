import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useUIStore, type ToastMessage } from '../../store/uiStore';

const AUTO_DISMISS_MS = 4000;

function ToastItem({ toast }: { toast: ToastMessage }) {
  const dismissToast = useUIStore((s) => s.dismissToast);

  useEffect(() => {
    const t = setTimeout(() => dismissToast(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [toast.id, dismissToast]);

  const iconMap = {
    success: <CheckCircle size={16} className="text-green-400 mt-0.5 shrink-0" />,
    error: <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />,
    info: <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />,
  };

  return (
    <div className="flex items-start gap-2 bg-surface-raised border border-border-moderate rounded-lg shadow-lg px-3 py-2 min-w-48 max-w-80 pointer-events-auto">
      {iconMap[toast.type]}
      <span className="text-sm text-text-primary flex-1">{toast.message}</span>
      <button
        onClick={() => dismissToast(toast.id)}
        className="text-text-muted hover:text-text-primary ml-1"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function Toast() {
  const toasts = useUIStore((s) => s.toasts);
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-8 right-4 flex flex-col gap-2 z-[60] pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
