import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Mail, Shield, Lock, Save, TriangleAlert } from 'lucide-react';

const Profile = () => {
    const { user, userRole, userEmailFromDB, logout } = useAuth();

    // UI State
    const [activeTab, setActiveTab] = useState('details'); // details, email, password
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSyncWarning, setEmailSyncWarning] = useState(false);

    // Form State
    const [name, setName] = useState(user?.user_metadata?.name || '');
    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Fallback if user is null (should be protected)
    if (!user) return <div className="p-20 text-center text-4xl font-bold animate-pulse">Loading Profile...</div>;

    useEffect(() => {
        if (user && userEmailFromDB && user.email) {
            // Check for mismatch
            if (user.email.trim().toLowerCase() !== userEmailFromDB.trim().toLowerCase()) {
                setEmailSyncWarning(true);
            } else {
                setEmailSyncWarning(false);
            }
        }
    }, [user, userEmailFromDB]);

    const handleUpdateName = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(''); setMessage('');
        try {
            // 1. Update Auth Metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { name: name }
            });
            if (authError) throw authError;

            // 2. Update Database
            const { error: dbError } = await supabase
                .from('users')
                .update({ name: name })
                .eq('id', user.id);
            if (dbError) throw dbError;

            setMessage('Name updated successfully!');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateEmail = async (e) => {
        e.preventDefault();
        if (email !== confirmEmail) {
            setError("Emails do not match");
            return;
        }
        setLoading(true);
        setError(''); setMessage('');
        try {
            console.log("Starting email update for user:", user.id);

            let isEmailUpdated = false;

            // CHECK: Is the new email SAME as current Auth email?
            // If yes, user likely updated via Dashboard and just needs to sync DB.
            if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
                console.log("Email matches current Auth email. Skipping Auth update, syncing DB only.");
                isEmailUpdated = true;
            } else {
                // 1. Update Supabase Auth
                const { data, error: authError } = await supabase.auth.updateUser({ email: email });

                if (authError) {
                    console.error("Auth update failed:", authError);
                    throw authError; // This would catch and show error
                }

                console.log("Auth update response:", data);

                // Check if the email was actually updated immediately
                const updatedUser = data.user;
                isEmailUpdated = updatedUser.email && updatedUser.email.toLowerCase() === email.toLowerCase();
            }

            if (isEmailUpdated) {
                // CASE 1: Immediate Update OR Already Updated
                console.log("Email updated/verified. Syncing DB...");

                // 2. Update Users Table (Keep DB in sync)
                const { error: dbError } = await supabase
                    .from('users')
                    .update({ email: email })
                    .eq('id', user.id);

                if (dbError) {
                    console.error("DB update failed:", dbError);
                    throw dbError;
                }

                setMessage('Email synced successfully! Logging out to ensure session freshness...');
                setEmail(''); setConfirmEmail('');

                // 3. Force Log out
                setTimeout(async () => {
                    await logout();
                }, 2000);
            } else {
                // CASE 2: Pending Confirmation (Confirmation Enabled)
                console.log("Email update pending confirmation");
                setMessage(`Confirmation link sent to ${email}. Please check your inbox (and spam) to verify the new email. Your login email will not change until verified.`);
                // Do NOT update DB yet. The DB should reflect the CURRENT login email.
                // Do NOT logout.
                setEmail(''); setConfirmEmail('');
            }
        } catch (err) {
            console.error("Update failed:", err);
            let errorMessage = err.message;
            if (err.message.includes('is invalid') && err.message.includes(user.email)) {
                errorMessage = `Supabase cannot send a verification email to your old address (${user.email}). Please change your email directly in the Supabase Dashboard > Authentication > Users.`;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        setError(''); setMessage('');
        try {
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;
            setMessage('Password changed successfully!');
            setPassword(''); setConfirmPassword('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 presentation-container">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-extrabold text-gray-900 mb-6">My Profile</h1>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="bg-gradient-to-r from-primary to-secondary h-24"></div>
                    <div className="px-6 pb-6 relative">
                        <div className="absolute -top-10 left-6">
                            <div className="h-20 w-20 rounded-full bg-white p-1 shadow-md">
                                <div className="h-full w-full rounded-full bg-primary flex items-center justify-center text-2xl text-white font-bold">
                                    {user.email?.charAt(0).toUpperCase()}
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 ml-24 pl-4 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-0.5">{name}</h2>
                                <p className="text-xs text-gray-500">Member since {new Date(user.created_at).getFullYear()}</p>
                            </div>
                            <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Role</p>
                                <p className="text-sm font-bold text-primary capitalize leading-none">{userRole}</p>
                            </div>
                        </div>

                        <div className="mt-8 grid gap-6">
                            {/* Feedback Messages */}
                            {message && (
                                <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-md">
                                    <p className="text-green-800 text-sm font-bold">{message}</p>
                                </div>
                            )}
                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-md">
                                    <p className="text-red-800 text-sm font-bold">{error}</p>
                                </div>
                            )}

                            {emailSyncWarning && (
                                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-md flex items-start space-x-3">
                                    <TriangleAlert className="w-5 h-5 text-amber-500 mt-0.5" />
                                    <div>
                                        <p className="text-amber-800 text-sm font-bold">Action Required: Email Mismatch</p>
                                        <p className="text-amber-700 text-xs mt-1">
                                            Your login email ({user.email}) does not match your profile email ({userEmailFromDB}).
                                            Please update your email below to strictly match your desired email address to ensure your account works correctly.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="flex space-x-6 border-b border-gray-100 mb-2">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`pb-2 px-1 text-sm font-bold transition-colors ${activeTab === 'details' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Personal Details
                                </button>
                                <button
                                    onClick={() => setActiveTab('email')}
                                    className={`pb-2 px-1 text-sm font-bold transition-colors ${activeTab === 'email' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Update Email
                                </button>
                                <button
                                    onClick={() => setActiveTab('password')}
                                    className={`pb-2 px-1 text-sm font-bold transition-colors ${activeTab === 'password' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Change Password
                                </button>
                            </div>

                            {/* Forms */}
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                {activeTab === 'details' && (
                                    <form onSubmit={handleUpdateName} className="space-y-4">
                                        <h3 className="text-base font-bold text-gray-900 border-b pb-2 mb-4">Personal Information</h3>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Full Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <button disabled={loading} className="btn-primary w-full py-2 text-sm">
                                                {loading ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {activeTab === 'email' && (
                                    <form onSubmit={handleUpdateEmail} className="space-y-4">
                                        <h3 className="text-base font-bold text-gray-900 border-b pb-2 mb-4">Update Email Address</h3>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">New Email Address</label>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                                                placeholder="Enter new email"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Confirm New Email</label>
                                            <input
                                                type="email"
                                                required
                                                value={confirmEmail}
                                                onChange={(e) => setConfirmEmail(e.target.value)}
                                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                                                placeholder="Confirm new email"
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <button disabled={loading} className="btn-secondary w-full py-2 text-sm">
                                                {loading ? 'Updating...' : 'Update Email'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {activeTab === 'password' && (
                                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                                        <h3 className="text-base font-bold text-gray-900 border-b pb-2 mb-4">Change Password</h3>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">New Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Confirm New Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <button disabled={loading} className="btn-primary w-full py-2 text-sm bg-gray-900 hover:bg-black">
                                                {loading ? 'Updating...' : 'Set New Password'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
