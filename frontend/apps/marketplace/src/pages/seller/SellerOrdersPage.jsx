import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PackageCheck, ShoppingBag, Truck } from 'lucide-react';
import { api } from '../../api/client.js';

const money = value => `₦${(Number(value || 0) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'disputed'];

export function SellerOrdersPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    try { setRows(await api('/orders?as=seller')); }
    catch (requestError) { setError(requestError.message); }
  }

  useEffect(() => { load(); }, []);

  async function update(id, status) {
    try {
      await api(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="seller-page">
      <div className="workspace-heading-row"><div><span className="market-kicker">FULFILLMENT</span><h1>Orders</h1><p>Process customer orders and keep BUYSELL delivery status accurate.</p></div></div>
      {error && <p className="error">{error}</p>}
      <div className="seller-order-summary">
        <article><ShoppingBag size={18} /><span><small>Total orders</small><strong>{rows.length}</strong></span></article>
        <article><Truck size={18} /><span><small>Open fulfillment</small><strong>{rows.filter(row => ['pending','confirmed','processing','shipped'].includes(row.status)).length}</strong></span></article>
        <article><PackageCheck size={18} /><span><small>Delivered</small><strong>{rows.filter(row => row.status === 'delivered').length}</strong></span></article>
      </div>
      <section className="seller-table-card seller-orders-table">
        <div className="seller-table-head"><span>Order</span><span>Status</span><span>Total</span><span>Update</span><span>Open</span></div>
        {rows.length ? rows.map(order => (
          <article className="seller-table-row" key={order.id}>
            <div><strong>{order.order_number || String(order.id).slice(0, 8)}</strong><small>{order.created_at ? new Date(order.created_at).toLocaleDateString('en-NG') : 'BUYSELL order'}</small></div>
            <span className={`seller-status status-${String(order.status || 'pending').toLowerCase()}`}>{order.status}</span>
            <strong className="seller-price">{money(order.total_amount)}</strong>
            <select className="seller-status-select" value={order.status} onChange={event => update(order.id, event.target.value)}>{statuses.map(status => <option key={status}>{status}</option>)}</select>
            <Link className="seller-open-order" to={`/orders/${order.id}`}>View <ArrowRight size={15} /></Link>
          </article>
        )) : <div className="seller-empty-state"><ShoppingBag size={26} /><strong>No orders yet</strong><span>New customer orders will appear here.</span></div>}
      </section>
    </div>
  );
}
