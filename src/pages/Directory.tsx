import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatPhoneNumber } from '../utils/formatters';
import toast from 'react-hot-toast';

interface StaffProfile {
    id: string;
    role: string[];
    department: string;
    clinic_locations: string[];
    work_phone: string;
    bio: string;
    job_title?: string;
    employee_id?: string;
    preferred_name?: string;
    legal_first_name?: string;
    legal_middle_name?: string;
    legal_last_name?: string;
    display_name?: string;
    work_email?: string;
    practitioner_license_number?: string;
    highest_education?: string;
    profile_photo_url?: string;
    employment_status?: string;
    employment_type?: string;
    fluent_languages?: string[];
}

export interface HRRecord {
    id: string;
    sin: string;
    date_of_birth: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    end_date?: string;
}

interface RolePermission {
    id: string;
    viewer_role: string;
    target_department: string;
    can_view: boolean;
    visible_fields: string[];
}

const DEPARTMENTS = [
    'clinical',
    'executive',
    'finance',
    'hr',
    'it',
    'marketing'
];

export function Directory() {
    const [staff, setStaff] = useState<StaffProfile[]>([]);
    const [currentUserRole, setCurrentUserRole] = useState<string[] | null>(null);
    const [currentUserLocations, setCurrentUserLocations] = useState<string[]>([]);
    const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);

    const [isLoading, setIsLoading] = useState(true);

    // Edit State
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editRole, setEditRole] = useState<string[]>([]);
    const [editDept, setEditDept] = useState<string>('');
    const [editJobTitle, setEditJobTitle] = useState<string>('');
    const [editLocations, setEditLocations] = useState<string[]>([]);
    const [editLicense, setEditLicense] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    // HR File State
    const [viewingHrId, setViewingHrId] = useState<string | null>(null);
    const [hrRecord, setHrRecord] = useState<HRRecord | null>(null);
    const [isHrLoading, setIsHrLoading] = useState(false);
    const [hrError, setHrError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDirectoryAndAuth = async () => {
            setIsLoading(true);

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
                if (currentRole && currentRole.length > 0) {
                    const { data: perms } = await supabase
                        .from('role_permissions')
                        .select('*')
                        .in('viewer_role', currentRole); // Use .in for arrays
                    if (perms) {
                        setRolePermissions(perms as RolePermission[]);
                    }
                }

                // 3. Fetch all staff (filtering location client-side)
                const { data: allStaff, error: staffError } = await supabase.from('staff_profiles').select('*').order('legal_last_name');

                if (staffError) throw staffError;

                if (allStaff) {
                    setStaff(allStaff as StaffProfile[]);
                }
            } catch (err: any) {
                console.error(err);
                toast.error('Failed to load directory. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDirectoryAndAuth();
    }, []);

    const formatDepartment = (dept: string) => {
        if (!dept) return '';
        if (dept.toLowerCase() === 'it') return 'IT';
        return dept.charAt(0).toUpperCase() + dept.slice(1);
    };

    // RBAC Logic directly via RolePermissions table matrix
    const getVisibleStaffAndMasking = () => {
        if (!currentUserRole || currentUserRole.length === 0) return [];

        const isClinicManager = currentUserRole.includes('management');

        return staff.filter(person => {
            if (isClinicManager) {
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
                    work_phone: visibleFields.includes('work_phone') ? person.work_phone : '',
                    bio: visibleFields.includes('bio') ? person.bio : ''
                };
            }
            return person; // Should theoretically not be hit since it's filtered
        });
    };

    const handleEditClick = (person: StaffProfile) => {
        setEditingUserId(person.id);
        setEditRole(person.role || []);
        setEditDept(person.department || '');
        setEditJobTitle(person.job_title || '');
        setEditLocations(person.clinic_locations || []);
        setEditLicense(person.practitioner_license_number || '');
        // Assuming we add editJobTitle later, adding basic job title support
    };

    const handleViewHrFile = async (personId: string) => {
        setViewingHrId(personId);
        setIsHrLoading(true);
        setHrError(null);
        setHrRecord(null);

        try {
            const { data, error } = await supabase
                .from('hr_records')
                .select('*')
                .eq('id', personId)
                .single();

            if (error) throw error;
            if (data) setHrRecord(data as HRRecord);
        } catch (err) {
            console.error(err);
            setHrError('Access denied or HR record not found.');
        } finally {
            setIsHrLoading(false);
        }
    };

    const closeHrModal = () => {
        setViewingHrId(null);
        setHrRecord(null);
        setHrError(null);
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
    };

    const handleSaveRole = async (targetUserId: string) => {
        setIsSaving(true);

        try {
            const { error: updateError } = await supabase
                .from('staff_profiles')
                .update({
                    role: editRole,
                    department: editDept,
                    job_title: editJobTitle,
                    clinic_locations: editLocations,
                    practitioner_license_number: editLicense
                })
                .eq('id', targetUserId);

            if (updateError) throw updateError;

            // Update local state
            setStaff(prevStaff => prevStaff.map(person =>
                person.id === targetUserId
                    ? { ...person, role: editRole, department: editDept, job_title: editJobTitle, clinic_locations: editLocations, practitioner_license_number: editLicense }
                    : person
            ));

            toast.success('Staff profile updated successfully!');
            setEditingUserId(null);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to update staff profile.');
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

    const isExecutive = currentUserRole?.includes('executive') || false;
    const isHrOrExec = currentUserRole?.includes('executive') || currentUserRole?.includes('hr') || currentUserRole?.includes('hr_management');

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
                                            {isExecutive && !isEditing && (
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

                                            <div style={{ marginBottom: '1rem', paddingRight: isExecutive ? '4rem' : '0', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>

                                                {/* Avatar Render */}
                                                <div style={{
                                                    flexShrink: 0,
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'var(--primary-100)',
                                                    color: 'var(--primary-700)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.25rem',
                                                    fontWeight: 'bold',
                                                    overflow: 'hidden',
                                                    border: '2px solid white',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                                }}>
                                                    {person.profile_photo_url ? (
                                                        <img src={person.profile_photo_url} alt={person.display_name || person.preferred_name || person.legal_first_name || 'Staff'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        (person.preferred_name?.charAt(0) || person.legal_first_name?.charAt(0) || '?').toUpperCase()
                                                    )}
                                                </div>

                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{
                                                        fontSize: '1.25rem',
                                                        fontWeight: '600',
                                                        color: 'var(--text-main)',
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        {person.display_name || `${person.preferred_name || person.legal_first_name || ''} ${person.legal_last_name || ''}`.trim() || 'Unknown Staff'}
                                                    </h3>

                                                    {!isEditing ? (
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
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
                                                                {person.job_title || 'Staff'}
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
                                                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600, display: 'block' }}>Display Job Title</label>
                                                                <input
                                                                    type="text"
                                                                    value={editJobTitle}
                                                                    onChange={(e) => setEditJobTitle(e.target.value)}
                                                                    className="input-field"
                                                                    placeholder="e.g. Senior Acupuncturist"
                                                                    style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600, display: 'block' }}>Practitioner License Number</label>
                                                                <input
                                                                    type="text"
                                                                    value={editLicense}
                                                                    onChange={(e) => setEditLicense(e.target.value)}
                                                                    className="input-field"
                                                                    placeholder="e.g. CTCMA12345"
                                                                    style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: 600, display: 'block' }}>System Access Roles</label>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                                    {[
                                                                        { value: 'executive', label: 'Executive' },
                                                                        { value: 'management', label: 'Management' },
                                                                        { value: 'administrative_support', label: 'Admin Support' },
                                                                        { value: 'clinical_provider', label: 'Clinical Provider' },
                                                                        { value: 'hr', label: 'HR' }
                                                                    ].map(role => (
                                                                        <label key={role.value} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={editRole.includes(role.value)}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) {
                                                                                        setEditRole([...editRole, role.value]);
                                                                                    } else {
                                                                                        setEditRole(editRole.filter(r => r !== role.value));
                                                                                    }
                                                                                }}
                                                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                                            />
                                                                            {role.label}
                                                                        </label>
                                                                    ))}
                                                                </div>
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

                                                {!isEditing && (person.work_phone || person.bio || person.practitioner_license_number) && (
                                                    <div style={{
                                                        marginTop: 'auto',
                                                        paddingTop: '1rem',
                                                        borderTop: '1px solid var(--surface-border)'
                                                    }}>
                                                        {person.practitioner_license_number && (
                                                            <div style={{ marginBottom: (person.work_phone || person.bio || isHrOrExec) ? '0.75rem' : '0' }}>
                                                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.1rem', fontWeight: 600 }}>License Number</div>
                                                                <div style={{
                                                                    color: 'var(--text-main)',
                                                                    fontSize: '0.9rem',
                                                                    fontWeight: 500,
                                                                    fontStyle: 'normal'
                                                                }}>
                                                                    {person.practitioner_license_number}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {person.work_phone && (
                                                            <div style={{ marginBottom: person.bio || isHrOrExec ? '0.75rem' : '0' }}>
                                                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.1rem', fontWeight: 600 }}>Work Phone</div>
                                                                <div style={{
                                                                    color: 'var(--text-main)',
                                                                    fontSize: '0.9rem',
                                                                    fontWeight: 500,
                                                                    fontStyle: 'normal'
                                                                }}>
                                                                    <a href={`tel:${person.work_phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                                                        {formatPhoneNumber(person.work_phone)}
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {person.bio && (
                                                            <div style={{ marginBottom: isHrOrExec ? '0.75rem' : '0' }}>
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
                                                        {isHrOrExec && !isEditing && (
                                                            <div style={{ marginTop: '0.5rem' }}>
                                                                <button
                                                                    onClick={() => handleViewHrFile(person.id)}
                                                                    style={{
                                                                        backgroundColor: '#fce7f3',
                                                                        color: '#be185d',
                                                                        border: '1px solid #fbcfe8',
                                                                        padding: '0.35rem 0.75rem',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s ease',
                                                                        width: '100%',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '0.35rem'
                                                                    }}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                                                    View HR File
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
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

            {/* HR File Modal */}
            {viewingHrId && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                    animation: 'fade-in 0.2s ease-out'
                }} onClick={closeHrModal}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '500px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden',
                        animation: 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} onClick={(e) => e.stopPropagation()}>

                        <div style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid var(--surface-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#fdf2f8'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    backgroundColor: '#fbcfe8',
                                    padding: '0.5rem',
                                    borderRadius: '8px',
                                    color: '#be185d'
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#831843', margin: 0 }}>HR Confidential File</h2>
                                    <p style={{ fontSize: '0.85rem', color: '#be185d', margin: 0, opacity: 0.8 }}>Strictly Internal Access</p>
                                </div>
                            </div>
                            <button
                                onClick={closeHrModal}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    padding: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    transition: 'background-color 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
                                    e.currentTarget.style.color = '#4b5563';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = '#9ca3af';
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div style={{ padding: '2rem' }}>
                            {isHrLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem' }}>
                                    <svg style={{ animation: 'logo-spin 1s linear infinite', color: '#be185d' }} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Securely fetching records...</p>
                                </div>
                            ) : hrError ? (
                                <div style={{
                                    backgroundColor: '#fef2f2',
                                    color: '#ef4444',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    gap: '0.75rem',
                                    alignItems: 'center'
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                    <span>{hrError}</span>
                                </div>
                            ) : hrRecord ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600 }}>Date of Birth</div>
                                            <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                                                {hrRecord.date_of_birth ? new Date(hrRecord.date_of_birth).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600 }}>Social Insurance Number</div>
                                            <div style={{ color: 'var(--text-main)', fontWeight: 500, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                                                {hrRecord.sin || 'N/A'}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        borderTop: '1px solid var(--surface-border)',
                                        paddingTop: '1.25rem'
                                    }}>
                                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>Emergency Contact</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600 }}>Contact Name</div>
                                                <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                                                    {hrRecord.emergency_contact_name || 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600 }}>Phone Number</div>
                                                <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                                                    {hrRecord.emergency_contact_phone ? formatPhoneNumber(hrRecord.emergency_contact_phone) : 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {hrRecord.end_date && (
                                        <div style={{
                                            borderTop: '1px solid var(--surface-border)',
                                            paddingTop: '1.25rem'
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#be185d', marginBottom: '0.25rem', fontWeight: 600 }}>Termination / End Date</div>
                                                    <div style={{ color: '#ef4444', fontWeight: 600 }}>
                                                        {new Date(hrRecord.end_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ marginTop: '0.5rem' }}>
                                        <button
                                            onClick={closeHrModal}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                backgroundColor: '#f1f5f9',
                                                color: '#475569',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s ease'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                        >
                                            Done
                                        </button>
                                    </div>

                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Add these to global CSS or index.css for modal animations if not already present
// @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
// @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
