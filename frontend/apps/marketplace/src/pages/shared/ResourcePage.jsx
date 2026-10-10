import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Database, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client.js';
import { formatNaira } from '../../utils/pricing.js';

const primary = row => row.name||row.title||row.store_name||row.seller_name||row.order_number||row.email||row.code||row.status||row.action||row.id||'Record';
const moneyLabel = (row,key) => row[key]!=null ? formatNaira(row[key]) : null;
export function ResourcePage({title,description,endpoint,createHref}){
  const [rows,setRows]=useState([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(Boolean(endpoint));
  const [search,setSearch]=useState('');
  const load=async()=>{
    if(!endpoint)return;
    setLoading(true);setError('');
    try{const data=await api(endpoint);setRows(Array.isArray(data)?data:Array.isArray(data?.items)?data.items:[])}
    catch(err){setError(err.message||'Could not load records')}
    finally{setLoading(false)}
  };
  useEffect(()=>{setSearch('');setRows([]);load()},[endpoint]);
  const filtered=useMemo(()=>rows.filter(row=>Object.values(row).filter(v=>typeof v==='string'||typeof v==='number').join(' ').toLowerCase().includes(search.toLowerCase())),[rows,search]);
  return <div className="bs2-resource-page">
    <div className="workspace-heading-row"><div><span className="market-kicker">BUYSELL WORKSPACE</span><h1>{title}</h1><p className="bs2-page-subtitle">{description}</p></div>{createHref?<Link className="primary-cta" to={createHref}>Create new <ArrowRight size={16}/></Link>:endpoint?<button type="button" className="button secondary" onClick={load} disabled={loading}><RefreshCw size={16}/> Refresh</button>:null}</div>
    {endpoint&&rows.length>0&&<div className="bs2-resource-toolbar"><label><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records…" aria-label="Search records"/></label><small>{filtered.length} {filtered.length===1?'record':'records'}</small></div>}
    {error&&<div className="bs2-dashboard-error" role="alert"><p>{error}</p><button onClick={load}><RefreshCw size={16}/> Retry</button></div>}
    {loading&&<div className="bs2-skeleton" style={{height:160,borderRadius:16,marginTop:20}} aria-label="Loading records" aria-busy="true"/>}
    {!loading&&!error&&filtered.length>0&&<div className="bs2-resource-list">{filtered.map((r,i)=><article className="bs2-resource-item" key={r.id||i}><span className="bs2-resource-symbol"><Database size={20}/></span><div><strong>{primary(r)}</strong><small>{r.description||r.seller_email||r.supplier_key||r.event_type||r.order_id||r.product_name||''}</small></div><div className="bs2-resource-meta">{r.status&&<span className={`order-status-pill status-${String(r.status).toLowerCase()}`}>{r.status.replaceAll('_',' ')}</span>}{r.role&&!r.status&&<span>{r.role}</span>}{r.total_amount!=null&&<b>{moneyLabel(r,'total_amount')}</b>}{r.revenue!=null&&<b>{moneyLabel(r,'revenue')}</b>}{r.created_at&&<small>{new Date(r.created_at).toLocaleDateString('en-NG')}</small>}</div></article>)}</div>}
    {!loading&&!error&&!filtered.length&&<div className="bs2-resource-empty"><ShieldCheck size={28}/><h2>{search?'No matching records':endpoint?'Nothing here yet':'This workspace is not available yet'}</h2><p>{search?'Try searching by another name or ID.':endpoint?'When your account has records, they will appear here.':'There is no connected action on this screen.'}</p>{search&&<button onClick={()=>setSearch('')}>Clear search</button>}</div>}
  </div>
}
