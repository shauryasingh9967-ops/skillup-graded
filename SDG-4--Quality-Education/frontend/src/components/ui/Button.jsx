export default function Button({ variant = 'secondary', size, icon: Icon, loading = false, iconOnly = false, className = '', children, disabled, type = 'button', ...rest }) {
  const cls = ['btn', variant !== 'secondary' && `btn-${variant}`, size === 'sm' && 'btn-sm', iconOnly && 'btn-icon', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="spinner" aria-hidden="true" /> : Icon ? <Icon size={size === 'sm' ? 15 : 17} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
