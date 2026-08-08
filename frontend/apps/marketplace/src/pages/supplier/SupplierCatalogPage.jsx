import { useEffect, useState } from 'react';
import { Boxes, LockKeyhole, PackagePlus, ShieldCheck } from 'lucide-react';
import { api, uploadFile } from '../../api/client.js';

const money = value => `₦${(Number(value || 0) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

export function SupplierCatalogPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    try { setRows(await api('/suppliers/catalog')); }
    catch (requestError) { setError(requestError.message); }
  }

  useEffect(() => { load(); }, []);

  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const file = data.get('image_file');
      let image = '';
      if (file?.size) image = (await uploadFile(file)).url;
      await api('/suppliers/catalog', {
        method: 'POST',
        body: JSON.stringify({
          supplier_key: data.get('supplier_key') || 'manual',
          name: data.get('name'),
          description: data.get('description'),
          niche: data.get('niche'),
          cost: Math.round(Number(data.get('cost') || 0) * 100),
          suggested_price: Math.round(Number(data.get('price') || 0) * 100),
          shipping: Math.round(Number(data.get('shipping') || 0) * 100),
          image,
          images: image ? [image] : [],
          stock: Number(data.get('stock') || 0),
        }),
      });
      event.currentTarget.reset();
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="seller-page supplier-catalog-page">
      <div className="workspace-heading-row"><div><span className="market-kicker">SUPPLIER WORKSPACE</span><h1>Private catalog</h1><p>Create source products for connected BUYSELL sellers. These records are not part of the public buyer marketplace.</p></div></div>
      <div className="sourcing-trust-banner"><LockKeyhole size={20} /><div><strong>Not visible to regular buyers</strong><span>Catalog access is restricted to supplier, approved seller and admin workflows enforced by the backend.</span></div></div>

      <div className="supplier-catalog-layout">
        <form className="supplier-product-form" onSubmit={submit}>
          <div className="seller-card-heading"><div><span className="market-kicker">NEW SOURCE PRODUCT</span><h2>Add catalog item</h2></div><PackagePlus size={19} /></div>
          <label><span>Supplier key</span><input name="supplier_key" placeholder="Supplier key" /></label>
          <label><span>Product name</span><input name="name" required placeholder="Product name" /></label>
          <label><span>Description</span><textarea name="description" placeholder="Description" /></label>
          <label><span>Niche / category</span><input name="niche" placeholder="Electronics, Fashion…" /></label>
          <div className="supplier-form-grid">
            <label><span>Cost (NGN)</span><input name="cost" type="number" min="0" step=".01" /></label>
            <label><span>Suggested price (NGN)</span><input name="price" type="number" min="0" step=".01" /></label>
            <label><span>Shipping (NGN)</span><input name="shipping" type="number" min="0" step=".01" /></label>
            <label><span>Stock</span><input name="stock" type="number" min="0" /></label>
          </div>
          <label><span>Product image</span><input name="image_file" type="file" accept="image/*" /></label>
          {error && <p className="error">{error}</p>}
          <button className="primary-cta supplier-add-button"><PackagePlus size={15} /> Add catalog product</button>
        </form>

        <section className="supplier-catalog-list-card">
          <div className="seller-card-heading"><div><span className="market-kicker">YOUR CATALOG</span><h2>{rows.length} source product{rows.length === 1 ? '' : 's'}</h2></div><Boxes size={19} /></div>
          <div className="supplier-catalog-grid">
            {rows.length ? rows.map(item => (
              <article key={item.id}>
                <span className="supplier-catalog-media">{item.image || item.image_url ? <img src={item.image || item.image_url} alt={item.name} /> : <Boxes size={23} />}</span>
                <div><strong>{item.name}</strong><small>{item.niche || item.supplier_key || 'Supplier catalog'}</small><b>{money(item.suggested_price || item.cost)}</b></div>
                <span className="supplier-stock"><ShieldCheck size={13} /> {item.stock ?? '—'} stock</span>
              </article>
            )) : <div className="seller-empty-state"><Boxes size={25} /><strong>No catalog products yet</strong><span>Add your first seller-facing source product.</span></div>}
          </div>
        </section>
      </div>
    </div>
  );
}
