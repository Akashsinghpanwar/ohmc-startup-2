import { useState } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { signup, login, googleLoginUrl } from '../services/api.js';
import logoImg from '../assets/logo.png';

const IMG = 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1200&q=85';

export default function AuthPage({ mode, onAuth, goTo }) {
  const [tab,    setTab]    = useState(mode);
  const [showPw, setShowPw] = useState(false);
  const [loading,setLoading]= useState(false);
  const [error,  setError]  = useState('');
  const [form,   setForm]   = useState({ name: '', email: '', password: '', agree: false });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleLogin(e) {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please enter your email and password.'); return; }
    setError(''); setLoading(true);
    try {
      const { user } = await login({ email: form.email, password: form.password });
      onAuth(user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Incorrect email or password.');
    } finally { setLoading(false); }
  }

  async function handleSignup(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError('Please fill in all fields.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!form.agree) { setError('Please accept the terms to continue.'); return; }
    setError(''); setLoading(true);
    try {
      const { user } = await signup({
        email: form.email, password: form.password,
        name: form.name, role: 'member',
      });
      onAuth(user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Sign up failed. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-shell">
      {/* Left — hero panel */}
      <div className="auth-panel" style={{ backgroundImage: `url(${IMG})` }}>
        <div className="auth-panel-overlay" />
        <div className="auth-panel-content">
          <button className="auth-logo" onClick={() => goTo('home')}>
            <img src={logoImg} alt="OHMC" style={{ height: 52, borderRadius: 6 }} />
          </button>
          <div className="auth-panel-copy">
            <h2>UK Land Carbon.<br />One platform.</h2>
            <p>
              Scan your land, assess eligibility, list carbon projects and connect
              with verified buyers — all in one place.
            </p>
            <div className="auth-panel-stats">
              {[['248+','Projects registered'],['£617M','Pipeline value'],['56+','Active buyers']].map(([v,l]) => (
                <div key={l}><strong>{v}</strong><span>{l}</span></div>
              ))}
            </div>
          </div>
          <p className="auth-panel-disclaimer">
            Estimates are preliminary only — not verified credits or guaranteed revenue.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="auth-form-panel">
        <div className="auth-form-wrap">

          {/* Tabs */}
          <div className="auth-tabs">
            <button className={tab === 'login'  ? 'active' : ''} onClick={() => { setTab('login');  setError(''); }}>Sign in</button>
            <button className={tab === 'signup' ? 'active' : ''} onClick={() => { setTab('signup'); setError(''); }}>Create account</button>
          </div>

          {/* ── LOGIN ── */}
          {tab === 'login' && (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="auth-form-header">
                <h1>Welcome back</h1>
                <p>Sign in to your OHMC account</p>
              </div>

              <div className="auth-field">
                <label>Email address</label>
                <input className="auth-input" type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => set('email', e.target.value)} autoFocus />
              </div>

              <div className="auth-field">
                <label>
                  <span>Password</span>
                  <a href="#" className="auth-forgot" onClick={e => e.preventDefault()}>Forgot password?</a>
                </label>
                <div className="auth-input-wrap">
                  <input className="auth-input" type={showPw ? 'text' : 'password'} placeholder="Your password"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                  <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(v => !v)}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : <>Sign in <ArrowRight size={15} /></>}
              </button>

              <div className="auth-divider"><span>or</span></div>
              <button type="button" className="auth-google" onClick={() => { window.location.href = googleLoginUrl('member'); }}>
                <GoogleIcon /> Continue with Google
              </button>

              <p className="auth-switch">
                Don't have an account?{' '}
                <button onClick={() => { setTab('signup'); setError(''); }}>Create one free</button>
              </p>
            </form>
          )}

          {/* ── SIGNUP ── */}
          {tab === 'signup' && (
            <form className="auth-form" onSubmit={handleSignup}>
              <div className="auth-form-header">
                <h1>Create your account</h1>
                <p>Free to join — scan land, browse projects, connect with buyers.</p>
              </div>

              <div className="auth-field">
                <label>Full name *</label>
                <input className="auth-input" placeholder="James MacDonald"
                  value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
              </div>

              <div className="auth-field">
                <label>Email address *</label>
                <input className="auth-input" type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>

              <div className="auth-field">
                <label>Password *</label>
                <div className="auth-input-wrap">
                  <input className="auth-input" type={showPw ? 'text' : 'password'} placeholder="Minimum 8 characters"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                  <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(v => !v)}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.password.length > 0 && (
                  <div className="auth-pw-strength">
                    {[4, 8, 12].map(n => (
                      <div key={n} className={`auth-pw-bar ${form.password.length >= n ? 'filled' : ''}`} />
                    ))}
                    <span>{form.password.length < 4 ? 'Too short' : form.password.length < 8 ? 'Weak' : form.password.length < 12 ? 'Good' : 'Strong'}</span>
                  </div>
                )}
              </div>

              <label className="auth-checkbox">
                <input type="checkbox" checked={form.agree} onChange={e => set('agree', e.target.checked)} />
                <span>I agree to the <a href="#" onClick={e => e.preventDefault()}>Terms of Service</a> and <a href="#" onClick={e => e.preventDefault()}>Privacy Policy</a>. I understand that platform estimates are not verified credits.</span>
              </label>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : <>Create account <ArrowRight size={15} /></>}
              </button>

              <div className="auth-divider"><span>or</span></div>
              <button type="button" className="auth-google" onClick={() => { window.location.href = googleLoginUrl('member'); }}>
                <GoogleIcon /> Continue with Google
              </button>

              <p className="auth-switch">
                Already have an account?{' '}
                <button onClick={() => { setTab('login'); setError(''); }}>Sign in</button>
              </p>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
