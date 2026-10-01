import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/ui/Feedback';

export default function ProtectedRoute({ roles }) {
  const { user, booting } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div style={{ padding: 40, maxWidth: 480 }} aria-busy="true" aria-label="Loading">
        <Skeleton height={20} width="40%" /><div style={{ height: 12 }} /><Skeleton height={14} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
