import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, signUp, signInWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                console.log("VOLTPARK: Login attempt for:", email.trim());
                const { data, error } = await login(email.trim(), password);
                if (error) throw error;

                // Fetch user role for verification
                if (data?.user) {
                    try {
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error("Verification timed out. Check your connection.")), 5000)
                        );

                        const roleFetchPromise = (async () => {
                            // 1. Try Users Table (Drivers)
                            const { data: userData } = await supabase
                                .from('users')
                                .select('role')
                                .eq('id', data.user.id)
                                .maybeSingle();

                            if (userData && userData.role === 'user') {
                                return { path: '/user-dashboard' };
                            }

                            // 2. Try Owner Profiles Table
                            const { data: ownerData } = await supabase
                                .from('owner_profiles')
                                .select('role')
                                .eq('id', data.user.id)
                                .maybeSingle();

                            if (ownerData && ownerData.role === 'owner') {
                                return { path: '/owner-portal' };
                            }

                            // 3. Admin Check
                            if (userData && userData.role === 'admin') {
                                return { error: "Please use the Admin Login." };
                            }

                            return { error: "Access Restricted: Invalid User Role." };
                        })();

                        const result = await Promise.race([roleFetchPromise, timeoutPromise]);

                        if (result.error) {
                            await supabase.auth.signOut();
                            setError(result.error);
                        } else if (result.path) {
                            navigate(result.path);
                        }
                    } catch (fetchErr) {
                        console.error("Role fetch error:", fetchErr);
                        await supabase.auth.signOut();
                        setError(fetchErr.message || "Failed to verify account role.");
                    }
                } else {
                    navigate('/');
                }
            } else {
                const { error } = await signUp(email.trim(), password, name.trim());
                if (error) throw error;
                // After signup, redirect to user dashboard as they are 'user' by default
                navigate('/user-dashboard');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop"
                    alt="City Night"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
            </div>

            <div className="max-w-sm w-full space-y-4 bg-white/90 backdrop-blur-xl p-6 rounded-2xl shadow-2xl transform transition-all hover:scale-[1.01] duration-500 relative z-10 border border-white/20">
                <div className="text-center">
                    <div className="flex justify-center mb-3">
                        <div className="flex items-center group">
                            <span className="text-2xl font-extrabold text-slate-900">VOLT</span>
                            <span className="text-2xl font-extrabold text-secondary">park</span>
                        </div>
                    </div>
                    <h2 className="text-xl font-extrabold text-gray-900 mb-1 font-ferron tracking-wide">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-sm text-gray-600">
                        {isLogin ? 'Sign in to access your dashboard' : 'Join the smart parking revolution'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-fade-in-down">
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
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="block w-full px-3 py-2.5 text-base border border-gray-200 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all bg-gray-50/50 hover:bg-white"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Email Address</label>
                            <input
                                type="email"
                                required
                                className="block w-full px-3 py-2.5 text-base border border-gray-200 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all bg-gray-50/50 hover:bg-white"
                                placeholder="name@example.com"
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

                    <div className="space-y-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex justify-center py-2.5 px-3 border border-transparent text-base font-bold rounded-lg text-white ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-slate-800'} focus:outline-none focus:ring-4 focus:ring-secondary/30 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5`}
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Verifying...
                                </span>
                            ) : (isLogin ? 'Sign In' : 'Create Account')}
                        </button>

                        <div className="relative flex items-center justify-center w-full py-2">
                            <div className="absolute border-t border-gray-300 w-full"></div>
                            <span className="relative bg-white/90 px-3 text-xs text-gray-500 font-medium">OR</span>
                        </div>

                        <button
                            type="button"
                            onClick={signInWithGoogle}
                            disabled={loading}
                            className="w-full flex justify-center items-center py-2.5 px-3 border border-gray-300 text-base font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                        >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>
                    </div>
                </form>

                <div className="text-center pt-1">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm font-bold text-secondary hover:text-teal-700 transition-colors hover:underline"
                    >
                        {isLogin ? "New to VOLTpark? Create an account" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
