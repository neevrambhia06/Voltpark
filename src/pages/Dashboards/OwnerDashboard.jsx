import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Building2, MapPin, Calendar, Plus, DollarSign, Users, Clock, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import SlotLayoutModal from '../../components/SlotLayoutModal';

const OwnerDashboard = () => {
    const { user, userRole, loading: authLoading } = useAuth();
    const [locations, setLocations] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'locations', 'bookings'
    const [selectedLayoutId, setSelectedLayoutId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        if (!user) return;
        fetchOwnerData();
    }, [user]);

    const fetchOwnerData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Locations owned by this user
            const { data: locs, error: locError } = await supabase
                .from('locations')
                .select('*')
                .eq('owner_id', user?.id)
                .order('created_at', { ascending: false });

            if (locError) throw locError;
            setLocations(locs || []);

            // 2. Fetch Bookings for these locations
            if (locs && locs.length > 0) {
                const locationIds = locs.map(l => l.id);
                const { data: bks, error: bkError } = await supabase
                    .from('bookings')
                    .select('*, locations(name), users(name, email)')
                    .in('location_id', locationIds)
                    .order('created_at', { ascending: false });

                if (bkError) throw bkError;
                setBookings(bks || []);
            } else {
                setBookings([]);
            }

        } catch (error) {
            console.error("Error fetching owner data:", error);
        } finally {
            setLoading(false);
        }

    };

    const handleDeleteBooking = async (bookingId) => {
        const confirmed = window.confirm(
            'Are you sure you want to delete this booking? ' +
            'This action cannot be undone.'
        );
        if (!confirmed) return;

        setDeletingId(bookingId);

        try {
            const { data, error } = await supabase
                .rpc('delete_booking_by_owner', {
                    p_booking_id: bookingId,
                    p_owner_id: user?.id
                });

            if (error) throw error;

            if (!data.success) {
                alert(data.error || 'Failed to delete booking.');
                return;
            }

            setBookings(prev =>
                prev.filter(b => b.id !== bookingId)
            );

        } catch (err) {
            console.error('Delete booking error:', err);
            alert('Failed to delete booking. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    // Real-time Subscription for Dashboard (no polling needed)
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('owner-dashboard-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'locations', filter: `owner_id=eq.${user?.id}` }, () => fetchOwnerData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchOwnerData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Targeted Realtime for booking DELETE and UPDATE
    useEffect(() => {
        const channel = supabase
            .channel('owner-bookings-changes')
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'bookings',
                },
                (payload) => {
                    setBookings(prev =>
                        prev.filter(b => b.id !== payload.old.id)
                    );
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'bookings',
                },
                (payload) => {
                    setBookings(prev =>
                        prev.map(b =>
                            b.id === payload.new.id
                                ? { ...b, ...payload.new }
                                : b
                        )
                    );
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    // Calculate Stats
    const totalLocations = locations.length;
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const pendingBookings = bookings.filter(b => b.status === 'active').length;

    if (authLoading || loading) {
        return <div className="flex h-screen items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary"></div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold text-gray-900">Owner Dashboard</h1>
                        <p className="mt-1 text-sm text-gray-500">Welcome back, Partner</p>
                    </div>
                    {/* Add Location Button (Placeholder for now) */}
                    <button className="bg-secondary text-white px-4 py-2 rounded-lg flex items-center hover:bg-teal-700 transition text-sm">
                        <Plus size={18} className="mr-2" />
                        Add New Location
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 px-4 sm:px-0">
                    <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                                <MapPin className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Locations</dt>
                                    <dd className="text-3xl font-semibold text-gray-900">{totalLocations}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                                <Calendar className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
                                    <dd className="text-3xl font-semibold text-gray-900">{totalBookings}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                                <DollarSign className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                                    <dd className="text-3xl font-semibold text-gray-900">₹{totalRevenue.toFixed(2)}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                                <Clock className="h-6 w-6 text-purple-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Active Bookings</dt>
                                    <dd className="text-3xl font-semibold text-gray-900">{pendingBookings}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6 px-4 sm:px-0">
                    <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
                        {['Overview', 'My Locations', 'Bookings'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '_'))}
                                className={`${activeTab === tab.toLowerCase().replace(' ', '_')
                                    ? 'border-secondary text-secondary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content based on Tab */}
                {activeTab === 'my_locations' && (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                            {locations.length > 0 ? (
                                locations.map((loc) => (
                                    <li key={loc.id}>
                                        <div className="block hover:bg-gray-50 px-4 py-4 sm:px-6 cursor-pointer">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <img className="h-10 w-10 rounded-full object-cover" src={loc.image_url || "https://via.placeholder.com/40"} alt="" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-secondary truncate">{loc.name}</div>
                                                        <div className="flex text-sm text-gray-500">
                                                            <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                                            <p>{loc.address}, {loc.city}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="text-sm text-gray-900 font-bold">₹{loc.price_per_hour}/hr</div>
                                                    <div className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${loc.available_slots > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {loc.available_slots} Slots Left
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedLayoutId(loc.id);
                                                        }}
                                                        className="flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-2 py-1 rounded border border-blue-100 transition-colors"
                                                    >
                                                        <LayoutGrid size={14} className="mr-1" />
                                                        View Layout
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <div className="p-10 text-center text-gray-500">
                                    You haven't added any locations yet.
                                </div>
                            )}
                        </ul>
                    </div>
                )}

                {/* Slot Layout Modal */}
                <SlotLayoutModal
                    locationId={selectedLayoutId}
                    isOpen={!!selectedLayoutId}
                    onClose={() => setSelectedLayoutId(null)}
                />

                {(activeTab === 'bookings' || activeTab === 'overview') && (
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Bookings</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {bookings.length > 0 ? (
                                        bookings.map((booking) => (
                                            <tr key={booking.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    #{booking.id.slice(0, 8)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {booking.locations?.name || 'Unknown Location'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {booking.users?.name || booking.users?.email || 'Guest'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {format(new Date(booking.start_time), 'MMM d, h:mm a')}
                                                    <div className="text-xs text-gray-400">({booking.duration} hrs)</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    ₹{booking.amount}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${booking.status === 'active' ? 'bg-green-100 text-green-800' :
                                                        booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {booking.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                                                No bookings found for your locations.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default OwnerDashboard;
