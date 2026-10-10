import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Cart, CartItem, Product } from "../lib/types";
import { useAuth } from "./AuthContext";

const emptyCart: Cart = { items: [], itemCount: 0, subtotal: 0 };
const anonymousCartKey = "buysell:cart:v1";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cartIdentity(productId: string, variantId?: string) {
  return variantId && uuidPattern.test(variantId)
    ? { variantId }
    : { productId };
}

function totalCart(items: CartItem[]): Cart {
  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    ),
  };
}

function loadAnonymousCart(): Cart {
  try {
    const parsed = JSON.parse(localStorage.getItem(anonymousCartKey) || "{}");
    if (parsed.version !== 1 || !Array.isArray(parsed.items)) return emptyCart;
    const items = parsed.items
      .filter(
        (item: CartItem) =>
          item?.id &&
          item?.product?.id &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0,
      )
      .slice(0, 100);
    return totalCart(items);
  } catch {
    return emptyCart;
  }
}

interface CartContextValue {
  cart: Cart;
  loading: boolean;
  error: Error | null;
  adding: boolean;
  addItem: (
    productId: string,
    quantity?: number,
    variantId?: string,
    product?: Product,
  ) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const { authUser } = useAuth();
  const queryClient = useQueryClient();
  const [anonymousCart, setAnonymousCart] = useState<Cart>(() =>
    loadAnonymousCart(),
  );
  const cartQuery = useQuery({
    queryKey: ["cart", authUser?.id],
    queryFn: () => api.get<Cart>("/cart"),
    enabled: Boolean(authUser),
    retry: 1,
    staleTime: 15_000,
  });

  const persistAnonymousCart = useCallback((items: CartItem[]) => {
    const cart = totalCart(items);
    setAnonymousCart(cart);
    localStorage.setItem(
      anonymousCartKey,
      JSON.stringify({ version: 1, items: cart.items }),
    );
  }, []);

  const syncCart = (cart: Cart) =>
    queryClient.setQueryData(["cart", authUser?.id], cart);
  const addMutation = useMutation({
    mutationFn: async (input: {
      productId: string;
      quantity: number;
      variantId?: string;
    }) => {
      await api.post("/cart/items", {
        ...cartIdentity(input.productId, input.variantId),
        quantity: input.quantity,
      });
      return api.get<Cart>("/cart");
    },
    onSuccess: syncCart,
  });
  const updateMutation = useMutation({
    mutationFn: async ({
      itemId,
      quantity,
    }: {
      itemId: string;
      quantity: number;
    }) => {
      await api.put(`/cart/items/${encodeURIComponent(itemId)}`, { quantity });
      return api.get<Cart>("/cart");
    },
    onSuccess: syncCart,
  });
  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/cart/items/${encodeURIComponent(itemId)}`);
      return api.get<Cart>("/cart");
    },
    onSuccess: syncCart,
  });

  useEffect(() => {
    if (!authUser || !anonymousCart.items.length || cartQuery.isLoading) return;
    let active = true;
    const merge = async () => {
      await Promise.all(
        anonymousCart.items.map((item) => {
          return api.post("/cart/items", {
            ...cartIdentity(item.product.id, item.variantId),
            quantity: item.quantity,
            additive: true,
          });
        }),
      );
      if (!active) return;
      localStorage.removeItem(anonymousCartKey);
      setAnonymousCart(emptyCart);
      await queryClient.invalidateQueries({ queryKey: ["cart", authUser.id] });
    };
    void merge().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [
    authUser,
    anonymousCart.items,
    cartQuery.isLoading,
    queryClient,
  ]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart: authUser ? (cartQuery.data ?? emptyCart) : anonymousCart,
      loading: Boolean(authUser) && cartQuery.isLoading,
      error: authUser ? cartQuery.error : null,
      adding: addMutation.isPending,
      addItem: async (productId, quantity = 1, variantId, product) => {
        const itemId = variantId ?? productId;
        if (authUser) {
          await addMutation.mutateAsync({ productId, quantity, variantId });
          return;
        }
        const existing = anonymousCart.items.find((item) => item.id === itemId);
        const resolvedProduct =
          product ??
          (await api.get<Product>(
            `/catalog/products/${encodeURIComponent(productId)}`,
            { anonymous: true },
          ));
        const next = existing
          ? anonymousCart.items.map((item) =>
              item.id === itemId
                ? { ...item, quantity: Math.min(99, item.quantity + quantity) }
                : item,
            )
          : [
              ...anonymousCart.items,
              {
                id: itemId,
                variantId: itemId,
                quantity: Math.min(99, quantity),
                product: resolvedProduct,
              },
            ];
        persistAnonymousCart(next);
      },
      updateItem: async (itemId, quantity) => {
        if (authUser) await updateMutation.mutateAsync({ itemId, quantity });
        else
          persistAnonymousCart(
            anonymousCart.items.map((item) =>
              item.id === itemId
                ? { ...item, quantity: Math.max(1, Math.min(99, quantity)) }
                : item,
            ),
          );
      },
      removeItem: async (itemId) => {
        if (authUser) await removeMutation.mutateAsync(itemId);
        else
          persistAnonymousCart(
            anonymousCart.items.filter((item) => item.id !== itemId),
          );
      },
    }),
    [
      authUser,
      cartQuery.data,
      cartQuery.isLoading,
      cartQuery.error,
      anonymousCart,
      addMutation,
      updateMutation,
      removeMutation,
      persistAnonymousCart,
    ],
  );

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const context = use(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
