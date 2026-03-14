
const About = () => {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Hero Section */}
            <section className="bg-primary text-white py-20 px-8">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-5xl md:text-7xl font-extrabold mb-6">About VOLTpark</h1>
                    <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
                        Revolutionizing urban mobility with smart parking and EV charging solutions.
                    </p>
                </div>
            </section>

            {/* Mission Section */}
            <section className="py-20 px-8">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">Our Mission</h2>
                    <p className="text-xl text-gray-700 leading-relaxed text-center mb-12">
                        At VOLTpark, we believe that finding a parking spot shouldn't be a hassle, and charging your EV should be as easy as plugging in a toaster.
                        We connect drivers with available spaces and charging stations in real-time, reducing traffic, lowering emissions, and making cities more livable.
                    </p>

                    <div className="grid md:grid-cols-3 gap-12 mt-16">
                        <div className="text-center p-8 bg-white rounded-3xl shadow-xl">
                            <div className="text-6xl mb-4">🌍</div>
                            <h3 className="text-2xl font-bold mb-4">Sustainable</h3>
                            <p className="text-gray-600">Promoting electric vehicle adoption and reducing urban congestion.</p>
                        </div>
                        <div className="text-center p-8 bg-white rounded-3xl shadow-xl">
                            <div className="text-6xl mb-4">⚡</div>
                            <h3 className="text-2xl font-bold mb-4">Innovative</h3>
                            <p className="text-gray-600">Leveraging smart data to optimize parking and energy usage.</p>
                        </div>
                        <div className="text-center p-8 bg-white rounded-3xl shadow-xl">
                            <div className="text-6xl mb-4">🤝</div>
                            <h3 className="text-2xl font-bold mb-4">Community</h3>
                            <p className="text-gray-600">Empowering property owners and drivers to connect directly.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default About;
