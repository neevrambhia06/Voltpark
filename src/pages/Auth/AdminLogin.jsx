import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ShieldCheck } from 'lucide-react';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { user, userRole, login } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in as admin
    useEffect(() => {
        if (user && userRole === 'admin') {
            navigate('/admin-portal');
        }
    }, [user, userRole, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            console.log("VOLTPARK: Admin login attempt for:", email.trim());
            // 1. Authenticate
            const { data, error: loginError } = await login(email.trim(), password);
            if (loginError) throw loginError;

            if (data?.user) {
                console.log("VOLTPARK: Auth success, verifying admin role...");
                
                // 2. Role Verification with timeout
                const rolePromise = supabase
                    .from('users')
                    .select('role')
                    .eq('id', data.user.id)
                    .maybeSingle();

                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Role verification timed out")), 5000)
                );

                const { data: userData, error: roleError } = await Promise.race([rolePromise, timeoutPromise]);

                if (roleError) throw roleError;

                if (userData?.role === 'admin') {
                    console.log("VOLTPARK: Admin confirmed, navigating...");
                    navigate('/admin-portal');
                } else {
                    console.warn("VOLTPARK: Access denied. Role:", userData?.role);
                    await supabase.auth.signOut();
                    setError("Access Denied: This account is not authorized for Admin access.");
                }
            }
        } catch (err) {
            console.error("VOLTPARK: Admin Login Error:", err);
            // Sign out if we got partway through but failed role check
            if (err.message !== "Invalid login credentials") {
                supabase.auth.signOut().catch(p => console.error("Emergency signout failed:", p));
            }
            setError(err.message || "Authentication failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop"
                    alt="Cyber Security"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px]"></div>
            </div>

            <div className="max-w-xs w-full space-y-3 bg-gray-900/90 backdrop-blur-xl p-5 rounded-xl shadow-2xl transform transition-all hover:scale-[1.01] duration-500 relative z-10 border border-red-900/50">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 bg-red-900/30 flex items-center justify-center rounded-full mb-2 border border-red-700/50">
                        <ShieldCheck className="text-red-500" size={20} />
                    </div>
                    <div className="flex justify-center mb-1">
                        <div className="flex items-center group">
                            <span className="text-xl font-extrabold text-white">VOLT</span>
                            <span className="text-xl font-extrabold text-red-500">park</span>
                        </div>
                    </div>
                    <h2 className="text-lg font-extrabold text-white font-ferron tracking-wide">
                        Admin Access
                    </h2>
                </div>

                {error && (
                    <div className="bg-red-900/30 border-l-2 border-red-600 p-2 rounded-r-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-2">
                                <p className="text-xs text-red-400 font-bold">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-300 mb-0.5 ml-1">Admin Email</label>
                            <input
                                type="email"
                                required
                                className="block w-full px-2.5 py-1.5 text-sm border border-gray-700 placeholder-gray-600 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-transparent transition-all bg-gray-800/50 hover:bg-gray-800"
                                placeholder="admin@voltpark.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-300 mb-0.5 ml-1">Security Key</label>
                            <input
                                type="password"
                                required
                                className="block w-full px-2.5 py-1.5 text-sm border border-gray-700 placeholder-gray-600 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-transparent transition-all bg-gray-800/50 hover:bg-gray-800"
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
                            className={`w-full flex justify-center py-2 px-3 border border-transparent text-sm font-bold rounded-lg text-white ${loading ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500'} focus:outline-none focus:ring-2 focus:ring-red-900/50 transition-all shadow-md shadow-red-900/20`}
                        >
                            {loading ? 'Verifying...' : 'Authenticate'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
