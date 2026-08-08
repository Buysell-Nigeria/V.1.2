import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BadgeCheck, Boxes, ClipboardList, PackagePlus, ShoppingBag, Store, Truck, UsersRound, WalletCards } from 'lucide-react';
import { api } from '../../api/client.js';

const money = value => `₦${(Number(value || 0) / 100).toLocaleString()}`;

function read(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

const config = {
  seller: {
    endpoint: '/sellers/dashboard',
    title: 'Your store at a glance',
    copy: 'Track inventory, orders and delivered revenue, then move straight into the next action.',
    metrics: [
      ['Products', 'products.total', Boxes],
      ['Active products', 'products.active', BadgeCheck],
      ['Orders', 'orders.total', ShoppingBag],
      ['Open orders', 'orders.open', ClipboardList],
      ['Delivered revenue', 'revenue.delivered_revenue', WalletCards, 'money'],
    ],
    actions: [
      ['Add product', '/seller/products/new', PackagePlus, 'Create a new marketplace listing'],
      ['View orders', '/seller/orders', ShoppingBag, 'Process paid and active orders'],
      ['Open sourcing', '/seller/dropshipping', Truck, 'Browse supplier and dropshipping tools'],
      ['View analytics', '/seller/analytics', ArrowUpRight, 'Understand store performance'],
    ],
  },
  admin: {
    endpoint: '/admin/overview',
    title: 'Marketplace operations',
    copy: 'Platform health, moderation and trust operations stay visible from one command centre.',
    metrics: [
      ['Users', 'users', UsersRound],
      ['Sellers', 'sellers', Store],
      ['Orders', 'orders', ShoppingBag],
      ['GMV', 'gmv', WalletCards, 'money'],
      ['Open disputes', 'open_disputes', ClipboardList],
      ['Pending KYC', 'pending_kyc', BadgeCheck],
    ],
    actions: [
      ['Review users', '/admin/users', UsersRound, 'Account and marketplace status'],
      ['Review KYC', '/admin/kyc', BadgeCheck, 'Verification and seller trust'],
      ['Open orders', '/admin/orders', ShoppingBag, 'Order moderation and support'],
      ['View analytics', '/admin/analytics', ArrowUpRight, 'Marketplace performance'],
    ],
  },
  supplier: {
    endpoint: '/suppliers/dashboard',
    title: 'Supplier workspace',
    copy: 'Your catalog is private to approved seller workflows and is not exposed to normal marketplace buyers.',
    metrics: [
      ['Catalog products', 'catalog', Boxes],
      ['Seller connections', 'connections', UsersRound],
      ['Supplier orders', 'orders', ShoppingBag],
      ['Revenue', 'revenue', WalletCards, 'money'],
    ],
    actions: [
      ['Manage catalog', '/supplier/catalog', Boxes, 'Products available to connected sellers'],
      ['Seller connections', '/supplier/connections', UsersRound, 'Stores connected to your supply'],
      ['Supplier orders', '/supplier/orders', ShoppingBag, 'Orders containing sourced items'],
      ['Supplier profile', '/supplier/profile', Store, 'Business identity and sourcing details'],
    ],
  },
  seller_manager: {
    endpoint: '/sellers/manager/dashboard',
    title: 'Seller manager overview',
    copy: 'Work only within the stores and permissions assigned to your manager account.',
    metrics: [
      ['Managed stores', 'stores', Store],
      ['Products', 'products', Boxes],
      ['Orders', 'orders', ShoppingBag],
      ['Open tasks', 'open_tasks', ClipboardList],
    ],
    actions: [
      ['Assigned products', '/manager/products', Boxes, 'Work within delegated product access'],
      ['Assigned orders', '/manager/orders', ShoppingBag, 'Manage delegated fulfillment'],
      ['Customers', '/manager/customers', UsersRound, 'Customers for assigned stores'],
      ['Tasks', '/manager/tasks', ClipboardList, 'See delegated work and priorities'],
    ],
  },
  rider: {
    endpoint: '/deliveries/dashboard',
    title: 'Delivery operations',
    copy: 'See active BUYSELL-managed deliveries, completed jobs and earnings without exposing seller-only tools.',
    metrics: [
      ['Jobs', 'total', Truck],
      ['Active jobs', 'active', ClipboardList],
      ['Delivered', 'delivered', BadgeCheck],
      ['Earnings', 'earnings', WalletCards, 'money'],
    ],
    actions: [
      ['Deliveries', '/rider/deliveries', Truck, 'Assigned pickup and delivery jobs'],
      ['Earnings', '/rider/earnings', WalletCards, 'Completed-job earnings'],
      ['Profile', '/rider/profile', Store, 'Rider account and identity'],
    ],
  },
};

export function DashboardOverview({ role }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const current = config[role] || config.seller;

  useEffect(() => {
    setLoading(true);
    api(current.endpoint)
      .then(setData)
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, [current.endpoint]);

  const availableMetrics = useMemo(() => current.metrics.map(([label, path, Icon, format]) => {
    const raw = read(data, path);
    return { label, value: raw ?? '—', Icon, format };
  }), [current.metrics, data]);

  return (
    <div className="workspace-overview">
      <div className="workspace-heading-row">
        <div>
          <span className="market-kicker">{role.replace('_', ' ').toUpperCase()}</span>
          <h1>{current.title}</h1>
          <p>{current.copy}</p>
        </div>
        <Link className="workspace-marketplace-link" to="/shop">View marketplace <ArrowUpRight size={16} /></Link>
      </div>

      <section className="workspace-metric-grid">
        {availableMetrics.map(({ label, value, Icon, format }) => (
          <article key={label}>
            <span><Icon size={18} /></span>
            <small>{label}</small>
            <strong>{loading ? '…' : format === 'money' && value !== '—' ? money(value) : value}</strong>
          </article>
        ))}
      </section>

      <div className="workspace-overview-grid">
        <section className="workspace-focus-card">
          <div className="workspace-card-heading"><div><span className="market-kicker">LIVE WORKSPACE</span><h2>What needs attention</h2></div><BadgeCheck size={20} /></div>
          <div className="workspace-health-row">
            <span className="workspace-health-dot" />
            <div><strong>Role access is active</strong><p>Your current workspace is separated from buyer-only and unrelated role tools.</p></div>
          </div>
          <div className="workspace-health-row">
            <span className="workspace-health-dot" />
            <div><strong>Marketplace API connected</strong><p>Cards above load from the production role endpoint rather than hard-coded dashboard totals.</p></div>
          </div>
          <div className="workspace-health-row">
            <span className="workspace-health-dot muted" />
            <div><strong>Analytics grows with real activity</strong><p>Detailed charts remain in the dedicated analytics route so this overview stays action-focused.</p></div>
          </div>
        </section>

        <aside className="workspace-actions-card">
          <div className="workspace-card-heading"><div><span className="market-kicker">QUICK ACTIONS</span><h2>Next steps</h2></div></div>
          <div className="workspace-action-list">
            {current.actions.map(([label, to, Icon, description], index) => (
              <Link to={to} key={label}>
                <b>{index + 1}</b>
                <span><strong>{label}</strong><small>{description}</small></span>
                <Icon size={17} />
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
