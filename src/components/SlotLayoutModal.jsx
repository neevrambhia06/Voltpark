import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CarSlotLayout from './CarSlotLayout';

const SlotLayoutModal = ({ locationId, isOpen, onClose }) => {
    const [location, setLocation] = useState(null);
    const [occupiedSlots, setOccupiedSlots] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && locationId) {
            fetchLocationDetails();
        }
    }, [isOpen, locationId]);

    const fetchLocationDetails = async () => {
        setLoading(true);
        try {
            // 1. Fetch Location Info (Total Slots)
            const { data: locData, error: locError } = await supabase
                .from('locations')
                .select('*')
                .eq('id', locationId)
                .single();

            if (locError) throw locError;
            setLocation(locData);

            // 2. Fetch Occupied Slots (Active Bookings) via RPC
            const { data: occupiedData, error: bookingError } = await supabase
                .rpc('get_occupied_slots', { p_location_id: locationId });

            if (bookingError) {
                console.warn("RPC failed, falling back to direct select", bookingError);
                // Fallback logic if needed, or just throw
                throw bookingError;
            }

            const occupied = occupiedData.map(b => b.selected_slot).filter(Boolean);
            setOccupiedSlots(occupied);

        } catch (error) {
            console.error("Error fetching slot layout data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">
                        {loading ? 'Loading Layout...' : `${location?.name || 'Location'} Layout`}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : location ? (
                        <div className="flex flex-col items-center">
                            <CarSlotLayout
                                totalSlots={location.total_slots}
                                availableSlots={location.available_slots} // dynamic from DB/Calc
                                type={location.type}
                                occupiedSlots={occupiedSlots}
                                readOnly={true}
                            />
                            <p className="mt-4 text-sm text-gray-500 text-center">
                                This view shows the live status of the slots for {location.name}.
                            </p>
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-500">
                            Failed to load location data.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SlotLayoutModal;
