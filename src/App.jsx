import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import About from './pages/About';
import Contact from './pages/Contact';
import OwnerDetails from './pages/OwnerDetails';
import AdminOwnerProfile from './pages/AdminOwnerProfile';



const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, userRole, loading } = useAuth();

  // Wait for session to load before making any redirect decision
  if (loading) {
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
        <p style={{ color: '#8B949E', fontSize: '13px', fontFamily: 'inherit' }}>Restoring session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
  const location = useLocation();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/owner/login" element={<OwnerLogin />} />
        <Route path="/owner-register" element={<OwnerRegister />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/create-new-admin" element={<CreateAdmin />} />

        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        {/* Public or Semi-public */}
        <Route path="/locations" element={<Locations key={location.pathname} type="all" />} />
        <Route path="/parking" element={<Locations key={location.pathname} type="parking" />} />
        <Route path="/ev-charging" element={<Locations key={location.pathname} type="ev" />} />
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
              <Navigate to="/owner/profile" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/profile"
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin']}>
              <OwnerDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/owner/:ownerId"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminOwnerProfile />
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
