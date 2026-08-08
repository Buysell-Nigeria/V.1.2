import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Edit3, PackagePlus, Trash2 } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';

const money = value => `₦${(Number(value || 0) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

export function SellerProductsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const manager = user?.roles?.includes('seller_manager');
  const base = manager ? '/manager' : '/seller';

  async function load() {
    try {
      const data = await api('/products?mine=1&limit=100');
      setRows(data.items || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function remove(id) {
    if (!confirm('Delete this product?')) return;
    try {
      await api(`/products/${id}`, { method: 'DELETE' });
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="seller-page">
      <div className="workspace-heading-row">
        <div><span className="market-kicker">INVENTORY</span><h1>Products</h1><p>Create, edit, publish, pause and remove marketplace listings.</p></div>
        <Link className="primary-cta seller-primary-action" to={`${base}/products/new`}><PackagePlus size={16} /> Add product</Link>
      </div>
      {error && <p className="error">{error}</p>}

      <section className="seller-table-card">
        <div className="seller-table-head"><span>Product</span><span>Status</span><span>Stock</span><span>Price</span><span>Actions</span></div>
        {rows.length ? rows.map(product => (
          <article className="seller-table-row" key={product.id}>
            <div className="seller-product-cell">
              <span className="seller-product-thumb">{product.image_url ? <img src={product.image_url} alt={product.name} /> : <Boxes size={19} />}</span>
              <span><strong>{product.name}</strong><small>{product.category || 'Marketplace product'}</small></span>
            </div>
            <span className={`seller-status status-${String(product.status || 'draft').toLowerCase()}`}>{product.status || 'draft'}</span>
            <span>{product.stock_quantity ?? '—'}</span>
            <strong className="seller-price">{money(product.flash_price || product.price)}</strong>
            <div className="seller-row-actions"><Link to={`${base}/products/${product.id}/edit`}><Edit3 size={15} /> Edit</Link><button onClick={() => remove(product.id)}><Trash2 size={15} /> Delete</button></div>
          </article>
        )) : <div className="seller-empty-state"><Boxes size={26} /><strong>No products yet</strong><span>Create your first BUYSELL listing.</span></div>}
      </section>
    </div>
  );
}
