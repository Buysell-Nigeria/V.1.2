import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, FileUp, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { api, uploadFile } from '../../api/client.js';

const money = value => `₦${(Number(value || 0) / 100).toLocaleString()}`;

export function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const load = () => api(`/orders/${id}`).then(setOrder).catch(requestError => setError(requestError.message));

  useEffect(() => { load(); }, [id]);

  async function proof(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const uploaded = await uploadFile(file);
      await api(`/orders/${id}/payment-proof`, { method: 'POST', body: JSON.stringify({ proof_url: uploaded.url }) });
      load();
    } catch (uploadError) {
      setError(uploadError.message);
    }
  }

  if (!order) return <div className="market-page market-loading">{error || 'Loading order…'}</div>;

  const events = order.status_events || [];
  const status = String(order.status || 'pending').replaceAll('_', ' ');

  return (
    <div className="market-page order-detail-page">
      <div className="order-detail-heading">
        <div>
          <span className="market-kicker">ORDER TRACKING</span>
          <h1>{order.order_number || `Order ${String(order.id).slice(0, 8)}`}</h1>
          <p>BUYSELL keeps payment, collection and delivery status together.</p>
        </div>
        <span className={`order-status-pill status-${String(order.status || 'pending').toLowerCase()}`}>{status}</span>
      </div>

      <section className="order-trust-row">
        <article><ShieldCheck size={18} /><div><strong>Buyer Protection</strong><span>Eligible order protection remains active.</span></div></article>
        <article><Truck size={18} /><div><strong>Managed Delivery</strong><span>Collection and tracking are controlled by BUYSELL.</span></div></article>
        <article><BadgeCheck size={18} /><div><strong>Payment status</strong><span>{order.payment_status || 'Awaiting confirmation'}</span></div></article>
      </section>

      <div className="order-detail-layout">
        <section className="order-detail-card">
          <div className="order-section-title"><h2>Items</h2><span>{order.order_items?.length || 0} item{order.order_items?.length === 1 ? '' : 's'}</span></div>
          <div className="order-item-list">
            {order.order_items?.map(item => (
              <article key={item.id}>
                <span className="order-item-placeholder">BS</span>
                <div><strong>{item.name}</strong><small>Quantity {item.quantity}</small></div>
                <b>{money(Number(item.unit_price || 0) * item.quantity)}</b>
              </article>
            ))}
          </div>

          {order.payment_method === 'bank_transfer' && (
            <div className="bank-transfer-proof">
              <FileUp size={20} />
              <div>
                <strong>Bank transfer proof</strong>
                <p>{order.proof_url || order.payment_proof_url ? 'Payment proof uploaded and awaiting review.' : 'Upload your transfer receipt so BUYSELL can review the order.'}</p>
                {!(order.proof_url || order.payment_proof_url) && <input type="file" accept="image/*,application/pdf" onChange={proof} />}
              </div>
            </div>
          )}
          {error && <p className="error">{error}</p>}
        </section>

        <aside className="order-delivery-card">
          <div className="order-section-title"><h2>Delivery</h2></div>
          <div className="order-address"><MapPin size={18} /><div><strong>Delivery address</strong><span>{order.delivery_address || 'No delivery address available'}</span></div></div>
          <div className="order-timeline">
            {(events.length ? events : [{ id: 'current', status: order.status, note: 'Current order status' }]).map((event, index) => (
              <div className={index === 0 ? 'order-timeline-step active' : 'order-timeline-step'} key={event.id || `${event.status}-${index}`}>
                <span />
                <div><strong>{String(event.status || 'pending').replaceAll('_', ' ')}</strong><p>{event.note || 'Status updated by BUYSELL.'}</p>{event.created_at && <small>{new Date(event.created_at).toLocaleString('en-NG')}</small>}</div>
              </div>
            ))}
          </div>
          <Link className="primary-cta order-track-button" to={`/orders/${id}/tracking`}>View tracking <Truck size={16} /></Link>
        </aside>
      </div>
    </div>
  );
}
