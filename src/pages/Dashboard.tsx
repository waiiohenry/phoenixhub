import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
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

export function Dashboard({ user }: { user: User | null }) {
    const [profileData, setProfileData] = useState<StaffProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Edit mode states
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        work_phone: '',
        work_email: '',
        bio: '',
        preferred_name: '',
        legal_first_name: '',
        legal_middle_name: '',
        legal_last_name: '',
        display_name: '',
        fluent_languages: [] as string[]
    });

    // HR Record State
    const [hrRecord, setHrRecord] = useState<HRRecord | null>(null);
    const [isHrLoading, setIsHrLoading] = useState(false);
    const [hrError, setHrError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'hr'>('profile');

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            const { data, error: fetchError } = await supabase
                .from('staff_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (fetchError) {
                console.error("Dashboard profile fetch error:", fetchError);
                if (fetchError.code === 'PGRST116') {
                    toast.error('Profile not found. Please contact the clinic administrator.');
                } else {
                    toast.error(`Error: ${fetchError.message || 'An error occurred while fetching your profile.'}`);
                }
            } else if (data) {
                setProfileData({
                    ...data,
                    clinic_locations: data.clinic_locations || [],
                    fluent_languages: data.fluent_languages || []
                } as StaffProfile);
            }

            setIsLoading(false);
        };

        const fetchHrRecord = async () => {
            if (!user) return;
            setIsHrLoading(true);

            const { data, error } = await supabase
                .from('hr_records')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                setHrError('Could not load HR data.');
            } else if (data) {
                setHrRecord(data as HRRecord);
            }
            setIsHrLoading(false);
        };

        fetchProfile();
        fetchHrRecord();
    }, [user]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const formatRole = (roles: string[]) => {
        if (!roles || roles.length === 0) return '';
        return roles.map(role => {
            if (role === 'system_admin') return 'System Admin';
            if (role === 'executive') return 'Executive';
            if (role === 'management') return 'Management';
            if (role === 'hr_management') return 'HR Management';
            if (role === 'administrative_support') return 'Admin Support';
            if (role === 'clinical_provider') return 'Clinical Provider';
            if (role === 'hr') return 'HR';
            return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }).join(', ');
    };

    const userRole = profileData?.role || [];
    const isHR = userRole.includes('hr') || userRole.includes('hr_management') || userRole.includes('executive');

    const handleEditClick = () => {
        setFormData({
            work_phone: profileData?.work_phone || '',
            work_email: profileData?.work_email || '',
            bio: profileData?.bio || '',
            preferred_name: profileData?.preferred_name || '',
            legal_first_name: profileData?.legal_first_name || '',
            legal_middle_name: profileData?.legal_middle_name || '',
            legal_last_name: profileData?.legal_last_name || '',
            display_name: profileData?.display_name || '',
            fluent_languages: profileData?.fluent_languages || []
        });
        setIsEditing(true);
    };

    const handleCancelClick = () => {
        setIsEditing(false);
    };

    const handleSaveClick = async () => {
        if (!user) return;
        setIsSaving(true);

        const { error: saveError } = await supabase
            .from('staff_profiles')
            .update({
                work_phone: formData.work_phone,
                work_email: formData.work_email,
                bio: formData.bio,
                preferred_name: formData.preferred_name,
                legal_first_name: formData.legal_first_name,
                legal_middle_name: formData.legal_middle_name,
                legal_last_name: formData.legal_last_name,
                display_name: formData.display_name,
                fluent_languages: formData.fluent_languages
            })
            .eq('id', user.id);

        setIsSaving(false);

        if (saveError) {
            toast.error(saveError.message || 'An error occurred while saving your profile.');
        } else {
            setProfileData(prev => prev ? {
                ...prev,
                work_phone: formData.work_phone,
                work_email: formData.work_email,
                bio: formData.bio,
                preferred_name: formData.preferred_name,
                legal_first_name: formData.legal_first_name,
                legal_middle_name: formData.legal_middle_name,
                legal_last_name: formData.legal_last_name,
                display_name: formData.display_name,
                fluent_languages: formData.fluent_languages
            } : null);
            setIsEditing(false);
            toast.success('Profile updated successfully!');
        }
    };

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
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
                    <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Loading profile...</p>
                </div>
            </div>
        );
    }

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
                maxWidth: isEditing ? '800px' : '500px',
                padding: '2.5rem',
                borderRadius: '16px',
                transition: 'max-width 0.3s ease',
            }}>
                {profileData ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <h1 style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: 'var(--text-main)',
                                marginBottom: '0.25rem',
                                letterSpacing: '-0.025em'
                            }}>
                                {profileData.display_name || `${profileData.preferred_name || profileData.legal_first_name || ''} ${profileData.legal_last_name || ''}`.trim() || 'Unknown Profile'}
                            </h1>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <span style={{
                                    display: 'inline-block',
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                }}>
                                    {profileData.role ? formatRole(profileData.role) : 'Staff Member'}
                                </span>
                                {profileData.clinic_locations && profileData.clinic_locations.length > 0 && profileData.clinic_locations.map(loc => (
                                    <span key={loc} style={{
                                        display: 'inline-block',
                                        backgroundColor: '#e0f2fe',
                                        color: '#0369a1',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '9999px',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                    }}>
                                        {loc}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div style={{
                            display: 'flex',
                            gap: '1rem',
                            marginBottom: '1.5rem',
                            borderBottom: '1px solid #e2e8f0',
                            paddingBottom: '0.5rem'
                        }}>
                            <button
                                onClick={() => setActiveTab('profile')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.95rem',
                                    fontWeight: 600,
                                    color: activeTab === 'profile' ? 'var(--primary-600)' : 'var(--text-light)',
                                    borderBottom: activeTab === 'profile' ? '2px solid var(--primary-600)' : '2px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    transform: activeTab === 'profile' ? 'translateY(1px)' : 'none'
                                }}
                            >
                                Public Profile
                            </button>
                            <button
                                onClick={() => setActiveTab('hr')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.95rem',
                                    fontWeight: 600,
                                    color: activeTab === 'hr' ? '#be185d' : 'var(--text-light)',
                                    borderBottom: activeTab === 'hr' ? '2px solid #be185d' : '2px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    transform: activeTab === 'hr' ? 'translateY(1px)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                My HR File
                            </button>
                        </div>

                        <div style={{
                            backgroundColor: activeTab === 'hr' ? '#fdf2f8' : '#f8fafc',
                            border: activeTab === 'hr' ? '1px solid #fbcfe8' : '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            marginBottom: '2rem',
                            textAlign: 'left'
                        }}>
                            {activeTab === 'hr' ? (
                                isHrLoading ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Loading HR data...</div>
                                ) : hrRecord ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#be185d', marginBottom: '0.25rem', fontWeight: 600 }}>Date of Birth</div>
                                                <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                                                    {hrRecord.date_of_birth ? new Date(hrRecord.date_of_birth).toLocaleDateString() : 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#be185d', marginBottom: '0.25rem', fontWeight: 600 }}>Social Insurance Number</div>
                                                <div style={{ color: 'var(--text-main)', fontWeight: 500, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                                                    {hrRecord.sin || 'N/A'}
                                                </div>
                                            </div>
                                            {hrRecord.end_date && (
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#be185d', marginBottom: '0.25rem', fontWeight: 600 }}>Termination / End Date</div>
                                                    <div style={{ color: '#ef4444', fontWeight: 600 }}>
                                                        {new Date(hrRecord.end_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ borderTop: '1px solid #fce7f3', paddingTop: '1rem' }}>
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#831843', marginBottom: '0.75rem' }}>Emergency Contact</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#be185d', marginBottom: '0.25rem', fontWeight: 600 }}>Contact Name</div>
                                                    <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                                                        {hrRecord.emergency_contact_name || 'N/A'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#be185d', marginBottom: '0.25rem', fontWeight: 600 }}>Phone Number</div>
                                                    <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                                                        {hrRecord.emergency_contact_phone ? formatPhoneNumber(hrRecord.emergency_contact_phone) : 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#be185d', padding: '1rem' }}>{hrError || 'HR Record not found.'}</div>
                                )
                            ) : isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    {/* Identity & Display Card */}
                                    <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>Identity & Display</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: 600, display: 'block' }}>
                                                    Legal First Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.legal_first_name}
                                                    onChange={(e) => setFormData({ ...formData, legal_first_name: e.target.value })}
                                                    className="input-field"
                                                    placeholder="Given name"
                                                    disabled={!isHR}
                                                    style={{ opacity: isHR ? 1 : 0.6, cursor: isHR ? 'text' : 'not-allowed' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: 600, display: 'block' }}>
                                                    Legal Middle Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.legal_middle_name}
                                                    onChange={(e) => setFormData({ ...formData, legal_middle_name: e.target.value })}
                                                    className="input-field"
                                                    placeholder="Middle name (optional)"
                                                    disabled={!isHR}
                                                    style={{ opacity: isHR ? 1 : 0.6, cursor: isHR ? 'text' : 'not-allowed' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: 600, display: 'block' }}>
                                                    Legal Last Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.legal_last_name}
                                                    onChange={(e) => setFormData({ ...formData, legal_last_name: e.target.value })}
                                                    className="input-field"
                                                    placeholder="Family name"
                                                    disabled={!isHR}
                                                    style={{ opacity: isHR ? 1 : 0.6, cursor: isHR ? 'text' : 'not-allowed' }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: 600, display: 'block' }}>
                                                    Preferred Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.preferred_name}
                                                    onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
                                                    className="input-field"
                                                    placeholder="What should we call you?"
                                                />
                                            </div>
                                            {isHR && (
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: 600, display: 'block' }}>
                                                        Display Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.display_name}
                                                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                                        className="input-field"
                                                        placeholder="Full display name (e.g. Dr. Jane Doe)"
                                                    />
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>This is the name displayed to patients and staff.</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Contact Information Card */}
                                    <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>Contact Information</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: 600, display: 'block' }}>
                                                    Work Email
                                                </label>
                                                <input
                                                    type="email"
                                                    value={formData.work_email}
                                                    onChange={(e) => setFormData({ ...formData, work_email: e.target.value })}
                                                    className="input-field"
                                                    placeholder="Email address"
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: 600, display: 'block' }}>
                                                    Work Phone
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={formData.work_phone}
                                                    onChange={(e) => setFormData({ ...formData, work_phone: e.target.value })}
                                                    className="input-field"
                                                    placeholder="Enter phone number"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Professional Details Card */}
                                    <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>Professional Details</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ width: '100%' }}>
                                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: 600, display: 'block' }}>
                                                    Fluent Languages
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.fluent_languages.join(', ')}
                                                    onChange={(e) => {
                                                        const array = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                                                        setFormData({ ...formData, fluent_languages: array });
                                                    }}
                                                    className="input-field"
                                                    placeholder="e.g. English, Mandarin, Cantonese"
                                                    style={{ width: '100%' }}
                                                />
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Separate with commas.</span>
                                            </div>
                                            <div style={{ width: '100%' }}>
                                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: 600, display: 'block' }}>
                                                    Bio
                                                </label>
                                                <textarea
                                                    value={formData.bio}
                                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                                    className="input-field"
                                                    placeholder="Tell us about yourself..."
                                                    rows={4}
                                                    style={{ resize: 'vertical', fontFamily: 'inherit', width: '100%' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600 }}>Preferred Name</div>
                                            <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>{profileData.preferred_name || <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Not provided</span>}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600 }}>Work Phone</div>
                                            <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>{profileData.work_phone ? formatPhoneNumber(profileData.work_phone) : <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Not provided</span>}</div>
                                        </div>
                                    </div>
                                    {profileData.practitioner_license_number && (
                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600 }}>License Number</div>
                                            <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>{profileData.practitioner_license_number}</div>
                                        </div>
                                    )}
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600 }}>Fluent Languages</div>
                                        <div style={{ color: 'var(--text-main)' }}>
                                            {profileData.fluent_languages && profileData.fluent_languages.length > 0 ? (
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    {profileData.fluent_languages.map(lang => (
                                                        <span key={lang} style={{
                                                            display: 'inline-block',
                                                            backgroundColor: 'white',
                                                            border: '1px solid var(--surface-border)',
                                                            color: 'var(--text-main)',
                                                            padding: '0.25rem 0.6rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.85rem'
                                                        }}>
                                                            {lang}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Not provided</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600 }}>Bio</div>
                                        <div style={{ color: 'var(--text-main)', lineHeight: 1.6 }}>{profileData.bio || <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Not provided</span>}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {activeTab === 'profile' && (
                            isEditing ? (
                                <div style={{
                                    display: 'flex',
                                    gap: '1rem',
                                    position: 'sticky',
                                    bottom: '1rem',
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    backdropFilter: 'blur(8px)',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px var(--surface-border)',
                                    zIndex: 20,
                                    marginTop: '2rem'
                                }}>
                                    <button
                                        onClick={handleCancelClick}
                                        disabled={isSaving}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            backgroundColor: '#ffffff',
                                            color: '#475569',
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            cursor: isSaving ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseOver={(e) => {
                                            if (!isSaving) {
                                                e.currentTarget.style.backgroundColor = '#f8fafc';
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!isSaving) {
                                                e.currentTarget.style.backgroundColor = '#ffffff';
                                            }
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveClick}
                                        disabled={isSaving}
                                        className="btn-primary"
                                        style={{ flex: 1, margin: 0 }}
                                    >
                                        {isSaving ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                                                Saving...
                                            </span>
                                        ) : 'Save Changes'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleEditClick}
                                    className="btn-primary"
                                    style={{ marginBottom: '1rem' }}
                                >
                                    Edit Profile
                                </button>
                            )
                        )}

                        <button
                            onClick={handleLogout}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                backgroundColor: '#ffffff',
                                color: '#ef4444',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#fef2f2';
                                e.currentTarget.style.borderColor = '#fca5a5';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#ffffff';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Log Out
                        </button>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Profile not found or an error occurred.</p>
                        <button
                            onClick={handleLogout}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                backgroundColor: '#ffffff',
                                color: '#ef4444',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#fef2f2';
                                e.currentTarget.style.borderColor = '#fca5a5';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#ffffff';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Log Out
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
