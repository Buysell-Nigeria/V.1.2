import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Heart,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useCart } from '../state/CartContext.jsx';

const primaryLinks = [
  ['/shop', 'Marketplace'],
  ['/category/electronics', 'Electronics'],
  ['/category/fashion', 'Fashion'],
  ['/category/home', 'Home & Living'],
  ['/category/beauty', 'Beauty'],
];

export function AppShell() {
  const { user, logout } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const submitSearch = (event) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get('q')?.toString().trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/shop');
    setMenuOpen(false);
  };

  const roles = user?.roles || [];
  const hasSellerWorkspace = roles.includes('seller') || roles.includes('seller_manager') || roles.includes('admin');
  const hasSupplierWorkspace = roles.includes('supplier') || roles.includes('admin');

  return (
    <div className="app-shell buysell-shell">
      <div className="market-announcement">
        <span>Buyer Protection</span>
        <span>Verified Sellers</span>
        <span>BUYSELL Managed Delivery</span>
      </div>

      <header className="market-header">
        <div className="market-header-main">
          <Link to="/shop" className="market-logo" aria-label="BUYSELL home">
            <img src="/brand/buysell-primary-dark.svg" alt="BUYSELL" />
          </Link>

          <form className="market-search" onSubmit={submitSearch}>
            <Search size={18} aria-hidden="true" />
            <input name="q" placeholder="Search products, brands and stores" aria-label="Search marketplace" />
            <button type="submit">Search</button>
          </form>

          <nav className="market-actions" aria-label="Account actions">
            <NavLink to="/wishlist" aria-label="Wishlist"><Heart size={20} /></NavLink>
            <NavLink to="/messages" aria-label="Messages"><MessageCircle size={20} /></NavLink>
            <NavLink to="/cart" className="market-cart" aria-label="Cart">
              <ShoppingCart size={20} />
              {cart.items.length > 0 && <b>{cart.items.length}</b>}
            </NavLink>
            {user ? (
              <>
                <NavLink to="/account" aria-label="Account"><UserRound size={20} /></NavLink>
                <button
                  type="button"
                  className="market-icon-button"
                  aria-label="Sign out"
                  onClick={async () => { await logout(); navigate('/shop'); }}
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <NavLink to="/auth" className="market-signin">Sign in</NavLink>
            )}
            <button
              type="button"
              className="market-menu-button"
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </nav>
        </div>

        <div className={menuOpen ? 'market-nav-row open' : 'market-nav-row'}>
          <nav className="market-primary-nav" aria-label="Marketplace navigation">
            {primaryLinks.map(([path, label]) => <NavLink key={path} to={path} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}
            <NavLink to="/upcoming" onClick={() => setMenuOpen(false)}>Upcoming</NavLink>
          </nav>
          <div className="market-workspace-links">
            {!hasSellerWorkspace && <NavLink to="/auth" className="sell-on-buysell"><Store size={16} /> Sell on BUYSELL</NavLink>}
            {hasSellerWorkspace && <NavLink to="/seller"><Store size={16} /> Seller Center</NavLink>}
            {hasSupplierWorkspace && <NavLink to="/supplier"><ShoppingBag size={16} /> Supplier Center</NavLink>}
          </div>
        </div>
      </header>

      <main className="market-main"><Outlet /></main>
    </div>
  );
}
