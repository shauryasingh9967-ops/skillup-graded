import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, GraduationCap, Pencil, Power, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import { catalogService, studentService, teacherService } from '../../services';
import { Card, PageHeader, Avatar } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Select, SearchInput } from '../../components/ui/Form';
import { StatusBadge } from '../../components/ui/Badges';
import { EmptyState } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Overlays';
import DataTable from '../../components/data/DataTable';
import Pagination from '../../components/data/Pagination';

export default function Students() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const debounced = useDebounce(search);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const page = parseInt(params.get('page'), 10) || 1;
  const status = params.get('status') || '';
  const batch = params.get('batch') || '';
  const course = params.get('course') || '';
  const teacher = params.get('teacher') || '';
  const sort = { key: params.get('sort') || 'createdAt', order: params.get('order') || 'desc' };

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => { if (debounced !== (params.get('search') || '')) update({ search: debounced }); /* eslint-disable-next-line */ }, [debounced]);

  const { data: batches } = useAsync(() => catalogService.batches(), []);
  const { data: courses } = useAsync(() => catalogService.courses(), []);
  const { data: teachers } = useAsync(() => teacherService.list({ limit: 100 }), [], { enabled: isAdmin });

  const query = { page, limit: 10, search: params.get('search') || '', status, batch, course, teacher, sort: sort.key, order: sort.order };
  const { data, loading, error, reload } = useAsync(() => studentService.list(query), [page, query.search, status, batch, course, teacher, sort.key, sort.order]);

  const filtersActive = Boolean(query.search || status || batch || course || teacher);
  const clear = () => { setSearch(''); setParams({}, { replace: true }); };
  const onSort = (key) => update({ sort: key, order: sort.key === key && sort.order === 'asc' ? 'desc' : 'asc' });

  const toggle = async () => {
    setBusy(true);
    const next = confirm.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await studentService.setStatus(confirm._id, next);
      toast.success(next === 'ACTIVE' ? `${confirm.fullName} is active again` : `${confirm.fullName} was deactivated`);
      setConfirm(null); reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const columns = useMemo(() => [
    { key: 'name', header: 'Student', sortKey: 'fullName', render: (s) => (
      <div className="cell-person"><Avatar name={s.fullName} /><div><strong><Link to={`/students/${s._id}`}>{s.fullName}</Link></strong><span>{s.email || s.phone}</span></div></div>) },
    { key: 'studentId', header: 'Student ID', sortKey: 'studentId', render: (s) => <span className="num">{s.studentId}</span> },
    { key: 'batch', header: 'Batch', render: (s) => <div><div>{s.batch?.name || '—'}</div><span className="muted" style={{ fontSize: 12.5 }}>{s.course?.name}</span></div> },
    ...(isAdmin ? [{ key: 'teacher', header: 'Teacher', render: (s) => s.assignedTeacher?.name || '—' }] : []),
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', render: (s) => (
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" iconOnly aria-label={`View ${s.fullName}`} onClick={() => navigate(`/students/${s._id}`)}><Eye size={16} /></Button>
        {isAdmin && <Button variant="ghost" size="sm" iconOnly aria-label={`Edit ${s.fullName}`} onClick={() => navigate(`/students/${s._id}/edit`)}><Pencil size={16} /></Button>}
        {isAdmin && <Button variant="ghost" size="sm" iconOnly aria-label={`${s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${s.fullName}`} onClick={() => setConfirm(s)}><Power size={16} /></Button>}
      </div>) },
  ], [isAdmin, navigate]);

  const visibleBatches = (batches?.items || []).filter((b) => !course || b.course?._id === course);

  return (
    <>
      <PageHeader title="Students" description={isAdmin ? undefined : 'Students assigned to you'}
        actions={isAdmin && <Link className="btn btn-primary" to="/students/new"><UserPlus size={17} aria-hidden="true" />Add student</Link>} />
      <Card flush>
        <div className="toolbar" role="search">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, ID, phone or email" label="Search students" />
          <Select aria-label="Filter by status" value={status} onChange={(e) => update({ status: e.target.value })} placeholder="All statuses"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select>
          <Select aria-label="Filter by course" value={course} onChange={(e) => update({ course: e.target.value, batch: '' })} placeholder="All courses">{(courses?.items || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</Select>
          <Select aria-label="Filter by batch" value={batch} onChange={(e) => update({ batch: e.target.value })} placeholder="All batches">{visibleBatches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</Select>
          {isAdmin && <Select aria-label="Filter by teacher" value={teacher} onChange={(e) => update({ teacher: e.target.value })} placeholder="All teachers">{(teachers?.items || []).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}</Select>}
          {filtersActive && <Button variant="ghost" icon={X} onClick={clear}>Clear filters</Button>}
        </div>
        <DataTable caption="Students" columns={columns} rows={data?.items} loading={loading} error={error} onRetry={reload} sort={sort} onSort={onSort}
          empty={filtersActive
            ? <EmptyState icon={GraduationCap} title="No students found" message="No student matches these filters. Try a different search or clear the filters." action={<Button onClick={clear}>Clear filters</Button>} />
            : <EmptyState icon={GraduationCap} title="No students yet" message={isAdmin ? 'Add your first student to get started.' : 'No students are assigned to you yet.'} action={isAdmin && <Link className="btn btn-primary" to="/students/new">Add student</Link>} />} />
        <Pagination pagination={data?.pagination} onPage={(p) => update({ page: String(p) })} noun="students" />
      </Card>
      <ConfirmDialog open={Boolean(confirm)} loading={busy} onCancel={() => setConfirm(null)} onConfirm={toggle}
        tone={confirm?.status === 'ACTIVE' ? 'danger' : 'primary'} confirmLabel={confirm?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        title={confirm?.status === 'ACTIVE' ? 'Deactivate student?' : 'Activate student?'}
        message={confirm?.status === 'ACTIVE' ? `${confirm?.fullName} will be hidden from attendance sheets. Their records are kept and you can activate them again any time.` : `${confirm?.fullName} will appear in attendance sheets again.`} />
    </>
  );
}
