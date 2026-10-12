import React, { createContext, useContext, useState, useEffect } from 'react';
import { calculateTotalWeight } from '../utils/shipping';

const CART_KEY = 'jammaila_cart_v1';
const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    return {
      cart: [],
      isCartOpen: false,
      setIsCartOpen: () => {},
      addToCart: () => {},
      updateQty: () => {},
      removeFromCart: () => {},
      clearCart: () => {},
      cartCount: 0,
      cartSubtotal: 0,
      cartWeight: 0,
    };
  }
  return context;
};

const sanitizeCart = (rawList) => {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .filter((it) => it && typeof it === 'object' && it.id)
    .map((it) => {
      const cleanPrice = typeof it.price === 'string'
        ? Number(it.price.replace(/[^0-9.]/g, '')) || 0
        : Number(it.price) || 0;
      const cleanQty = Math.max(1, Number(it.qty || it.quantity || 1));
      const rawW = Number(it?.weight_kg ?? it?.weight);
      const safeW = Number.isFinite(rawW) && rawW > 0 ? rawW : 0.20;

      return {
        id: it.id,
        title: String(it.title || it.name || 'Product'),
        name: String(it.name || it.title || 'Product'),
        price: cleanPrice,
        img: it.imageUrl || it.img || '/assets/images/hero1.jpg.png',
        imageUrl: it.imageUrl || it.img || '/assets/images/hero1.jpg.png',
        qty: cleanQty,
        quantity: cleanQty,
        stock: it.stock,
        weight: safeW,
        weight_kg: safeW,
      };
    });
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return sanitizeCart(parsed);
      }
      const legacy = localStorage.getItem('cart');
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        if (Array.isArray(parsedLegacy)) return sanitizeCart(parsedLegacy);
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  const addToCart = (product, quantity = 1) => {
    if (!product || !product.id) return;
    const addQty = Math.max(1, Number(quantity) || 1);

    setCart((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const existingIndex = safePrev.findIndex((item) => String(item.id) === String(product.id));
      if (existingIndex > -1) {
        const updated = [...safePrev];
        const currentQty = Number(updated[existingIndex].qty || updated[existingIndex].quantity || 1);
        const maxStock = Number(product.stock) || 999;
        const newQty = Math.min(currentQty + addQty, maxStock);
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: newQty,
          quantity: newQty,
        };
        return updated;
      } else {
        const cleanPrice = typeof product.price === 'string'
          ? Number(product.price.replace(/[^0-9.]/g, '')) || 0
          : Number(product.price) || 0;
        const itemWeight = Number(product.weight_kg ?? product.weight ?? 0.20) || 0.20;
        return [
          ...safePrev,
          {
            id: product.id,
            title: product.name,
            name: product.name,
            price: cleanPrice,
            img: product.imageUrl || '/assets/images/hero1.jpg.png',
            imageUrl: product.imageUrl || '/assets/images/hero1.jpg.png',
            qty: addQty,
            quantity: addQty,
            stock: product.stock,
            weight: itemWeight,
            weight_kg: itemWeight,
          },
        ];
      }
    });

    setIsCartOpen(true);
  };

  const updateQty = (id, deltaOrVal, isAbsolute = false) => {
    setCart((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev
        .map((item) => {
          if (String(item.id) === String(id)) {
            const current = Number(item.qty || item.quantity || 1);
            const target = isAbsolute ? Number(deltaOrVal) : current + Number(deltaOrVal);
            const maxStock = Number(item.stock) || 999;
            const finalQty = Math.min(Math.max(0, target), maxStock);
            return {
              ...item,
              qty: finalQty,
              quantity: finalQty,
            };
          }
          return item;
        })
        .filter((item) => Number(item.qty || item.quantity) > 0);
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.filter((item) => String(item.id) !== String(id));
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const safeCart = Array.isArray(cart) ? cart : [];
  const cartCount = safeCart.reduce((sum, item) => sum + (Number(item.qty || item.quantity) || 0), 0);
  const cartSubtotal = safeCart.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty || item.quantity) || 0),
    0
  );
  const cartWeight = calculateTotalWeight(safeCart);

  return (
    <CartContext.Provider
      value={{
        cart: safeCart,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        cartCount,
        cartSubtotal,
        cartWeight,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
