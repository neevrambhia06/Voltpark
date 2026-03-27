
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const AdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, locations: 0, bookings: 0, owners: 0 });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Run all queries in parallel instead of sequentially
            const [usersRes, locCountRes, bookCountRes, ownerCountRes] = await Promise.all([
                supabase.from('users').select('id, email, name, role', { count: 'exact' }),
                supabase.from('locations').select('id', { count: 'exact', head: true }),
                supabase.from('bookings').select('id', { count: 'exact', head: true }),
                supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'owner')
            ]);

            setStats({
                users: usersRes.count || 0,
                locations: locCountRes.count || 0,
                bookings: bookCountRes.count || 0,
                owners: ownerCountRes.count || 0
            });
            setUsers(usersRes.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleUpdate = async (userId, newRole) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            fetchData(); // Refresh
            alert('Role updated successfully');
        } catch (error) {
            alert('Error updating role: ' + error.message);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Admin Data...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                    <p className="text-gray-500 text-sm">Total Users</p>
                    <p className="text-3xl font-bold text-primary">{stats.users}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                    <p className="text-gray-500 text-sm">Total Owners</p>
                    <p className="text-3xl font-bold text-secondary">{stats.owners}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                    <p className="text-gray-500 text-sm">Locations</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.locations}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                    <p className="text-gray-500 text-sm">Bookings</p>
                    <p className="text-3xl font-bold text-green-600">{stats.bookings}</p>
                </div>
            </div>

            {/* User Management */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-900">User Management</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                user.role === 'owner' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {user.role === 'user' && (
                                            <button
                                                onClick={() => handleRoleUpdate(user.id, 'owner')}
                                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            >
                                                Make Owner
                                            </button>
                                        )}
                                        {user.role !== 'admin' && user.role !== 'user' && (
                                            <button
                                                onClick={() => handleRoleUpdate(user.id, 'user')}
                                                className="text-gray-600 hover:text-gray-900"
                                            >
                                                Demote to User
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
