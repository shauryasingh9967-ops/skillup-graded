import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarCheck2, CalendarX2, GraduationCap, Percent, TrendingUp, UserPlus, Users, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useAsync from '../../hooks/useAsync';
import { dashboardService } from '../../services';
import { Card, KpiCard, PageHeader, Avatar } from '../../components/ui/Card';
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { StatusBadge } from '../../components/ui/Badges';
import { BarsChart, DonutChart, Legend, STATUS_COLORS, TrendChart } from '../../components/charts/Charts';
import { fmtDate, fmtDateTime, fmtShortDay, pct } from '../../utils/format';

function KpiSkeleton() {
  return <div className="kpi-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card kpi"><Skeleton width={38} height={38} style={{ borderRadius: 10 }} /><div style={{ flex: 1 }}><Skeleton width="60%" /><div style={{ height: 8 }} /><Skeleton width="40%" height={24} /></div></div>)}</div>;
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { data, loading, error, reload } = useAsync(() => dashboardService.get(), []);

  const header = (
    <PageHeader
      title="Dashboard"
      description={data ? fmtDate(data.today) : undefined}
      actions={<><Link className="btn" to="/academic"><TrendingUp size={17} aria-hidden="true" />Add assessment</Link><Link className="btn btn-primary" to="/attendance"><CalendarCheck2 size={17} aria-hidden="true" />Mark attendance</Link></>}
    />
  );

  if (loading && !data) return <>{header}<div className="stack"><KpiSkeleton /><div className="grid-3-2"><div className="card"><CardSkeleton /></div><div className="card"><CardSkeleton /></div></div></div></>;
  if (error && !data) return <>{header}<div className="card"><ErrorState error={error} onRetry={reload} title="Could not load the dashboard" /></div></>;

  const { kpis, todayAttendance: t, trend, batchDistribution, subjectPerformance, recentStudents, activity, attention } = data;
  const trendData = trend.filter((d) => d.percentage != null).map((d) => ({ label: fmtShortDay(d.date), value: d.percentage }));
  const donut = [
    { name: 'Present', value: t.present, color: STATUS_COLORS.PRESENT },
    { name: 'Late', value: t.late, color: STATUS_COLORS.LATE },
    { name: 'Absent', value: t.absent, color: STATUS_COLORS.ABSENT },
    { name: 'Leave', value: t.leave, color: STATUS_COLORS.LEAVE },
  ];
  const noStudents = kpis.totalStudents === 0;

  return (
    <>
      {header}
      <div className="stack" style={{ gap: 20 }}>
        <div className="kpi-grid">
          <KpiCard icon={GraduationCap} label={isAdmin ? 'Total students' : 'Assigned students'} value={kpis.totalStudents} sub={`${kpis.activeStudents} active`} />
          <KpiCard icon={UserCheck} tone="success" label="Active students" value={kpis.activeStudents} sub={kpis.totalStudents ? `${kpis.totalStudents - kpis.activeStudents} inactive` : 'No students yet'} />
          {isAdmin && <KpiCard icon={Users} tone="neutral" label="Active teachers" value={kpis.totalTeachers} />}
          <KpiCard icon={CalendarCheck2} tone={kpis.attendancePendingToday ? 'warning' : 'success'} label="Marked today" value={kpis.attendanceMarkedToday} sub={kpis.attendancePendingToday ? `${kpis.attendancePendingToday} still to mark` : 'Everyone is marked'} />
          <KpiCard icon={Percent} label="Attendance today" value={pct(kpis.attendanceRateToday)} sub={kpis.attendanceRateWeek != null ? `${kpis.attendanceRateWeek}% over 7 days` : 'No records this week'} />
          <KpiCard icon={AlertTriangle} tone={kpis.needsAttention ? 'danger' : 'neutral'} label="Need attention" value={kpis.needsAttention} sub="Low attendance or scores" />
        </div>

        {noStudents && (
          <div className="card"><EmptyState icon={GraduationCap} title={isAdmin ? 'No students yet' : 'No students are assigned to you yet'}
            message={isAdmin ? 'Add your first student to start tracking attendance and progress.' : 'Ask an administrator to assign students to you.'}
            action={isAdmin && <Link className="btn btn-primary" to="/students/new"><UserPlus size={17} aria-hidden="true" />Add student</Link>} /></div>
        )}

        <div className="grid-3-2">
          <Card title="Attendance trend" subtitle="Last 14 days">
            {trendData.length >= 2 ? <TrendChart data={trendData} name="Attendance" /> : <EmptyState icon={CalendarX2} title="Not enough data" message="The chart needs attendance from at least two days." />}
          </Card>
          <Card title="Today's attendance">
            {t.total > 0 ? (
              <>
                <DonutChart data={donut} centerValue={pct(t.percentage)} centerLabel="attended" height={190} />
                <div style={{ height: 8 }} /><Legend items={donut.map((d) => ({ ...d }))} />
              </>
            ) : <EmptyState icon={CalendarX2} title="No attendance marked today" message="Nothing has been marked for today yet." action={<Link className="btn" to="/attendance">Mark attendance</Link>} />}
          </Card>
        </div>

        <div className="grid-2">
          <Card title="Students by batch" subtitle="Active students">
            {batchDistribution.length ? <BarsChart data={batchDistribution.map((b) => ({ name: b.name, value: b.students }))} height={Math.max(180, batchDistribution.length * 38)} /> : <EmptyState title="No batch data" message="Add students to see the distribution." />}
          </Card>
          <Card title="Academic performance" subtitle="Average score by subject">
            {subjectPerformance.length ? <BarsChart data={subjectPerformance.map((s) => ({ name: s.subject, value: s.percentage }))} unit="%" max={100} color="#12a072" height={Math.max(180, subjectPerformance.length * 38)} /> : <EmptyState icon={TrendingUp} title="No assessments recorded" message="Scores will show here once assessments are added." />}
          </Card>
        </div>

        <div className="grid-3-2">
          <Card title="Needs attention" subtitle="Attendance under 75% in the last 30 days, or average score under 40%" flush>
            {attention.length === 0 ? <EmptyState title="No students flagged" message="Nobody is below the attendance or score limits right now." /> : (
              <ul className="list">
                {attention.map((s) => (
                  <li key={s._id}>
                    
                    <div className="body"><strong><Link to={`/students/${s._id}`}>{s.fullName}</Link></strong><span>{s.studentId}{s.batch ? ` · ${s.batch}` : ''}</span></div>
                    <div style={{ textAlign: 'right', fontSize: 12.5 }} className="muted">{s.reasons.map((r) => <div key={r}>{r}</div>)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <div className="stack">
            {isAdmin && (
              <Card title="Quick actions">
                <div className="quick">
                  <Link to="/students/new"><UserPlus size={18} aria-hidden="true" />Add student</Link>
                  <Link to="/attendance"><CalendarCheck2 size={18} aria-hidden="true" />Mark attendance</Link>
                  <Link to="/academic"><TrendingUp size={18} aria-hidden="true" />Add assessment</Link>
                  <Link to="/teachers"><Users size={18} aria-hidden="true" />Manage teachers</Link>
                </div>
              </Card>
            )}
            <Card title="Recent students" flush>
              {recentStudents.length === 0 ? <EmptyState title="No students yet" /> : (
                <ul className="list">
                  {recentStudents.map((s) => (
                    <li key={s._id}><div className="body"><strong><Link to={`/students/${s._id}`}>{s.fullName}</Link></strong><span>{s.studentId}{s.batch ? ` · ${s.batch.name}` : ''}</span></div><StatusBadge status={s.status} /></li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        <Card title="Recent activity" flush>
          {activity.length === 0 ? <EmptyState title="No recent activity" /> : (
            <ul className="list">{activity.map((a, i) => <li key={i}><div className="body"><strong style={{ fontWeight: 500 }}>{a.text}</strong></div><span className="muted num" style={{ fontSize: 12.5 }}>{fmtDateTime(a.at)}</span></li>)}</ul>
          )}
        </Card>
      </div>
    </>
  );
}
