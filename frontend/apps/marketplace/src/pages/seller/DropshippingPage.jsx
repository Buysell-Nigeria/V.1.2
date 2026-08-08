import { useEffect, useState } from 'react';
import { Boxes, Link2, PackagePlus, ShieldCheck, Truck } from 'lucide-react';
import { api } from '../../api/client.js';

const money = value => `₦${(Number(value || 0) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

export function DropshippingPage() {
  const [connections, setConnections] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [connectionRows, catalogRows] = await Promise.all([api('/dropship/connections'), api('/dropship/catalog')]);
      setConnections(connectionRows);
      setCatalog(catalogRows);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function connect(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await api('/dropship/connections', { method: 'POST', body: JSON.stringify({ supplier_key: data.get('supplier_key'), supplier_name: data.get('supplier_name') }) });
      event.currentTarget.reset();
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function importItem(item) {
    const price = prompt('Selling price in NGN', String(Number(item.suggested_price || item.cost || 0) / 100));
    if (price === null) return;
    try {
      await api('/dropship/import-product', { method: 'POST', body: JSON.stringify({ catalog_id: item.id, price: Math.round(Number(price) * 100) }) });
      alert('Imported as a draft product.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="seller-page sourcing-page">
      <div className="workspace-heading-row">
        <div><span className="market-kicker">PRIVATE SELLER SOURCING</span><h1>Suppliers & dropshipping</h1><p>Supplier catalogs stay behind seller authorization and are never shown in ordinary buyer browsing.</p></div>
      </div>

      <div className="sourcing-trust-banner"><ShieldCheck size={20} /><div><strong>Seller-only access</strong><span>BUYSELL exposes sourcing connections and supplier catalog data only through protected seller workflows.</span></div></div>

      <div className="sourcing-layout">
        <section className="sourcing-connections-card">
          <div className="seller-card-heading"><div><span className="market-kicker">CONNECTIONS</span><h2>Connected suppliers</h2></div><Link2 size={19} /></div>
          <form className="sourcing-connect-form" onSubmit={connect}>
            <input name="supplier_key" required placeholder="Supplier key e.g. 1688" />
            <input name="supplier_name" placeholder="Supplier name" />
            <button className="primary-cta"><Link2 size={15} /> Connect supplier</button>
          </form>
          <div className="sourcing-connection-list">
            {connections.length ? connections.map(connection => <article key={connection.id}><span><Truck size={17} /></span><div><strong>{connection.supplier_name || connection.supplier_key}</strong><small>{connection.supplier_key}</small></div><b>Connected</b></article>) : <div className="seller-empty-state compact"><Link2 size={22} /><strong>No supplier connections yet</strong></div>}
          </div>
        </section>

        <section className="sourcing-catalog-card">
          <div className="seller-card-heading"><div><span className="market-kicker">IMPORT CATALOG</span><h2>Products available to your store</h2></div><Boxes size={19} /></div>
          {error && <p className="error">{error}</p>}
          <div className="sourcing-product-grid">
            {catalog.length ? catalog.map(item => (
              <article key={item.id}>
                <span className="sourcing-product-media">{item.image || item.image_url ? <img src={item.image || item.image_url} alt={item.name} /> : <Boxes size={22} />}</span>
                <div className="sourcing-product-copy"><strong>{item.name}</strong><small>{item.niche || item.supplier_name || 'Supplier catalog'}</small><b>{money(item.suggested_price || item.cost)}</b></div>
                <button onClick={() => importItem(item)}><PackagePlus size={15} /> Import</button>
              </article>
            )) : <div className="seller-empty-state"><Boxes size={25} /><strong>No supplier catalog items yet</strong><span>Connect an approved supplier to see seller-only sourcing products.</span></div>}
          </div>
        </section>
      </div>
    </div>
  );
}
