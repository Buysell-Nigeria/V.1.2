import { Heart, MapPin, ShoppingCart, Star } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { ProductMediaImage } from "./ProductMediaImage";
import { useState } from "react";
import { formatMoney } from "../lib/format";
import type { Product } from "../lib/types";
import { useCart } from "../contexts/CartContext";
import { useToast } from "../contexts/ToastContext";

export function ProductCard({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const { addItem, adding } = useCart();
  const { notify } = useToast();
  const { authUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const wishlist = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => api.get<{items: Product[]}>("/wishlist"),
    enabled: Boolean(authUser),
    staleTime: 30_000,
  });
  const saved = Boolean(wishlist.data?.items?.some(item => item.id === product.id));
  const toggleWishlist = async () => {
    if (!authUser) {
      navigate("/login", {state:{from:location.pathname+location.search}});
      return;
    }
    setSaving(true);
    try {
      if (saved) await api.delete(`/wishlist/${product.id}`);
      else await api.put(`/wishlist/${product.id}`, {});
      await queryClient.invalidateQueries({queryKey:["wishlist"]});
      notify(saved ? "Removed from wishlist" : "Saved to your wishlist");
    } catch(error) {
      notify(error instanceof Error ? error.message : "Could not update wishlist", "error");
    } finally {setSaving(false);}
  };


  const addToCart = async () => {
    try {
      await addItem(product.id, 1, product.variantId, product);
      notify(`${product.name} added to your cart`);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not add this item",
        "error",
      );
    }
  };

  return (
    <article
      className={`product-card${compact ? " product-card--compact" : ""}`}
    >
      <div className="product-card__media">
        <Link
          to={`/product/${product.slug}`}
          aria-label={`View ${product.name}`}
        >
          <ProductMediaImage sources={[product.image, ...(product.images || [])]}
            alt={product.name} fit="contain" placeholderLabel="Product photo unavailable"/>
        </Link>
        {product.badge && (
          <span className="product-card__badge">{product.badge}</span>
        )}
        <button className={`product-card__wish ${saved ? "is-saved" : ""}`}
          type="button" aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
          aria-pressed={saved} onClick={() => void toggleWishlist()} disabled={saving}>
          <Heart fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="product-card__body">
        <Link className="product-card__title" to={`/product/${product.slug}`}>
          {product.name}
        </Link>
        <div className="product-card__price-row">
          <strong>{formatMoney(product.price, product.currency)}</strong>
          {product.compareAtPrice && (
            <s>{formatMoney(product.compareAtPrice, product.currency)}</s>
          )}
        </div>
        <div className="product-card__meta">
          {product.rating && (
            <span>
              <Star aria-hidden="true" /> {product.rating.toFixed(1)}
            </span>
          )}
          {product.location && (
            <span>
              <MapPin aria-hidden="true" /> {product.location}
            </span>
          )}
        </div>
        {typeof product.soldPercent === "number" && (
          <div
            className="stock-meter"
            aria-label={`${product.soldPercent}% sold`}
          >
            <span style={{ width: `${product.soldPercent}%` }} />
          </div>
        )}
      </div>
      <button
        className="product-card__add"
        type="button"
        onClick={addToCart}
        disabled={adding}
        aria-label={`Add ${product.name} to cart`}
      >
        <ShoppingCart aria-hidden="true" /> <span>Add to cart</span>
      </button>
    </article>
  );
}
