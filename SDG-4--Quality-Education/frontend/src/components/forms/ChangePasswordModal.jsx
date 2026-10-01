import { useState } from 'react';
import { Modal } from '../ui/Overlays';
import Button from '../ui/Button';
import { FormField, Input } from '../ui/Form';
import { Alert } from '../ui/Feedback';
import { authService } from '../../services';
import { useToast } from '../../context/ToastContext';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

export default function ChangePasswordModal({ open, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const close = () => { setForm(EMPTY); setErrors({}); setFormError(''); onClose(); };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = 'Enter your current password';
    if (form.newPassword.length < 8) errs.newPassword = 'Use at least 8 characters';
    else if (!/[A-Za-z]/.test(form.newPassword) || !/[0-9]/.test(form.newPassword)) errs.newPassword = 'Include at least one letter and one number';
    if (form.confirm !== form.newPassword) errs.confirm = 'Passwords do not match';
    setErrors(errs); setFormError('');
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await authService.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password updated');
      close();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={close} title="Change password" subtitle="Use a password you do not use anywhere else."
      footer={<><Button onClick={close} disabled={saving}>Cancel</Button><Button variant="primary" type="submit" form="pw-form" loading={saving}>Update password</Button></>}>
      <form id="pw-form" onSubmit={submit} noValidate className="stack">
        {formError && !Object.keys(errors).length && <Alert tone="danger">{formError}</Alert>}
        <FormField label="Current password" error={errors.currentPassword} required><Input type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} /></FormField>
        <FormField label="New password" error={errors.newPassword} hint="At least 8 characters with a letter and a number." required><Input type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} /></FormField>
        <FormField label="Confirm new password" error={errors.confirm} required><Input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} /></FormField>
      </form>
    </Modal>
  );
}
