import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
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

export function Dashboard({ user }: { user: User | null }) {
    const [profileData, setProfileData] = useState<StaffProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit mode states
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [formData, setFormData] = useState({ phone_number: '', bio: '' });

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('staff_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    setError('Profile not found. Please contact the clinic administrator.');
                } else {
                    setError('An error occurred while fetching your profile.');
                }
            } else if (data) {
                setProfileData({
                    ...data,
                    clinic_locations: data.clinic_locations || []
                } as StaffProfile);
            }

            setIsLoading(false);
        };

        fetchProfile();
    }, [user]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const formatRole = (role: string) => {
        if (!role) return '';
        if (role.toLowerCase() === 'front_desk') return 'Front Desk';
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const handleEditClick = () => {
        setFormData({
            phone_number: profileData?.phone_number || '',
            bio: profileData?.bio || ''
        });
        setError(null);
        setSuccessMessage(null);
        setIsEditing(true);
    };

    const handleCancelClick = () => {
        setIsEditing(false);
        setError(null);
    };

    const handleSaveClick = async () => {
        if (!user) return;
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        const { error: saveError } = await supabase
            .from('staff_profiles')
            .update({
                phone_number: formData.phone_number,
                bio: formData.bio
            })
            .eq('id', user.id);

        setIsSaving(false);

        if (saveError) {
            setError(saveError.message || 'An error occurred while saving your profile.');
        } else {
            setProfileData(prev => prev ? { ...prev, phone_number: formData.phone_number, bio: formData.bio } : null);
            setIsEditing(false);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
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
                maxWidth: '500px',
                padding: '2.5rem',
                borderRadius: '16px',
            }}>
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

                {error ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            backgroundColor: 'var(--error-bg)',
                            color: 'var(--error-text)',
                            border: '1px solid var(--error-border)',
                            padding: '1rem',
                            borderRadius: '8px',
                            marginBottom: '1.5rem',
                            fontSize: '0.95rem',
                        }}>
                            {error}
                        </div>
                        <button
                            onClick={() => setError(null)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                backgroundColor: '#ffffff',
                                color: '#475569',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                marginBottom: '1rem'
                            }}
                        >
                            Dismiss Error
                        </button>
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
                ) : profileData ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <h1 style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: 'var(--text-main)',
                                marginBottom: '0.25rem',
                                letterSpacing: '-0.025em'
                            }}>
                                {profileData.first_name} {profileData.last_name}
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

                        <div style={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            marginBottom: '2rem',
                            textAlign: 'left'
                        }}>
                            {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: 600, display: 'block' }}>
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone_number}
                                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                            className="input-field"
                                            placeholder="Enter phone number"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: 600, display: 'block' }}>
                                            Bio
                                        </label>
                                        <textarea
                                            value={formData.bio}
                                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                            className="input-field"
                                            placeholder="Tell us about yourself..."
                                            rows={4}
                                            style={{ resize: 'vertical', fontFamily: 'inherit' }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600 }}>Phone Number</div>
                                        <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>{profileData.phone_number ? formatPhoneNumber(profileData.phone_number) : <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Not provided</span>}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600 }}>Bio</div>
                                        <div style={{ color: 'var(--text-main)', lineHeight: 1.6 }}>{profileData.bio || <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Not provided</span>}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {isEditing ? (
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
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
                ) : null}
            </div>
        </div>
    );
}
