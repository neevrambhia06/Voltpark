
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, ArrowLeft, Search, Filter, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import BarcodeModal from '../../components/BarcodeModal';

const AdminBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, Scheduled, Started, Completed, Cancelled
    const [selectedBarcodeBooking, setSelectedBarcodeBooking] = useState(null);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*, locations(name, type, city), users(name, email)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBookings(data || []);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBookings = bookings.filter(bk => {
        const matchesSearch = (bk.locations?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (bk.users?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            bk.id.includes(searchTerm);

        const matchesStatus = filterStatus === 'all' || bk.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/admin-portal" className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors">
                                <ArrowLeft size={24} />
                            </Link>
                            <h1 className="text-3xl font-bold text-gray-900">All Bookings</h1>
                        </div>
                        <div className="text-sm text-gray-500 font-medium">
                            Total: {filteredBookings.length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search Booking ID, Location, User..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter size={20} className="text-gray-400" />
                        <select
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Started">Started</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Booking ID</th>
                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Time</th>
                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr><td colSpan="6" className="px-4 py-6 text-center text-xs text-gray-500">Loading bookings...</td></tr>
                                ) : filteredBookings.length === 0 ? (
                                    <tr><td colSpan="6" className="px-4 py-6 text-center text-xs text-gray-500">No bookings found.</td></tr>
                                ) : (
                                    filteredBookings.map((bk) => (
                                        <tr key={bk.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                    #{bk.id.slice(0, 8)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="text-xs font-bold text-gray-900">{bk.locations?.name || 'Unknown'}</div>
                                                <div className="flex items-center text-[10px] text-gray-500">
                                                    <MapPin size={10} className="mr-1" />
                                                    {bk.locations?.city}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="text-xs font-medium text-gray-900">{bk.users?.name || 'Unknown'}</div>
                                                <div className="text-[10px] text-gray-500">{bk.users?.email}</div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <div className="text-xs font-medium text-gray-900">
                                                        {new Date(bk.start_time).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 flex items-center mt-0.5">
                                                        {new Date(bk.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                        {new Date(bk.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-bold rounded-full uppercase tracking-wide border shadow-sm ${bk.status === 'Completed' ? 'bg-green-100 text-green-800 border-green-200' :
                                                    bk.status === 'Started' ? 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse' :
                                                        bk.status === 'Cancelled' ? 'bg-red-100 text-red-800 border-red-200' :
                                                            'bg-amber-100 text-amber-800 border-amber-200'
                                                    }`}>
                                                    {bk.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-medium">
                                                <button
                                                    onClick={() => setSelectedBarcodeBooking(bk)}
                                                    className="text-white bg-indigo-600 hover:bg-indigo-700 font-medium text-[10px] px-2.5 py-1 rounded-md transition-all shadow-sm hover:shadow-md"
                                                >
                                                    View Barcode
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Barcode Modal */}
            <BarcodeModal
                booking={selectedBarcodeBooking}
                onClose={() => setSelectedBarcodeBooking(null)}
            />
        </div>
    );
};

export default AdminBookings;
