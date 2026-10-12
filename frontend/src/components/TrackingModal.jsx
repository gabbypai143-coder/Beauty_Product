import React, { useState } from 'react';
import { X, Search, Truck, CheckCircle2, Clock, PackageCheck, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/shipping';

export const TrackingModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState(null);

  if (!isOpen) return null;

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setOrderData(null);

    try {
      const res = await fetch(`/api/orders/track?query=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No matching order found. Please verify your ID or phone number.');
      }

      setOrderData(data);
    } catch (err) {
      setError(err.message || 'Failed to locate order.');
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = (orderData?.orderStatus || orderData?.status || 'Pending').toLowerCase();
  const steps = [
    { key: 'pending', label: 'Order Placed', desc: 'Received & Queued' },
    { key: 'processing', label: 'Processing', desc: 'Packed & Prepared' },
    { key: 'shipped', label: 'Shipped', desc: orderData?.courier_name ? `Via ${orderData.courier_name}` : 'In Transit' },
    { key: 'delivered', label: 'Delivered', desc: 'Completed' },
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'processing': return 1;
      case 'shipped': return 2;
      case 'delivered': return 3;
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  const activeIndex = getStepIndex(currentStatus);

  return (
    <div className="modal-overlay">
      <div className="modal-card max-w-lg p-6 sm:p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <Truck className="text-[#235848]" size={24} />
          <h2 className="font-serif text-2xl font-bold text-[#1b2420]">Track Your Order</h2>
        </div>
        <p className="text-sm text-[#63706a] mb-6">
          Enter your <span className="font-semibold text-[#1b2420]">Order ID</span> or your <span className="font-semibold text-[#1b2420]">Phone Number</span> to see real-time shipment updates.
        </p>

        {/* Search Input Form */}
        <form onSubmit={handleTrack} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 24 or 09171234567"
              className="w-full pl-10 pr-4 py-3 bg-[#f3efe9] border border-[#235848]/15 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#235848]/30 font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="btn btn-primary px-5 py-3 text-sm disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 mb-6">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Order Details Output */}
        {orderData && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header info */}
            <div className="bg-[#faf8f5] p-4 rounded-2xl border border-[#235848]/10 flex flex-wrap justify-between items-center gap-3">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#63706a] font-semibold">Order Number</span>
                <div className="text-lg font-bold text-[#1b2420]">#{orderData.id}</div>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase tracking-wider text-[#63706a] font-semibold">Current Status</span>
                <div>
                  <span className={`badge ${
                    currentStatus === 'delivered' ? 'badge-delivered' :
                    currentStatus === 'shipped' ? 'badge-shipped' :
                    currentStatus === 'processing' ? 'badge-processing' :
                    currentStatus === 'cancelled' ? 'badge-cancelled' : 'badge-pending'
                  } uppercase text-xs mt-0.5`}>
                    {orderData.orderStatus || orderData.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Courier & Tracking # */}
            {(orderData.tracking_number || orderData.courier_name) && (
              <div className="p-3.5 bg-[#e9f2ee] rounded-xl text-xs text-[#235848] font-medium flex items-center justify-between">
                <div>
                  <strong>Courier:</strong> {orderData.courier_name || 'J&T Express'}
                </div>
                <div>
                  <strong>Waybill:</strong> <code className="bg-white/80 px-2 py-0.5 rounded font-mono font-bold">{orderData.tracking_number || 'Pending'}</code>
                </div>
              </div>
            )}

            {/* Visual Step Timeline */}
            {currentStatus !== 'cancelled' ? (
              <div className="py-2">
                <div className="relative flex justify-between">
                  {/* Connecting Line */}
                  <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 -z-0">
                    <div
                      className="h-full bg-[#235848] transition-all duration-500"
                      style={{ width: `${(Math.max(0, activeIndex) / (steps.length - 1)) * 100}%` }}
                    />
                  </div>

                  {steps.map((s, idx) => {
                    const isDone = idx <= activeIndex;
                    const isCurrent = idx === activeIndex;
                    return (
                      <div key={s.key} className="flex flex-col items-center text-center z-10 w-20">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isDone
                              ? 'bg-[#235848] text-white shadow-md'
                              : 'bg-white border-2 border-gray-300 text-gray-400'
                          } ${isCurrent ? 'ring-4 ring-[#235848]/20' : ''}`}
                        >
                          {isDone ? <CheckCircle2 size={16} /> : idx + 1}
                        </div>
                        <span className={`text-[11px] font-semibold mt-2 ${isCurrent ? 'text-[#235848]' : 'text-gray-500'}`}>
                          {s.label}
                        </span>
                        <span className="text-[9px] text-gray-400 hidden sm:block">{s.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-center text-xs font-medium">
                This order was cancelled. Please contact support if you need assistance.
              </div>
            )}

            {/* Items Purchased List */}
            {Array.isArray(orderData.items) && orderData.items.length > 0 && (
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Order Items</h4>
                <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 text-xs">
                  {orderData.items.map((it, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center">
                      <span className="font-medium text-gray-800">
                        {it.productName || it.name || it.title} &times; {it.quantity || it.qty || 1}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency((it.price || 0) * (it.quantity || it.qty || 1))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Summary */}
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Order Total:</span>
              <span className="text-base font-bold text-[#235848]">
                {formatCurrency(orderData.total || 0)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
