
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { MapPin, Zap, Filter, Search, Car, Bike, Plug } from 'lucide-react';
import { motion } from 'framer-motion';
import { SEED_LOCATIONS } from '../lib/seedData';
import GeoapifyMap from '../components/GeoapifyMap';
import { haversine } from '../utils/geoapify';

const Locations = ({ type }) => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [activeFilter, setActiveFilter] = useState('all');
    const [sortBy, setSortBy] = useState('default');
    const location = useLocation();

    // Map States
    const [userCoords, setUserCoords] = useState(null);
    const [flyTarget, setFlyTarget] = useState(null);
    const [hoveredId, setHoveredId] = useState(null);

    // Reset all filters to default on every navigation to this page
    useEffect(() => {
        setFilterType('all');
        setActiveFilter('all');
        setSearchTerm('');
        setSortBy('default');
    }, [location.pathname]);

    // Auto-geolocation on mount
    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                };
                setUserCoords(coords);
                setFlyTarget(coords);
            },
            () => {
                // Silently ignore if denied
            }
        );
    }, []);


    useEffect(() => {
        // Show cached locations instantly, then refresh in background
        const cacheKey = `voltpark_locations_${type || 'all'}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                setLocations(JSON.parse(cached));
                setLoading(false);
            } catch {}
        }
        fetchLocations();

        // Realtime subscription
        const channel = supabase
            .channel('public-locations-list')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'locations' },
                (payload) => {
                    setLocations((prevLocations) =>
                        prevLocations.map((loc) =>
                            loc.id === payload.new.id ? { ...loc, ...payload.new } : loc
                        )
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [type]);

    // Fallback polling every 30 seconds (reduced from 15s)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchLocations();
        }, 30000);
        return () => clearInterval(interval);
    }, [type]);

    const fetchLocations = async () => {
        try {
            let query = supabase
                .from('locations')
                .select(`
                    id, name, address, city, area,
                    type, status, latitude, longitude,
                    price_per_hour, available_slots,
                    car_available_slots, bike_available_slots,
                    charging_type, charging_speed_kw,
                    image_url, owner_id,
                    car_total_slots, bike_total_slots,
                    car_price_per_hour, bike_price_per_hour,
                    is_featured, featured_until, listing_plan
                `)
                .eq('status', 'approved')
                .order('is_featured', { ascending: false, nullsFirst: false })
                .order('created_at', { ascending: false });

            if (type !== 'all') {
                query = query.eq('type', type);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching locations:', error);
            } else if (data) {
                setLocations(data);
                // Cache for instant display on next visit
                const cacheKey = `voltpark_locations_${type || 'all'}`;
                try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}
            }
        } catch (err) {
            console.error('VOLTPARK: Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };


    const insertSeedData = async (seeds) => {
        // Seed logic...
    };

    // Filter logic
    const filteredLocations = locations
        .filter((location) => {
            const matchesSearch =
                location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                location.address.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType =
                type !== 'all'
                    ? location.type === type
                    : filterType === 'all'
                        ? true
                        : filterType === 'car'
                            ? location.type === 'parking' && (location.car_total_slots > 0)
                            : filterType === 'bike'
                                ? location.type === 'parking' && (location.bike_total_slots > 0)
                                : location.type === filterType;

            const matchesChargingFilter =
                type !== 'ev' || activeFilter === 'all'
                    ? true
                    : location.charging_type === activeFilter;

            const matchesParkingFilter =
                type !== 'parking' || activeFilter === 'all'
                    ? true
                    : activeFilter === 'car'
                        ? (location.car_available_slots ?? 0) > 0
                        : activeFilter === 'bike'
                            ? (location.bike_available_slots ?? 0) > 0
                            : true;

            return matchesSearch && matchesType && matchesChargingFilter && matchesParkingFilter;
        })
        .sort((a, b) => {
            // Featured locations always appear first
            const aFeatured = a.is_featured && (!a.featured_until || new Date(a.featured_until) > new Date()) ? 1 : 0;
            const bFeatured = b.is_featured && (!b.featured_until || new Date(b.featured_until) > new Date()) ? 1 : 0;
            if (bFeatured !== aFeatured) return bFeatured - aFeatured;

            if (type !== 'parking') return 0;
            
            if (sortBy === 'price_asc')
                return (a.price_per_hour ?? 0) - (b.price_per_hour ?? 0);
            if (sortBy === 'price_desc')
                return (b.price_per_hour ?? 0) - (a.price_per_hour ?? 0);
            if (sortBy === 'slots')
                return (b.car_available_slots ?? 0) - (a.car_available_slots ?? 0);
            return 0;
        });

    const handleNearMe = () => {
        if (!userCoords) return;
        const sorted = [...filteredLocations].sort((a,b) =>
            haversine(userCoords.lat, userCoords.lng, a.latitude, a.longitude) -
            haversine(userCoords.lat, userCoords.lng, b.latitude, b.longitude)
        );
        setLocations(sorted);
    };

    return (
        <div style={{ maxWidth: '1400px' }} className="mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 style={{ fontSize: '28px', fontWeight: 700 }} className="text-slate-900 mb-8 capitalize">
                {type === 'all' ? 'All Locations' : type === 'ev' ? 'EV Charging Stations' : 'Parking Spots'}
            </h1>

            {/* Search and Filter Section */}
            <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by location name, city, or area..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>



                {type === 'all' && (
                    <div className="flex flex-wrap gap-1 bg-white/70 backdrop-blur-md rounded-full p-1.5 shadow-sm border border-gray-200/50 relative overflow-hidden">
                        {['all', 'parking', 'ev', 'car', 'bike'].map(ft => (
                            <button
                                key={ft}
                                onClick={() => setFilterType(ft)}
                                className={`relative px-5 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors duration-200 rounded-full z-10 flex items-center gap-1.5 ${filterType === ft
                                    ? 'text-white'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                {filterType === ft && (
                                    <motion.div
                                        layoutId="liquid-filter-bg"
                                        className="absolute inset-0 bg-slate-900 rounded-full -z-10 shadow-lg"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                {ft === 'car' && <Car size={14} className={filterType === ft ? 'text-blue-300' : 'text-slate-400'} />}
                                {ft === 'bike' && <Bike size={14} className={filterType === ft ? 'text-orange-300' : 'text-slate-400'} />}
                                {ft === 'ev' && <Zap size={14} className={filterType === ft ? 'text-teal-300' : 'text-slate-400'} />}
                                {ft === 'all' ? 'ALL' : ft}
                            </button>
                        ))}
                    </div>
                )}

                {type === 'ev' && (
                    <div className="flex items-center gap-4">
                        <div className="flex flex-wrap gap-1 bg-white/70 backdrop-blur-md rounded-full p-1.5 shadow-sm border border-gray-200/50 relative overflow-hidden">
                            {[
                                { label: 'ALL', value: 'all', icon: null },
                                { label: 'FAST CHARGING', value: 'fast', icon: Zap },
                                { label: 'SLOW CHARGING', value: 'slow', icon: Plug },
                            ].map(tab => {
                                const isActive = activeFilter === tab.value;
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.value}
                                        onClick={() => setActiveFilter(tab.value)}
                                        className={`relative px-5 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors duration-200 rounded-full z-10 flex items-center gap-1.5 ${isActive
                                            ? 'text-white'
                                            : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="liquid-filter-bg-ev"
                                                className="absolute inset-0 bg-slate-900 rounded-full -z-10 shadow-lg"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        {Icon && <Icon size={14} className={isActive ? (tab.value === 'fast' ? 'text-orange-300' : 'text-blue-300') : 'text-slate-400'} />}
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {type === 'parking' && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px',
                        background: 'rgba(255, 255, 255, 0.18)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.35)',
                        borderRadius: '9999px',
                        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
                    }}>
                        {[
                            { label: 'ALL', value: 'all', icon: null },
                            { label: 'CAR', value: 'car', icon: Car },
                            { label: 'BIKE', value: 'bike', icon: Bike },
                        ].map(tab => {
                            const isActive = activeFilter === tab.value;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.value}
                                    onClick={() => setActiveFilter(tab.value)}
                                    className={`relative px-5 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors duration-200 rounded-full z-10 flex items-center gap-1.5 ${isActive
                                        ? 'text-white'
                                        : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="liquid-filter-bg-parking"
                                            className="absolute inset-0 bg-slate-900 rounded-full -z-10 shadow-lg"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    {Icon && <Icon size={14} className={isActive ? (tab.value === 'car' ? 'text-blue-300' : 'text-orange-300') : 'text-slate-400'} />}
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>


            {loading ? (
                <div
                    className="locations-grid"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '20px',
                    }}
                >
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="card p-3 h-64 bg-white animate-pulse rounded-xl border border-gray-100">
                            <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : filteredLocations.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '48px 24px',
                    color: '#94a3b8',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                }}>
                    No locations found. Try a different search or filter.
                </div>
            ) : (
                <>
                    {/* ── FULL WIDTH MAP ── */}
                    <div className="locations-map-container" style={{
                        width: '100%',
                        height: '480px',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0',
                        marginTop: '20px',
                        marginBottom: '32px',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    }}>
                        <GeoapifyMap
                            locations={filteredLocations}
                            userCoords={userCoords}
                            flyTarget={flyTarget}
                            hoveredId={hoveredId}
                            onMarkerClick={(id) => {
                                document.getElementById(`card-${id}`)?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center',
                                });
                                setHoveredId(id);
                            }}
                            height="100%"
                        />
                    </div>

                    {/* ── RESULTS COUNT ── */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '20px',
                    }}>
                        <p style={{
                            fontSize: '14px',
                            color: '#64748b',
                            fontFamily: 'inherit',
                        }}>
                            {filteredLocations.length} locations found
                        </p>
                    </div>

                    {/* ── LOCATION CARDS GRID ── */}
                    <div
                        className="locations-grid"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '20px',
                        }}
                    >
                        {filteredLocations.map((location) => (
                            <Link 
                                key={location.id} 
                                id={`card-${location.id}`}
                                to={`/locations/${location.id}`} 
                                className="card flex flex-col h-full group hover:no-underline p-3"
                                onMouseEnter={(e) => {
                                    setHoveredId(location.id);
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)';
                                }}
                                onMouseLeave={(e) => {
                                    setHoveredId(null);
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                                style={{
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    cursor: 'pointer',
                                }}
                            >
                                <div className="h-32 bg-gray-200 rounded-md mb-2 overflow-hidden relative">
                                    <img
                                        src={location.image_url || 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&q=80'}
                                        alt={location.name}
                                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                    />
                                    {/* Featured badge */}
                                    {location.is_featured && (!location.featured_until || new Date(location.featured_until) > new Date()) && (
                                        <div className="absolute top-1 left-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest shadow-lg flex items-center gap-1"
                                            style={{
                                                background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                                                color: '#fff',
                                                border: '1px solid rgba(255,255,255,0.3)',
                                                letterSpacing: '0.1em',
                                            }}
                                        >
                                            FEATURED
                                        </div>
                                    )}
                                    <div className="absolute top-1 right-1 bg-white px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow flex items-center">
                                        {location.type === 'ev' ? <Zap size={10} className="text-secondary mr-1" /> : <MapPin size={10} className="text-primary mr-1" />}
                                        <span className="uppercase text-[10px]">{location.type}</span>
                                    </div>
                                </div>
                                <div className="flex-grow">
                                    <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors">
                                        {location.name}
                                        {location.type === 'ev' && location.charging_type && (
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                padding: '2px 10px',
                                                borderRadius: '9999px',
                                                marginLeft: '8px',
                                                background: location.charging_type === 'fast'
                                                    ? 'rgba(249, 115, 22, 0.12)'
                                                    : 'rgba(0, 201, 200, 0.12)',
                                                color: location.charging_type === 'fast'
                                                    ? '#f97316'
                                                    : '#00C9C8',
                                                border: `1px solid ${
                                                    location.charging_type === 'fast'
                                                        ? 'rgba(249,115,22,0.30)'
                                                        : 'rgba(0,201,200,0.30)'
                                                }`,
                                                fontFamily: 'inherit',
                                            }}>
                                                {location.charging_type === 'fast'
                                                    ? 'Fast' + (location.charging_speed_kw
                                                        ? ' ' + location.charging_speed_kw + 'kW'
                                                        : ' Charging')
                                                    : 'Slow' + (location.charging_speed_kw
                                                        ? ' ' + location.charging_speed_kw + 'kW'
                                                        : ' Charging')}
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-gray-600 mb-2 text-xs flex items-start">
                                        <MapPin size={12} className="mr-1 mt-0.5 flex-shrink-0 text-gray-400" />
                                        {location.address}, {location.area ? `${location.area}, ` : ''}{location.city}
                                    </p>
                                    {location.type === 'parking' ? (
                                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-400 font-bold mb-0.5 flex items-center"><Car size={10} className="mr-1" /> Car</span>
                                                <span className="text-xs font-bold text-gray-900">₹{location.car_price_per_hour}/hr</span>
                                                <span className={`${location.car_available_slots > 0 ? 'text-green-600' : 'text-red-500'} text-[9px] font-bold`}>
                                                    {location.car_available_slots} / {location.car_total_slots} left
                                                </span>
                                            </div>
                                            <div className="flex flex-col border-l border-gray-100 pl-2">
                                                <span className="text-[10px] text-gray-400 font-bold mb-0.5 flex items-center"><Bike size={10} className="mr-1" /> Bike</span>
                                                <span className="text-xs font-bold text-gray-900">₹{location.bike_price_per_hour}/hr</span>
                                                <span className={`${location.bike_available_slots > 0 ? 'text-green-600' : 'text-red-500'} text-[9px] font-bold`}>
                                                    {location.bike_available_slots} / {location.bike_total_slots} left
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center text-xs text-gray-700 mb-2 mt-2">
                                            <span className="bg-blue-50 px-1.5 py-0.5 rounded text-blue-700 font-bold text-[10px]">
                                                ₹{location.price_per_hour}/hr
                                            </span>
                                            <span className={`${location.available_slots > 0 ? 'text-green-600' : 'text-red-500'} font-bold text-[10px]`}>
                                                {location.available_slots} / {location.total_slots} slots
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="w-full btn-primary text-center mt-auto py-1.5 text-xs rounded-md">
                                    View
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default Locations;
