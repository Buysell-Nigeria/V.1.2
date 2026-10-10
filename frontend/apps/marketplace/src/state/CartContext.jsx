import { createContext, useContext, useMemo, useState } from 'react';
import { getOrderEstimate } from '../utils/pricing.js';

const CartContext = createContext(null);
const STORAGE_KEY = 'bs_cart_v12';
const normalize = item => ({
  ...item,
  // Only the server's current product.price is accepted at checkout.
  price: Math.max(0, Number(item.price || 0)),
  shipping_fee: Math.max(0, Number(item.shipping_fee || 0)),
  quantity: Math.max(1, Math.round(Number(item.quantity || 1))),
});
function initialCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter(item=>item?.id).map(normalize) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(initialCart);
  const persist = nextOrUpdater => setItems(current => {
    const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(current) : nextOrUpdater;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    return next;
  });
  const value = useMemo(() => ({
    items,
    add(product, quantity = 1) {
      if (!product?.id) return;
      const normalized = normalize(product);
      const addQuantity = Math.max(1, Math.round(Number(quantity) || 1));
      persist(current => {
        const index = current.findIndex(item => String(item.id) === String(product.id));
        if (index === -1) return [...current, { ...normalized, quantity: addQuantity }];
        return current.map((item, i) => i === index
          ? { ...normalized, quantity: Math.max(1, item.quantity + addQuantity) }
          : item);
      });
    },
    remove(id) {
      persist(current => current.filter(item => String(item.id) !== String(id)));
    },
    setQty(id, quantity) {
      persist(current => current.map(item => String(item.id) === String(id)
        ? { ...item, quantity: Math.max(1, Math.round(Number(quantity) || 1)) }
        : item));
    },
    clear() { persist([]); },
    subtotal: getOrderEstimate(items).subtotal,
    estimate: getOrderEstimate(items),
  }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);
