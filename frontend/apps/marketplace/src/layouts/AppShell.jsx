import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Heart, House, LayoutGrid, LogOut, Menu, MessageCircle, Package, Search, ShoppingBag, ShoppingCart, Store, UserRound, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useCart } from '../state/CartContext.jsx';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { ErrorBoundary } from '../components/ErrorBoundary.jsx';

const departments = [['/shop', 'All products'], ['/category/phones', 'Phones'], ['/category/electronics', 'Electronics'], ['/category/fashion', 'Fashion'], ['/category/beauty', 'Beauty'], ['/category/home', 'Home & living']];
const accountHref = user => user ? '/account' : '/auth';

export function AppShell() {
  const { user, logout } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const roles = user?.roles || [];
  const canSell = roles.includes('seller') || roles.includes('seller_manager') || roles.includes('admin');
  const canSupply = roles.includes('supplier') || roles.includes('admin');
  const cartCount = cart.items.reduce((total, item) => total + (Number(item.quantity) || 1), 0);
  useEffect(() => { setMenuOpen(false); }, [location.pathname, location.search]);

  const search = event => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get('q')?.toString().trim() || '';
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/shop');
    setMenuOpen(false);
  };

  return (
    <div className="app-shell buysell-shell bs2-app">
      <div className="bs2-topline"><span>Discover more. Shop with confidence.</span><span className="bs2-topline-trust">BUYSELL Nigeria · Buyer Protection</span></div>
      <header className="bs2-header">
        <div className="bs2-header-inner">
          <button className="bs2-menu-btn" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="bs2-navigation" aria-label={menuOpen ? 'Close menu' : 'Open menu'}>{menuOpen ? <X size={22}/> : <Menu size={22}/>}</button>
          <Link className="bs2-logo" to="/shop" aria-label="BUYSELL marketplace home"><BrandLogo surface="light" /></Link>
          <form className="bs2-search" role="search" onSubmit={search} key={location.pathname === '/search' ? location.search : 'header-search'}><Search size={18} aria-hidden="true"/><input aria-label="Search products" name="q" defaultValue={new URLSearchParams(location.search).get('q') || ''} placeholder="Search products, brands and stores…" autoComplete="off"/><button type="submit" aria-label="Submit search"><span>Search</span><ArrowRight size={17}/></button></form>
          <nav className="bs2-header-actions" aria-label="Your BUYSELL account">
            <NavLink to="/wishlist" className="bs2-icon-link bs2-desktop-action" aria-label="Wishlist"><Heart size={20}/></NavLink>
            <NavLink to="/messages" className="bs2-icon-link bs2-desktop-action" aria-label="Messages"><MessageCircle size={20}/></NavLink>
            <NavLink to="/cart" className="bs2-icon-link bs2-cart-link" aria-label={`Cart with ${cartCount} items`}><ShoppingCart size={21}/>{cartCount > 0 && <span className="bs2-count">{cartCount}</span>}</NavLink>
            {user ? <NavLink to="/account" className="bs2-account-link"><UserRound size={18}/><span>Account</span></NavLink> : <NavLink to="/auth" state={{ from: location.pathname + location.search }} className="bs2-signin">Sign in</NavLink>}
          </nav>
        </div>
        <div id="bs2-navigation" className={`bs2-nav-wrap${menuOpen ? ' is-open' : ''}`}>
          <nav className="bs2-nav-inner" aria-label="Marketplace categories">
            <div className="bs2-categories">{departments.map(([href, label]) => <NavLink key={href} end={href === '/shop'} to={href}>{label}</NavLink>)}<NavLink to="/upcoming">Coming soon</NavLink></div>
            <div className="bs2-nav-aside">
              {canSell ? <Link to="/seller"><Store size={16}/>Seller centre</Link> : <Link to="/auth?mode=signup&role=seller"><Store size={16}/>Start selling</Link>}
              {canSupply && <Link to="/supplier"><ShoppingBag size={16}/>Supplier centre</Link>}
              {roles.includes('admin') && <Link to="/admin">Admin</Link>}
            </div>
            {user && <button className="bs2-mobile-logout" type="button" onClick={async()=>{await logout();navigate('/shop');}}><LogOut size={17}/>Sign out</button>}
          </nav>
        </div>
      </header>
      {menuOpen && <button className="bs2-menu-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)}/>}
      <main className="market-main bs2-main" id="main-content"><ErrorBoundary key={location.pathname}><Outlet/></ErrorBoundary></main>
      <footer className="bs2-footer">
        <div className="bs2-footer-top"><Link to="/shop"><BrandLogo surface="light" /></Link><p>A better way to shop, sell and grow in Nigeria.</p></div>
        <div className="bs2-footer-links"><Link to="/shop">Marketplace</Link><Link to="/orders">My orders</Link><Link to="/messages">Messages</Link><Link to="/support">Help & support</Link><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link></div>
        <small>© {new Date().getFullYear()} BUYSELL Nigeria. All rights reserved.</small>
      </footer>
      <nav className="bs2-mobile-dock" aria-label="Mobile quick navigation">
        <NavLink to="/shop" end><House size={21}/><span>Shop</span></NavLink>
        <NavLink to="/products"><LayoutGrid size={21}/><span>Explore</span></NavLink>
        <NavLink to="/cart" className="bs2-dock-cart"><ShoppingBag size={22}/><span>Cart</span>{cartCount>0&&<b>{cartCount}</b>}</NavLink>
        <NavLink to="/orders"><Package size={21}/><span>Orders</span></NavLink>
        <NavLink to={accountHref(user)}><UserRound size={21}/><span>Account</span></NavLink>
      </nav>
    </div>
  );
}
