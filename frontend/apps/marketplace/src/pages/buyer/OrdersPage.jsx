import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PackageCheck, ShoppingBag, Truck } from 'lucide-react';
import { api } from '../../api/client.js';

const money = value => `₦${(Number(value || 0) / 100).toLocaleString()}`;

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/orders?as=buyer').then(setOrders).finally(() => setLoading(false));
  }, []);

  return (
    <div className="market-page buyer-orders-page">
      <div className="commerce-page-heading">
        <span className="market-kicker">BUYER ACCOUNT</span>
        <h1>Your orders</h1>
        <p>Payment, collection and delivery status stay visible from checkout to doorstep.</p>
      </div>

      <div className="buyer-order-tabs"><span className="active">All orders</span><span>Processing</span><span>On the way</span><span>Delivered</span></div>

      {loading ? <div className="market-loading">Loading your orders…</div> : orders.length ? (
        <section className="buyer-order-list">
          {orders.map(order => {
            const status = String(order.status || 'pending').replaceAll('_', ' ');
            const Icon = status.includes('delivered') ? PackageCheck : status.includes('ship') || status.includes('transit') ? Truck : ShoppingBag;
            return (
              <Link className="buyer-order-card" to={`/orders/${order.id}`} key={order.id}>
                <span className="buyer-order-icon"><Icon size={21} /></span>
                <div className="buyer-order-main">
                  <strong>{order.order_number || `Order ${String(order.id).slice(0, 8)}`}</strong>
                  <span>{new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <span className={`order-status-pill status-${String(order.status || 'pending').toLowerCase()}`}>{status}</span>
                <strong className="buyer-order-total">{money(order.total_amount)}</strong>
                <ArrowRight size={18} />
              </Link>
            );
          })}
        </section>
      ) : (
        <div className="buyer-empty-state"><span><ShoppingBag size={27} /></span><h2>No orders yet</h2><p>Your completed BUYSELL purchases will appear here.</p><Link className="primary-cta" to="/shop">Browse marketplace</Link></div>
      )}
    </div>
  );
}
