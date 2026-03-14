import React from 'react';
import { Zap, Bike } from 'lucide-react';

// Enhanced Top-Down Car SVG Component
const TopDownCar = ({ className, strokeWidth = 2, fill = "none", colorClass = "text-gray-400" }) => (
    <svg
        viewBox="0 0 120 220"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
    >
        {/* Shadow (Only visible when filled/active) */}
        <ellipse cx="60" cy="110" rx="45" ry="90" fill="black" fillOpacity="0.1" className="transition-opacity duration-300" />

        {/* Tires */}
        <rect x="10" y="35" width="12" height="25" rx="4" fill="currentColor" className="opacity-80" /> {/* Front Left */}
        <rect x="98" y="35" width="12" height="25" rx="4" fill="currentColor" className="opacity-80" /> {/* Front Right */}
        <rect x="10" y="150" width="12" height="25" rx="4" fill="currentColor" className="opacity-80" /> {/* Rear Left */}
        <rect x="98" y="150" width="12" height="25" rx="4" fill="currentColor" className="opacity-80" /> {/* Rear Right */}

        {/* Main Body Shape */}
        <path
            d="M 25 20 
               Q 60 5 95 20 
               L 100 30 
               Q 105 40 105 170 
               Q 105 190 95 200 
               Q 60 210 25 200 
               Q 15 190 15 170 
               Q 15 40 20 30 Z"
            fill={fill}
            className="transition-all duration-300"
        />

        {/* Windshield */}
        <path
            d="M 20 50 Q 60 40 100 50 L 95 75 Q 60 65 25 75 Z"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="none"
        />

        {/* Rear Window */}
        <path
            d="M 28 155 Q 60 145 92 155 L 90 175 Q 60 180 30 175 Z"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="none"
        />

        {/* Roof */}
        <rect x="25" y="78" width="70" height="74" rx="10" stroke="currentColor" strokeOpacity="0.5" />

        {/* Headlights */}
        <path d="M 25 20 Q 30 25 22 28" strokeWidth="2" strokeOpacity="0.8" />
        <path d="M 95 20 Q 90 25 98 28" strokeWidth="2" strokeOpacity="0.8" />

        {/* Taillights */}
        <path d="M 25 200 Q 30 195 22 192" className="text-red-500" stroke={fill === 'none' ? 'currentColor' : '#ef4444'} strokeWidth="3" />
        <path d="M 95 200 Q 90 195 98 192" className="text-red-500" stroke={fill === 'none' ? 'currentColor' : '#ef4444'} strokeWidth="3" />

        {/* Side Mirrors */}
        <path d="M 15 55 L 5 50 L 5 65 L 15 65" fill={fill} />
        <path d="M 105 55 L 115 50 L 115 65 L 105 65" fill={fill} />
    </svg>
);

const CarSlotLayout = ({
    totalSlots,
    availableSlots,
    type = 'parking',
    onSelect,
    selectedSlot,
    occupiedSlots = [],
    readOnly = false,
    vehicleType = 'car' // 'car' or 'bike'
}) => {
    // Determine prefix based on type
    let prefix = 'P';
    if (type === 'ev') prefix = 'C'; // Charger
    else if (vehicleType === 'bike') prefix = 'B';
    else if (vehicleType === 'car') prefix = 'C'; // Car

    // Generate slots array
    const slots = Array.from({ length: totalSlots }, (_, i) => {
        const slotNum = i + 1;
        const slotId = `${prefix}${slotNum}`;
        // Case-insensitive check
        const isOccupied = occupiedSlots.some(id => String(id).toLowerCase() === slotId.toLowerCase());

        return {
            id: slotId,
            number: slotId,
            isOccupied: isOccupied
        };
    });

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-8 px-2">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    {readOnly ? 'Location Layout' : `Select ${type === 'ev' ? 'Charger' : 'Parking Spot'}`}
                </h3>
                <div className="flex gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Available</span>
                        <span className="text-lg font-bold text-green-600">{Math.max(0, totalSlots - occupiedSlots.length)}</span>
                    </div>
                </div>
            </div>

            {/* Parking Lot Surface */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-y-10 gap-x-4 sm:gap-x-8 mx-auto justify-items-center pb-10">
                {slots.map((slot) => {
                    const isSelected = selectedSlot === slot.id;
                    const isOccupied = slot.isOccupied;
                    const isClickable = !readOnly && !isOccupied;

                    // Styles
                    let carColorClass = "text-gray-300";
                    let carFill = "none";
                    let containerClass = "";
                    let labelClass = "text-gray-400 bg-gray-100";

                    if (isOccupied) {
                        carColorClass = "text-red-500";
                        carFill = "#ef4444"; // Tailwind Red 500
                        containerClass = "opacity-90";
                        labelClass = "bg-red-100 text-red-700 font-bold";
                    } else if (isSelected) {
                        carColorClass = "text-blue-600";
                        carFill = "#2563eb"; // Tailwind Blue 600
                        containerClass = "scale-110 z-10 drop-shadow-xl";
                        labelClass = "bg-blue-600 text-white font-bold shadow-lg";
                    } else if (isClickable) {
                        carColorClass = "text-gray-300 group-hover:text-green-500 transition-colors duration-300";
                        containerClass = "cursor-pointer hover:-translate-y-2 hover:drop-shadow-lg group";
                        labelClass = "group-hover:bg-green-100 group-hover:text-green-700 transition-colors";
                    }

                    return (
                        <div
                            key={slot.id}
                            onClick={() => isClickable && onSelect && onSelect(slot.id)}
                            className={`
                                relative flex flex-col items-center justify-end
                                w-20 h-40 transition-all duration-300 ease-out
                                ${containerClass}
                            `}
                        >
                            {/* Parking Lines (Floor) */}
                            {!isSelected && !isOccupied && (
                                <div className="absolute inset-x-0 top-2 bottom-6 border-x-2 border-dashed border-gray-200 rounded-sm pointer-events-none group-hover:border-green-200 transition-colors" />
                            )}

                            {/* The Car Graphic */}
                            <div className={`relative w-full h-full p-2 flex items-center justify-center ${carColorClass}`}>
                                <TopDownCar
                                    className="w-full h-full drop-shadow-sm"
                                    fill={carFill}
                                    strokeWidth={isSelected || isOccupied ? 1 : 1.5}
                                />
                                {vehicleType === 'bike' && (
                                    <div className={`absolute inset-0 flex items-center justify-center ${carColorClass}`}>
                                        <div className="bg-white/90 p-1 rounded-full shadow-sm">
                                            <Bike size={24} className={isOccupied ? "text-red-500" : isSelected ? "text-blue-600" : "text-gray-500"} />
                                        </div>
                                    </div>
                                )}

                                {/* EV Overlay */}
                                {type === 'ev' && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                        <div className={`
                                            p-1.5 rounded-full shadow-sm
                                            ${isOccupied ? 'bg-white/20 backdrop-blur-sm' : isSelected ? 'bg-white/20 backdrop-blur-sm' : 'bg-yellow-100'}
                                        `}>
                                            <Zap size={14} className={`${isOccupied || isSelected ? 'text-white' : 'text-yellow-600'} fill-current`} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Slot Number Badge */}
                            <span className={`
                                absolute -bottom-3 px-2.5 py-0.5 rounded-md text-[10px] tracking-wider uppercase
                                transition-all duration-300 transform
                                ${labelClass}
                            `}>
                                {slot.number}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-gray-100 mt-4">
                <div className="flex items-center gap-2 opacity-70">
                    <div className="w-8 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                        <span className="text-[9px] text-gray-400">P1</span>
                    </div>
                    <span className="text-xs font-medium text-gray-500">Empty</span>
                </div>
                <div className="flex items-center gap-2">
                    <TopDownCar className="w-8 h-12 text-blue-600" fill="#2563eb" />
                    <span className="text-xs font-medium text-gray-600">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                    <TopDownCar className="w-8 h-12 text-red-500" fill="#ef4444" />
                    <span className="text-xs font-medium text-gray-600">Occupied</span>
                </div>
            </div>
        </div>
    );
};

export default CarSlotLayout;
