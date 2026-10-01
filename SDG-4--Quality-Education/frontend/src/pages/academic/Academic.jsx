import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Trash2, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import { academicService, catalogService, studentService } from '../../services';
import { Card, Meter, PageHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { FormField, Input, Select, Textarea } from '../../components/ui/Form';
import { GradeBadge } from '../../components/ui/Badges';
import { Alert, EmptyState } from '../../components/ui/Feedback';
import { ConfirmDialog, Modal } from '../../components/ui/Overlays';
import DataTable from '../../components/data/DataTable';
import Pagination from '../../components/data/Pagination';
import StudentPicker from '../../components/forms/StudentPicker';
import { BarsChart, TrendChart } from '../../components/charts/Charts';
import { ASSESSMENT_TYPES, fmtDate, fmtShortDay, label, meterTone, pct, todayStr, toInputDate } from '../../utils/format';

function gradeFor(p) {
  if (p == null) return null;
  return p >= 90 ? 'A+' : p >= 80 ? 'A' : p >= 70 ? 'B+' : p >= 60 ? 'B' : p >= 50 ? 'C' : p >= 40 ? 'D' : 'F';
}

export default function Academic() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const studentId = params.get('student') || '';
  const [student, setStudent] = useState(null);
  const [filters, setFilters] = useState({ subject: '', type: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { record? }
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!studentId) { setStudent(null); return; }
    if (student?._id === studentId) return;
    studentService.get(studentId).then(setStudent).catch(() => { setParams({}, { replace: true }); });
    // eslint-disable-next-line
  }, [studentId]);

  const pick = (s) => { setStudent(s); setPage(1); setParams(s ? { student: s._id } : {}, { replace: true }); };
  const list = useAsync(() => academicService.list({ student: studentId, ...filters, page, limit: 12 }), [studentId, filters, page]);
  const summary = useAsync(() => academicService.studentSummary(studentId), [studentId], { enabled: Boolean(studentId) });
  const courses = useAsync(() => catalogService.courses(), []);
  const subjects = useMemo(() => {
    const c = (courses.data?.items || []).find((x) => x._id === (student?.course?._id || student?.course));
    return c?.subjects || [];
  }, [courses.data, student]);

  const canEdit = (r) => isAdmin || r.teacher?._id === user._id;
  const setF = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const refresh = () => { list.reload(); if (studentId) summary.reload(); };

  const remove = async () => {
    setBusy(true);
    try { await academicService.remove(del._id); toast.success('Assessment deleted'); setDel(null); refresh(); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const columns = [
    { key: 'assessmentDate', header: 'Date', render: (r) => fmtDate(r.assessmentDate) },
    ...(studentId ? [] : [{ key: 'student', header: 'Student', render: (r) => <div><strong style={{ fontWeight: 600 }}>{r.student?.fullName}</strong><div className="muted num" style={{ fontSize: 12.5 }}>{r.student?.studentId}</div></div> }]),
    { key: 'subject', header: 'Subject' },
    { key: 'assessmentName', header: 'Assessment', render: (r) => <div>{r.assessmentName}<div className="muted" style={{ fontSize: 12.5 }}>{label(r.assessmentType)}</div></div> },
    { key: 'marks', header: 'Marks', align: 'right', render: (r) => <span className="num">{r.marksObtained} / {r.maxMarks}</span> },
    { key: 'percentage', header: 'Score', align: 'right', render: (r) => <span className="num">{r.percentage}%</span> },
    { key: 'grade', header: 'Grade', render: (r) => <GradeBadge grade={r.grade} /> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', render: (r) => (
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {canEdit(r) && <Button variant="ghost" size="sm" iconOnly aria-label={`Edit ${r.assessmentName}`} onClick={() => setModal({ record: r })}><Pencil size={15} /></Button>}
        {isAdmin && <Button variant="ghost" size="sm" iconOnly aria-label={`Delete ${r.assessmentName}`} onClick={() => setDel(r)}><Trash2 size={15} /></Button>}
      </div>) },
  ];

  const sum = summary.data;
  return (
    <>
      <PageHeader title="Academic Progress"         actions={<Button variant="primary" icon={Plus} onClick={() => setModal({})}>Add assessment</Button>} />
      <div className="stack" style={{ gap: 20 }}>
        <Card flush>
          <div className="filter-grid">
            <FormField label="Student"><StudentPicker value={student} onChange={pick} placeholder="All students — search to focus on one" /></FormField>
            <FormField label="Subject"><Input value={filters.subject} onChange={(e) => setF({ subject: e.target.value })} list="subject-list" placeholder="Any subject" /></FormField>
            <FormField label="Type"><Select value={filters.type} onChange={(e) => setF({ type: e.target.value })} placeholder="Any type">{ASSESSMENT_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</Select></FormField>
            <FormField label="From"><Input type="date" value={filters.from} onChange={(e) => setF({ from: e.target.value })} /></FormField>
            <FormField label="To"><Input type="date" value={filters.to} onChange={(e) => setF({ to: e.target.value })} /></FormField>
          </div>
          <datalist id="subject-list">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
        </Card>

        {studentId && sum && sum.overall.records > 0 && (
          <div className="grid-3-2">
            <Card title={`${student?.fullName || 'Student'} — summary`} subtitle={`${sum.overall.records} assessments`}>
              <div className="row" style={{ gap: 16, marginBottom: 10 }}><span className="kpi-value" style={{ fontSize: 34 }}>{pct(sum.overall.percentage)}</span><GradeBadge grade={sum.overall.grade} /></div>
              <Meter value={sum.overall.percentage} tone={meterTone(sum.overall.percentage)} />
              <div style={{ marginTop: 18 }}>
                {sum.trend.length >= 3 ? <TrendChart data={sum.trend.map((t) => ({ label: fmtShortDay(t.date), value: t.percentage }))} name="Score" area={false} height={200} /> : <p className="muted">A progress chart appears after three or more assessments.</p>}
              </div>
            </Card>
            <Card title="By subject"><BarsChart data={sum.subjects.map((x) => ({ name: x.subject, value: x.percentage }))} unit="%" max={100} color="#12a072" height={Math.max(160, sum.subjects.length * 40)} /></Card>
          </div>
        )}

        <Card title="Assessment history" flush>
          <DataTable caption="Assessments" rows={list.data?.items} loading={list.loading} error={list.error} onRetry={list.reload} columns={columns}
            empty={<EmptyState icon={TrendingUp} title="No academic records available" message={studentId || filters.subject || filters.type || filters.from ? 'Nothing matches these filters.' : 'Add the first assessment to start tracking progress.'} action={<Button variant="primary" icon={Plus} onClick={() => setModal({})}>Add assessment</Button>} />} />
          <Pagination pagination={list.data?.pagination} onPage={setPage} noun="assessments" />
        </Card>
      </div>

      <AssessmentModal open={Boolean(modal)} record={modal?.record} presetStudent={student} subjectsFor={(c) => (courses.data?.items || []).find((x) => x._id === c)?.subjects || []}
        onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
      <ConfirmDialog open={Boolean(del)} loading={busy} tone="danger" confirmLabel="Delete" title="Delete assessment?" message={del ? `${del.assessmentName} (${del.marksObtained}/${del.maxMarks}) will be permanently removed.` : ''} onCancel={() => setDel(null)} onConfirm={remove} />
    </>
  );
}

const blank = () => ({ subject: '', assessmentName: '', assessmentType: 'QUIZ', marksObtained: '', maxMarks: '100', assessmentDate: todayStr(), remarks: '' });

function AssessmentModal({ open, record, presetStudent, subjectsFor, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(record);
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({}); setFormError('');
    if (record) {
      setStudent({ _id: record.student?._id, fullName: record.student?.fullName, studentId: record.student?.studentId });
      setForm({ subject: record.subject, assessmentName: record.assessmentName, assessmentType: record.assessmentType, marksObtained: String(record.marksObtained), maxMarks: String(record.maxMarks), assessmentDate: toInputDate(record.assessmentDate), remarks: record.remarks || '' });
    } else { setStudent(presetStudent || null); setForm(blank()); }
  }, [open, record, presetStudent]);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined })); };
  const obtained = Number(form.marksObtained); const max = Number(form.maxMarks);
  const valid = form.marksObtained !== '' && max > 0 && obtained >= 0 && obtained <= max;
  const preview = valid ? Math.round((obtained / max) * 10000) / 100 : null;
  const suggestions = subjectsFor(presetStudent?.course?._id || student?.course?._id);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!student) errs.student = 'Select a student';
    if (!form.subject.trim()) errs.subject = 'Enter the subject';
    if (!form.assessmentName.trim()) errs.assessmentName = 'Enter a name for this assessment';
    if (form.maxMarks === '' || !(max > 0)) errs.maxMarks = 'Maximum marks must be greater than 0';
    if (form.marksObtained === '' || Number.isNaN(obtained)) errs.marksObtained = 'Enter the marks obtained';
    else if (obtained < 0) errs.marksObtained = 'Marks cannot be negative';
    else if (max > 0 && obtained > max) errs.marksObtained = 'Marks cannot be more than the maximum';
    if (!form.assessmentDate) errs.assessmentDate = 'Choose the assessment date';
    else if (form.assessmentDate > todayStr()) errs.assessmentDate = 'Date cannot be in the future';
    setErrors(errs); setFormError('');
    if (Object.keys(errs).length) return;
    setSaving(true);
    const body = { subject: form.subject.trim(), assessmentName: form.assessmentName.trim(), assessmentType: form.assessmentType, marksObtained: obtained, maxMarks: max, assessmentDate: form.assessmentDate, remarks: form.remarks.trim() };
    try {
      if (editing) await academicService.update(record._id, body); else await academicService.create({ ...body, student: student._id });
      toast.success(editing ? 'Assessment updated' : 'Assessment saved');
      onSaved();
    } catch (err) { setErrors(err.fieldErrors || {}); setFormError(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} size="wide" title={editing ? 'Edit assessment' : 'Add assessment'} subtitle="Percentage and grade are calculated automatically."
      footer={<><Button onClick={onClose} disabled={saving}>Cancel</Button><Button variant="primary" type="submit" form="assessment-form" loading={saving}>{editing ? 'Save changes' : 'Save assessment'}</Button></>}>
      <form id="assessment-form" onSubmit={submit} noValidate className="stack">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <div className="form-grid">
          <FormField label="Student" required error={errors.student} className="span-2">
            {editing ? <Input value={student ? `${student.fullName} (${student.studentId})` : ''} disabled readOnly /> : <StudentPicker value={student} onChange={setStudent} activeOnly />}
          </FormField>
          <FormField label="Subject" required error={errors.subject}><Input value={form.subject} onChange={set('subject')} list="subject-modal" maxLength={80} /></FormField>
          <datalist id="subject-modal">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
          <FormField label="Type" required><Select value={form.assessmentType} onChange={set('assessmentType')}>{ASSESSMENT_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</Select></FormField>
          <FormField label="Assessment name" required error={errors.assessmentName} className="span-2"><Input value={form.assessmentName} onChange={set('assessmentName')} maxLength={120} placeholder="e.g. Unit test 2" /></FormField>
          <FormField label="Marks obtained" required error={errors.marksObtained}><Input type="number" inputMode="decimal" min="0" step="any" value={form.marksObtained} onChange={set('marksObtained')} /></FormField>
          <FormField label="Maximum marks" required error={errors.maxMarks}><Input type="number" inputMode="decimal" min="1" step="any" value={form.maxMarks} onChange={set('maxMarks')} /></FormField>
          <FormField label="Assessment date" required error={errors.assessmentDate}><Input type="date" value={form.assessmentDate} max={todayStr()} onChange={set('assessmentDate')} /></FormField>
          <div className="field"><label>Result</label><div className="row" style={{ height: 38 }} aria-live="polite">{preview == null ? <span className="muted">Enter marks to see the score</span> : <><strong className="num" style={{ fontSize: 18 }}>{preview}%</strong><GradeBadge grade={gradeFor(preview)} /></>}</div></div>
          <FormField label="Remarks" error={errors.remarks} className="span-2" hint="Optional"><Textarea rows={2} maxLength={300} value={form.remarks} onChange={set('remarks')} /></FormField>
        </div>
      </form>
    </Modal>
  );
}
