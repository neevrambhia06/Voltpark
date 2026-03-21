
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MapPin, Zap, Clock, Calendar, CreditCard, Car, Bike, Navigation } from 'lucide-react';
import { format, addHours } from 'date-fns';
import { SEED_LOCATIONS } from '../lib/seedData';
import DateTimeWheel from '../components/DateTimeWheel';
import CarSlotLayout from '../components/CarSlotLayout';


const LocationDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState({
        startDateTime: new Date(),
        duration: 1
    });
    const [processing, setProcessing] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [occupiedSlots, setOccupiedSlots] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState('car'); // 'car' or 'bike'

    useEffect(() => {
        if (id) {
            fetchLocation();
            fetchOccupiedSlots();

            // Realtime subscription for location details
            const locChannel = supabase
                .channel(`location-detail-${id}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'locations', filter: `id=eq.${id}` },
                    (payload) => {
                        console.log('Realtime location update:', payload);
                        setLocation((prev) => ({ ...prev, ...payload.new }));
                    }
                )
                .subscribe();

            // Realtime subscription for bookings (to update occupied slots)
            const bookingChannel = supabase
                .channel(`location-bookings-${id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'bookings', filter: `location_id=eq.${id}` },
                    () => {
                        console.log('Realtime booking update - refreshing slots');
                        fetchOccupiedSlots();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(locChannel);
                supabase.removeChannel(bookingChannel);
            };
        }
    }, [id]);

    const fetchOccupiedSlots = async () => {
        try {
            // Use RPC to fetch occupied slots without RLS restrictions
            const { data, error } = await supabase
                .rpc('get_occupied_slots', { p_location_id: id });

            if (error) {
                // Fallback if RPC doesn't exist yet (for dev)
                console.warn("RPC get_occupied_slots failed, trying direct select (Subject to RLS):", error);
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('bookings')
                    .select('selected_slot')
                    .eq('location_id', id)
                    .in('status', ['Scheduled', 'Started', 'active', 'confirmed']);

                if (fallbackError) throw fallbackError;
                if (fallbackData) {
                    setOccupiedSlots(fallbackData.map(b => b.selected_slot).filter(Boolean));
                }
                return;
            }

            if (data) {
                const slots = data.map(b => b.selected_slot).filter(Boolean);
                // remove duplicates just in case
                const uniqueSlots = [...new Set(slots)];
                setOccupiedSlots(uniqueSlots);
            }
        } catch (e) {
            console.error("Error fetching occupied slots:", e);
        }
    };

    // ... fetchLocation ...

    // ... handleBooking ...

    // ...



    // ... (fetchLocation remains same, omitted for brevity if using tool correctly with context, but I cant skip lines in replace_file_content unless I use chunks.
    // Wait, I need to keep fetchLocation. I'll use separate replace calls or just be careful. 
    // Actually, I can use the tool to replace 'imports' and 'state init' and 'handleBooking' separately if I want to be safe.
    // Or I can just replace the top part and the handleBooking part.
    // The previous tool call handled the FORM render.
    // This one will handle imports and the top logic.

    // ... imports are already there at the top. I need to ADD DatePicker imports.

    const fetchLocation = async () => {
        try {
            const seedLocation = SEED_LOCATIONS.find(l => l.id === id);
            if (seedLocation) {
                const { data, error } = await supabase
                    .from('locations')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (!error && data) {
                    setLocation(data);
                } else {
                    console.log("Using seed data for details");
                    setLocation(seedLocation);
                }
            } else {
                const { data, error } = await supabase
                    .from('locations')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (error) throw error;
                setLocation(data);
            }
        } catch (error) {
            console.error('Error fetching location:', error);
            const seedLocation = SEED_LOCATIONS.find(l => l.id === id);
            if (seedLocation) setLocation(seedLocation);
        } finally {
            setLoading(false);
        }
    };

    const handleBooking = async (e) => {
        e.preventDefault();
        if (!user) {
            navigate('/login');
            return;
        }

        if (!selectedSlot) {
            alert("Please select a parking slot or charger.");
            return;
        }

        setProcessing(true);
        try {
            const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5000';
            const startDateTime = booking.startDateTime;
            const endDateTime = addHours(startDateTime, booking.duration);

            const pricePerHour = location.type === 'parking'
                ? (selectedVehicle === 'car' ? location.car_price_per_hour : location.bike_price_per_hour)
                : location.price_per_hour;

            const amount = pricePerHour * booking.duration;
            const tempBookingId = crypto.randomUUID();

            // 1. Create Order on Backend
            const orderResponse = await fetch(`${API_BASE}/api/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_id: tempBookingId, amount: amount })
            });

            if (!orderResponse.ok) {
                const errorData = await orderResponse.json();
                throw new Error(errorData.error || 'Failed to create Razorpay order');
            }

            const order = await orderResponse.json();

            // 2. Initialize Razorpay Checkout
            const options = {
                key: order.key_id,
                amount: order.amount,
                currency: order.currency,
                name: "VOLTpark",
                description: `Booking at ${location.name}`,
                order_id: order.id,
                handler: async function (response) {
                    try {
                        setProcessing(true);

                        // 3. Verify Payment
                        const verifyRes = await fetch(`${API_BASE}/api/verify-payment`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        const verifyData = await verifyRes.json();

                        if (verifyData.status === 'success') {
                            // 4. Save Booking to DB
                            await confirmBooking(amount, startDateTime, endDateTime, tempBookingId, response.razorpay_order_id, response.razorpay_payment_id);
                        } else {
                            alert('Payment verification failed.');
                            setProcessing(false);
                        }
                    } catch (verifyError) {
                        console.error('Verification error:', verifyError);
                        alert('An error occurred while verifying the payment.');
                        setProcessing(false);
                    }
                },
                prefill: {
                    name: user.user_metadata?.name || user.email,
                    email: user.email,
                },
                theme: {
                    color: "#3399cc"
                }
            };

            const rzp = new window.Razorpay(options);

            rzp.on('payment.failed', function (response) {
                console.error('Payment Failed:', response.error);
                alert(`Payment Failed: ${response.error.description}`);
                setProcessing(false);
            });

            rzp.open();

        } catch (error) {
            console.error('Booking initiation failed:', error);
            alert('Booking initiation failed: ' + (error.message || "Unknown error"));
            setProcessing(false); // Only set if we didn't open the modal
        }
    };

    const confirmBooking = async (amount, startDateTime, endDateTime, tempBookingId, razorpayOrderId, razorpayPaymentId) => {
        try {
            // 1. Insert Booking FIRST
            const { data, error } = await supabase.rpc('create_booking', {
                p_location_id: location.id,
                p_user_id: user.id,
                p_start_time: startDateTime.toISOString(),
                p_end_time: endDateTime.toISOString(),
                p_duration: booking.duration,
                p_amount: amount,
                p_status: 'Scheduled', // Confirmed/Scheduled
                p_barcode_value: tempBookingId,
                p_selected_slot: selectedSlot,
                p_vehicle_type: selectedVehicle
            });

            if (error) {
                console.error("RPC Error (falling back to direct insert):", error);

                const { error: bookingError } = await supabase.from('bookings').insert([{
                    id: tempBookingId,
                    user_id: user.id,
                    location_id: location.id,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    duration: booking.duration,
                    amount: amount,
                    status: 'Scheduled',
                    barcode_value: tempBookingId,
                    selected_slot: selectedSlot,
                    vehicle_type: selectedVehicle
                }]);

                if (bookingError) throw bookingError;

                // Manual slot decrement fallback
                const isCar = selectedVehicle === 'car';
                const availableField = isCar ? 'car_available_slots' : 'bike_available_slots';
                const currentAvailable = location.type === 'parking' ? location[availableField] : location.available_slots;

                if (currentAvailable > 0) {
                    const updateField = location.type === 'parking' ? availableField : 'available_slots';
                    await supabase.from('locations')
                        .update({ [updateField]: currentAvailable - 1 })
                        .eq('id', location.id);
                }
            }

            // 2. Insert Payment Record
            const { error: paymentError } = await supabase.from('payments').insert([{
                booking_id: tempBookingId,
                user_id: user.id,
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: razorpayPaymentId,
                amount: amount,
                status: 'success'
            }]);

            if (paymentError) {
                console.error("Payment insert failed (non-critical):", paymentError);
            }

            alert('Booking Confirmed Successfully!');
            navigate('/user-dashboard');

        } catch (dbError) {
            console.error("Database error during booking:", dbError);
            alert("Booking saved but encountered an issue: " + dbError.message);
            // We shouldn't fail completely if they already paid.
            navigate('/user-dashboard');
        } finally {
            setProcessing(false);
        }
    };


    if (loading) return <div className="text-center py-20">Loading...</div>;
    if (!location) return <div className="text-center py-20">Location not found</div>;

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid md:grid-cols-3 gap-6">
                {/* Left: Images and Info */}
                <div className="md:col-span-2 space-y-6">
                    <img
                        src={location.image_url || 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&q=80'}
                        alt={location.name}
                        className="w-full h-64 object-cover rounded-xl shadow-lg"
                    />

                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                            <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${location.type === 'ev' ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'}`}>
                                {location.type}
                            </span>
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.name}, ${location.address}, ${location.city}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.05)] rounded-full text-xs font-bold text-slate-700 hover:bg-gray-50 hover:text-primary transition-all ml-auto md:ml-0 hover:shadow-md"
                            >
                                <Navigation size={12} className="text-primary" />
                                Directions
                            </a>
                        </div>

                        <p className="flex items-center text-gray-600 mb-4 text-sm">
                            <MapPin className="mr-1.5" size={16} />
                            {location.address}, {location.city}
                        </p>

                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-semibold mb-3">Details</h3>

                            {location.type === 'parking' && (
                                <div className="flex p-1 bg-gray-100 rounded-lg mb-4">
                                    <button
                                        onClick={() => { setSelectedVehicle('car'); setSelectedSlot(null); }}
                                        className={`flex-1 flex items-center justify-center py-2 rounded-md text-sm font-bold transition-all ${selectedVehicle === 'car' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <Car size={16} className="mr-2" /> Car
                                    </button>
                                    <button
                                        onClick={() => { setSelectedVehicle('bike'); setSelectedSlot(null); }}
                                        className={`flex-1 flex items-center justify-center py-2 rounded-md text-sm font-bold transition-all ${selectedVehicle === 'bike' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <Bike size={16} className="mr-2" /> Bike
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-gray-500 text-xs">Price per hour</p>
                                    <p className="text-base font-medium text-primary">
                                        ₹{location.type === 'parking'
                                            ? (selectedVehicle === 'car' ? location.car_price_per_hour : location.bike_price_per_hour)
                                            : location.price_per_hour}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs">Total Slots</p>
                                    <p className="text-base font-medium">
                                        {location.type === 'parking'
                                            ? (selectedVehicle === 'car' ? location.car_total_slots : location.bike_total_slots)
                                            : location.total_slots}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs">Available Slots</p>
                                    <p className={`text-base font-medium ${(location.type === 'parking' ? (selectedVehicle === 'car' ? location.car_available_slots : location.bike_available_slots) : location.available_slots) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {location.type === 'parking'
                                            ? (selectedVehicle === 'car' ? location.car_available_slots : location.bike_available_slots)
                                            : location.available_slots}
                                    </p>
                                </div>
                                {location.type === 'ev' && (
                                    <div>
                                        <p className="text-gray-500 text-xs">EV Chargers</p>
                                        <p className="text-base font-medium text-secondary">{location.ev_chargers}</p>
                                    </div>
                                )}
                                {location.type === 'ev' && location.charging_type && (
                                    <div>
                                        <p style={{
                                            fontSize: '12px',
                                            color: '#6b7280',
                                            marginBottom: '4px',
                                            fontFamily: 'inherit',
                                        }}>
                                            Charging Type
                                        </p>
                                        <p style={{
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            fontFamily: 'inherit',
                                            color: location.charging_type === 'fast'
                                                ? '#f97316'
                                                : '#00C9C8',
                                        }}>
                                            {location.charging_type === 'fast'
                                                ? 'Fast Charging'
                                                : 'Slow Charging'}
                                        </p>
                                    </div>
                                )}
                                {location.type === 'ev' && location.charging_speed_kw && (
                                    <div>
                                        <p style={{
                                            fontSize: '12px',
                                            color: '#6b7280',
                                            marginBottom: '4px',
                                            fontFamily: 'inherit',
                                        }}>
                                            Charging Speed
                                        </p>
                                        <p style={{
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            fontFamily: 'inherit',
                                            color: location.charging_type === 'fast'
                                                ? '#f97316'
                                                : '#00C9C8',
                                        }}>
                                            {location.charging_speed_kw} kW
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6">
                            <CarSlotLayout
                                totalSlots={location.type === 'parking' ? (selectedVehicle === 'car' ? location.car_total_slots : location.bike_total_slots) : location.total_slots}
                                availableSlots={location.type === 'parking' ? (selectedVehicle === 'car' ? location.car_available_slots : location.bike_available_slots) : location.available_slots}
                                type={location.type}
                                vehicleType={selectedVehicle}
                                selectedSlot={selectedSlot}
                                occupiedSlots={occupiedSlots}
                                onSelect={(id) => setSelectedSlot(prev => prev === id ? null : id)}
                            />
                        </div>

                        <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-2">Description</h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                {location.description || 'Secure and convenient parking location with 24/7 access. CCTV surveillance and well-lit areas for your safety. Easy entry and exit.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Booking Form */}
                <div className="md:col-span-1">
                    <div className="bg-white rounded-xl shadow-lg p-5 sticky top-20">
                        <h3 className="text-lg font-bold mb-4 text-gray-900">Book Your Spot</h3>

                        <form onSubmit={handleBooking} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Select Date & Time</label>
                                <div>
                                    <DateTimeWheel
                                        selectedDate={booking.startDateTime}
                                        onChange={(date) => setBooking({ ...booking, startDateTime: date })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Duration (Hours)</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={18} />
                                    <select
                                        className="w-full p-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-secondary focus:border-secondary text-base appearance-none"
                                        value={booking.duration}
                                        onChange={(e) => setBooking({ ...booking, duration: parseInt(e.target.value) })}
                                    >
                                        {[1, 2, 3, 4, 5, 8, 12, 24].map(h => (
                                            <option key={h} value={h}>{h} Hour{h > 1 ? 's' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between items-center text-gray-600 text-sm">
                                    <span>Rate</span>
                                    <span>Rate</span>
                                    <span>₹{location.type === 'parking'
                                        ? (selectedVehicle === 'car' ? location.car_price_per_hour : location.bike_price_per_hour)
                                        : location.price_per_hour}/hr</span>
                                </div>
                                <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-lg font-bold text-gray-900">
                                    <span>Total</span>
                                    <span>₹{((location.type === 'parking'
                                        ? (selectedVehicle === 'car' ? location.car_price_per_hour : location.bike_price_per_hour)
                                        : location.price_per_hour) * booking.duration).toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={processing || (location.type === 'parking' ? (selectedVehicle === 'car' ? location.car_available_slots : location.bike_available_slots) : location.available_slots) <= 0}
                                className={`w-full btn-secondary text-base py-3 flex justify-center items-center shadow-lg transform transition-all hover:scale-[1.02] ${processing ? 'opacity-75 cursor-not-allowed' : ''}`}
                            >
                                {processing ? 'Processing...' : (
                                    <>
                                        <CreditCard size={18} className="mr-2" />
                                        Confirm
                                    </>
                                )}
                            </button>

                            {(location.type === 'parking' ? (selectedVehicle === 'car' ? location.car_available_slots : location.bike_available_slots) : location.available_slots) <= 0 && (
                                <p className="text-red-500 text-center font-bold mt-2 text-sm">
                                    Sold Out for this time.
                                </p>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationDetails;
