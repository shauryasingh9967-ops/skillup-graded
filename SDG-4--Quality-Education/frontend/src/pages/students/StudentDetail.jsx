import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarCheck2, Pencil, Phone, Plus, Power } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import { academicService, attendanceService, studentService } from '../../services';
import { Avatar, Card, Meter, PageHeader, TabPanel, Tabs } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { AttendanceBadge, GradeBadge, StatusBadge, Badge } from '../../components/ui/Badges';
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Overlays';
import DataTable from '../../components/data/DataTable';
import { BarsChart, ColumnsChart, TrendChart } from '../../components/charts/Charts';
import { fmtDate, fmtMonth, fmtShortDay, label, meterTone, pct } from '../../utils/format';

const TABS = [{ id: 'overview', label: 'Overview' }, { id: 'attendance', label: 'Attendance' }, { id: 'academic', label: 'Academic Progress' }, { id: 'info', label: 'Basic Information' }];

export default function StudentDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const student = useAsync(() => studentService.get(id), [id]);
  const summary = useAsync(() => studentService.summary(id), [id]);
  const s = student.data;

  const toggle = async () => {
    setBusy(true);
    const next = s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try { await studentService.setStatus(id, next); toast.success(next === 'ACTIVE' ? 'Student activated' : 'Student deactivated'); setConfirm(false); student.reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  if (student.error && !s) {
    return <><PageHeader title="Student" /><Card><ErrorState error={student.error} title={student.error.status === 404 ? 'Student not found' : student.error.status === 403 ? 'Not your student' : 'Could not load student'} onRetry={student.error.status >= 500 || !student.error.status ? student.reload : undefined} /></Card></>;
  }
  if (!s) return <><PageHeader title="Student" /><Card><CardSkeleton height={200} /></Card></>;

  return (
    <>
      <div className="page-header">
        <div className="row" style={{ gap: 16 }}>
          <Avatar name={s.fullName} large />
          <div>
            <h1 style={{ fontSize: 22 }}>{s.fullName}</h1>
            <div className="row muted" style={{ flexWrap: 'wrap', marginTop: 4 }}>
              <span className="num">{s.studentId}</span><span aria-hidden="true">·</span><span>{s.batch?.name}</span><StatusBadge status={s.status} />
            </div>
          </div>
        </div>
        <div className="page-actions no-print">
          <Link className="btn" to={`/academic?student=${s._id}`}><Plus size={17} aria-hidden="true" />Add assessment</Link>
          <Link className="btn" to={`/attendance?batch=${s.batch?._id}`}><CalendarCheck2 size={17} aria-hidden="true" />Attendance sheet</Link>
          {isAdmin && <Button icon={Pencil} onClick={() => navigate(`/students/${id}/edit`)}>Edit</Button>}
          {isAdmin && <Button icon={Power} variant={s.status === 'ACTIVE' ? 'secondary' : 'primary'} onClick={() => setConfirm(true)}>{s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</Button>}
        </div>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Student sections" />

      {tab === 'overview' && <TabPanel id="overview"><Overview summary={summary} /></TabPanel>}
      {tab === 'attendance' && <TabPanel id="attendance"><AttendanceTab id={id} /></TabPanel>}
      {tab === 'academic' && <TabPanel id="academic"><AcademicTab id={id} summary={summary} /></TabPanel>}
      {tab === 'info' && <TabPanel id="info"><InfoTab s={s} /></TabPanel>}

      <ConfirmDialog open={confirm} loading={busy} onCancel={() => setConfirm(false)} onConfirm={toggle} tone={s.status === 'ACTIVE' ? 'danger' : 'primary'}
        confirmLabel={s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} title={s.status === 'ACTIVE' ? 'Deactivate student?' : 'Activate student?'}
        message={s.status === 'ACTIVE' ? 'They will no longer appear on attendance sheets. All records are kept.' : 'They will appear on attendance sheets again.'} />
    </>
  );
}

function Stat({ l, value, sub, meter }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="muted" style={{ fontSize: 13 }}>{l}</div>
      <div className="kpi-value" style={{ margin: '4px 0 8px' }}>{value}</div>
      {meter !== undefined && <Meter value={meter} tone={meterTone(meter)} />}
      {sub && <div className="kpi-sub" style={{ marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

function Overview({ summary }) {
  if (summary.loading && !summary.data) return <div className="kpi-grid">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card" style={{ padding: 18 }}><Skeleton width="50%" /><div style={{ height: 12 }} /><Skeleton height={26} width="40%" /></div>)}</div>;
  if (summary.error) return <Card><ErrorState error={summary.error} onRetry={summary.reload} /></Card>;
  const { attendance: a, academic: ac } = summary.data;
  const subjectBars = ac.subjects.map((x) => ({ name: x.subject, value: x.percentage }));
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="kpi-grid">
        <Stat l="Overall attendance" value={pct(a.overall.percentage)} meter={a.overall.percentage} sub={a.overall.total ? `${a.overall.present + a.overall.late} of ${a.overall.total - a.overall.leave} counted days` : 'No attendance recorded'} />
        <Stat l="Last 30 days" value={pct(a.last30Days.percentage)} meter={a.last30Days.percentage} sub={a.last30Days.total ? `${a.last30Days.absent} absent, ${a.last30Days.late} late` : 'No recent records'} />
        <Stat l="Average score" value={pct(ac.overall.percentage)} meter={ac.overall.percentage} sub={ac.overall.records ? `Grade ${ac.overall.grade} · ${ac.overall.records} assessments` : 'No assessments yet'} />
        <Stat l="Days absent" value={a.overall.absent} sub={`${a.overall.leave} on leave`} />
      </div>
      <div className="grid-2">
        <Card title="Subject-wise performance" subtitle="Average score per subject">
          {subjectBars.length ? <BarsChart data={subjectBars} unit="%" max={100} color="#12a072" height={Math.max(160, subjectBars.length * 40)} /> : <EmptyState title="No academic records available" message="Scores appear here after assessments are added." />}
        </Card>
        <Card title="Attendance, last 30 days" subtitle="Counts by status">
          {a.last30Days.total ? (
            <dl className="dl" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div><dt>Present</dt><dd className="num">{a.last30Days.present}</dd></div><div><dt>Late</dt><dd className="num">{a.last30Days.late}</dd></div>
              <div><dt>Absent</dt><dd className="num">{a.last30Days.absent}</dd></div><div><dt>Leave</dt><dd className="num">{a.last30Days.leave}</dd></div>
            </dl>
          ) : <EmptyState title="No attendance records for this period" />}
        </Card>
      </div>
    </div>
  );
}

function AttendanceTab({ id }) {
  const { data, loading, error, reload } = useAsync(() => attendanceService.studentHistory(id), [id]);
  const [limit, setLimit] = useState(20);
  const monthly = useMemo(() => (data?.monthly || []).map((m) => ({ month: fmtMonth(m.month), Attendance: m.percentage })), [data]);
  if (loading && !data) return <Card><CardSkeleton /></Card>;
  if (error) return <Card><ErrorState error={error} onRetry={reload} /></Card>;
  if (!data.records.length) return <Card><EmptyState icon={CalendarCheck2} title="No attendance records" message="Attendance will appear here once it has been marked for this student." /></Card>;
  const st = data.stats;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <Card>
        <div className="summary-tiles" style={{ border: 0, padding: 0 }}>
          <div className="tile"><span>Attendance</span><strong>{pct(st.percentage)}</strong></div>
          <div className="tile"><span>Present</span><strong>{st.present}</strong></div>
          <div className="tile"><span>Late</span><strong>{st.late}</strong></div>
          <div className="tile"><span>Absent</span><strong>{st.absent}</strong></div>
          <div className="tile"><span>Leave</span><strong>{st.leave}</strong></div>
        </div>
      </Card>
      {monthly.length >= 2 && <Card title="Monthly attendance" subtitle="Percentage per month"><ColumnsChart data={monthly} xKey="month" series={[{ key: 'Attendance', name: 'Attendance', color: '#1f4e79' }]} /></Card>}
      <Card title="Attendance history" flush>
        <DataTable compact caption="Attendance history" rows={data.records.slice(0, limit)} rowKey="_id" columns={[
          { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
          { key: 'status', header: 'Status', render: (r) => <AttendanceBadge status={r.status} /> },
          { key: 'remarks', header: 'Remarks', render: (r) => r.remarks || <span className="muted">—</span> },
        ]} />
        {data.records.length > limit && <div className="pagination" style={{ justifyContent: 'center' }}><Button size="sm" onClick={() => setLimit((l) => l + 30)}>Show more</Button></div>}
      </Card>
    </div>
  );
}

function AcademicTab({ id, summary }) {
  const history = useAsync(() => academicService.list({ student: id, limit: 100 }), [id]);
  if (summary.loading && !summary.data) return <Card><CardSkeleton /></Card>;
  if (summary.error) return <Card><ErrorState error={summary.error} onRetry={summary.reload} /></Card>;
  const ac = summary.data.academic;
  if (!ac.overall.records) return <Card><EmptyState title="No academic records available" message="Add an assessment to start tracking progress." action={<Link className="btn btn-primary" to={`/academic?student=${id}`}>Add assessment</Link>} /></Card>;
  const trend = ac.trend.map((t) => ({ label: fmtShortDay(t.date), value: t.percentage }));
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="grid-2">
        <Card title="Overall performance">
          <div className="row" style={{ gap: 20 }}><div className="kpi-value" style={{ fontSize: 36 }}>{pct(ac.overall.percentage)}</div><GradeBadge grade={ac.overall.grade} /></div>
          <div style={{ margin: '12px 0 8px' }}><Meter value={ac.overall.percentage} tone={meterTone(ac.overall.percentage)} /></div>
          <span className="muted">{ac.overall.records} assessments recorded</span>
        </Card>
        <Card title="Subject-wise" flush>
          <DataTable compact rows={ac.subjects} rowKey="subject" columns={[
            { key: 'subject', header: 'Subject' }, { key: 'records', header: 'Assessments', align: 'right', render: (r) => <span className="num">{r.records}</span> },
            { key: 'percentage', header: 'Average', align: 'right', render: (r) => <span className="num">{pct(r.percentage)}</span> }, { key: 'grade', header: 'Grade', render: (r) => <GradeBadge grade={r.grade} /> },
          ]} />
        </Card>
      </div>
      {trend.length >= 3 ? <Card title="Progress over time"><TrendChart data={trend} name="Score" area={false} /></Card> : null}
      <Card title="Assessment history" flush>
        <DataTable caption="Assessment history" rows={history.data?.items} loading={history.loading} error={history.error} onRetry={history.reload} columns={[
          { key: 'assessmentDate', header: 'Date', render: (r) => fmtDate(r.assessmentDate) },
          { key: 'subject', header: 'Subject' },
          { key: 'assessmentName', header: 'Assessment', render: (r) => <div>{r.assessmentName}<div className="muted" style={{ fontSize: 12.5 }}>{label(r.assessmentType)}</div></div> },
          { key: 'marks', header: 'Marks', align: 'right', render: (r) => <span className="num">{r.marksObtained} / {r.maxMarks}</span> },
          { key: 'percentage', header: 'Score', align: 'right', render: (r) => <span className="num">{r.percentage}%</span> },
          { key: 'grade', header: 'Grade', render: (r) => <GradeBadge grade={r.grade} /> },
          { key: 'teacher', header: 'Recorded by', render: (r) => r.teacher?.name || '—' },
        ]} />
      </Card>
    </div>
  );
}

function InfoTab({ s }) {
  const rows = [
    ['Student ID', s.studentId], ['Full name', s.fullName], ['Phone', s.phone], ['Email', s.email || '—'], ['Date of birth', fmtDate(s.dateOfBirth)], ['Gender', label(s.gender) || '—'],
    ['Guardian', s.guardianName], ['Guardian phone', s.guardianPhone], ['Course', s.course?.name || '—'], ['Batch', s.batch?.name || '—'],
    ['Assigned teacher', s.assignedTeacher?.name || '—'], ['Admission date', fmtDate(s.admissionDate)], ['Record created', fmtDate(s.createdAt)], ['Last updated', fmtDate(s.updatedAt)],
  ];
  return (
    <Card title="Basic information">
      <dl className="dl">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}<div className="span-2" style={{ gridColumn: '1 / -1' }}><dt>Address</dt><dd>{s.address || '—'}</dd></div></dl>
      <div style={{ marginTop: 16 }}><Badge icon={Phone}>Guardian contact: {s.guardianPhone}</Badge></div>
    </Card>
  );
}
