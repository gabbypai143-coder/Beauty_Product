import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, BarChart3, LogOut, Plus, 
  Search, Eye, Trash2, Edit3, CheckCircle2, Clock, Truck, AlertTriangle, 
  X, Upload, Bell, Volume2, VolumeX, ShieldCheck, RefreshCw, ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/shipping';

export const AdminDashboard = () => {
  const { token, isAdmin, logout, getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin || !token) {
      navigate('/login');
    }
  }, [isAdmin, token, navigate]);

  // Main UI State
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'orders', 'inventory'
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Search & Filter States
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [productSearch, setProductSearch] = useState('');

  // Modals State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [shippingModalOrder, setShippingModalOrder] = useState(null);
  const [shippingCourier, setShippingCourier] = useState('J&T Express');
  const [shippingTrackingNumber, setShippingTrackingNumber] = useState('');

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isOutOfStockModalOpen, setIsOutOfStockModalOpen] = useState(false);

  // Form State for Add / Edit Product
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Cleanser',
    price: '',
    stock: '',
    description: '',
    usage: '',
    productType: 'STANDARD',
    packageItems: [],
    imageUrl: '',
  });
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState('');

  // Toast alert
  const [toast, setToast] = useState(null);
  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  // Play audio chime for new orders using Web Audio API
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Fetch Orders
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.orders) ? data.orders : []);
        setOrders(list);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    }
  };

  // Fetch Products
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.products) ? data.products : []);
        setProducts(list);
      }
    } catch (err) {
      console.error('Fetch products error:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchOrders(), fetchProducts()]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin && token) {
      loadAllData();
    }
  }, [isAdmin, token]);

  // Periodic polling for orders
  const lastOrderCount = useRef(0);
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isAdmin || !token) return;
      try {
        const res = await fetch('/api/orders', { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (Array.isArray(data?.orders) ? data.orders : []);
          if (lastOrderCount.current > 0 && list.length > lastOrderCount.current) {
            playChime();
            showToast('success', `New order received! Total orders: ${list.length}`);
          }
          lastOrderCount.current = list.length;
          setOrders(list);
        }
      } catch {
        // silent retry
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [isAdmin, token, soundEnabled]);

  // Computed Metrics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => {
    const isCancelled = String(o.orderStatus || o.status || '').toLowerCase() === 'cancelled';
    return isCancelled ? sum : sum + (Number(o.total) || 0);
  }, 0);
  const totalProducts = products.length;
  const outOfStockProducts = products.filter((p) => Number(p.stock) <= 0);

  // Status Update Handler
  const handleStatusChange = async (orderId, newStatus) => {
    if (newStatus === 'Shipped') {
      const ord = orders.find((o) => o.id === orderId);
      setShippingModalOrder(ord);
      setShippingCourier(ord?.courierName || 'J&T Express');
      setShippingTrackingNumber(ord?.trackingNumber || '');
      return;
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');
      showToast('success', `Order #${orderId} marked as ${newStatus}`);
      fetchOrders();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // Submit Shipping Modal
  const submitShippingModal = async (e) => {
    e.preventDefault();
    if (!shippingModalOrder) return;

    try {
      // Update tracking
      await fetch(`/api/orders/${shippingModalOrder.id}/tracking`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courierName: shippingCourier,
          trackingNumber: shippingTrackingNumber,
        }),
      });

      // Update status to Shipped
      await fetch(`/api/orders/${shippingModalOrder.id}/status`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'Shipped' }),
      });

      showToast('success', `Order #${shippingModalOrder.id} dispatched via ${shippingCourier}!`);
      setShippingModalOrder(null);
      fetchOrders();
    } catch (err) {
      showToast('error', 'Failed to update shipping details.');
    }
  };

  // Delete Order Handler
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm(`Are you sure you want to permanently delete Order #${orderId}?`)) return;

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete order');
      showToast('success', `Order #${orderId} deleted successfully.`);
      fetchOrders();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // Delete Product Handler
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm(`Are you sure you want to delete this product?`)) return;

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete product');
      showToast('success', 'Product deleted from inventory.');
      fetchProducts();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // Save Product (Add or Edit)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const isEdit = Boolean(editingProduct);

    const formData = new FormData();
    formData.append('name', productForm.name);
    formData.append('category', productForm.category);
    formData.append('price', String(productForm.price));
    formData.append('stock', String(productForm.stock));
    formData.append('description', productForm.description);
    formData.append('usage', productForm.usage);
    formData.append('productType', productForm.productType);

    if (productForm.productType === 'PACKAGE') {
      formData.append('packageItems', JSON.stringify(productForm.packageItems));
    }

    if (productImageFile) {
      formData.append('image', productImageFile);
    } else if (productForm.imageUrl) {
      formData.append('imageUrl', productForm.imageUrl);
    }

    try {
      const url = isEdit ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!res.ok) throw new Error(`Failed to ${isEdit ? 'update' : 'create'} product.`);
      showToast('success', `Product ${isEdit ? 'updated' : 'added'} successfully!`);
      setIsAddProductOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // Filtered lists
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      String(o.id).includes(orderSearch) ||
      String(o.name || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
      String(o.phone || '').includes(orderSearch);
    if (!matchSearch) return false;
    if (orderStatusFilter === 'All') return true;
    return (
      String(o.orderStatus || o.status || '').toLowerCase() ===
      orderStatusFilter.toLowerCase()
    );
  });

  const filteredProducts = products.filter((p) => {
    return (
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase()))
    );
  });

  return (
    <div className="min-h-screen bg-[#faf8f5] flex">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-xs font-bold border animate-slideUp flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#1b2420] text-white flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-white/10">
            <span className="font-serif text-2xl font-bold tracking-tight text-white block">
              Jammaila<span className="text-[#deb35c]">-skin</span>
            </span>
            <span className="text-[10px] tracking-widest uppercase text-[#8e9c96] font-semibold">
              Admin Operations
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5 text-sm font-semibold">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#235848] text-white shadow-md'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                activeTab === 'orders'
                  ? 'bg-[#235848] text-white shadow-md'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingCart size={18} />
                <span>Orders</span>
              </div>
              {orders.length > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20">
                  {orders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                activeTab === 'inventory'
                  ? 'bg-[#235848] text-white shadow-md'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package size={18} />
                <span>Inventory</span>
              </div>
              {outOfStockProducts.length > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/80 text-white">
                  {outOfStockProducts.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>Sound Chime: {soundEnabled ? 'Enabled' : 'Muted'}</span>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 font-bold"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="bg-white border-b border-[#235848]/10 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold text-[#1b2420] capitalize">
              {activeTab} Overview
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              className="p-2 rounded-xl text-gray-500 hover:text-[#235848] hover:bg-gray-100"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
            >
              <span>View Storefront</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </header>

        <div className="p-6 sm:p-8 space-y-8 flex-1">
          {/* TAB 1: DASHBOARD METRICS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn">
              {/* 4 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-[#235848]/10 shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <ShoppingCart size={18} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-[#1b2420]">{totalOrders}</div>
                  <span className="text-[11px] text-gray-400">All recorded customer purchases</span>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-[#235848]/10 shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <BarChart3 size={18} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-[#235848]">
                    {formatCurrency(totalRevenue)}
                  </div>
                  <span className="text-[11px] text-gray-400">Excluding cancelled orders</span>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-[#235848]/10 shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Products</span>
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <Package size={18} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-[#1b2420]">{totalProducts}</div>
                  <span className="text-[11px] text-gray-400">Active catalog formulations</span>
                </div>

                <div
                  onClick={() => setIsOutOfStockModalOpen(true)}
                  className="bg-white p-6 rounded-3xl border border-[#235848]/10 shadow-sm space-y-2 cursor-pointer hover:border-red-300 transition-colors"
                >
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Out of Stock</span>
                    <div className="p-2 rounded-xl bg-red-50 text-red-600">
                      <AlertTriangle size={18} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-red-600">{outOfStockProducts.length}</div>
                  <span className="text-[11px] text-red-500 font-semibold underline">
                    Click to view restock list
                  </span>
                </div>
              </div>

              {/* Recent Orders Overview Table */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#235848]/10 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl font-bold text-[#1b2420]">
                    Recent Orders Feed
                  </h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-[#235848] hover:underline"
                  >
                    View All Orders &rarr;
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
                        <th className="py-3 px-3">Order ID</th>
                        <th className="py-3 px-3">Customer</th>
                        <th className="py-3 px-3">Region</th>
                        <th className="py-3 px-3">Total</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {orders.slice(0, 5).map((ord) => (
                        <tr key={ord.id} className="hover:bg-[#faf8f5]">
                          <td className="py-3.5 px-3 font-bold text-[#1b2420]">#{ord.id}</td>
                          <td className="py-3.5 px-3 text-gray-700">{ord.name}</td>
                          <td className="py-3.5 px-3 text-gray-500">{ord.province || 'NCR'}</td>
                          <td className="py-3.5 px-3 font-bold text-[#235848]">
                            {formatCurrency(ord.total)}
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`badge uppercase text-[10px] ${
                                ord.status === 'Delivered' ? 'badge-delivered' :
                                ord.status === 'Shipped' ? 'badge-shipped' :
                                ord.status === 'Processing' ? 'badge-processing' :
                                ord.status === 'Cancelled' ? 'badge-cancelled' : 'badge-pending'
                              }`}
                            >
                              {ord.orderStatus || ord.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <button
                              onClick={() => setSelectedOrder(ord)}
                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-[#235848] hover:text-white transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS MANAGEMENT */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Filter & Search Bar */}
              <div className="bg-white p-5 rounded-3xl border border-[#235848]/10 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by Order ID, Name, or Phone..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#faf8f5] border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#235848]/20"
                  />
                </div>

                {/* Status Tabs */}
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                  {['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        orderStatusFilter === st
                          ? 'bg-[#235848] text-white shadow-sm'
                          : 'bg-[#faf8f5] text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-white rounded-3xl border border-[#235848]/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#faf8f5] border-b border-gray-100 text-gray-500 uppercase tracking-wider font-bold">
                        <th className="py-4 px-4">Order ID</th>
                        <th className="py-4 px-4">Customer Details</th>
                        <th className="py-4 px-4">Payment &amp; Proof</th>
                        <th className="py-4 px-4">Amount</th>
                        <th className="py-4 px-4">Delivery Status</th>
                        <th className="py-4 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-gray-400">
                            No matching customer orders found.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-[#faf8f5]/60">
                            <td className="py-4 px-4 font-bold text-[#1b2420]">
                              #{ord.id}
                            </td>
                            <td className="py-4 px-4 space-y-0.5">
                              <div className="font-bold text-gray-900">{ord.name}</div>
                              <div className="text-[11px] text-gray-500">{ord.phone}</div>
                              <div className="text-[11px] text-gray-400 truncate max-w-xs">{ord.address}</div>
                            </td>
                            <td className="py-4 px-4 space-y-1">
                              <span className="font-semibold text-gray-800 block">
                                {ord.paymentMethod}
                              </span>
                              {ord.customerReceiptUrl && (
                                <button
                                  onClick={() => setSelectedOrder(ord)}
                                  className="text-[11px] text-[#235848] font-bold underline flex items-center gap-1"
                                >
                                  <Eye size={12} />
                                  <span>View Receipt</span>
                                </button>
                              )}
                              {ord.gcashReference && (
                                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                                  Ref: {ord.gcashReference}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-bold text-sm text-[#235848]">
                                {formatCurrency(ord.total)}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                Ship: {formatCurrency(ord.shippingFee || 0)}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <select
                                value={ord.orderStatus || ord.status || 'Pending'}
                                onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border ${
                                  (ord.orderStatus || ord.status) === 'Delivered'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : (ord.orderStatus || ord.status) === 'Shipped'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : (ord.orderStatus || ord.status) === 'Processing'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : (ord.orderStatus || ord.status) === 'Cancelled'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Processing">Processing</option>
                                <option value="Shipped">Shipped</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                              {ord.trackingNumber && (
                                <div className="text-[10px] text-gray-500 font-mono mt-1">
                                  Waybill: {ord.trackingNumber}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right space-x-1.5">
                              <button
                                onClick={() => setSelectedOrder(ord)}
                                className="p-2 rounded-xl bg-gray-100 hover:bg-[#235848] hover:text-white transition-colors"
                                title="View Details"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(ord.id)}
                                className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                                title="Delete Order"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INVENTORY MANAGEMENT */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Action Bar */}
              <div className="bg-white p-5 rounded-3xl border border-[#235848]/10 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search product formulations..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#faf8f5] border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#235848]/20"
                  />
                </div>

                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setProductForm({
                      name: '',
                      category: 'Cleanser',
                      price: '',
                      stock: '',
                      description: '',
                      usage: '',
                      productType: 'STANDARD',
                      packageItems: [],
                      imageUrl: '',
                    });
                    setProductImageFile(null);
                    setProductImagePreview('');
                    setIsAddProductOpen(true);
                  }}
                  className="btn btn-primary text-xs py-2.5 px-5 flex items-center gap-2 shadow-md w-full sm:w-auto justify-center"
                >
                  <Plus size={16} />
                  <span>Add New Product</span>
                </button>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-3xl border border-[#235848]/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#faf8f5] border-b border-gray-100 text-gray-500 uppercase tracking-wider font-bold">
                        <th className="py-4 px-4">Item</th>
                        <th className="py-4 px-4">Category</th>
                        <th className="py-4 px-4">Type</th>
                        <th className="py-4 px-4">Price</th>
                        <th className="py-4 px-4">Stock</th>
                        <th className="py-4 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {filteredProducts.map((p) => {
                        const isOut = Number(p.stock) <= 0;
                        const isPackage = String(p.productType || '').toUpperCase() === 'PACKAGE';
                        return (
                          <tr key={p.id} className="hover:bg-[#faf8f5]/60">
                            <td className="py-4 px-4 flex items-center gap-3">
                              <img
                                src={p.imageUrl || '/assets/images/hero1.jpg.png'}
                                alt={p.name}
                                className="w-12 h-12 object-cover rounded-xl border border-gray-200 bg-[#faf8f5]"
                                onError={(e) => {
                                  e.target.src = '/assets/images/hero1.jpg.png';
                                }}
                              />
                              <div>
                                <div className="font-bold text-gray-900">{p.name}</div>
                                <div className="text-[11px] text-gray-400 line-clamp-1 max-w-xs">{p.description}</div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-gray-600 font-semibold">{p.category}</td>
                            <td className="py-4 px-4">
                              <span
                                className={`badge text-[10px] ${
                                  isPackage ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {isPackage ? 'PACKAGE BUNDLE' : 'STANDARD'}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-bold text-sm text-[#235848]">
                              {formatCurrency(p.price)}
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`badge text-[10px] ${
                                  isOut ? 'badge-cancelled' : 'badge-delivered'
                                }`}
                              >
                                {isOut ? 'Out of Stock (0)' : `${p.stock} units`}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right space-x-1.5">
                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  setProductForm({
                                    name: p.name,
                                    category: p.category || 'Cleanser',
                                    price: p.price,
                                    stock: p.stock,
                                    description: p.description || '',
                                    usage: p.usage || '',
                                    productType: p.productType || 'STANDARD',
                                    packageItems: Array.isArray(p.packageItems) ? p.packageItems : [],
                                    imageUrl: p.imageUrl || '',
                                  });
                                  setProductImagePreview(p.imageUrl || '');
                                  setProductImageFile(null);
                                  setIsAddProductOpen(true);
                                }}
                                className="p-2 rounded-xl bg-gray-100 hover:bg-[#235848] hover:text-white transition-colors"
                                title="Edit Product"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: ORDER DETAILS & RECEIPT PREVIEW */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-card max-w-xl p-6 sm:p-8 relative">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-black hover:bg-gray-100"
            >
              <X size={20} />
            </button>

            <h3 className="font-serif text-2xl font-bold text-[#1b2420] mb-4">
              Order Details #{selectedOrder.id}
            </h3>

            <div className="space-y-4 text-xs">
              <div className="bg-[#faf8f5] p-4 rounded-2xl border border-gray-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Customer:</span>
                  <span className="font-bold text-gray-900">{selectedOrder.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Email:</span>
                  <span>{selectedOrder.customerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Phone:</span>
                  <span>{selectedOrder.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Address:</span>
                  <span className="text-right max-w-xs">{selectedOrder.address}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5">
                  <span className="text-gray-500 font-medium">Payment Option:</span>
                  <span className="font-semibold">{selectedOrder.paymentMethod}</span>
                </div>
              </div>

              {/* Items in order */}
              {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-gray-500">Ordered Products</h4>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl p-3 bg-white">
                    {selectedOrder.items.map((it, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between items-center">
                        <span className="font-semibold text-gray-800">
                          {it.productName || it.name} &times; {it.quantity || it.qty || 1}
                        </span>
                        <span className="font-bold text-[#235848]">
                          {formatCurrency((it.price || 0) * (it.quantity || it.qty || 1))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Receipt screenshot lightbox if uploaded */}
              {selectedOrder.customerReceiptUrl && (
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-gray-500">
                    Payment Receipt Proof
                  </h4>
                  <div className="bg-black/5 p-3 rounded-2xl flex justify-center">
                    <img
                      src={selectedOrder.customerReceiptUrl}
                      alt="Customer Receipt Proof"
                      className="max-h-72 object-contain rounded-xl shadow-md cursor-pointer"
                      onClick={() => window.open(selectedOrder.customerReceiptUrl, '_blank')}
                    />
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-sm font-bold">
                <span>Total Amount:</span>
                <span className="text-lg text-[#235848]">
                  {formatCurrency(selectedOrder.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SHIPPING / COURIER WAYBILL MODAL */}
      {shippingModalOrder && (
        <div className="modal-overlay">
          <div className="modal-card max-w-md p-6 relative">
            <button
              onClick={() => setShippingModalOrder(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-black hover:bg-gray-100"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Truck className="text-[#235848]" size={22} />
              <h3 className="font-serif text-xl font-bold text-[#1b2420]">
                Dispatch Order #{shippingModalOrder.id}
              </h3>
            </div>
            <p className="text-xs text-[#63706a] mb-5">
              Enter courier waybill tracking number to send live notification updates to the customer.
            </p>

            <form onSubmit={submitShippingModal} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700 uppercase">Courier Service</label>
                <input
                  type="text"
                  required
                  value={shippingCourier}
                  onChange={(e) => setShippingCourier(e.target.value)}
                  placeholder="e.g. J&T Express"
                  className="w-full px-3 py-2.5 bg-[#faf8f5] border border-gray-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 uppercase">Waybill / Tracking No. *</label>
                <input
                  type="text"
                  required
                  value={shippingTrackingNumber}
                  onChange={(e) => setShippingTrackingNumber(e.target.value)}
                  placeholder="e.g. 782910398102"
                  className="w-full px-3 py-2.5 bg-[#faf8f5] border border-gray-200 rounded-xl font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full btn btn-primary py-3 text-xs font-bold mt-2"
              >
                Confirm Dispatch &amp; Mark as Shipped
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT PRODUCT */}
      {isAddProductOpen && (
        <div className="modal-overlay">
          <div className="modal-card max-w-xl p-6 sm:p-8 relative">
            <button
              onClick={() => setIsAddProductOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-black hover:bg-gray-100"
            >
              <X size={20} />
            </button>

            <h3 className="font-serif text-2xl font-bold text-[#1b2420] mb-5">
              {editingProduct ? 'Edit Skincare Product' : 'Add New Skincare Product'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold uppercase text-gray-600">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="e.g. Gentle Botanical Cleanser"
                    className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-gray-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold uppercase text-gray-600">Category *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-gray-200 rounded-xl font-semibold text-[#235848]"
                  >
                    <option value="Cleanser">Cleanser</option>
                    <option value="Toner">Toner</option>
                    <option value="Sunscreen">Sunscreen</option>
                    <option value="Serum">Serum</option>
                    <option value="Moisturizer">Moisturizer</option>
                    <option value="Packages">Packages</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold uppercase text-gray-600">Product Type *</label>
                  <select
                    value={productForm.productType}
                    onChange={(e) => setProductForm({ ...productForm, productType: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-gray-200 rounded-xl font-semibold text-[#c49a45]"
                  >
                    <option value="STANDARD">Standard Product</option>
                    <option value="PACKAGE">Package Bundle</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold uppercase text-gray-600">Price (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="450.00"
                    className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-gray-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold uppercase text-gray-600">Available Stock *</label>
                  <input
                    type="number"
                    required
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    placeholder="25"
                    className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-gray-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold uppercase text-gray-600">Product Description</label>
                  <textarea
                    rows={2}
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    placeholder="Nourishing botanical formula..."
                    className="w-full px-3.5 py-2 bg-[#faf8f5] border border-gray-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold uppercase text-gray-600">How to Apply / Usage</label>
                  <textarea
                    rows={2}
                    value={productForm.usage}
                    onChange={(e) => setProductForm({ ...productForm, usage: e.target.value })}
                    placeholder="Apply 1-2 drops gently onto face..."
                    className="w-full px-3.5 py-2 bg-[#faf8f5] border border-gray-200 rounded-xl"
                  />
                </div>

                {/* Image upload */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold uppercase text-gray-600">Product Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setProductImageFile(file);
                        const r = new FileReader();
                        r.onload = () => setProductImagePreview(r.result);
                        r.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#e9f2ee] file:text-[#235848]"
                  />
                  {productImagePreview && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-xl inline-block border">
                      <img src={productImagePreview} alt="Preview" className="h-20 object-contain rounded" />
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full btn btn-primary py-3.5 text-xs font-bold mt-4 shadow-lg"
              >
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: OUT OF STOCK QUICK VIEW */}
      {isOutOfStockModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card max-w-lg p-6 relative">
            <button
              onClick={() => setIsOutOfStockModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-black hover:bg-gray-100"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-2 text-red-600">
              <AlertTriangle size={22} />
              <h3 className="font-serif text-xl font-bold text-[#1b2420]">
                Out of Stock Formulations ({outOfStockProducts.length})
              </h3>
            </div>
            <p className="text-xs text-[#63706a] mb-4">
              The following products currently have zero stock in inventory:
            </p>

            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 pr-1 text-xs">
              {outOfStockProducts.length === 0 ? (
                <p className="text-gray-400 py-6 text-center">All products are currently in stock!</p>
              ) : (
                outOfStockProducts.map((p) => (
                  <div key={p.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-gray-900 block">{p.name}</span>
                      <span className="text-[10px] text-gray-400">{p.category} &bull; {formatCurrency(p.price)}</span>
                    </div>
                    <button
                      onClick={() => {
                        setIsOutOfStockModalOpen(false);
                        setActiveTab('inventory');
                        setEditingProduct(p);
                        setProductForm({
                          name: p.name,
                          category: p.category || 'Cleanser',
                          price: p.price,
                          stock: 10,
                          description: p.description || '',
                          usage: p.usage || '',
                          productType: p.productType || 'STANDARD',
                          packageItems: [],
                          imageUrl: p.imageUrl || '',
                        });
                        setProductImagePreview(p.imageUrl || '');
                        setIsAddProductOpen(true);
                      }}
                      className="btn btn-primary py-1 px-3 text-[11px]"
                    >
                      Restock Now
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
