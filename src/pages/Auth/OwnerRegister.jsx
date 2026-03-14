import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';

const OwnerRegister = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        company: '',
        city: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signUpOwner } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: signUpError } = await signUpOwner(
                formData.email,
                formData.password,
                formData.name,
                formData.company,
                formData.city
            );

            if (signUpError) throw signUpError;

            // Success
            navigate('/owner-portal');

        } catch (err) {
            console.error(err);
            setError(err.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
                    alt="Corporate Building"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-secondary/80 mix-blend-multiply backdrop-blur-[2px]"></div>
            </div>

            <div className="max-w-lg w-full space-y-4 bg-white/95 backdrop-blur-xl p-6 rounded-2xl shadow-2xl transform transition-all hover:scale-[1.005] duration-500 relative z-10 border-t-8 border-primary">
                <div className="text-center">
                    <h2 className="text-2xl font-extrabold text-gray-900 font-ferron tracking-wide mb-1">
                        Partner with VOLTpark
                    </h2>
                    <p className="text-sm text-gray-600">
                        List your space, manage bookings, and earn revenue.
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
                    <div className="grid grid-cols-1 gap-y-3 gap-x-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Full Name (Owner)</label>
                            <input
                                type="text"
                                name="name"
                                required
                                className="block w-full px-3 py-2.5 text-base border border-gray-200 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all bg-gray-50/50 hover:bg-white"
                                placeholder="Your Name"
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Business Email</label>
                            <input
                                type="email"
                                name="email"
                                required
                                className="block w-full px-3 py-2.5 text-base border border-gray-200 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all bg-gray-50/50 hover:bg-white"
                                placeholder="owner@company.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Password</label>
                            <input
                                type="password"
                                name="password"
                                required
                                className="block w-full px-3 py-2.5 text-base border border-gray-200 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all bg-gray-50/50 hover:bg-white"
                                placeholder="Create a strong password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Company Name</label>
                            <input
                                type="text"
                                name="company"
                                required
                                className="block w-full px-3 py-2.5 text-base border border-gray-200 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all bg-gray-50/50 hover:bg-white"
                                placeholder="Parking Co."
                                value={formData.company}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">City / Hub</label>
                            <input
                                type="text"
                                name="city"
                                required
                                className="block w-full px-3 py-2.5 text-base border border-gray-200 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all bg-gray-50/50 hover:bg-white"
                                placeholder="New York"
                                value={formData.city}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex justify-center py-2.5 px-3 border border-transparent text-base font-bold rounded-lg text-white ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-slate-800'} focus:outline-none focus:ring-4 focus:ring-secondary/30 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5`}
                        >
                            {loading ? 'Creating Account...' : 'Finish Registration'}
                        </button>
                    </div>
                </form>

                <div className="text-center pt-2">
                    <Link to="/owner-login" className="text-sm font-bold text-secondary hover:text-teal-700 transition-colors hover:underline">
                        Already have an owner account? Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OwnerRegister;
