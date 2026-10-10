import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, RefreshCw, Search, ShieldAlert, Users } from 'lucide-react';
import { api } from '../../api/client.js';
import { formatNaira } from '../../utils/pricing.js';

const configs={
  users:{title:'Users',endpoint:'/admin/users',label:r=>r.name||r.email,actions:[['active','Activate'],['suspended','Suspend']]},
  sellers:{title:'Sellers',endpoint:'/admin/sellers',label:r=>r.store_name||r.name||r.email,actions:[['active','Activate'],['suspended','Suspend']]},
  orders:{title:'Orders',endpoint:'/admin/orders',label:r=>r.order_number||`Order #${String(r.id).slice(0,8)}`,actions:[['confirmed','Confirm'],['processing','Processing'],['shipped','Shipped'],['cancelled','Cancel']]},
  disputes:{title:'Disputes',endpoint:'/admin/disputes',label:r=>`${r.dispute_type||'Dispute'} · ${r.order_id?.slice(0,8)||''}`,actions:[['resolved','Resolve'],['refunded','Refund'],['rejected','Reject']]},
  withdrawals:{title:'Withdrawals',endpoint:'/admin/withdrawals',label:r=>r.name||r.store_name||r.seller_id,actions:[['paid','Mark paid'],['rejected','Reject']]},
  kyc:{title:'Identity checks',endpoint:'/admin/kyc',label:r=>r.name||r.full_name||r.user_id,actions:[['approved','Approve'],['rejected','Reject']]},
  ads:{title:'Advertisements',endpoint:'/admin/ads',label:r=>r.title||`Ad #${String(r.id).slice(0,8)}`,actions:[['active','Approve'],['rejected','Reject'],['expired','Expire']]},
  receipts:{title:'Commission receipts',endpoint:'/admin/receipts',label:r=>r.transaction_ref||r.seller_id,actions:[['approved','Approve'],['rejected','Reject']]},
};
const priorities=['pending','open','reviewing','unverified','pending_payment'];
export function AdminOperationsPage({type}){
  const cfg=configs[type];
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('all');
  const load=async()=>{
    setLoading(true);setError('');
    try{const data=await api(cfg.endpoint);setRows(Array.isArray(data)?data: data?.items||[]);}
    catch(err){setError(err.message||'Records could not be loaded')}
    finally{setLoading(false)}
  };
  useEffect(()=>{setQuery('');setStatus('all');setNotice('');load()},[type]);
  const options=useMemo(()=>['all',...new Set(rows.map(r=>String(r.status||r.kyc_status||'unknown')))], [rows]);
  const displayed=useMemo(()=>rows.filter(row=>{
    const haystack=[cfg.label(row),row.email,row.id,row.order_id,row.code,row.status,...(row.roles||[])].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase())&&(status==='all'||String(row.status||row.kyc_status||'unknown')===status);
  }),[rows,query,status,type]);
  const act=async(row,next)=>{
    const highRisk=['suspended','cancelled','refunded','paid','rejected'].includes(next);
    if(highRisk&&!window.confirm(`Change this ${type.slice(0,-1)} to "${next}"? This updates the live BUYSELL record.`))return;
    let reason='';
    if(['rejected','refunded'].includes(next))reason=window.prompt('Add a reason or resolution note (optional):','')||'';
    const body={status:next};
    if(['disputes','withdrawals','kyc','receipts'].includes(type)){body.reason=reason;body.resolution_note=reason;}
    const path=(type==='users'||type==='sellers')?`/admin/users/${row.id}/status`:`/admin/${type}/${row.id}`;
    setBusy(`${row.id}:${next}`);setError('');setNotice('');
    try{
      await api(path,{method:'PATCH',body:JSON.stringify(body)});
      setRows(old=>old.map(item=>item.id===row.id?{...item,status:next,kyc_status:type==='kyc'?next:item.kyc_status}:item));
      setNotice(`${cfg.title}: status changed to ${next}.`);
    }catch(err){setError(err.message||'Unable to update this record')}
    finally{setBusy(null)}
  };
  return <div className="bs2-admin-records">
    <div className="workspace-heading-row"><div><span className="market-kicker">BUYSELL OPERATIONS</span><h1>{cfg.title}</h1><p>Review records and approve changes using the authenticated admin endpoints.</p></div><button className="button secondary" onClick={load} disabled={loading}><RefreshCw size={16}/> Refresh</button></div>
    <div className="bs2-admin-filter"><label className="bs2-admin-search"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search ${cfg.title.toLowerCase()}…`} aria-label={`Search ${cfg.title}`}/></label><label className="bs2-admin-status-select"><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value)}>{options.map(value=><option key={value} value={value}>{value==='all'?'All statuses':value.replaceAll('_',' ')}</option>)}</select><ChevronDown size={15}/></label><small>{displayed.length} of {rows.length} records</small></div>
    {error&&<div className="bs2-dashboard-error" role="alert"><p>{error}</p><button onClick={load}><RefreshCw size={16}/> Retry</button></div>}
    {notice&&<p className="bs2-admin-success" role="status"><CheckCircle2 size={16}/>{notice}</p>}
    {loading&&<div className="market-loading" aria-busy="true">Loading {cfg.title.toLowerCase()}…</div>}
    {!loading&&!error&&<div className="bs2-admin-table"><div className="bs2-admin-table-heading"><span>Record</span><span>Status</span><span>Details</span><span>Actions</span></div>{displayed.length?displayed.map(row=><article key={row.id} className="bs2-admin-row"><div className="bs2-admin-primary"><strong>{cfg.label(row)}</strong><small>{row.email||row.id}</small></div><span className={`order-status-pill status-${String(row.status||row.kyc_status||'pending').toLowerCase()}`}>{row.status||row.kyc_status||'Unknown'}</span><div className="bs2-admin-extra">{row.total_amount!=null&&<b>{formatNaira(row.total_amount)}</b>}{row.amount!=null&&<b>{formatNaira(row.amount)}</b>}{Array.isArray(row.roles)&&<span>{row.roles.join(', ')}</span>}{row.created_at&&<small>{new Date(row.created_at).toLocaleDateString('en-NG')}</small>}</div><div className="bs2-admin-actions">{cfg.actions.map(([next,label])=><button key={next} type="button" className={['suspended','cancelled','rejected','refunded'].includes(next)?'danger':''} onClick={()=>act(row,next)} disabled={busy!==null||row.status===next}>{busy===`${row.id}:${next}`?'Saving…':label}</button>)}</div></article>):<div className="bs2-admin-empty"><Users size={28}/><h2>No records found</h2><p>{query||status!=='all'?'Try changing your filters.':'There are no records to review in this section.'}</p></div>}</div>}
    {!loading&&rows.some(row=>priorities.includes(row.status))&&<p className="bs2-admin-footnote"><ShieldAlert size={15}/> Changes here affect live users and orders. Review the correct record before confirming.</p>}
  </div>
}
