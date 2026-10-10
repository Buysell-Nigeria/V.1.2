import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, ShoppingBag, Store, Truck, UserRound, Warehouse } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { BrandLogo } from '../../components/BrandLogo.jsx';

const roles = [
  { value: 'buyer', label: 'Shop', note: 'Find products and track orders', icon: ShoppingBag },
  { value: 'seller', label: 'Sell', note: 'Create a store and manage orders', icon: Store },
  { value: 'supplier', label: 'Supply', note: 'Sell wholesale to approved sellers', icon: Warehouse },
  { value: 'rider', label: 'Deliver', note: 'Manage assigned deliveries', icon: Truck },
];
const roleHome = user => {
  const r = user?.roles || [];
  return r.includes('admin') ? '/admin' : r.includes('seller') ? '/seller' : r.includes('supplier') ? '/supplier' : r.includes('seller_manager') ? '/manager' : r.includes('rider') ? '/rider' : '/shop';
};
export function AuthPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { login, signup, user } = useAuth();
  const [mode, setMode] = useState(params.get('mode') === 'signup' || location.pathname === '/signup' || location.pathname === '/register' ? 'signup' : 'login');
  const [form, setForm] = useState({ name:'', email:'', password:'', role:params.get('role') || 'buyer' });
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(()=>{ if(params.get('mode')==='signup')setMode('signup'); if(params.get('role')&&roles.some(r=>r.value===params.get('role')))setForm(f=>({...f,role:params.get('role')}));},[params.toString()]);
  const field = (key, value) => setForm(prev=>({...prev,[key]:value}));
  const destination = user => location.state?.from || roleHome(user);
  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    setError('');setBusy(true);
    try {
      const next = mode==='login' ? await login(form.email.trim(),form.password) : await signup({...form,email:form.email.trim()});
      navigate(destination(next),{replace:true});
    } catch (err) { setError(err?.message || 'We could not complete your request. Please try again.'); }
    finally{setBusy(false);}
  };

  return <main className="bs2-auth-page">
    <header className="bs2-auth-header"><Link to="/shop" aria-label="Return to BUYSELL shop"><BrandLogo surface="light" /></Link><Link to="/shop"><ArrowLeft size={16}/> Back to shop</Link></header>
    <div className="bs2-auth-layout">
      <section className="bs2-auth-card">
        <span className="bs2-auth-eyebrow">BUYSELL ACCOUNT</span>
        <h1>{mode==='login'?'Welcome back.':'Make it yours.'}</h1>
        <p className="bs2-auth-subtitle">{mode==='login'?'Sign in to continue shopping, manage orders or open your workspace.':'One account gives you access to everything you need on BUYSELL.'}</p>
        {user && <div className="bs2-auth-existing"><CheckCircle2 size={17}/> You're already signed in. <Link to={roleHome(user)}>Continue to your dashboard <ArrowRight size={15}/></Link></div>}
        <div className="bs2-auth-tabs" role="tablist" aria-label="Authentication mode"><button type="button" role="tab" aria-selected={mode==='login'} className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('')}}>Sign in</button><button type="button" role="tab" aria-selected={mode==='signup'} className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setError('')}}>Create account</button></div>
        <form className="bs2-auth-form" onSubmit={submit}>
          {mode==='signup' && <><label htmlFor="bs2-auth-name">Full name</label><div className="bs2-input-with-icon"><UserRound size={18}/><input id="bs2-auth-name" required minLength={2} autoComplete="name" value={form.name} placeholder="How should we address you?" onChange={e=>field('name',e.target.value)}/></div></>}
          <label htmlFor="bs2-auth-email">Email address</label><div className="bs2-input-with-icon"><Mail size={18}/><input id="bs2-auth-email" type="email" required autoComplete="email" value={form.email} placeholder="you@example.com" onChange={e=>field('email',e.target.value)}/></div>
          <label htmlFor="bs2-auth-password">Password</label><div className="bs2-input-with-icon"><LockKeyhole size={18}/><input id="bs2-auth-password" type={visible?'text':'password'} required minLength={mode==='signup'?8:1} autoComplete={mode==='login'?'current-password':'new-password'} value={form.password} placeholder={mode==='signup'?'At least 8 characters':'Enter your password'} onChange={e=>field('password',e.target.value)}/><button type="button" className="bs2-visibility-toggle" onClick={()=>setVisible(!visible)} aria-label={visible?'Hide password':'Show password'}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
          {mode==='signup' && <><span className="bs2-role-label">I want to…</span><div className="bs2-role-choices">{roles.map(({value,label,note,icon:Icon})=><label key={value} className={form.role===value?'selected':''}><input type="radio" name="role" value={value} checked={form.role===value} onChange={e=>field('role',e.target.value)}/><Icon size={20}/><span><b>{label}</b><small>{note}</small></span><CheckCircle2 className="bs2-role-check" size={17}/></label>)}</div></>}
          {error && <div className="bs2-auth-error" role="alert">{error}</div>}
          <button className="bs2-auth-submit" type="submit" disabled={busy}>{busy?(mode==='login'?'Signing in…':'Creating account…'):(mode==='login'?'Sign in':'Create account')}<ArrowRight size={17}/></button>
        </form>
        <p className="bs2-auth-terms">By using BUYSELL, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
      </section>
      <aside className="bs2-auth-aside"><div className="bs2-auth-aside-visual"><span className="bs2-auth-aside-icon"><ShoppingBag size={39}/></span><div className="bs2-auth-aside-ring"/></div><span className="bs2-aside-tag"><ShieldCheck size={17}/> MADE FOR NIGERIAN COMMERCE</span><h2>Everything in one place.</h2><p>Discover products, stay in touch with sellers, track orders and run your business without switching platforms.</p><div className="bs2-aside-line"><CheckCircle2 size={18}/> Browse products and stores</div><div className="bs2-aside-line"><CheckCircle2 size={18}/> Keep orders and messages together</div><div className="bs2-aside-line"><CheckCircle2 size={18}/> Open a dedicated business workspace</div></aside>
    </div>
  </main>;
}
