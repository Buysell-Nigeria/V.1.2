import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, MapPin, Package, RefreshCw, Truck } from 'lucide-react';
import { api } from '../../api/client.js';
import { formatNaira } from '../../utils/pricing.js';

const statusList=['assigned','picked_up','in_transit','delivered','failed'];
const label=status=>String(status||'assigned').replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase());
function useDeliveries(){
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const reload=async()=>{setError('');setLoading(true);try{const list=await api('/deliveries');setRows(Array.isArray(list)?list:[])}catch(e){setError(e.message||'Deliveries are unavailable')}finally{setLoading(false)}};
  useEffect(()=>{reload()},[]);
  return {rows,loading,error,reload,setRows,setError};
}
export function RiderDeliveriesPage(){
  const {rows,loading,error,reload}=useDeliveries();
  const [filter,setFilter]=useState('all');
  const filtered=useMemo(()=>rows.filter(r=>filter==='all'||r.status===filter),[rows,filter]);
  return <div className="bs2-rider-page">
    <div className="workspace-heading-row"><div><span className="market-kicker">YOUR DELIVERY WORKSPACE</span><h1>Deliveries</h1><p>Track assigned pickups, update progress and manage completed jobs.</p></div><button onClick={reload} className="button secondary" disabled={loading}><RefreshCw size={16}/> Refresh</button></div>
    <div className="bs2-workspace-filter" role="group" aria-label="Filter deliveries">{[['all','All'],['assigned','Assigned'],['picked_up','Picked up'],['in_transit','In transit'],['delivered','Delivered']].map(([key,name])=><button key={key} className={key===filter?'active':''} aria-pressed={key===filter} onClick={()=>setFilter(key)}>{name}</button>)}</div>
    {error&&<div className="bs2-dashboard-error" role="alert"><p>{error}</p><button onClick={reload}>Try again</button></div>}
    {loading&&<div className="market-loading" aria-busy="true">Loading deliveries…</div>}
    {!loading&&!error&&<div className="bs2-delivery-list">{filtered.length?filtered.map(d=><article className="bs2-delivery-card" key={d.id}>
      <span className="bs2-delivery-card-icon"><Truck size={24}/></span>
      <div><span className={`order-status-pill status-${d.status||'assigned'}`}>{label(d.status)}</span><h3>{d.dropoff_address||'Delivery destination'}</h3><p>{d.pickup_address? `From ${d.pickup_address}`: `Order #${String(d.order_id||d.id).slice(0,8).toUpperCase()}`}</p><small>{d.fee!=null?`Delivery fee: ${formatNaira(d.fee)}`:''}</small></div>
      <div className="bs2-delivery-actions"><Link to={`/rider/deliveries/${d.id}`}>View job <ArrowRight size={16}/></Link></div>
    </article>):<div className="bs2-details-empty"><Package size={30}/><h2>{filter==='all'?'No deliveries assigned yet':'No matching deliveries'}</h2><p>{filter==='all'?'New jobs will appear here when assigned to your account.':'Switch filters to see other jobs.'}</p>{filter!=='all'&&<button className="button secondary" onClick={()=>setFilter('all')}>View all</button>}</div>}</div>}
  </div>;
}
export function RiderDeliveryDetailPage(){
  const {deliveryId}=useParams();
  const {rows,loading,error,reload,setRows,setError}=useDeliveries();
  const d=rows.find(x=>String(x.id)===String(deliveryId));
  const [nextStatus,setNextStatus]=useState('');
  const [note,setNote]=useState('');
  const [saving,setSaving]=useState(false);
  const [success,setSuccess]=useState('');
  const current=nextStatus||d?.status||'assigned';
  const save=async e=>{
    e.preventDefault();
    if(!d)return;
    if(current==='delivered' && d.status!=='delivered' && !window.confirm('Mark this delivery completed?'))return;
    setSaving(true);setError('');setSuccess('');
    try{const updated=await api(`/deliveries/${d.id}`,{method:'PATCH',body:JSON.stringify({status:current,notes:note||null})});setRows(items=>items.map(item=>item.id===d.id?updated:item));setNextStatus('');setNote('');setSuccess('Delivery status updated.')}
    catch(err){setError(err.message||'Could not update this delivery')}
    finally{setSaving(false)}
  };
  return <div className="bs2-rider-page">
    <div className="bs2-breadcrumb"><Link to="/rider/deliveries"><ArrowLeft size={15}/> All deliveries</Link><span>/</span><span>Delivery details</span></div>
    <div className="workspace-heading-row"><div><span className="market-kicker">DELIVERY DETAILS</span><h1>Manage delivery</h1><p>Review your job and keep progress updated.</p></div><button onClick={reload} className="button secondary" disabled={loading}><RefreshCw size={16}/> Refresh</button></div>
    {error&&<div className="bs2-dashboard-error" role="alert"><p>{error}</p><button onClick={reload}>Retry</button></div>}
    {loading&&<div className="market-loading">Loading delivery…</div>}
    {!loading&&!d&&!error&&<div className="bs2-details-empty">This delivery is not assigned to your account or could not be found. <Link to="/rider/deliveries">View deliveries</Link></div>}
    {d&&<div className="bs2-logistics-detail">
      <section className="bs2-detail-panel"><h2>Pickup & destination</h2><div className="bs2-detail-line"><small>Order</small><strong>#{String(d.order_id||'').slice(0,8).toUpperCase()}</strong></div><div className="bs2-detail-line"><small>Pickup address</small><strong>{d.pickup_address||'Not provided'}</strong></div><div className="bs2-detail-line"><small>Delivery address</small><strong>{d.dropoff_address||'Not provided'}</strong></div><div className="bs2-detail-line"><small>Delivery fee</small><strong>{formatNaira(d.fee)}</strong></div><div className="bs2-detail-line"><small>Current status</small><strong>{label(d.status)}</strong></div>{d.notes&&<div className="bs2-detail-line"><small>Notes</small><strong>{d.notes}</strong></div>}</section>
      <form className="bs2-detail-panel" onSubmit={save}><h2>Update progress</h2><label htmlFor="bs2-delivery-status">Delivery status</label><select className="bs2-delivery-status-select" id="bs2-delivery-status" value={current} onChange={e=>setNextStatus(e.target.value)}>{statusList.map(s=><option key={s} value={s}>{label(s)}</option>)}</select><label htmlFor="bs2-delivery-note" style={{display:'block',marginTop:17}}>Delivery note (optional)</label><textarea id="bs2-delivery-note" rows="4" placeholder="Anything the operations team should know?" value={note} onChange={e=>setNote(e.target.value)} style={{width:'100%',marginTop:8,padding:12,border:'1px solid #d9e5db',borderRadius:11}}/><button type="submit" className="bs2-status-update" disabled={saving||current===d.status&&!note.trim()}>{saving?'Saving changes…':'Save status update'}</button>{success&&<p role="status" className="success"><CheckCircle2 size={16}/>{success}</p>}</form>
    </div>}
  </div>;
}
