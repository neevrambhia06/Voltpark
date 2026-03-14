import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

const CreateAdmin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            // 1. Sign up the user
            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name,
                        role: 'admin' // Add metadata just in case
                    }
                }
            });

            if (authError) throw authError;

            if (data.user) {
                // 2. Insert into users table with admin role
                const { error: dbError } = await supabase
                    .from('users')
                    .insert([
                        {
                            id: data.user.id,
                            email: email,
                            name: name,
                            role: 'admin', // KEY STEP
                            approval_status: 'approved', // Admins are auto-approved
                            created_at: new Date().toISOString()
                        }
                    ]);

                if (dbError) throw dbError;

                setMessage('Admin created successfully! You can now log in.');
                // clear form
                setEmail('');
                setPassword('');
                setName('');
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Create New Admin</h2>

                {message && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm font-bold">{message}</div>}
                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm font-bold">{error}</div>}

                <form onSubmit={handleCreateAdmin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Admin Name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="admin@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Secure Password"
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Admin'}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <button onClick={() => navigate('/login')} className="text-sm text-gray-500 hover:text-gray-700 underline">
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateAdmin;
