
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MapPin, Trash2, ArrowLeft, Search, Filter, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import SlotLayoutModal from '../../components/SlotLayoutModal';

const AdminProperties = () => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, parking, ev
    const [selectedLayoutId, setSelectedLayoutId] = useState(null);

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

    const filteredLocations = locations.filter(loc => {
        const matchesSearch = loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (loc.owner_profiles?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || loc.type === filterType;
        return matchesSearch && matchesType;
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
                            <h1 className="text-3xl font-bold text-gray-900">All Properties</h1>
                        </div>
                        <div className="text-sm text-gray-500 font-medium">
                            Total: {filteredLocations.length}
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
                            placeholder="Search properties, cities, owners..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter size={20} className="text-gray-400" />
                        <select
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="parking">Parking</option>
                            <option value="ev">EV Charging</option>
                        </select>
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
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stats</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500">Loading properties...</td></tr>
                                ) : filteredLocations.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500">No properties found matching your filters.</td></tr>
                                ) : (
                                    filteredLocations.map((loc) => (
                                        <tr key={loc.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`p-2.5 rounded-xl mr-3 shadow-sm ${loc.type === 'ev' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        <MapPin size={18} strokeWidth={2} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">{loc.name}</div>
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
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="text-sm font-bold text-gray-900">
                                                        {loc.available_slots} <span className="text-gray-400 font-normal">/ {loc.total_slots} Slots</span>
                                                    </div>
                                                    <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded w-fit border border-green-100">
                                                        ₹{loc.price_per_hour}/hr
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
                                    ))
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
