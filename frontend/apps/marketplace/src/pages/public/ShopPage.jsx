import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Camera, Check, ChevronDown, ChevronRight, Heart, Headphones, Laptop, RotateCcw, Search, ShieldCheck, Shirt, ShoppingBag, ShoppingCart, SlidersHorizontal, Smartphone, Sofa, Sparkles, Truck, X } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useCart } from '../../state/CartContext.jsx';

const PAGE_SIZE = 48;
const categories = [
  { slug: 'phones', label: 'Phones', icon: Smartphone },
  { slug: 'electronics', label: 'Electronics', icon: Laptop },
  { slug: 'fashion', label: 'Fashion', icon: Shirt },
  { slug: 'home', label: 'Home & Living', icon: Sofa },
  { slug: 'beauty', label: 'Beauty', icon: Sparkles },
  { slug: 'cameras', label: 'Cameras', icon: Camera },
  { slug: 'audio', label: 'Audio', icon: Headphones },
];
const money = price => `₦${(Number(price || 0) / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
const imageFor = product => {
  const images = typeof product?.images === 'string' ? (()=>{try{return JSON.parse(product.images)}catch{return []}})() : product?.images;
  return product?.image_url || (Array.isArray(images) ? images[0] : '') || '';
};

function ProductCard({ product, onAdd, onSave, saved }) {
  const image = imageFor(product);
  const soldOut = Number(product.stock_quantity) === 0;
  const discount = Number(product.original_price || 0) > Number(product.price || 0)
    ? Math.round(100 * (1 - Number(product.price) / Number(product.original_price))) : 0;
  return <article className="bs2-product-card">
    <Link to={`/products/${product.id}`} className="bs2-product-image" aria-label={`View ${product.name}`}>
      {image ? <img src={image} alt={product.name} loading="lazy" decoding="async" /> : <div className="bs2-no-image"><ShoppingBag size={30}/><span>BUYSELL</span></div>}
      {discount>0 && <span className="bs2-deal-label">-{discount}%</span>}
      {soldOut && <span className="bs2-out-label">Out of stock</span>}
    </Link>
    <button type="button" aria-label={`Save ${product.name} to wishlist`} className={`bs2-save-product${saved ? ' active' : ''}`} onClick={()=>onSave(product)}><Heart size={18} fill={saved ? 'currentColor' : 'none'}/></button>
    <div className="bs2-product-copy">
      <Link to={`/products/${product.id}`}><h3>{product.name}</h3></Link>
      <p>{product.store_name || product.seller_name || 'BUYSELL store'}</p>
      <div className="bs2-price-line"><strong>{money(product.price)}</strong>{discount>0 && <del>{money(product.original_price)}</del>}</div>
      <button disabled={soldOut} type="button" className="bs2-add-cart" onClick={()=>onAdd(product)}><ShoppingCart size={16}/><span>{soldOut ? 'Unavailable' : 'Add to cart'}</span></button>
    </div>
  </article>;
}

function SkeletonGrid() {
  return <div className="bs2-product-grid" aria-label="Loading products" aria-busy="true">{Array.from({length:8},(_,i)=><div className="bs2-product-card bs2-skeleton-card" key={i}><div className="bs2-skeleton bs2-skeleton-image"/><div className="bs2-product-copy"><div className="bs2-skeleton bs2-skeleton-line"/><div className="bs2-skeleton bs2-skeleton-line short"/><div className="bs2-skeleton bs2-skeleton-price"/></div></div>)}</div>;
}

export function ShopPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cart = useCart();
  const q = params.get('q')?.trim() || '';
  const category = slug || params.get('category') || '';
  const browsing = Boolean(q || category) || window.location.pathname === '/products';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [condition, setCondition] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [savedIds, setSavedIds] = useState([]);
  const [toast, setToast] = useState('');

  const fetchPage = (offset = 0) => {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (q) query.set('q', q);
    if (category) query.set('category', category);
    return api(`/products?${query}`);
  };
  useEffect(() => {
    let current = true;
    setLoading(true); setError(''); setProducts([]); setHasMore(false); setFiltersOpen(false);
    fetchPage().then(data => { if(current){ const next = Array.isArray(data?.items) ? data.items : []; setProducts(next); setHasMore(next.length===PAGE_SIZE); } })
      .catch(err => { if(current) setError(err?.message || 'Products could not be loaded.'); })
      .finally(()=>{if(current)setLoading(false)});
    return ()=>{current=false};
  }, [q, category]);
  useEffect(()=>{ if(!user){setSavedIds([]);return;} let active=true; api('/collections/wishlist').then(rows=>{if(active)setSavedIds((Array.isArray(rows)?rows:[]).map(row=>row.id))}).catch(()=>{});return()=>{active=false}; },[user?.id]);

  const visible = useMemo(()=>{
    const matches = products.filter(p=>{
      if (inStock && Number(p.stock_quantity||0)<=0) return false;
      if (condition && String(p.condition||'').toLowerCase()!==condition) return false;
      if (minPrice && Number(p.price||0)<Number(minPrice)*100) return false;
      if (maxPrice && Number(p.price||0)>Number(maxPrice)*100) return false;
      return true;
    });
    if(sort==='low') matches.sort((a,b)=>Number(a.price||0)-Number(b.price||0));
    if(sort==='high') matches.sort((a,b)=>Number(b.price||0)-Number(a.price||0));
    if(sort==='popular') matches.sort((a,b)=>Number(b.review_count||0)-Number(a.review_count||0));
    return matches;
  },[products,inStock,condition,minPrice,maxPrice,sort]);
  const message = text => {setToast(text);window.clearTimeout(window.bs2ToastTimer);window.bs2ToastTimer=window.setTimeout(()=>setToast(''),4000)};
  const add = product => {cart.add(product);message(`${product.name} added to cart`);};
  const save = async product => {
    if(!user){navigate('/auth',{state:{from:window.location.pathname+window.location.search}});return;}
    const existing=savedIds.includes(product.id);
    try {
      await api(`/collections/wishlist/${product.id}`,{method:existing?'DELETE':'POST'});
      setSavedIds(ids=>existing?ids.filter(id=>id!==product.id):[...ids,product.id]);
      message(existing?'Removed from wishlist':'Saved to your wishlist');
    }catch(err){message(err.message || 'Could not update wishlist');}
  };
  const loadMore = async()=>{
    setLoadingMore(true);setError('');
    try{const data=await fetchPage(products.length);const next=Array.isArray(data?.items)?data.items:[];setProducts(prev=>[...prev,...next]);setHasMore(next.length===PAGE_SIZE);}
    catch(err){setError(err.message||'Could not load more products');}finally{setLoadingMore(false);}
  };
  const clearFilters=()=>{setInStock(false);setCondition('');setMinPrice('');setMaxPrice('');setSort('newest');};
  const inlineSearch=event=>{event.preventDefault();const query=new FormData(event.currentTarget).get('q')?.toString().trim()||'';setParams(query?{q:query}:{});};

  return <div className="market-page bs2-shop">
    {!browsing && <section className="bs2-hero">
      <div className="bs2-hero-copy">
        <span className="bs2-hero-eyebrow"><span/> THE MARKETPLACE FOR EVERYDAY NIGERIA</span>
        <h1>Find it. <em>Buy it.</em><br/>Love it.</h1>
        <p>From everyday essentials to something special. Explore products from Nigerian sellers, all in one place.</p>
        <div className="bs2-hero-actions"><Link className="bs2-hero-primary" to="/products">Explore products <ArrowRight size={18}/></Link><Link className="bs2-hero-secondary" to="/auth?mode=signup&role=seller">Start selling</Link></div>
        <div className="bs2-hero-meta"><ShieldCheck size={18}/><span>Buyer protection</span><span className="bs2-meta-dot"/> <Truck size={18}/><span>Managed delivery</span></div>
      </div>
      <div className="bs2-hero-gallery" aria-hidden="true">{products.slice(0,3).map((p,i)=>imageFor(p) && <div className={`bs2-hero-image bs2-hero-image-${i+1}`} key={p.id}><img src={imageFor(p)} alt=""/></div>)}<div className="bs2-hero-graphic"><ShoppingBag size={44}/><span>Discover more on BUYSELL</span></div></div>
    </section>}
    {!browsing && <section className="bs2-category-section" aria-label="Shop by category">
      <div className="bs2-section-heading"><h2>Browse categories</h2><Link to="/products">All products <ArrowRight size={16}/></Link></div>
      <div className="bs2-category-rail"><Link to="/products" className="bs2-category-link"><span><LayoutGridIcon/></span><strong>All</strong></Link>{categories.map(({slug:item,label,icon:Icon})=><Link to={`/category/${item}`} className="bs2-category-link" key={item}><span><Icon size={22}/></span><strong>{label}</strong></Link>)}</div>
    </section>}
    {browsing && <div className="bs2-listing-heading">
      <nav aria-label="Breadcrumb" className="bs2-breadcrumb"><Link to="/shop">Home</Link><ChevronRight size={14}/><span>{category||'Products'}</span></nav>
      <div className="bs2-listing-title"><div><span className="market-kicker">EXPLORE BUYSELL</span><h1>{q ? `Results for “${q}”` : category ? categories.find(c=>c.slug===category)?.label||category.replaceAll('-',' ') : 'All products'}</h1><p>{loading?'Finding products…':`${products.length}${hasMore?'+':''} products available`}</p></div><form className="bs2-inline-search" role="search" onSubmit={inlineSearch}><Search size={18}/><input name="q" defaultValue={q} placeholder="Search products"/><button type="submit" aria-label="Search"><ArrowRight size={18}/></button></form></div>
    </div>}
    <section className="bs2-products-section" id="browse-products">
      <div className="bs2-section-heading bs2-results-heading"><div><span className="market-kicker">{browsing?'YOUR RESULTS':'JUST LANDED'}</span><h2>{browsing?'Explore products':'Latest products'}</h2></div><div className="bs2-results-actions"><button className={filtersOpen?'bs2-filter-btn active':'bs2-filter-btn'} onClick={()=>setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}><SlidersHorizontal size={17}/> Filters {(inStock||condition||minPrice||maxPrice)?'•':''}</button><label className="bs2-sort-label"><span>Sort:</span><select aria-label="Sort products" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest</option><option value="popular">Popular</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select><ChevronDown size={15}/></label></div></div>
      {filtersOpen && <div className="bs2-filters-panel"><label className="bs2-check"><input type="checkbox" checked={inStock} onChange={e=>setInStock(e.target.checked)}/> In stock only</label><label>Condition <select value={condition} onChange={e=>setCondition(e.target.value)}><option value="">All conditions</option><option value="new">New</option><option value="used">Used</option><option value="refurbished">Refurbished</option></select></label><label>Min price (₦) <input type="number" min="0" placeholder="0" value={minPrice} onChange={e=>setMinPrice(e.target.value)}/></label><label>Max price (₦) <input type="number" min="0" placeholder="Any" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)}/></label><button type="button" onClick={clearFilters}><RotateCcw size={15}/> Reset</button><button className="bs2-close-filter" type="button" onClick={()=>setFiltersOpen(false)} aria-label="Close filters"><X size={18}/></button></div>}
      {loading ? <SkeletonGrid/> : error && !products.length ? <div className="bs2-empty"><ShieldCheck size={28}/><h3>Products couldn't load</h3><p>{error}</p><button onClick={()=>window.location.reload()}>Try again <RotateCcw size={16}/></button></div> : visible.length ? <div className="bs2-product-grid">{visible.map(p=><ProductCard key={p.id} product={p} saved={savedIds.includes(p.id)} onAdd={add} onSave={save}/>)}</div> : <div className="bs2-empty"><Search size={27}/><h3>No matching products</h3><p>Try another search or clear your filters.</p><button onClick={clearFilters}>Clear filters</button></div>}
      {error && products.length>0 && <p role="alert" className="error">{error}</p>}
      {hasMore&&!loading && <button className="bs2-load-more" onClick={loadMore} disabled={loadingMore}>{loadingMore?'Loading more products…':'Show more products'}<ArrowRight size={17}/></button>}
    </section>
    {!browsing && <><section className="bs2-benefits"><div><ShieldCheck size={24}/><span><strong>Shop with more confidence</strong><small>Protection and support for eligible orders</small></span></div><div><Truck size={24}/><span><strong>Delivery managed by BUYSELL</strong><small>Order progress from pickup to arrival</small></span></div><div><BadgeCheck size={24}/><span><strong>Seller identity checks</strong><small>More transparency from checkout onward</small></span></div></section>
      <section className="bs2-sell-banner"><div><span>YOUR BUSINESS, BIGGER OPPORTUNITIES</span><h2>Ready to sell something?</h2><p>Set up a store, list products and manage orders from your own BUYSELL workspace.</p><Link to="/auth?mode=signup&role=seller">Open your store <ArrowRight size={17}/></Link></div><div className="bs2-sell-banner-art" aria-hidden="true"><Store size={86}/></div></section></>}
    {toast && <div className="bs2-toast" role="status"><Check size={17}/>{toast}<button type="button" onClick={()=>setToast('')} aria-label="Dismiss"><X size={15}/></button></div>}
  </div>;
}
function LayoutGridIcon(){return <ShoppingBag size={22}/>;}
