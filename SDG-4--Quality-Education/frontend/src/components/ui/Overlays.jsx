import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Shared behaviour: Esc to close, focus trap, scroll lock, focus restore.
function useOverlay(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const node = ref.current;
    document.body.style.overflow = 'hidden';
    const first = node && (node.querySelector('[data-autofocus]') || node.querySelector('input:not([type=hidden]),select,textarea') || node.querySelector(FOCUSABLE));
    if (first) first.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab' && node) {
        const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const a = items[0]; const b = items[items.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
        else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (previous && previous.focus) previous.focus();
    };
  }, [open, onClose]);
  return ref;
}

function Shell({ open, onClose, side, title, subtitle, children, footer, size }) {
  const ref = useOverlay(open, onClose);
  if (!open) return null;
  const body = (
    <>
      <div className="overlay-head">
        <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <Button variant="ghost" iconOnly size="sm" onClick={onClose} aria-label="Close"><X size={18} /></Button>
      </div>
      <div className="overlay-body">{children}</div>
      {footer && <div className="overlay-foot">{footer}</div>}
    </>
  );
  return createPortal(
    <div className={`overlay ${side ? 'right' : ''}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={side ? 'drawer' : `modal ${size || ''}`} role="dialog" aria-modal="true" aria-label={title}>{body}</div>
    </div>,
    document.body
  );
}

export const Modal = (props) => <Shell {...props} />;
export const Drawer = (props) => <Shell {...props} side />;

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', tone = 'primary', loading, onConfirm, onCancel }) {
  return (
    <Shell
      open={open}
      onClose={onCancel}
      title={title}
      size="modal-sm"
      footer={(
        <>
          <Button onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant={tone} onClick={onConfirm} loading={loading} data-autofocus>{confirmLabel}</Button>
        </>
      )}
    >
      <p className="muted" style={{ fontSize: 14 }}>{message}</p>
    </Shell>
  );
}
