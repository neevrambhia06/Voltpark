import React, { useState, useEffect } from 'react';
import WheelPicker from './WheelPicker';
import { format, addDays, startOfHour, setHours, setMinutes } from 'date-fns';

const DateTimeWheel = ({ selectedDate, onChange }) => {
    // Generate Dates (Next 30 days)
    const dates = Array.from({ length: 30 }, (_, i) => {
        const date = addDays(new Date(), i);
        return {
            value: format(date, 'yyyy-MM-dd'),
            label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(date, 'EEE, MMM d')
        };
    });

    const hours = Array.from({ length: 12 }, (_, i) => ({
        value: i === 0 ? 12 : i,
        label: (i === 0 ? 12 : i).toString()
    }));

    const minutes = Array.from({ length: 12 }, (_, i) => ({
        value: i * 5,
        label: (i * 5).toString().padStart(2, '0')
    }));

    const ampm = [
        { value: 'AM', label: 'AM' },
        { value: 'PM', label: 'PM' }
    ];

    // Internal state to manage wheels individually
    const [dateVal, setDateVal] = useState(format(selectedDate || new Date(), 'yyyy-MM-dd'));
    const [hourVal, setHourVal] = useState(parseInt(format(selectedDate || new Date(), 'h')));
    const [minVal, setMinVal] = useState(Math.round(parseInt(format(selectedDate || new Date(), 'm')) / 5) * 5);
    const [ampmVal, setAmpmVal] = useState(format(selectedDate || new Date(), 'a'));

    useEffect(() => {
        // Construct new date object when any wheel changes
        const dateParts = dateVal.split('-'); // yyyy-mm-dd
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[2]);

        let h = hourVal === 12 ? 0 : hourVal;
        if (ampmVal === 'PM') h += 12;
        if (ampmVal === 'AM' && h === 12) h = 0; // Standard 12AM check (though h=0 covers 12AM if hourVal=12)
        // Wait, standard logic: 12 AM = 0, 1 AM = 1... 11 AM = 11, 12 PM = 12, 1 PM = 13

        // Correct logic:
        let finalHours = hourVal;
        if (ampmVal === 'PM' && hourVal !== 12) finalHours += 12;
        if (ampmVal === 'AM' && hourVal === 12) finalHours = 0;

        const newDate = new Date(year, month, day, finalHours, minVal);

        // If constructed date is different from passed selectedDate (avoid loop), trigger onChange
        if (newDate.getTime() !== selectedDate.getTime()) {
            onChange(newDate);
        }
    }, [dateVal, hourVal, minVal, ampmVal]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2">
                <div className="col-span-1">
                    <WheelPicker
                        label="Date"
                        items={dates}
                        value={dateVal}
                        onChange={setDateVal}
                    />
                </div>
                <div className="col-span-1">
                    <WheelPicker
                        label="Hour"
                        items={hours}
                        value={hourVal}
                        onChange={setHourVal}
                        infinite
                    />
                </div>
                <div className="col-span-1">
                    <WheelPicker
                        label="Min"
                        items={minutes}
                        value={minVal}
                        onChange={setMinVal}
                        infinite
                    />
                </div>
                <div className="col-span-1">
                    <WheelPicker
                        label="Meridiem"
                        items={ampm}
                        value={ampmVal}
                        onChange={setAmpmVal}
                    />
                </div>
            </div>

            <div className="mt-4 text-center border-t pt-4">
                <p className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-1">Selected Time</p>
                <p className="text-xl font-bold text-primary">
                    {format(selectedDate, 'EEEE, MMM d @ h:mm a')}
                </p>
            </div>
        </div>
    );
};

export default DateTimeWheel;
