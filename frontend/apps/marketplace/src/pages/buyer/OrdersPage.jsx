import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PackageCheck, RefreshCw, ShoppingBag, Truck } from 'lucide-react';
import { api } from '../../api/client.js';

const money = value => `₦${(Number(value || 0) / 100).toLocaleString('en-NG')}`;
const filters = [
  ['all','All orders'],
  ['processing','Processing'],
  ['delivery','On the way'],
  ['delivered','Delivered'],
];
const matchesFilter = (order, filter) => {
  const status = String(order.status || 'pending').toLowerCase();
  if (filter === 'all') return true;
  if (filter === 'processing') return ['pending','confirmed','processing'].includes(status);
  if (filter === 'delivery') return ['shipped','picked_up','in_transit','assigned'].includes(status);
  if (filter === 'delivered') return status === 'delivered';
  return false;
};
export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const load = async () => {
    setLoading(true);setError('');
    try { const data=await api('/orders?as=buyer');setOrders(Array.isArray(data)?data:data?.items||[]); }
    catch(err){setError(err.message||'Could not load your orders');}
    finally{setLoading(false);}
  };
  useEffect(()=>{load()},[]);
  const displayed = useMemo(()=>orders.filter(order=>matchesFilter(order,filter)),[orders,filter]);
  return <div className="market-page buyer-orders-page">
    <div className="commerce-page-heading">
      <span className="market-kicker">BUYER ACCOUNT</span>
      <h1>Your orders</h1>
      <p>Everything you buy on BUYSELL, from payment through delivery.</p>
    </div>
    <div className="buyer-order-tabs" role="group" aria-label="Filter orders">{filters.map(([key,label])=><button type="button" key={key} className={key===filter?'active':''} aria-pressed={key===filter} onClick={()=>setFilter(key)}>{label}<span>{key==='all'?orders.length:orders.filter(order=>matchesFilter(order,key)).length}</span></button>)}</div>
    {error&&<div className="bs2-empty" role="alert"><h2>Couldn't load your orders</h2><p>{error}</p><button onClick={load}><RefreshCw size={16}/> Try again</button></div>}
    {!error && loading && <div className="market-loading" aria-busy="true">Loading your orders…</div>}
    {!error && !loading && displayed.length>0 && <section className="buyer-order-list">{displayed.map(order=>{
      const status=String(order.status||'pending').replaceAll('_',' ');
      const Icon=status.includes('deliver')?PackageCheck:status.includes('ship')||status.includes('transit')?Truck:ShoppingBag;
      return <Link className="buyer-order-card" to={`/orders/${order.id}`} key={order.id}>
        <span className="buyer-order-icon"><Icon size={21}/></span>
        <div className="buyer-order-main"><strong>{order.order_number||`Order #${String(order.id).slice(0,8).toUpperCase()}`}</strong><span>{order.created_at?new Date(order.created_at).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}):'Date unavailable'}</span></div>
        <span className={`order-status-pill status-${String(order.status||'pending').toLowerCase()}`}>{status}</span>
        <strong className="buyer-order-total">{money(order.total_amount)}</strong><ArrowRight size={18}/>
      </Link>;
    })}</section>}
    {!error && !loading && !displayed.length && <div className="buyer-empty-state"><span><ShoppingBag size={27}/></span><h2>{filter==='all'?'No orders yet':'No orders in this category'}</h2><p>{filter==='all'?'Your purchases will appear here after checkout.':'Try another status to find your order.'}</p>{filter==='all'?<Link className="primary-cta" to="/products">Explore products <ArrowRight size={16}/></Link>:<button className="primary-cta" onClick={()=>setFilter('all')}>Show all orders</button>}</div>}
  </div>;
}
