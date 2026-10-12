import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { TrackingModal } from './components/TrackingModal';
import { Storefront } from './pages/Storefront';
import { Checkout } from './pages/Checkout';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';

export function App() {
  const [trackingOpen, setTrackingOpen] = useState(false);

  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <div className="flex flex-col min-h-screen">
            <Routes>
              {/* Storefront Route */}
              <Route
                path="/"
                element={
                  <>
                    <Navbar onOpenTracking={() => setTrackingOpen(true)} />
                    <Storefront />
                    <Footer />
                    <CartDrawer />
                    <TrackingModal
                      isOpen={trackingOpen}
                      onClose={() => setTrackingOpen(false)}
                    />
                  </>
                }
              />

              {/* Checkout Route */}
              <Route path="/checkout" element={<Checkout />} />

              {/* Admin Login Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Admin Portal */}
              <Route path="/admin" element={<AdminDashboard />} />

              {/* Fallback to Storefront */}
              <Route
                path="*"
                element={
                  <>
                    <Navbar onOpenTracking={() => setTrackingOpen(true)} />
                    <Storefront />
                    <Footer />
                    <CartDrawer />
                    <TrackingModal
                      isOpen={trackingOpen}
                      onClose={() => setTrackingOpen(false)}
                    />
                  </>
                }
              />
            </Routes>
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
