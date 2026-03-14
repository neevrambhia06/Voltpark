
import { Search, MapPin, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <section className="relative bg-primary text-white py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1573348722427-f1d6d19dba7c?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20"></div>
                <div className="relative max-w-5xl mx-auto text-center z-10">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 font-ferron">
                        Find <span className="text-secondary">Smart Parking</span> & <br />
                        <span className="text-secondary">EV Charging</span>
                    </h1>
                    <p className="text-sm text-gray-300 mb-6 max-w-xl mx-auto">
                        Book your spot in seconds. Secure, convenient, and reliable.
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-lg mx-auto bg-white rounded-full p-1 flex items-center shadow-lg transform hover:scale-[1.01] transition-transform duration-300">
                        <MapPin className="text-gray-400 ml-3" size={16} />
                        <input
                            type="text"
                            placeholder="Search locations..."
                            className="flex-grow px-3 py-2 text-gray-800 focus:outline-none rounded-full text-xs sm:text-sm"
                        />
                        <button className="bg-secondary text-white px-5 py-2 rounded-full font-bold hover:bg-teal-600 transition-colors flex items-center text-xs sm:text-sm">
                            Search
                        </button>
                    </div>
                </div>
            </section>

            {/* Feature Cards Section */}
            <section className="py-10 px-4 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-5">

                        {/* Parking Card */}
                        <Link to="/parking" className="card group block transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl p-6">
                            <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                                <MapPin className="text-primary" size={24} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 mb-2">Find Parking</h2>
                            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                                Access thousands of secure parking spots in garages and lots across the city.
                            </p>
                            <div className="inline-flex items-center font-bold text-black group-hover:text-secondary transition-colors text-sm">
                                Find Parking <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        {/* EV Charging Card */}
                        <Link to="/ev-charging" className="card group block transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl p-6">
                            <div className="bg-teal-50 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors">
                                <Zap className="text-secondary" size={24} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 mb-2">EV Charging</h2>
                            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                                Locate fast and reliable EV charging stations.
                            </p>
                            <div className="inline-flex items-center font-bold text-black group-hover:text-secondary transition-colors text-sm">
                                Find Stations <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-12 px-4 bg-white">
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-10">How It Works</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-4">
                            <div className="text-5xl font-bold text-gray-100 mb-3">01</div>
                            <h3 className="text-lg font-bold mb-2">Search</h3>
                            <p className="text-gray-600 text-sm">Find the perfect spot or charging station near your destination.</p>
                        </div>
                        <div className="p-4">
                            <div className="text-5xl font-bold text-gray-100 mb-3">02</div>
                            <h3 className="text-lg font-bold mb-2">Book</h3>
                            <p className="text-gray-600 text-sm">Reserve your space in advance to guarantee availability.</p>
                        </div>
                        <div className="p-4">
                            <div className="text-5xl font-bold text-gray-100 mb-3">03</div>
                            <h3 className="text-lg font-bold mb-2">Park & Pay</h3>
                            <p className="text-gray-600 text-sm">Arrive, park, and pay seamlessly through the app. No tickets needed.</p>
                        </div>
                    </div>
                </div>
            </section>
            {/* Become an Owner CTA */}
            <section className="py-16 bg-secondary text-white text-center px-4">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl md:text-4xl font-bold mb-4">Own a Parking Space?</h2>
                    <p className="text-lg md:text-xl mb-8 opacity-90">
                        Maximize your earnings by listing your parking spots or EV charging stations on VOLTpark.
                        Manage bookings and get paid seamlessly.
                    </p>
                    <Link
                        to="/owner-register"
                        className="inline-block bg-white text-secondary font-bold text-base px-8 py-3 rounded-full shadow-lg hover:bg-gray-100 transform hover:scale-105 transition-all"
                    >
                        Become a Partner
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default Home;
