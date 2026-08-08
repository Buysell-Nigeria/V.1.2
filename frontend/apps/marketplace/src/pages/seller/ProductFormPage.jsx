import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ImagePlus, PackagePlus, Save, ShieldCheck } from 'lucide-react';
import { api, uploadFile } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';

const empty = { name: '', description: '', price: '', original_price: '', shipping_fee: '', category: '', condition: 'new', location: '', stock_quantity: 0, status: 'draft', negotiable: false, image_url: '', video_url: '' };

export function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(empty);
  const [assignments, setAssignments] = useState([]);
  const [sellerId, setSellerId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) api(`/products/${id}`).then(product => setForm({ ...empty, ...product, price: Number(product.price || 0) / 100, original_price: product.original_price ? Number(product.original_price) / 100 : '', shipping_fee: Number(product.shipping_fee || 0) / 100 })).catch(requestError => setError(requestError.message));
  }, [id]);

  useEffect(() => {
    if (user?.roles?.includes('seller_manager')) api('/sellers/assignments').then(rows => { setAssignments(rows); if (rows[0]) setSellerId(rows[0].seller_id); }).catch(requestError => setError(requestError.message));
  }, [user]);

  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = new FormData(event.currentTarget);
      let image = form.image_url || null;
      let video = form.video_url || null;
      const imageFile = data.get('image_file');
      const videoFile = data.get('video_file');
      if (imageFile?.size) image = (await uploadFile(imageFile)).url;
      if (videoFile?.size) video = (await uploadFile(videoFile)).url;
      const payload = {
        ...form,
        name: form.name.trim(),
        price: Math.round(Number(form.price) * 100),
        original_price: form.original_price === '' ? null : Math.round(Number(form.original_price) * 100),
        shipping_fee: Math.round(Number(form.shipping_fee || 0) * 100),
        stock_quantity: Number(form.stock_quantity || 0),
        image_url: image,
        images: image ? [image] : [],
        video_url: video,
        videos: video ? [video] : [],
        seller_id: sellerId || undefined,
      };
      if (id) await api(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await api('/products', { method: 'POST', body: JSON.stringify(payload) });
      navigate(user?.roles?.includes('seller_manager') ? '/manager/products' : '/seller/products');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="seller-page seller-product-editor">
      <div className="workspace-heading-row"><div><span className="market-kicker">PRODUCT LISTING</span><h1>{id ? 'Edit product' : 'Add product'}</h1><p>Keep product information clear, accurate and ready for BUYSELL trust and delivery flows.</p></div></div>

      <form className="seller-editor-layout" onSubmit={submit}>
        <section className="seller-editor-main">
          <div className="seller-editor-card">
            <div className="seller-card-heading"><div><span className="market-kicker">BASIC DETAILS</span><h2>Product information</h2></div><PackagePlus size={19} /></div>
            {user?.roles?.includes('seller_manager') && <label><span>Managed store</span><select value={sellerId} onChange={event => setSellerId(event.target.value)} required>{assignments.map(assignment => <option value={assignment.seller_id} key={assignment.seller_id}>{assignment.store_name || assignment.name || assignment.email}</option>)}</select></label>}
            <label><span>Product name</span><input required value={form.name} onChange={event => change('name', event.target.value)} placeholder="e.g. Samsung Galaxy S24 Ultra" /></label>
            <label><span>Description</span><textarea value={form.description || ''} onChange={event => change('description', event.target.value)} placeholder="What should buyers know about this product?" /></label>
            <div className="seller-editor-grid">
              <label><span>Category</span><input value={form.category || ''} onChange={event => change('category', event.target.value)} placeholder="Electronics" /></label>
              <label><span>Condition</span><select value={form.condition || 'new'} onChange={event => change('condition', event.target.value)}><option value="new">New</option><option value="used">Used</option><option value="refurbished">Refurbished</option></select></label>
              <label><span>Location</span><input value={form.location || ''} onChange={event => change('location', event.target.value)} placeholder="Lagos" /></label>
              <label><span>Stock quantity</span><input type="number" min="0" value={form.stock_quantity} onChange={event => change('stock_quantity', event.target.value)} /></label>
            </div>
          </div>

          <div className="seller-editor-card">
            <div className="seller-card-heading"><div><span className="market-kicker">PRICING</span><h2>Price and delivery</h2></div></div>
            <div className="seller-editor-grid">
              <label><span>Price (NGN)</span><input required type="number" min="0" step="0.01" value={form.price} onChange={event => change('price', event.target.value)} /></label>
              <label><span>Original price (NGN)</span><input type="number" min="0" step="0.01" value={form.original_price || ''} onChange={event => change('original_price', event.target.value)} /></label>
              <label><span>Shipping fee (NGN)</span><input type="number" min="0" step="0.01" value={form.shipping_fee || ''} onChange={event => change('shipping_fee', event.target.value)} /></label>
              <label className="seller-checkbox"><input type="checkbox" checked={Boolean(form.negotiable)} onChange={event => change('negotiable', event.target.checked)} /> Price negotiable</label>
            </div>
          </div>

          <div className="seller-editor-card">
            <div className="seller-card-heading"><div><span className="market-kicker">MEDIA</span><h2>Product image and video</h2></div><ImagePlus size={19} /></div>
            <div className="seller-media-fields">
              <label><span>Product image</span><input name="image_file" type="file" accept="image/*" /></label>
              <label><span>Optional product video</span><input name="video_file" type="file" accept="video/*" /></label>
            </div>
            {form.image_url && <div className="seller-current-media"><img src={form.image_url} alt="Current product" /><span>Current product image</span></div>}
          </div>
        </section>

        <aside className="seller-editor-side">
          <div className="seller-editor-card sticky">
            <div className="seller-card-heading"><div><span className="market-kicker">PUBLISHING</span><h2>Listing status</h2></div><ShieldCheck size={19} /></div>
            <label><span>Status</span><select value={form.status} onChange={event => change('status', event.target.value)}><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select></label>
            <div className="seller-editor-note"><ShieldCheck size={16} /><p>Only accurate listings should be activated. Seller verification, payment and delivery trust signals appear around the public product experience.</p></div>
            {error && <p className="error">{error}</p>}
            <button disabled={busy} className="primary-cta seller-save-button"><Save size={16} /> {busy ? 'Saving…' : 'Save product'}</button>
          </div>
        </aside>
      </form>
    </div>
  );
}
