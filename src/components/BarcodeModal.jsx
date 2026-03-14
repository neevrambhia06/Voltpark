import React from 'react';
import Barcode from 'react-barcode';
import { X, Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';

const BarcodeModal = ({ booking, onClose }) => {
    if (!booking) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-10 relative transform transition-all scale-100">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors"
                >
                    <X size={32} />
                </button>

                <div className="text-center">
                    <h3 className="text-3xl font-extrabold text-gray-900 mb-2">Booking Access</h3>
                    <p className="text-lg text-gray-500 mb-8">Scan this barcode at the entry gate</p>

                    <div className="bg-white p-6 rounded-2xl border-2 border-gray-100 shadow-inner mb-8 flex justify-center">
                        <Barcode
                            value={booking.barcode_value || booking.id}
                            width={2}
                            height={100}
                            fontSize={18}
                        />
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-4">
                        <div className="flex items-start">
                            <MapPin className="mr-3 text-primary mt-1" size={24} />
                            <div>
                                <p className="text-sm text-gray-500 font-bold uppercase">Location</p>
                                <p className="text-xl font-bold text-gray-900">{booking.locations?.name}</p>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <Calendar className="mr-3 text-secondary mt-1" size={24} />
                            <div>
                                <p className="text-sm text-gray-500 font-bold uppercase">Date & Time</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {format(new Date(booking.start_time), 'MMM d, yyyy')}
                                </p>
                                <p className="text-lg text-gray-700">
                                    {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <button
                        onClick={onClose}
                        className="w-full btn-primary py-4 text-xl"
                    >
                        Close Ticket
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BarcodeModal;
