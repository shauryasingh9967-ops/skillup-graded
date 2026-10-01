import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import { CardSkeleton } from './components/ui/Feedback';
import Login from './pages/auth/Login';

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Students = lazy(() => import('./pages/students/Students'));
const StudentForm = lazy(() => import('./pages/students/StudentForm'));
const StudentDetail = lazy(() => import('./pages/students/StudentDetail'));
const Attendance = lazy(() => import('./pages/attendance/Attendance'));
const Academic = lazy(() => import('./pages/academic/Academic'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const Teachers = lazy(() => import('./pages/teachers/Teachers'));
const Catalog = lazy(() => import('./pages/catalog/Catalog'));
const { Forbidden, NotFound } = { Forbidden: lazy(() => import('./pages/system/Forbidden')), NotFound: lazy(() => import('./pages/system/NotFound')) };

export default function App() {
  return (
    <Suspense fallback={<div style={{ padding: 32 }}><CardSkeleton height={160} /></div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentDetail />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/academic" element={<Academic />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/forbidden" element={<Forbidden />} />
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="/students/new" element={<StudentForm />} />
              <Route path="/students/:id/edit" element={<StudentForm />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/catalog" element={<Catalog />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
