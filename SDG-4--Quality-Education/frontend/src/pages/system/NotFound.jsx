import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../../components/ui/Feedback';
import { Card } from '../../components/ui/Card';

export default function NotFound() {
  return <Card><EmptyState icon={Compass} title="Page not found" message="The page you are looking for does not exist or has been moved." action={<Link className="btn btn-primary" to="/dashboard">Back to dashboard</Link>} /></Card>;
}
