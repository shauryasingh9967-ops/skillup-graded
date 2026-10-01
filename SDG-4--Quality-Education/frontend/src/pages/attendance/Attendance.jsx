import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarCheck2, CheckCheck, Pencil, Save } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import { attendanceService, catalogService } from '../../services';
import { Card, PageHeader, Tabs, TabPanel, Avatar } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { FormField, Input, Select } from '../../components/ui/Form';
import { AttendanceBadge } from '../../components/ui/Badges';
import { Alert, EmptyState, ErrorState, TableSkeleton } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Overlays';
import DataTable from '../../components/data/DataTable';
import Pagination from '../../components/data/Pagination';
import StudentPicker from '../../components/forms/StudentPicker';
import { ATTENDANCE_STATUSES, fmtDate, label, pct, todayStr } from '../../utils/format';

const SHORT = { PRESENT: 'P', ABSENT: 'A', LATE: 'L', LEAVE: 'LV' };

export default function Attendance() {
  const [tab, setTab] = useState('mark');
  const batches = useAsync(() => catalogService.batches({ active: 'true' }), []);
  return (
    <>
      <PageHeader title="Attendance" />
      <Tabs tabs={[{ id: 'mark', label: 'Mark attendance' }, { id: 'history', label: 'History' }]} value={tab} onChange={setTab} />
      {tab === 'mark' ? <TabPanel id="mark"><MarkSheet batches={batches} /></TabPanel> : <TabPanel id="history"><History batches={batches} /></TabPanel>}
    </>
  );
}

function MarkSheet({ batches }) {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const date = params.get('date') || todayStr();
  const list = batches.data?.items || [];
  const batch = params.get('batch') || list[0]?._id || '';
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const setParam = (patch) => { const n = new URLSearchParams(params); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); setParams(n, { replace: true }); };
  const sheet = useAsync(() => attendanceService.sheet({ date, batch }), [date, batch], { enabled: Boolean(batch) });

  useEffect(() => {
    if (!sheet.data) return;
    const m = {};
    sheet.data.students.forEach((s) => { m[s._id] = { status: s.status, remarks: s.remarks || '' }; });
    setMarks(m); setSaveError('');
  }, [sheet.data]);

  const students = sheet.data?.students || [];
  const stats = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0, unmarked: 0 };
    students.forEach((s) => { const st = marks[s._id]?.status; if (st) c[st] += 1; else c.unmarked += 1; });
    return c;
  }, [students, marks]);
  const dirty = students.some((s) => (marks[s._id]?.status || null) !== s.status || (marks[s._id]?.remarks || '') !== (s.remarks || ''));
  const markedCount = students.length - stats.unmarked;

  const setStatus = (id, status) => setMarks((m) => ({ ...m, [id]: { ...m[id], status } }));
  const setRemarks = (id, remarks) => setMarks((m) => ({ ...m, [id]: { ...m[id], remarks } }));
  const markAll = (status) => setMarks((m) => { const n = { ...m }; students.forEach((s) => { n[s._id] = { ...n[s._id], status }; }); return n; });

  const save = async () => {
    setSaving(true); setSaveError('');
    try {
      const records = students.filter((s) => marks[s._id]?.status).map((s) => ({ student: s._id, status: marks[s._id].status, remarks: marks[s._id].remarks.trim() }));
      const res = await attendanceService.bulk({ date, batch, records });
      toast.success(`Attendance saved for ${res.total} student${res.total === 1 ? '' : 's'}`);
      sheet.reload();
    } catch (e) { setSaveError(e.message); toast.error(e.message); } finally { setSaving(false); }
  };

  if (batches.loading && !batches.data) return <Card flush><TableSkeleton rows={6} cols={4} /></Card>;
  if (batches.error) return <Card><ErrorState error={batches.error} onRetry={batches.reload} /></Card>;
  if (!list.length) return <Card><EmptyState icon={CalendarCheck2} title="No batches to mark" message="Attendance is marked per batch. Once students are assigned to you, their batches appear here." /></Card>;

  return (
    <Card flush>
      <div className="toolbar">
        <div style={{ width: 170 }}><FormField label="Date"><Input type="date" value={date} max={todayStr()} onChange={(e) => e.target.value && setParam({ date: e.target.value })} /></FormField></div>
        <div style={{ minWidth: 240 }}><FormField label="Batch"><Select value={batch} onChange={(e) => setParam({ batch: e.target.value })} style={{ width: '100%' }}>{list.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</Select></FormField></div>
        <div className="grow" />
        <Button icon={CheckCheck} onClick={() => markAll('PRESENT')} disabled={!students.length || saving}>Mark all present</Button>
      </div>

      {sheet.loading && !sheet.data ? <TableSkeleton rows={6} cols={4} /> : sheet.error ? <ErrorState error={sheet.error} onRetry={sheet.reload} /> : students.length === 0 ? (
        <EmptyState icon={CalendarCheck2} title="No active students in this batch" message="There is nobody to mark for this batch. Try another batch." />
      ) : (
        <>
          {sheet.data.marked > 0 && <div style={{ padding: '12px 16px 0' }}><Alert icon={Pencil}>Attendance was already saved for {sheet.data.marked} of {students.length} students on {fmtDate(date)}. Changes you save will update those records.</Alert></div>}
          <div className="table-wrap" style={{ opacity: sheet.loading ? 0.6 : 1 }}>
            <table className="table">
              <caption className="sr-only">Attendance for {sheet.data.batch.name} on {date}</caption>
              <thead><tr><th scope="col">Student</th><th scope="col">Student ID</th><th scope="col">Status</th><th scope="col">Remarks</th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s._id}>
                    <td><strong style={{ fontWeight: 500 }}>{s.fullName}</strong></td>
                    <td className="num">{s.studentId}</td>
                    <td>
                      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                        <legend className="sr-only">Attendance status for {s.fullName}</legend>
                        <div className="segmented">
                          {ATTENDANCE_STATUSES.map((st) => (
                            <label key={st}>
                              <input type="radio" name={`att-${s._id}`} value={st} checked={marks[s._id]?.status === st} onChange={() => setStatus(s._id, st)} aria-label={`${label(st)} — ${s.fullName}`} />
                              <span className={`s-${st}`}><span className="seg-text">{label(st)}</span><span className="seg-short" aria-hidden="true">{SHORT[st]}</span></span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </td>
                    <td style={{ minWidth: 200 }}><input className="input input-sm" aria-label={`Remarks for ${s.fullName}`} placeholder="Optional note" maxLength={200} value={marks[s._id]?.remarks || ''} onChange={(e) => setRemarks(s._id, e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="savebar">
            <div className="chips" aria-live="polite">
              <span className="chip">Present {stats.PRESENT}</span><span className="chip">Late {stats.LATE}</span><span className="chip">Absent {stats.ABSENT}</span><span className="chip">Leave {stats.LEAVE}</span>
              {stats.unmarked > 0 && <span className="chip" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', borderColor: '#f6dcae' }}>{stats.unmarked} not marked</span>}
            </div>
            <div className="row">
              {saveError && <span style={{ color: 'var(--danger)', fontSize: 13 }} role="alert">{saveError}</span>}
              <Button variant="primary" icon={Save} onClick={save} loading={saving} disabled={!dirty || markedCount === 0}>Save attendance</Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function History({ batches }) {
  const toast = useToast();
  const [f, setF] = useState({ from: '', to: '', batch: '', status: '', student: null });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const q = { from: f.from, to: f.to, batch: f.batch, status: f.status, student: f.student?._id };
  const list = useAsync(() => attendanceService.list({ ...q, page, limit: 15 }), [f, page]);
  const summary = useAsync(() => attendanceService.summary(q), [f]);
  const set = (patch) => { setF((x) => ({ ...x, ...patch })); setPage(1); };
  const st = summary.data?.stats;
  const badRange = f.from && f.to && f.from > f.to;

  return (
    <Card flush>
      <div className="filter-grid">
        <FormField label="From"><Input type="date" value={f.from} max={todayStr()} onChange={(e) => set({ from: e.target.value })} /></FormField>
        <FormField label="To" error={badRange ? 'End date is before the start date' : undefined}><Input type="date" value={f.to} max={todayStr()} onChange={(e) => set({ to: e.target.value })} /></FormField>
        <FormField label="Batch"><Select value={f.batch} onChange={(e) => set({ batch: e.target.value })} placeholder="All batches">{(batches.data?.items || []).map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</Select></FormField>
        <FormField label="Status"><Select value={f.status} onChange={(e) => set({ status: e.target.value })} placeholder="Any status">{ATTENDANCE_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select></FormField>
        <FormField label="Student"><StudentPicker value={f.student} onChange={(s) => set({ student: s })} /></FormField>
      </div>
      <div className="summary-tiles" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="tile"><span>Attendance rate</span><strong>{pct(st?.percentage)}</strong></div>
        <div className="tile"><span>Present</span><strong>{st?.present ?? '—'}</strong></div>
        <div className="tile"><span>Late</span><strong>{st?.late ?? '—'}</strong></div>
        <div className="tile"><span>Absent</span><strong>{st?.absent ?? '—'}</strong></div>
        <div className="tile"><span>Leave</span><strong>{st?.leave ?? '—'}</strong></div>
      </div>
      {!f.from && !f.to && <div className="muted" style={{ padding: '8px 20px', fontSize: 12.5 }}>Summary covers the last 30 days unless you choose a date range. The list below shows all matching records.</div>}
      <DataTable caption="Attendance records" compact rows={badRange ? [] : list.data?.items} loading={list.loading} error={list.error} onRetry={list.reload}
        empty={<EmptyState icon={CalendarCheck2} title="No attendance records" message="No records match these filters." />}
        columns={[
          { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
          { key: 'student', header: 'Student', render: (r) => <div><strong style={{ fontWeight: 600 }}>{r.student?.fullName}</strong><div className="muted num" style={{ fontSize: 12.5 }}>{r.student?.studentId}</div></div> },
          { key: 'batch', header: 'Batch', render: (r) => r.batch?.name || '—' },
          { key: 'status', header: 'Status', render: (r) => <AttendanceBadge status={r.status} /> },
          { key: 'remarks', header: 'Remarks', render: (r) => r.remarks || <span className="muted">—</span> },
          { key: 'markedBy', header: 'Marked by', render: (r) => r.markedBy?.name || '—' },
          { key: 'edit', header: <span className="sr-only">Edit</span>, align: 'right', render: (r) => <Button variant="ghost" size="sm" iconOnly aria-label={`Edit attendance for ${r.student?.fullName} on ${fmtDate(r.date)}`} onClick={() => setEditing(r)}><Pencil size={15} /></Button> },
        ]} />
      <Pagination pagination={list.data?.pagination} onPage={setPage} noun="records" />
      <EditRecord record={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); toast.success('Attendance updated'); list.reload(); summary.reload(); }} />
    </Card>
  );
}

function EditRecord({ record, onClose, onSaved }) {
  const [status, setStatus] = useState('PRESENT');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (record) { setStatus(record.status); setRemarks(record.remarks || ''); setError(''); } }, [record]);
  const save = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try { await attendanceService.update(record._id, { status, remarks: remarks.trim() }); onSaved(); } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  return (
    <Modal open={Boolean(record)} onClose={onClose} title="Edit attendance" subtitle={record ? `${record.student?.fullName} · ${fmtDate(record.date)}` : ''}
      footer={<><Button onClick={onClose} disabled={saving}>Cancel</Button><Button variant="primary" type="submit" form="edit-att" loading={saving}>Save changes</Button></>}>
      <form id="edit-att" onSubmit={save} className="stack">
        {error && <Alert tone="danger">{error}</Alert>}
        <FormField label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value)}>{ATTENDANCE_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select></FormField>
        <FormField label="Remarks" hint="Optional"><Input value={remarks} maxLength={200} onChange={(e) => setRemarks(e.target.value)} /></FormField>
      </form>
    </Modal>
  );
}
