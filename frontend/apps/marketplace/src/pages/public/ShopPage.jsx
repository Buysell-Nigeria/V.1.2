import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  BadgeCheck,
  Camera,
  ChevronRight,
  Heart,
  Headphones,
  Laptop,
  Search,
  ShieldCheck,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sofa,
  Sparkles,
  Truck,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useCart } from '../../state/CartContext.jsx';

const categories = [
  { slug: 'phones', label: 'Phones', icon: Smartphone },
  { slug: 'electronics', label: 'Electronics', icon: Laptop },
  { slug: 'home', label: 'Home & Living', icon: Sofa },
  { slug: 'fashion', label: 'Fashion', icon: Shirt },
  { slug: 'beauty', label: 'Beauty', icon: Sparkles },
  { slug: 'cameras', label: 'Cameras', icon: Camera },
  { slug: 'audio', label: 'Audio', icon: Headphones },
];

const trustItems = [
  { title: 'Buyer Protection', text: 'Support on eligible orders', icon: ShieldCheck },
  { title: 'Managed Delivery', text: 'Tracking from pickup to you', icon: Truck },
  { title: 'Verified Sellers', text: 'Trust signals at checkout', icon: BadgeCheck },
  { title: 'Secure Shopping', text: 'Your cart stays protected', icon: ShoppingCart },
];

function formatPrice(product) {
  const raw = Number(product.flash_price || product.price || 0);
  return `₦${(raw / 100).toLocaleString()}`;
}

function ProductCard({ product, onAdd }) {
  return (
    <article className="market-product-card">
      <div className="market-product-media">
        <Link to={`/products/${product.id}`} aria-label={product.name}>
          {product.image_url ? <img src={product.image_url} alt={product.name} /> : <div className="market-product-placeholder">BUYSELL</div>}
        </Link>
        {product.flash_price && <span className="deal-badge">Deal</span>}
        <button type="button" className="product-heart" aria-label="Save product"><Heart size={17} /></button>
      </div>
      <div className="market-product-body">
        <Link to={`/products/${product.id}`}>
          <h3>{product.name}</h3>
          <p>{product.store_name || product.seller_name || 'Verified seller'}</p>
          <div className="market-product-price">{formatPrice(product)}</div>
        </Link>
        <button type="button" className="quick-cart" onClick={() => onAdd(product)} aria-label={`Add ${product.name} to cart`}>
          <ShoppingCart size={17} />
        </button>
      </div>
    </article>
  );
}

export function ShopPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const cart = useCart();
  const q = params.get('q') || '';
  const category = slug || params.get('category') || '';
  const browsing = Boolean(q || category);

  useEffect(() => {
    setLoading(true);
    const request = `/products?limit=60${q ? `&q=${encodeURIComponent(q)}` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}`;
    api(request).then((data) => setProducts(data.items || [])).finally(() => setLoading(false));
  }, [q, category]);

  const featured = useMemo(() => products.slice(0, 8), [products]);
  const moreProducts = useMemo(() => products.slice(8, 20), [products]);

  const submitInlineSearch = (event) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get('q')?.toString().trim() || '';
    setParams(query ? { q: query } : {});
  };

  if (browsing) {
    return (
      <div className="market-page market-listing-page">
        <div className="market-breadcrumb"><Link to="/shop">Home</Link><ChevronRight size={14} /><span>{category || `Search: ${q}`}</span></div>
        <section className="listing-heading">
          <div>
            <span className="market-kicker">BUYSELL MARKETPLACE</span>
            <h1>{category ? category.replaceAll('-', ' ') : `Results for “${q}”`}</h1>
            <p>{loading ? 'Finding products…' : `${products.length} products available`}</p>
          </div>
          <form className="listing-search" onSubmit={submitInlineSearch}>
            <Search size={17} /><input name="q" defaultValue={q} placeholder="Search within BUYSELL" />
          </form>
        </section>

        <div className="listing-layout">
          <aside className="listing-filters">
            <h2>Filters</h2>
            <div className="filter-group"><strong>Category</strong>{categories.map(({ slug: itemSlug, label }) => <Link key={itemSlug} to={`/category/${itemSlug}`} className={itemSlug === category ? 'active' : ''}>{label}</Link>)}</div>
            <div className="filter-group"><strong>Trust</strong><label><input type="checkbox" /> Verified sellers</label><label><input type="checkbox" /> Managed delivery</label><label><input type="checkbox" /> In stock</label></div>
            <div className="filter-group"><strong>Condition</strong><label><input type="checkbox" /> Brand new</label><label><input type="checkbox" /> Like new</label><label><input type="checkbox" /> Refurbished</label></div>
          </aside>
          <section className="listing-results">
            <div className="listing-toolbar"><div className="listing-chips"><span>Trusted stores</span><span>Video products</span><span>Fast delivery</span></div><select aria-label="Sort products"><option>Sort: Popular</option><option>Newest</option><option>Price: Low to high</option><option>Price: High to low</option></select></div>
            {loading ? <div className="market-loading">Loading products…</div> : products.length ? <div className="market-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} onAdd={cart.add} />)}</div> : <div className="market-empty">No products match this view yet.</div>}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="market-page market-homepage">
      <section className="market-hero">
        <div className="market-hero-copy">
          <span className="market-kicker light">NIGERIA'S BUYER–SELLER MARKETPLACE</span>
          <h1>Everything you need, in one trusted place.</h1>
          <p>Shop verified sellers, pay securely, and let BUYSELL coordinate delivery from seller pickup to your doorstep.</p>
          <div className="market-hero-actions"><Link to="/products" className="primary-cta">Shop now</Link><Link to="/auth" className="secondary-cta">Open your store</Link></div>
        </div>
        <div className="market-hero-visual" aria-hidden="true">
          <div className="hero-product-card phone"><Smartphone size={72} /></div>
          <div className="hero-product-card headset"><Headphones size={58} /></div>
          <div className="hero-trust-pill"><ShieldCheck size={17} /> Secure checkout</div>
          <div className="hero-smile" />
        </div>
      </section>

      <section className="market-trust-grid">{trustItems.map(({ title, text, icon: Icon }) => <article key={title}><span><Icon size={19} /></span><div><strong>{title}</strong><p>{text}</p></div></article>)}</section>

      <section className="market-section">
        <div className="market-section-heading"><div><span className="market-kicker">DISCOVER</span><h2>Shop by category</h2></div><Link to="/products">View all <ChevronRight size={16} /></Link></div>
        <div className="market-category-grid">{categories.map(({ slug: itemSlug, label, icon: Icon }) => <Link key={itemSlug} to={`/category/${itemSlug}`}><span><Icon size={30} /></span><strong>{label}</strong></Link>)}</div>
      </section>

      <section className="market-section">
        <div className="market-section-heading"><div><span className="market-kicker">UPDATED DAILY</span><h2>Fresh deals</h2></div><Link to="/products">See all <ChevronRight size={16} /></Link></div>
        {loading ? <div className="market-loading">Loading fresh products…</div> : featured.length ? <div className="market-product-grid">{featured.map((product) => <ProductCard key={product.id} product={product} onAdd={cart.add} />)}</div> : <div className="market-empty">Products will appear here as soon as listings are imported.</div>}
      </section>

      <section className="seller-growth-banner">
        <div><span className="market-kicker light">SELL ON BUYSELL</span><h2>Your store, your customers, one simple workspace.</h2><p>List products, manage orders, message buyers, track payouts and source supplier inventory from your seller dashboard.</p></div>
        <Link to="/auth">Start selling</Link>
      </section>

      {moreProducts.length > 0 && <section className="market-section"><div className="market-section-heading"><div><span className="market-kicker">MORE TO EXPLORE</span><h2>Recommended for you</h2></div></div><div className="market-product-grid">{moreProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={cart.add} />)}</div></section>}
    </div>
  );
}
