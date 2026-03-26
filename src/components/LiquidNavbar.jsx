
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LiquidNavbar = () => {
    const { user, userRole, logout } = useAuth();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredPath, setHoveredPath] = useState(location.pathname);

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Locations', path: '/locations' },
        { name: 'Parking', path: '/parking' },
        { name: 'EV Charging', path: '/ev-charging' },
    ];

    const handleLogout = async () => {
        await logout();
    };

    const getDashboardLink = () => {
        if (userRole === 'admin') return '/admin-portal';
        if (userRole === 'owner') return '/owner-portal';
        return '/user-dashboard';
    };

    return (
        <nav className="bg-white sticky top-0 z-[1001] py-4 px-6 md:px-12">
            <div className="max-w-7xl mx-auto flex justify-between items-center relative">

                {/* Logo */}
                <Link to="/" className="flex items-center group z-10">
                    <span className="text-2xl font-black text-primary tracking-tighter group-hover:scale-105 transition-transform">VOLT</span>
                    <span className="text-2xl font-black text-secondary tracking-tighter group-hover:scale-105 transition-transform">park</span>
                </Link>

                {/* Desktop Liquid Navigation */}
                <div className="hidden md:flex items-center bg-gray-100/50 backdrop-blur-md p-1.5 rounded-full shadow-sm border border-gray-200/50">
                    {navLinks.map((link) => {
                        const isActive = location.pathname === link.path;
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                onMouseEnter={() => setHoveredPath(link.path)}
                                onMouseLeave={() => setHoveredPath(location.pathname)}
                                className={`relative px-6 py-2.5 text-sm font-bold rounded-full transition-colors duration-200 z-10 ${isActive ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="liquid-nav-bg"
                                        className="absolute inset-0 bg-primary rounded-full -z-10 shadow-md"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                {link.name}
                            </Link>
                        );
                    })}
                </div>

                {/* User Section / Mobile Toggle */}
                <div className="flex items-center gap-4 z-10">
                    {/* Desktop Auth */}
                    <div className="hidden md:block">
                        {user ? (
                            <div className="relative group">
                                <button className="flex items-center gap-3 bg-white pl-2 pr-4 py-1.5 rounded-full border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-blue-400 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                                        {user.email?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="text-left hidden lg:block">
                                        <p className="text-xs font-bold text-gray-700 leading-none">{user.email?.split('@')[0]}</p>
                                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{userRole}</p>
                                    </div>
                                </button>

                                {/* Dropdown */}
                                <div className="absolute right-0 mt-3 z-[1002] w-56 bg-white rounded-2xl shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-right border border-gray-100 overflow-hidden">
                                    <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100">
                                        <p className="text-xs text-gray-400 font-medium">Signed in as</p>
                                        <p className="text-sm font-bold text-gray-800 truncate">{user.email}</p>
                                    </div>
                                    <div className="p-2">
                                        <Link 
                                            to={userRole === 'owner' ? "/owner/profile" : "/profile"} 
                                            className="flex items-center px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-primary hover:bg-blue-50 rounded-xl transition-colors"
                                        >
                                            <User size={16} className="mr-3" /> Profile
                                        </Link>
                                        <Link to={getDashboardLink()} className="flex items-center px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-primary hover:bg-blue-50 rounded-xl transition-colors">
                                            <Menu size={16} className="mr-3" /> Dashboard
                                        </Link>
                                    </div>
                                    <div className="border-t border-gray-100 p-2">
                                        <button onClick={handleLogout} className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                            <LogOut size={16} className="mr-3" /> Logout
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Link to="/login" className="px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 flex items-center gap-2">
                                Login
                            </Link>
                        )}
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden overflow-hidden bg-white border-t border-gray-100 mt-4"
                    >
                        <div className="py-4 space-y-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    onClick={() => setIsOpen(false)}
                                    className={`block px-4 py-3 text-base font-bold rounded-xl mx-2 ${location.pathname === link.path
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="border-t border-gray-100 my-2 pt-2">
                                {user ? (
                                    <>
                                        <Link to={getDashboardLink()} onClick={() => setIsOpen(false)} className="block px-4 py-3 text-base font-bold text-gray-600 hover:bg-gray-50 mx-2 rounded-xl">
                                            Dashboard
                                        </Link>
                                        <button onClick={handleLogout} className="w-full text-left block px-4 py-3 text-base font-bold text-red-500 hover:bg-red-50 mx-2 rounded-xl">
                                            Logout
                                        </button>
                                    </>
                                ) : (
                                    <Link to="/login" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-base font-bold text-white bg-primary mx-2 rounded-xl text-center shadow-lg shadow-blue-200">
                                        Login / Signup
                                    </Link>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default LiquidNavbar;
