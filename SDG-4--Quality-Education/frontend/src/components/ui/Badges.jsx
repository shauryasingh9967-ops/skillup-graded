import { CheckCircle2, Clock, Minus, XCircle, CircleDot, CircleOff } from 'lucide-react';
import { label } from '../../utils/format';

export function Badge({ tone = 'neutral', icon: Icon, children }) {
  return (
    <span className={`badge ${tone === 'neutral' ? '' : `badge-${tone}`}`}>
      {Icon && <Icon size={13} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const active = status === 'ACTIVE';
  return <Badge tone={active ? 'success' : 'neutral'} icon={active ? CircleDot : CircleOff}>{label(status)}</Badge>;
}

const ATT = {
  PRESENT: { tone: 'success', icon: CheckCircle2, text: 'Present' },
  ABSENT: { tone: 'danger', icon: XCircle, text: 'Absent' },
  LATE: { tone: 'warning', icon: Clock, text: 'Late' },
  LEAVE: { tone: 'neutral', icon: Minus, text: 'Leave' },
};
export const attendanceMeta = ATT;

export function AttendanceBadge({ status }) {
  const m = ATT[status];
  if (!m) return <Badge>—</Badge>;
  return <Badge tone={m.tone} icon={m.icon}>{m.text}</Badge>;
}

export function GradeBadge({ grade }) {
  if (!grade) return <span className="muted">—</span>;
  const tone = grade === 'F' ? 'danger' : grade === 'D' ? 'warning' : grade.startsWith('A') ? 'success' : 'info';
  return <Badge tone={tone}>{grade}</Badge>;
}
