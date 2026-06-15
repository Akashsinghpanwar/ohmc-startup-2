import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { signup, login, googleLoginUrl } from '../services/api.js';
import logoImg from '../assets/logo.png';

const PANEL_POINTS = [
  'Free satellite-backed eligibility scan in under a minute',
  'Deterministic WCC v2.1 + Peatland Code v1.1 rules engine',
  'Structured PDF reports ready for VVB review',
  'Curated marketplace with clear trust labels',
];

export default function AuthPage({ mode, onAuth, goTo }) {
  const [tab,    setTab]    = useState(mode);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
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
      {/* Left — brand panel */}
      <div className="auth-panel">
        <button className="auth-logo" onClick={() => goTo('home')}>
          <img src={logoImg} alt="OHMC" />
          <span>CarbonOS</span>
        </button>
        <div className="auth-panel-copy">
          <h2>UK land carbon,<br />done properly.</h2>
          <p>
            Scan your land, assess eligibility against UK standards, and connect with
            verified buyers — all in one place.
          </p>
          <ul className="auth-panel-points">
            {PANEL_POINTS.map(p => (
              <li key={p}><CheckCircle size={14} /> {p}</li>
            ))}
          </ul>
        </div>
        <p className="auth-panel-disclaimer">
          Estimates are preliminary only — not verified credits or guaranteed revenue.
        </p>
      </div>

      {/* Right — form */}
      <div className="auth-form-panel">
        <div className="auth-form-wrap">

          <div className="auth-tabs">
            <button className={tab === 'login'  ? 'active' : ''} onClick={() => { setTab('login');  setError(''); }}>Sign in</button>
            <button className={tab === 'signup' ? 'active' : ''} onClick={() => { setTab('signup'); setError(''); }}>Create account</button>
          </div>

          {tab === 'login' && (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="auth-form-header">
                <h1>Welcome back</h1>
                <p>Sign in to your OHMC account.</p>
              </div>

              <div className="field">
                <label>Email address</label>
                <input className="input" type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => set('email', e.target.value)} autoFocus />
              </div>

              <div className="field">
                <label className="label-row">
                  <span>Password</span>
                  <a href="#" className="text-link" onClick={e => e.preventDefault()}>Forgot password?</a>
                </label>
                <div className="input-affix">
                  <input className="input" type={showPw ? 'text' : 'password'} placeholder="Your password"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                  <button type="button" className="input-affix-btn" onClick={() => setShowPw(v => !v)} aria-label="Toggle password visibility">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && <div className="notice error">{error}</div>}

              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : <>Sign in <ArrowRight size={15} /></>}
              </button>

              <div className="auth-divider"><span>or</span></div>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => { window.location.href = googleLoginUrl('member'); }}>
                <GoogleIcon /> Continue with Google
              </button>

              <p className="auth-switch">
                Don't have an account?{' '}
                <button type="button" onClick={() => { setTab('signup'); setError(''); }}>Create one free</button>
              </p>
            </form>
          )}

          {tab === 'signup' && (
            <form className="auth-form" onSubmit={handleSignup}>
              <div className="auth-form-header">
                <h1>Create your account</h1>
                <p>Free to join — scan land, browse projects, connect with buyers.</p>
              </div>

              <div className="field">
                <label>Full name</label>
                <input className="input" placeholder="James MacDonald"
                  value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
              </div>

              <div className="field">
                <label>Email address</label>
                <input className="input" type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>

              <div className="field">
                <label>Password</label>
                <div className="input-affix">
                  <input className="input" type={showPw ? 'text' : 'password'} placeholder="Minimum 8 characters"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                  <button type="button" className="input-affix-btn" onClick={() => setShowPw(v => !v)} aria-label="Toggle password visibility">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
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

              {error && <div className="notice error">{error}</div>}

              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : <>Create account <ArrowRight size={15} /></>}
              </button>

              <div className="auth-divider"><span>or</span></div>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => { window.location.href = googleLoginUrl('member'); }}>
                <GoogleIcon /> Continue with Google
              </button>

              <p className="auth-switch">
                Already have an account?{' '}
                <button type="button" onClick={() => { setTab('login'); setError(''); }}>Sign in</button>
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
    <svg width="16" height="16" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
