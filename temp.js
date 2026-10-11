
        (() => {
            const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL;
            if (!API_BASE_URL) {
                throw new Error('Missing API_BASE_URL in config.js');
            }

            function getBasicAuthHeader() {
                const token = localStorage.getItem('jammailavskin_token');
                if (!token) return null;
                // Token is already in format "username:password" base64 encoded
                return `Basic ${token}`;
            }

            function showAdminToast({ type = 'success', text = '' }) {
                const alertContainer = document.createElement('div');
                alertContainer.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: ${type === 'error' ? '#ffebee' : '#e8f5e9'};
                    color: ${type === 'error' ? '#c62828' : '#1b5e20'};
                    padding: 12px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    font-weight: 600;
                    font-size: 14px;
                `;
                alertContainer.textContent = text;
                document.body.appendChild(alertContainer);
                setTimeout(() => alertContainer.remove(), 3000);
            }

            function logout() {
                localStorage.removeItem('jammailavskin_token');
                localStorage.removeItem('isAdminLoggedIn');
                window.location.href = 'login.html';
            }

            document.getElementById('logoutBtn').addEventListener('click', logout);

            // Redirect if not logged in
            if (!localStorage.getItem('isAdminLoggedIn')) {
                window.location.href = 'login.html';
            }

            // Nav button listeners
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                    btn.classList.add('active');
                    const sectionId = `section-${btn.dataset.section}`;
                    document.getElementById(sectionId)?.classList.add('active');
                    
                    if (window.innerWidth <= 768) {
                        document.getElementById('sidebar').classList.remove('is-open');
                        document.getElementById('sidebarOverlay').classList.remove('is-active');
                    }

                    if (btn.dataset.section === 'products') {
                        setTimeout(() => renderAll(), 100);
                    }
                    if (btn.dataset.section === 'inventory') {
                        setTimeout(() => renderInventory(), 100);
                    }
                    if (btn.dataset.section === 'orders') {
                        setTimeout(() => renderOrders(), 100);
                    }
                    if (btn.dataset.section === 'dashboard') {
                        setTimeout(() => renderDashboard(), 100);
                    }
                });
            });

            document.getElementById('menuToggle').addEventListener('click', (e) => {
                e.stopPropagation();
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebarOverlay');
                if (sidebar.classList.contains('is-open')) {
                    sidebar.classList.remove('is-open');
                    overlay.classList.remove('is-active');
                } else {
                    sidebar.classList.add('is-open');
                    overlay.classList.add('is-active');
                }
            });

            document.getElementById('sidebarOverlay').addEventListener('click', () => {
                document.getElementById('sidebar').classList.remove('is-open');
                document.getElementById('sidebarOverlay').classList.remove('is-active');
            });
            
            document.addEventListener('click', (e) => {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebarOverlay');
                const menuToggle = document.getElementById('menuToggle');
                
                if (window.innerWidth <= 768 && sidebar.classList.contains('is-open')) {
                    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                        sidebar.classList.remove('is-open');
                        if (overlay) overlay.classList.remove('is-active');
                    }
                }
            });

            // Products Management
            let productsCache = [];
            let ordersCache = [];
            const inMemoryStore = {
                storeProducts: [],
                storeProductsLayer2: [],
                storefrontLayerServerSyncV1: false,
                orders: []
            };

            function getProducts() {
                return Array.isArray(productsCache) ? productsCache : [];
            }

            function getOrders() {
                return Array.isArray(ordersCache) ? ordersCache : [];
            }

            async function fetchProductsFromApi() {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/products`);
                    if (!res.ok) throw new Error(`Bad response: ${res.status}`);
                    const products = await res.json();
                    productsCache = Array.isArray(products) ? products : [];
                    return productsCache;
                } catch (err) {
                    console.error('[admin] fetchProductsFromApi failed', err);
                    return [];
                }
            }

            function renderOrders() {
                fetchOrdersFromApi().then(() => {
                    renderOrdersTable();
                });
            }

            function renderOrdersTable() {
                const tbody = document.getElementById('ordersTableBody');
                if (!tbody) return;
                const orders = getOrders();

                if (!orders.length) {
                    tbody.innerHTML = '<tr><td colspan="8" class="hint" style="text-align:center; padding: 1.5rem;">No orders yet.</td></tr>';
                    return;
                }

                const statusOptions = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

                tbody.innerHTML = orders.map((o) => {
                    const items = Array.isArray(o.items) ? o.items : [];
                    const productsLabel = items.map((it) => escapeHtml(it.productName || '')).join(', ') || '-';
                    const qty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
                    const total = Number(o.total ?? o.total_amount ?? 0);
                    const currentStatus = String(o.orderStatus || 'Pending');
                    const statusClass = currentStatus.toLowerCase();

                    return `
                        <tr>
                            <td class="ordersColId">#${o.id}</td>
                            <td class="ordersColCustomer" title="${escapeHtml(o.customerName || '')}">${escapeHtml(o.customerName || '')}<br><span class="hint">${escapeHtml(o.phone || '')}</span></td>
                            <td class="ordersColProducts" title="${escapeHtml(items.map((it) => it.productName || '').join(', '))}">${productsLabel}</td>
                            <td class="ordersColQty">${qty}</td>
                            <td class="ordersColTotal">₱${total.toFixed(2)}</td>
                            <td class="ordersColPayment">${escapeHtml(o.paymentMethod || '')}<br><span class="hint">${escapeHtml(o.paymentStatus || '')}</span></td>
                            <td class="ordersColStatus">
                                <select class="orderStatusSelect ${statusClass}" data-order-id="${o.id}">
                                    ${statusOptions.map((s) => `<option value="${s}" ${s.toLowerCase() === statusClass ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </td>
                            <td class="ordersColActions">
                                <div style="display:flex; gap:6px;">
                                    <button type="button" class="btn viewOrderBtn" data-order-id="${o.id}" title="View" aria-label="View order" style="padding: 0.5rem; width: 34px; height: 34px; display:inline-flex; align-items:center; justify-content:center;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                                            <circle cx="12" cy="12" r="2.75" stroke="currentColor" stroke-width="1.8"/>
                                        </svg>
                                    </button>
                                    <button type="button" class="btn danger deleteOrderBtn" data-order-id="${o.id}" title="Delete" aria-label="Delete order" style="padding: 0.5rem; width: 34px; height: 34px; display:inline-flex; align-items:center; justify-content:center;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4 7h16M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M6.5 7l.6 12.1A2 2 0 0 0 9.1 21h5.8a2 2 0 0 0 2-1.9L17.5 7M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');

                tbody.querySelectorAll('.orderStatusSelect').forEach((select) => {
                    select.addEventListener('change', () => updateOrderStatus(Number(select.dataset.orderId), select.value, select));
                });
                tbody.querySelectorAll('.deleteOrderBtn').forEach((btn) => {
                    btn.addEventListener('click', () => deleteOrder(Number(btn.dataset.orderId)));
                });
                tbody.querySelectorAll('.viewOrderBtn').forEach((btn) => {
                    btn.addEventListener('click', () => openOrderDetailsModal(Number(btn.dataset.orderId)));
                });
            }

            function ensureOrderDetailsModal() {
                let modal = document.getElementById('orderDetailsModal');
                if (modal) return modal;

                modal = document.createElement('div');
                modal.id = 'orderDetailsModal';
                modal.style.cssText = `
                    display:none; position:fixed; inset:0; z-index:10000;
                    background: rgba(0,0,0,0.45); align-items:center; justify-content:center; padding: 1rem;
                `;
                modal.innerHTML = `
                    <div class="card" style="width:100%; max-width:480px; max-height:90vh; overflow:auto; padding:1.5rem;">
                        <div class="odModalHeader">
                            <h3>Order Details</h3>
                            <button type="button" class="btn secondary" id="orderDetailsCloseBtn" style="padding:0.35rem 0.75rem;">Close</button>
                        </div>
                        <div id="orderDetailsBody"></div>
                    </div>
                `;
                document.body.appendChild(modal);

                const close = () => { modal.style.display = 'none'; };
                modal.querySelector('#orderDetailsCloseBtn').addEventListener('click', close);
                modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

                return modal;
            }

            function openOrderDetailsModal(orderId) {
                const order = getOrders().find((o) => Number(o.id) === orderId);
                if (!order) {
                    showAdminToast({ type: 'error', text: 'Order not found.' });
                    return;
                }

                const modal = ensureOrderDetailsModal();
                const body = modal.querySelector('#orderDetailsBody');
                const items = Array.isArray(order.items) ? order.items : [];
                const total = Number(order.total ?? order.total_amount ?? 0);
                const receiptUrl = order.customerReceiptUrl ? String(order.customerReceiptUrl) : '';

                const orderStatusClass = String(order.orderStatus || 'Pending').toLowerCase();

                body.innerHTML = `
                    <div class="odSection">
                        <div class="odSectionTitle">Order #${order.id}</div>
                        <div class="odGrid">
                            <div class="odField">
                                <div class="odLabel">Status</div>
                                <span class="status ${orderStatusClass}">${escapeHtml(order.orderStatus || 'Pending')}</span>
                            </div>
                            <div class="odField">
                                <div class="odLabel">Payment</div>
                                <div class="odValue">${escapeHtml(order.paymentMethod || '')} &middot; ${escapeHtml(order.paymentStatus || '')}</div>
                            </div>
                        </div>
                    </div>

                    <div class="odSection">
                        <div class="odSectionTitle">Buyer Information</div>
                        <div class="odGrid">
                            <div class="odField">
                                <div class="odLabel">Customer</div>
                                <div class="odValue">${escapeHtml(order.customerName || '')}</div>
                            </div>
                            <div class="odField">
                                <div class="odLabel">Phone</div>
                                <div class="odValue">${escapeHtml(order.phone || '') || '&mdash;'}</div>
                            </div>
                            <div class="odField odFull">
                                <div class="odLabel">Address</div>
                                <div class="odValue">${escapeHtml(order.address || '') || '<span class="hint">Not provided</span>'}</div>
                            </div>
                        </div>
                    </div>

                    <div class="odSection">
                        <div class="odSectionTitle">Shipping Information</div>
                        <div class="odGrid">
                            <div class="odField">
                                <div class="odLabel">Courier</div>
                                <div class="odValue">${escapeHtml(order.courierName || '') || '<span class="hint">Not assigned</span>'}</div>
                            </div>
                            <div class="odField">
                                <div class="odLabel">Tracking Number</div>
                                <div class="odValue">${escapeHtml(order.trackingNumber || '') || '<span class="hint">Not assigned</span>'}</div>
                            </div>
                        </div>
                    </div>

                    <div class="odSection">
                        <div class="odSectionTitle">Products</div>
                        <div class="odProductsList">
                            ${items.map((it) => `
                                <div class="odProductRow">
                                    <span>${escapeHtml(it.productName || '')}</span>
                                    <span>x${it.quantity || 0}</span>
                                </div>
                            `).join('') || '<div class="hint">No products</div>'}
                        </div>
                        <div class="odTotalRow">
                            <span class="odLabel">Total</span>
                            <span class="odValue">₱${total.toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="odSection">
                        <div class="odSectionTitle">Receipt</div>
                        <div class="odReceiptBox">
                            ${receiptUrl
                                ? `<a href="${escapeHtml(receiptUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(receiptUrl)}" alt="Receipt" /></a>`
                                : '<span class="hint">No receipt uploaded</span>'}
                        </div>
                    </div>
                `;

                modal.style.display = 'flex';
            }

            async function updateOrderStatus(orderId, newStatus, selectEl) {
                const authHeader = getBasicAuthHeader();
                if (!authHeader) {
                    showAdminToast({ type: 'error', text: 'Authentication required. Please log in again.' });
                    return;
                }
                
                // If the status is Shipped, ask for courier and tracking number
                if (newStatus.toLowerCase() === 'shipped') {
                    showShippingModal(orderId, newStatus, selectEl, authHeader);
                    return;
                }

                await sendOrderStatusUpdate(orderId, newStatus, null, null, selectEl, authHeader);
            }

            async function sendOrderStatusUpdate(orderId, newStatus, courierName, trackingNumber, selectEl, authHeader) {
                try {
                    const payload = { orderStatus: newStatus };
                    if (courierName) payload.courierName = courierName;
                    if (trackingNumber) payload.trackingNumber = trackingNumber;

                    const res = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': authHeader,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    });
                    if (!res.ok) throw new Error(`Bad response: ${res.status}`);
                    if (selectEl) {
                        selectEl.className = `orderStatusSelect ${newStatus.toLowerCase()}`;
                    }
                    showAdminToast({ type: 'success', text: `Order #${orderId} status updated to ${newStatus}.` });
                } catch (err) {
                    console.error('[admin] updateOrderStatus failed', err);
                    showAdminToast({ type: 'error', text: 'Failed to update order status.' });
                    // Revert the dropdown if it failed or was cancelled
                    if (selectEl) {
                        // We would need to reload or keep track of old status to properly revert, 
                        // for now we can just reload the table to be safe
                        renderOrders();
                    }
                }
            }

            function showShippingModal(orderId, newStatus, selectEl, authHeader) {
                let modal = document.getElementById('shippingDetailsModal');
                if (!modal) {
                    modal = document.createElement('div');
                    modal.id = 'shippingDetailsModal';
                    modal.style.cssText = `
                        display:none; position:fixed; inset:0; z-index:10000;
                        background: rgba(0,0,0,0.45); align-items:center; justify-content:center; padding: 1rem;
                    `;
                    modal.innerHTML = `
                        <div class="card" style="width:100%; max-width:400px; padding:1.5rem;">
                            <h3 style="margin-top:0; margin-bottom:1rem;">Shipping Details</h3>
                            <div class="formGroup">
                                <label for="courierNameInput">Courier</label>
                                <select id="courierNameInput" class="inputField">
                                    <option value="J&T Express">J&T Express</option>
                                    <option value="Flash Express">Flash Express</option>
                                    <option value="LBC">LBC</option>
                                </select>
                            </div>
                            <div class="formGroup">
                                <label for="trackingNumberInput">Tracking Number</label>
                                <input type="text" id="trackingNumberInput" class="inputField" placeholder="Enter tracking number" />
                            </div>
                            <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.5rem;">
                                <button type="button" class="btn secondary" id="cancelShippingBtn">Cancel</button>
                                <button type="button" class="btn" id="saveShippingBtn">Save</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);
                }

                document.getElementById('trackingNumberInput').value = '';
                modal.style.display = 'flex';

                const cancelBtn = document.getElementById('cancelShippingBtn');
                const saveBtn = document.getElementById('saveShippingBtn');

                const cleanup = () => {
                    modal.style.display = 'none';
                    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
                    saveBtn.replaceWith(saveBtn.cloneNode(true));
                };

                document.getElementById('cancelShippingBtn').addEventListener('click', () => {
                    cleanup();
                    // Revert select visually
                    renderOrders();
                });

                document.getElementById('saveShippingBtn').addEventListener('click', () => {
                    const courierName = document.getElementById('courierNameInput').value;
                    const trackingNumber = document.getElementById('trackingNumberInput').value;
                    
                    if (!trackingNumber.trim()) {
                        alert("Please enter a tracking number.");
                        return;
                    }

                    cleanup();
                    sendOrderStatusUpdate(orderId, newStatus, courierName, trackingNumber, selectEl, authHeader);
                });
            }

            async function deleteOrder(orderId) {
                const ok = window.confirm(`Delete order #${orderId}? This cannot be undone.`);
                if (!ok) return;

                const authHeader = getBasicAuthHeader();
                if (!authHeader) {
                    showAdminToast({ type: 'error', text: 'Authentication required. Please log in again.' });
                    return;
                }
                try {
                    const res = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': authHeader },
                    });
                    if (!res.ok) throw new Error(`Bad response: ${res.status}`);
                    showAdminToast({ type: 'success', text: `Order #${orderId} deleted.` });
                    renderOrders();
                } catch (err) {
                    console.error('[admin] deleteOrder failed', err);
                    showAdminToast({ type: 'error', text: 'Failed to delete order.' });
                }
            }

            async function fetchOrdersFromApi() {
                try {
                    const authHeader = getBasicAuthHeader();
                    if (!authHeader) {
                        console.warn('[admin] No auth header available');
                        return [];
                    }

                    const res = await fetch(`${API_BASE_URL}/admin/orders`, {
                        method: 'GET',
                        headers: {
                            'Authorization': authHeader
                        }
                    });

                    if (!res.ok) throw new Error(`Bad response: ${res.status}`);
                    const orders = await res.json();
                    ordersCache = Array.isArray(orders) ? orders : [];
                    return ordersCache;
                } catch (err) {
                    console.error('[admin] fetchOrdersFromApi failed', err);
                    return [];
                }
            }

            async function renderDashboard() {
                await Promise.all([fetchOrdersFromApi(), fetchProductsFromApi()]);
                const orders = getOrders();
                const products = getProducts();

                const totalOrders = orders.length;
                const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total ?? o.total_amount ?? 0), 0);
                const totalProducts = products.length;
                const outOfStock = products.filter((p) => Number(p.stock ?? 0) === 0).length;

                const totalOrdersEl = document.getElementById('totalOrders');
                const totalRevenueEl = document.getElementById('totalRevenue');
                const totalProductsEl = document.getElementById('totalProducts');
                const outOfStockEl = document.getElementById('outOfStock');

                if (totalOrdersEl) totalOrdersEl.textContent = String(totalOrders);
                if (totalRevenueEl) totalRevenueEl.textContent = `\u20b1${totalRevenue.toFixed(2)}`;
                if (totalProductsEl) totalProductsEl.textContent = String(totalProducts);
                if (outOfStockEl) outOfStockEl.textContent = String(outOfStock);
            }

            async function addProduct(e) {
                e.preventDefault();

                const name = document.getElementById('pName').value.trim();
                const price = Number(document.getElementById('pPrice').value);
                const stock = Number(document.getElementById('pStock').value);
                const description = document.getElementById('pDescription').value.trim();
                const usageInstructions = document.getElementById('pUsageInstructions').value.trim();
                const type = document.getElementById('pType').value;
                const storefrontLayer = Number(document.getElementById('pLayer').value);
                const file = document.getElementById('pImage').files?.[0];

                if (!name || !price) {
                    showAdminToast({ type: 'error', text: 'Please fill in required fields.' });
                    return;
                }

                try {
                    const form = new FormData();
                    form.append('name', name);
                    form.append('price', String(price));
                    form.append('stock', String(stock));
                    form.append('description', description);
                    form.append('usageInstructions', usageInstructions);
                    form.append('type', type);
                    form.append('storefrontLayer', String(storefrontLayer));
                    if (file) form.append('image', file);

                    const authHeader = getBasicAuthHeader();
                    if (!authHeader) {
                        showAdminToast({ type: 'error', text: 'Authentication required. Please log in again.' });
                        return;
                    }

                    const res = await fetch(`${API_BASE_URL}/api/products`, {
                        method: 'POST',
                        headers: {
                            'Authorization': authHeader
                        },
                        body: form
                    });

                    let data = null;
                    try {
                        data = await res.json();
                    } catch {
                        // ignore
                    }

                    if (!res.ok) {
                        console.error('Fetch Error:', { status: res.status, data });
                        const message = data?.message || data?.error || 'Failed to add product.';
                        showAdminToast({ type: 'error', text: String(message) });
                        return;
                    }

                    productsCache = [data, ...productsCache];
                    showAdminToast({ type: 'success', text: 'Product added successfully!' });

                    // Reset form
                    document.getElementById('addProductForm').reset();
                    document.getElementById('pImagePreview').classList.remove('show');
                    updateAddProductButtonState();

                    renderInventory();

                } catch (err) {
                    console.error('[addProduct] Error:', err);
                    showAdminToast({ type: 'error', text: 'Failed to add product.' });
                }
            }

            function updateAddProductButtonState() {
                const name = document.getElementById('pName').value.trim();
                const price = document.getElementById('pPrice').value.trim();
                const btn = document.querySelector('#addProductForm button[type="submit"]');
                if (btn) {
                    btn.disabled = !name || !price;
                    btn.style.opacity = btn.disabled ? '0.5' : '1';
                }
            }

            function bindDropzone({ dropzoneId, inputId, previewWrapId, imgId, nameId }) {
                const dropzone = document.getElementById(dropzoneId);
                const input = document.getElementById(inputId);
                const previewWrap = document.getElementById(previewWrapId);
                const img = document.getElementById(imgId);
                const nameEl = document.getElementById(nameId);

                if (!dropzone || !input) return;

                dropzone.addEventListener('click', () => input.click());

                dropzone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    dropzone.classList.add('isDragOver');
                });

                dropzone.addEventListener('dragleave', () => {
                    dropzone.classList.remove('isDragOver');
                });

                dropzone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    dropzone.classList.remove('isDragOver');
                    const files = e.dataTransfer.files;
                    if (files.length) input.files = files;
                    input.dispatchEvent(new Event('change'));
                });

                input.addEventListener('change', (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        img.src = evt.target.result;
                        nameEl.textContent = file.name;
                        document.getElementById('pImagePreviewSize').textContent = `${(file.size / 1024).toFixed(1)} KB`;
                        previewWrap.classList.add('show');
                    };
                    reader.readAsDataURL(file);
                });
            }

            function renderAll() {
                fetchProductsFromApi().then(() => {
                    renderProducts();
                });
            }

            function escapeHtml(value) {
                return String(value || '')
                    .replaceAll('&', '&amp;')
                    .replaceAll('<', '&lt;')
                    .replaceAll('>', '&gt;')
                    .replaceAll('"', '&quot;')
                    .replaceAll("'", '&#39;');
            }

            const NO_IMAGE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='100%25' height='100%25' fill='%23eee'/%3E%3Ctext x='50%25' y='50%25' font-size='13' text-anchor='middle' dy='.3em' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";

            function resolveImageUrl(imageUrl) {
                const raw = String(imageUrl || '').trim();
                if (!raw) return NO_IMAGE_PLACEHOLDER;
                if (/^https?:\/\//i.test(raw)) return raw;
                if (raw.startsWith('/uploads/')) return `${API_BASE_URL}${raw}`;
                return raw;
            }

            function renderProducts() {
                // Products page only shows the Add Product form; no separate list here.
            }

            function renderInventory() {
                fetchProductsFromApi().then(() => {
                    renderInventoryList();
                });
            }

            function renderInventoryList() {
                const container = document.getElementById('inventoryContent');
                if (!container) return;

                const products = getProducts();

                if (!products.length) {
                    container.innerHTML = '<p class="hint">No products yet. Add a product to see it listed here.</p>';
                    return;
                }

                container.innerHTML = `
                    <div class="inventoryList">
                        ${products.map((p) => `
                            <div class="card" style="display:flex; gap: 1rem; align-items:center; padding: 0.85rem;">
                                <img class="inventoryImg" src="${resolveImageUrl(p.imageUrl)}" alt="${escapeHtml(p.name)}" style="width:64px; height:64px; object-fit:cover; border-radius:10px; flex-shrink:0;">
                                <div style="flex:1; min-width:0;">
                                    <strong>${escapeHtml(p.name)}</strong>
                                    <div class="hint">₱${Number(p.price || 0).toFixed(2)} • Stock: ${Number(p.stock ?? 0)}</div>
                                </div>
                                <div style="display:flex; gap: 0.5rem; flex-shrink:0;">
                                    <button type="button" class="btn secondary editProductBtn" data-id="${p.id}" title="Edit" aria-label="Edit product" style="padding: 0.5rem; width: 36px; height: 36px; display:inline-flex; align-items:center; justify-content:center;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M16.474 5.408a2.5 2.5 0 0 1 3.536 3.536L7.5 21.454l-4.5 1 1-4.5L16.474 5.408Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                                        </svg>
                                    </button>
                                    <button type="button" class="btn danger deleteProductBtn" data-id="${p.id}" title="Delete" aria-label="Delete product" style="padding: 0.5rem; width: 36px; height: 36px; display:inline-flex; align-items:center; justify-content:center;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4 7h16M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M6.5 7l.6 12.1A2 2 0 0 0 9.1 21h5.8a2 2 0 0 0 2-1.9L17.5 7M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;

                container.querySelectorAll('.editProductBtn').forEach((btn) => {
                    btn.addEventListener('click', () => openEditProductModal(Number(btn.dataset.id)));
                });
                container.querySelectorAll('.deleteProductBtn').forEach((btn) => {
                    btn.addEventListener('click', () => deleteProductFromInventory(Number(btn.dataset.id)));
                });
                container.querySelectorAll('.inventoryImg').forEach((img) => {
                    img.addEventListener('error', function onImgError() {
                        img.removeEventListener('error', onImgError);
                        img.src = NO_IMAGE_PLACEHOLDER;
                    });
                });
            }

            async function deleteProductFromInventory(id) {
                const product = getProducts().find((p) => Number(p.id) === id);
                const ok = window.confirm(`Delete "${product ? product.name : 'this product'}"? This cannot be undone.`);
                if (!ok) return;

                const authHeader = getBasicAuthHeader();
                if (!authHeader) {
                    showAdminToast({ type: 'error', text: 'Authentication required. Please log in again.' });
                    return;
                }

                try {
                    const res = await fetch(`${API_BASE_URL}/api/admin/products/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': authHeader }
                    });

                    let data = null;
                    try { data = await res.json(); } catch { /* ignore */ }

                    if (!res.ok) {
                        const message = data?.message || data?.error || 'Failed to delete product.';
                        showAdminToast({ type: 'error', text: String(message) });
                        return;
                    }

                    productsCache = getProducts().filter((p) => Number(p.id) !== id);
                    renderInventoryList();
                    showAdminToast({ type: 'success', text: 'Product deleted.' });
                } catch (err) {
                    console.error('[deleteProductFromInventory] Error:', err);
                    showAdminToast({ type: 'error', text: 'Failed to delete product.' });
                }
            }

            function ensureEditProductModal() {
                let modal = document.getElementById('editProductModal');
                if (modal) return modal;

                modal = document.createElement('div');
                modal.id = 'editProductModal';
                modal.style.cssText = `
                    display:none; position:fixed; inset:0; z-index:10000;
                    background: rgba(0,0,0,0.45); align-items:center; justify-content:center; padding: 1rem;
                `;
                modal.innerHTML = `
                    <div class="card" style="width:100%; max-width:520px; max-height:90vh; overflow:auto; padding:1.25rem;">
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
                            <h3 style="margin:0;">Edit Product</h3>
                            <button type="button" class="btn secondary" id="editProductCloseBtn" style="padding:0.35rem 0.75rem;">Close</button>
                        </div>
                        <form id="editProductForm">
                            <div class="form">
                                <div>
                                    <label>Product Name</label>
                                    <input type="text" id="eName" required>
                                </div>
                                <div>
                                    <label>Product Layer</label>
                                    <select id="eLayer">
                                        <option value="1">Layer 1 (Top)</option>
                                        <option value="2">Layer 2 (Bottom)</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Type</label>
                                    <select id="eType">
                                        <option value="SINGLE">Individual (Single Product)</option>
                                        <option value="BUNDLE">Set (Bundle)</option>
                                        <option value="PACKAGE">Package</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form">
                                <div>
                                    <label>Price</label>
                                    <input type="number" id="ePrice" step="0.01" required>
                                </div>
                                <div>
                                    <label>Stock</label>
                                    <input type="number" id="eStock" min="0" required>
                                </div>
                            </div>
                            <div style="margin-top:0.75rem;">
                                <label>Product Description</label>
                                <textarea id="eDescription" style="width:100%; resize:vertical; min-height:70px;"></textarea>
                            </div>
                            <div style="margin-top:0.75rem;">
                                <label>Usage Instructions</label>
                                <textarea id="eUsage" style="width:100%; resize:vertical; min-height:70px;"></textarea>
                            </div>
                            <div style="margin-top:0.75rem;">
                                <label>Replace Image (optional)</label>
                                <input type="file" id="eImage" accept="image/*">
                            </div>
                            <div style="margin-top:1rem; display:flex; gap:0.75rem;">
                                <button type="submit" class="btn" style="flex:1;" id="editSaveBtn">Save Changes</button>
                                <button type="button" class="btn secondary" id="editCancelBtn" style="flex:0.5;">Cancel</button>
                            </div>
                        </form>
                    </div>
                `;
                document.body.appendChild(modal);

                const close = () => { modal.style.display = 'none'; };
                modal.querySelector('#editProductCloseBtn').addEventListener('click', close);
                modal.querySelector('#editCancelBtn').addEventListener('click', close);
                modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
                modal.querySelector('#editProductForm').addEventListener('submit', saveProductEdits);

                return modal;
            }

            function openEditProductModal(id) {
                const product = getProducts().find((p) => Number(p.id) === id);
                if (!product) {
                    showAdminToast({ type: 'error', text: 'Product not found.' });
                    return;
                }

                const modal = ensureEditProductModal();
                modal.dataset.productId = String(id);
                modal.dataset.existingImageUrl = String(product.imageUrl || '');

                modal.querySelector('#eName').value = product.name || '';
                modal.querySelector('#ePrice').value = product.price ?? '';
                modal.querySelector('#eStock').value = product.stock ?? '';
                modal.querySelector('#eDescription').value = product.description || '';
                modal.querySelector('#eUsage').value = product.usageInstructions || '';
                modal.querySelector('#eType').value = product.type === 'BUNDLE' ? 'BUNDLE' : product.type === 'PACKAGE' ? 'PACKAGE' : 'SINGLE';
                modal.querySelector('#eLayer').value = String(product.storefrontLayer || 1);
                modal.querySelector('#eImage').value = '';

                modal.style.display = 'flex';
            }

            async function saveProductEdits(e) {
                e.preventDefault();
                const modal = document.getElementById('editProductModal');
                if (!modal) return;

                const id = Number(modal.dataset.productId);
                if (!Number.isFinite(id)) return;

                const authHeader = getBasicAuthHeader();
                if (!authHeader) {
                    showAdminToast({ type: 'error', text: 'Authentication required. Please log in again.' });
                    return;
                }

                const name = modal.querySelector('#eName').value.trim();
                const price = Number(modal.querySelector('#ePrice').value);
                const stock = Number(modal.querySelector('#eStock').value);
                const description = modal.querySelector('#eDescription').value.trim();
                const usageInstructions = modal.querySelector('#eUsage').value.trim();
                const type = modal.querySelector('#eType').value;
                const storefrontLayer = Number(modal.querySelector('#eLayer').value);
                const file = modal.querySelector('#eImage').files?.[0];
                const existingImageUrl = String(modal.dataset.existingImageUrl || '');

                if (!name || !price) {
                    showAdminToast({ type: 'error', text: 'Please fill in required fields.' });
                    return;
                }

                const saveBtn = modal.querySelector('#editSaveBtn');
                if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

                try {
                    const form = new FormData();
                    form.append('name', name);
                    form.append('price', String(price));
                    form.append('stock', String(stock));
                    form.append('description', description);
                    form.append('usageInstructions', usageInstructions);
                    form.append('type', type);
                    form.append('storefrontLayer', String(storefrontLayer));
                    form.append('existingImageUrl', existingImageUrl);
                    if (file) form.append('image', file);

                    const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
                        method: 'PUT',
                        headers: { 'Authorization': authHeader },
                        body: form
                    });

                    let data = null;
                    try { data = await res.json(); } catch { /* ignore */ }

                    if (!res.ok) {
                        const message = data?.message || data?.error || 'Failed to update product.';
                        showAdminToast({ type: 'error', text: String(message) });
                        return;
                    }

                    productsCache = getProducts().map((p) => (Number(p.id) === id ? data : p));
                    renderInventoryList();
                    modal.style.display = 'none';
                    showAdminToast({ type: 'success', text: 'Product updated successfully!' });
                } catch (err) {
                    console.error('[saveProductEdits] Error:', err);
                    showAdminToast({ type: 'error', text: 'Failed to update product.' });
                } finally {
                    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Changes'; }
                }
            }
// Initialize
            if (typeof renderAll === 'function') {
                renderAll();
            } else if (typeof renderProducts === 'function') {
                renderProducts();
            }
            if (typeof renderInventory === 'function') {
                renderInventory();
            }
            if (typeof renderDashboard === 'function') {
                renderDashboard();
            }

            bindDropzone({
                dropzoneId: 'pImageDropzone',
                inputId: 'pImage',
                previewWrapId: 'pImagePreview',
                imgId: 'pImagePreviewImg',
                nameId: 'pImagePreviewName'
            });

            document.getElementById('addProductForm')?.addEventListener('submit', addProduct);
            document.getElementById('pName')?.addEventListener('input', updateAddProductButtonState);
            document.getElementById('pPrice')?.addEventListener('input', updateAddProductButtonState);
            
            if (typeof updateAddProductButtonState === 'function') {
                updateAddProductButtonState();
            }

            const dp = document.getElementById('datePill');
            if (dp) {
                dp.textContent = new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }); 
            }
        })();
    