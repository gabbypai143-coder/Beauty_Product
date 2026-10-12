import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Heart, Sparkles, Lock } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-[#1b2420] text-white pt-16 pb-12 border-t border-[#235848]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <span className="font-serif text-3xl font-bold tracking-tight text-white">
              Jammaila<span className="text-[#c49a45]">-skin</span>
            </span>
            <p className="text-[#8e9c96] text-sm max-w-md leading-relaxed">
              Dedicated to pure, bio-compatible skincare rituals that nourish, protect, and illuminate. Carefully crafted with potent botanical actives and dermatological science.
            </p>
            <div className="flex items-center gap-4 pt-2 text-[#c49a45] text-xs font-semibold tracking-wider uppercase">
              <span className="flex items-center gap-1.5"><ShieldCheck size={16} /> 100% Authentic</span>
              <span className="flex items-center gap-1.5"><Sparkles size={16} /> Cruelty Free</span>
              <span className="flex items-center gap-1.5"><Heart size={16} /> Clean Beauty</span>
            </div>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h4 className="font-serif text-lg text-white font-semibold">Customer Care</h4>
            <ul className="space-y-2 text-sm text-[#8e9c96]">
              <li><a href="#about" className="hover:text-white transition-colors">Our Story</a></li>
              <li><a href="#categories" className="hover:text-white transition-colors">Browse Collections</a></li>
              <li><a href="#shipping" className="hover:text-white transition-colors">Shipping & J&T Delivery</a></li>
              <li><span className="text-white/60">Support: jammailaskin@gmail.com</span></li>
            </ul>
          </div>

          {/* Quick Access / Portal */}
          <div className="space-y-3">
            <h4 className="font-serif text-lg text-white font-semibold">Store Administration</h4>
            <p className="text-xs text-[#8e9c96]">
              Authorized administrative access for inventory, sales metrics, and order dispatch.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
              >
                <Lock size={13} className="text-[#c49a45]" />
                <span>Admin Portal</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#63706a] gap-4">
          <p>&copy; {new Date().getFullYear()} Jammaila-skin Cosmetics. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Philippines Nationwide Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
