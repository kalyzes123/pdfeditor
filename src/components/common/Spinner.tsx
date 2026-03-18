interface SpinnerProps {
  size?: number;
  message?: string;
}

export function Spinner({ size = 32, message }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className="border-4 border-surface-sunken border-t-accent rounded-full animate-spin"
        style={{ width: size, height: size }}
      />
      {message && <p className="text-sm text-text-secondary">{message}</p>}
    </div>
  );
}
