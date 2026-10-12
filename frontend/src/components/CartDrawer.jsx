import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/shipping';

export const CartDrawer = () => {
  const { isCartOpen, setIsCartOpen, cart, updateQty, removeFromCart, cartSubtotal, cartWeight } = useCart();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col z-10 animate-slide-left">
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-[#235848]/10 flex items-center justify-between bg-[#faf8f5]">
            <div className="flex items-center gap-2">
              <ShoppingBag size={20} className="text-[#235848]" />
              <h2 className="font-serif text-xl font-bold text-[#1b2420]">Your Bag</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#e9f2ee] text-[#235848]">
                {cart.length} {cart.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-full text-[#63706a] hover:text-[#1b2420] hover:bg-black/5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {cart.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-[#f3efe9] flex items-center justify-center text-[#235848]">
                  <ShoppingBag size={32} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1b2420]">Your bag is empty</h3>
                  <p className="text-sm text-[#63706a] mt-1 max-w-xs">
                    Explore our botanical rituals and treat your skin to nourishing care.
                  </p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="btn btn-primary text-sm mt-2"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {cart.map((item) => (
                  <div key={item.id} className="py-4 flex gap-4 items-center">
                    <img
                      src={item.imageUrl || item.img || '/assets/images/hero1.jpg.png'}
                      alt={item.name || item.title}
                      className="w-18 h-18 sm:w-20 sm:h-20 object-cover rounded-xl border border-gray-100 bg-[#f7f7f4]"
                      onError={(e) => {
                        e.target.src = '/assets/images/hero1.jpg.png';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#1b2420] truncate">
                        {item.name || item.title}
                      </h4>
                      <p className="text-xs text-[#63706a] mt-0.5">
                        {item.weight ? `${Number(item.weight).toFixed(2)} kg` : '0.20 kg'}
                      </p>
                      <div className="text-sm font-semibold text-[#235848] mt-1">
                        {formatCurrency(item.price)}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-[#faf8f5]">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="p-1 px-2 text-gray-500 hover:text-black hover:bg-gray-100"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="px-2 text-xs font-bold text-gray-800 min-w-6 text-center">
                            {item.qty || item.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="p-1 px-2 text-gray-500 hover:text-black hover:bg-gray-100"
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-gray-400 hover:text-red-500 p-1"
                          aria-label="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-[#235848]/10 bg-[#faf8f5] space-y-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-[#63706a]">
                  <span>Total Weight:</span>
                  <span className="font-semibold">{cartWeight.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#1b2420]">
                  <span>Subtotal:</span>
                  <span className="text-lg text-[#235848]">{formatCurrency(cartSubtotal)}</span>
                </div>
                <p className="text-[11px] text-[#63706a] italic">
                  Shipping calculated at checkout via J&T Express.
                </p>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full btn btn-primary py-3.5 text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={16} />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#63706a]">
                <ShieldCheck size={14} className="text-[#235848]" />
                <span>Secure Checkout with Official QR & Bank Options</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
