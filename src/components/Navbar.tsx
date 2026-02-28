import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function Navbar() {
    const location = useLocation();
    const [isExecutive, setIsExecutive] = useState(false);

    useEffect(() => {
        const checkExecutiveStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('staff_profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile?.role?.includes('executive')) {
                    setIsExecutive(true);
                }
            }
        };
        checkExecutiveStatus();
    }, []);

    const isProfileActive = location.pathname === '/' || location.pathname === '/dashboard';

    return (
        <nav style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            padding: '1rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%'
        }}>
            <div style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: 'var(--text-main)',
                letterSpacing: '-0.025em'
            }}>
                Phoenix Hub
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <Link
                    to="/"
                    style={{
                        textDecoration: 'none',
                        color: isProfileActive ? 'var(--primary-600)' : 'var(--text-muted)',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        transition: 'color 0.2s ease'
                    }}
                >
                    My Profile
                </Link>
                <Link
                    to="/directory"
                    style={{
                        textDecoration: 'none',
                        color: location.pathname === '/directory' ? 'var(--primary-600)' : 'var(--text-muted)',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        transition: 'color 0.2s ease'
                    }}
                >
                    Directory
                </Link>
                {isExecutive && (
                    <Link
                        to="/admin"
                        style={{
                            textDecoration: 'none',
                            color: location.pathname === '/admin' ? 'var(--primary-600)' : 'var(--text-muted)',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            transition: 'color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        Admin Settings
                    </Link>
                )}
            </div>
        </nav>
    );
}
