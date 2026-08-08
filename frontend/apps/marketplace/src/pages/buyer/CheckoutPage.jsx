import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, CreditCard, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { api } from '../../api/client.js';
import { useCart } from '../../state/CartContext.jsx';

const money = value => `₦${(Number(value || 0) / 100).toLocaleString()}`;

export function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    delivery_name: '',
    delivery_phone: '',
    delivery_address: '',
    delivery_state: '',
    payment_method: 'flutterwave',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const deliveryFee = cart.items.length ? 650000 : 0;
  const total = useMemo(() => cart.subtotal + deliveryFee, [cart.subtotal, deliveryFee]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const created = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          items: cart.items.map(item => ({ product_id: item.id, quantity: item.quantity })),
        }),
      });
      const orderIds = (created.orders || []).map(order => order.id);
      if (form.payment_method === 'flutterwave') {
        const payment = await api('/payments/flutterwave/initialize', {
          method: 'POST',
          body: JSON.stringify({ order_ids: orderIds }),
        });
        cart.clear();
        window.location.assign(payment.checkout_url);
        return;
      }
      cart.clear();
      navigate(`/orders/${created.id}`);
    } catch (requestError) {
      setError(requestError.message);
      setBusy(false);
    }
  }

  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));

  return (
    <div className="market-page checkout-page-shell">
      <div className="commerce-page-heading checkout-heading">
        <span className="market-kicker">SECURE CHECKOUT</span>
        <h1>Delivery, payment, confirmation.</h1>
        <p>BUYSELL keeps payment confirmation and managed delivery visible before collection begins.</p>
      </div>

      <div className="checkout-steps" aria-label="Checkout progress">
        <span className="active"><b>1</b> Delivery</span>
        <i />
        <span className="active"><b>2</b> Payment</span>
        <i />
        <span><b>3</b> Confirmation</span>
      </div>

      <form className="checkout-layout" onSubmit={submit}>
        <section className="checkout-form-card">
          <div className="checkout-card-title"><span><MapPin size={19} /></span><div><h2>Delivery information</h2><p>Our delivery team collects from the seller and controls tracking.</p></div></div>
          <div className="checkout-form-grid">
            <label><span>Full name</span><input required value={form.delivery_name} onChange={event => change('delivery_name', event.target.value)} placeholder="Your full name" /></label>
            <label><span>Phone number</span><input required value={form.delivery_phone} onChange={event => change('delivery_phone', event.target.value)} placeholder="0801 234 5678" /></label>
            <label><span>State</span><input value={form.delivery_state} onChange={event => change('delivery_state', event.target.value)} placeholder="Lagos" /></label>
            <label><span>Delivery method</span><input value="Doorstep delivery" readOnly /></label>
            <label className="checkout-address-field"><span>Delivery address</span><textarea required value={form.delivery_address} onChange={event => change('delivery_address', event.target.value)} placeholder="House number, street, area and nearby landmark" /></label>
          </div>

          <div className="checkout-protection-note"><ShieldCheck size={18} /><div><strong>Buyer Protection active</strong><span>Funds are confirmed before BUYSELL begins collection.</span></div></div>

          <div className="checkout-payment-options">
            <h3>Payment method</h3>
            <label className={form.payment_method === 'flutterwave' ? 'payment-choice active' : 'payment-choice'}>
              <input type="radio" name="payment_method" value="flutterwave" checked={form.payment_method === 'flutterwave'} onChange={event => change('payment_method', event.target.value)} />
              <span><CreditCard size={18} /></span>
              <div><strong>Flutterwave</strong><small>Card, USSD and supported payment methods</small></div>
              <BadgeCheck size={17} />
            </label>
            <label className={form.payment_method === 'bank_transfer' ? 'payment-choice active' : 'payment-choice'}>
              <input type="radio" name="payment_method" value="bank_transfer" checked={form.payment_method === 'bank_transfer'} onChange={event => change('payment_method', event.target.value)} />
              <span><Truck size={18} /></span>
              <div><strong>Bank transfer</strong><small>Upload or confirm transfer through the order flow</small></div>
            </label>
          </div>

          {error && <p className="error">{error}</p>}
          <button disabled={!cart.items.length || busy} className="primary-cta checkout-submit">
            {busy ? 'Preparing secure checkout…' : form.payment_method === 'flutterwave' ? 'Continue to Flutterwave payment' : 'Create order and continue'}
          </button>
        </section>

        <aside className="checkout-summary-card">
          <h2>Order summary</h2>
          <div className="checkout-summary-items">
            {cart.items.map(item => (
              <article key={item.id}>
                <span className="checkout-summary-image">{item.image_url ? <img src={item.image_url} alt={item.name} /> : 'BS'}</span>
                <div><strong>{item.name}</strong><small>Qty {item.quantity}</small></div>
                <b>{money(Number(item.flash_price || item.price || 0) * item.quantity)}</b>
              </article>
            ))}
          </div>
          <div className="checkout-summary-line"><span>Subtotal</span><strong>{money(cart.subtotal)}</strong></div>
          <div className="checkout-summary-line"><span>BUYSELL delivery</span><strong>{money(deliveryFee)}</strong></div>
          <div className="checkout-summary-line discount"><span>Buyer Protection</span><strong>Included</strong></div>
          <hr />
          <div className="checkout-summary-total"><span>Total</span><strong>{money(total)}</strong></div>

          <div className="checkout-security-card"><ShieldCheck size={19} /><div><strong>Protected checkout</strong><span>BUYSELL never exposes your database or seller payout details in the browser.</span></div></div>
          <div className="checkout-security-card light"><Truck size={19} /><div><strong>Managed delivery</strong><span>Collection and tracking continue after payment confirmation.</span></div></div>
        </aside>
      </form>
    </div>
  );
}
