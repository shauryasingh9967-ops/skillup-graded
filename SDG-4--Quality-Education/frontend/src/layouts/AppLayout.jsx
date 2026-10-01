import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpenCheck, CalendarCheck2, ChevronDown, GraduationCap, KeyRound, LayoutDashboard, Layers, LogOut, Menu, TrendingUp, Users, FileBarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ChangePasswordModal from '../components/forms/ChangePasswordModal';
import { label } from '../utils/format';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: GraduationCap },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck2 },
  { to: '/academic', label: 'Academic Progress', icon: TrendingUp },
  { to: '/reports', label: 'Reports', icon: FileBarChart2 },
  { to: '/teachers', label: 'Teachers', icon: Users, admin: true },
  { to: '/catalog', label: 'Courses & Batches', icon: Layers, admin: true },
];

const TITLES = { dashboard: 'Dashboard', students: 'Students', attendance: 'Attendance', academic: 'Academic Progress', reports: 'Reports', teachers: 'Teachers', catalog: 'Courses & Batches', new: 'Add student', edit: 'Edit student' };

function useCrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  const first = parts[0] || 'dashboard';
  const isId = (s) => /^[a-f\d]{24}$/i.test(s);
  let current = TITLES[first] || 'Skillup Graded';
  if (first === 'students' && parts[1]) current = parts[1] === 'new' ? 'Add student' : parts[2] === 'edit' ? 'Edit student' : isId(parts[1]) ? 'Student details' : current;
  return { parent: parts.length > 1 ? TITLES[first] : null, parentTo: `/${first}`, current };
}

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const crumbs = useCrumbs();

  useEffect(() => { setOpen(false); setMenu(false); }, [location.pathname]);
  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  useEffect(() => { document.title = `${crumbs.current} | Skillup Graded`; }, [crumbs.current]);

  const signOut = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <div className="shell">
      <a href="#main" className="sr-only">Skip to content</a>
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Primary">
        <div className="brand">
                    <div><strong>Skillup Graded</strong><span>Student management</span></div>
        </div>
        <nav className="nav">
          {NAV.filter((n) => !n.admin || isAdmin).map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <n.icon size={18} aria-hidden="true" />{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            <Avatar name={user.name} />
            <div className="grow" style={{ minWidth: 0 }}><strong className="truncate">{user.name}</strong><span>{label(user.role)}</span></div>
          </div>
          <Button variant="ghost" icon={LogOut} onClick={signOut} style={{ width: '100%', justifyContent: 'flex-start', marginTop: 4 }}>Sign out</Button>
        </div>
      </aside>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />

      <div className="main">
        <header className="topbar">
          <div className="row" style={{ minWidth: 0 }}>
            <Button variant="ghost" iconOnly className="menu-btn" onClick={() => setOpen(true)} aria-label="Open navigation" aria-expanded={open}><Menu size={20} /></Button>
            <div className="crumbs">
              {crumbs.parent && (<><NavLink to={crumbs.parentTo} className="crumb-parent">{crumbs.parent}</NavLink><span className="crumb-parent" aria-hidden="true">/</span></>)}
              <strong className="truncate">{crumbs.current}</strong>
            </div>
          </div>
          <div className="topbar-right">
            <div className="user-menu" ref={menuRef}>
              <button type="button" className="user-trigger" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
                <Avatar name={user.name} />
                <span className="who"><strong>{user.name}</strong><span className="badge badge-info" style={{ height: 18, fontSize: 11 }}>{label(user.role)}</span></span>
                <ChevronDown size={16} aria-hidden="true" className="muted" />
              </button>
              {menu && (
                <div className="menu" role="menu">
                  <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                    <strong style={{ display: 'block' }}>{user.name}</strong><span className="muted" style={{ fontSize: 12.5 }}>{user.email}</span>
                  </div>
                  <button type="button" role="menuitem" onClick={() => { setMenu(false); setPwOpen(true); }}><KeyRound size={16} aria-hidden="true" />Change password</button>
                  <button type="button" role="menuitem" onClick={signOut}><LogOut size={16} aria-hidden="true" />Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="main" className="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}
