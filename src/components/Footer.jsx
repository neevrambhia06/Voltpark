
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-primary text-white pt-12 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center mb-4">
                            <span className="text-2xl font-bold text-white">VOLT</span>
                            <span className="text-2xl font-bold text-secondary">park</span>
                        </div>
                        <p className="text-gray-300 text-sm">
                            Smart parking and EV charging solutions for the modern city. Find, book, and go.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                        <ul className="space-y-2">
                            <li><Link to="/" className="text-gray-300 hover:text-secondary transition-colors">Home</Link></li>
                            <li><Link to="/locations" className="text-gray-300 hover:text-secondary transition-colors">Locations</Link></li>
                            <li><Link to="/about" className="text-gray-300 hover:text-secondary transition-colors">About Us</Link></li>
                            <li><Link to="/contact" className="text-gray-300 hover:text-secondary transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
                        <ul className="space-y-2">
                            <li className="flex items-center space-x-2 text-gray-300">
                                <MapPin size={16} className="text-secondary" />
                                <span>123 Innovation Drive, Tech City</span>
                            </li>
                            <li className="flex items-center space-x-2 text-gray-300">
                                <Phone size={16} className="text-secondary" />
                                <span>+1 (555) 123-4567</span>
                            </li>
                            <li className="flex items-center space-x-2 text-gray-300">
                                <Mail size={16} className="text-secondary" />
                                <span>support@voltpark.com</span>
                            </li>
                        </ul>
                    </div>

                    {/* Social */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
                        <div className="flex space-x-4">
                            <a href="#" className="bg-slate-800 p-2 rounded-full hover:bg-secondary transition-colors"><Facebook size={20} /></a>
                            <a href="#" className="bg-slate-800 p-2 rounded-full hover:bg-secondary transition-colors"><Twitter size={20} /></a>
                            <a href="#" className="bg-slate-800 p-2 rounded-full hover:bg-secondary transition-colors"><Instagram size={20} /></a>
                        </div>
                    </div>
                </div>
                <div className="border-t border-slate-800 mt-8 pt-8 text-center text-gray-400 text-sm">
                    &copy; {new Date().getFullYear()} VOLTpark. All rights reserved.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
