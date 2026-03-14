import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import OwnerLogin from './pages/Auth/OwnerLogin';
import AdminLogin from './pages/Auth/AdminLogin';
import OwnerRegister from './pages/Auth/OwnerRegister';
import { useAuth } from './context/AuthContext';

import Locations from './pages/Locations';
import LocationDetails from './pages/LocationDetails';
import UserDashboard from './pages/Dashboards/UserDashboard';
import OwnerDashboard from './pages/Dashboards/OwnerDashboard';
import OwnerPortal from './pages/Portals/OwnerPortal';
import AdminPortal from './pages/Portals/AdminPortal';
import AdminBookings from './pages/Admin/AdminBookings';
import AdminProperties from './pages/Admin/AdminProperties';
import CreateAdmin from './pages/Admin/CreateAdmin';
import Profile from './pages/Profile';
import About from './pages/About';
import Contact from './pages/Contact';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, userRole, loading } = useAuth();

  // If we are globally loading and HAVE NO USER, show the spinner.
  // If we HAVE A USER but no role yet, we still show the spinner briefly (handled by internal timeouts in context)
  // BUT if loading is false, we MUST proceed regardless.
  if (loading && !userRole) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0D1117',
        gap: '16px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid #30363D',
          borderTop: '3px solid #00C9C8',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: '#8B949E', fontSize: '13px', fontFamily: 'inherit' }}>Securing your session...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const effectiveRole = userRole || 'user'; // Fallback to 'user' if still null after loading

  if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
    // Redirect based on actual role
    if (effectiveRole === 'admin') return <Navigate to="/admin-portal" replace />;
    if (effectiveRole === 'owner') return <Navigate to="/owner-portal" replace />;
    return <Navigate to="/user-dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/owner-login" element={<OwnerLogin />} />
        <Route path="/owner-register" element={<OwnerRegister />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/create-new-admin" element={<CreateAdmin />} />

        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        {/* Public or Semi-public */}
        <Route path="/locations" element={<Locations type="all" />} />
        <Route path="/parking" element={<Locations type="parking" />} />
        <Route path="/ev-charging" element={<Locations type="ev" />} />
        <Route path="/locations/:id" element={<LocationDetails />} />

        {/* Protected Portals */}
        <Route
          path="/user-dashboard"
          element={
            <ProtectedRoute allowedRoles={['user', 'owner', 'admin']}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner-portal"
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin']}>
              <OwnerPortal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-portal"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPortal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/properties"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminProperties />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={['user', 'owner', 'admin']}>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
