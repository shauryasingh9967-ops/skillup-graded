import { useEffect, useState } from 'react';
import { Eye, Pencil, Power, UserPlus, Users } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import { teacherService } from '../../services';
import { Avatar, Card, PageHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { FormField, Input, SearchInput, Select } from '../../components/ui/Form';
import { Badge, StatusBadge } from '../../components/ui/Badges';
import { Alert, EmptyState, ErrorState, CardSkeleton } from '../../components/ui/Feedback';
import { ConfirmDialog, Drawer, Modal } from '../../components/ui/Overlays';
import DataTable from '../../components/data/DataTable';
import Pagination from '../../components/data/Pagination';
import { Link } from 'react-router-dom';
import { EMAIL_RE, PHONE_RE } from '../../utils/format';

export default function Teachers() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const term = useDebounce(search);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // { teacher? }
  const [view, setView] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setPage(1), [term, status]);
  const { data, loading, error, reload } = useAsync(() => teacherService.list({ search: term, status, page, limit: 10 }), [term, status, page]);

  const toggle = async () => {
    setBusy(true);
    const next = confirm.isActive ? 'INACTIVE' : 'ACTIVE';
    try { await teacherService.setStatus(confirm._id, next); toast.success(next === 'ACTIVE' ? 'Teacher activated' : 'Teacher deactivated'); setConfirm(null); reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const columns = [
    { key: 'name', header: 'Teacher', render: (t) => <div className="cell-person"><Avatar name={t.name} /><div><strong>{t.name}</strong><span>{t.email}</span></div></div> },
    { key: 'employeeId', header: 'Employee ID', render: (t) => t.teacherProfile?.employeeId || <span className="muted">—</span> },
    { key: 'department', header: 'Department', render: (t) => t.teacherProfile?.department || <span className="muted">—</span> },
    { key: 'students', header: 'Active students', align: 'right', render: (t) => <span className="num">{t.activeStudents}</span> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', render: (t) => (
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" iconOnly aria-label={`View ${t.name}`} onClick={() => setView(t._id)}><Eye size={16} /></Button>
        <Button variant="ghost" size="sm" iconOnly aria-label={`Edit ${t.name}`} onClick={() => setForm({ teacher: t })}><Pencil size={16} /></Button>
        <Button variant="ghost" size="sm" iconOnly aria-label={`${t.isActive ? 'Deactivate' : 'Activate'} ${t.name}`} onClick={() => setConfirm(t)}><Power size={16} /></Button>
      </div>) },
  ];

  return (
    <>
      <PageHeader title="Teachers" actions={<Button variant="primary" icon={UserPlus} onClick={() => setForm({})}>Add teacher</Button>} />
      <Card flush>
        <div className="toolbar" role="search">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or employee ID" label="Search teachers" />
          <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All statuses"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select>
        </div>
        <DataTable caption="Teachers" columns={columns} rows={data?.items} loading={loading} error={error} onRetry={reload}
          empty={<EmptyState icon={Users} title={term || status ? 'No teachers found' : 'No teachers yet'} message={term || status ? 'No teacher matches these filters.' : 'Add a teacher so students can be assigned to them.'} action={!term && !status && <Button variant="primary" onClick={() => setForm({})}>Add teacher</Button>} />} />
        <Pagination pagination={data?.pagination} onPage={setPage} noun="teachers" />
      </Card>
      <TeacherForm open={Boolean(form)} teacher={form?.teacher} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />
      <TeacherDrawer id={view} onClose={() => setView(null)} />
      <ConfirmDialog open={Boolean(confirm)} loading={busy} onCancel={() => setConfirm(null)} onConfirm={toggle} tone={confirm?.isActive ? 'danger' : 'primary'} confirmLabel={confirm?.isActive ? 'Deactivate' : 'Activate'}
        title={confirm?.isActive ? 'Deactivate teacher?' : 'Activate teacher?'}
        message={confirm?.isActive ? `${confirm?.name} will no longer be able to sign in. Their students and records stay unchanged; reassign students if needed.` : `${confirm?.name} will be able to sign in again.`} />
    </>
  );
}

const blank = { name: '', email: '', phone: '', employeeId: '', department: '', subjects: '', password: '' };

function TeacherForm({ open, teacher, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(teacher);
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({}); setFormError('');
    setF(teacher ? { name: teacher.name, email: teacher.email, phone: teacher.phone || '', employeeId: teacher.teacherProfile?.employeeId || '', department: teacher.teacherProfile?.department || '', subjects: (teacher.teacherProfile?.subjects || []).join(', '), password: '' } : blank);
  }, [open, teacher]);

  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (f.name.trim().length < 2) errs.name = 'Enter the teacher’s name';
    if (!EMAIL_RE.test(f.email.trim())) errs.email = 'Enter a valid email address';
    if (f.phone.trim() && !PHONE_RE.test(f.phone.trim())) errs.phone = 'Enter a valid phone number';
    if (!editing || f.password) {
      if (f.password.length < 8) errs.password = 'Use at least 8 characters';
      else if (!/[A-Za-z]/.test(f.password) || !/[0-9]/.test(f.password)) errs.password = 'Include at least one letter and one number';
    }
    setErrors(errs); setFormError('');
    if (Object.keys(errs).length) return;
    setSaving(true);
    const body = { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() || null, employeeId: f.employeeId.trim() || null, department: f.department.trim() || null, subjects: f.subjects.split(',').map((s) => s.trim()).filter(Boolean) };
    if (f.password) body.password = f.password;
    try {
      if (editing) await teacherService.update(teacher._id, body); else await teacherService.create(body);
      toast.success(editing ? 'Teacher updated' : 'Teacher account created');
      onSaved();
    } catch (err) { setErrors(err.fieldErrors || {}); setFormError(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} size="wide" title={editing ? 'Edit teacher' : 'Add teacher'} subtitle={editing ? undefined : 'They will sign in with this email and password.'}
      footer={<><Button onClick={onClose} disabled={saving}>Cancel</Button><Button variant="primary" type="submit" form="teacher-form" loading={saving}>{editing ? 'Save changes' : 'Create account'}</Button></>}>
      <form id="teacher-form" onSubmit={submit} noValidate className="stack">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <div className="form-grid">
          <FormField label="Full name" required error={errors.name}><Input value={f.name} onChange={set('name')} maxLength={100} /></FormField>
          <FormField label="Email" required error={errors.email}><Input type="email" value={f.email} onChange={set('email')} autoComplete="off" /></FormField>
          <FormField label="Phone" error={errors.phone} hint="Optional"><Input type="tel" value={f.phone} onChange={set('phone')} /></FormField>
          <FormField label="Employee ID" error={errors.employeeId} hint="Optional, must be unique"><Input value={f.employeeId} onChange={set('employeeId')} maxLength={30} /></FormField>
          <FormField label="Department" error={errors.department} hint="Optional"><Input value={f.department} onChange={set('department')} maxLength={100} /></FormField>
          <FormField label="Subjects" error={errors.subjects} hint="Separate with commas. Optional"><Input value={f.subjects} onChange={set('subjects')} placeholder="React, Node.js" /></FormField>
          <FormField label={editing ? 'Reset password' : 'Password'} required={!editing} error={errors.password} hint={editing ? 'Leave blank to keep the current password.' : 'At least 8 characters with a letter and a number.'} className="span-2">
            <Input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}

function TeacherDrawer({ id, onClose }) {
  const { data, loading, error, reload } = useAsync(() => teacherService.get(id), [id], { enabled: Boolean(id) });
  const t = data?.teacher;
  return (
    <Drawer open={Boolean(id)} onClose={onClose} title={t?.name || 'Teacher'} subtitle={t?.email}>
      {loading && !data ? <CardSkeleton height={200} /> : error ? <ErrorState error={error} onRetry={reload} /> : t && (
        <div className="stack">
          <dl className="dl" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div><dt>Employee ID</dt><dd>{t.teacherProfile?.employeeId || '—'}</dd></div><div><dt>Department</dt><dd>{t.teacherProfile?.department || '—'}</dd></div>
            <div><dt>Phone</dt><dd>{t.phone || '—'}</dd></div><div><dt>Status</dt><dd><StatusBadge status={t.isActive ? 'ACTIVE' : 'INACTIVE'} /></dd></div>
          </dl>
          {t.teacherProfile?.subjects?.length > 0 && <div className="row" style={{ flexWrap: 'wrap' }}>{t.teacherProfile.subjects.map((s) => <Badge key={s} tone="info">{s}</Badge>)}</div>}
          <div><h3 style={{ fontSize: 14, marginBottom: 6 }}>Assigned students ({data.activeStudents} active of {data.totalStudents})</h3>
            {data.students.length === 0 ? <p className="muted">No students assigned yet.</p> : (
              <ul className="list" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
                {data.students.map((s) => <li key={s._id} style={{ padding: '10px 14px' }}><div className="body"><strong><Link to={`/students/${s._id}`}>{s.fullName}</Link></strong><span>{s.studentId}{s.batch ? ` · ${s.batch.name}` : ''}</span></div><StatusBadge status={s.status} /></li>)}
              </ul>)}
            {data.totalStudents > data.students.length && <p className="muted" style={{ marginTop: 8, fontSize: 12.5 }}>Showing the first {data.students.length}.</p>}
          </div>
        </div>
      )}
    </Drawer>
  );
}
