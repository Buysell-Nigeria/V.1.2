import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Eye, ImagePlus, MapPin, Save, Store, UploadCloud } from 'lucide-react';
import { api, uploadFile } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';

const fields=[['store_name','Store name','What customers see on your store'],['store_description','Store description','Tell customers what you sell'],['store_address','Store location','City, area or pickup address'],['whatsapp','Business WhatsApp','Optional contact number'],['logo_url','Store logo image URL','A square image works best']];
export function SellerStorefrontPage(){
  const {user}=useAuth();
  const [data,setData]=useState({store_name:'',store_description:'',store_address:'',whatsapp:'',logo_url:''});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [error,setError]=useState('');
  const [saved,setSaved]=useState('');
  useEffect(()=>{let live=true;api('/profile/me').then(p=>{if(live)setData(d=>({...d,...Object.fromEntries(fields.map(([k])=>[k,p[k]||'']))}))}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
  const patch=(key,value)=>setData(d=>({...d,[key]:value}));
  const submit=async e=>{e.preventDefault();setSaving(true);setError('');setSaved('');try{await api('/profile/me',{method:'PATCH',body:JSON.stringify(data)});setSaved('Your storefront has been updated.')}catch(e){setError(e.message)}finally{setSaving(false)}};
  const upload=async e=>{const file=e.target.files?.[0];if(!file)return;setUploading(true);setError('');try{const uploaded=await uploadFile(file);patch('logo_url',uploaded.url||uploaded.public_url||uploaded.file_url||'');}catch(err){setError(err.message)}finally{setUploading(false)}};
  if(loading)return <div className="market-loading">Loading your storefront…</div>;
  return <div className="bs2-store-editor">
    <div className="page-title-row"><div><span className="market-kicker">YOUR BUSINESS IDENTITY</span><h1>Storefront settings</h1><p className="muted">Make your store recognizable and easy to trust. These details appear on your public store page.</p></div><Link to={`/store/${user?.id||''}`} className="button secondary" target="_blank" rel="noopener noreferrer"><Eye size={17}/> Preview store</Link></div>
    <div className="bs2-store-editor-layout">
      <form onSubmit={submit} className="seller-editor-card bs2-store-editor-form"><h2>Business details</h2><p className="muted">Keep your name and location accurate so customers know who they're buying from.</p>
        {fields.map(([key,label,hint])=><label key={key}><span>{label}</span>{key==='store_description'?<textarea rows="5" value={data[key]} onChange={e=>patch(key,e.target.value)} placeholder={hint}/>:<input value={data[key]} onChange={e=>patch(key,e.target.value)} placeholder={hint} required={key==='store_name'}/>}</label>)}
        <label className="bs2-logo-upload"><span><UploadCloud size={18}/> {uploading?'Uploading image…':'Upload a logo'}</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={upload}/></label>
        {error&&<p className="error" role="alert">{error}</p>}{saved&&<p className="success" role="status"><Check size={16}/>{saved}</p>}
        <button type="submit" className="primary-cta seller-save-button" disabled={saving}>{saving?'Saving…':'Save storefront'}<Save size={17}/></button>
      </form>
      <aside className="bs2-store-editor-preview"><div className="bs2-store-cover"/><div className="bs2-store-preview-avatar">{data.logo_url?<img src={data.logo_url} alt="Store logo preview"/>:<Store size={34}/>}</div><span className="market-kicker">LIVE PREVIEW</span><h2>{data.store_name||'Your store name'}</h2><p>{data.store_description||'A description of your products and services appears here.'}</p><small><MapPin size={15}/>{data.store_address||'Your store location'}</small><div className="bs2-preview-link"><Link to={`/store/${user?.id||''}`} target="_blank">Open public storefront <ArrowRight size={16}/></Link></div></aside>
    </div>
  </div>
}
