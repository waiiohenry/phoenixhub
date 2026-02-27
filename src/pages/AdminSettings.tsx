import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Navigate } from 'react-router-dom';

interface RolePermission {
    id?: string;
    viewer_role: string;
    target_department: string;
    can_view: boolean;
    visible_fields: string[];
    created_at?: string;
}

const ROLES = [
    'acupuncturist',
    'admin',
    'chiropractor',
    'clinic_manager',
    'director',
    'kinesiologist',
    'naturopath',
    'office_manager',
    'physiotherapist',
    'front_desk',
    'rmt',
    'tcm'
];

const DEPARTMENTS = [
    'clinical',
    'executive',
    'finance',
    'it',
    'marketing'
];

export function AdminSettings() {
    const [isDirector, setIsDirector] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [permissions, setPermissions] = useState<RolePermission[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>('rmt');

    useEffect(() => {
        const verifyAndLoadData = async () => {
            setIsLoading(true);
            try {
                // Verify Director
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setIsDirector(false);
                    return;
                }

                const { data: profile } = await supabase
                    .from('staff_profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile?.role !== 'director') {
                    setIsDirector(false);
                    return;
                }

                setIsDirector(true);

                // Load Permissions
                await fetchPermissions();
            } catch (err) {
                console.error(err);
                setError("Failed to load settings.");
            } finally {
                setIsLoading(false);
            }
        };

        verifyAndLoadData();
    }, []);

    const fetchPermissions = async () => {
        const { data, error } = await supabase
            .from('role_permissions')
            .select('*')
            .order('viewer_role')
            .order('target_department');

        if (error) throw error;
        setPermissions(data as RolePermission[]);
    };

    const formatLabel = (str: string) => {
        if (!str) return '';
        if (str.toLowerCase() === 'rmt') return 'RMT';
        if (str.toLowerCase() === 'tcm') return 'TCM';
        if (str.toLowerCase() === 'it') return 'IT';
        return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const handleToggle = async (dept: string, field: 'can_view' | 'phone_number' | 'bio', currentValue: boolean) => {
        setError(null);
        setSuccessMessage(null);
        try {
            const existingRule = permissions.find(p => p.viewer_role === selectedRole && p.target_department === dept);

            let newCanView = existingRule ? existingRule.can_view : false;
            let newVisibleFields = existingRule?.visible_fields || [];

            if (field === 'can_view') {
                newCanView = !currentValue;
            } else {
                if (!currentValue) {
                    newVisibleFields = [...newVisibleFields, field];
                } else {
                    newVisibleFields = newVisibleFields.filter(f => f !== field);
                }
            }

            const rowObject = {
                viewer_role: selectedRole,
                target_department: dept,
                can_view: newCanView,
                visible_fields: newVisibleFields
            };

            const { error: upsertError } = await supabase
                .from('role_permissions')
                .upsert(rowObject, { onConflict: 'viewer_role, target_department' });

            if (upsertError) {
                console.error("Supabase error during upsert:", upsertError);
                throw upsertError;
            }

            await fetchPermissions();
            setSuccessMessage(`Updated matrix successfully.`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error("Detailed catch error:", err);
            setError(`Failed to update visibility matrix: ${err.message || 'Unknown error'}`);
        }
    };

    if (isLoading) return <LoadingSpinner />;
    if (isDirector === false) return <Navigate to="/dashboard" replace />;

    const currentRolePermissions = permissions.filter(p => p.viewer_role === selectedRole);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1rem', letterSpacing: '-0.025em' }}>
                Admin Settings
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1.05rem' }}>
                Manage role-based access control and system configurations.
            </p>

            {error && (
                <div style={{ backgroundColor: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-border)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    {error}
                </div>
            )}
            {successMessage && (
                <div style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    {successMessage}
                </div>
            )}

            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Visibility Matrix</h2>

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        Configure Matrix For Role
                    </label>
                    <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="input-field"
                        style={{ maxWidth: '300px', cursor: 'pointer' }}
                    >
                        {ROLES.map(r => (
                            <option key={r} value={r}>{formatLabel(r)}</option>
                        ))}
                    </select>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--surface-border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: '600' }}>Target Department</th>
                                <th style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: '600' }}>Can See Department?</th>
                                <th style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: '600' }}>Can See Phone Number?</th>
                                <th style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: '600' }}>Can See Bio?</th>
                            </tr>
                        </thead>
                        <tbody>
                            {DEPARTMENTS.map(dept => {
                                const permRule = currentRolePermissions.find(p => p.target_department === dept);
                                const isVisible = permRule?.can_view || false;

                                return (
                                    <tr key={dept} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-main)' }}>
                                            {formatLabel(dept)}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={isVisible}
                                                onChange={() => handleToggle(dept, 'can_view', isVisible)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={permRule?.visible_fields?.includes('phone_number') || false}
                                                disabled={!isVisible}
                                                onChange={() => handleToggle(dept, 'phone_number', permRule?.visible_fields?.includes('phone_number') || false)}
                                                style={{ width: '18px', height: '18px', cursor: isVisible ? 'pointer' : 'not-allowed', opacity: isVisible ? 1 : 0.5 }}
                                            />
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={permRule?.visible_fields?.includes('bio') || false}
                                                disabled={!isVisible}
                                                onChange={() => handleToggle(dept, 'bio', permRule?.visible_fields?.includes('bio') || false)}
                                                style={{ width: '18px', height: '18px', cursor: isVisible ? 'pointer' : 'not-allowed', opacity: isVisible ? 1 : 0.5 }}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function LoadingSpinner() {
    return (
        <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <svg style={{ animation: 'logo-spin 1s linear infinite', color: 'var(--primary-600)' }} xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
                <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Loading settings...</p>
            </div>
        </div>
    );
}
