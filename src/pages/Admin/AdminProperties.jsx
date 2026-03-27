
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MapPin, Trash2, ArrowLeft, Search, Filter, LayoutGrid, Star, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import SlotLayoutModal from '../../components/SlotLayoutModal';
import { LISTING_PLANS } from '../../utils/priceCalculator';

const PLAN_COLORS = {
    free:     { bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200' },
    basic:    { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200' },
    pro:      { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-200' },
    business: { bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200' },
};

const AdminProperties = () => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, parking, ev
    const [filterPlan, setFilterPlan] = useState('all'); // all, free, basic, pro, business
    const [selectedLayoutId, setSelectedLayoutId] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('locations')
                .select('*, owner_profiles(name, email)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLocations(data || []);
        } catch (error) {
            console.error('Error fetching locations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLocation = async (id) => {
        if (!confirm("Are you sure you want to delete this property? This action cannot be undone.")) return;
        try {
            const { error } = await supabase.from('locations').delete().eq('id', id);
            if (error) throw error;
            setLocations(prev => prev.filter(l => l.id !== id));
        } catch (error) {
            console.error('Error deleting location:', error);
            alert('Failed to delete property');
        }
    };

    const handlePlanChange = async (id, newPlan) => {
        setUpdatingId(id);
        try {
            const updates = {
                listing_plan: newPlan,
                plan_expires_at: newPlan === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            };
            const { error } = await supabase.from('locations').update(updates).eq('id', id);
            if (error) throw error;
            setLocations(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
        } catch (error) {
            console.error('Error updating plan:', error);
            alert('Failed to update plan');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleFeaturedToggle = async (id, currentlyFeatured) => {
        setUpdatingId(id);
        try {
            const updates = {
                is_featured: !currentlyFeatured,
                featured_until: !currentlyFeatured ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
            };
            const { error } = await supabase.from('locations').update(updates).eq('id', id);
            if (error) throw error;
            setLocations(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
        } catch (error) {
            console.error('Error toggling featured:', error);
            alert('Failed to update featured status');
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredLocations = locations.filter(loc => {
        const matchesSearch = loc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (loc.owner_profiles?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || loc.type === filterType;
        const matchesPlan = filterPlan === 'all' || (loc.listing_plan || 'free') === filterPlan;
        return matchesSearch && matchesType && matchesPlan;
    });

    // Stats
    const featuredCount = locations.filter(l => l.is_featured).length;
    const planCounts = {
        free: locations.filter(l => !l.listing_plan || l.listing_plan === 'free').length,
        basic: locations.filter(l => l.listing_plan === 'basic').length,
        pro: locations.filter(l => l.listing_plan === 'pro').length,
        business: locations.filter(l => l.listing_plan === 'business').length,
    };

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
                            <h1 className="text-3xl font-bold text-gray-900">All Properties</h1>
                        </div>
                        <div className="text-sm text-gray-500 font-medium">
                            Total: {filteredLocations.length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Revenue Stats Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Total</div>
                        <div className="text-2xl font-extrabold text-gray-900">{locations.length}</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 shadow-sm border border-amber-100">
                        <div className="text-xs font-bold text-amber-500 uppercase tracking-wide mb-1 flex items-center gap-1"><Star size={12} /> Featured</div>
                        <div className="text-2xl font-extrabold text-amber-700">{featuredCount}</div>
                    </div>
                    {Object.entries(planCounts).map(([plan, count]) => (
                        <div key={plan} className={`bg-white rounded-xl p-4 shadow-sm border ${PLAN_COLORS[plan].border}`}>
                            <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${PLAN_COLORS[plan].text}`}>
                                {LISTING_PLANS[plan].label}
                            </div>
                            <div className="text-2xl font-extrabold text-gray-900">{count}</div>
                            {plan !== 'free' && (
                                <div className="text-[10px] text-gray-400 font-medium">Rs.{LISTING_PLANS[plan].price}/mo</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search properties, cities, owners..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-gray-400" />
                            <select
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="all">All Types</option>
                                <option value="parking">Parking</option>
                                <option value="ev">EV Charging</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Crown size={16} className="text-gray-400" />
                            <select
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                                value={filterPlan}
                                onChange={(e) => setFilterPlan(e.target.value)}
                            >
                                <option value="all">All Plans</option>
                                <option value="free">Free</option>
                                <option value="basic">Basic</option>
                                <option value="pro">Pro</option>
                                <option value="business">Business</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Property</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Owner</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Plan</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Featured</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stats</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-500">Loading properties...</td></tr>
                                ) : filteredLocations.length === 0 ? (
                                    <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-500">No properties found matching your filters.</td></tr>
                                ) : (
                                    filteredLocations.map((loc) => {
                                        const plan = loc.listing_plan || 'free';
                                        const planStyle = PLAN_COLORS[plan] || PLAN_COLORS.free;
                                        const isFeatured = loc.is_featured && (!loc.featured_until || new Date(loc.featured_until) > new Date());

                                        return (
                                            <tr key={loc.id} className={`hover:bg-gray-50 transition-colors group ${isFeatured ? 'bg-amber-50/30' : ''}`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className={`p-2.5 rounded-xl mr-3 shadow-sm ${loc.type === 'ev' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            <MapPin size={18} strokeWidth={2} />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                                                {loc.name}
                                                                {isFeatured && (
                                                                    <Star size={12} className="text-amber-500 fill-amber-500" />
                                                                )}
                                                            </div>
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${loc.type === 'ev' ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                                                {loc.type === 'ev' ? 'EV Station' : 'Parking Lot'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-bold text-gray-900">{loc.owner_profiles?.name || 'Unknown'}</div>
                                                    <div className="text-xs text-gray-500">{loc.owner_profiles?.email}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-700 font-medium">{loc.city}</div>
                                                    <div className="text-xs text-gray-400 truncate max-w-[150px]">{loc.address}</div>
                                                </td>

                                                {/* Plan Column */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <select
                                                        value={plan}
                                                        onChange={(e) => handlePlanChange(loc.id, e.target.value)}
                                                        disabled={updatingId === loc.id}
                                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-all ${planStyle.bg} ${planStyle.text} ${planStyle.border} ${updatingId === loc.id ? 'opacity-50' : 'hover:shadow-sm'}`}
                                                    >
                                                        {Object.entries(LISTING_PLANS).map(([key, val]) => (
                                                            <option key={key} value={key}>
                                                                {val.label} {key !== 'free' ? `(Rs.${val.price}/mo)` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>

                                                {/* Featured Toggle */}
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <button
                                                        onClick={() => handleFeaturedToggle(loc.id, loc.is_featured)}
                                                        disabled={updatingId === loc.id}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                            isFeatured ? 'bg-amber-500' : 'bg-gray-200'
                                                        } ${updatingId === loc.id ? 'opacity-50' : ''}`}
                                                    >
                                                        <span
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                isFeatured ? 'translate-x-5' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="text-sm font-bold text-gray-900">
                                                            {loc.available_slots} <span className="text-gray-400 font-normal">/ {loc.total_slots} Slots</span>
                                                        </div>
                                                        <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded w-fit border border-green-100">
                                                            Rs.{loc.price_per_hour}/hr
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setSelectedLayoutId(loc.id)}
                                                            className="text-blue-600 hover:text-white hover:bg-blue-600 p-2 rounded-lg transition-all shadow-sm hover:shadow-md border border-blue-200 hover:border-blue-600"
                                                            title="View Layout"
                                                        >
                                                            <LayoutGrid size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteLocation(loc.id)}
                                                            className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-all shadow-sm hover:shadow-md border border-transparent hover:border-red-600"
                                                            title="Delete Property"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Slot Layout Modal */}
            <SlotLayoutModal
                locationId={selectedLayoutId}
                isOpen={!!selectedLayoutId}
                onClose={() => setSelectedLayoutId(null)}
            />
        </div>
    );
};

export default AdminProperties;
