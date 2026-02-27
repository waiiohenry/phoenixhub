import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatPhoneNumber } from '../utils/formatters';

interface StaffProfile {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    department: string;
    clinic_locations: string[];
    phone_number: string;
    bio: string;
}

interface RolePermission {
    id: string;
    viewer_role: string;
    target_department: string;
    can_view: boolean;
    visible_fields: string[];
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

export function Directory() {
    const [staff, setStaff] = useState<StaffProfile[]>([]);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [currentUserLocations, setCurrentUserLocations] = useState<string[]>([]);
    const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit State
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editRole, setEditRole] = useState<string>('');
    const [editDept, setEditDept] = useState<string>('');
    const [editLocations, setEditLocations] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchDirectoryAndAuth = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // 1. Get current user's profile info
                let currentRole = null;

                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('staff_profiles')
                        .select('department, role, clinic_locations')
                        .eq('id', user.id)
                        .single();

                    if (profile) {
                        setCurrentUserRole(profile.role);
                        setCurrentUserLocations(profile.clinic_locations || []);
                        currentRole = profile.role;
                    }
                }

                // 2. Fetch role permissions for this specific role
                if (currentRole) {
                    const { data: perms } = await supabase
                        .from('role_permissions')
                        .select('*')
                        .eq('viewer_role', currentRole);
                    if (perms) {
                        setRolePermissions(perms as RolePermission[]);
                    }
                }

                // 3. Fetch all staff (filtering location client-side)
                const { data: allStaff, error: staffError } = await supabase.from('staff_profiles').select('*').order('role');

                if (staffError) throw staffError;

                if (allStaff) {
                    setStaff(allStaff as StaffProfile[]);
                }
            } catch (err: any) {
                console.error(err);
                setError('Failed to load directory. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDirectoryAndAuth();
    }, []);

    const formatRole = (role: string) => {
        if (!role) return '';
        if (role.toLowerCase() === 'rmt') return 'RMT';
        if (role.toLowerCase() === 'tcm') return 'TCM';
        if (role.toLowerCase() === 'it') return 'IT';
        if (role.toLowerCase() === 'front_desk') return 'Front Desk';
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const formatDepartment = (dept: string) => {
        if (!dept) return '';
        if (dept.toLowerCase() === 'it') return 'IT';
        return dept.charAt(0).toUpperCase() + dept.slice(1);
    };

    // RBAC Logic directly via RolePermissions table matrix
    const getVisibleStaffAndMasking = () => {
        if (!currentUserRole) return [];

        return staff.filter(person => {
            if (currentUserRole === 'clinic_manager') {
                if (!currentUserLocations.includes('Headquarter')) {
                    const targetLocations = person.clinic_locations || [];
                    const hasIntersection = targetLocations.some(loc => currentUserLocations.includes(loc));
                    if (!hasIntersection) return false;
                }
            }

            const personDept = person.department?.toLowerCase();
            const rule = rolePermissions.find(p => p.target_department === personDept);
            return rule && rule.can_view;
        }).map(person => {
            const rule = rolePermissions.find(p => p.target_department === person.department?.toLowerCase());

            if (rule) {
                const visibleFields = rule.visible_fields || [];
                return {
                    ...person,
                    phone_number: visibleFields.includes('phone_number') ? person.phone_number : '',
                    bio: visibleFields.includes('bio') ? person.bio : ''
                };
            }
            return person; // Should theoretically not be hit since it's filtered
        });
    };

    const handleEditClick = (person: StaffProfile) => {
        setEditingUserId(person.id);
        setEditRole(person.role || '');
        setEditDept(person.department || '');
        setEditLocations(person.clinic_locations || []);
        setSuccessMessage(null);
        setError(null);
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
    };

    const handleSaveRole = async (targetUserId: string) => {
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const { error: updateError } = await supabase
                .from('staff_profiles')
                .update({
                    role: editRole,
                    department: editDept,
                    clinic_locations: editLocations
                })
                .eq('id', targetUserId);

            if (updateError) throw updateError;

            // Update local state
            setStaff(prevStaff => prevStaff.map(person =>
                person.id === targetUserId
                    ? { ...person, role: editRole, department: editDept, clinic_locations: editLocations }
                    : person
            ));

            setSuccessMessage('Staff profile updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
            setEditingUserId(null);
        } catch (err: any) {
            console.error(err);
            setError('Failed to update staff profile.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{
                minHeight: 'calc(100vh - 64px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
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
                    <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Loading directory...</p>
                </div>
            </div>
        );
    }

    const visibleStaff = getVisibleStaffAndMasking();

    // Group by department
    const groupedStaff = visibleStaff.reduce((acc, person) => {
        const dept = person.department || 'Unassigned';
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(person);
        return acc;
    }, {} as Record<string, StaffProfile[]>);

    // Sort departments alphabetically, but push 'Unassigned' to the end
    const departments = Object.keys(groupedStaff).sort((a, b) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
    });

    const isDirector = currentUserRole === 'director';

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: 'var(--text-main)',
                marginBottom: '1rem',
                letterSpacing: '-0.025em'
            }}>
                Staff Directory
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1.05rem' }}>
                Connect with our team of professionals.
            </p>

            {successMessage && (
                <div style={{
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    border: '1px solid #86efac',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    fontSize: '0.95rem',
                    textAlign: 'center'
                }}>
                    {successMessage}
                </div>
            )}

            {error && (
                <div style={{
                    backgroundColor: 'var(--error-bg)',
                    color: 'var(--error-text)',
                    border: '1px solid var(--error-border)',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                }}>
                    {error}
                </div>
            )}

            {visibleStaff.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    {departments.map(dept => (
                        <div key={dept}>
                            <h2 style={{
                                fontSize: '1.5rem',
                                color: 'var(--text-main)',
                                borderBottom: '2px solid var(--surface-border)',
                                paddingBottom: '0.5rem',
                                marginBottom: '1.5rem',
                                fontWeight: '600'
                            }}>
                                {formatDepartment(dept)} Team
                            </h2>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: '1.5rem'
                            }}>
                                {groupedStaff[dept].map((person) => {
                                    const isEditing = editingUserId === person.id;

                                    return (
                                        <div key={person.id} className="glass-panel" style={{
                                            padding: '1.5rem',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            transition: 'transform 0.2s ease',
                                            position: 'relative',
                                        }}>
                                            {isDirector && !isEditing && (
                                                <button
                                                    onClick={() => handleEditClick(person)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '1rem',
                                                        right: '1rem',
                                                        backgroundColor: 'transparent',
                                                        border: '1px solid var(--primary-600)',
                                                        color: 'var(--primary-600)',
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'var(--primary-600)';
                                                        e.currentTarget.style.color = '#ffffff';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                        e.currentTarget.style.color = 'var(--primary-600)';
                                                    }}
                                                >
                                                    Edit Role
                                                </button>
                                            )}

                                            <div style={{ marginBottom: '1rem', paddingRight: isDirector ? '4rem' : '0' }}>
                                                <h3 style={{
                                                    fontSize: '1.25rem',
                                                    fontWeight: '600',
                                                    color: 'var(--text-main)',
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    {person.first_name} {person.last_name}
                                                </h3>

                                                {!isEditing ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            backgroundColor: '#f1f5f9',
                                                            color: '#475569',
                                                            padding: '0.25rem 0.6rem',
                                                            borderRadius: '9999px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em'
                                                        }}>
                                                            {person.role ? formatRole(person.role) : 'Staff'}
                                                        </span>
                                                        {person.clinic_locations && person.clinic_locations.map(loc => (
                                                            <span key={loc} style={{
                                                                display: 'inline-block',
                                                                backgroundColor: '#f3f4f6',
                                                                color: '#374151',
                                                                padding: '0.25rem 0.6rem',
                                                                borderRadius: '9999px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                            }}>
                                                                {loc}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600, display: 'block' }}>Role</label>
                                                            <select
                                                                className="input-field"
                                                                value={editRole}
                                                                onChange={(e) => setEditRole(e.target.value)}
                                                                style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                                                            >
                                                                <option value="">Select Role</option>
                                                                {ROLES.map(r => (
                                                                    <option key={r} value={r}>{formatRole(r)}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600, display: 'block' }}>Department</label>
                                                            <select
                                                                className="input-field"
                                                                value={editDept}
                                                                onChange={(e) => setEditDept(e.target.value)}
                                                                style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                                                            >
                                                                <option value="">Select Department</option>
                                                                {DEPARTMENTS.map(d => (
                                                                    <option key={d} value={d}>{formatDepartment(d)}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: 600, display: 'block' }}>Locations</label>
                                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                                {['Headquarter', 'Burnaby', 'Richmond'].map(loc => (
                                                                    <label key={loc} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={editLocations.includes(loc)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setEditLocations([...editLocations, loc]);
                                                                                } else {
                                                                                    setEditLocations(editLocations.filter(l => l !== loc));
                                                                                }
                                                                            }}
                                                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                                        />
                                                                        {loc}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                            <button
                                                                onClick={() => handleSaveRole(person.id)}
                                                                disabled={isSaving}
                                                                style={{
                                                                    flex: 1,
                                                                    backgroundColor: 'var(--primary-600)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    padding: '0.5rem',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.875rem',
                                                                    fontWeight: 600,
                                                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                                                    opacity: isSaving ? 0.7 : 1
                                                                }}
                                                            >
                                                                {isSaving ? 'Saving...' : 'Save'}
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                disabled={isSaving}
                                                                style={{
                                                                    flex: 1,
                                                                    backgroundColor: '#f1f5f9',
                                                                    color: '#475569',
                                                                    border: 'none',
                                                                    padding: '0.5rem',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.875rem',
                                                                    fontWeight: 600,
                                                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {!isEditing && (person.phone_number || person.bio) && (
                                                <div style={{
                                                    marginTop: 'auto',
                                                    paddingTop: '1rem',
                                                    borderTop: '1px solid var(--surface-border)'
                                                }}>
                                                    {person.phone_number && (
                                                        <div style={{ marginBottom: person.bio ? '0.75rem' : '0' }}>
                                                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.1rem', fontWeight: 600 }}>Phone Number</div>
                                                            <div style={{
                                                                color: 'var(--text-main)',
                                                                fontSize: '0.9rem',
                                                                fontWeight: 500,
                                                                fontStyle: 'normal'
                                                            }}>
                                                                <a href={`tel:${person.phone_number}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                                                    {formatPhoneNumber(person.phone_number)}
                                                                </a>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {person.bio && (
                                                        <div>
                                                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.1rem', fontWeight: 600 }}>Bio</div>
                                                            <div style={{
                                                                color: 'var(--text-main)',
                                                                fontSize: '0.9rem',
                                                                lineHeight: 1.5,
                                                                fontStyle: 'normal'
                                                            }}>
                                                                {person.bio}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                !isLoading && (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        color: 'var(--text-muted)'
                    }}>
                        No staff members available for viewing.
                    </div>
                )
            )}
        </div>
    );
}
