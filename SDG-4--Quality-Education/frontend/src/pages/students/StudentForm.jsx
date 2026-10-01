import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import { catalogService, studentService, teacherService } from '../../services';
import { Card, PageHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { FormField, Input, Select, Textarea } from '../../components/ui/Form';
import { Alert, CardSkeleton, ErrorState } from '../../components/ui/Feedback';
import { EMAIL_RE, PHONE_RE, todayStr, toInputDate } from '../../utils/format';

const EMPTY = { studentId: '', fullName: '', email: '', phone: '', guardianName: '', guardianPhone: '', dateOfBirth: '', gender: '', address: '', course: '', batch: '', admissionDate: todayStr(), assignedTeacher: '', status: 'ACTIVE' };

function validate(f) {
  const e = {};
  if (f.studentId.trim().length < 2) e.studentId = 'Enter a Student ID (for example SKG-26-001)';
  if (f.fullName.trim().length < 2) e.fullName = 'Enter the student’s full name';
  if (f.email.trim() && !EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address';
  if (!PHONE_RE.test(f.phone.trim())) e.phone = 'Enter a valid phone number (7–15 digits)';
  if (f.guardianName.trim().length < 2) e.guardianName = 'Enter the guardian’s name';
  if (!PHONE_RE.test(f.guardianPhone.trim())) e.guardianPhone = 'Enter a valid guardian phone number';
  if (!f.course) e.course = 'Select a course';
  if (!f.batch) e.batch = 'Select a batch';
  if (!f.assignedTeacher) e.assignedTeacher = 'Select a teacher';
  if (!f.admissionDate) e.admissionDate = 'Enter the admission date';
  else if (f.admissionDate > todayStr()) e.admissionDate = 'Admission date cannot be in the future';
  if (f.dateOfBirth && f.dateOfBirth >= todayStr()) e.dateOfBirth = 'Date of birth must be in the past';
  return e;
}

export default function StudentForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editing);

  const refs = useAsync(async () => {
    const [courses, batches, teachers] = await Promise.all([catalogService.courses({ active: 'true' }), catalogService.batches({ active: 'true' }), teacherService.list({ limit: 100, status: 'ACTIVE' })]);
    return { courses: courses.items, batches: batches.items, teachers: teachers.items };
  }, []);
  const existing = useAsync(() => studentService.get(id), [id], { enabled: editing });

  useEffect(() => {
    const s = existing.data;
    if (!s) return;
    setForm({
      studentId: s.studentId, fullName: s.fullName, email: s.email || '', phone: s.phone, guardianName: s.guardianName, guardianPhone: s.guardianPhone,
      dateOfBirth: toInputDate(s.dateOfBirth), gender: s.gender || '', address: s.address || '', course: s.course?._id || '', batch: s.batch?._id || '',
      admissionDate: toInputDate(s.admissionDate), assignedTeacher: s.assignedTeacher?._id || '', status: s.status,
    });
    setLoaded(true);
  }, [existing.data]);

  const set = (k) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [k]: value, ...(k === 'course' ? { batch: '' } : {}) }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const batchOptions = useMemo(() => (refs.data?.batches || []).filter((b) => b.course?._id === form.course), [refs.data, form.course]);
  const teacherOptions = refs.data?.teachers || [];

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs); setFormError('');
    if (Object.keys(errs).length) {
      setFormError('Please fix the highlighted fields and try again.');
      const first = document.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }
    setSaving(true);
    const body = { ...form, studentId: form.studentId.trim(), fullName: form.fullName.trim(), email: form.email.trim(), gender: form.gender || null, dateOfBirth: form.dateOfBirth || null, address: form.address.trim() };
    try {
      const saved = editing ? await studentService.update(id, body) : await studentService.create(body);
      toast.success(editing ? 'Student details updated' : `${saved.fullName} was added`);
      navigate(`/students/${saved._id}`);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setSaving(false); }
  };

  const title = editing ? 'Edit student' : 'Add student';
  if (refs.error || existing.error) return <><PageHeader title={title} /><Card><ErrorState error={refs.error || existing.error} onRetry={() => { refs.reload(); if (editing) existing.reload(); }} /></Card></>;
  if (refs.loading || !loaded || (editing && existing.loading && !existing.data)) return <><PageHeader title={title} /><Card><CardSkeleton height={420} /></Card></>;
  if (!teacherOptions.length) return <><PageHeader title={title} /><Card><div className="state"><h3>Add a teacher first</h3><p>Every student is assigned to a teacher. Create a teacher account, then come back.</p><Link className="btn btn-primary" to="/teachers">Go to teachers</Link></div></Card></>;

  return (
    <>
      <PageHeader title={title} description={editing ? undefined : 'Fields marked * are required.'} />
      <form onSubmit={submit} noValidate>
        <Card flush>
          {formError && <div style={{ padding: '16px 20px 0' }}><Alert tone="danger">{formError}</Alert></div>}
          <div className="form-section">
            <h3>Student details</h3><p>Name and contact details.</p>
            <div className="form-grid">
              <FormField label="Student ID" required error={errors.studentId} hint="Must be unique. Letters are stored in capitals."><Input value={form.studentId} onChange={set('studentId')} maxLength={30} autoComplete="off" /></FormField>
              <FormField label="Full name" required error={errors.fullName}><Input value={form.fullName} onChange={set('fullName')} maxLength={120} autoComplete="off" /></FormField>
              <FormField label="Phone" required error={errors.phone}><Input type="tel" value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="off" /></FormField>
              <FormField label="Email" error={errors.email} hint="Optional"><Input type="email" value={form.email} onChange={set('email')} autoComplete="off" /></FormField>
              <FormField label="Date of birth" error={errors.dateOfBirth} hint="Optional"><Input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} max={todayStr()} /></FormField>
              <FormField label="Gender" error={errors.gender} hint="Optional"><Select value={form.gender} onChange={set('gender')} placeholder="Prefer not to say"><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option></Select></FormField>
              <FormField label="Address" error={errors.address} className="span-2" hint="Optional"><Textarea value={form.address} onChange={set('address')} maxLength={300} rows={2} /></FormField>
            </div>
          </div>
          <div className="form-section">
            <h3>Guardian</h3><p>Who to contact about this student.</p>
            <div className="form-grid">
              <FormField label="Guardian name" required error={errors.guardianName}><Input value={form.guardianName} onChange={set('guardianName')} maxLength={120} /></FormField>
              <FormField label="Guardian phone" required error={errors.guardianPhone}><Input type="tel" value={form.guardianPhone} onChange={set('guardianPhone')} inputMode="tel" /></FormField>
            </div>
          </div>
          <div className="form-section">
            <h3>Enrolment</h3><p>Course, batch and assigned teacher.</p>
            <div className="form-grid">
              <FormField label="Course" required error={errors.course}><Select value={form.course} onChange={set('course')} placeholder="Select a course">{refs.data.courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</Select></FormField>
              <FormField label="Batch" required error={errors.batch} hint={form.course && !batchOptions.length ? 'This course has no active batch yet.' : undefined}>
                <Select value={form.batch} onChange={set('batch')} disabled={!form.course} placeholder={form.course ? 'Select a batch' : 'Select a course first'}>{batchOptions.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</Select>
              </FormField>
              <FormField label="Assigned teacher" required error={errors.assignedTeacher}><Select value={form.assignedTeacher} onChange={set('assignedTeacher')} placeholder="Select a teacher">{teacherOptions.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}</Select></FormField>
              <FormField label="Admission date" required error={errors.admissionDate}><Input type="date" value={form.admissionDate} onChange={set('admissionDate')} max={todayStr()} /></FormField>
              {editing && <FormField label="Status"><Select value={form.status} onChange={set('status')}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select></FormField>}
            </div>
          </div>
          <div className="overlay-foot" style={{ borderRadius: '0 0 12px 12px' }}>
            <Button onClick={() => navigate(editing ? `/students/${id}` : '/students')} disabled={saving}>Cancel</Button>
            <Button variant="primary" type="submit" loading={saving}>{editing ? 'Save changes' : 'Add student'}</Button>
          </div>
        </Card>
      </form>
    </>
  );
}
