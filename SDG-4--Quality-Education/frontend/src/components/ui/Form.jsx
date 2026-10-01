import { Children, cloneElement, isValidElement, useId } from 'react';
import { AlertCircle, Search, X } from 'lucide-react';

// Wraps a control with a label, hint and an error message wired up for screen readers.
export function FormField({ label, error, hint, required, children, className = '' }) {
  const id = useId();
  const errId = `${id}-error`;
  const hintId = `${id}-hint`;
  const child = Children.only(children);
  const described = [error && errId, hint && hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}{required && <span className="req" aria-hidden="true">*</span>}</label>
      {isValidElement(child) ? cloneElement(child, { id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': described, required: required || undefined }) : child}
      {hint && !error && <span className="hint" id={hintId}>{hint}</span>}
      {error && <span className="error" id={errId} role="alert"><AlertCircle size={14} style={{ flex: 'none', marginTop: 2 }} aria-hidden="true" />{error}</span>}
    </div>
  );
}

export const Input = ({ className = '', ...p }) => <input className={`input ${className}`} {...p} />;
export const Textarea = ({ className = '', ...p }) => <textarea className={`textarea ${className}`} {...p} />;

export function Select({ className = '', placeholder, children, ...p }) {
  return (
    <select className={`select ${className}`} {...p}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {children}
    </select>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search', label = 'Search' }) {
  return (
    <div className="input-wrap">
      <Search size={16} aria-hidden="true" />
      <input className="input" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} />
      {value && (
        <span className="input-trail">
          <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Clear search" onClick={() => onChange('')}><X size={14} /></button>
        </span>
      )}
    </div>
  );
}
