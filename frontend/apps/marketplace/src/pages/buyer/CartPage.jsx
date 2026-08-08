import { Link } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { useCart } from '../../state/CartContext.jsx';

const money = value => `₦${(Number(value || 0) / 100).toLocaleString()}`;

export function CartPage() {
  const cart = useCart();
  const deliveryEstimate = cart.items.length ? 650000 : 0;

  if (!cart.items.length) {
    return (
      <div className="market-page cart-empty-page">
        <div className="cart-empty-card">
          <span><ShoppingBag size={30} /></span>
          <h1>Your cart is empty</h1>
          <p>Save products from verified BUYSELL sellers here and complete payment when you are ready.</p>
          <Link className="primary-cta" to="/shop">Continue shopping <ArrowRight size={17} /></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="market-page checkout-page-shell">
      <div className="commerce-page-heading">
        <span className="market-kicker">YOUR BASKET</span>
        <h1>Shopping cart</h1>
        <p>{cart.items.length} product{cart.items.length > 1 ? 's' : ''} ready for secure checkout.</p>
      </div>

      <div className="cart-layout">
        <section className="cart-items-card">
          {cart.items.map(item => {
            const unitPrice = Number(item.flash_price || item.price || 0);
            return (
              <article className="cart-product-row" key={item.id}>
                <Link className="cart-product-image" to={`/products/${item.id}`}>
                  {item.image_url ? <img src={item.image_url} alt={item.name} /> : <span>BUYSELL</span>}
                </Link>
                <div className="cart-product-copy">
                  <Link to={`/products/${item.id}`}><strong>{item.name}</strong></Link>
                  <span>{item.store_name || item.seller_name || 'Verified BUYSELL seller'}</span>
                  <small><ShieldCheck size={13} /> Buyer Protection eligible</small>
                </div>
                <div className="cart-qty-block">
                  <span>Quantity</span>
                  <div className="qty-control">
                    <button onClick={() => cart.setQty(item.id, item.quantity - 1)}><Minus size={14} /></button>
                    <strong>{item.quantity}</strong>
                    <button onClick={() => cart.setQty(item.id, item.quantity + 1)}><Plus size={14} /></button>
                  </div>
                </div>
                <div className="cart-row-price">
                  <strong>{money(unitPrice * item.quantity)}</strong>
                  <button onClick={() => cart.remove(item.id)}><Trash2 size={15} /> Remove</button>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="cart-summary-card">
          <h2>Order summary</h2>
          <div><span>Subtotal</span><strong>{money(cart.subtotal)}</strong></div>
          <div><span>Estimated BUYSELL delivery</span><strong>{money(deliveryEstimate)}</strong></div>
          <div className="summary-discount"><span>Buyer Protection</span><strong>Included</strong></div>
          <hr />
          <div className="cart-total"><span>Estimated total</span><strong>{money(cart.subtotal + deliveryEstimate)}</strong></div>
          <Link className="primary-cta cart-checkout-cta" to="/checkout">Proceed to checkout <ArrowRight size={17} /></Link>
          <p className="cart-security-note"><ShieldCheck size={16} /> Payment is confirmed before collection begins.</p>
          <p className="cart-security-note"><Truck size={16} /> BUYSELL-managed delivery keeps tracking visible.</p>
        </aside>
      </div>
    </div>
  );
}
