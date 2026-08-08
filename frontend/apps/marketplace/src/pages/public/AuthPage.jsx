import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BadgeCheck, ShieldCheck, Store, Truck } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';

export function AuthPage() {
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'buyer' });
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      if (mode === 'login') await auth.login(form.email, form.password);
      else await auth.signup(form);
      navigate(location.state?.from || '/shop', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="buysell-auth-page">
      <section className="auth-brand-panel">
        <img src="/brand/buysell-primary-dark.svg" alt="BUYSELL" />
        <span className="market-kicker light">NIGERIA'S TRUSTED MARKETPLACE</span>
        <h1>Buy smart.<br />Sell easy.</h1>
        <p>One account for discovery, secure checkout, messaging, order tracking and verified marketplace workspaces.</p>
        <div className="auth-trust-list">
          <span><ShieldCheck size={18} /><b>Buyer Protection</b><small>Clear payment and dispute support.</small></span>
          <span><BadgeCheck size={18} /><b>Verified sellers</b><small>Trust cues stay visible while you shop.</small></span>
          <span><Truck size={18} /><b>Managed delivery</b><small>Collection and tracking stay coordinated.</small></span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-mobile-logo"><img src="/brand/buysell-primary-dark.svg" alt="BUYSELL" /></div>
        <div className="auth-mode-switch"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create account</button></div>
        <div className="auth-form-heading">
          <span className="market-kicker">{mode === 'login' ? 'WELCOME BACK' : 'JOIN BUYSELL'}</span>
          <h2>{mode === 'login' ? 'Sign in to your account' : 'Create your BUYSELL account'}</h2>
          <p>{mode === 'login' ? 'Continue shopping or open the workspace assigned to your role.' : 'Choose the role that matches how you want to use BUYSELL.'}</p>
        </div>
        <form className="auth-redesign-form" onSubmit={submit}>
          {mode === 'signup' && <label><span>Full name</span><input required placeholder="Your full name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>}
          <label><span>Email address</span><input required type="email" placeholder="you@example.com" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
          <label><span>Password</span><input required type="password" placeholder="Enter your password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></label>
          {mode === 'signup' && (
            <label><span>Account type</span><select value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}><option value="buyer">Buyer — shop and track orders</option><option value="seller">Seller — open a store and source products</option><option value="supplier">Supplier — manage a private seller-facing catalog</option><option value="seller_manager">Seller manager — delegated seller workspace</option><option value="rider">Rider — BUYSELL delivery workspace</option></select></label>
          )}
          {error && <p className="error">{error}</p>}
          <button className="primary-cta auth-submit" type="submit">{mode === 'login' ? 'Sign in to BUYSELL' : 'Create account'}</button>
        </form>
        <div className="auth-role-note"><Store size={16} /><p><strong>Seller and supplier access is role-gated.</strong> Supplier catalog data is never exposed to ordinary buyer routes.</p></div>
      </section>
    </div>
  );
}
