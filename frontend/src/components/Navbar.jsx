import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Search, Sparkles, Menu, X, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const Navbar = ({ onOpenTracking }) => {
  const { cartCount, setIsCartOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#235848]/10 transition-all">
      {/* Announcement Bar */}
      <div className="bg-[#235848] text-white text-xs py-2 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-3">
        <Sparkles size={14} className="text-[#c49a45]" />
        <span>Authentic Botanical Formulations &bull; Fast Nationwide Delivery via J&T Express</span>
        <Sparkles size={14} className="text-[#c49a45]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[#235848] hover:text-[#194437]"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Brand Logo */}
        <Link to="/" className="flex flex-col items-center sm:items-start group">
          <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#1b2420] group-hover:text-[#235848] transition-colors">
            Jammaila<span className="text-[#c49a45]">-skin</span>
          </span>
          <span className="text-[10px] tracking-[0.25em] uppercase text-[#63706a] -mt-1 font-semibold">
            Botanical Alchemy
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#1b2420]">
          <Link to="/" className="hover:text-[#235848] transition-colors">
            Shop Catalog
          </Link>
          <a href="#categories" className="hover:text-[#235848] transition-colors">
            Categories
          </a>
          <a href="#about" className="hover:text-[#235848] transition-colors">
            Our Philosophy
          </a>
          <button
            onClick={onOpenTracking}
            className="flex items-center gap-1.5 text-[#235848] hover:text-[#194437] font-semibold"
          >
            <Truck size={16} />
            <span>Track Order</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onOpenTracking}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#235848] bg-[#e9f2ee] hover:bg-[#d8e8e1] transition-all"
          >
            <Search size={14} />
            <span>Track</span>
          </button>

          {/* Cart Bag */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 rounded-full bg-[#f3efe9] hover:bg-[#ebe6dc] text-[#235848] transition-all flex items-center justify-center shadow-sm"
            aria-label="View shopping bag"
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#235848] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#235848]/10 px-4 py-4 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-semibold text-[#1b2420] hover:text-[#235848]"
          >
            Shop Catalog
          </Link>
          <a
            href="#categories"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-semibold text-[#1b2420] hover:text-[#235848]"
          >
            Categories
          </a>
          <a
            href="#about"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-semibold text-[#1b2420] hover:text-[#235848]"
          >
            Our Philosophy
          </a>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenTracking();
            }}
            className="w-full text-left py-2 text-base font-semibold text-[#235848] flex items-center gap-2"
          >
            <Truck size={18} />
            <span>Track My Order</span>
          </button>
        </div>
      )}
    </header>
  );
};
