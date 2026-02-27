import { useState } from 'react';
import { supabase } from '../lib/supabase';
import clinicLogo from '../assets/logo.svg';
import '../index.css';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setError(error.message);
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
        }}>
            <div className="glass-panel animate-fade-in" style={{
                width: '100%',
                maxWidth: '420px',
                padding: '2.5rem',
                borderRadius: '16px',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem',
                    }}>
                        <img
                            src={clinicLogo}
                            alt="Phoenix Clinic Logo"
                            style={{ width: '240px', height: 'auto', objectFit: 'contain' }}
                        />
                    </div>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: 'var(--text-main)',
                        marginBottom: '0.5rem'
                    }}>
                        Phoenix Hub Secure Login
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        Authorized personnel only. Please sign in to access your clinic dashboard.
                    </p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: 'var(--error-bg)',
                        color: 'var(--error-text)',
                        border: '1px solid var(--error-border)',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: 'var(--text-main)',
                            marginBottom: '0.5rem'
                        }}>
                            Email Address
                        </label>
                        <input
                            className="input-field"
                            type="email"
                            placeholder="name@phoenixrehab.ca"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: '0.5rem'
                        }}>
                            <label style={{
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: 'var(--text-main)',
                            }}>
                                Password
                            </label>
                            <a href="#" style={{
                                fontSize: '0.8rem',
                                color: '#475569',
                                textDecoration: 'none',
                                fontWeight: '500'
                            }}>
                                Forgot password?
                            </a>
                        </div>
                        <input
                            className="input-field"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
                        {loading ? (
                            <>
                                <svg style={{ animation: 'logo-spin 1s linear infinite' }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="2" x2="12" y2="6"></line>
                                    <line x1="12" y1="18" x2="12" y2="22"></line>
                                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                    <line x1="2" y1="12" x2="6" y2="12"></line>
                                    <line x1="18" y1="12" x2="22" y2="12"></line>
                                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                                </svg>
                                Authenticating...
                            </>
                        ) : 'Sign In'}
                    </button>
                </form>

                <div style={{
                    marginTop: '2rem',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    color: 'var(--text-light)'
                }}>
                    Secure access for Phoenix Rehab practitioners and administrative staff.
                </div>
            </div>
        </div>
    );
}
