import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, MapPin, Search, Share2, ShoppingBag, Store, Truck } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useCart } from '../../state/CartContext.jsx';
import { ProductCard } from './ShopPage.jsx';

export function StorePage() {
  const { sellerId }=useParams();
  const navigate=useNavigate();
  const cart=useCart();
  const { user }=useAuth();
  const [profile,setProfile]=useState(null);
  const [products,setProducts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [q,setQ]=useState('');
  const [savedIds,setSavedIds]=useState([]);
  const [status,setStatus]=useState('');
  useEffect(()=>{
    let current=true;
    setLoading(true);setError('');setProfile(null);setProducts([]);
    Promise.all([api(`/profile/${sellerId}`),api(`/products?seller=${encodeURIComponent(sellerId)}&limit=100`)])
      .then(([store,list])=>{if(current){setProfile(store);setProducts(Array.isArray(list?.items)?list.items:[]);}})
      .catch(err=>{if(current)setError(err.message||'Unable to open this storefront');})
      .finally(()=>{if(current)setLoading(false)});
    return()=>{current=false};
  },[sellerId]);
  useEffect(()=>{if(!user)return;let current=true;api('/collections/wishlist').then(list=>{if(current)setSavedIds((Array.isArray(list)?list:[]).map(x=>x.id))}).catch(()=>{});return()=>{current=false}},[user?.id]);
  const results=useMemo(()=>products.filter(p=>`${p.name||''} ${p.description||''}`.toLowerCase().includes(q.toLowerCase())),[products,q]);
  const save=async product=>{
    if(!user){navigate('/auth',{state:{from:window.location.pathname}});return}
    const exists=savedIds.includes(product.id);
    try{await api(`/collections/wishlist/${product.id}`,{method:exists?'DELETE':'POST'});setSavedIds(ids=>exists?ids.filter(id=>id!==product.id):[...ids,product.id]);setStatus(exists?'Removed from wishlist':'Saved to wishlist')}catch(err){setStatus(err.message)}
  };
  const share=async()=>{try{if(navigator.share)await navigator.share({title:profile?.store_name||'BUYSELL store',url:window.location.href});else{await navigator.clipboard.writeText(window.location.href);setStatus('Store link copied')}}catch{}};
  if(loading)return <div className="market-page bs2-store-page"><div className="bs2-skeleton" style={{height:210,borderRadius:20}}/><div className="bs2-skeleton" style={{height:25,width:200,margin:'24px 0'}}/><div className="bs2-product-grid">{Array.from({length:6},(_,i)=><div className="bs2-skeleton" key={i} style={{height:270}}/>)}</div></div>;
  if(error)return <div className="market-page"><div className="bs2-empty"><Store size={31}/><h1>Store unavailable</h1><p>{error}</p><Link className="button" to="/shop">Browse other stores</Link></div></div>;
  const name=profile?.store_name||profile?.name||'BUYSELL Store';
  return <div className="market-page bs2-store-page">
    <div className="bs2-breadcrumb"><Link to="/shop"><ArrowLeft size={14}/>Marketplace</Link><span>/</span><span>{name}</span></div>
    <div className="bs2-store-cover"/>
    <div className="bs2-store-header"><div className="bs2-store-profile"><div className="bs2-store-avatar">{profile?.logo_url||profile?.avatar_url?<img src={profile.logo_url||profile.avatar_url} alt={name}/>:name.slice(0,1).toUpperCase()}</div><div><h1>{name}</h1><p>{profile?.seller_verified?'Verified BUYSELL seller':'BUYSELL marketplace store'}</p></div></div><button type="button" className="bs2-filter-btn" onClick={share}><Share2 size={16}/> Share store</button></div>
    <p className="bs2-store-intro">{profile?.store_description||profile?.bio||`Explore products from ${name} on BUYSELL.`}</p>
    <div className="bs2-store-badges"><span><ShoppingBag size={16}/>{products.length} products</span>{profile?.seller_verified&&<span><BadgeCheck size={16}/>Seller verified</span>}{profile?.store_address&&<span><MapPin size={16}/>{profile.store_address}</span>}<span><Truck size={16}/>BUYSELL-managed delivery</span></div>
    <div className="bs2-section-heading bs2-results-heading" style={{marginTop:30}}><div><span className="market-kicker">STORE CATALOGUE</span><h2>Products from this store</h2></div><label className="bs2-inline-search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search this store" aria-label="Search this store"/></label></div>
    {results.length?<div className="bs2-product-grid">{results.map(p=><ProductCard key={p.id} product={p} onAdd={cart.add} onSave={save} saved={savedIds.includes(p.id)}/>)}</div>:<div className="bs2-empty"><Search size={29}/><h3>No products found</h3><p>{q?'Try another product name.':'There are no active listings from this store yet.'}</p>{q&&<button onClick={()=>setQ('')}>Clear search</button>}</div>}
    {status&&<p className="success" role="status">{status}</p>}
  </div>;
}
