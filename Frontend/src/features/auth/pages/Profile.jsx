import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { useAuth } from '../hook/useAuth';

const roleBadgeStyle = (role) => ({
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: '9px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    fontWeight: 600,
    backgroundColor: role === 'seller' ? '#C9A96E' : '#f5f3f0',
    color: role === 'seller' ? '#1b1c1a' : '#7A6E63',
    border: `1px solid ${role === 'seller' ? '#C9A96E' : '#d0c5b5'}`,
});

const Profile = () => {
    const user = useSelector(state => state.auth.user);
    const navigate = useNavigate();
    const { handleLogout } = useAuth();

    if (!user) {
        navigate('/login');
        return null;
    }

    async function onLogout() {
        await handleLogout();
    }

    return (
        <>
            <link
                href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap"
                rel="stylesheet"
            />
            <div
                className="min-h-screen selection:bg-[#C9A96E]/30 pb-24"
                style={{ backgroundColor: '#fbf9f6', fontFamily: "'Inter', sans-serif" }}
            >
                <div className="max-w-2xl mx-auto px-8 lg:px-0 pt-16 lg:pt-24">

                    {/* Header */}
                    <div className="mb-12">
                        <span className="text-[10px] uppercase tracking-[0.24em] font-medium" style={{ color: '#C9A96E' }}>
                            Account
                        </span>
                        <h1
                            className="text-5xl lg:text-6xl font-light leading-tight mt-4"
                            style={{ fontFamily: "'Cormorant Garamond', serif", color: '#1b1c1a' }}
                        >
                            Your Profile
                        </h1>
                    </div>

                    {/* Profile Card */}
                    <div className="p-10" style={{ backgroundColor: '#f5f3f0' }}>
                        {/* Avatar initials */}
                        <div
                            className="flex items-center justify-center mb-8"
                            style={{
                                width: '72px',
                                height: '72px',
                                borderRadius: '50%',
                                backgroundColor: '#e4e2df',
                                fontFamily: "'Cormorant Garamond', serif",
                                fontSize: '28px',
                                color: '#1b1c1a',
                                fontWeight: 300,
                            }}
                        >
                            {user.fullname ? user.fullname.charAt(0).toUpperCase() : '?'}
                        </div>

                        {/* Fields */}
                        <div className="flex flex-col gap-0" style={{ borderTop: '1px solid #e4e2df' }}>
                            <ProfileRow label="Full Name" value={user.fullname || '—'} />
                            <ProfileRow label="Email" value={user.email || '—'} />
                            <ProfileRow label="Contact" value={user.contact || '—'} />
                            <ProfileRow
                                label="Role"
                                value={
                                    <span style={roleBadgeStyle(user.role)}>
                                        {user.role || 'buyer'}
                                    </span>
                                }
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-8 flex flex-col gap-4">
                        <button
                            onClick={onLogout}
                            className="w-full py-4 text-[11px] uppercase tracking-[0.25em] font-medium transition-all duration-300 border"
                            style={{
                                backgroundColor: 'transparent',
                                borderColor: '#d0c5b5',
                                color: '#1b1c1a',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor = '#1b1c1a';
                                e.currentTarget.style.color = '#fbf9f6';
                                e.currentTarget.style.borderColor = '#1b1c1a';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#1b1c1a';
                                e.currentTarget.style.borderColor = '#d0c5b5';
                            }}
                        >
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <footer className="border-t mt-24 py-12 text-center" style={{ borderColor: '#e4e2df' }}>
                    <span
                        className="text-[10px] uppercase tracking-[0.35em]"
                        style={{ fontFamily: "'Cormorant Garamond', serif", color: '#C9A96E' }}
                    >
                        Snitch. © {new Date().getFullYear()}
                    </span>
                </footer>
            </div>
        </>
    );
};

const ProfileRow = ({ label, value }) => (
    <div
        className="flex justify-between items-center py-5"
        style={{ borderBottom: '1px solid #e4e2df' }}
    >
        <span className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: '#7A6E63' }}>
            {label}
        </span>
        <span className="text-sm" style={{ color: '#1b1c1a' }}>
            {value}
        </span>
    </div>
);

export default Profile;

