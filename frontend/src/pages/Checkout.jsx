import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, ArrowLeft, Upload, CheckCircle2, AlertTriangle, 
  CreditCard, Smartphone, Building, Truck, ShoppingBag, Plus, Minus, Trash2
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { calculateCheckoutShipping, formatCurrency } from '../utils/shipping';

const REGIONS = [
  'NCR', 'CAR', 'Region I', 'Region II', 'Region III',
  'Region IV-A', 'Region IV-B', 'Region V', 'Region VI',
  'Region VII', 'Region VIII', 'Region IX', 'Region X',
  'Region XI', 'Region XII', 'Region XIII', 'BARMM'
];

export const Checkout = () => {
  const { cart, cartSubtotal, cartWeight, updateQty, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState('NCR');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Dynamic shipping calculation
  const shippingInfo = calculateCheckoutShipping(region, cartWeight, cartSubtotal);
  const grandTotal = cartSubtotal + shippingInfo.totalShipping;

  // Handle receipt preview
  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const validatePhone = (val) => /^09\d{9}$/.test(String(val).trim());

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setError('');

    if (cart.length === 0) {
      setError('Your shopping bag is empty.');
      return;
    }

    if (!name.trim()) {
      setError('Please provide your complete name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!validatePhone(phone)) {
      setError('Please provide a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).');
      return;
    }

    if (!address.trim()) {
      setError('Please provide your complete street address.');
      return;
    }

    if (shippingInfo.isOverLimit) {
      setError('Aggregate parcel weight exceeds 10.00 kg. Please split your order into smaller packages.');
      return;
    }

    // Prepare FormData payload for backend
    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('customerEmail', email.trim().toLowerCase());
    formData.append('phone', phone.trim());
    formData.append('address', `${address.trim()}, Region: ${region}`);
    formData.append('province', region);
    formData.append('islandGroup', region);
    formData.append('paymentMethod', paymentMethod);
    formData.append('subtotal', String(cartSubtotal));
    formData.append('shippingFee', String(shippingInfo.totalShipping));
    formData.append('total', String(grandTotal));

    if (referenceNumber.trim()) {
      formData.append('gcashReference', referenceNumber.trim());
    }

    if (receiptFile) {
      formData.append('receipt', receiptFile);
    }

    // Format cart items
    const formattedItems = cart.map((item) => ({
      productId: item.id,
      productName: item.name || item.title,
      price: Number(item.price) || 0,
      quantity: Number(item.qty || item.quantity || 1),
      weight: Number(item.weight || item.weight_kg || 0.20),
    }));
    formData.append('items', JSON.stringify(formattedItems));

    setSubmitting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to place order.');
      }

      // Success! Clear cart and display confirmation
      clearCart();
      setOrderSuccess(data.order || data);
    } catch (err) {
      setError(err.message || 'Could not complete order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-[#faf8f5] py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#235848]/15 shadow-xl max-w-lg w-full text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-[#e9f2ee] text-[#235848] mx-auto flex items-center justify-center shadow-inner">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <span className="badge badge-delivered text-xs mb-2 uppercase tracking-wider">
              Order Placed Successfully
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#1b2420]">
              Thank You, {orderSuccess.name || name}!
            </h2>
            <p className="text-sm text-[#63706a] mt-1">
              Your order <span className="font-bold text-[#1b2420]">#{orderSuccess.id}</span> has been confirmed. A confirmation receipt was prepared for dispatch via J&T Express.
            </p>
          </div>

          <div className="bg-[#faf8f5] p-5 rounded-2xl border border-[#235848]/10 text-left text-xs space-y-2.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Order ID:</span>
              <span className="font-bold text-gray-800">#{orderSuccess.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery Courier:</span>
              <span className="font-semibold text-[#235848]">J&T Express Nationwide</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Option:</span>
              <span className="font-semibold text-gray-800">{paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery Region:</span>
              <span className="font-semibold text-gray-800">{region}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-sm">
              <span className="font-bold text-gray-700">Total Amount:</span>
              <span className="font-bold text-[#235848]">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <Link
              to="/"
              className="btn btn-primary w-full py-3.5 text-sm"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb / Back button */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#235848] hover:text-[#194437] transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Return to Store Catalog</span>
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1b2420] mt-2">
            Complete Your Skincare Order
          </h1>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 mb-8">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Customer & Shipping Details */}
          <div className="lg:col-span-7 space-y-8">
            {/* Step 1: Contact & Shipping */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#235848]/10 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
                <Truck className="text-[#235848]" size={22} />
                <h3 className="font-serif text-xl font-bold text-[#1b2420]">
                  1. Shipping Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="w-full px-4 py-3 bg-[#faf8f5] border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#235848]/20 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="maria@example.com"
                    className="w-full px-4 py-3 bg-[#faf8f5] border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#235848]/20 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Phone Number (PH Mobile) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09171234567"
                    maxLength={11}
                    className="w-full px-4 py-3 bg-[#faf8f5] border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#235848]/20 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Delivery Region (J&T Express Rate) *
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-4 py-3 bg-[#faf8f5] border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#235848]/20 focus:outline-none font-semibold text-[#235848]"
                  >
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Complete Street Address &amp; Barangay *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House/Unit #, Street, Barangay, City, Postal Code"
                    className="w-full px-4 py-3 bg-[#faf8f5] border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#235848]/20 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Payment Method */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#235848]/10 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
                <CreditCard className="text-[#235848]" size={22} />
                <h3 className="font-serif text-xl font-bold text-[#1b2420]">
                  2. Payment Method
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'GCash', label: 'GCash QR', icon: Smartphone },
                  { id: 'Maya', label: 'Maya QR', icon: Smartphone },
                  { id: 'Metrobank', label: 'Bank Transfer', icon: Building },
                  { id: 'Cash on Delivery', label: 'Cash on Delivery', icon: Truck },
                ].map((pm) => {
                  const Icon = pm.icon;
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 transition-all ${
                        isSelected
                          ? 'border-[#235848] bg-[#e9f2ee] text-[#235848] ring-2 ring-[#235848]/30 font-bold'
                          : 'border-gray-200 bg-[#faf8f5] text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="text-xs">{pm.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* QR Code and Payment Upload Instructions */}
              {paymentMethod === 'GCash' && (
                <div className="bg-[#faf8f5] p-5 rounded-2xl border border-[#235848]/15 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <img
                      src="/assets/images/gcash.jpg.png"
                      alt="GCash QR"
                      className="w-40 h-40 object-contain rounded-xl border border-gray-200 bg-white p-2"
                    />
                    <div className="text-xs text-gray-600 space-y-1.5 text-center sm:text-left">
                      <h4 className="font-bold text-sm text-[#1b2420]">GCash QR Payment</h4>
                      <p>1. Open your GCash app and scan the QR code above.</p>
                      <p>2. Enter the exact total amount: <strong className="text-[#235848]">{formatCurrency(grandTotal)}</strong>.</p>
                      <p>3. Upload your payment screenshot or input your reference number below.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-gray-500">
                        GCash Reference No.
                      </label>
                      <input
                        type="text"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="e.g. 10029384812"
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-gray-500">
                        Upload Receipt Screenshot
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptChange}
                        className="w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#e9f2ee] file:text-[#235848]"
                      />
                    </div>
                  </div>

                  {receiptPreview && (
                    <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200 inline-block">
                      <span className="text-[10px] text-gray-400 block mb-1">Receipt Preview:</span>
                      <img src={receiptPreview} alt="Receipt preview" className="h-28 object-contain rounded" />
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'Maya' && (
                <div className="bg-[#faf8f5] p-5 rounded-2xl border border-[#235848]/15 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <img
                      src="/assets/payment/maya1.png"
                      alt="Maya QR"
                      className="w-40 h-40 object-contain rounded-xl border border-gray-200 bg-white p-2"
                    />
                    <div className="text-xs text-gray-600 space-y-1.5 text-center sm:text-left">
                      <h4 className="font-bold text-sm text-[#1b2420]">Maya QR Payment</h4>
                      <p>1. Open your Maya app and scan the QR code.</p>
                      <p>2. Send the exact amount: <strong className="text-[#235848]">{formatCurrency(grandTotal)}</strong>.</p>
                      <p>3. Attach proof of payment below.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-gray-500">
                        Maya Reference No.
                      </label>
                      <input
                        type="text"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="e.g. 98127391823"
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-gray-500">
                        Upload Receipt Screenshot
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptChange}
                        className="w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#e9f2ee] file:text-[#235848]"
                      />
                    </div>
                  </div>

                  {receiptPreview && (
                    <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200 inline-block">
                      <span className="text-[10px] text-gray-400 block mb-1">Receipt Preview:</span>
                      <img src={receiptPreview} alt="Receipt preview" className="h-28 object-contain rounded" />
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'Metrobank' && (
                <div className="bg-[#faf8f5] p-5 rounded-2xl border border-[#235848]/15 space-y-3 text-xs text-gray-600">
                  <h4 className="font-bold text-sm text-[#1b2420]">Metrobank Bank Transfer</h4>
                  <p><strong>Account Name:</strong> Jammaila Skincare Official</p>
                  <p><strong>Account Number:</strong> 291-3-2918274-1</p>
                  <p>Transfer <strong className="text-[#235848]">{formatCurrency(grandTotal)}</strong> and upload your deposit slip below.</p>
                  <div className="pt-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptChange}
                      className="w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#e9f2ee] file:text-[#235848]"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'Cash on Delivery' && (
                <div className="bg-[#faf8f5] p-4 rounded-xl border border-gray-200 text-xs text-gray-600 flex items-center gap-3">
                  <Truck size={20} className="text-[#235848] shrink-0" />
                  <span>
                    Pay with exact cash directly to the J&T Express courier rider upon delivery.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary & Review */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#235848]/10 shadow-sm space-y-6 sticky top-28">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="text-[#235848]" size={20} />
                  <h3 className="font-serif text-xl font-bold text-[#1b2420]">
                    Order Summary
                  </h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#e9f2ee] text-[#235848]">
                  {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Items List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 pr-1 space-y-3">
                {cart.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">Your bag is empty.</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="pt-3 first:pt-0 flex gap-3 items-center">
                      <img
                        src={item.imageUrl || item.img || '/assets/images/hero1.jpg.png'}
                        alt={item.name || item.title}
                        className="w-14 h-14 object-cover rounded-xl border border-gray-100 bg-[#f7f7f4]"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-[#1b2420] truncate">
                          {item.name || item.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, -1)}
                            className="p-1 rounded bg-gray-100 text-gray-600 hover:text-black"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="text-xs font-bold text-gray-800">
                            {item.qty || item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, 1)}
                            className="p-1 rounded bg-gray-100 text-gray-600 hover:text-black"
                          >
                            <Plus size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="ml-auto text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-[#235848]">
                        {formatCurrency((item.price || 0) * (item.qty || item.quantity || 1))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Calculations Breakdown */}
              <div className="border-t border-gray-100 pt-4 space-y-2.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Weight:</span>
                  <span className={`font-semibold ${shippingInfo.isOverLimit ? 'text-red-600 font-bold' : 'text-gray-800'}`}>
                    {cartWeight.toFixed(2)} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>J&T Base Shipping ({region}):</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(shippingInfo.baseRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>J&T Insurance Fee:</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(shippingInfo.insuranceFee)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#1b2420] border-t border-gray-200 pt-3">
                  <span>Grand Total:</span>
                  <span className="text-lg text-[#235848]">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {shippingInfo.isOverLimit && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>Weight exceeds 10 kg limit for single parcel.</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || cart.length === 0 || shippingInfo.isOverLimit}
                className="w-full btn btn-primary py-4 text-sm font-bold shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <span>Securing Order...</span>
                ) : (
                  <>
                    <span>Place Order &bull; {formatCurrency(grandTotal)}</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[#63706a]">
                <ShieldCheck size={14} className="text-[#235848]" />
                <span>Protected by SSL Encryption &amp; J&T Tracking</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
