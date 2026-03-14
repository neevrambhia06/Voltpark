
import LiquidNavbar from './LiquidNavbar';
import Footer from './Footer';

const Layout = ({ children }) => {
    return (
        <div className="flex flex-col min-h-screen">
            <LiquidNavbar />
            <main className="flex-grow bg-gray-50">
                {children}
            </main>
            <Footer />
        </div>
    );
};

export default Layout;
