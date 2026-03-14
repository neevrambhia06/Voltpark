import React from 'react';

const SlotGrid = ({ totalSlots, availableSlots, type = 'parking', onSelect, selectedSlot, occupiedSlots = [] }) => {
    // Determine prefix based on type
    const prefix = type === 'ev' ? 'C' : 'P';

    // Generate slots array
    const slots = Array.from({ length: totalSlots }, (_, i) => {
        const slotNum = i + 1;
        const slotId = `${prefix}${slotNum}`;

        // Check if slot is in the occupied list
        // If occupiedSlots is provided, use it. Otherwise fallback to count (optional, but better to be explicit)
        const isOccupied = occupiedSlots.includes(slotId);
        const isAvailable = !isOccupied;

        return {
            id: slotId,
            number: slotId,
            isAvailable: isAvailable
        };
    });

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">Select {type === 'ev' ? 'Charger' : 'Slot'}</h3>
                <span className="text-sm font-medium px-3 py-1 bg-gray-100 rounded-full text-gray-600">
                    {availableSlots} / {totalSlots} Available
                </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {slots.map((slot) => {
                    const isSelected = selectedSlot === slot.id;

                    // Style logic
                    let baseClasses = "rounded-lg p-3 text-center transition-all duration-200 flex flex-col items-center justify-center h-20 border-2";
                    let stateClasses = "";

                    if (!slot.isAvailable) {
                        // Occupied
                        stateClasses = "bg-red-50 border-red-100 text-red-300 cursor-not-allowed";
                    } else if (isSelected) {
                        // Selected
                        stateClasses = "bg-blue-600 border-blue-600 text-white shadow-lg transform scale-105 cursor-pointer z-10";
                    } else {
                        // Available
                        stateClasses = "bg-green-50 border-green-200 text-green-700 hover:border-green-400 hover:shadow-md cursor-pointer hover:-translate-y-1";
                    }

                    return (
                        <button
                            key={slot.id}
                            disabled={!slot.isAvailable}
                            onClick={() => onSelect(slot.id)}
                            className={`${baseClasses} ${stateClasses}`}
                            type="button" // Prevent form submission
                        >
                            <span className={`text-xl font-bold ${isSelected ? 'text-white' : ''}`}>
                                {slot.number}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider font-bold mt-1">
                                {!slot.isAvailable ? 'Booked' : isSelected ? 'Selected' : 'Open'}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center">
                    <div className="w-4 h-4 rounded bg-green-50 border border-green-200 mr-2"></div>
                    <span className="text-gray-600">Available</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 rounded bg-red-50 border border-red-100 mr-2"></div>
                    <span className="text-gray-400">Occupied</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 rounded bg-blue-600 border border-blue-600 mr-2"></div>
                    <span className="text-gray-900 font-medium">Selected</span>
                </div>
            </div>

            {selectedSlot && (
                <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-center font-bold border border-blue-100 animate-fade-in">
                    Selected Slot: {selectedSlot}
                </div>
            )}
        </div>
    );
};

export default SlotGrid;
