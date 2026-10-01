import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { EmptyState } from '../../components/ui/Feedback';
import { Card } from '../../components/ui/Card';

export default function Forbidden() {
  return <Card><EmptyState icon={ShieldAlert} title="You do not have access to this page" message="This area is limited to administrators. If you think this is a mistake, contact your institute admin." action={<Link className="btn btn-primary" to="/dashboard">Back to dashboard</Link>} /></Card>;
}
