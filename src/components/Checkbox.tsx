"use client";
interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  label: string;
}
export default function Checkbox({ checked, onChange, label }: CheckboxProps) {
  return (
    <label className="flex items-center gap-2 text-white cursor-pointer select-none group">
      <div className="relative w-4 h-4">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div className={`w-4 h-4 rounded border transition-colors ${
          checked
            ? "bg-primary border-primary"
            : "bg-background border-border group-hover:border-primary/50"
        }`}>
          {checked && (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-xs text-text">{label}</span>
    </label>
  );
}
