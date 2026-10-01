import { useMemo, useState } from 'react';
import { Download, FileBarChart2, Printer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import { catalogService, reportService, teacherService } from '../../services';
import { Card, PageHeader, Tabs } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { FormField, Input, Select } from '../../components/ui/Form';
import { EmptyState } from '../../components/ui/Feedback';
import { StatusBadge, GradeBadge } from '../../components/ui/Badges';
import DataTable from '../../components/data/DataTable';
import { fmtDate, label as cap, todayStr } from '../../utils/format';

const TYPES = [{ id: 'students', label: 'Students' }, { id: 'attendance', label: 'Attendance' }, { id: 'academic', label: 'Academic progress' }];
const PCT_KEYS = ['attendance', 'academic', 'percentage'];

export default function Reports() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [type, setType] = useState('attendance');
  const [f, setF] = useState({ from: '', to: '', course: '', batch: '', teacher: '', status: '', subject: '', search: '' });
  const [downloading, setDownloading] = useState(false);
  const search = useDebounce(f.search);
  const subject = useDebounce(f.subject);

  const batches = useAsync(() => catalogService.batches(), []);
  const courses = useAsync(() => catalogService.courses(), []);
  const teachers = useAsync(() => teacherService.list({ limit: 100 }), [], { enabled: isAdmin });

  const badRange = Boolean(f.from && f.to && f.from > f.to);
  const params = { from: f.from, to: f.to, course: f.course, batch: f.batch, teacher: f.teacher, status: type === 'students' ? f.status : '', subject: type === 'academic' ? subject : '', search };
  const report = useAsync(() => reportService.run(type, params), [type, f.from, f.to, f.course, f.batch, f.teacher, f.status, subject, search], { enabled: !badRange });
  const set = (patch) => setF((x) => ({ ...x, ...patch, ...(patch.course !== undefined ? { batch: '' } : {}) }));
  const visibleBatches = (batches.data?.items || []).filter((b) => !f.course || b.course?._id === f.course);

  const r = report.data;
  const columns = useMemo(() => (r ? r.columns.map((c) => ({
    key: c.key, header: c.label, align: c.numeric ? 'right' : undefined,
    render: (row) => {
      const v = row[c.key];
      if (c.key === 'status') return <StatusBadge status={v} />;
      if (c.key === 'grade') return <GradeBadge grade={v} />;
      if (v == null || v === '') return <span className="muted">—</span>;
      if (c.key === 'admissionDate') return fmtDate(v);
      if (PCT_KEYS.includes(c.key)) return <span className="num">{v}%</span>;
      return c.numeric ? <span className="num">{v}</span> : v;
    },
  })) : []), [r]);

  const download = async () => {
    setDownloading(true);
    try { await reportService.downloadCsv(type, params); toast.success('CSV downloaded'); } catch (e) { toast.error(e.message); } finally { setDownloading(false); }
  };
  const active = [f.from && `From ${fmtDate(f.from)}`, f.to && `to ${fmtDate(f.to)}`, f.course && courses.data?.items.find((c) => c._id === f.course)?.name, f.batch && batches.data?.items.find((b) => b._id === f.batch)?.name, f.teacher && teachers.data?.items.find((t) => t._id === f.teacher)?.name, f.status && cap(f.status), subject && `Subject: ${subject}`].filter(Boolean);

  return (
    <>
      <PageHeader title="Reports"         actions={<><Button icon={Download} onClick={download} loading={downloading} disabled={!r || badRange}>Export CSV</Button><Button icon={Printer} onClick={() => window.print()} disabled={!r}>Print</Button></>} />
      <Tabs tabs={TYPES} value={type} onChange={setType} label="Report type" />
      <Card flush>
        <div className="filter-grid no-print">
          <FormField label="From"><Input type="date" value={f.from} max={todayStr()} onChange={(e) => set({ from: e.target.value })} /></FormField>
          <FormField label="To" error={badRange ? 'End date is before the start date' : undefined}><Input type="date" value={f.to} max={todayStr()} onChange={(e) => set({ to: e.target.value })} /></FormField>
          <FormField label="Course"><Select value={f.course} onChange={(e) => set({ course: e.target.value })} placeholder="All courses">{(courses.data?.items || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</Select></FormField>
          <FormField label="Batch"><Select value={f.batch} onChange={(e) => set({ batch: e.target.value })} placeholder="All batches">{visibleBatches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</Select></FormField>
          {isAdmin && <FormField label="Teacher"><Select value={f.teacher} onChange={(e) => set({ teacher: e.target.value })} placeholder="All teachers">{(teachers.data?.items || []).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}</Select></FormField>}
          {type === 'students' && <FormField label="Status"><Select value={f.status} onChange={(e) => set({ status: e.target.value })} placeholder="Any status"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select></FormField>}
          {type === 'academic' && <FormField label="Subject"><Input value={f.subject} onChange={(e) => set({ subject: e.target.value })} placeholder="Any subject" /></FormField>}
          <FormField label="Search student"><Input type="search" value={f.search} onChange={(e) => set({ search: e.target.value })} placeholder="Name or ID" /></FormField>
        </div>

        <div className="print-only" style={{ padding: '0 0 12px' }}>
          <h2 style={{ fontSize: 18 }}>Skillup Graded — {r?.title}</h2>
          <p className="muted">Generated {new Date().toLocaleString('en-IN')}{active.length ? ` · ${active.join(' · ')}` : ''}</p>
        </div>

        {r && (
          <div className="summary-tiles" style={{ borderTop: '1px solid var(--border)' }}>
            {r.summary.map((s) => <div className="tile" key={s.label}><span>{s.label}</span><strong>{s.value}</strong></div>)}
          </div>
        )}
        {r?.truncated && <div className="alert alert-warning" style={{ margin: '12px 20px' }}>Only the first 2,000 students are shown. Narrow the filters to see the rest.</div>}
        <DataTable caption={r?.title || 'Report'} compact rows={badRange ? [] : r?.rows} columns={columns} rowKey="studentId" loading={report.loading} error={report.error} onRetry={report.reload}
          empty={<EmptyState icon={FileBarChart2} title="No data for this report" message="No students match these filters. Adjust the filters or date range." />} />
      </Card>

      {type === 'academic' && r?.subjects?.length > 0 && (
        <Card title="Average score by subject" className="subject-card" flush>
          <DataTable compact rowKey="subject" rows={r.subjects} columns={[
            { key: 'subject', header: 'Subject' }, { key: 'records', header: 'Assessments', align: 'right', render: (x) => <span className="num">{x.records}</span> },
            { key: 'percentage', header: 'Average', align: 'right', render: (x) => <span className="num">{x.percentage == null ? '—' : `${x.percentage}%`}</span> },
          ]} />
        </Card>
      )}
    </>
  );
}
