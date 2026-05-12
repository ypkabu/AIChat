import { cn } from "@/lib/utils";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  type = "text"
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-28 rounded-md border border-white/10 bg-panel2 px-3 py-3 text-base text-ink outline-none focus:border-brand"
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 rounded-md border border-white/10 bg-panel2 px-3 text-base text-ink outline-none focus:border-brand"
        />
      )}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-md border border-white/10 bg-panel2 px-3 text-base text-ink outline-none focus:border-brand"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-white/10 bg-panel2 px-3">
      <span className="text-sm text-ink">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-brand"
      />
    </label>
  );
}

export function Segmented({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-md bg-panel2 p-1 sm:grid-cols-4">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn("min-h-10 rounded-sm px-2 text-sm text-muted", value === option.value && "bg-brand text-canvas font-semibold")}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
