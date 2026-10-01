import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { SearchInput } from '../ui/Form';
import useDebounce from '../../hooks/useDebounce';
import { studentService } from '../../services';

// Search-as-you-type student selector (server-side search, never loads the full list).
export default function StudentPicker({ value, onChange, placeholder = 'Search by name, ID or phone', label = 'Student', activeOnly }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const term = useDebounce(query.trim(), 300);
  const box = useRef(null);

  useEffect(() => {
    if (!open || term.length < 1) { setResults([]); return undefined; }
    let live = true;
    setBusy(true);
    studentService.list({ search: term, limit: 8, status: activeOnly ? 'ACTIVE' : undefined })
      .then((d) => { if (live) setResults(d.items); })
      .catch(() => { if (live) setResults([]); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [term, open, activeOnly]);

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (value) {
    return (
      <div className="row" style={{ height: 38, padding: '0 6px 0 12px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}>
        <span className="grow truncate"><strong>{value.fullName}</strong> <span className="muted">{value.studentId}</span></span>
        <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={`Clear selected ${label.toLowerCase()}`} onClick={() => { onChange(null); setQuery(''); }}><X size={15} /></button>
      </div>
    );
  }
  return (
    <div className="picker" ref={box} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      <div onFocus={() => setOpen(true)}>
        <SearchInput value={query} onChange={(v) => { setQuery(v); setOpen(true); }} placeholder={placeholder} label={`Search ${label.toLowerCase()}`} />
      </div>
      {open && term.length > 0 && (
        <div className="picker-list" role="listbox" aria-label="Matching students">
          {busy && <div className="none">Searching…</div>}
          {!busy && results.length === 0 && <div className="none">No students match “{term}”.</div>}
          {results.map((s) => (
            <button key={s._id} type="button" role="option" aria-selected="false" onClick={() => { onChange(s); setOpen(false); setQuery(''); }}>
              <strong>{s.fullName}</strong>
              <small>{s.studentId}{s.batch ? ` · ${s.batch.name}` : ''}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
