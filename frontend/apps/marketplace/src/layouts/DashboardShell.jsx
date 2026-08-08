import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  ClipboardList,
  Grid2X2,
  Menu,
  MessageCircle,
  PackageCheck,
  Settings,
  ShoppingBag,
  Store,
  TicketPercent,
  Truck,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';

const icons = {
  Overview: Grid2X2,
  Products: Boxes,
  Orders: ShoppingBag,
  Analytics: BarChart3,
  Storefront: Store,
  Withdrawals: WalletCards,
  Coupons: TicketPercent,
  Ads: MessageCircle,
  Dropshipping: PackageCheck,
  KYC: UserRound,
  Team: UsersRound,
  Referrals: UsersRound,
  Users: UsersRound,
  Sellers: Store,
  Disputes: ClipboardList,
  Receipts: WalletCards,
  Broadcasts: MessageCircle,
  Upcoming: PackageCheck,
  'Audit log': ClipboardList,
  Catalog: Boxes,
  Connections: UsersRound,
  Profile: Settings,
  Customers: UsersRound,
  Tasks: ClipboardList,
  Deliveries: Truck,
  Earnings: WalletCards,
};

export function DashboardShell({ title, base, items = [] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="workspace-shell">
      <aside className={open ? 'workspace-sidebar open' : 'workspace-sidebar'}>
        <div className="workspace-brand-row">
          <Link to="/shop" className="workspace-logo"><img src="/brand/buysell-primary-dark.svg" alt="BUYSELL" /></Link>
          <button className="workspace-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>
        <div className="workspace-title-block">
          <span>{title} workspace</span>
          <strong>BUYSELL operations</strong>
        </div>
        <nav className="workspace-nav">
          {items.map(item => {
            const Icon = icons[item.label] || Grid2X2;
            return (
              <NavLink end={item.path === base} key={item.path} to={item.path} onClick={() => setOpen(false)}>
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="workspace-sidebar-foot">
          <Link to="/shop"><ArrowLeft size={16} /> Back to marketplace</Link>
          <small>Buy smart. Sell easy.</small>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="workspace-topbar">
          <button className="workspace-menu" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <div><span>BUYSELL</span><strong>{title} dashboard</strong></div>
          <Link to="/account" className="workspace-profile"><UserRound size={18} /></Link>
        </header>
        <main className="workspace-content"><Outlet /></main>
      </section>
      {open && <button className="workspace-backdrop" onClick={() => setOpen(false)} aria-label="Close navigation" />}
    </div>
  );
}
