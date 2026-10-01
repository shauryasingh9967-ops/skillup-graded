import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import { FormField, Input } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Feedback';
import { EMAIL_RE } from '../../utils/format';

export default function Login() {
  const { user, login, notice, booting } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!booting && user) return <Navigate to={location.state?.from || '/dashboard'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Enter a valid email address';
    if (!form.password) errs.password = 'Enter your password';
    setErrors(errs); setFormError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="auth">
      <main className="auth-card">
        <div className="auth-brand"><strong>Skillup Graded</strong><span>Student management</span></div>
        <h2>Sign in</h2>
        <form onSubmit={submit} noValidate className="stack">
          {notice && <Alert tone="warning">{notice}</Alert>}
          {formError && <Alert tone="danger">{formError}</Alert>}
          <FormField label="Email address" error={errors.email}>
            <Input type="email" autoComplete="username" autoFocus value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Password" error={errors.password}>
            <PasswordInput show={show} onToggle={() => setShow((s) => !s)} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </FormField>
          <Button variant="primary" type="submit" loading={busy} style={{ height: 40 }}>Sign in</Button>
        </form>
        <p className="muted" style={{ marginTop: 20, fontSize: 13 }}>Accounts are created by the institute administrator. Forgot your password? Ask the administrator to reset it.</p>
      </main>
    </div>
  );
}

function PasswordInput({ show, onToggle, ...props }) {
  return (
    <div className="input-wrap">
      <Input {...props} type={show ? 'text' : 'password'} autoComplete="current-password" style={{ paddingLeft: 12, paddingRight: 44 }} />
      <span className="input-trail">
        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
    </div>
  );
}
