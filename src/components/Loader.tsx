export default function Loader({ variant = 1, className = "" }: { variant?: number; className?: string }) {
  const v = Math.max(1, Math.min(9, variant));
  return (
    <div className="flex items-center justify-center py-16">
      <span className={`loader loader--${v} ${className}`} />
    </div>
  );
}
