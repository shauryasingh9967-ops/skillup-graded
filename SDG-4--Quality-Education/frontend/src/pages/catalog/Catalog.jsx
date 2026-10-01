import { useEffect, useState } from 'react';
import { BookOpen, Layers, Pencil, Plus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import { catalogService } from '../../services';
import { Card, PageHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { FormField, Input, Select, Textarea } from '../../components/ui/Form';
import { Badge, StatusBadge } from '../../components/ui/Badges';
import { Alert, EmptyState } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Overlays';
import DataTable from '../../components/data/DataTable';

export default function Catalog() {
  const courses = useAsync(() => catalogService.courses(), []);
  const batches = useAsync(() => catalogService.batches(), []);
  const [courseModal, setCourseModal] = useState(null);
  const [batchModal, setBatchModal] = useState(null);

  return (
    <>
      <PageHeader title="Courses & Batches" description="Each batch belongs to one course." />
      <div className="stack" style={{ gap: 20 }}>
        <Card title="Courses" actions={<Button icon={Plus} size="sm" onClick={() => setCourseModal({})}>Add course</Button>} flush>
          <DataTable caption="Courses" compact rows={courses.data?.items} loading={courses.loading} error={courses.error} onRetry={courses.reload}
            empty={<EmptyState icon={BookOpen} title="No courses yet" message="Add a course before creating batches and students." action={<Button variant="primary" onClick={() => setCourseModal({})}>Add course</Button>} />}
            columns={[
              { key: 'name', header: 'Course', render: (c) => <div><strong style={{ fontWeight: 600 }}>{c.name}</strong><div className="muted num" style={{ fontSize: 12.5 }}>{c.code}</div></div> },
              { key: 'subjects', header: 'Subjects', render: (c) => c.subjects.length ? <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>{c.subjects.map((s) => <Badge key={s}>{s}</Badge>)}</div> : <span className="muted">None added</span> },
              { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
              { key: 'edit', header: <span className="sr-only">Edit</span>, align: 'right', render: (c) => <Button variant="ghost" size="sm" iconOnly aria-label={`Edit ${c.name}`} onClick={() => setCourseModal({ course: c })}><Pencil size={15} /></Button> },
            ]} />
        </Card>
        <Card title="Batches" actions={<Button icon={Plus} size="sm" onClick={() => setBatchModal({})} disabled={!courses.data?.items?.length}>Add batch</Button>} flush>
          <DataTable caption="Batches" compact rows={batches.data?.items} loading={batches.loading} error={batches.error} onRetry={batches.reload}
            empty={<EmptyState icon={Layers} title="No batches yet" message={courses.data?.items?.length ? 'Create a batch for a course.' : 'Add a course first, then create batches.'} />}
            columns={[
              { key: 'name', header: 'Batch', render: (b) => <div><strong style={{ fontWeight: 600 }}>{b.name}</strong><div className="muted num" style={{ fontSize: 12.5 }}>{b.code}</div></div> },
              { key: 'course', header: 'Course', render: (b) => b.course?.name || '—' },
              { key: 'year', header: 'Academic year', render: (b) => b.academicYear || <span className="muted">—</span> },
              { key: 'students', header: 'Active students', align: 'right', render: (b) => <span className="num">{b.activeStudents}</span> },
              { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
              { key: 'edit', header: <span className="sr-only">Edit</span>, align: 'right', render: (b) => <Button variant="ghost" size="sm" iconOnly aria-label={`Edit ${b.name}`} onClick={() => setBatchModal({ batch: b })}><Pencil size={15} /></Button> },
            ]} />
        </Card>
      </div>
      <CourseModal open={Boolean(courseModal)} course={courseModal?.course} onClose={() => setCourseModal(null)} onSaved={() => { setCourseModal(null); courses.reload(); batches.reload(); }} />
      <BatchModal open={Boolean(batchModal)} batch={batchModal?.batch} courses={courses.data?.items || []} onClose={() => setBatchModal(null)} onSaved={() => { setBatchModal(null); batches.reload(); }} />
    </>
  );
}

function useSaver(onSaved, saveFn, doneMessage) {
  const toast = useToast();
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const run = async (body) => {
    setSaving(true); setFormError('');
    try { await saveFn(body); toast.success(doneMessage); onSaved(); } catch (e) { setErrors(e.fieldErrors || {}); setFormError(e.message); } finally { setSaving(false); }
  };
  return { errors, setErrors, formError, setFormError, saving, run };
}

function CourseModal({ open, course, onClose, onSaved }) {
  const editing = Boolean(course);
  const [f, setF] = useState({ name: '', code: '', subjects: '', isActive: true });
  const s = useSaver(onSaved, (b) => (editing ? catalogService.updateCourse(course._id, b) : catalogService.createCourse(b)), editing ? 'Course updated' : 'Course created');
  useEffect(() => { if (open) { s.setErrors({}); s.setFormError(''); setF(course ? { name: course.name, code: course.code, subjects: course.subjects.join('\n'), isActive: course.isActive } : { name: '', code: '', subjects: '', isActive: true }); } /* eslint-disable-next-line */ }, [open, course]);
  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (f.name.trim().length < 2) errs.name = 'Enter the course name';
    if (f.code.trim().length < 2) errs.code = 'Enter a short course code';
    s.setErrors(errs);
    if (Object.keys(errs).length) return;
    s.run({ name: f.name.trim(), code: f.code.trim(), subjects: f.subjects.split(/[\n,]/).map((x) => x.trim()).filter(Boolean), isActive: f.isActive });
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit course' : 'Add course'}
      footer={<><Button onClick={onClose} disabled={s.saving}>Cancel</Button><Button variant="primary" type="submit" form="course-form" loading={s.saving}>{editing ? 'Save changes' : 'Create course'}</Button></>}>
      <form id="course-form" onSubmit={submit} noValidate className="stack">
        {s.formError && <Alert tone="danger">{s.formError}</Alert>}
        <FormField label="Course name" required error={s.errors.name}><Input value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} /></FormField>
        <FormField label="Course code" required error={s.errors.code} hint="Short and unique, for example FSWD"><Input value={f.code} maxLength={20} onChange={(e) => setF({ ...f, code: e.target.value })} /></FormField>
        <FormField label="Subjects" hint="One per line. These are suggested when recording assessments."><Textarea rows={5} value={f.subjects} onChange={(e) => setF({ ...f, subjects: e.target.value })} /></FormField>
        {editing && <FormField label="Status"><Select value={f.isActive ? 'yes' : 'no'} onChange={(e) => setF({ ...f, isActive: e.target.value === 'yes' })}><option value="yes">Active</option><option value="no">Inactive</option></Select></FormField>}
      </form>
    </Modal>
  );
}

function BatchModal({ open, batch, courses, onClose, onSaved }) {
  const editing = Boolean(batch);
  const [f, setF] = useState({ name: '', code: '', course: '', academicYear: '', isActive: true });
  const s = useSaver(onSaved, (b) => (editing ? catalogService.updateBatch(batch._id, b) : catalogService.createBatch(b)), editing ? 'Batch updated' : 'Batch created');
  useEffect(() => { if (open) { s.setErrors({}); s.setFormError(''); setF(batch ? { name: batch.name, code: batch.code, course: batch.course?._id || '', academicYear: batch.academicYear || '', isActive: batch.isActive } : { name: '', code: '', course: '', academicYear: '', isActive: true }); } /* eslint-disable-next-line */ }, [open, batch]);
  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (f.name.trim().length < 2) errs.name = 'Enter the batch name';
    if (f.code.trim().length < 2) errs.code = 'Enter a short batch code';
    if (!f.course) errs.course = 'Select a course';
    s.setErrors(errs);
    if (Object.keys(errs).length) return;
    s.run({ name: f.name.trim(), code: f.code.trim(), course: f.course, academicYear: f.academicYear.trim() || null, isActive: f.isActive });
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit batch' : 'Add batch'}
      footer={<><Button onClick={onClose} disabled={s.saving}>Cancel</Button><Button variant="primary" type="submit" form="batch-form" loading={s.saving}>{editing ? 'Save changes' : 'Create batch'}</Button></>}>
      <form id="batch-form" onSubmit={submit} noValidate className="stack">
        {s.formError && <Alert tone="danger">{s.formError}</Alert>}
        <FormField label="Batch name" required error={s.errors.name}><Input value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} /></FormField>
        <FormField label="Batch code" required error={s.errors.code} hint="Must be unique"><Input value={f.code} maxLength={20} onChange={(e) => setF({ ...f, code: e.target.value })} /></FormField>
        <FormField label="Course" required error={s.errors.course}><Select value={f.course} onChange={(e) => setF({ ...f, course: e.target.value })} placeholder="Select a course">{courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</Select></FormField>
        <FormField label="Academic year" hint="Optional, for example 2026-27"><Input value={f.academicYear} maxLength={20} onChange={(e) => setF({ ...f, academicYear: e.target.value })} /></FormField>
        {editing && <FormField label="Status"><Select value={f.isActive ? 'yes' : 'no'} onChange={(e) => setF({ ...f, isActive: e.target.value === 'yes' })}><option value="yes">Active</option><option value="no">Inactive</option></Select></FormField>}
      </form>
    </Modal>
  );
}
