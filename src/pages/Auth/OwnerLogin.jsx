import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Building2 } from 'lucide-react';

const OwnerLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Standard Login
            const { data, error } = await login(email.trim(), password);
            if (error) throw error;

            // 2. Check Role
            if (data?.user) {
                console.log("VOLTPARK: Owner login auth success, verifying profile...");
                
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Verification timed out. Please check your connection.")), 5000)
                );

                const profileCheckPromise = (async () => {
                    // A. Check OWNER_PROFILES first
                    const { data: ownerProfile } = await supabase
                        .from('owner_profiles')
                        .select('role')
                        .eq('id', data.user.id)
                        .maybeSingle();

                    if (ownerProfile) {
                        return { path: '/owner-portal' };
                    }

                    // B. If not in owner_profiles, check USERS
                    const { data: userData } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', data.user.id)
                        .maybeSingle();

                    if (userData) {
                        if (userData.role === 'admin') {
                            return { error: "This account is an Admin. Please use the Admin Login." };
                        } else if (userData.role === 'user') {
                            return { error: "This email is registered as a User (Driver). Please use the main Login page." };
                        }
                    }
                    
                    return { error: "Access Denied: Profile not found or not an Owner account." };
                })();

                const result = await Promise.race([profileCheckPromise, timeoutPromise]);

                if (result.error) {
                    await supabase.auth.signOut();
                    setError(result.error);
                } else if (result.path) {
                    navigate(result.path);
                }
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
                    alt="Modern Building"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-[2px]"></div>
            </div>

            <div className="max-w-sm w-full space-y-4 bg-white/95 backdrop-blur-xl p-6 rounded-2xl shadow-2xl transform transition-all hover:scale-[1.01] duration-500 relative z-10 border-t-8 border-secondary">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 bg-secondary/10 flex items-center justify-center rounded-full mb-3">
                        <Building2 className="text-secondary" size={20} />
                    </div>
                    <div className="flex justify-center mb-1">
                        <div className="flex items-center group">
                            <span className="text-xl font-extrabold text-slate-900">VOLT</span>
                            <span className="text-xl font-extrabold text-secondary">park</span>
                        </div>
                    </div>
                    <h2 className="text-xl font-extrabold text-gray-900 font-ferron tracking-wide">
                        Owner Portal
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                        Manage your parking assets
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700 font-bold">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Email Address</label>
                            <input
                                type="email"
                                required
                                className="block w-full px-3 py-2.5 text-base border border-gray-200 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all bg-gray-50/50 hover:bg-white"
                                placeholder="owner@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Password</label>
                            <input
                                type="password"
                                required
                                className="block w-full px-3 py-2.5 text-base border border-gray-200 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all bg-gray-50/50 hover:bg-white"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex justify-center py-2.5 px-3 border border-transparent text-base font-bold rounded-lg text-white ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-secondary hover:bg-teal-700'} focus:outline-none focus:ring-4 focus:ring-secondary/30 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5`}
                        >
                            {loading ? 'Verifying...' : 'Login as Owner'}
                        </button>
                    </div>
                </form>

                <div className="text-center mt-4 space-y-2">
                    <div>
                        <Link to="/owner-register" className="text-sm font-bold text-secondary hover:text-teal-600 hover:underline transition-colors">
                            Register new property
                        </Link>
                    </div>
                    <div>
                        <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                            Not an owner? Login as User
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OwnerLogin;
