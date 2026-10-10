import { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'bs_cart_v12';

function initialCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(initialCart);

  const persist = next => {
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const value = useMemo(() => ({
    items,
    add(product, quantity = 1) {
      const normalized = { ...product, price: Number(product.flash_price || product.price || 0) };
      const next = [...items];
      const index = next.findIndex(item => item.id === product.id);
      if (index >= 0) next[index] = { ...next[index], ...normalized, quantity: next[index].quantity + quantity };
      else next.push({ ...normalized, quantity });
      persist(next);
    },
    remove(id) {
      persist(items.filter(item => item.id !== id));
    },
    setQty(id, quantity) {
      persist(items.map(item => item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item));
    },
    clear() {
      persist([]);
    },
    subtotal: items.reduce((sum, item) => sum + Number(item.flash_price || item.price || 0) * item.quantity, 0),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
