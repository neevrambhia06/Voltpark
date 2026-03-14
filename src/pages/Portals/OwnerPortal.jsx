
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, MapPin, Calendar, DollarSign, BarChart3, Clock, CheckCircle, X, Shield, Filter, Search, ChevronDown, ChevronUp, LogOut, QrCode, Car, Bike, PlusCircle, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import BarcodeModal from '../../components/BarcodeModal';

const OwnerPortal = () => {
    const { user, approvalStatus } = useAuth(); // Get approval status
    const [locations, setLocations] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [stats, setStats] = useState({ revenue: 0, occupancy: 0, rating: 0 });
    const [loading, setLoading] = useState(true);

    // UI State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedBarcodeBooking, setSelectedBarcodeBooking] = useState(null);

    // Form State
    const [newLoc, setNewLoc] = useState({
        name: '',
        address: '',
        city: '',
        type: 'parking',
        price: '', // Used for ev or legacy
        slots: '', // Used for ev or legacy
        car_slots: '',
        car_price: '',
        bike_slots: '',
        bike_price: ''
    });

    const [editingLoc, setEditingLoc] = useState(null);

    const isApproved = approvalStatus === 'approved';
    const authLoading = false; // Assuming handled by useAuth or parent

    useEffect(() => {
        if (user) {
            fetchOwnerData();
        }
    }, [user]);

    const fetchOwnerData = async () => {
        try {
            setLoading(true);
            const { data: locs, error: locError } = await supabase
                .from('locations')
                .select('*')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false });

            if (locError) { console.error(locError); return; }
            setLocations(locs || []);

            if (locs && locs.length > 0) {
                const locationIds = locs.map(l => l.id);
                // Step 3: Fetch bookings where location_id IN (owner_location_ids)
                const { data: bks, error: bkError } = await supabase
                    .from('bookings')
                    .select('*, locations(name), users(name, email)') // Corrected select string
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

    // Derived Stats
    const totalProperties = locations.length;
    // Active = Scheduled or Started
    const activeBookingsCount = bookings.filter(b => ['Scheduled', 'Started'].includes(b.status)).length;

    // Real-time updates for Locations
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('owner-locations')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'locations', filter: `owner_id = eq.${user.id} ` },
                () => {
                    fetchOwnerData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Real-time updates for Bookings
    useEffect(() => {
        if (!user) return;

        const bookingsChannel = supabase
            .channel('owner-bookings')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bookings' },
                () => {
                    fetchOwnerData();
                }
            )
            .subscribe();

        // Polling interaction fallback
        const interval = setInterval(() => {
            fetchOwnerData();
        }, 15000);

        return () => {
            supabase.removeChannel(bookingsChannel);
            clearInterval(interval);
        };
    }, [user]);

    const handleAddLocation = async (e) => {
        e.preventDefault();

        if (!isApproved) {
            alert("You must be approved by an admin to list properties.");
            return;
        }

        try {
            const { error } = await supabase.from('locations').insert([{
                owner_id: user.id,
                name: newLoc.name,
                address: newLoc.address,
                city: newLoc.city,
                type: newLoc.type,
                price_per_hour: parseFloat(newLoc.price || 0),
                total_slots: parseInt(newLoc.slots || 0),
                available_slots: parseInt(newLoc.slots || 0),

                // New Fields
                car_total_slots: parseInt(newLoc.car_slots || 0),
                car_available_slots: parseInt(newLoc.car_slots || 0),
                car_price_per_hour: parseFloat(newLoc.car_price || 0),

                bike_total_slots: parseInt(newLoc.bike_slots || 0),
                bike_available_slots: parseInt(newLoc.bike_slots || 0),
                bike_price_per_hour: parseFloat(newLoc.bike_price || 0)
            }]);

            if (error) throw error;

            alert('Location added successfully!');
            setIsAddModalOpen(false);
            setNewLoc({
                name: '', address: '', city: '', type: 'parking', price: '', slots: '',
                car_slots: '', car_price: '', bike_slots: '', bike_price: ''
            });
            fetchOwnerData(); // Refresh list

        } catch (error) {
            alert('Error adding location: ' + error.message);
        }
    };

    const handleEditLocation = async (e) => {
        e.preventDefault();
        if (!editingLoc) return;

        try {
            const updates = {
                name: editingLoc.name,
                address: editingLoc.address,
                city: editingLoc.city,
                type: editingLoc.type,
                price_per_hour: parseFloat(editingLoc.price_per_hour || 0),
                total_slots: parseInt(editingLoc.total_slots || 0),
            };

            if (editingLoc.type === 'parking') {
                updates.car_total_slots = parseInt(editingLoc.car_total_slots || 0);
                updates.car_price_per_hour = parseFloat(editingLoc.car_price_per_hour || 0);
                updates.bike_total_slots = parseInt(editingLoc.bike_total_slots || 0);
                updates.bike_price_per_hour = parseFloat(editingLoc.bike_price_per_hour || 0);

                // Recalculate Available Slots based on active bookings and new Total
                const { count: carActive } = await supabase
                    .from('bookings')
                    .select('id', { count: 'exact', head: true })
                    .eq('location_id', editingLoc.id)
                    .in('status', ['Scheduled', 'Started'])
                    .eq('vehicle_type', 'car');

                const { count: bikeActive } = await supabase
                    .from('bookings')
                    .select('id', { count: 'exact', head: true })
                    .eq('location_id', editingLoc.id)
                    .in('status', ['Scheduled', 'Started'])
                    .eq('vehicle_type', 'bike');

                updates.car_available_slots = Math.max(0, updates.car_total_slots - (carActive || 0));
                updates.bike_available_slots = Math.max(0, updates.bike_total_slots - (bikeActive || 0));

                // For 'parking' type, legacy total/available slots are less relevant but let's keep them synced to sum
                updates.total_slots = updates.car_total_slots + updates.bike_total_slots;
                updates.available_slots = updates.car_available_slots + updates.bike_available_slots;
            } else {
                // EV or Legacy
                const { count: activeCount } = await supabase
                    .from('bookings')
                    .select('id', { count: 'exact', head: true })
                    .eq('location_id', editingLoc.id)
                    .in('status', ['Scheduled', 'Started']);

                updates.available_slots = Math.max(0, updates.total_slots - (activeCount || 0));
            }

            const { error } = await supabase
                .from('locations')
                .update(updates)
                .eq('id', editingLoc.id);

            if (error) throw error;

            alert('Property updated successfully!');
            setIsEditModalOpen(false);
            setEditingLoc(null);
            fetchOwnerData();

        } catch (error) {
            alert('Error updating location: ' + error.message);
        }
    };

    const openEditModal = (loc) => {
        setEditingLoc(loc);
        setIsEditModalOpen(true);
    };

    const handleStatusChange = async (bookingId, newStatus, locationId) => {
        try {
            // Find current booking to get old status
            const booking = bookings.find(b => b.id === bookingId);
            const oldStatus = booking?.status || 'Scheduled';

            if (oldStatus === newStatus) return;

            // 1. Update booking status
            const { error: bookingError } = await supabase
                .from('bookings')
                .update({ status: newStatus })
                .eq('id', bookingId);

            if (bookingError) throw bookingError;

            // 2. Update location slots logic (Robust Recalculation)
            const { count: activeCount, error: countError } = await supabase
                .from('bookings')
                .select('id', { count: 'exact', head: true })
                .eq('location_id', locationId)
                .in('status', ['Scheduled', 'Started']);

            if (!countError) {
                const { data: locationData, error: locFetchError } = await supabase
                    .from('locations')
                    .select('total_slots')
                    .eq('id', locationId)
                    .single();

                if (!locFetchError && locationData) {
                    const newAvailable = Math.max(0, locationData.total_slots - activeCount);

                    const { error: slotUpdateError } = await supabase
                        .from('locations')
                        .update({ available_slots: newAvailable })
                        .eq('id', locationId);

                    if (slotUpdateError) console.error("Failed to update slots:", slotUpdateError);
                }
            }

            // Optimistic update for UI
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));

        } catch (error) {
            console.error("Status update failed:", error);
            alert("Failed to update status");
        }
    };

    const recalculateSlots = async (locationId) => {
        try {
            console.log("Recalculating slots for:", locationId);

            // 1. Fetch Location details to know type and totals
            const { data: loc, error: locError } = await supabase
                .from('locations')
                .select('*')
                .eq('id', locationId)
                .single();

            if (locError) throw locError;

            let updates = {};

            if (loc.type === 'parking') {
                // Count Car Bookings
                const { count: carCount } = await supabase
                    .from('bookings')
                    .select('id', { count: 'exact', head: true })
                    .eq('location_id', locationId)
                    .in('status', ['Scheduled', 'Started'])
                    .eq('vehicle_type', 'car');

                // Count Bike Bookings
                const { count: bikeCount } = await supabase
                    .from('bookings')
                    .select('id', { count: 'exact', head: true })
                    .eq('location_id', locationId)
                    .in('status', ['Scheduled', 'Started'])
                    .eq('vehicle_type', 'bike');

                const newCarAvailable = Math.max(0, (loc.car_total_slots || 0) - (carCount || 0));
                const newBikeAvailable = Math.max(0, (loc.bike_total_slots || 0) - (bikeCount || 0));

                updates.car_available_slots = newCarAvailable;
                updates.bike_available_slots = newBikeAvailable;

                // Sync legacy columns
                updates.available_slots = updates.car_available_slots + updates.bike_available_slots;

            } else {
                // Legacy / EV Logic
                const { count: activeCount } = await supabase
                    .from('bookings')
                    .select('id', { count: 'exact', head: true })
                    .eq('location_id', locationId)
                    .in('status', ['Scheduled', 'Started']);

                updates.available_slots = Math.max(0, (loc.total_slots || 0) - (activeCount || 0));
            }

            const { error: updateError } = await supabase
                .from('locations')
                .update(updates)
                .eq('id', locationId);

            if (updateError) throw updateError;

            alert("Slots synced successfully!");
            fetchOwnerData();
        } catch (error) {
            console.error("Sync failed:", error);
            alert("Failed to sync slots: " + error.message);
        }
    };


    // Stats
    const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

    if (authLoading || loading) return <div className="p-20 text-center text-4xl font-bold animate-pulse">Loading Portal...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Owner Header */}
            <div className="bg-primary text-white py-8 px-4 shadow-lg">
                <div className="presentation-container flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-extrabold mb-1 tracking-tight">Owner Portal</h1>
                        <p className="text-xs opacity-90 font-light">Manage your properties and bookings</p>
                    </div>
                    <div className="flex space-x-6 text-center bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                        <div>
                            <p className="text-xl font-extrabold">{locations.length}</p>
                            <p className="opacity-80 text-[10px] uppercase tracking-wider font-bold mt-0.5">Properties</p>
                        </div>
                        <div className="w-px bg-white/20 mx-2"></div>
                        <div>
                            <p className="text-xl font-extrabold">{bookings.length}</p>
                            <p className="opacity-80 text-[10px] uppercase tracking-wider font-bold mt-0.5">Bookings</p>
                        </div>
                        <div className="w-px bg-white/20 mx-2"></div>
                        <div>
                            <p className="text-xl font-extrabold text-secondary">₹{totalRevenue}</p>
                            <p className="opacity-80 text-[10px] uppercase tracking-wider font-bold mt-0.5">Earnings</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="presentation-container py-6 space-y-8">

                {/* Section A: My Locations */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-extrabold text-gray-900">My Locations</h2>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="btn-secondary text-xs px-3 py-1.5"
                        >
                            <PlusCircle className="mr-1.5" size={14} /> Add New Property
                        </button>
                    </div>

                    {locations.length === 0 ? (
                        <div className="bg-white p-8 rounded-lg text-center shadow-sm border border-dashed border-gray-300">
                            <Building2 className="mx-auto text-gray-300 mb-3" size={32} />
                            <p className="text-sm text-gray-400 font-bold mb-1">You have no properties listed.</p>
                            <p className="text-xs text-gray-400">Add your first parking spot to start earning.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {locations.map(loc => (
                                <div key={loc.id} className="card group relative overflow-hidden p-4">
                                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEditModal(loc); }}
                                            className="bg-white/90 p-1.5 rounded-full shadow-lg hover:bg-white text-primary"
                                        >
                                            <Edit size={14} />
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{loc.name}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${loc.type === 'ev' ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {loc.type}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3 flex items-center">
                                        <MapPin size={12} className="mr-1 text-gray-400" /> {loc.address}, {loc.city}
                                    </p>
                                    <div className="flex justify-between items-center text-sm font-medium border-t border-gray-100 pt-3 mt-auto">
                                        {loc.type === 'parking' ? (
                                            <div className="w-full">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">🚗 <span className="font-bold text-gray-900">{loc.car_available_slots}/{loc.car_total_slots}</span></span>
                                                    <span className="text-xs font-bold text-primary">₹{loc.car_price_per_hour}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">🏍️ <span className="font-bold text-gray-900">{loc.bike_available_slots}/{loc.bike_total_slots}</span></span>
                                                    <span className="text-xs font-bold text-primary">₹{loc.bike_price_per_hour}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded-md text-[10px]">Slots: <span className="text-gray-900 font-bold">{loc.available_slots}/{loc.total_slots}</span></span>
                                                <span className="text-primary font-extrabold text-lg">₹{loc.price_per_hour}<span className="text-[10px] text-gray-400 font-medium">/hr</span></span>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => openEditModal(loc)}
                                            className="flex-1 py-1.5 bg-gray-50 text-gray-600 font-bold rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center text-xs"
                                        >
                                            <Edit size={12} className="mr-1" /> Edit
                                        </button>
                                        <button
                                            onClick={() => recalculateSlots(loc.id)}
                                            className="flex-1 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center text-xs"
                                            title="Force Sync Slot Count"
                                        >
                                            <CheckCircle size={12} className="mr-1" /> Sync
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Dashboard Statistics */}
                <div className="relative">
                    {/* Approval Status Banner */}
                    {!isApproved && (
                        <div className="absolute top-0 left-0 right-0 -mt-3 bg-yellow-400 text-yellow-900 px-3 py-1.5 rounded-t-xl font-bold flex items-center justify-center z-20 shadow-sm animate-pulse text-xs">
                            <Shield className="mr-1.5" size={14} />
                            <span>Approval Pending – You cannot add properties yet.</span>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-secondary transform -skew-y-2 origin-top-left translate-y-10 h-32 -z-10 opacity-5"></div>
                    <div className={`bg-white rounded-xl shadow-sm p-5 border border-gray-100 relative overflow-hidden ${!isApproved ? 'rounded-t-none mt-3' : ''}`}>
                        {/* Section B: Bookings for My Locations */}
                        <section>
                            <h2 className="text-xl font-extrabold text-gray-900 mb-4">Recent Bookings Management</h2>
                            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                                {bookings.length === 0 ? (
                                    <div className="p-8 text-center text-sm text-gray-400 font-bold">No bookings yet.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="table-header text-[10px] px-3 py-2">Booking ID</th>
                                                    <th className="table-header text-[10px] px-3 py-2">Customer</th>
                                                    <th className="table-header text-[10px] px-3 py-2">Veh</th>
                                                    <th className="table-header text-[10px] px-3 py-2">Location / Date</th>
                                                    <th className="table-header text-[10px] px-3 py-2">Slot</th>
                                                    <th className="table-header text-[10px] px-3 py-2">Amount</th>
                                                    <th className="table-header text-[10px] px-3 py-2">Status Control</th>
                                                    <th className="table-header text-[10px] px-3 py-2 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {bookings.map((booking) => (
                                                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="table-cell px-3 py-2 font-mono text-gray-500 text-[10px]">
                                                            #{booking.id.slice(0, 6)}
                                                            <div className="text-[10px] mt-0.5 text-gray-400 font-sans">
                                                                {format(new Date(booking.created_at), 'MMM d, yyyy')}
                                                            </div>
                                                        </td>
                                                        <td className="table-cell px-3 py-2">
                                                            <div className="font-bold text-gray-900 text-xs">{booking.users?.name || 'User'}</div>
                                                            <div className="text-gray-500 text-[10px]">{booking.users?.email}</div>
                                                        </td>
                                                        <td className="table-cell px-3 py-2 text-center">
                                                            {booking.vehicle_type === 'bike' ? (
                                                                <span title="Bike" className="inline-flex items-center justify-center w-6 h-6 bg-orange-100 text-orange-600 rounded-full">
                                                                    <Bike size={14} />
                                                                </span>
                                                            ) : (
                                                                <span title="Car" className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full">
                                                                    <Car size={14} />
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="table-cell px-3 py-2">
                                                            <div className="font-bold text-primary mb-0.5 text-xs">{booking.locations?.name}</div>
                                                            <div className="flex items-center text-gray-600 text-[10px]">
                                                                <Calendar className="mr-1" size={10} />
                                                                {format(new Date(booking.start_time), 'MMM d, h:mm a')}
                                                            </div>
                                                        </td>
                                                        <td className="table-cell px-3 py-2">
                                                            {booking.selected_slot ? (
                                                                <span className="bg-blue-100 text-blue-800 py-0.5 px-1.5 rounded-full font-bold text-[10px] border border-blue-200">
                                                                    {booking.selected_slot}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400 font-mono text-[10px]">--</span>
                                                            )}
                                                        </td>
                                                        <td className="table-cell px-3 py-2">
                                                            <div className="font-bold text-gray-900 text-xs text-green-600">₹{booking.amount}</div>
                                                        </td>
                                                        <td className="table-cell px-3 py-2">
                                                            <div className="flex items-center gap-2">
                                                                <select
                                                                    value={booking.status || 'Scheduled'}
                                                                    onChange={(e) => handleStatusChange(booking.id, e.target.value, booking.location_id)}
                                                                    disabled={booking.status === 'Cancelled'}
                                                                    className={`p-1 pr-6 rounded-md font-bold border cursor-pointer outline-none focus:ring-2 focus:ring-opacity-50 transition-all text-[10px] ${booking.status === 'Completed' ? 'border-green-200 bg-green-50 text-green-800' :
                                                                        booking.status === 'Cancelled' ? 'border-red-200 bg-red-50 text-red-800' :
                                                                            booking.status === 'Started' ? 'border-blue-200 bg-blue-50 text-blue-800' :
                                                                                'border-gray-200 bg-white text-gray-700'
                                                                        }`}
                                                                >
                                                                    <option value="Scheduled">Scheduled</option>
                                                                    <option value="Started">Started</option>
                                                                    <option value="Completed">Completed</option>
                                                                    {booking.status === 'Cancelled' && <option value="Cancelled">Cancelled</option>}
                                                                </select>
                                                                {booking.status !== 'Cancelled' && booking.status !== 'Completed' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            if (confirm('Are you sure you want to cancel this booking? This will free up the slot.')) {
                                                                                handleStatusChange(booking.id, 'Cancelled', booking.location_id);
                                                                            }
                                                                        }}
                                                                        className="btn-sm bg-red-100 text-red-600 hover:bg-red-200 inline-flex items-center text-[10px] px-2 py-1 rounded-md transition-colors whitespace-nowrap"
                                                                        title="Cancel Booking"
                                                                    >
                                                                        <X size={12} className="mr-1" /> Cancel
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="table-cell px-3 py-2 text-right whitespace-nowrap">
                                                            <button
                                                                onClick={() => setSelectedBarcodeBooking(booking)}
                                                                className="btn-sm bg-gray-900 text-white hover:bg-black inline-flex items-center text-[10px] px-2 py-1 mr-2 rounded-md transition-colors"
                                                                title="View Barcode"
                                                            >
                                                                <QrCode size={12} className="mr-1" /> Barcode
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm('Are you VERY sure you want to completely DELETE this booking record? This action cannot be undone.')) {
                                                                        try {
                                                                            // If active, free up slot first
                                                                            if (booking.status === 'Scheduled' || booking.status === 'Started') {
                                                                                await handleStatusChange(booking.id, 'Cancelled', booking.location_id);
                                                                            }

                                                                            // Delete payments first (foreign key constraint)
                                                                            await supabase.from('payments').delete().eq('booking_id', booking.id);

                                                                            // Delete booking
                                                                            const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
                                                                            if (error) throw error;

                                                                            fetchOwnerData();
                                                                            alert('Booking deleted successfully.');
                                                                        } catch (err) {
                                                                            console.error("Error deleting booking:", err);
                                                                            alert("Failed to delete booking: " + err.message);
                                                                        }
                                                                    }
                                                                }}
                                                                className="btn-sm bg-red-50 text-red-600 hover:bg-red-600 hover:text-white inline-flex items-center text-[10px] px-2 py-1 rounded-md transition-colors"
                                                                title="Delete Booking Record"
                                                            >
                                                                <Trash2 size={12} className="mr-1" /> Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Add Location Modal */}
                    {isAddModalOpen && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                            <div className="bg-white/90 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] shadow-2xl max-w-2xl w-full p-12 relative animate-in fade-in zoom-in duration-300">
                                <button onClick={() => setIsAddModalOpen(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors">
                                    <X size={36} />
                                </button>
                                <h2 className="text-4xl font-extrabold mb-10 text-gray-900">Add New Property</h2>
                                <form onSubmit={handleAddLocation} className="space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-gray-700 font-bold mb-2">Property Name</label>
                                            <input type="text" required
                                                className="w-full p-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                value={newLoc.name} onChange={e => setNewLoc({ ...newLoc, name: e.target.value })} placeholder="e.g. Downtown Garage" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 font-bold mb-2">Type</label>
                                            <select
                                                className="w-full p-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                value={newLoc.type} onChange={e => setNewLoc({ ...newLoc, type: e.target.value })}>
                                                <option value="parking">Parking</option>
                                                <option value="ev">EV Charging</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-bold mb-2">Address</label>
                                        <input type="text" required
                                            className="w-full p-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            value={newLoc.address} onChange={e => setNewLoc({ ...newLoc, address: e.target.value })} placeholder="Street Address" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-bold mb-2">City</label>
                                        <input type="text" required
                                            className="w-full p-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            value={newLoc.city} onChange={e => setNewLoc({ ...newLoc, city: e.target.value })} placeholder="City" />
                                    </div>

                                    {newLoc.type === 'parking' ? (
                                        <>
                                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                                <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">🚗 Car Settings</h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-gray-600 font-bold mb-1 text-xs">Total Slots</label>
                                                        <input type="number" required
                                                            className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                                                            value={newLoc.car_slots} onChange={e => setNewLoc({ ...newLoc, car_slots: e.target.value })} placeholder="10" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-600 font-bold mb-1 text-xs">Price/Hr (₹)</label>
                                                        <input type="number" required
                                                            className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                                                            value={newLoc.car_price} onChange={e => setNewLoc({ ...newLoc, car_price: e.target.value })} placeholder="50" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                                <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">🏍️ Bike Settings</h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-gray-600 font-bold mb-1 text-xs">Total Slots</label>
                                                        <input type="number" required
                                                            className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                                                            value={newLoc.bike_slots} onChange={e => setNewLoc({ ...newLoc, bike_slots: e.target.value })} placeholder="20" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-600 font-bold mb-1 text-xs">Price/Hr (₹)</label>
                                                        <input type="number" required
                                                            className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                                                            value={newLoc.bike_price} onChange={e => setNewLoc({ ...newLoc, bike_price: e.target.value })} placeholder="20" />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-gray-700 font-bold mb-2">Price/Hr (₹)</label>
                                                <input type="number" required
                                                    className="w-full p-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                    value={newLoc.price} onChange={e => setNewLoc({ ...newLoc, price: e.target.value })} placeholder="0.00" />
                                            </div>
                                            <div>
                                                <label className="block text-gray-700 font-bold mb-2">Total Slots</label>
                                                <input type="number" required
                                                    className="w-full p-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                    value={newLoc.slots} onChange={e => setNewLoc({ ...newLoc, slots: e.target.value })} placeholder="10" />
                                            </div>
                                        </div>
                                    )}
                                    <button type="submit" className="w-full btn-secondary py-5 text-2xl mt-6">
                                        Publish Location
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Edit Location Modal */}
                    {isEditModalOpen && editingLoc && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                            <div className="bg-white/90 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] shadow-2xl max-w-2xl w-full p-12 relative animate-in fade-in zoom-in duration-300">
                                <button onClick={() => setIsEditModalOpen(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors">
                                    <X size={36} />
                                </button>
                                <h2 className="text-4xl font-extrabold mb-10 text-gray-900">Edit Property</h2>
                                <form onSubmit={handleEditLocation} className="space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label>Property Name</label>
                                            <input type="text" required
                                                className="w-full p-4 border border-gray-300 rounded-xl text-lg"
                                                value={editingLoc.name} onChange={e => setEditingLoc({ ...editingLoc, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label>Type</label>
                                            <select
                                                className="w-full p-4 border border-gray-300 rounded-xl text-lg"
                                                value={editingLoc.type} onChange={e => setEditingLoc({ ...editingLoc, type: e.target.value })}>
                                                <option value="parking">Parking</option>
                                                <option value="ev">EV Charging</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label>Address</label>
                                        <input type="text" required
                                            className="w-full p-4 border border-gray-300 rounded-xl text-lg"
                                            value={editingLoc.address} onChange={e => setEditingLoc({ ...editingLoc, address: e.target.value })} />
                                    </div>
                                    {editingLoc.type === 'parking' ? (
                                        <>
                                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                                <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">🚗 Car Settings</h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-gray-600 font-bold mb-1 text-xs">Total Slots</label>
                                                        <input type="number" required
                                                            className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                                                            value={editingLoc.car_total_slots} onChange={e => setEditingLoc({ ...editingLoc, car_total_slots: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-600 font-bold mb-1 text-xs">Price/Hr (₹)</label>
                                                        <input type="number" required
                                                            className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                                                            value={editingLoc.car_price_per_hour} onChange={e => setEditingLoc({ ...editingLoc, car_price_per_hour: e.target.value })} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                                <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">🏍️ Bike Settings</h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-gray-600 font-bold mb-1 text-xs">Total Slots</label>
                                                        <input type="number" required
                                                            className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                                                            value={editingLoc.bike_total_slots} onChange={e => setEditingLoc({ ...editingLoc, bike_total_slots: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-600 font-bold mb-1 text-xs">Price/Hr (₹)</label>
                                                        <input type="number" required
                                                            className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                                                            value={editingLoc.bike_price_per_hour} onChange={e => setEditingLoc({ ...editingLoc, bike_price_per_hour: e.target.value })} />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <label>Price/Hr (₹)</label>
                                                <input type="number" required
                                                    className="w-full p-4 border border-gray-300 rounded-xl text-lg"
                                                    value={editingLoc.price_per_hour} onChange={e => setEditingLoc({ ...editingLoc, price_per_hour: e.target.value })} />
                                            </div>
                                            <div>
                                                <label>Total Slots</label>
                                                <input type="number" required
                                                    className="w-full p-4 border border-gray-300 rounded-xl text-lg"
                                                    value={editingLoc.total_slots} onChange={e => setEditingLoc({ ...editingLoc, total_slots: e.target.value })} />
                                            </div>
                                        </div>
                                    )}
                                    <button type="submit" className="w-full btn-primary py-5 text-2xl mt-6">
                                        Save Changes
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Barcode Modal */}
                    <BarcodeModal
                        booking={selectedBarcodeBooking}
                        onClose={() => setSelectedBarcodeBooking(null)}
                    />
                </div>
            </div>
        </div>
    );
};

export default OwnerPortal;
