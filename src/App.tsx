import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Directory } from './pages/Directory';
import { AdminSettings } from './pages/AdminSettings';
import { Navbar } from './components/Navbar';
import { Toaster } from 'react-hot-toast';

// Protected layout includes the Navbar and wraps around protected routes
function ProtectedLayout({ session }: { session: Session | null }) {
  if (!session) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Navbar />
      <div style={{ paddingBottom: '3rem' }}>
        <Outlet />
      </div>
    </>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--surface-base)'
      }}>
        <svg style={{ animation: 'logo-spin 1s linear infinite', color: 'var(--primary-600)' }} xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
      </div>
    );
  }

  return (
    <Router>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#363636',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            borderRadius: '8px',
            padding: '16px',
            maxWidth: '500px',
          },
          success: {
            style: {
              borderLeft: '4px solid #22c55e',
            },
          },
          error: {
            style: {
              borderLeft: '4px solid #ef4444',
            },
          },
        }}
      />
      <Routes>
        <Route
          path="/"
          element={session ? <Navigate to="/dashboard" replace /> : <Login />}
        />

        {/* Protected Routes Wrapper */}
        <Route element={<ProtectedLayout session={session} />}>
          <Route path="/dashboard" element={<Dashboard user={session?.user || null} />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/admin" element={<AdminSettings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
