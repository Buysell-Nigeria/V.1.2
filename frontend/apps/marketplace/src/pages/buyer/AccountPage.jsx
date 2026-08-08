import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BadgeCheck, MapPin, ShieldCheck, Store, Trash2, UserRound } from 'lucide-react';
import { api, tokenStore } from '../../api/client.js';

export function AccountPage() {
  const location = useLocation();
  const addressesMode = location.pathname.endsWith('/addresses');
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const load = () => Promise.all([api('/profile/me'), api('/profile/me/addresses')])
    .then(([profileData, addressData]) => { setProfile(profileData); setAddresses(addressData); })
    .catch(requestError => setError(requestError.message));

  useEffect(() => { load(); }, []);

  if (!profile && !error) return <div className="market-page market-loading">Loading account…</div>;

  const saveProfile = async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const updated = await api('/profile/me', { method: 'PATCH', body: JSON.stringify(data) });
    setProfile(current => ({ ...current, ...updated }));
    setSaved('Profile saved.');
  };

  const addAddress = async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    data.is_default = Boolean(data.is_default);
    const created = await api('/profile/me/addresses', { method: 'POST', body: JSON.stringify(data) });
    setAddresses(current => [created, ...current]);
    event.currentTarget.reset();
  };

  const remove = async id => {
    await api(`/profile/me/addresses/${id}`, { method: 'DELETE' });
    setAddresses(current => current.filter(address => address.id !== id));
  };

  const deleteAccount = async () => {
    if (!confirm('Permanently delete your BUYSELL account?')) return;
    await api('/profile/me', { method: 'DELETE' });
    tokenStore.clear();
    window.location.assign('/auth');
  };

  return (
    <div className="market-page buyer-account-page">
      <div className="commerce-page-heading account-page-heading">
        <span className="market-kicker">ACCOUNT</span>
        <h1>{addressesMode ? 'Delivery addresses' : 'Your BUYSELL profile'}</h1>
        <p>Manage personal identity, storefront details and delivery information from one account.</p>
      </div>

      <div className="account-layout">
        <aside className="account-sidebar-card">
          <span className="account-avatar"><UserRound size={26} /></span>
          <strong>{profile?.name || 'BUYSELL member'}</strong>
          <small>{profile?.email || 'Marketplace account'}</small>
          <span className="verified-pill"><BadgeCheck size={14} /> Account active</span>
          <nav>
            <Link className={!addressesMode ? 'active' : ''} to="/account"><UserRound size={16} /> Profile</Link>
            <Link className={addressesMode ? 'active' : ''} to="/account/addresses"><MapPin size={16} /> Addresses</Link>
            <Link to="/account/kyc"><ShieldCheck size={16} /> Verification</Link>
            {(profile?.store_name || profile?.seller_status) && <Link to="/seller"><Store size={16} /> Seller workspace</Link>}
          </nav>
        </aside>

        <section className="account-main-column">
          {error && <p className="error">{error}</p>}

          {!addressesMode && profile && (
            <form className="account-form-card" onSubmit={saveProfile}>
              <div className="account-card-heading"><div><h2>Profile information</h2><p>Used for your BUYSELL account, seller identity and order communication.</p></div><UserRound size={20} /></div>
              <div className="account-form-grid">
                <label><span>Name</span><input name="name" defaultValue={profile.name || ''} /></label>
                <label><span>Phone</span><input name="phone" defaultValue={profile.phone || ''} /></label>
                <label><span>WhatsApp</span><input name="whatsapp" defaultValue={profile.whatsapp || ''} /></label>
                <label><span>Store name</span><input name="store_name" defaultValue={profile.store_name || ''} /></label>
                <label className="wide"><span>Store description</span><textarea name="store_description" defaultValue={profile.store_description || ''} /></label>
                <label className="wide"><span>Store address</span><input name="store_address" defaultValue={profile.store_address || ''} /></label>
              </div>

              <div className="account-subsection"><h3>Payout details</h3><p>Visible only inside protected account and seller workflows.</p></div>
              <div className="account-form-grid">
                <label><span>Bank name</span><input name="bank_name" defaultValue={profile.bank_name || ''} /></label>
                <label><span>Account number</span><input name="account_number" defaultValue={profile.account_number || ''} /></label>
                <label className="wide"><span>Account name</span><input name="account_name" defaultValue={profile.account_name || ''} /></label>
              </div>
              {saved && <p className="product-success">{saved}</p>}
              <div className="account-form-actions"><button className="primary-cta" type="submit">Save profile</button><button type="button" className="account-delete-button" onClick={deleteAccount}><Trash2 size={15} /> Delete account</button></div>
            </form>
          )}

          <section className="account-address-card">
            <div className="account-card-heading"><div><h2>Delivery addresses</h2><p>Saved locations for faster BUYSELL-managed checkout.</p></div><MapPin size={20} /></div>
            <div className="account-address-list">
              {addresses.length ? addresses.map(address => (
                <article key={address.id}>
                  <span><MapPin size={17} /></span>
                  <div><strong>{address.label || address.recipient_name}</strong><small>{address.line1}{address.city ? `, ${address.city}` : ''}{address.state ? `, ${address.state}` : ''}</small>{address.is_default && <b>Default address</b>}</div>
                  <button onClick={() => remove(address.id)}><Trash2 size={15} /></button>
                </article>
              )) : <div className="account-address-empty">No saved addresses yet.</div>}
            </div>

            <form className="account-address-form" onSubmit={addAddress}>
              <h3>Add an address</h3>
              <div className="account-form-grid">
                <label><span>Label</span><input name="label" placeholder="Home, Office…" /></label>
                <label><span>Recipient name</span><input name="recipient_name" placeholder="Recipient name" required /></label>
                <label><span>Phone</span><input name="phone" placeholder="Phone" /></label>
                <label><span>City</span><input name="city" placeholder="City" /></label>
                <label className="wide"><span>Street address</span><input name="line1" placeholder="Street address" required /></label>
                <label><span>State</span><input name="state" placeholder="State" /></label>
                <label className="account-default-check"><input type="checkbox" name="is_default" /> Make default address</label>
              </div>
              <button className="primary-cta account-add-address">Add address</button>
            </form>
          </section>
        </section>
      </div>
    </div>
  );
}
