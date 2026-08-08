import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BadgeCheck,
  GitCompareArrows,
  Headphones,
  Heart,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useCart } from '../../state/CartContext.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';

const formatMoney = value => `₦${(Number(value || 0) / 100).toLocaleString()}`;

export function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [saved, setSaved] = useState('');
  const [reviewError, setReviewError] = useState('');
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadReviews = () => api(`/reviews/product/${id}`).then(setReviews);

  useEffect(() => {
    Promise.all([api(`/products/${id}`), loadReviews()]).then(([data]) => setProduct(data));
  }, [id]);

  const guarded = fn => async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      await fn();
    } catch (error) {
      setSaved(error.message);
    }
  };

  const collect = type => guarded(async () => {
    await api(`/collections/${type}/${id}`, { method: 'POST' });
    setSaved(type === 'wishlist' ? 'Saved to wishlist.' : 'Added to compare.');
  });

  const messageSeller = guarded(async () => {
    const conversation = await api('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ user_id: product.seller_id }),
    });
    navigate(`/messages/${conversation.id}`);
  });

  async function submitReview(event) {
    event.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }
    const form = new FormData(event.currentTarget);
    try {
      await api('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          product_id: id,
          rating: Number(form.get('rating')),
          comment: form.get('comment'),
        }),
      });
      event.currentTarget.reset();
      loadReviews();
    } catch (error) {
      setReviewError(error.message);
    }
  }

  async function deleteReview(reviewId) {
    try {
      await api(`/reviews/${reviewId}`, { method: 'DELETE' });
      loadReviews();
    } catch (error) {
      setReviewError(error.message);
    }
  }

  const effectivePrice = useMemo(
    () => Number(product?.flash_price || product?.price || 0),
    [product],
  );
  const discount = useMemo(() => {
    if (!product?.flash_price || !product?.price || Number(product.flash_price) >= Number(product.price)) return 0;
    return Math.round((1 - Number(product.flash_price) / Number(product.price)) * 100);
  }, [product]);

  if (!product) return <div className="market-page market-loading">Loading product…</div>;

  const sellerName = product.store_name || product.seller_name || 'BUYSELL seller';
  const rating = Number(product.rating || product.average_rating || 0);

  const addToCart = () => {
    cart.add({ ...product, price: effectivePrice }, quantity);
    setSaved(`${quantity} item${quantity > 1 ? 's' : ''} added to cart.`);
  };

  return (
    <div className="market-page product-experience">
      <div className="market-breadcrumb">
        <Link to="/shop">Home</Link><span>/</span>
        <Link to={`/category/${product.category || 'trending'}`}>{product.category || 'Marketplace'}</Link><span>/</span>
        <strong>{product.name}</strong>
      </div>

      <section className="product-stage">
        <div className="product-media-panel">
          {discount > 0 && <span className="deal-badge product-deal-badge">-{discount}% OFF</span>}
          <button className="product-floating-heart" onClick={collect('wishlist')} aria-label="Save to wishlist"><Heart size={19} /></button>
          {product.image_url
            ? <img className="product-primary-image" src={product.image_url} alt={product.name} />
            : <div className="market-product-placeholder product-large-placeholder">BUYSELL</div>}
          <div className="product-thumb-row">
            {[0, 1, 2, 3].map(index => (
              <span className={index === 0 ? 'product-thumb active' : 'product-thumb'} key={index}>
                {product.image_url ? <img src={product.image_url} alt="" /> : <span>BS</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="product-buy-panel">
          <span className="verified-pill"><BadgeCheck size={15} /> Verified seller</span>
          <h1>{product.name}</h1>
          <p className="product-meta">{product.condition || 'Brand new'} · {product.category || 'Marketplace'} · In stock</p>
          <div className="product-rating"><Star size={16} fill="currentColor" /> <strong>{rating ? rating.toFixed(1) : 'New'}</strong><span>({product.review_count || reviews.length} reviews)</span></div>

          <div className="product-price-line">
            <strong>{formatMoney(effectivePrice)}</strong>
            {product.flash_price && <del>{formatMoney(product.price)}</del>}
          </div>

          <div className="product-option-block">
            <span className="product-option-label">Quantity</span>
            <div className="qty-control">
              <button type="button" onClick={() => setQuantity(value => Math.max(1, value - 1))}><Minus size={15} /></button>
              <strong>{quantity}</strong>
              <button type="button" onClick={() => setQuantity(value => value + 1)}><Plus size={15} /></button>
            </div>
          </div>

          <div className="product-primary-actions">
            <button className="primary-cta product-cart-cta" onClick={addToCart}><ShoppingCart size={18} /> Add to cart</button>
            <button className="product-outline-cta" onClick={() => { addToCart(); navigate('/checkout'); }}>Buy now</button>
          </div>
          <div className="product-secondary-actions">
            <button onClick={messageSeller}><MessageCircle size={16} /> Message seller</button>
            <button onClick={collect('compare')}><GitCompareArrows size={16} /> Compare</button>
          </div>
          {saved && <p className="product-success">{saved}</p>}

          <Link className="seller-trust-card" to={`/store/${product.seller_id}`}>
            <span className="seller-avatar">{sellerName.slice(0, 2).toUpperCase()}</span>
            <span><strong>{sellerName}</strong><small>Verified store on BUYSELL</small></span>
            <BadgeCheck size={19} />
          </Link>
        </div>
      </section>

      <section className="product-trust-strip">
        <article><span><ShieldCheck size={19} /></span><div><strong>Buyer Protection</strong><small>Refund support on eligible orders</small></div></article>
        <article><span><Truck size={19} /></span><div><strong>Managed Delivery</strong><small>BUYSELL controls tracking</small></div></article>
        <article><span><BadgeCheck size={19} /></span><div><strong>Verified Sellers</strong><small>KYC-backed trust badges</small></div></article>
        <article><span><Headphones size={19} /></span><div><strong>24/7 Support</strong><small>Help when you need it</small></div></article>
      </section>

      <section className="product-details-card">
        <div className="product-details-tabs"><strong>Product details</strong><span>Specifications</span><span>Reviews ({reviews.length})</span></div>
        <p>{product.description || 'This listing is sold through BUYSELL with visible seller verification, secure payment and delivery tracking.'}</p>
      </section>

      <section className="product-review-section">
        <div className="market-section-heading"><div><span className="market-kicker">BUYER FEEDBACK</span><h2>Reviews</h2></div></div>
        {user && (
          <form className="review-compose" onSubmit={submitReview}>
            <select name="rating" defaultValue="5"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select>
            <textarea name="comment" placeholder="Share your experience with this product" />
            <button className="primary-cta">Save review</button>
          </form>
        )}
        {reviewError && <p className="error">{reviewError}</p>}
        <div className="product-review-grid">
          {reviews.length ? reviews.map(review => (
            <article className="product-review-card" key={review.id}>
              <div className="review-card-head"><strong>{review.reviewer_name || 'Buyer'}</strong><span><Star size={14} fill="currentColor" /> {review.rating}/5</span></div>
              <p>{review.comment || review.review_text}</p>
              <div className="review-card-foot">
                {review.verified_purchase ? <small><BadgeCheck size={13} /> Verified purchase</small> : <small>BUYSELL review</small>}
                {user?.id === review.reviewer_id && <button onClick={() => deleteReview(review.id)}>Delete</button>}
              </div>
            </article>
          )) : <div className="market-empty">No reviews yet. Be the first buyer to leave one.</div>}
        </div>
      </section>

      <div className="mobile-purchase-bar">
        <div><small>Total</small><strong>{formatMoney(effectivePrice * quantity)}</strong></div>
        <button onClick={messageSeller}><MessageCircle size={17} /> Message</button>
        <button onClick={addToCart}><ShoppingCart size={17} /> Add to cart</button>
      </div>
    </div>
  );
}
