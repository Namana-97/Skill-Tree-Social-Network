/**
 * auth-modal.js — Drop-in auth modal for SkillForge.
 * Include AFTER api.js on any page:
 *   <script src="api.js"></script>
 *   <script src="auth-modal.js"></script>
 *
 * Then call:
 *   AuthModal.show()
 *   AuthModal.requireAuth()
 */

const AuthModal = (() => {
  let overlay = null;

  function ensureMounted() {
    if (overlay) return;

    const style = document.createElement('style');
    style.textContent = `
      #sf-auth-overlay {
        position: fixed;
        inset: 0;
        background: rgba(26, 26, 26, 0.8);
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(6px);
      }
      #sf-auth-overlay.open { display: flex; }
      #sf-auth-box {
        position: relative;
        background: #F5F0E8;
        border: 3px solid #1A1A1A;
        box-shadow: 8px 8px 0 #1A1A1A;
        padding: 2.5rem;
        width: 420px;
        max-width: 92vw;
        animation: sfPop .3s cubic-bezier(.34,1.56,.64,1);
      }
      @keyframes sfPop {
        from { transform: scale(.85); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      #sf-auth-box h2 {
        font-family: 'Bangers', cursive;
        font-size: 2rem;
        letter-spacing: 3px;
        color: #1A1A1A;
        text-shadow: 2px 2px 0 #F5C842;
        margin-bottom: 1.5rem;
      }
      .sf-tabs {
        display: flex;
        gap: 0;
        margin-bottom: 1.5rem;
        border: 3px solid #1A1A1A;
      }
      .sf-tab {
        flex: 1;
        font-family: 'Bangers', cursive;
        font-size: .95rem;
        letter-spacing: 2px;
        padding: .5rem;
        border: none;
        background: white;
        color: rgba(26, 26, 26, .4);
        cursor: pointer;
      }
      .sf-tab.active {
        background: #1A1A1A;
        color: #F5C842;
      }
      .sf-field { margin-bottom: 1rem; }
      .sf-field label {
        font-family: 'Oswald', sans-serif;
        font-size: .65rem;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
        display: block;
        margin-bottom: .35rem;
      }
      .sf-field input {
        width: 100%;
        border: 3px solid #1A1A1A;
        padding: .6rem .8rem;
        font-family: 'DM Sans', sans-serif;
        font-size: .9rem;
        outline: none;
        background: white;
        box-sizing: border-box;
      }
      .sf-field input:focus {
        border-color: #E63B3B;
        box-shadow: 3px 3px 0 #F5C842;
      }
      .sf-submit {
        width: 100%;
        font-family: 'Bangers', cursive;
        font-size: 1.1rem;
        letter-spacing: 3px;
        background: #E63B3B;
        color: white;
        border: 3px solid #1A1A1A;
        padding: .6rem;
        cursor: pointer;
        box-shadow: 4px 4px 0 #1A1A1A;
        margin-top: .5rem;
        transition: transform .15s, box-shadow .15s;
      }
      .sf-submit:hover {
        transform: translate(-2px, -2px);
        box-shadow: 6px 6px 0 #1A1A1A;
      }
      .sf-submit:disabled {
        opacity: .5;
        cursor: not-allowed;
        transform: none;
      }
      .sf-error {
        font-family: 'Permanent Marker', cursive;
        font-size: .75rem;
        color: #E63B3B;
        margin-top: .75rem;
        text-align: center;
        min-height: 1.2rem;
      }
      .sf-close {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: rgba(26, 26, 26, .4);
        font-family: 'Bangers', cursive;
      }
    `;
    document.head.appendChild(style);

    overlay = document.createElement('div');
    overlay.id = 'sf-auth-overlay';
    overlay.innerHTML = `
      <div id="sf-auth-box">
        <button class="sf-close" id="sf-close">✕</button>
        <h2 id="sf-auth-title">SIGN IN</h2>

        <div class="sf-tabs">
          <button class="sf-tab active" data-tab="login">LOGIN</button>
          <button class="sf-tab" data-tab="register">REGISTER</button>
        </div>

        <div id="sf-login-form">
          <div class="sf-field">
            <label>Email</label>
            <input type="email" id="sf-email" placeholder="aryan@example.com" />
          </div>
          <div class="sf-field">
            <label>Password</label>
            <input type="password" id="sf-password" placeholder="••••••••" />
          </div>
          <button class="sf-submit" id="sf-login-btn">LOGIN →</button>
          <div class="sf-error" id="sf-login-err"></div>
        </div>

        <div id="sf-register-form" style="display:none">
          <div class="sf-field">
            <label>Display Name</label>
            <input type="text" id="sf-dname" placeholder="Aryan Kumar" />
          </div>
          <div class="sf-field">
            <label>Username</label>
            <input type="text" id="sf-uname" placeholder="aryan" />
          </div>
          <div class="sf-field">
            <label>Email</label>
            <input type="email" id="sf-remail" placeholder="aryan@example.com" />
          </div>
          <div class="sf-field">
            <label>Password</label>
            <input type="password" id="sf-rpassword" placeholder="min 6 characters" />
          </div>
          <div class="sf-field">
            <label>Role Title</label>
            <input type="text" id="sf-role" placeholder="Full-Stack Developer" />
          </div>
          <button class="sf-submit" id="sf-register-btn">CREATE ACCOUNT →</button>
          <div class="sf-error" id="sf-register-err"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.sf-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.sf-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const isLogin = tab.dataset.tab === 'login';
        document.getElementById('sf-login-form').style.display = isLogin ? '' : 'none';
        document.getElementById('sf-register-form').style.display = isLogin ? 'none' : '';
        document.getElementById('sf-auth-title').textContent = isLogin ? 'SIGN IN' : 'JOIN UP';
      });
    });

    document.getElementById('sf-close').addEventListener('click', hide);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) hide();
    });

    document.getElementById('sf-login-btn').addEventListener('click', handleLogin);
    document.getElementById('sf-register-btn').addEventListener('click', handleRegister);

    ['sf-email', 'sf-password'].forEach(id => {
      document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') handleLogin();
      });
    });

    ['sf-uname', 'sf-remail', 'sf-rpassword', 'sf-dname', 'sf-role'].forEach(id => {
      document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') handleRegister();
      });
    });
  }

  function show() {
    ensureMounted();
    overlay.classList.add('open');
  }

  function hide() {
    if (overlay) overlay.classList.remove('open');
  }

  function requireAuth() {
    if (!API.isLoggedIn()) {
      show();
      return false;
    }
    return true;
  }

  function currentUserId() {
    return parseInt(localStorage.getItem('sf_user_id') || '0', 10) || null;
  }

  async function handleLogin() {
    ensureMounted();

    const btn = document.getElementById('sf-login-btn');
    const err = document.getElementById('sf-login-err');
    const email = document.getElementById('sf-email').value.trim();
    const password = document.getElementById('sf-password').value;

    err.textContent = '';
    btn.disabled = true;
    btn.textContent = 'LOGGING IN...';

    try {
      const res = await API.login(email, password);
      const user = res.user || res;

      if (!user || !user.id) {
        throw new Error('Login succeeded but no user was returned.');
      }

      localStorage.setItem('sf_user_id', user.id);
      hide();
      document.dispatchEvent(new CustomEvent('sf:login', { detail: user }));
    } catch (e) {
      err.textContent = e.message || 'Login failed.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'LOGIN →';
    }
  }

  async function handleRegister() {
    ensureMounted();

    const btn = document.getElementById('sf-register-btn');
    const err = document.getElementById('sf-register-err');

    const username = document.getElementById('sf-uname').value.trim();
    const email = document.getElementById('sf-remail').value.trim();
    const password = document.getElementById('sf-rpassword').value;
    const display_name = document.getElementById('sf-dname').value.trim();
    const role_title = document.getElementById('sf-role').value.trim();

    err.textContent = '';
    btn.disabled = true;
    btn.textContent = 'CREATING...';

    try {
      const res = await API.register(username, email, password, display_name, role_title);
      const user = res.user || res;

      if (!user || !user.id) {
        throw new Error('Registration succeeded but no user was returned.');
      }

      localStorage.setItem('sf_user_id', user.id);
      hide();
      document.dispatchEvent(new CustomEvent('sf:login', { detail: user }));
    } catch (e) {
      err.textContent = e.message || 'Registration failed.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'CREATE ACCOUNT →';
    }
  }

  return {
    show,
    hide,
    requireAuth,
    currentUserId,
    handleLogin,
    handleRegister,
  };
})();
