import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, QrCode } from 'lucide-react';
import BarcodeModal from '../../components/BarcodeModal';

const DashboardLayout = ({ title, children }) => {
    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-6">{title}</h1>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6">
                {children}
            </div>
        </div>
    )
}

const BookingList = ({ bookings }) => {
    const [selectedBooking, setSelectedBooking] = useState(null);

    if (bookings.length === 0) {
        return <div className="p-8 text-center text-sm text-gray-400 font-bold">No bookings found. Start exploring!</div>
    }

    return (
        <>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="table-header text-[10px] px-3 py-2">Details</th>
                            <th className="table-header text-[10px] px-3 py-2">Location</th>
                            <th className="table-header text-[10px] px-3 py-2">Slot</th>
                            <th className="table-header text-[10px] px-3 py-2">Schedule</th>
                            <th className="table-header text-[10px] px-3 py-2">Payment</th>
                            <th className="table-header text-[10px] px-3 py-2">Status</th>
                            <th className="table-header text-[10px] px-3 py-2 text-right">Access</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {bookings.map((booking) => (
                            <tr key={booking.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="table-cell px-3 py-2">
                                    <div className="font-mono text-gray-500 text-xs">#{booking.id.slice(0, 8)}</div>
                                </td>
                                <td className="table-cell px-3 py-2">
                                    <div className="flex items-center">
                                        <MapPin className="text-primary mr-1.5" size={14} />
                                        <span className="font-bold text-gray-900 text-xs">{booking.locations?.name || 'Unknown Location'}</span>
                                    </div>
                                </td>
                                <td className="table-cell px-3 py-2">
                                    {booking.selected_slot ? (
                                        <span className="bg-blue-100 text-blue-800 py-0.5 px-1.5 rounded-md font-bold text-[10px] border border-blue-200">
                                            {booking.selected_slot}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 font-bold text-[10px]">--</span>
                                    )}
                                </td>
                                <td className="table-cell px-3 py-2">
                                    <div className="flex flex-col space-y-0.5">
                                        <div className="flex items-center text-gray-900 font-bold text-xs">
                                            <Calendar className="mr-1 text-gray-400" size={12} />
                                            {format(new Date(booking.start_time), 'MMM d, yyyy')}
                                        </div>
                                        <div className="flex items-center text-gray-500 text-[10px]">
                                            <Clock className="mr-1 text-gray-400" size={12} />
                                            {format(new Date(booking.start_time), 'h:mm a')} • {booking.duration} hr(s)
                                        </div>
                                    </div>
                                </td>
                                <td className="table-cell px-3 py-2">
                                    <div className="font-bold text-sm text-secondary">₹{booking.amount}</div>
                                    {booking.status === 'confirmed' && <div className="text-[9px] text-green-600 font-bold">Paid via Razorpay</div>}
                                </td>
                                <td className="table-cell px-3 py-2">
                                    <span className={`px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full uppercase tracking-wide ${booking.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                        booking.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                            booking.status === 'Started' ? 'bg-blue-100 text-blue-800' :
                                                booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {booking.status === 'confirmed' ? 'Confirmed' : booking.status || 'Scheduled'}
                                    </span>
                                </td>
                                <td className="table-cell px-3 py-2 text-right">
                                    <button
                                        onClick={() => setSelectedBooking(booking)}
                                        className="btn-sm bg-gray-900 text-white hover:bg-black inline-flex items-center shadow-sm transform transition-transform group-hover:scale-105 text-[10px] px-2 py-1"
                                    >
                                        <QrCode size={14} className="mr-1.5" /> Barcode
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <BarcodeModal
                booking={selectedBooking}
                onClose={() => setSelectedBooking(null)}
            />
        </>
    )
}

export const UserDashboard = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);

    useEffect(() => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const fetchBookings = async () => {
            try {
                const { data, error } = await supabase
                    .from('bookings')
                    .select('*, locations(name)')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .abortSignal(controller.signal);

                if (error) throw error;
                setBookings(data || []);
            } catch (err) {
                if (err.name === 'AbortError') {
                    console.warn('VOLTPARK: Bookings fetch timed out');
                } else {
                    console.error('VOLTPARK: Bookings fetch error:', err);
                }
            } finally {
                clearTimeout(timeoutId);
            }
        }
        if (user) fetchBookings();
        return () => {
            controller.abort();
            clearTimeout(timeoutId);
        };
    }, [user]);

    return (
        <DashboardLayout title="My Bookings">
            <BookingList bookings={bookings} />
        </DashboardLayout>
    )
}

export const OwnerDashboard = () => {
    // Replaced by specific OwnerPortal page, keeping component for safety if needed by router
    return null;
}

export default UserDashboard;
