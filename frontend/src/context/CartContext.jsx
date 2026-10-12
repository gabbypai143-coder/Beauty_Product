import React, { createContext, useContext, useState, useEffect } from 'react';
import { calculateTotalWeight } from '../utils/shipping';

const CART_KEY = 'jammaila_cart_v1';
const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) return JSON.parse(raw);
      const legacy = localStorage.getItem('cart');
      if (legacy) return JSON.parse(legacy);
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
      const existingIndex = prev.findIndex((item) => String(item.id) === String(product.id));
      if (existingIndex > -1) {
        const updated = [...prev];
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
        const itemWeight = Number(product.weight_kg ?? product.weight ?? 0.20) || 0.20;
        return [
          ...prev,
          {
            id: product.id,
            title: product.name,
            name: product.name,
            price: Number(product.price) || 0,
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
      return prev
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
    setCart((prev) => prev.filter((item) => String(item.id) !== String(id)));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + (Number(item.qty || item.quantity) || 0), 0);
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty || item.quantity) || 0),
    0
  );
  const cartWeight = calculateTotalWeight(cart);

  return (
    <CartContext.Provider
      value={{
        cart,
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
