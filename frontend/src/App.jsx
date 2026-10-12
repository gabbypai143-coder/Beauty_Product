import React, { useState, Component } from 'react';
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

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center', background: '#faf8f5', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ color: '#235848', fontSize: '24px', marginBottom: '12px' }}>Something went wrong loading the view</h2>
          <p style={{ color: '#666', maxWidth: '500px', fontSize: '14px', marginBottom: '20px' }}>
            {String(this.state.error?.message || 'An unexpected rendering error occurred.')}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 24px', background: '#235848', color: '#fff', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const [trackingOpen, setTrackingOpen] = useState(false);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <div className="flex flex-col min-h-screen bg-[#faf8f5]">
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
    </ErrorBoundary>
  );
}

export default App;
