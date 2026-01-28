// Small post-load patch layer to add UX fixes without rewriting popup.js.

const parseAuthValue = (authValue) => {
  if (!authValue) return null;
  if (typeof authValue === 'string') {
    const trimmed = authValue.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return {idToken: trimmed};
    }
  }
  return authValue;
};

const getAuthIdToken = (auth) => {
  if (!auth || typeof auth !== 'object') return '';
  return String(auth.idToken || auth.id_token || '').trim();
};

const normalizeEpochMs = (raw) => {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 1e12 ? n * 1000 : n;
};

const getAuthExpiryMs = (auth) => {
  if (!auth || typeof auth !== 'object') return null;
  return normalizeEpochMs(auth.expires_at ?? auth.expiresAt ?? auth.exp ?? 0);
};

const getJwtExpiryMs = (token) => {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  try {
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    return normalizeEpochMs(payload?.exp ?? 0);
  } catch {
    return null;
  }
};

const isAuthValid = (authValue) => {
  const auth = parseAuthValue(authValue);
  if (!auth || typeof auth !== 'object') return false;

  const idToken = getAuthIdToken(auth);
  if (!idToken) return false;

  const expiresAtMs = getAuthExpiryMs(auth) ?? getJwtExpiryMs(idToken);
  if (expiresAtMs != null) return expiresAtMs > Date.now();

  return true;
};

const enforceLoggedOutLocks = async () => {
  const {auth} = await chrome.storage.local.get({auth: null});
  if (isAuthValid(auth)) return;

  await chrome.storage.local.set({
    enabled: false,
    hosts: [],
    stealth_icon: false,
    auto_renew: false
  });

  const masterEnabled = document.getElementById('masterEnabled');
  const stealthIcon = document.getElementById('stealthIcon');
  if (masterEnabled) masterEnabled.checked = false;
  if (stealthIcon) stealthIcon.checked = false;
};

// Keep legacy `hosts` in sync with the boolean `enabled` so the UI state
// doesn't drift (some builds still compute "enabled everywhere" via hosts).
const normalizeEnabledHosts = async () => {
  const {auth, enabled, hosts} = await chrome.storage.local.get({auth: null, enabled: false, hosts: []});
  if (!isAuthValid(auth)) return;

  const hostList = Array.isArray(hosts) ? hosts : [];
  const hasStar = hostList.includes('*');

  if (enabled && !hasStar) {
    await chrome.storage.local.set({hosts: ['*']});
  } else if (!enabled && hostList.length > 0) {
    await chrome.storage.local.set({hosts: []});
  }
};

// Force checkbox UI to reflect storage values (popup scripts can be async and
// some older logic derived the checkbox state from `hosts` only).
const syncToggleUi = async () => {
  const {enabled, stealth_icon} = await chrome.storage.local.get({enabled: false, stealth_icon: false});
  const masterEnabled = document.getElementById('masterEnabled');
  const stealthIcon = document.getElementById('stealthIcon');
  if (masterEnabled) masterEnabled.checked = Boolean(enabled);
  if (stealthIcon) stealthIcon.checked = Boolean(stealth_icon);
};

const I18N = {
  en: {
    welcome_title: 'Welcome',
    welcome_desc: 'Hide your page activities. Sign in to start.',
    btn_login: 'Log in',
    btn_signup: 'Create account',
    login_title: 'Log in',
    login_desc: 'Use the same email/password you registered in Firebase Auth.',
    label_email: 'Email',
    label_password: 'Password',
    ph_password: 'Password',
    btn_back: 'Back',
    btn_forgot_pw: 'Forgot password?',
    signup_title: 'Create account',
    signup_desc: 'We will send a verification email. You must verify before you can log in.',
    label_password_confirm: 'Confirm password',
    ph_password_confirm: 'Confirm password',
    btn_create: 'Create',
    btn_already_have: 'Already have an account?',
    forgot_title: 'Reset password',
    forgot_desc: 'We will email you a password reset link.',
    btn_send_reset: 'Send reset email',
    app_title: 'Dashboard (Test)',
    label_membership: 'Membership',
    label_devices_online: 'Devices signed in',
    toggle_hide_activity: 'Hide activity',
    toggle_invisible_mode: 'Invisible mode',
    toggle_auto_renew: 'Auto renew monthly',
    btn_menu: 'Menu',
    btn_refresh: 'Refresh',
    btn_logout: 'Log out',
    menu_title: 'Menu',
    menu_desc: 'Billing and account actions.',
    menu_contact_prefix: 'Want e-Transfer / WeChat Pay / Alipay? Contact',
    label_payment: 'Payment',
    plan_subscription_monthly: 'Monthly subscription (CAD 30)',
    payment_note_sub: 'Renews monthly until canceled.',
    btn_buy_30_days: 'Buy 30 days',
    btn_subscribe_monthly: 'Subscribe monthly',
    btn_subscribe: 'Subscribe',
    btn_payments_history: 'Payments history',
    btn_legal: 'Legal',
    btn_logout_all: 'Log out all devices',
    legal_title: 'Legal',
    legal_desc: 'Privacy policy, terms, and license/EULA.',
    btn_privacy: 'Privacy Policy',
    btn_terms: 'Terms of Service',
    btn_contact: 'Contact',
    btn_view_eula: 'View EULA / License',
    payments_title: 'Payments',
    payments_desc: 'Recent Stripe payments linked to your account.',
    msg_opening_stripe: 'Opening Stripe checkout...',
    msg_missing_login: 'Please log in first.',
    msg_missing_device_id: 'Missing device id. Please reopen the popup.',
    msg_checkout_failed: 'Checkout failed: '
  },
  zh: {
    welcome_title: '欢迎',
    welcome_desc: '隐藏你的页面活动。登录后开始使用。',
    btn_login: '登录',
    btn_signup: '注册',
    login_title: '登录',
    login_desc: '使用你在 Firebase Auth 注册的邮箱和密码。',
    label_email: '邮箱',
    label_password: '密码',
    ph_password: '密码',
    btn_back: '返回',
    btn_forgot_pw: '忘记密码？',
    signup_title: '注册',
    signup_desc: '我们会发送验证邮件。验证后才能登录。',
    label_password_confirm: '确认密码',
    ph_password_confirm: '确认密码',
    btn_create: '创建',
    btn_already_have: '已有账号？',
    forgot_title: '重置密码',
    forgot_desc: '我们会发送密码重置链接到你的邮箱。',
    btn_send_reset: '发送重置邮件',
    app_title: '控制台',
    label_membership: '会员状态',
    label_devices_online: '已登录设备',
    toggle_hide_activity: '隐藏活动',
    toggle_invisible_mode: '隐身模式',
    btn_menu: '菜单',
    btn_refresh: '刷新',
    btn_logout: '退出登录',
    menu_title: '菜单',
    menu_desc: '账单与账号操作。',
    menu_contact_prefix: '想用电邮转账/微信/支付宝？联系',
    btn_buy_30_days: '购买 30 天',
    btn_payments_history: '支付记录',
    btn_legal: '法律',
    btn_logout_all: '退出所有设备',
    legal_title: '法律',
    legal_desc: '隐私政策、条款与许可/EULA。',
    btn_privacy: '隐私政策',
    btn_terms: '服务条款',
    btn_contact: '联系',
    btn_view_eula: '查看 EULA / 许可',
    payments_title: '支付',
    payments_desc: '与你账号关联的 Stripe 支付记录。'
  }
};

// Force known-good Chinese translations (avoid mojibake if the file encoding is mis-detected anywhere).
I18N.zh = {
  welcome_title: '\u6b22\u8fce',
  welcome_desc: '\u9690\u85cf\u4f60\u7684\u9875\u9762\u6d3b\u52a8\u3002\u767b\u5f55\u540e\u5f00\u59cb\u4f7f\u7528\u3002',
  btn_login: '\u767b\u5f55',
  btn_signup: '\u6ce8\u518c',
  login_title: '\u767b\u5f55',
  login_desc: '\u4f7f\u7528\u4f60\u5728 Firebase Auth \u6ce8\u518c\u7684\u90ae\u7bb1\u548c\u5bc6\u7801\u3002',
  label_email: '\u90ae\u7bb1',
  label_password: '\u5bc6\u7801',
  ph_password: '\u5bc6\u7801',
  btn_back: '\u8fd4\u56de',
  btn_forgot_pw: '\u5fd8\u8bb0\u5bc6\u7801\uff1f',
  signup_title: '\u6ce8\u518c',
  signup_desc: '\u6211\u4eec\u4f1a\u53d1\u9001\u9a8c\u8bc1\u90ae\u4ef6\u3002\u9a8c\u8bc1\u540e\u624d\u80fd\u767b\u5f55\u3002',
  label_password_confirm: '\u786e\u8ba4\u5bc6\u7801',
  ph_password_confirm: '\u786e\u8ba4\u5bc6\u7801',
  btn_create: '\u521b\u5efa',
  btn_already_have: '\u5df2\u6709\u8d26\u53f7\uff1f',
  forgot_title: '\u91cd\u7f6e\u5bc6\u7801',
  forgot_desc: '\u6211\u4eec\u4f1a\u53d1\u9001\u5bc6\u7801\u91cd\u7f6e\u94fe\u63a5\u5230\u4f60\u7684\u90ae\u7bb1\u3002',
  btn_send_reset: '\u53d1\u9001\u91cd\u7f6e\u90ae\u4ef6',
  app_title: '\u63a7\u5236\u53f0',
  label_membership: '\u4f1a\u5458',
  label_devices_online: '\u5df2\u767b\u5f55\u8bbe\u5907',
  toggle_hide_activity: '\u9690\u85cf\u6d3b\u52a8',
  toggle_invisible_mode: '\u9690\u8eab\u6a21\u5f0f',
  toggle_auto_renew: '\u6bcf\u6708\u81ea\u52a8\u7eed\u8d39',
  btn_menu: '\u83dc\u5355',
  btn_refresh: '\u5237\u65b0',
  btn_logout: '\u9000\u51fa\u767b\u5f55',
  menu_title: '\u83dc\u5355',
  menu_desc: '\u8d26\u5355\u4e0e\u8d26\u53f7\u64cd\u4f5c\u3002',
  menu_contact_prefix: '\u60f3\u7528\u7535\u90ae\u8f6c\u8d26/\u5fae\u4fe1/\u652f\u4ed8\u5b9d\uff1f\u8054\u7cfb',
  label_payment: '\u652f\u4ed8',
  plan_subscription_monthly: '\u6bcf\u6708\u8ba2\u9605\uff08CAD 30\uff09',
  payment_note_sub: '\u6bcf\u6708\u81ea\u52a8\u7eed\u8d39\uff0c\u53ef\u968f\u65f6\u53d6\u6d88\u3002',
  btn_buy_30_days: '\u8d2d\u4e70 30 \u5929',
  btn_subscribe_monthly: '\u6bcf\u6708\u8ba2\u9605',
  btn_subscribe: '\u8ba2\u9605',
  btn_payments_history: '\u652f\u4ed8\u8bb0\u5f55',
  btn_legal: '\u6cd5\u5f8b',
  btn_logout_all: '\u9000\u51fa\u6240\u6709\u8bbe\u5907',
  legal_title: '\u6cd5\u5f8b',
  legal_desc: '\u9690\u79c1\u653f\u7b56\u3001\u6761\u6b3e\u4e0e\u8bb8\u53ef/EULA\u3002',
  btn_privacy: '\u9690\u79c1\u653f\u7b56',
  btn_terms: '\u670d\u52a1\u6761\u6b3e',
  btn_contact: '\u8054\u7cfb',
  btn_view_eula: '\u67e5\u770b EULA / \u8bb8\u53ef',
  payments_title: '\u652f\u4ed8',
  payments_desc: '\u4e0e\u4f60\u8d26\u53f7\u5173\u8054\u7684 Stripe \u652f\u4ed8\u8bb0\u5f55\u3002',
  msg_opening_stripe: '\u6b63\u5728\u6253\u5f00 Stripe \u652f\u4ed8\u9875\u9762...',
  msg_missing_login: '\u8bf7\u5148\u767b\u5f55\u3002',
  msg_missing_device_id: '\u7f3a\u5c11\u8bbe\u5907 ID\uff0c\u8bf7\u91cd\u65b0\u6253\u5f00\u6269\u5c55\u3002',
  msg_checkout_failed: '\u652f\u4ed8\u521b\u5efa\u5931\u8d25\uff1a'
};

const getLang = async () => {
  const {ui_lang} = await chrome.storage.local.get({ui_lang: 'en'});
  return ui_lang === 'zh' ? 'zh' : 'en';
};

const applyI18n = (lang) => {
  const dict = I18N[lang] || I18N.en;
  document.documentElement.lang = lang === 'zh' ? 'zh' : 'en';

  for (const el of document.querySelectorAll('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    const val = dict[key] ?? I18N.en[key];
    if (typeof val === 'string') el.textContent = val;
  }

  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = dict[key] ?? I18N.en[key];
    if (typeof val === 'string') el.setAttribute('placeholder', val);
  }

  const langToggle = document.getElementById('langToggle');
  if (langToggle) {
    langToggle.textContent = lang === 'zh' ? '中文' : 'EN';
    langToggle.title = lang === 'zh' ? '语言' : 'Language';
  }
};

const initLangToggle = async () => {
  const langToggle = document.getElementById('langToggle');
  if (!langToggle) return;

  const lang = await getLang();
  applyI18n(lang);

  langToggle.addEventListener('click', async () => {
    const next = (await getLang()) === 'zh' ? 'en' : 'zh';
    await chrome.storage.local.set({ui_lang: next});
    applyI18n(next);
  });
};

const bootstrapStateLocks = async () => {
  await enforceLoggedOutLocks();
  await normalizeEnabledHosts();
  await syncToggleUi();
};

bootstrapStateLocks().catch(() => {});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.auth || changes.enabled || changes.hosts || changes.stealth_icon) {
    bootstrapStateLocks().catch(() => {});
  }
});

initLangToggle().catch(() => {});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (!changes.ui_lang) return;
  getLang()
    .then((lang) => {
      applyI18n(lang);
    })
    .catch(() => {});
});

const ensureDeviceIdPatch = async () => {
  const {device_id} = await chrome.storage.local.get({device_id: ''});
  const trimmed = String(device_id || '').trim();
  if (trimmed) return trimmed;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  await chrome.storage.local.set({device_id: hex});
  return hex;
};

const setMenuMsg = (text, kind = '') => {
  const el = document.getElementById('menuMsg');
  if (!el) return;
  el.textContent = text || '';
  el.className = `msg${kind ? ` ${kind}` : ''}`;
  el.style.display = text ? 'block' : 'none';
};

const initBilling = async () => {
  const planEl = document.getElementById('billingPlan');
  const btnUpgrade = document.getElementById('btnUpgrade');
  if (!btnUpgrade) return;

  const {billing_plan} = await chrome.storage.local.get({billing_plan: 'sub'});
  if (planEl && (billing_plan === 'sub' || billing_plan === 'one_time')) {
    planEl.value = billing_plan;
  }
  if (planEl) {
    planEl.addEventListener('change', async () => {
      await chrome.storage.local.set({billing_plan: planEl.value});
    });
  }

  // Capture click so we can override the bundled handler for subscriptions.
  btnUpgrade.addEventListener(
    'click',
    async (e) => {
      const plan = planEl ? String(planEl.value || 'sub') : 'sub';
      if (plan !== 'sub') return; // allow hidden one-time module to be re-enabled later

      e.preventDefault();
      e.stopImmediatePropagation();

      const lang = await getLang();
      const dict = I18N[lang] || I18N.en;

      const {auth, backendUrl} = await chrome.storage.local.get({auth: null, backendUrl: ''});
      if (!isAuthValid(auth)) {
        setMenuMsg(dict.msg_missing_login || I18N.en.msg_missing_login, 'err');
        await enforceLoggedOutLocks().catch(() => {});
        return;
      }

      const authObj = parseAuthValue(auth);
      const token = getAuthIdToken(authObj);
      if (!token) {
        setMenuMsg(dict.msg_missing_login || I18N.en.msg_missing_login, 'err');
        return;
      }

      const deviceId = await ensureDeviceIdPatch().catch(() => '');
      if (!deviceId) {
        setMenuMsg(dict.msg_missing_device_id || I18N.en.msg_missing_device_id, 'err');
        return;
      }

      const baseUrl = (
        String(backendUrl || '').trim() ||
        (typeof CHUROMI_DEFAULTS === 'object' && CHUROMI_DEFAULTS.backendUrl) ||
        ''
      ).replace(/\/$/, '');

      if (!baseUrl) {
        setMenuMsg((dict.msg_checkout_failed || I18N.en.msg_checkout_failed) + 'Backend URL', 'err');
        return;
      }

      setMenuMsg(dict.msg_opening_stripe || I18N.en.msg_opening_stripe, 'ok');
      try {
        const res = await fetch(`${baseUrl}/api/billing/checkout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-device-id': deviceId
          },
          body: JSON.stringify({auto_renew: true})
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.url) {
          const msg = data?.error || `HTTP ${res.status}`;
          throw new Error(msg);
        }

        await chrome.storage.local.set({
          stripe_last_session_id: String(data.session_id || ''),
          stripe_last_session_created_at: Date.now()
        });

        await chrome.tabs.create({url: String(data.url)});
        setMenuMsg('', '');
      } catch (err) {
        setMenuMsg(
          (dict.msg_checkout_failed || I18N.en.msg_checkout_failed) + String(err?.message || err),
          'err'
        );
      }
    },
    true
  );
};

initBilling().catch(() => {});
