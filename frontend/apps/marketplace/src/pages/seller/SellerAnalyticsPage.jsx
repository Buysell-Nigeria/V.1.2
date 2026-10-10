import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Boxes, CalendarDays, RefreshCw, ShoppingBag, TrendingUp } from 'lucide-react';
import { api } from '../../api/client.js';
import { formatNaira } from '../../utils/pricing.js';
const number = value => Number(value||0).toLocaleString('en-NG');
const headings = {
  delivered_revenue: 'Delivered revenue',
  total_revenue: 'Total revenue',
  gross_revenue: 'Gross revenue',
  revenue: 'Revenue',
  total_orders: 'Orders',
  orders: 'Orders',
  platform_fees: 'Platform fees',
  net_revenue: 'Net revenue',
  net_earnings: 'Net earnings',
  paid_orders: 'Paid orders',
  total_products: 'Products',
};
const moneyLike = key => /(revenue|amount|gross|gmv|earnings|fees|payout|balance)/.test(key);
export function SellerAnalyticsPage(){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const load=async()=>{setLoading(true);setError('');try{setData(await api('/analytics/seller'))}catch(e){setError(e.message||'Analytics are unavailable')}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const series=useMemo(()=>Array.isArray(data?.series)?data.series:[],[data]);
  const top=useMemo(()=>Array.isArray(data?.top_products)?data.top_products:[],[data]);
  const max=useMemo(()=>Math.max(1,...series.map(s=>Number(s.revenue||0))),[series]);
  const totals=useMemo(()=>Object.entries(data?.totals||{}).filter(([key,val])=>headings[key]&&val!=null),[data]);
  const last7=series.slice(-7);
  return <div className="bs2-analytics-page">
    <div className="workspace-heading-row"><div><span className="market-kicker">STORE PERFORMANCE</span><h1>Analytics</h1><p>Understand orders, sales and best-performing products from your store.</p></div><button className="button secondary" onClick={load} disabled={loading}><RefreshCw size={16}/> Refresh</button></div>
    {error&&<div className="bs2-dashboard-error" role="alert"><p>{error}</p><button onClick={load}><RefreshCw size={16}/> Try again</button></div>}
    {loading&&<div className="bs2-analytics-skeleton"><div className="bs2-skeleton"/><div className="bs2-skeleton"/><div className="bs2-skeleton"/></div>}
    {!loading&&!error&&<><div className="bs2-analytics-stats">
      {(totals.length?totals.slice(0,4):[['revenue',series.reduce((s,x)=>s+Number(x.revenue||0),0)],['orders',series.reduce((s,x)=>s+Number(x.orders||0),0)],['total_products',top.length]]).map(([key,value])=><article key={key}><span>{key==='orders'?<ShoppingBag size={19}/>:key==='total_products'?<Boxes size={19}/>:<TrendingUp size={19}/>}</span><small>{headings[key]||key}</small><strong>{moneyLike(key)?formatNaira(value):number(value)}</strong></article>)}</div>
      <div className="bs2-analytics-columns">
        <section className="bs2-analytics-panel"><div className="bs2-chart-heading"><span><CalendarDays size={19}/> Daily revenue</span><small>Last 30 days</small></div>{series.length?<><div className="bs2-bar-chart" aria-label="Daily revenue chart">{series.map((r,i)=><div className="bs2-bar-wrap" key={r.day||i} title={`${new Date(r.day).toLocaleDateString('en-NG')}: ${formatNaira(r.revenue)} • ${r.orders} orders`}><div className="bs2-bar" style={{height:`${Math.max(2,Number(r.revenue||0)/max*100)}%`}}/></div>)}</div><p className="bs2-chart-foot">Hover over a bar to see each day's revenue and order count.</p></>:<div className="bs2-analytics-empty"><BarChart3 size={29}/><strong>No sales data yet</strong><span>Your revenue chart will grow as orders come in.</span></div>}</section>
        <section className="bs2-analytics-panel"><div className="bs2-chart-heading"><span><TrendingUp size={19}/> Best-selling products</span><small>By sales value</small></div>{top.length?<div className="bs2-ranking">{top.map((p,i)=><Link to={`/seller/products/${p.product_id}/edit`} key={p.product_id||i}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{p.name||'Product'}</strong><small>{number(p.quantity)} sold</small></div><b>{formatNaira(p.revenue)}</b><ArrowRight size={15}/></Link>)}</div>:<div className="bs2-analytics-empty"><Boxes size={29}/><strong>No sales yet</strong><span>Products with orders will show here.</span><Link to="/seller/products">Manage products <ArrowRight size={15}/></Link></div>}</section>
      </div>
    </>}
  </div>;
}
