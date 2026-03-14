
import { Mail, Phone, MapPin } from 'lucide-react';

const Contact = () => {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            {/* Hero Section */}
            <section className="bg-primary text-white py-20 px-8">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-5xl md:text-7xl font-extrabold mb-6">Contact Us</h1>
                    <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
                        We'd love to hear from you. Get in touch with our team.
                    </p>
                </div>
            </section>

            <section className="py-20 px-8">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16">
                    {/* Contact Info */}
                    <div>
                        <h2 className="text-3xl font-bold mb-8">Get in Touch</h2>
                        <div className="space-y-8">
                            <div className="flex items-start">
                                <MapPin className="text-secondary mt-1 mr-4" size={32} />
                                <div>
                                    <h3 className="text-xl font-bold">Visit Us</h3>
                                    <p className="text-gray-600 text-lg">123 Innovation Drive<br />Tech City, TC 90210</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <Phone className="text-secondary mt-1 mr-4" size={32} />
                                <div>
                                    <h3 className="text-xl font-bold">Call Us</h3>
                                    <p className="text-gray-600 text-lg">+91 7977342090</p>
                                    <p className="text-gray-500 text-sm">Mon-Fri 9am - 5pm</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <Mail className="text-secondary mt-1 mr-4" size={32} />
                                <div>
                                    <h3 className="text-xl font-bold">Email Us</h3>
                                    <p className="text-gray-600 text-lg">support@voltpark.com</p>
                                    <p className="text-gray-600 text-lg">partnerships@voltpark.com</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-gray-50 p-10 rounded-3xl shadow-lg">
                        <form className="space-y-6">
                            <div>
                                <label className="block text-gray-700 font-bold mb-2">Name</label>
                                <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-secondary focus:ring-2 focus:ring-secondary outline-none transition-all" placeholder="Your Name" />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-bold mb-2">Email</label>
                                <input type="email" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-secondary focus:ring-2 focus:ring-secondary outline-none transition-all" placeholder="john@example.com" />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-bold mb-2">Message</label>
                                <textarea rows="4" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-secondary focus:ring-2 focus:ring-secondary outline-none transition-all" placeholder="How can we help?"></textarea>
                            </div>
                            <button type="button" className="w-full btn-secondary text-white font-bold py-4 rounded-xl hover:bg-teal-600 transition-colors shadow-md">
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Contact;
