
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit, Trash2, MapPin, Calendar, DollarSign, BarChart3, Clock, CheckCircle, X, Shield, Filter, Search, ChevronDown, ChevronUp, LogOut, QrCode, Car, Bike, PlusCircle, Building2, User } from 'lucide-react';
import { format } from 'date-fns';
import BarcodeModal from '../../components/BarcodeModal';
import { uploadLocationImage } from '../../utils/uploadImage';
import { geocodeAddress } from '../../utils/geoapify';

const OwnerPortal = () => {
    const { user, approvalStatus } = useAuth(); // Get approval status
    const [locations, setLocations] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [stats, setStats] = useState({ revenue: 0, occupancy: 0, rating: 0 });
    const [loading, setLoading] = useState(true);
    const lastFetchRef = useRef(0)

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
        bike_price: '',
        charging_type: null,
        charging_speed_kw: '',
        latitude: null,
        longitude: null,
        area: ''
    });

    const [editingLoc, setEditingLoc] = useState({
        name: '', address: '', city: '', area: '', type: 'parking', price: '', slots: '', latitude: null, longitude: null
    });

    // Image Upload State
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageUploading, setImageUploading] = useState(false);
    const [imageError, setImageError] = useState(null);
    const [existingImageUrl, setExistingImageUrl] = useState(null);
    const [geocodingAddress, setGeocodingAddress] = useState(false);
    const [geocodingStatus, setGeocodingStatus] = useState(null); // 'loading', 'success', 'error'

    const isApproved = approvalStatus === 'approved';
    const authLoading = false; // Assuming handled by useAuth or parent

    useEffect(() => {
        if (user) {
            fetchOwnerData();
        }
    }, [user]);

    const fetchOwnerData = async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            setLoading(false);
        }, 15000); // Reduced from 30s to 15s

        try {
            setLoading(true);
            const { data: locs, error: locError } = await supabase
                .from('locations')
                .select('*')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false })
                .abortSignal(controller.signal);

            if (locError) throw locError;
            setLocations(locs || []);

            if (locs && locs.length > 0) {
                const locationIds = locs.map(l => l.id);
                const { data: bks, error: bkError } = await supabase
                    .from('bookings')
                    .select('*, locations(name), users(name, email)')
                    .in('location_id', locationIds)
                    .order('created_at', { ascending: false })
                    .abortSignal(controller.signal);

                if (bkError) throw bkError;
                setBookings(bks || []);
            } else {
                setBookings([]);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn("VOLTPARK: Owner data fetch timed out");
            } else {
                console.error("Error fetching owner data:", error);
            }
        } finally {
            clearTimeout(timeoutId);
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
                    const now = Date.now()
                    if (now - lastFetchRef.current > 2000) {
                        lastFetchRef.current = now
                        fetchOwnerData();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Real-time updates for Bookings (no polling needed)
    useEffect(() => {
        if (!user) return;

        const bookingsChannel = supabase
            .channel('owner-bookings')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bookings' },
                () => {
                    const now = Date.now()
                    if (now - lastFetchRef.current > 2000) {
                        lastFetchRef.current = now
                        fetchOwnerData();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(bookingsChannel);
        };
    }, [user]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = [
            'image/jpeg', 'image/jpg',
            'image/png', 'image/webp'
        ];

        if (!allowedTypes.includes(file.type)) {
            setImageError(
                'Invalid file type. Please upload JPG, PNG or WebP.'
            );
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setImageError('File too large. Maximum size is 5MB.');
            return;
        }

        setImageError(null);
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleAddressBlur = async () => {
        if (!newLoc.address || !newLoc.city) return;
        
        setGeocodingAddress(true);
        setGeocodingStatus('loading');
        
        try {
            const fullAddress = `${newLoc.address}, ${newLoc.area || ''}, ${newLoc.city}, India`;
            const result = await geocodeAddress(fullAddress);
            if (result) {
                setNewLoc(prev => ({ 
                    ...prev, 
                    latitude: result.lat, 
                    longitude: result.lng 
                }));
                setGeocodingStatus('success');
            } else {
                setGeocodingStatus('error');
            }
        } catch (err) {
            console.error("Geocoding error:", err);
            setGeocodingStatus('error');
        } finally {
            setGeocodingAddress(false);
            // Clear success message after 3s
            setTimeout(() => setGeocodingStatus(null), 3000);
        }
    };

    const handleEditAddressBlur = async () => {
        if (!editingLoc.address || !editingLoc.city) return;
        
        setGeocodingAddress(true);
        setGeocodingStatus('loading');
        
        try {
            const fullAddress = `${editingLoc.address}, ${editingLoc.area || ''}, ${editingLoc.city}, India`;
            const result = await geocodeAddress(fullAddress);
            if (result) {
                setEditingLoc(prev => ({ 
                    ...prev, 
                    latitude: result.lat, 
                    longitude: result.lng 
                }));
                setGeocodingStatus('success');
            } else {
                setGeocodingStatus('error');
            }
        } catch (err) {
            console.error("Geocoding error:", err);
            setGeocodingStatus('error');
        } finally {
            setGeocodingAddress(false);
            setTimeout(() => setGeocodingStatus(null), 3000);
        }
    };

    const handleAddLocation = async (e) => {
        e.preventDefault();

        if (!isApproved) {
            alert("You must be approved by an admin to list properties.");
            return;
        }

        try {
            let imageUrl = null;

            if (imageFile) {
                setImageUploading(true);
                try {
                    // Use a temporary ID for new properties
                    const tempId = crypto.randomUUID();
                    imageUrl = await uploadLocationImage(
                        imageFile,
                        tempId
                    );
                } catch (err) {
                    setImageError(err.message);
                    setImageUploading(false);
                    return;
                }
                setImageUploading(false);
            }

            const { error } = await supabase.from('locations').insert([{
                owner_id: user.id,
                name: newLoc.name,
                address: newLoc.address,
                area: newLoc.area,
                city: newLoc.city,
                type: newLoc.type,
                price_per_hour: parseFloat(newLoc.price || 0),
                total_slots: parseInt(newLoc.slots || 0),
                latitude: newLoc.latitude,
                longitude: newLoc.longitude,
                available_slots: parseInt(newLoc.slots || 0),

                // New Fields
                car_total_slots: parseInt(newLoc.car_slots || 0),
                car_available_slots: parseInt(newLoc.car_slots || 0),
                car_price_per_hour: parseFloat(newLoc.car_price || 0),

                bike_total_slots: parseInt(newLoc.bike_slots || 0),
                bike_available_slots: parseInt(newLoc.bike_slots || 0),
                bike_price_per_hour: parseFloat(newLoc.bike_price || 0),
                charge_type: newLoc.charging_type,
                charging_speed_kw: newLoc.charging_speed_kw ? parseFloat(newLoc.charging_speed_kw) : null,
                image_url: imageUrl,
                latitude: newLoc.latitude,
                longitude: newLoc.longitude
            }]);

            if (error) throw error;

            alert('Location added successfully!');
            setIsAddModalOpen(false);
            setNewLoc({
                name: '', address: '', city: '', type: 'parking', price: '', slots: '',
                car_slots: '', car_price: '', bike_slots: '', bike_price: '',
                latitude: null, longitude: null
            });
            setImageFile(null);
            setImagePreview(null);
            setImageError(null);
            fetchOwnerData(); // Refresh list

        } catch (error) {
            alert('Error adding location: ' + error.message);
        }
    };

    const handleEditLocation = async (e) => {
        e.preventDefault();
        if (!editingLoc) return;

        try {
            let finalImageUrl = editingLoc.image_url;

            // Handle image changes
            if (imageFile) {
                setImageUploading(true);
                try {
                    // Delete old image if it exists
                    if (existingImageUrl) {
                        await deleteLocationImage(existingImageUrl);
                    }

                    // Upload new image
                    finalImageUrl = await uploadLocationImage(
                        imageFile,
                        editingLoc.id
                    );
                } catch (err) {
                    setImageError(err.message);
                    setImageUploading(false);
                    return;
                }
                setImageUploading(false);
            } else if (!imagePreview && existingImageUrl) {
                // Image was removed
                await deleteLocationImage(existingImageUrl);
                finalImageUrl = null;
            }

            const updates = {
                name: editingLoc.name,
                address: editingLoc.address,
                area: editingLoc.area,
                city: editingLoc.city,
                type: editingLoc.type,
                latitude: editingLoc.latitude,
                longitude: editingLoc.longitude,
                price_per_hour: parseFloat(editingLoc.price_per_hour || 0),
                total_slots: parseInt(editingLoc.total_slots || 0),
                charging_type: editingLoc.charging_type,
                charging_speed_kw: editingLoc.charging_speed_kw ? parseFloat(editingLoc.charging_speed_kw) : null,
                image_url: finalImageUrl
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
            setImageFile(null);
            setImagePreview(null);
            setExistingImageUrl(null);
            fetchOwnerData();

        } catch (error) {
            alert('Error updating location: ' + error.message);
        }
    };

    const openEditModal = (loc) => {
        setEditingLoc({
            ...loc,
            area: loc.area || '',
            latitude: loc.latitude || null,
            longitude: loc.longitude || null
        });
        setImagePreview(loc.image_url || null);
        setExistingImageUrl(loc.image_url || null);
        setImageFile(null);
        setImageError(null);
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
                <div className="presentation-container flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-extrabold mb-1 tracking-tight">Owner Portal</h1>
                        <p className="text-xs opacity-90 font-light mb-3">Manage your properties and bookings</p>
                        <div className="flex gap-2">
                            <Link 
                                to="/owner/profile" 
                                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10 transition-all flex items-center gap-2 w-fit group"
                            >
                                <User size={14} className="group-hover:text-secondary transition-colors" />
                                <span className="text-xs font-bold">My Owner Profile</span>
                            </Link>
                            <Link 
                                to="/owner/analysis" 
                                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10 transition-all flex items-center gap-2 w-fit group"
                            >
                                <BarChart3 size={14} className="group-hover:text-secondary transition-colors" />
                                <span className="text-xs font-bold">Analytics Dashboard</span>
                            </Link>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10 w-full md:w-auto">
                        <div>
                            <p className="text-xl font-extrabold">{locations.length}</p>
                            <p className="opacity-80 text-[10px] uppercase tracking-wider font-bold mt-0.5">Properties</p>
                        </div>
                        <div>
                            <p className="text-xl font-extrabold">{bookings.length}</p>
                            <p className="opacity-80 text-[10px] uppercase tracking-wider font-bold mt-0.5">Bookings</p>
                        </div>
                        <div>
                            <p className="text-xl font-extrabold text-secondary">Rs.{totalRevenue}</p>
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
                                        <MapPin size={12} className="mr-1" /> {loc.address}, {loc.city}
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
                                                                    style={{
                                                                        background: '#ffffff',
                                                                        color: '#1e293b',
                                                                        border: '1px solid #e2e8f0',
                                                                        borderRadius: '8px',
                                                                        padding: '6px 32px 6px 12px',
                                                                        fontSize: '13px',
                                                                        fontWeight: 600,
                                                                        fontFamily: 'inherit',
                                                                        letterSpacing: '0.03em',
                                                                        cursor: 'pointer',
                                                                        appearance: 'none',
                                                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                                                                        backgroundRepeat: 'no-repeat',
                                                                        backgroundPosition: 'right 10px center',
                                                                        outline: 'none',
                                                                        minWidth: '140px',
                                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                                    }}
                                                                >
                                                                    <option value="Scheduled" style={{ color: '#64748b' }}>Scheduled</option>
                                                                    <option value="Started"   style={{ color: '#0284c7' }}>Started</option>
                                                                    <option value="Cancelled" style={{ color: '#dc2626' }}>Cancelled</option>
                                                                    <option value="Completed" style={{ color: '#16a34a' }}>Completed</option>
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
                                                                            const { data, error } = await supabase
                                                                                .rpc('delete_booking_by_owner', {
                                                                                    p_booking_id: booking.id,
                                                                                    p_owner_id: user.id
                                                                                });

                                                                            if (error) throw error;

                                                                            if (!data.success) {
                                                                                alert(data.error || 'Failed to delete booking.');
                                                                                return;
                                                                            }

                                                                            // Remove from local state instantly
                                                                            setBookings(prev => prev.filter(b => b.id !== booking.id));
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
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-2 sm:p-4 backdrop-blur-sm">
                            <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-[2rem] shadow-2xl max-w-2xl w-full flex flex-col relative max-h-[90vh] overflow-hidden">
                                {/* Sticky Header */}
                                <div className="flex items-center justify-between p-5 sm:p-8 border-b border-gray-100 bg-white z-10 sticky top-0">
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">Add New Property</h2>
                                    <button onClick={() => setIsAddModalOpen(false)} aria-label="Close" className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-full transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                                {/* Scrollable Form Content */}
                                <form onSubmit={handleAddLocation} className="space-y-5 p-5 sm:p-8 overflow-y-auto flex-1">
                                    {/* Image Upload Section - Moved to Top */}
                                    <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 mb-6">
                                        <label className="block text-gray-700 font-bold mb-3 flex items-center gap-2">
                                            <PlusCircle size={18} className="text-primary" /> Property Image
                                        </label>

                                        <div
                                            onClick={() => document.getElementById('location-image-input').click()}
                                            className={`relative h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-white/80 ${imagePreview ? 'border-primary bg-primary/5' : 'border-gray-300 bg-white'}`}
                                        >
                                            {imagePreview ? (
                                                <>
                                                    <img
                                                        src={imagePreview}
                                                        alt="Location preview"
                                                        className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-20"
                                                    />
                                                    <div className="relative z-10 flex flex-col items-center">
                                                        <Plus size={32} className="text-primary mb-2" />
                                                        <span className="text-sm font-bold text-primary">Change Image</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="text-gray-400 mb-2" size={32} />
                                                    <span className="text-sm font-bold text-gray-500">Add Property Image</span>
                                                    <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">JPG, PNG, WEBP (Max 5MB)</span>
                                                </>
                                            )}
                                        </div>

                                        <input
                                            id="location-image-input"
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />

                                        <div className="flex justify-between items-center mt-3">
                                            {imagePreview && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setImageFile(null);
                                                        setImagePreview(null);
                                                        setImageError(null);
                                                    }}
                                                    className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
                                                >
                                                    <Trash2 size={12} /> Remove
                                                </button>
                                            )}
                                            {imageError && (
                                                <p className="text-xs font-bold text-red-500 ml-auto">{imageError}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 font-bold mb-2 text-sm">Property Name</label>
                                            <input type="text" required
                                                className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                value={newLoc.name} onChange={e => setNewLoc({ ...newLoc, name: e.target.value })} placeholder="e.g. Downtown Garage" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 font-bold mb-2 text-sm">Type</label>
                                            <select
                                                className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                value={newLoc.type} onChange={e => setNewLoc({ ...newLoc, type: e.target.value })}>
                                                <option value="parking">Parking</option>
                                                <option value="ev">EV Charging</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-bold mb-2 text-sm">Address</label>
                                        <input type="text" required
                                            className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            value={newLoc.address} 
                                            onChange={e => setNewLoc({ ...newLoc, address: e.target.value })} 
                                            onBlur={handleAddressBlur} 
                                            placeholder="Street, Building, Landmark" 
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 font-bold mb-2 text-sm">Area / Locality</label>
                                            <input type="text" 
                                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                                value={newLoc.area || ''} 
                                                onChange={e => setNewLoc({ ...newLoc, area: e.target.value })} 
                                                onBlur={handleAddressBlur}
                                                placeholder="e.g. Bandra West" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 font-bold mb-2 text-sm">City</label>
                                            <input type="text" required
                                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                                value={newLoc.city} 
                                                onChange={e => setNewLoc({ ...newLoc, city: e.target.value })} 
                                                onBlur={handleAddressBlur}
                                                placeholder="City" 
                                            />
                                        </div>
                                    </div>

                                    {/* Geocoding Status */}
                                    {geocodingStatus && (
                                        <div className={`text-xs font-bold px-3 py-1 rounded-full w-fit ${
                                            geocodingStatus === 'loading' ? 'bg-blue-50 text-blue-600 animate-pulse' :
                                            geocodingStatus === 'success' ? 'bg-green-50 text-green-600' :
                                            'bg-red-50 text-red-600'
                                        }`}>
                                            {geocodingStatus === 'loading' && '📍 Finding coordinates...'}
                                            {geocodingStatus === 'success' && '✅ Geocoded successfully'}
                                            {geocodingStatus === 'error' && '❌ Could not find location. Please check address.'}
                                        </div>
                                    )}

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
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-gray-700 font-bold mb-2 text-sm">Price/Hr (Rs.)</label>
                                                    <input type="number" required
                                                        className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                        value={newLoc.price} onChange={e => setNewLoc({ ...newLoc, price: e.target.value })} placeholder="0.00" />
                                                </div>
                                                <div>
                                                    <label className="block text-gray-700 font-bold mb-2 text-sm">Total Slots</label>
                                                    <input type="number" required
                                                        className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                        value={newLoc.slots} onChange={e => setNewLoc({ ...newLoc, slots: e.target.value })} placeholder="10" />
                                                </div>
                                            </div>

                                            {newLoc.type === 'ev' && (
                                                <div>
                                                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'inherit', display: 'block', marginBottom: '6px' }}>Charging Type</label>
                                                    <div style={{ display: 'flex', gap: '12px' }}>
                                                        <button type="button" onClick={() => setNewLoc({ ...newLoc, charging_type: 'fast' })}
                                                            style={{
                                                                flex: 1, padding: '12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                                                                border: `2px solid ${newLoc.charging_type === 'fast' ? '#f97316' : '#334155'}`,
                                                                background: newLoc.charging_type === 'fast' ? '#fff7ed' : 'transparent',
                                                                color: newLoc.charging_type === 'fast' ? '#f97316' : 'inherit',
                                                            }}>
                                                            Fast Charging
                                                            <span style={{ display: 'block', fontSize: '11px', fontWeight: 400, marginTop: '2px', color: '#6b7280' }}>50kW and above</span>
                                                        </button>
                                                        <button type="button" onClick={() => setNewLoc({ ...newLoc, charging_type: 'slow' })}
                                                            style={{
                                                                flex: 1, padding: '12px', borderRadius: '8_pixels', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                                                                border: `2px solid ${newLoc.charging_type === 'slow' ? '#00C9C8' : '#334155'}`,
                                                                background: newLoc.charging_type === 'slow' ? '#ecfeff' : 'transparent',
                                                                color: newLoc.charging_type === 'slow' ? '#00C9C8' : 'inherit',
                                                            }}>
                                                            Slow Charging
                                                            <span style={{ display: 'block', fontSize: '11px', fontWeight: 400, marginTop: '2px', color: '#6b7280' }}>Below 50kW</span>
                                                        </button>
                                                    </div>
                                                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', margin: '12px 0 6px' }}>Charging Speed (kW)</label>
                                                    <input type="number" placeholder="e.g. 22" value={newLoc.charging_speed_kw}
                                                        onChange={e => setNewLoc({ ...newLoc, charging_speed_kw: e.target.value })}
                                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #334155', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', background: 'transparent' }} />
                                                </div>
                                            )}
                                        </div>
                                    )}


                                    <button
                                        type="submit"
                                        disabled={imageUploading || loading}
                                        className="w-full btn-secondary py-5 text-2xl mt-6 disabled:opacity-50"
                                    >
                                        {imageUploading ? 'Uploading image...' : loading ? 'Registering...' : 'Publish Location'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Edit Location Modal */}
                    {isEditModalOpen && editingLoc && (
                        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                            <div style={{ maxWidth: 600, width: '100%', maxHeight: '90vh', borderRadius: 16, background: 'rgba(255,255,255,0.95)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }} className="shadow-2xl">
                                <form onSubmit={handleEditLocation} className="flex flex-col" style={{ minHeight: 0 }}>

                                    {/* Sticky header */}
                                    <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#ffffff', borderBottom: '1px solid #f1f5f9', padding: '20px 24px 16px' }} className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-2xl font-extrabold text-gray-900">Edit Property</h2>
                                            <p className="text-sm text-gray-500 mt-1">Update your property details</p>
                                        </div>
                                        <button type="button" onClick={() => setIsEditModalOpen(false)} aria-label="Close" className="rounded-full hover:bg-gray-100 p-2">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* Scrollable body */}
                                    <div style={{ padding: 24, overflowY: 'auto', gap: 20 }} className="flex-1">
                                        {/* Property Image Section - Moved to Top */}
                                        <div className="mb-6 bg-blue-50/30 p-4 rounded-xl border border-blue-100">
                                            <label className="block mb-3 text-[13px] font-semibold" style={{ color: '#374151' }}>
                                                <span className="inline-flex items-center gap-2"><PlusCircle size={16} className="text-blue-500" /> Property Image</span>
                                            </label>
                                            <div onClick={() => document.getElementById('edit-location-image-input').click()} style={{ border: '2px dashed #3b82f6', borderRadius: 12, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', background: imagePreview ? 'white' : 'transparent' }}>
                                                {imagePreview ? (
                                                    <>
                                                        <img src={imagePreview} alt="Location preview" style={{ height: 160, width: '100%', objectFit: 'cover', borderRadius: 12 }} />
                                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
                                                            <div className="bg-white text-blue-600 rounded-lg px-3 py-1 text-xs font-bold shadow-lg">Click to change</div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                                        <Plus size={24} className="text-blue-500" />
                                                        <div className="text-sm font-bold text-blue-600">Add Property Image</div>
                                                        <div className="text-[10px] text-blue-400 uppercase tracking-tighter">JPG, PNG, WEBP (Max 5MB)</div>
                                                    </div>
                                                )}
                                            </div>

                                            <input id="edit-location-image-input" type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageChange} className="hidden" />

                                            {imagePreview && (
                                                <div className="mt-3 flex items-center justify-between">
                                                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); setImageError(null); }} className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1">
                                                        <Trash2 size={12} /> Remove
                                                    </button>
                                                    {imageError && <p className="text-[10px] font-bold text-red-500">{imageError}</p>}
                                                </div>
                                            )}
                                            {imageError && !imagePreview && <p className="text-[10px] font-bold text-red-500 mt-2">{imageError}</p>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <div>
                                                <label className="block mb-2 text-[13px] font-semibold" style={{ color: '#374151' }}>Property Name</label>
                                                <input type="text" required value={editingLoc.name} onChange={e => setEditingLoc({ ...editingLoc, name: e.target.value })} className="w-full outline-none transition" style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }} />
                                            </div>
                                            <div>
                                                <label className="block mb-2 text-[13px] font-semibold" style={{ color: '#374151' }}>Type</label>
                                                <select value={editingLoc.type} onChange={e => setEditingLoc({ ...editingLoc, type: e.target.value })} className="w-full outline-none transition" style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                                                    <option value="parking">Parking</option>
                                                    <option value="ev">EV Charging</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block mb-2 text-[13px] font-semibold" style={{ color: '#374151' }}>Address</label>
                                            <input type="text" required 
                                                value={editingLoc.address} 
                                                onChange={e => setEditingLoc({ ...editingLoc, address: e.target.value })} 
                                                onBlur={handleEditAddressBlur}
                                                className="w-full outline-none transition" 
                                                style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }} 
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <div>
                                                <label className="block mb-2 text-[13px] font-semibold" style={{ color: '#374151' }}>Area / Locality</label>
                                                <input type="text" 
                                                    value={editingLoc.area || ''} 
                                                    onChange={e => setEditingLoc({ ...editingLoc, area: e.target.value })} 
                                                    onBlur={handleEditAddressBlur}
                                                    className="w-full outline-none transition" 
                                                    style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }} 
                                                    placeholder="e.g. Bandra West"
                                                />
                                            </div>
                                            <div>
                                                <label className="block mb-2 text-[13px] font-semibold" style={{ color: '#374151' }}>City</label>
                                                <input type="text" required 
                                                    value={editingLoc.city} 
                                                    onChange={e => setEditingLoc({ ...editingLoc, city: e.target.value })} 
                                                    onBlur={handleEditAddressBlur}
                                                    className="w-full outline-none transition" 
                                                    style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }} 
                                                />
                                            </div>
                                        </div>

                                        {/* Geocoding Status */}
                                        {geocodingStatus && (
                                            <div className={`text-[10px] font-bold px-2 py-1 rounded-md mt-2 w-fit ${
                                                geocodingStatus === 'loading' ? 'bg-blue-50 text-blue-600' :
                                                geocodingStatus === 'success' ? 'bg-green-50 text-green-600' :
                                                'bg-red-50 text-red-600'
                                            }`}>
                                                {geocodingStatus === 'loading' && '📍 Finding coordinates...'}
                                                {geocodingStatus === 'success' && '✅ Coordinates updated'}
                                                {geocodingStatus === 'error' && '❌ Location not found'}
                                            </div>
                                        )}

                                        {/* Pricing / Slots */}
                                        <div className="grid grid-cols-2 gap-5">
                                            <div>
                                                <label className="block mb-2 text-[13px] font-semibold" style={{ color: '#374151' }}>Price/Hr (₹)</label>
                                                <input type="number" required value={editingLoc.price_per_hour} onChange={e => setEditingLoc({ ...editingLoc, price_per_hour: e.target.value })} className="w-full outline-none transition" style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }} />
                                            </div>
                                            <div>
                                                <label className="block mb-2 text-[13px] font-semibold" style={{ color: '#374151' }}>Total Slots</label>
                                                <input type="number" required value={editingLoc.total_slots} onChange={e => setEditingLoc({ ...editingLoc, total_slots: e.target.value })} className="w-full outline-none transition" style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }} />
                                            </div>
                                        </div>

                                        {/* Charging Details (EV) */}
                                        {editingLoc.type === 'ev' && (
                                            <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 20, background: '#f8fafc' }} className="mt-4">
                                                <div className="mb-4" style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#374151' }}>Charging Details</div>
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <button type="button" onClick={() => setEditingLoc({ ...editingLoc, charging_type: 'fast' })} className={`p-4 rounded-xl border-2 transition-all text-left ${editingLoc.charging_type === 'fast' ? 'border-[#00C9C8] bg-[#f0fdfa]' : 'border-[#e2e8f0] bg-white'}`}>
                                                        <div className="font-bold text-sm mb-1">Fast Charging</div>
                                                        <div className="text-[10px] text-gray-500 uppercase">50kW and above</div>
                                                    </button>
                                                    <button type="button" onClick={() => setEditingLoc({ ...editingLoc, charging_type: 'slow' })} className={`p-4 rounded-xl border-2 transition-all text-left ${editingLoc.charging_type === 'slow' ? 'border-[#00C9C8] bg-[#f0fdfa]' : 'border-[#e2e8f0] bg-white'}`}>
                                                        <div className="font-bold text-sm mb-1">Slow Charging</div>
                                                        <div className="text-[10px] text-gray-500 uppercase">Below 50kW</div>
                                                    </button>
                                                </div>

                                                <div>
                                                    <label className="block mb-2 text-[13px] font-semibold" style={{ color: '#374151' }}>Charging Speed (kW)</label>
                                                    <input type="number" placeholder="e.g. 22" value={editingLoc.charging_speed_kw} onChange={e => setEditingLoc({ ...editingLoc, charging_speed_kw: e.target.value })} className="w-full outline-none transition" style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }} />
                                                </div>
                                            </div>
                                        )}

                                    </div>

                                    {/* Sticky footer with actions */}
                                    <div style={{ position: 'sticky', bottom: 0, zIndex: 10, background: '#ffffff', borderTop: '1px solid #f1f5f9', padding: '16px 24px' }} className="flex justify-end items-center gap-3">
                                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-sm font-semibold" style={{ border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 8, padding: '10px 24px', background: 'transparent' }}>Cancel</button>
                                        <button type="submit" disabled={imageUploading || loading} className="text-sm font-bold" style={{ background: loading ? '#94a3b8' : '#0f172a', color: '#ffffff', borderRadius: 8, padding: '10px 24px', minWidth: 120 }}>
                                            {imageUploading ? 'Uploading image...' : loading ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>

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
