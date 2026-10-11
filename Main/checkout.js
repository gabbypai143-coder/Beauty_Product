const qs = (sel, parent = document) => parent.querySelector(sel);
const qsa = (sel, parent = document) => Array.from(parent.querySelectorAll(sel));

const CART_KEY = 'jammaila_cart_v1';
const ORDERS_KEY_COMPAT = 'orders';
const ORDERS_KEY_ADMIN = 'jammailavskin_orders';
const CHECKOUT_SNAPSHOT_KEY = 'jammaila_checkout_snapshot_v1';

const API_BASE_URL_RAW = window.APP_CONFIG?.API_BASE_URL;
if (!API_BASE_URL_RAW || !String(API_BASE_URL_RAW).trim()) {
    throw new Error('Missing API_BASE_URL in config.js');
}

const API_BASE_URL = String(API_BASE_URL_RAW).trim().replace(/\/+$/, '');

function escapeHtml(value) {
    const element = document.createElement('div');
    element.textContent = String(value ?? '');
    return element.innerHTML;
}

function normalizePaymentMethod(value) {
    const method = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, '');

    if (method === 'maya' || method === 'paymaya') return 'maya';
    if (method === 'gcash') return 'gcash';
    if (method === 'bank' || method === 'banktransfer') return 'bank';
    if (method === 'card' || method === 'creditcard' || method === 'debitcard') return 'card';
    if (method === 'cod' || method === 'cashondelivery') return 'cod';

    return method;
}

const parsePriceToNumber = (value) => {
    if (typeof value === 'number') return value;
    const raw = String(value || '').replace(/[^0-9.]/g, '');
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (n) => {
    const num = Number(n) || 0;
    return `₱ ${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const readCart = () => {
    try {
        const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
};

const readCartCompat = () => {
    const primary = readCart();
    if (primary.length) return primary;
    try {
        const raw = JSON.parse(localStorage.getItem('cart') || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
};

const getValidCartItems = (rawCart) => {
    const cart = Array.isArray(rawCart) ? rawCart : [];
    return cart
        .map((item) => {
            const qty = Number(item?.qty ?? item?.quantity ?? 0);
            const title = String(item?.title ?? item?.name ?? item?.productName ?? '').trim();
            const id = String(item?.id ?? item?.productId ?? item?._id ?? '').trim();
            const rawW = Number(item?.weight_kg ?? item?.weight);
            const weight = Number.isFinite(rawW) && rawW > 0 ? rawW : 0.20;
            return {
                ...item,
                qty,
                title,
                id,
                weight,
                weight_kg: weight,
            };
        })
        .filter((item) => item.title && item.id && Number.isFinite(item.qty) && item.qty > 0);
};


function showCheckoutToast(message, durationMs = 2400) {
    const text = String(message || '').trim();
    if (!text) return;

    const el = document.createElement('div');
    el.className = 'toast-notification';
    el.setAttribute('role', 'status');
    el.textContent = text;
    document.body.appendChild(el);

    window.setTimeout(() => {
        try {
            el.remove();
        } catch {
            // ignore
        }
    }, Math.max(1200, Number(durationMs) || 2400));
}

function notifyEmptyCartAndReturnToStore() {
    showCheckoutToast('Your cart is empty. Please add a product before checking out.');
    window.setTimeout(() => {
        window.location.replace('index.html#shop');
    }, 1500);
}

const readCheckoutSnapshot = () => {
    try {
        const raw = JSON.parse(localStorage.getItem(CHECKOUT_SNAPSHOT_KEY) || 'null');
        if (!raw || typeof raw !== 'object') return null;
        if (!Array.isArray(raw.items)) return null;
        return raw;
    } catch {
        return null;
    }
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
});

const compressImage = (file) => new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return resolve(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Resize if larger than 1200px
            const maxSize = 1200;
            if (width > height && width > maxSize) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
            } else if (height > maxSize) {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(file);
            
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                if (!blob || blob.size > file.size) return resolve(file);
                const compressedFile = new File([blob], file.name, { type: file.type });
                resolve(compressedFile);
            }, file.type, 0.85);
        };
        img.onerror = () => resolve(file);
        img.src = String(e.target?.result || '');
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
});

// J&T Express Heavy Parcel Rates (3.01 kg to 10.00 kg)
const getHeavyParcelRate = (weight) => {
    const w = Number(weight) || 0;
    if (w > 3.00 && w <= 4.00) return 200;
    if (w > 4.00 && w <= 5.00) return 220;
    if (w > 5.00 && w <= 6.00) return 255;
    if (w > 6.00 && w <= 7.00) return 295;
    if (w > 7.00 && w <= 8.00) return 335;
    if (w > 8.00 && w <= 9.00) return 375;
    if (w > 9.00 && w <= 10.00) return 415;
    return null;
};

// Regional standard base rates for Small Parcels (<= 3.00 kg)
const getRegionalBaseRate = (region) => {
    const r = String(region || '').trim();
    if (!r) return 0;
    const rates = {
        'NCR': 105,
        'CAR': 105,
        'Region I': 105,
        'Region II': 105,
        'Region III': 105,
        'Region IV-A': 105,
        'Region IV-B': 115,
        'Region V': 105,
        'Region VI': 105,
        'Region VII': 105,
        'Region VIII': 105,
        'Region IX': 85,
        'Region X': 85,
        'Region XI': 85,
        'Region XII': 85,
        'Region XIII': 85,
        'BARMM': 115
    };
    return rates[r] || (r ? 105 : 0);
};

// Calculate aggregate parcel weight dynamically: Total Weight = sum(Product Weight * Quantity)
const calculateTotalWeight = (items) => {
    const list = Array.isArray(items) ? items : [];
    let total = 0;
    list.forEach((item) => {
        const qty = Number(item?.qty ?? item?.quantity ?? 1);
        const q = Number.isFinite(qty) && qty > 0 ? qty : 1;
        const rawW = Number(item?.weight_kg ?? item?.weight);
        const weight = Number.isFinite(rawW) && rawW > 0 ? rawW : 0.20;
        total += weight * q;
    });
    return Math.round(total * 100) / 100;
};

// Calculate dynamic shipping breakdown according to J&T Express structure
const calculateCheckoutShipping = (region, weight, subtotal) => {
    const w = Number(weight) || 0;
    const sub = Number(subtotal) || 0;
    const isOverLimit = w > 10.00;

    let baseRate = 0;
    if (w > 3.00 && w <= 10.00) {
        baseRate = getHeavyParcelRate(w) || 0;
    } else {
        baseRate = getRegionalBaseRate(region);
    }

    // J&T Assurance / Insurance Fee: ceil(Subtotal / 500) * 5
    const insuranceFee = sub > 0 ? Math.ceil(sub / 500) * 5 : 0;
    const totalShipping = baseRate + insuranceFee;

    return {
        totalWeight: Math.round(w * 100) / 100,
        baseRate,
        insuranceFee,
        totalShipping,
        isOverLimit
    };
};

const getShippingRate = (region, weight = 0, subtotal = 0) => {
    const details = calculateCheckoutShipping(region, weight, subtotal);
    return details.totalShipping;
};

const setFieldError = (inputEl, message) => {
    if (!inputEl) return;
    inputEl.classList.toggle('is-error', Boolean(message));
    const id = inputEl.getAttribute('id');
    const errorEl = id ? qs(`[data-error-for="${id}"]`) : null;
    if (errorEl) errorEl.textContent = message || '';
};

const validatePhone = (value) => {
    const v = String(value || '').trim();
    return /^09\d{9}$/.test(v);
};

const readOrders = (key) => {
    try {
        const raw = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
};

function initCheckoutNav() {
    const toggle = qs('.nav__toggle');
    const menu = qs('.nav__center[data-collapsible]');
    if (!toggle || !menu) return;

    const setOpen = (open) => {
        toggle.classList.toggle('is-open', open);
        menu.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    if (!toggle.dataset.bound) {
        toggle.dataset.bound = 'true';
        toggle.addEventListener('click', () => {
            setOpen(!toggle.classList.contains('is-open'));
        });
    }

    if (!menu.dataset.bound) {
        menu.dataset.bound = 'true';
        qsa('.nav__link', menu).forEach((link) => {
            link.addEventListener('click', () => setOpen(false));
        });
    }

    if (!document.body.dataset.checkoutNavEscBound) {
        document.body.dataset.checkoutNavEscBound = 'true';
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') setOpen(false);
        });
    }
}

const nextOrderId = (orders) => {
    const max = orders.reduce((acc, it) => Math.max(acc, Number(it?.id) || 0), 0);
    return max + 1;
};

function ensureSuccessModal() {
    let wrap = qs('#orderSuccessModal');
    if (wrap) return wrap;

    wrap = document.createElement('div');
    wrap.id = 'orderSuccessModal';
    wrap.className = 'orderSuccessModal';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.style.position = 'fixed';
    wrap.style.inset = '0';
    wrap.style.zIndex = '9999';
    wrap.style.display = 'none';

    wrap.innerHTML = `
        <div data-success-backdrop style="position:absolute; inset:0; background: rgba(0,0,0,0.45);"></div>
        <div style="position:relative; width:min(520px, calc(100vw - 28px)); margin: 10vh auto; background: rgba(255,255,255,0.98); border-radius: 18px; border: 1px solid rgba(16,16,16,0.10); box-shadow: 0 30px 80px rgba(0,0,0,0.25); overflow:hidden;">
            <div style="padding: 18px 18px; border-bottom: 1px solid rgba(16,16,16,0.08);">
                <div style="font-weight:800; letter-spacing:0.16em; text-transform:uppercase; font-size:0.85rem; color: rgba(16,16,16,0.72);">Order Confirmed</div>
                <div id="orderSuccessTitle" style="margin-top: 10px; font-family: 'Playfair Display', serif; font-size: 1.7rem; font-weight: 600; letter-spacing: -0.02em;">Thank you</div>
                <div id="orderSuccessSub" style="margin-top: 8px; color: rgba(16,16,16,0.62); font-size: 0.95rem; line-height: 1.55;">We received your order.</div>
            </div>
            <div style="padding: 16px 18px;">
                <div id="orderSuccessMeta" style="padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(16,16,16,0.10); background: rgba(251,249,246,0.8); color: rgba(16,16,16,0.72);"></div>
                <button type="button" data-success-close style="margin-top: 14px; width: 100%; padding: 14px 16px; border-radius: 999px; border: none; background: rgba(16,16,16,0.92); color: white; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer;">Continue Shopping</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrap);

    const close = () => {
        wrap.classList.remove('active');
        wrap.style.display = 'none';
        window.location.href = 'index.html#shop';
    };

    wrap.querySelector('[data-success-close]')?.addEventListener('click', close);
    wrap.querySelector('[data-success-backdrop]')?.addEventListener('click', close);

    return wrap;
}

function showOrderSuccessModal(order) {
    const modal = qs('#order-success-modal');
    if (!modal) return;

    const refEl = qs('#receipt-ref', modal);
    const dateEl = qs('#receipt-date', modal);
    const paymentEl = qs('#receipt-payment', modal);
    const totalEl = qs('#receipt-total', modal);
    const itemsEl = qs('#receipt-items', modal);
    const subtotalEl = qs('#receipt-subtotal', modal);
    const weightEl = qs('#receipt-weight', modal);
    const shippingEl = qs('#receipt-shipping', modal);
    const insuranceEl = qs('#receipt-insurance', modal);

    const pricing = order && typeof order === 'object' ? (order.pricing && typeof order.pricing === 'object' ? order.pricing : {}) : {};
    const itemsRaw = Array.isArray(order?.items) ? order.items : [];
    const items = itemsRaw.map((it) => {
        const name = String(it?.productName || it?.title || it?.name || '').trim();
        const qty = Number(it?.quantity ?? it?.qty) || 0;
        const price = parsePriceToNumber(it?.price ?? it?.unitPrice);
        const line = Number.isFinite(Number(it?.subtotal)) ? Number(it.subtotal) : (price * qty);
        return { name, qty, price, line };
    }).filter((it) => it.name && it.qty > 0);

    const itemsSubtotal = items.reduce((sum, it) => sum + (Number(it?.line) || 0), 0);
    const subtotal = Number.isFinite(Number(pricing?.subtotal)) ? Number(pricing.subtotal) : (Number.isFinite(Number(order?.subtotal)) ? Number(order.subtotal) : itemsSubtotal);
    const shippingFee = Number(
        order?.shippingFee ??
        order?.shipping_fee ??
        pricing?.shippingFee ??
        pricing?.shipping ??
        pricing?.shipping_fee ??
        0
    );
    const shipping = Number.isFinite(shippingFee) ? shippingFee : 0;
    const baseShipping = Number.isFinite(Number(order?.baseShippingFee))
        ? Number(order.baseShippingFee)
        : (Number.isFinite(Number(pricing?.baseShipping)) ? Number(pricing.baseShipping) : shipping);
    const insurance = Number.isFinite(Number(order?.insuranceFee))
        ? Number(order.insuranceFee)
        : (Number.isFinite(Number(pricing?.insurance)) ? Number(pricing.insurance) : 0);
    const weightVal = Number.isFinite(Number(order?.totalWeight))
        ? Number(order.totalWeight)
        : (Number.isFinite(Number(pricing?.totalWeight)) ? Number(pricing.totalWeight) : 0);

    const total = Number(
        order?.total ??
        order?.total_amount ??
        pricing?.total ??
        (subtotal + shipping)
    );
    const totalFinal = Number.isFinite(total) ? total : (subtotal + shipping);

    const method = String(order?.paymentMethod || '').toUpperCase();
    const refText = String(order?.referenceNumber || order?.orderNumber || order?.id || '').trim();
    const dateText = String(order?.date || order?.createdAt || '').trim();

    if (refEl) refEl.textContent = refText ? `#${refText}` : '—';
    if (dateEl) dateEl.textContent = dateText || '—';
    if (paymentEl) paymentEl.textContent = method || '—';
    if (totalEl) totalEl.textContent = formatCurrency(totalFinal);
    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (weightEl) weightEl.textContent = `${weightVal.toFixed(2)} kg`;
    if (shippingEl) shippingEl.textContent = formatCurrency(baseShipping);
    if (insuranceEl) insuranceEl.textContent = formatCurrency(insurance);

    if (itemsEl) {
        itemsEl.innerHTML = items.length
            ? items.map((it) => `
                <div class="orderReceipt__item">
                    <div class="orderReceipt__itemName">${escapeHtml(it.name)}</div>
                    <div class="orderReceipt__itemMeta">
                        <span>${it.qty} × ${escapeHtml(formatCurrency(it.price))}</span>
                        <strong>${escapeHtml(formatCurrency(it.line))}</strong>
                    </div>
                </div>
            `).join('')
            : '<div style="opacity:0.7; padding: 6px 0;">No items</div>';
    }

    modal.classList.add('is-active');
    modal.setAttribute('aria-hidden', 'false');
}

function showInlineSuccessView() {
    const inner = qs('.checkout__inner');
    if (inner) inner.style.display = 'none';

    let wrap = qs('#checkout-success-view');
    if (!wrap) {
        wrap = document.createElement('section');
        wrap.id = 'checkout-success-view';
        wrap.style.maxWidth = '720px';
        wrap.style.margin = '72px auto';
        wrap.style.padding = '0 18px';

        wrap.innerHTML = `
            <div style="background: rgba(255,255,255,0.92); border: 1px solid rgba(16,16,16,0.10); border-radius: 18px; padding: 34px 22px; box-shadow: 0 24px 80px rgba(0,0,0,0.10); text-align: center;">
                <div style="width: 64px; height: 64px; border-radius: 999px; background: rgba(47,127,107,0.14); color: rgb(47,127,107); display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 900; margin: 0 auto 14px;">✓</div>
                <h1 style="font-family: 'Playfair Display', serif; font-size: 1.9rem; margin: 0;">Thank you for your purchase!</h1>
                <p style="margin: 12px 0 0; color: rgba(16,16,16,0.70); font-size: 1rem; line-height: 1.7;">Your order has been placed successfully and is pending admin approval.</p>
                <button type="button" id="checkout-success-continue" style="margin-top: 18px; width: min(340px, 100%); padding: 14px 18px; border-radius: 999px; border: none; background: rgba(16,16,16,0.92); color: #fff; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer;">Continue Shopping</button>
            </div>
        `;

        const main = qs('main.checkout');
        if (main) {
            main.appendChild(wrap);
        } else {
            document.body.appendChild(wrap);
        }
    }

    const btn = qs('#checkout-success-continue', wrap);
    if (btn && !btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.addEventListener('click', () => {
            window.location.href = 'index.html#shop';
        });
    }
}

function initPaymentMethods() {
    const radios = qsa('input[name="payment"]');
    const panels = qsa('.payment-panel-content');

    const cards = qsa('.paymentOptionCard');
    const gatewayOptions = qsa('[data-gateway-option]');
    const payNowBtn = qs('#pay-now') || qs('.checkoutPlaceOrder');
    const ewalletHeading = qs('#ewallet-payment-heading');
    const ewalletQr = qs('#ewallet-payment-qr');
    const accountLabels = qsa('.gcash-verification-label');

    const map = {
        gcash: 'panel-gcash',
        bank: 'panel-bank',
        cod: 'panel-cod'
    };

    const setActive = (value) => {
        const selectedRaw = String(value || '').trim();
        const selected = normalizePaymentMethod(selectedRaw);
        const id = map[selected] || map.gcash;
        panels.forEach((p) => p.classList.remove('active'));
        if (id) {
            const active = qs(`#${id}`);
            if (active) active.classList.add('active');
        }

        if (ewalletHeading) {
            if (selected === 'maya') {
                ewalletHeading.textContent = 'PAY WITH MAYA';
            } else if (selected === 'gcash') {
                ewalletHeading.textContent = 'PAY WITH GCASH';
            }
        }

        if (ewalletQr) {
            if (selected === 'maya') {
                ewalletQr.src = 'assets/payment/maya1.png';
                ewalletQr.alt = 'Maya payment QR code';
            } else if (selected === 'gcash') {
                ewalletQr.src = 'assets/images/gcash.jpg.png';
                ewalletQr.alt = 'GCash payment QR code';
            }
        }

        if (accountLabels.length >= 2) {
            const labelPrefix = selected === 'maya' ? 'MAYA' : 'GCASH';
            accountLabels[0].textContent = `${labelPrefix} ACCOUNT NAME`;
            accountLabels[1].textContent = `${labelPrefix} NUMBER`;
        }

        cards.forEach((c) => c.classList.remove('is-selected'));
        const checked = qs('input[name="payment"]:checked');
        const checkedCard = checked?.closest?.('.paymentOptionCard');
        if (checkedCard) checkedCard.classList.add('is-selected');

        gatewayOptions.forEach((opt) => opt.classList.remove('is-selected'));
        const checkedGateway = checked?.closest?.('[data-gateway-option]');
        if (checkedGateway) checkedGateway.classList.add('is-selected');

        if (payNowBtn) {
            const isCod = selected === 'cod';
            payNowBtn.textContent = isCod ? 'PLACE ORDER' : 'PAY NOW';
        }
    };

    radios.forEach((r) => {
        r.addEventListener('change', () => setActive(r.value));
    });

    qsa('.uploadField__input').forEach((input) => {
        input.addEventListener('change', () => {
            const nameEl = qs(`[data-upload-name-for="${input.id}"]`);
            if (!nameEl) return;
            const file = input.files && input.files[0];
            if (file) {
                const safeName = String(file.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                nameEl.innerHTML = `<span style="color: #2ea76f; display: inline-flex; align-items: center; gap: 4px; font-weight: 500;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Attached: ${safeName}
                </span>`;
            } else {
                nameEl.textContent = 'No file chosen';
            }
        });
    });

    const initial = qs('input[name="payment"]:checked')?.value || 'gcash';
    setActive(initial);
}

function validateShippingStep() {
    const firstName = qs('#first-name');
    const lastName = qs('#last-name');
    const email = qs('#email');
    const phone = qs('#phone');
    const region = qs('#region');
    const city = qs('#city');
    const barangay = qs('#barangay');
    const postal = qs('#postal');
    const streetDetail = qs('#street-detail');

    let ok = true;
    let firstInvalidEl = null;
    let firstInvalidMsg = '';

    const isValidatable = (el) => {
        if (!el) return false;
        try {
            if (el.disabled) return false;
            // Skip elements not currently visible (e.g. hidden step)
            if (el.offsetParent === null) return false;
        } catch {
            // ignore
        }
        return true;
    };

    const required = [
        [firstName, 'Please enter your first name.'],
        [lastName, 'Please enter your last name.'],
        [email, 'Please enter your email address.'],
        [region, 'Please select your region/province.'],
        [city, 'Please enter your city/municipality.'],
        [barangay, 'Please enter your barangay.'],
        [postal, 'Please enter your postal code.'],
        [streetDetail, 'Please enter your street name/building/house number.']
    ];

    required.forEach(([el, msg]) => {
        if (!isValidatable(el)) return;
        const value = String(el?.value || '').trim();
        if (!value) {
            setFieldError(el, msg);
            ok = false;
            if (!firstInvalidEl && el) firstInvalidEl = el;
            if (!firstInvalidMsg) firstInvalidMsg = msg;
        } else {
            setFieldError(el, '');
        }
    });

    if (isValidatable(phone)) {
        const phoneValue = String(phone?.value || '').trim();
        if (!validatePhone(phoneValue)) {
            const msg = 'Please enter a valid 11-digit PH mobile number (09XXXXXXXXX).';
            setFieldError(phone, msg);
            ok = false;
            if (!firstInvalidEl && phone) firstInvalidEl = phone;
            if (!firstInvalidMsg) firstInvalidMsg = msg;
        } else {
            setFieldError(phone, '');
        }
    }

    if (!ok) {
        window.alert(firstInvalidMsg || 'Please complete the required shipping fields before proceeding.');
        try {
            firstInvalidEl?.focus?.();
            firstInvalidEl?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        } catch {
            // ignore
        }
        return false;
    }

    const snap = readCheckoutSnapshot();
    const source = (snap && Array.isArray(snap.items) && snap.items.length) ? snap.items : readCartCompat();
    const liveCart = getValidCartItems(source);
    const totalWeight = calculateTotalWeight(liveCart);
    if (totalWeight > 10.00) {
        window.alert("Package exceeds maximum parcel weight of 10.00 kg. Please split items into two separate orders.");
        return false;
    }

    return true;
}

function setCheckoutStep(step) {
    const shipping = qs('#step-shipping');
    const payment = qs('#step-payment');
    if (!shipping || !payment) return;

    const showPayment = step === 'payment';
    shipping.classList.toggle('active', !showPayment);
    payment.classList.toggle('active', showPayment);

    try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
        window.scrollTo(0, 0);
    }
}

function renderSummary(rawCart) {
    const cart = getValidCartItems(rawCart);
    const itemsWrap = qs('#summary-items');
    const subtotalEl = qs('#summary-subtotal');
    const weightEl = qs('#summary-weight');
    const shippingEl = qs('#summary-shipping');
    const insuranceEl = qs('#summary-insurance');
    const totalEl = qs('#summary-total');
    const warningEl = qs('#summary-weight-warning');
    const regionEl = qs('#region');

    const subtotal = cart.reduce((sum, it) => sum + (parsePriceToNumber(it.price) * (Number(it.qty) || 0)), 0);
    const totalWeight = calculateTotalWeight(cart);
    const shippingData = calculateCheckoutShipping(regionEl?.value, totalWeight, subtotal);
    const grandTotal = subtotal + shippingData.totalShipping;

    if (itemsWrap) {
        itemsWrap.innerHTML = '';
        cart.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'summaryItem';
            const qty = Number(item.qty) || 1;
            const w = Number(item.weight_kg ?? item.weight ?? 0.20);
            const unitWeight = Number.isFinite(w) && w > 0 ? w : 0.20;
            const itemTotalWeight = (unitWeight * qty).toFixed(2);
            row.innerHTML = `
                <div class="summaryItem__thumb" data-qty="${qty}">
                    <div class="checkoutSummaryThumbWrap">
                        <img class="checkoutSummaryThumbImg" src="${String(item.img || '')}" alt="${String(item.title || '')}" />
                    </div>
                </div>
                <div class="summaryItem__meta">
                    <div class="summaryItem__title">${String(item.title || '')}</div>
                    <div class="summaryItem__weight" style="font-size:0.75rem; color:#888;">${unitWeight.toFixed(2)} kg each (${itemTotalWeight} kg total)</div>
                    <div class="summaryItem__line" style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                        <button type="button" class="qty-btn" data-action="decrease" data-id="${item.id}" style="width: 24px; height: 24px; border: 1px solid #ccc; background: #fff; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: bold;">-</button>
                        <span class="qty-val" style="font-weight: 600; min-width: 16px; text-align: center;">${qty}</span>
                        <button type="button" class="qty-btn" data-action="increase" data-id="${item.id}" style="width: 24px; height: 24px; border: 1px solid #ccc; background: #fff; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: bold;">+</button>
                    </div>
                </div>
                <div class="summaryItem__price">${formatCurrency(parsePriceToNumber(item.price) * (Number(item.qty) || 0))}</div>
            `;
            itemsWrap.appendChild(row);
        });
    }

    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (weightEl) {
        weightEl.textContent = `${totalWeight.toFixed(2)} kg`;
        weightEl.style.color = shippingData.isOverLimit ? '#d92550' : '';
        weightEl.style.fontWeight = shippingData.isOverLimit ? '700' : '';
    }
    if (shippingEl) shippingEl.textContent = formatCurrency(shippingData.baseRate);
    if (insuranceEl) insuranceEl.textContent = formatCurrency(shippingData.insuranceFee);
    if (totalEl) totalEl.textContent = formatCurrency(grandTotal);

    if (warningEl) {
        warningEl.style.display = shippingData.isOverLimit ? 'block' : 'none';
    }

    const proceedBtnEl = qs('#proceed-to-payment');
    const submitBtnEl = qs('.checkoutPlaceOrder');
    if (shippingData.isOverLimit) {
        if (proceedBtnEl) {
            proceedBtnEl.classList.add('is-disabled');
            proceedBtnEl.setAttribute('aria-disabled', 'true');
        }
        if (submitBtnEl) {
            submitBtnEl.classList.add('is-disabled');
            submitBtnEl.setAttribute('aria-disabled', 'true');
        }
    } else {
        if (proceedBtnEl) {
            proceedBtnEl.classList.remove('is-disabled');
            proceedBtnEl.removeAttribute('aria-disabled');
        }
        if (submitBtnEl) {
            submitBtnEl.classList.remove('is-disabled');
            submitBtnEl.removeAttribute('aria-disabled');
        }
    }
}

function updateCheckoutCartQty(itemId, change) {
    const snapshot = readCheckoutSnapshot();
    const sourceCart = (snapshot && Array.isArray(snapshot.items) && snapshot.items.length)
        ? snapshot.items
        : readCartCompat();
    const liveCart = getValidCartItems(sourceCart);
    let itemFound = false;
    let newCart = liveCart.map(item => {
        if (String(item.id) === String(itemId)) {
            itemFound = true;
            let newQty = (Number(item.qty) || 0) + change;
            if (newQty < 1) newQty = 1;
            return { ...item, qty: newQty };
        }
        return item;
    });

    if (!itemFound) return;

    localStorage.setItem(CART_KEY, JSON.stringify(newCart));
    localStorage.setItem('cart', JSON.stringify(newCart));

    const computedSubtotal = newCart.reduce((sum, it) => sum + (parsePriceToNumber(it.price) * (Number(it.qty) || 0)), 0);
    const updatedSnapshot = {
        items: newCart,
        subtotal: computedSubtotal,
        totalWeight: calculateTotalWeight(newCart),
        createdAt: new Date().toISOString()
    };
    localStorage.setItem(CHECKOUT_SNAPSHOT_KEY, JSON.stringify(updatedSnapshot));

    renderSummary(newCart);
}

function initCheckout() {
    console.log('[checkout] initCheckout()');
    const form = qs('#checkout-form');
    const regionEl = qs('#region');
    const submitBtn = qs('.checkoutPlaceOrder');

    let isPlacingOrder = false;

    const proceedBtn = qs('#proceed-to-payment');
    const backLink = qs('#back-to-shipping');

    const successModal = qs('#order-success-modal');
    if (successModal) {
        qsa('[data-order-success-close]', successModal).forEach((el) => {
            el.addEventListener('click', () => {
                successModal.classList.remove('is-active');
                successModal.setAttribute('aria-hidden', 'true');
                window.location.href = 'index.html#shop';
            });
        });

        qs('#receipt-print', successModal)?.addEventListener('click', () => {
            document.body.classList.add('is-printing-receipt');
            window.setTimeout(() => {
                window.print();
                window.setTimeout(() => {
                    document.body.classList.remove('is-printing-receipt');
                }, 350);
            }, 60);
        });
    }

    const snapshot = readCheckoutSnapshot();
    const liveCart = getValidCartItems(readCartCompat());

    if (!liveCart.length && (!snapshot || !snapshot.items || !snapshot.items.length)) {
        const checkoutMain = qs('main.checkout');
        if (checkoutMain) checkoutMain.style.display = 'none';
        notifyEmptyCartAndReturnToStore();
        return;
    }

    const rawCart = (snapshot && snapshot.items && snapshot.items.length) ? snapshot.items : liveCart;
    const cart = getValidCartItems(rawCart);
    renderSummary(cart);

    const itemsWrap = qs('#summary-items');
    if (itemsWrap) {
        itemsWrap.addEventListener('click', (e) => {
            const btn = e.target.closest('.qty-btn');
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');
            if (id) {
                updateCheckoutCartQty(id, action === 'increase' ? 1 : -1);
            }
        });
    }

    initCheckoutNav();

    initPaymentMethods();

    // Synchronize product weights directly from database via API
    try {
        fetch(`${API_BASE_URL}/products`)
            .then((res) => (res.ok ? res.json() : []))
            .then((products) => {
                if (!Array.isArray(products) || !products.length) return;
                const weightMap = new Map();
                products.forEach((p) => {
                    const w = Number(p?.weight_kg ?? p?.weight);
                    weightMap.set(Number(p.id), Number.isFinite(w) && w > 0 ? w : 0.20);
                    weightMap.set(String(p.name || '').trim().toLowerCase(), Number.isFinite(w) && w > 0 ? w : 0.20);
                });
                const live = getValidCartItems(readCartCompat());
                let updated = false;
                live.forEach((it) => {
                    const dbW = weightMap.get(Number(it.id)) ?? weightMap.get(String(it.title || it.name || '').trim().toLowerCase());
                    if (dbW && dbW > 0 && it.weight !== dbW) {
                        it.weight = dbW;
                        it.weight_kg = dbW;
                        updated = true;
                    }
                });
                if (updated) {
                    localStorage.setItem(CART_KEY, JSON.stringify(live));
                    localStorage.setItem('cart', JSON.stringify(live));
                    renderSummary(live);
                }
            })
            .catch(() => {});
    } catch {
        // ignore
    }

    if (proceedBtn) {
        proceedBtn.addEventListener('click', () => {
            if (!validateShippingStep()) return;
            const snap = readCheckoutSnapshot();
            const source = (snap && Array.isArray(snap.items) && snap.items.length) ? snap.items : readCartCompat();
            const currentCart = getValidCartItems(source);
            const totalWeight = calculateTotalWeight(currentCart);
            if (totalWeight > 10.00) {
                window.alert("Package exceeds maximum parcel weight of 10.00 kg. Please split items into two separate orders.");
                return;
            }
            setCheckoutStep('payment');
        });
    }

    if (backLink) {
        backLink.addEventListener('click', (e) => {
            e.preventDefault();
            setCheckoutStep('shipping');
        });
    }

    if (regionEl) {
        regionEl.addEventListener('change', () => {
            const snap = readCheckoutSnapshot();
            const source = (snap && Array.isArray(snap.items) && snap.items.length) ? snap.items : readCartCompat();
            renderSummary(getValidCartItems(source));
        });
    }

    if (!form) {
        console.warn('[checkout] #checkout-form not found; checkout submit handler not bound.');
        return;
    }

    form.addEventListener('submit', async (e) => {
        console.log('Submit handler triggered!');
        e.preventDefault();

        if (isPlacingOrder) return;
        isPlacingOrder = true;
        const prevSubmitText = submitBtn ? String(submitBtn.textContent || '') : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.75';
            submitBtn.textContent = 'Placing Order...';
        }

        try {
            let shippingOk = false;
            try {
                shippingOk = validateShippingStep();
            } catch (err) {
                console.error('[checkout] validateShippingStep crashed:', err);
                shippingOk = false;
            }

            if (!shippingOk) {
                console.warn('[checkout] shipping validation failed; staying on shipping step');
                setCheckoutStep('shipping');
                return;
            }

            console.log('[checkout] shipping validation passed');

            const region = qs('#region');
            const city = qs('#city');
            const barangay = qs('#barangay');
            const postal = qs('#postal');

        let shipping = 0;
        let shippingData = { baseRate: 0, insuranceFee: 0, totalShipping: 0, totalWeight: 0, isOverLimit: false };
        let currentCart = [];
        try {
            const snap = readCheckoutSnapshot();
            const source = (snap && Array.isArray(snap.items) && snap.items.length) ? snap.items : readCartCompat();
            currentCart = getValidCartItems(source);
            const currentTotalWeight = calculateTotalWeight(currentCart);
            const currentSubtotal = currentCart.reduce((sum, it) => sum + (parsePriceToNumber(it.price) * (Number(it.qty) || 0)), 0);
            shippingData = calculateCheckoutShipping(region?.value, currentTotalWeight, currentSubtotal);
            shipping = shippingData.totalShipping;
        } catch (err) {
            console.error('[checkout] failed to read cart/shipping:', err);
            shipping = 0;
            currentCart = [];
        }

        if (currentCart.length === 0) {
            notifyEmptyCartAndReturnToStore();
            return;
        }

        const totalWeight = calculateTotalWeight(currentCart);
        if (totalWeight > 10.00) {
            window.alert("Package exceeds maximum parcel weight of 10.00 kg. Please split items into two separate orders.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.textContent = prevSubmitText;
            }
            isPlacingOrder = false;
            return;
        }

        const subtotal = currentCart.reduce((sum, it) => sum + (parsePriceToNumber(it.price) * (Number(it.qty) || 0)), 0);
        const total = subtotal + shipping;

        const firstNameInput = String(qs('#first-name')?.value || '').trim();
        const lastNameInput = String(qs('#last-name')?.value || '').trim();
        const customerName = `${firstNameInput} ${lastNameInput}`.trim() || 'Guest Customer';

        const phoneValue = String(qs('#phone')?.value || '').trim();

        const activePaymentRadio = qs('input[name="payment"]:checked');
        const paymentMethodKey = normalizePaymentMethod(activePaymentRadio ? String(activePaymentRadio.value || '') : '');

        if (paymentMethodKey === 'card') {
            window.alert('Card payments are not available right now. Please choose E-Wallets, Bank Transfer, or Cash on Delivery.');
            return;
        }

        const supportedPaymentMethods = new Set(['maya', 'gcash', 'bank', 'cod']);
        if (!supportedPaymentMethods.has(paymentMethodKey)) {
            window.alert('Please select a valid payment method.');
            return;
        }

        const paymentMethodMap = {
            gcash: 'GCash',
            maya: 'Maya',
            bank: 'Bank Transfer',
            cod: 'COD'
        };
        const paymentMethod = paymentMethodMap[paymentMethodKey] || paymentMethodKey || 'COD';

        const grandTotalText = String(qs('#summary-total')?.textContent || formatCurrency(total)).trim();

        const orderedProductsSummary = currentCart
            .map((item) => {
                const name = String(item?.title || item?.name || '').trim();
                const q = Number(item?.qty || item?.quantity || 1);
                return name ? `${name} (x${q})` : '';
            })
            .filter(Boolean)
            .join(', ');

        const ordersAdminExisting = readOrders(ORDERS_KEY_ADMIN);
        const uniqueNumericIndex = nextOrderId(ordersAdminExisting);
        const displayRefId = `JS-${10000 + uniqueNumericIndex}`;
        const orderNumber = `ORD-${String(uniqueNumericIndex).padStart(5, '0')}`;

        const qty = currentCart.reduce((sum, it) => sum + (Number(it?.qty) || Number(it?.quantity) || 0), 0);
        const streetDetailText = String(qs('#street-detail')?.value || '').trim();
        const barangayText = String(barangay?.value || '').trim();
        const cityText = String(city?.value || '').trim();
        const regionText = String(region?.value || '').trim();
        const postalText = String(postal?.value || '').trim();

        const formatLineBarangay = (v) => {
            const s = String(v || '').trim();
            if (!s) return '';
            return /\bbarangay\b/i.test(s) ? s : `Barangay ${s}`;
        };

        const address = [
            streetDetailText,
            formatLineBarangay(barangayText),
            cityText,
            regionText,
            postalText,
            'Philippines'
        ]
            .map((s) => String(s || '').trim())
            .filter(Boolean)
            .join(', ');

        const needsReceipt = paymentMethodKey === 'gcash' || paymentMethodKey === 'maya' || paymentMethodKey === 'bank';
        const uploadMap = {
            gcash: 'upload-gcash',
            maya: 'upload-gcash',
            bank: 'upload-bank'
        };

        const receiptInputId = uploadMap[paymentMethodKey];
        if (needsReceipt && !receiptInputId) {
            console.warn('[checkout] needsReceipt is true but no upload input is mapped for', paymentMethodKey);
        }
        const receiptFile = needsReceipt && receiptInputId ? qs(`#${receiptInputId}`)?.files?.[0] : null;

        if (needsReceipt && !receiptFile) {
            window.alert('Please upload your payment receipt screenshot before placing your order.');
            return;
        }

        const createdAt = new Date();
        const createdAtIso = createdAt.toISOString();
        const dateText = createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const newOrderPayload = {
            id: uniqueNumericIndex,
            orderNumber,
            referenceNumber: displayRefId,
            customerName,
            phone: phoneValue,
            address,
            productName: orderedProductsSummary,
            qty,
            total,
            totalText: grandTotalText,
            paymentMethod,
            paymentStatus: 'Pending',
            orderStatus: 'Pending',
            date: dateText,
            createdAt: createdAtIso,
            items: currentCart,
            pricing: {
                subtotal,
                shipping,
                baseShipping: shippingData.baseRate,
                insurance: shippingData.insuranceFee,
                totalWeight: shippingData.totalWeight,
                total
            },
            totalWeight: shippingData.totalWeight,
            baseShippingFee: shippingData.baseRate,
            insuranceFee: shippingData.insuranceFee,
            shippingDetails: {
                firstName: firstNameInput,
                lastName: lastNameInput,
                region: regionText,
                city: cityText,
                barangay: barangayText,
                postal: postalText,
                country: 'Philippines'
            },
            paymentMethodKey,
            receipt: needsReceipt ? { name: receiptFile?.name || '', mime: receiptFile?.type || '', dataUrl: '' } : null
        };

        const finalizeAfterSuccess = async () => {
            try {
                try {
                    // submit button is already disabled by the outer isPlacingOrder lock

                    console.log('[checkout] preparing API order payload...');

                    const computeCheckoutTotals = (cartItems, regionValue) => {
                        const list = Array.isArray(cartItems) ? cartItems : [];
                        const itemsSubtotal = list.reduce((sum, item) => {
                            const price = parsePriceToNumber(item?.price ?? item?.unit_price ?? item?.unitPrice);
                            const quantity = Number(item?.quantity ?? item?.qty ?? 1);
                            const qty = Number.isFinite(quantity) ? quantity : 1;
                            const unit = Number.isFinite(price) ? price : 0;
                            return sum + (unit * qty);
                        }, 0);

                        const totalWeight = calculateTotalWeight(list);
                        const shippingBreakdown = calculateCheckoutShipping(regionValue, totalWeight, itemsSubtotal);
                        const shippingFee = Number.isFinite(shippingBreakdown.totalShipping) ? shippingBreakdown.totalShipping : 0;
                        const total = itemsSubtotal + shippingFee;
                        return {
                            subtotal: itemsSubtotal,
                            totalWeight,
                            baseRate: shippingBreakdown.baseRate,
                            insuranceFee: shippingBreakdown.insuranceFee,
                            shippingFee,
                            total,
                            isOverLimit: shippingBreakdown.isOverLimit
                        };
                    };

                    let apiProducts = [];
                    let productsFetchOk = false;
                    let productsFetchStatus = null;
                    let productsFetchError = null;
                    try {
                        const controller = new AbortController();
                        const timeoutId = window.setTimeout(() => controller.abort(), 20000);
                        const pres = await fetch(`${API_BASE_URL}/products`, { signal: controller.signal });
                        window.clearTimeout(timeoutId);
                        productsFetchStatus = pres.status;
                        if (pres.ok) {
                            const payload = await pres.json();
                            const availableProducts = Array.isArray(payload)
                                ? payload
                                : Array.isArray(payload?.products)
                                    ? payload.products
                                    : [];
                            apiProducts = Array.isArray(availableProducts) ? availableProducts : [];
                            productsFetchOk = true;
                        } else {
                            console.warn('[checkout] /api/products returned non-OK:', pres.status);
                            apiProducts = [];
                        }
                    } catch (err) {
                        productsFetchError = err;
                        console.warn('[checkout] /api/products fetch failed or timed out; continuing without product list', err);
                        apiProducts = [];
                    }

                    const items = Array.isArray(currentCart) ? currentCart : [];
                    if (!items.length) {
                        console.warn('[checkout] cart items array is empty or invalid; continuing with empty array fallback');
                    }

                    const totalsNow = computeCheckoutTotals(items, region?.value);

                    if (totalsNow.isOverLimit || totalsNow.totalWeight > 10.00) {
                        window.alert('Package exceeds maximum parcel weight of 10.00 kg. Please split items into two separate orders.');
                        return;
                    }

                    if (!Number.isFinite(totalsNow.subtotal) || totalsNow.subtotal <= 0) {
                        throw new Error('Invalid subtotal. Check cart item prices.');
                    }
                    if (!Number.isFinite(totalsNow.shippingFee)) {
                        throw new Error('Invalid shipping fee.');
                    }
                    if (!Number.isFinite(totalsNow.total) || totalsNow.total <= 0) {
                        throw new Error('Invalid total.');
                    }

                const normalizeId = (value) => String(value ?? '').trim();
                const validIdSet = new Set(apiProducts.map((p) => Number(p?.id)).filter((n) => Number.isFinite(n)));
                const idToId = new Map(
                    apiProducts
                        .map((p) => [normalizeId(p?.id), p?.id])
                        .filter(([id]) => Boolean(id))
                );
                const normalizeName = (v) => String(v || '')
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, '');

                const nameKey = (v) => normalizeName(v).replace(/[^a-z0-9]/g, '');

                const nameToId = new Map(
                    apiProducts
                        .map((p) => [normalizeName(p?.name), Number(p?.id)])
                        .filter(([nm, id]) => nm && Number.isFinite(id))
                );

                const nameKeyToId = new Map(
                    apiProducts
                        .map((p) => [nameKey(p?.name), Number(p?.id)])
                        .filter(([nm, id]) => nm && Number.isFinite(id))
                );

                const resolveProductId = (cartItem) => {
                    const rawId =
                        cartItem?._id ??
                        cartItem?.id ??
                        cartItem?.productId ??
                        cartItem?.product_id ??
                        cartItem?.productID ??
                        cartItem?.pid ??
                        cartItem?.product?.id;

                    const rawIdNormalized = normalizeId(rawId);
                    if (rawIdNormalized && idToId.has(rawIdNormalized)) {
                        const mapped = Number(idToId.get(rawIdNormalized));
                        if (Number.isFinite(mapped) && mapped > 0) return mapped;
                    }

                    const numeric = typeof rawId === 'string' && rawId.trim() !== ''
                        ? Number(rawId.trim())
                        : Number(rawId);

                    if (Number.isFinite(numeric) && numeric > 0 && Number.isInteger(numeric) && validIdSet.has(numeric)) return numeric;

                    const titleRaw = String(cartItem?.title || cartItem?.name || cartItem?.productName || '').trim();
                    const title = normalizeName(titleRaw);
                    if (title && nameToId.has(title)) return nameToId.get(title);

                    const key = nameKey(titleRaw);
                    if (key && nameKeyToId.has(key)) return nameKeyToId.get(key);

                    // Fuzzy fallback: contains match (only if it resolves to a single product)
                    if (key) {
                        const matches = apiProducts
                            .map((p) => ({ id: Number(p?.id), key: nameKey(p?.name) }))
                            .filter((p) => Number.isFinite(p.id) && p.id > 0 && p.key)
                            .filter((p) => p.key.includes(key) || key.includes(p.key));

                        const uniqueIds = [...new Set(matches.map((m) => m.id))];
                        if (uniqueIds.length === 1) return uniqueIds[0];
                    }
                    return null;
                };

                    let normalizedItems = items
                        .map((it) => {
                            const productId = resolveProductId(it);
                            const quantity = Number(it?.quantity ?? it?.qty ?? 1);
                            return {
                                productId,
                                quantity: Number.isFinite(quantity) ? quantity : 1,
                                title: String(it?.title || it?.name || '').trim(),
                                variant: String(it?.variant || it?.option || '').trim(),
                            };
                        })
                        .filter((it) => {
                            const pid = Number(it.productId);
                            return Number.isFinite(pid) && Number.isInteger(pid) && pid > 0;
                        });

                    if (!normalizedItems.length) {
                        console.error('[checkout] Could not resolve valid product IDs from cart items.', {
                            cartSample: items?.slice?.(0, 5) || items?.[0] || null,
                            apiProductsCount: Array.isArray(apiProducts) ? apiProducts.length : 0,
                            productsFetchOk,
                            productsFetchStatus,
                            productsFetchError: productsFetchError ? String(productsFetchError?.message || productsFetchError) : null,
                        });

                        if (!productsFetchOk) {
                            window.alert('Unable to connect to the store server. Please try again.');
                            return;
                        }

                        if (Array.isArray(items) && items.length) {
                            window.alert('One or more products in your cart are no longer available.');
                            return;
                        }

                        window.alert('Your cart contains invalid product information. Please return to the store and add the products again.');
                        return;
                    }

                    let formData;
                    try {
                    const getEl = (id) => {
                        const el = document.getElementById(id);
                        if (!el) console.warn('[checkout] missing element #'+id);
                        return el;
                    };

                    const safeVal = (id) => {
                        const el = getEl(id);
                        try {
                            return el && 'value' in el ? String(el.value || '') : '';
                        } catch (err) {
                            console.warn('[checkout] failed reading value for #'+id, err);
                            return '';
                        }
                    };

                    // Re-read from DOM here to guarantee no null.value crashes
                    const firstNameSafe = safeVal('first-name').trim();
                    const lastNameSafe = safeVal('last-name').trim();
                    const customerNameSafe = `${firstNameSafe} ${lastNameSafe}`.trim() || String(customerName || 'Guest Customer');

                    const phoneSafe = safeVal('phone').trim() || String(phoneValue || '').trim();
                    const emailSafe = safeVal('email').trim();

                    const barangaySafe = safeVal('barangay').trim() || String(barangayText || '').trim();
                    const citySafe = safeVal('city').trim() || String(cityText || '').trim();
                    const regionSafe = safeVal('region').trim() || String(regionText || '').trim();
                    const postalSafe = safeVal('postal').trim() || String(postalText || '').trim();
                    const streetDetailSafe = safeVal('street-detail').trim() || String(streetDetailText || '').trim();

                    const barangayLineSafe = /\bbarangay\b/i.test(barangaySafe) ? barangaySafe : (barangaySafe ? `Barangay ${barangaySafe}` : '');

                    const addressSafe = [
                        streetDetailSafe,
                        barangayLineSafe,
                        citySafe,
                        regionSafe,
                        postalSafe,
                        'Philippines'
                    ]
                        .map((s) => String(s || '').trim())
                        .filter(Boolean)
                        .join(', ');

                    const activeRadio = qs('input[name="payment"]:checked');
                    const paymentKeySafe = activeRadio ? String(activeRadio.value || '') : String(paymentMethodKey || 'cod');
                    const paymentMethodSafe = paymentKeySafe === 'cod' || paymentKeySafe === 'cash_on_delivery'
                        ? 'Cash on Delivery'
                        : String(paymentMethod || '').trim() || String(paymentMethodKey || '').trim();

                    const safeAppend = (key, value) => {
                        try {
                            formData.append(key, value === undefined || value === null ? '' : String(value));
                        } catch (err) {
                            console.warn('[checkout] failed append', key, err);
                        }
                    };

                    formData = new FormData();
                    safeAppend('buyerName', customerNameSafe);
                    safeAppend('name', customerNameSafe);
                    safeAppend('shippingAddress', addressSafe || String(address || '').trim());
                    safeAppend('address', addressSafe || String(address || '').trim());
                // Structured address fields (backend/server.js supports both structured + shippingAddress)
                // Map the existing checkout fields to the backend's expected keys
                    safeAppend('islandGroup', regionSafe);
                    safeAppend('province', regionSafe);
                    safeAppend('municipality', citySafe);
                    safeAppend('barangay', barangaySafe);
                    safeAppend('streetAddress', streetDetailSafe);
                    safeAppend('customerEmail', emailSafe);
                    safeAppend('phone', phoneSafe);
                    safeAppend('userPhone', phoneSafe);
                    safeAppend('paymentMethod', paymentMethodSafe);
                    safeAppend('subtotal', totalsNow.subtotal);
                    safeAppend('shippingFee', totalsNow.shippingFee);
                    safeAppend('shipping_fee', totalsNow.shippingFee);
                    safeAppend('baseShippingFee', totalsNow.baseRate);
                    safeAppend('base_shipping_fee', totalsNow.baseRate);
                    safeAppend('insuranceFee', totalsNow.insuranceFee);
                    safeAppend('insurance_fee', totalsNow.insuranceFee);
                    safeAppend('totalWeight', totalsNow.totalWeight);
                    safeAppend('total_weight', totalsNow.totalWeight);
                    safeAppend('total', totalsNow.total);
                    safeAppend('total_amount', totalsNow.total);
                    safeAppend('items', JSON.stringify(
                        normalizedItems.map((it) => {
                            const cartMatch = (Array.isArray(items) ? items : []).find((x) => {
                                const resolved = resolveProductId(x);
                                return Number(resolved) === Number(it.productId);
                            });
                            const qty = Number(it.quantity) || 1;
                            const unit = cartMatch ? parsePriceToNumber(cartMatch?.price) : 0;
                            return {
                                productId: Number(it.productId),
                                productName: String(cartMatch?.title || cartMatch?.name || it.title || '').trim(),
                                quantity: qty,
                                price: unit,
                                subtotal: unit * qty,
                                variant: String(it.variant || '').trim() || null,
                            };
                        })
                    ));
                    if (receiptFile) {
                        const compressedReceipt = await compressImage(receiptFile);
                        formData.append('receipt', compressedReceipt);
                    }
                    } catch (err) {
                        console.error('[checkout] failed assembling FormData:', err);
                        throw err;
                    }

                    try {
                        const payloadView = {};
                        for (const [k, v] of formData.entries()) {
                            if (v instanceof File) {
                                payloadView[k] = { name: v.name, type: v.type, size: v.size };
                            } else {
                                payloadView[k] = v;
                            }
                        }
                        console.log('[checkout] Payload successfully built! Sending:', payloadView);
                    } catch (err) {
                        console.warn('[checkout] failed to preview payload', err);
                    }

                    console.log('[checkout] posting order to API', {
                        url: `${API_BASE_URL}/orders`,
                        paymentMethod: paymentMethodKey,
                        itemsCount: currentCart.length,
                        hasReceipt: Boolean(receiptFile)
                    });

                    const token = localStorage.getItem('jammailavskin_token');
                    const res = await fetch(`${API_BASE_URL}/orders`, {
                        method: 'POST',
                        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
                        body: formData
                    });

                    let data = null;
                    try {
                        data = await res.json();
                    } catch {
                        data = null;
                    }

                    if (!res.ok) {
                        const msg = String(data?.message || data?.error || 'Failed to place order.');
                        console.error('[checkout] order API failed', {
                            status: res.status,
                            statusText: res.statusText,
                            message: msg,
                            response: data
                        });
                        try {
                            const maybeLoader = document.querySelector('#preloader, #loading-screen, .loader, .loading-overlay, .spinner-overlay');
                            if (maybeLoader && maybeLoader.parentNode) maybeLoader.parentNode.removeChild(maybeLoader);
                        } catch {
                            // ignore
                        }
                        window.alert(`${msg} (HTTP ${res.status})`);
                        console.warn('[checkout] Early return triggered because: API response not ok');
                        return;
                    }

                    localStorage.setItem('jammaila_last_order_v1', JSON.stringify(newOrderPayload));
                    localStorage.setItem(CART_KEY, JSON.stringify([]));
                    localStorage.setItem('cart', JSON.stringify([]));
                    localStorage.removeItem(CHECKOUT_SNAPSHOT_KEY);
                    renderSummary([]);

                    try {
                        const maybeLoader = document.querySelector('#preloader, #loading-screen, .loader, .loading-overlay, .spinner-overlay');
                        if (maybeLoader && maybeLoader.parentNode) maybeLoader.parentNode.removeChild(maybeLoader);
                    } catch {
                        // ignore
                    }

                    const successOrderData = {
                        ...newOrderPayload,
                        pricing: {
                            subtotal: totalsNow.subtotal,
                            shipping: totalsNow.shippingFee,
                            baseShipping: totalsNow.baseRate,
                            insurance: totalsNow.insuranceFee,
                            totalWeight: totalsNow.totalWeight,
                            total: totalsNow.total
                        },
                        subtotal: totalsNow.subtotal,
                        shippingFee: totalsNow.shippingFee,
                        shipping_fee: totalsNow.shippingFee,
                        baseShippingFee: totalsNow.baseRate,
                        insuranceFee: totalsNow.insuranceFee,
                        totalWeight: totalsNow.totalWeight,
                        total: totalsNow.total,
                        total_amount: totalsNow.total,
                        ...(data || {})
                    };

                    try {
                        showOrderSuccessModal(successOrderData);
                    } catch (uiError) {
                        console.error('[CHECKOUT SUCCESS UI ERROR]', uiError);
                        window.alert(
                            `Order placed successfully${successOrderData?.id ? ` (Order #${successOrderData.id})` : ''}.`
                        );
                    }
                } catch (error) {
                    console.error('[CRITICAL CHECKOUT ERROR]:', error);
                    try {
                        const maybeLoader = document.querySelector('#preloader, #loading-screen, .loader, .loading-overlay, .spinner-overlay');
                        if (maybeLoader && maybeLoader.parentNode) maybeLoader.parentNode.removeChild(maybeLoader);
                    } catch {
                        // ignore
                    }
                    window.alert('Checkout encountered an error: ' + String(error?.message || error));
                }
            } finally {
                // handled by outer finally
            }
        };

            await finalizeAfterSuccess();
        } catch (err) {
            console.error('[checkout] unhandled error during submit', err);
            window.alert('Something went wrong while placing your order. Please try again.');
        } finally {
            isPlacingOrder = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '';
                submitBtn.textContent = prevSubmitText || submitBtn.textContent;
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        initCheckout();
    } catch (err) {
        console.error('[checkout] initCheckout crashed:', err);
        // Never block the UI due to missing elements
        try {
            const maybeLoader = document.querySelector('#preloader, #loading-screen, .loader, .loading-overlay, .spinner-overlay');
            if (maybeLoader && maybeLoader.parentNode) maybeLoader.parentNode.removeChild(maybeLoader);
        } catch {
            // ignore
        }
    }
});
