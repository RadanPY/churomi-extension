/* global CHUROMI_DEFAULTS */

(() => {
const $ = (id) => document.getElementById(id);

const STORAGE_DEFAULTS = {
  backendUrl:
    typeof CHUROMI_DEFAULTS === 'object' && CHUROMI_DEFAULTS.backendUrl ? CHUROMI_DEFAULTS.backendUrl : 'https://api.churomi.com',
  firebaseApiKey:
    typeof CHUROMI_DEFAULTS === 'object' && CHUROMI_DEFAULTS.firebaseApiKey ? CHUROMI_DEFAULTS.firebaseApiKey : '',
  device_id: '',
  authEmail: '',
  auth: null,
  membership: null,
  device_usage: null,
  membership_checked_at: 0,
  last_membership_error: '',
  enabled: false,
  hosts: [],
  stealth_icon: false,
  stealth_icon_theme: 'light',
  billing_plan: 'sub',
  stripe_last_session_id: '',
  stripe_last_session_created_at: 0,
  quick_test_tab_id: 0,
  quick_test_started_at: 0,
  remember_me: true,

  // Compatibility toggles (hide activity techniques).
  spoof_visibility: true,
  spoof_hidden: true,
  spoof_visibility_state: true,
  spoof_webkit_hidden: true,
  spoof_webkit_visibility_state: true,
  spoof_has_focus: true,
  block_visibility_events: true,
  block_visibilitychange: true,
  block_webkitvisibilitychange: true,
  block_mozvisibilitychange: true,
  block_pagehide: true,
  block_focus_events: true,
  block_focusinout: true,
  keep_animation: true,
  block_pointercapture: true,
  block_mouseleave: true,
  block_mouseout: true
};

const screens = Array.from(document.querySelectorAll('[data-screen]')).reduce((acc, el) => {
  acc[el.dataset.screen] = el;
  return acc;
}, {});

const els = {
  topSubtitle: $('topSubtitle'),
  backendDot: $('backendDot'),
  backendLabel: $('backendLabel'),

  btnGoLogin: $('btnGoLogin'),
  btnGoSignup: $('btnGoSignup'),
  welcomeMsg: $('welcomeMsg'),

  loginEmail: $('loginEmail'),
  loginPassword: $('loginPassword'),
  loginRemember: $('loginRemember'),
  btnLogin: $('btnLogin'),
  btnBackFromLogin: $('btnBackFromLogin'),
  btnGoForgotFromLogin: $('btnGoForgotFromLogin'),
  btnGoSignupFromLogin: $('btnGoSignupFromLogin'),
  loginMsg: $('loginMsg'),

  signupEmail: $('signupEmail'),
  signupPassword: $('signupPassword'),
  signupPassword2: $('signupPassword2'),
  btnSignup: $('btnSignup'),
  btnBackFromSignup: $('btnBackFromSignup'),
  btnGoLoginFromSignup: $('btnGoLoginFromSignup'),
  signupMsg: $('signupMsg'),

  forgotEmail: $('forgotEmail'),
  btnForgot: $('btnForgot'),
  btnBackFromForgot: $('btnBackFromForgot'),
  forgotMsg: $('forgotMsg'),

  appSubtitle: $('appSubtitle'),
  membershipDot: $('membershipDot'),
  membershipText: $('membershipText'),
  deviceText: $('deviceText'),
  masterEnabled: $('masterEnabled'),
  stealthIcon: $('stealthIcon'),
  stealthIconWrap: $('stealthIconWrap'),
  stealthIconTheme: $('stealthIconTheme'),
  functionLabel: $('functionLabel'),
  optSpoofVisibilityState: $('optSpoofVisibilityState'),
  optSpoofHidden: $('optSpoofHidden'),
  optSpoofWebkitVisibilityState: $('optSpoofWebkitVisibilityState'),
  optSpoofWebkitHidden: $('optSpoofWebkitHidden'),
  optSpoofHasFocus: $('optSpoofHasFocus'),
  optBlockVisibilityChange: $('optBlockVisibilityChange'),
  optBlockWebkitVisibilityChange: $('optBlockWebkitVisibilityChange'),
  optBlockMozVisibilityChange: $('optBlockMozVisibilityChange'),
  optBlockPageHide: $('optBlockPageHide'),
  optBlockFocusEvents: $('optBlockFocusEvents'),
  optBlockFocusInOut: $('optBlockFocusInOut'),
  optKeepAnimation: $('optKeepAnimation'),
  optBlockPointerCapture: $('optBlockPointerCapture'),
  optBlockMouseLeave: $('optBlockMouseLeave'),
  optBlockMouseOut: $('optBlockMouseOut'),
  btnCompatDefaults: $('btnCompatDefaults'),
  btnMenu: $('btnMenu'),
  btnMenuBack: $('btnMenuBack'),
  btnRefresh: $('btnRefresh'),
  btnLogout: $('btnLogout'),
  btnQuickTest: $('btnQuickTest'),
  appMsg: $('appMsg'),

  billingPlan: $('billingPlan'),
  btnUpgrade: $('btnUpgrade'),
  btnGuidedTour: $('btnGuidedTour'),
  btnPayments: $('btnPayments'),
  btnLegal: $('btnLegal'),
  btnLogoutAll: $('btnLogoutAll'),
  menuMsg: $('menuMsg'),

  btnLegalBack: $('btnLegalBack'),
  btnOpenPrivacy: $('btnOpenPrivacy'),
  btnOpenTerms: $('btnOpenTerms'),
  btnContact: $('btnContact'),
  btnOpenEula: $('btnOpenEula')
};

const paymentsEls = {
  list: $('paymentsList'),
  msg: $('paymentsMsg'),
  back: $('btnPaymentsBack'),
  refresh: $('btnPaymentsRefresh')
};

let currentPrefs = {...STORAGE_DEFAULTS};

const QUICK_TEST_UI = {
  idle: {className: 'test-idle', label: 'Test'},
  running: {className: 'test-running', label: 'Testing'},
  pass: {className: 'test-pass', label: 'Pass'},
  fail: {className: 'test-fail', label: 'Fail'}
};

let quickTestUiState = 'idle';

const isTestBuild = () => {
  try {
    const name = String(chrome.runtime.getManifest?.().name || '');
    return name.includes('(Test)');
  } catch {
    return false;
  }
};

const getDriverFactory = () => {
  try {
    // IIFE bundle exports as `window.driver.js.driver`.
    if (window.driver && window.driver.js && typeof window.driver.js.driver === 'function') return window.driver.js.driver;
    // Fallbacks for other build variants.
    if (typeof window.driver === 'function') return window.driver;
    if (window.driver && typeof window.driver.driver === 'function') return window.driver.driver;
  } catch {}
  return null;
};

const normalizeBackendUrl = (url) =>
  String(url || currentPrefs?.backendUrl || '').trim().replace(/\/$/, '');

const getSiteUrl = () =>
  String(
    (typeof CHUROMI_DEFAULTS === 'object' && CHUROMI_DEFAULTS.siteUrl) ? CHUROMI_DEFAULTS.siteUrl : 'https://churomi.com'
  )
    .trim()
    .replace(/\/$/, '');

const getApiKey = () => String(currentPrefs?.firebaseApiKey || '').trim();

const isExpiringSoon = (authValue, thresholdMs = 2 * 60 * 1000) => {
  const auth = parseAuthValue(authValue);
  if (!auth || typeof auth !== 'object') return true;
  const expiry = normalizeEpochMs(auth.exp ?? auth.expires_at ?? auth.expiresAt ?? 0) ?? getJwtExpiryMs(getAuthIdToken(auth)) ?? 0;
  if (!expiry) return true;
  return expiry - Date.now() < thresholdMs;
};

const firebaseRefreshToken = async (apiKey, refreshToken) => {
  const body = new URLSearchParams({grant_type: 'refresh_token', refresh_token: String(refreshToken || '')}).toString();
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Firebase refresh error (${res.status})`);
  return data;
};

const ensureFreshAuth = async () => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  currentPrefs = prefs;
  const apiKey = getApiKey();
  const auth = parseAuthValue(prefs.auth);
  if (!apiKey || !auth || typeof auth !== 'object') return null;
  if (!prefs.remember_me) return auth;

  const refreshToken = String(auth.refreshToken || '').trim();
  if (!refreshToken) return auth;
  if (!isExpiringSoon(auth)) return auth;

  const data = await firebaseRefreshToken(apiKey, refreshToken);
  const expiresIn = Number(data.expires_in || data.expiresIn || 3600);
  const exp = Date.now() + expiresIn * 1000 - 60_000;
  const nextAuth = {
    email: String(auth.email || prefs.authEmail || '').trim(),
    idToken: data.id_token || data.idToken,
    refreshToken: data.refresh_token || data.refreshToken || refreshToken,
    exp
  };
  await chrome.storage.local.set({auth: nextAuth});
  return nextAuth;
};

const setBusy = (elements, busy) => {
  for (const el of elements || []) {
    if (!el) continue;
    el.disabled = Boolean(busy);
  }
};

const setMsg = (el, msg = '', type = '') => {
  if (!el) return;
  el.textContent = msg || '';
  el.className = `msg${type ? ` ${type}` : ''}`;
  el.style.display = msg ? '' : 'none';
};

const updateStealthVisibility = (hideActivityOn) => {
  const row = els.stealthIconWrap?.closest?.('.row');
  if (!row) return;
  row.style.display = hideActivityOn ? '' : 'none';
};

const setStealthIcon = async (enabled) => {
  const next = Boolean(enabled);
  if (els.stealthIcon) els.stealthIcon.checked = next;
  await chrome.storage.local.set({stealth_icon: next});
  try {
    chrome.runtime.sendMessage({method: 'sync'});
  } catch {}
};

const setStealthIconTheme = async (theme) => {
  const next = theme === 'dark' ? 'dark' : 'light';
  if (els.stealthIconTheme) els.stealthIconTheme.value = next;
  await chrome.storage.local.set({stealth_icon_theme: next});
  try {
    chrome.runtime.sendMessage({method: 'sync'});
  } catch {}
};

const COMPAT_DEFAULTS = {
  spoof_visibility: true,
  spoof_hidden: true,
  spoof_visibility_state: true,
  spoof_webkit_hidden: true,
  spoof_webkit_visibility_state: true,
  spoof_has_focus: true,
  block_visibility_events: true,
  block_visibilitychange: true,
  block_webkitvisibilitychange: true,
  block_mozvisibilitychange: true,
  block_pagehide: true,
  block_focus_events: true,
  block_focusinout: true,
  keep_animation: true,
  block_pointercapture: true,
  block_mouseleave: true,
  block_mouseout: true
};

const computeLegacyCompat = (prefs) => {
  const spoofAny =
    Boolean(prefs.spoof_visibility_state) ||
    Boolean(prefs.spoof_hidden) ||
    Boolean(prefs.spoof_webkit_visibility_state) ||
    Boolean(prefs.spoof_webkit_hidden) ||
    Boolean(prefs.spoof_has_focus);
  const blockAny =
    Boolean(prefs.block_visibilitychange) ||
    Boolean(prefs.block_webkitvisibilitychange) ||
    Boolean(prefs.block_mozvisibilitychange) ||
    Boolean(prefs.block_pagehide);
  return {spoof_visibility: spoofAny, block_visibility_events: blockAny};
};

const loadCompat = async () => chrome.storage.local.get(COMPAT_DEFAULTS);

const renderCompat = async () => {
  const prefs = await loadCompat();
  if (els.optSpoofVisibilityState) els.optSpoofVisibilityState.checked = Boolean(prefs.spoof_visibility_state);
  if (els.optSpoofHidden) els.optSpoofHidden.checked = Boolean(prefs.spoof_hidden);
  if (els.optSpoofWebkitVisibilityState) els.optSpoofWebkitVisibilityState.checked = Boolean(prefs.spoof_webkit_visibility_state);
  if (els.optSpoofWebkitHidden) els.optSpoofWebkitHidden.checked = Boolean(prefs.spoof_webkit_hidden);
  if (els.optSpoofHasFocus) els.optSpoofHasFocus.checked = Boolean(prefs.spoof_has_focus);

  if (els.optBlockVisibilityChange) els.optBlockVisibilityChange.checked = Boolean(prefs.block_visibilitychange);
  if (els.optBlockWebkitVisibilityChange) els.optBlockWebkitVisibilityChange.checked = Boolean(prefs.block_webkitvisibilitychange);
  if (els.optBlockMozVisibilityChange) els.optBlockMozVisibilityChange.checked = Boolean(prefs.block_mozvisibilitychange);
  if (els.optBlockPageHide) els.optBlockPageHide.checked = Boolean(prefs.block_pagehide);
  if (els.optBlockFocusEvents) els.optBlockFocusEvents.checked = Boolean(prefs.block_focus_events);
  if (els.optBlockFocusInOut) els.optBlockFocusInOut.checked = Boolean(prefs.block_focusinout);
  if (els.optKeepAnimation) els.optKeepAnimation.checked = Boolean(prefs.keep_animation);

  if (els.optBlockPointerCapture) els.optBlockPointerCapture.checked = Boolean(prefs.block_pointercapture);
  if (els.optBlockMouseLeave) els.optBlockMouseLeave.checked = Boolean(prefs.block_mouseleave);
  if (els.optBlockMouseOut) els.optBlockMouseOut.checked = Boolean(prefs.block_mouseout);
};

const saveCompatFromUI = async () => {
  const next = {
    spoof_visibility_state: Boolean(els.optSpoofVisibilityState?.checked),
    spoof_hidden: Boolean(els.optSpoofHidden?.checked),
    spoof_webkit_visibility_state: Boolean(els.optSpoofWebkitVisibilityState?.checked),
    spoof_webkit_hidden: Boolean(els.optSpoofWebkitHidden?.checked),
    spoof_has_focus: Boolean(els.optSpoofHasFocus?.checked),

    block_visibilitychange: Boolean(els.optBlockVisibilityChange?.checked),
    block_webkitvisibilitychange: Boolean(els.optBlockWebkitVisibilityChange?.checked),
    block_mozvisibilitychange: Boolean(els.optBlockMozVisibilityChange?.checked),
    block_pagehide: Boolean(els.optBlockPageHide?.checked),
    block_focus_events: Boolean(els.optBlockFocusEvents?.checked),
    block_focusinout: Boolean(els.optBlockFocusInOut?.checked),
    keep_animation: Boolean(els.optKeepAnimation?.checked),

    block_pointercapture: Boolean(els.optBlockPointerCapture?.checked),
    block_mouseleave: Boolean(els.optBlockMouseLeave?.checked),
    block_mouseout: Boolean(els.optBlockMouseOut?.checked)
  };

  const legacy = computeLegacyCompat(next);
  await chrome.storage.local.set({...next, ...legacy});
  try {
    chrome.runtime.sendMessage({method: 'sync'});
  } catch {}
};

const setScreen = (name, {message, messageType} = {}) => {
  Object.entries(screens).forEach(([k, el]) => el.classList.toggle('is-active', k === name));
  if (!message) return;
  const target =
    name === 'welcome'
      ? els.welcomeMsg
      : name === 'login'
        ? els.loginMsg
        : name === 'signup'
          ? els.signupMsg
          : name === 'forgot'
            ? els.forgotMsg
            : name === 'menu'
              ? els.menuMsg
              : name === 'payments'
                ? paymentsEls.msg
                : name === 'app'
                  ? els.appMsg
                  : null;
  if (target) setMsg(target, message, messageType || '');
};

const setQuickTestUi = (state) => {
  quickTestUiState = state in QUICK_TEST_UI ? state : 'idle';
  const el = els.btnQuickTest;
  if (!el) return;
  const next = QUICK_TEST_UI[quickTestUiState] || QUICK_TEST_UI.idle;
  el.classList.remove('test-idle', 'test-running', 'test-pass', 'test-fail');
  el.classList.add(next.className);
  el.textContent = next.label;
};

const getQuickTestState = async () => {
  const {quick_test_tab_id, quick_test_started_at} = await chrome.storage.local.get({
    quick_test_tab_id: 0,
    quick_test_started_at: 0
  });
  return {
    quick_test_tab_id: Number(quick_test_tab_id || 0),
    quick_test_started_at: Number(quick_test_started_at || 0)
  };
};

const setQuickTestTargetTab = async (tabId) => {
  await chrome.storage.local.set({
    quick_test_tab_id: Number(tabId || 0),
    quick_test_started_at: Date.now()
  });
};

const clearQuickTestTargetTab = async () => {
  await chrome.storage.local.set({quick_test_tab_id: 0, quick_test_started_at: 0});
};

const getActiveTabId = async () => {
  const tabs = await chrome.tabs.query({active: true, currentWindow: true});
  const tabId = tabs?.[0]?.id;
  if (!tabId) throw new Error('No active tab found. Open a normal website tab and try again.');
  return tabId;
};

const getQuickTestCandidateTabs = async () => {
  const {quick_test_tab_id} = await getQuickTestState();
  let activeTabId = 0;
  try {
    activeTabId = await getActiveTabId();
  } catch {}
  const ids = [];
  if (quick_test_tab_id) ids.push(quick_test_tab_id);
  if (activeTabId && activeTabId !== quick_test_tab_id) ids.push(activeTabId);
  return {ids, activeTabId};
};

const ensureQuickTestScripts = async (tabId) => {
  try {
    const hasPort = await chrome.scripting
      .executeScript({
        target: {tabId},
        world: 'MAIN',
        func: () => Boolean(document.getElementById('churomi-port'))
      })
      .then((r) => r?.[0]?.result)
      .catch(() => false);
    if (hasPort) return;
    await chrome.scripting.executeScript({target: {tabId}, world: 'ISOLATED', files: ['data/function/isolated.js']});
    await chrome.scripting.executeScript({target: {tabId}, world: 'MAIN', files: ['data/function/main.js']});
  } catch {}
};

const quickSelfTestAction = async (tabId, action) => {
  const results = await chrome.scripting.executeScript({
    target: {tabId},
    world: 'MAIN',
    args: [String(action || '')],
    func: (actionName) => {
      const KEY = '__churomiQuickTest';

      const cleanup = (s) => {
        try { if (s && typeof s.stop === 'function') s.stop(); } catch {}
        try { delete window[KEY]; } catch {}
      };

      const summarize = (s) => {
        const events = Array.isArray(s?.events) ? s.events.slice(0, 3) : [];
        const last = events[0] || null;
        return {
          exists: Boolean(s),
          startedAt: Number(s?.startedAt || 0),
          done: Boolean(s?.done),
          events,
          lastEvent: last?.name || '',
          lastAt: Number(last?.at || 0)
        };
      };

      const existing = window[KEY];

      if (actionName === 'peek') return summarize(existing);
      if (actionName === 'finish') {
        const summary = summarize(existing);
        cleanup(existing);
        return summary;
      }

      // start
      cleanup(existing);

      const state = {startedAt: Date.now(), done: false, events: []};
      const record = (name) => {
        if (state.done) return;
        state.done = true;
        state.events.unshift({name, at: Date.now()});
      };

      const onFocusIn = () => record('focusin');
      const onFocusOut = () => record('focusout');
      const onMouseLeave = () => record('mouseleave');

      document.addEventListener('focusin', onFocusIn, true);
      document.addEventListener('focusout', onFocusOut, true);
      window.addEventListener('mouseleave', onMouseLeave, true);

      const timeoutId = setTimeout(() => {
        state.done = true;
      }, 15_000);

      state.stop = () => {
        try { clearTimeout(timeoutId); } catch {}
        try { document.removeEventListener('focusin', onFocusIn, true); } catch {}
        try { document.removeEventListener('focusout', onFocusOut, true); } catch {}
        try { window.removeEventListener('mouseleave', onMouseLeave, true); } catch {}
      };

      window[KEY] = state;
      return summarize(state);
    }
  });
  return results?.[0]?.result || null;
};

const runQuickSelfTestFlow = async () => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  if (!isEnabledEverywhere(prefs)) throw new Error('Enable Hide activity first, then run Test again.');

  const {ids, activeTabId} = await getQuickTestCandidateTabs();
  if (!ids.length) throw new Error('No active tab found. Open a normal website tab and try again.');

  for (const candidateId of ids) {
    const peek = await quickSelfTestAction(candidateId, 'peek').catch(() => null);
    if (peek?.exists) {
      const summary = await quickSelfTestAction(candidateId, 'finish');
      await clearQuickTestTargetTab();
      return {mode: 'finish', summary, tabId: candidateId};
    }
  }

  if (!activeTabId) throw new Error('No active tab found. Open a normal website tab and try again.');
  await ensureQuickTestScripts(activeTabId);
  const summary = await quickSelfTestAction(activeTabId, 'start');
  await setQuickTestTargetTab(activeTabId);
  return {mode: 'start', summary, tabId: activeTabId};
};

const syncQuickTestUiFromTab = async () => {
  if (!els.btnQuickTest) return;
  try {
    const {ids} = await getQuickTestCandidateTabs();
    let running = false;
    for (const candidateId of ids) {
      const peek = await quickSelfTestAction(candidateId, 'peek').catch(() => null);
      if (peek?.exists && !peek?.done) {
        running = true;
        break;
      }
    }
    if (running) setQuickTestUi('running');
    else if (quickTestUiState === 'running') setQuickTestUi('idle');
  } catch {
    // Ignore restricted pages (chrome:// etc).
    if (quickTestUiState === 'running') setQuickTestUi('idle');
  }
};

const startGuidedTour = async ({markSeen = true} = {}) => {
  const driverFactory = getDriverFactory();
  if (!driverFactory) return setMsg(els.menuMsg, 'Driver.js is missing. Rebuild the extension and reload it.', 'err');

  setScreen('app');

  const stealthRow = els.stealthIconWrap?.closest?.('.row') || null;
  const stealthRowDisplay = stealthRow ? stealthRow.style.display : '';
  if (stealthRow) stealthRow.style.display = '';

  const d = driverFactory({
    showProgress: true,
    allowClose: true,
    disableActiveInteraction: false,
    onDestroyed: () => {
      try {
        if (stealthRow) stealthRow.style.display = stealthRowDisplay;
      } catch {}
      try {
        updateStealthVisibility(isEnabledEverywhere(currentPrefs));
      } catch {}
    },
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done'
  });

  d.setSteps([
    {
      element: '#masterEnabledWrap',
      popover: {
        title: 'Hide activity',
        description: 'Turn this on to avoid quiz detection so you can tab out freely without getting detected.',
        side: 'top',
        align: 'start'
      }
    },
    {
      element: '#stealthIconWrap',
      popover: {
        title: 'Invisible mode',
        description: 'Optional UI setting. This is not designed to bypass monitoring or proctoring.',
        side: 'top',
        align: 'start'
      }
    },
    {
      element: '#btnMenu',
      popover: {
        title: 'Menu',
        description: 'Billing and account actions live here.'
      }
    },
    {
      element: '#btnRefresh',
      popover: {
        title: 'Refresh',
        description: 'Re-sync membership and device status if something looks wrong.'
      }
    },
    {
      element: '#btnLogout',
      popover: {
        title: 'Log out',
        description: 'Signs out this browser. Use “Log out all devices” in Menu for security.'
      }
    }
  ]);

  if (markSeen) await chrome.storage.local.set({driver_tour_seen_at: Date.now()});
  d.drive();
};

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
  if (raw == null) return null;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
      const parsed = Date.parse(trimmed);
      if (Number.isFinite(parsed)) return parsed;
    }
    raw = trimmed;
  }

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

const getMembershipValidUntilMs = (membership) =>
  normalizeEpochMs(
    membership?.valid_until ??
      membership?.validUntil ??
      membership?.expires_at ??
      membership?.expiresAt ??
      membership?.exp ??
      0
  ) ?? 0;

const isMembershipFlagActive = (membership) => {
  const m = membership && typeof membership === 'object' ? membership : null;
  if (!m) return false;

  if (m.active === true) return true;
  if (m.is_active === true || m.isActive === true) return true;

  const status = String(m.status ?? m.state ?? m.plan_status ?? '').trim().toLowerCase();
  if (!status) return false;
  return status === 'active' || status === 'trialing' || status === 'trial';
};

const isMembershipActive = (membership) => {
  if (!isMembershipFlagActive(membership)) return false;
  const validUntil = getMembershipValidUntilMs(membership);
  return validUntil === 0 || Date.now() < validUntil;
};

const isEnabledEverywhere = (prefs) => Boolean(prefs?.enabled) || (Array.isArray(prefs?.hosts) && prefs.hosts.includes('*'));

const hex = (buf) => Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');

const ensureDeviceId = async () => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  const existing = String(prefs.device_id || '').trim();
  if (existing) return existing;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = hex(bytes);
  await chrome.storage.local.set({device_id: id});
  return id;
};

const firebasePost = async (apiKey, method, body) => {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/${method}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Firebase error (${res.status})`);
  return data;
};

const lookupEmailVerified = async (apiKey, idToken) => {
  const data = await firebasePost(apiKey, 'accounts:lookup', {idToken});
  const user = Array.isArray(data.users) ? data.users[0] : null;
  return Boolean(user && user.emailVerified);
};

const sendEmailVerification = async (apiKey, idToken) =>
  firebasePost(apiKey, 'accounts:sendOobCode', {requestType: 'VERIFY_EMAIL', idToken});

const sendPasswordReset = async (apiKey, email) =>
  firebasePost(apiKey, 'accounts:sendOobCode', {requestType: 'PASSWORD_RESET', email});

const openUrl = async (url) => chrome.tabs.create({url}).catch(() => window.open(url, '_blank'));

const openPrivacy = async () => openUrl(`${getSiteUrl()}/privacy`);
const openTerms = async () => openUrl(`${getSiteUrl()}/terms`);
const openEula = async () => openUrl(chrome.runtime.getURL('data/legal.html'));
const openContact = async () => openUrl('mailto:churomi.app@gmail.com?subject=Churomi%20Support');

const setDot = (dotEl, ok) => {
  if (!dotEl) return;
  dotEl.style.background = ok ? '#22c55e' : '#ef4444';
};

const checkBackendHealth = async () => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  currentPrefs = prefs;
  const base = normalizeBackendUrl(prefs.backendUrl);
  if (!base) {
    setDot(els.backendDot, false);
    if (els.backendLabel) els.backendLabel.textContent = 'Server: missing URL';
    return;
  }

  try {
    const res = await fetch(`${base}/health`, {method: 'GET'});
    const ok = res.ok;
    setDot(els.backendDot, ok);
    if (els.backendLabel) els.backendLabel.textContent = ok ? 'Server: OK' : `Server: HTTP ${res.status}`;
  } catch {
    setDot(els.backendDot, false);
    if (els.backendLabel) els.backendLabel.textContent = 'Server: offline';
  }
};

const fmtMoney = (amountTotal, currency) => {
  const cur = String(currency || '').toUpperCase() || '';
  const cents = typeof amountTotal === 'number' ? amountTotal : null;
  if (cents == null || !cur) return '';
  const value = cents / 100;
  try {
    return new Intl.NumberFormat('en-CA', {style: 'currency', currency: cur}).format(value);
  } catch {
    return `${cur} ${value.toFixed(2)}`;
  }
};

const setMembershipUI = (membership) => {
  if (!els.membershipDot || !els.membershipText) return;
  const m = membership && typeof membership === 'object' ? membership : null;

  const validUntil = getMembershipValidUntilMs(m);
  const active = isMembershipActive(m);
  setDot(els.membershipDot, active);

  if (!m) {
    els.membershipText.textContent = 'Not checked yet.';
    return;
  }

  if (!validUntil) return (els.membershipText.textContent = active ? 'Active.' : 'Inactive.');

  const untilLocal = new Date(validUntil).toLocaleString();
  els.membershipText.textContent = active ? `Active until ${untilLocal}` : `Inactive (expired ${untilLocal})`;
};

const setDeviceUI = (deviceUsage, membership) => {
  if (!els.deviceText) return;
  const member = membership && typeof membership === 'object' ? membership : null;
  let raw =
    deviceUsage ??
    member?.device_usage ??
    member?.deviceUsage ??
    member?.device_usage_summary ??
    member?.deviceUsageSummary ??
    null;

  const toNum = (v) => {
    if (v == null) return Number.NaN;
    if (typeof v === 'number') return v;
    const s = typeof v === 'string' ? v.trim() : '';
    if (s && /^\d+(\.\d+)?$/.test(s)) return Number(s);
    const n = Number(v);
    return Number.isFinite(n) ? n : Number.NaN;
  };

  if (typeof raw === 'string') {
    const m = raw.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
    if (m) raw = {online: Number(m[1]), limit: Number(m[2])};
  }

  const usage = raw && typeof raw === 'object' ? raw : null;
  let used = NaN;
  let limit = NaN;

  if (!usage && !Array.isArray(raw)) {
    used = toNum(raw);
  }

  if (Array.isArray(raw)) {
    used = raw.filter((d) => d && (d.online === true || d.is_online === true || d.isOnline === true)).length;
    limit = Number.NaN;
  } else if (usage) {
    used = toNum(
      usage.online ??
        usage.devices_online ??
        usage.online_devices ??
        usage.onlineDevices ??
        usage.online_count ??
        usage.onlineCount ??
        usage.used ??
        usage.count ??
        usage.current ??
        usage.active ??
        usage.active_devices ??
        usage.activeDevices ??
        NaN
    );
    limit = toNum(
      usage.limit ??
        usage.max ??
        usage.device_limit ??
        usage.max_devices ??
        usage.allowed ??
        usage.quota ??
        usage.deviceLimit ??
        usage.maxDevices ??
        NaN
    );
  }

  if (!Number.isFinite(used)) {
    used = toNum(
      member?.devices_online ??
        member?.online_devices ??
        member?.onlineDevices ??
        member?.online_count ??
        member?.onlineCount ??
        member?.active_devices ??
        member?.activeDevices ??
        NaN
    );
  }
  if (!Number.isFinite(limit)) {
    limit = toNum(
      member?.device_limit ??
        member?.max_devices ??
        member?.maxDevices ??
        member?.allowed_devices ??
        member?.allowedDevices ??
        member?.quota ??
        NaN
    );
  }

  if (Number.isFinite(used) && Number.isFinite(limit)) {
    els.deviceText.textContent = `${Math.trunc(used)}/${Math.trunc(limit)}`;
  } else if (Number.isFinite(limit)) {
    els.deviceText.textContent = `-/${Math.trunc(limit)}`;
  } else if (Number.isFinite(used)) {
    els.deviceText.textContent = `${Math.trunc(used)}/-`;
  } else {
    els.deviceText.textContent = '-/-';
  }
};

const syncMembership = async () => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  currentPrefs = prefs;
  if (!isAuthValid(prefs.auth)) {
    // Try to restore a persisted session using refresh token.
    if (prefs.remember_me) await ensureFreshAuth().catch(() => {});
  }
  const freshPrefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  currentPrefs = freshPrefs;
  if (!isAuthValid(freshPrefs.auth)) throw new Error('Not signed in.');

  const base = normalizeBackendUrl(freshPrefs.backendUrl);
  if (!base) throw new Error('Backend URL missing.');

  const token = getAuthIdToken(parseAuthValue(freshPrefs.auth));
  const deviceId = await ensureDeviceId();

  const res = await fetch(`${base}/api/membership/status`, {
    headers: {Authorization: `Bearer ${token}`, 'x-device-id': deviceId}
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = String(data.error || `Membership failed (${res.status})`);
    await chrome.storage.local.set({last_membership_error: msg});
    throw new Error(msg);
  }

  const membership = data.membership || null;
  const deviceUsage =
    data.device_usage ??
    data.deviceUsage ??
    data.device_usage_summary ??
    data.deviceUsageSummary ??
    data.device ??
    membership?.device_usage ??
    membership?.deviceUsage ??
    membership?.device_usage_summary ??
    membership?.deviceUsageSummary ??
    membership?.device ??
    null;

  await chrome.storage.local.set({
    membership,
    device_usage: deviceUsage,
    membership_checked_at: Date.now(),
    last_membership_error: ''
  });

  return {...data, membership, device_usage: deviceUsage};
};

const confirmCheckoutIfNeeded = async () => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  currentPrefs = prefs;
  if (!isAuthValid(prefs.auth)) return false;

  const sessionId = String(prefs.stripe_last_session_id || '').trim();
  if (!sessionId) return false;

  const createdAt = Number(prefs.stripe_last_session_created_at || 0);
  if (createdAt && Date.now() - createdAt > 2 * 60 * 60 * 1000) {
    await chrome.storage.local.set({stripe_last_session_id: '', stripe_last_session_created_at: 0});
    return false;
  }

  const base = normalizeBackendUrl(prefs.backendUrl);
  const token = getAuthIdToken(parseAuthValue(prefs.auth));
  const deviceId = await ensureDeviceId();

  const res = await fetch(`${base}/api/billing/confirm`, {
    method: 'POST',
    headers: {Authorization: `Bearer ${token}`, 'x-device-id': deviceId, 'Content-Type': 'application/json'},
    body: JSON.stringify({session_id: sessionId})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 409) return false;
    await chrome.storage.local.set({stripe_last_session_id: '', stripe_last_session_created_at: 0});
    throw new Error(data.error || `Confirm failed (${res.status})`);
  }

  await chrome.storage.local.set({stripe_last_session_id: '', stripe_last_session_created_at: 0});
  return Boolean(data.applied);
};

const logout = async (message = 'Logged out.') => {
  await chrome.storage.local.set({
    auth: null,
    membership: null,
    device_usage: null,
    membership_checked_at: 0,
    enabled: false,
    hosts: [],
    stealth_icon: false,
    auto_renew: false
  });
  try {
    chrome.runtime.sendMessage({method: 'sync'});
  } catch {}

  if (els.masterEnabled) els.masterEnabled.checked = false;
  if (els.stealthIcon) els.stealthIcon.checked = false;
  if (els.topSubtitle) els.topSubtitle.textContent = 'Not signed in';
  setScreen('welcome', {message, messageType: ''});
  checkBackendHealth().catch(() => {});
};

const logoutAllDevices = async () => {
  setMsg(els.menuMsg, '', '');
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  currentPrefs = prefs;
  if (!isAuthValid(prefs.auth)) return logout();

  const base = normalizeBackendUrl(prefs.backendUrl);
  const token = getAuthIdToken(parseAuthValue(prefs.auth));
  const deviceId = await ensureDeviceId();

  setBusy([els.btnLogoutAll, els.btnMenuBack, els.btnUpgrade, els.btnPayments, els.btnLegal], true);
  setMsg(els.menuMsg, 'Logging out all devices...', '');
  try {
    const res = await fetch(`${base}/api/auth/logout_all`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'x-device-id': deviceId}
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Logout failed (${res.status})`);
    await logout('Logged out on all devices.');
  } catch (e) {
    setMsg(els.menuMsg, e.message || 'Logout all devices failed', 'err');
  } finally {
    setBusy([els.btnLogoutAll, els.btnMenuBack, els.btnUpgrade, els.btnPayments, els.btnLegal], false);
  }
};

const openCheckout = async ({autoRenew = false} = {}) => {
  setMsg(els.menuMsg, '', '');
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  currentPrefs = prefs;
  if (!isAuthValid(prefs.auth)) return setScreen('welcome', {message: 'Sign in to continue.', messageType: ''});

  const base = normalizeBackendUrl(prefs.backendUrl);
  const token = getAuthIdToken(parseAuthValue(prefs.auth));
  const deviceId = await ensureDeviceId();

  setBusy([els.btnUpgrade, els.btnMenuBack, els.btnLogoutAll, els.btnPayments, els.btnLegal], true);
  setMsg(els.menuMsg, 'Opening checkout...', '');
  try {
    const res = await fetch(`${base}/api/billing/checkout`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'x-device-id': deviceId, 'Content-Type': 'application/json'},
      body: JSON.stringify({auto_renew: Boolean(autoRenew)})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.url) throw new Error(data.error || `Checkout failed (${res.status})`);
    if (data.session_id) {
      await chrome.storage.local.set({
        stripe_last_session_id: String(data.session_id),
        stripe_last_session_created_at: Date.now()
      });
    }
    await chrome.tabs.create({url: String(data.url)}).catch(() => window.open(String(data.url), '_blank'));
    setMsg(els.menuMsg, 'Checkout opened. After payment, come back and click Refresh.', 'ok');
  } catch (e) {
    setMsg(els.menuMsg, e.message || 'Failed to start checkout', 'err');
  } finally {
    setBusy([els.btnUpgrade, els.btnMenuBack, els.btnLogoutAll, els.btnPayments, els.btnLegal], false);
  }
};

const loadPaymentHistory = async () => {
  if (!paymentsEls.list) return;
  setMsg(paymentsEls.msg, '', '');
  paymentsEls.list.innerHTML = '<div class="muted">Loading...</div>';

  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  currentPrefs = prefs;
  if (!isAuthValid(prefs.auth)) return setScreen('welcome', {message: 'Sign in to view payment history.', messageType: ''});

  const base = normalizeBackendUrl(prefs.backendUrl);
  const token = getAuthIdToken(parseAuthValue(prefs.auth));
  const deviceId = await ensureDeviceId();

  try {
    const res = await fetch(`${base}/api/billing/history?limit=20`, {
      headers: {Authorization: `Bearer ${token}`, 'x-device-id': deviceId}
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `History failed (${res.status})`);
    const sessions = Array.isArray(data.sessions) ? data.sessions : [];
    if (!sessions.length) {
      paymentsEls.list.innerHTML = '<div class="muted">No payments found yet.</div>';
      return;
    }

    paymentsEls.list.innerHTML = sessions
      .map((s) => {
        const when = s.created_at ? new Date(Number(s.created_at)).toLocaleString() : '';
        const amt = fmtMoney(s.amount_total, s.currency);
        const status = (s.payment_status || s.status || 'unknown').toString();
        const days = s.days ? `+${s.days}d` : '';
        const id = String(s.id || '');
        return `
          <div class="row" style="margin-top:8px;">
            <div>
              <div style="font-weight:900;">${amt || 'Payment'}</div>
              <div class="muted mono" style="font-size:11px;">${id}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:900;">${status}${days ? ` · ${days}` : ''}</div>
              <div class="muted" style="font-size:11px;">${when}</div>
            </div>
          </div>
        `;
      })
      .join('');
  } catch (e) {
    paymentsEls.list.innerHTML = '';
    setMsg(paymentsEls.msg, e.message || 'Failed to load payment history', 'err');
  }
};

const refreshApp = async ({forceMembershipSync = false} = {}) => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  currentPrefs = prefs;

  const signedIn = isAuthValid(prefs.auth);
  const featureEnabled = isEnabledEverywhere(prefs);
  const hideActivityOn = signedIn && featureEnabled;
  updateStealthVisibility(hideActivityOn);
  if (!hideActivityOn && prefs.stealth_icon) {
    await setStealthIcon(false);
  }

  if (!signedIn) {
    if (featureEnabled) {
      await chrome.storage.local.set({enabled: false, hosts: []});
      try {
        chrome.runtime.sendMessage({method: 'sync'});
      } catch {}
    }
    if (els.topSubtitle) els.topSubtitle.textContent = 'Ready';
    if (els.appSubtitle) els.appSubtitle.textContent = '';
    setScreen('welcome', {message: 'Sign in to start.', messageType: ''});
    return checkBackendHealth().catch(() => {});
  }

  if (els.topSubtitle) els.topSubtitle.textContent = 'Signed in';
  setScreen('app');

  const now = Date.now();
  let membership = signedIn ? prefs.membership : null;
  let deviceUsage = signedIn ? prefs.device_usage : null;
  const stale = !prefs.membership_checked_at || now - prefs.membership_checked_at > 5 * 60 * 1000;

  if (signedIn && forceMembershipSync) {
    try {
      await confirmCheckoutIfNeeded();
    } catch {}
  }

  if (signedIn && (forceMembershipSync || !membership || stale)) {
    if (els.appSubtitle) els.appSubtitle.textContent = 'Syncing...';
    try {
      const r = await syncMembership();
      membership = r?.membership || null;
      deviceUsage = r?.device_usage || null;
    } catch (e) {
      setMsg(els.appMsg, e.message || 'Failed to sync membership', 'err');
    }
  }

  setMembershipUI(membership);
  setDeviceUI(deviceUsage, membership);

  const membershipActive = signedIn ? isMembershipActive(membership) : false;

  if (els.appSubtitle) {
    els.appSubtitle.textContent = membershipActive ? 'Active' : 'Membership inactive';
  }
  if (els.masterEnabled) els.masterEnabled.disabled = !membershipActive;
  if (els.functionLabel) {
    if (!membershipActive) els.functionLabel.textContent = 'Locked';
    else els.functionLabel.textContent = featureEnabled ? '' : 'Off';
  }

  if (!membershipActive) {
    if (featureEnabled) {
      await chrome.storage.local.set({enabled: false, hosts: []});
      try {
        chrome.runtime.sendMessage({method: 'sync'});
      } catch {}
    }
    if (els.masterEnabled) els.masterEnabled.checked = false;
    const {last_membership_error} = await chrome.storage.local.get({last_membership_error: ''});
    const errText = String(last_membership_error || '').trim();
    if (!membership && errText) setMsg(els.appMsg, errText, 'err');
    else setMsg(els.appMsg, 'Membership inactive. Subscribe to enable Hide activity.', 'err');
  } else {
    setMsg(els.appMsg, '', '');
  }
};

const doLogin = async () => {
  currentPrefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  const apiKey = getApiKey();
  const email = (els.loginEmail?.value || '').trim();
  const password = els.loginPassword?.value || '';
  const rememberMe = els.loginRemember ? Boolean(els.loginRemember.checked) : true;

  if (!apiKey) return setMsg(els.loginMsg, 'Missing Firebase API key. Set it in Options.', 'err');
  if (!email || !password) return setMsg(els.loginMsg, 'Enter email and password.', 'err');

  setBusy([els.btnLogin, els.btnBackFromLogin, els.btnGoForgotFromLogin, els.btnGoSignupFromLogin], true);
  setMsg(els.loginMsg, 'Logging in...', '');
  try {
    await chrome.storage.local.set({authEmail: email, remember_me: rememberMe});
    const data = await firebasePost(apiKey, 'accounts:signInWithPassword', {email, password, returnSecureToken: true});

    const exp = Date.now() + Number(data.expiresIn || 3600) * 1000 - 60_000;
    const auth = {email, idToken: data.idToken, refreshToken: rememberMe ? (data.refreshToken || null) : null, exp};

    const verified = await lookupEmailVerified(apiKey, auth.idToken);
    if (!verified) {
      try {
        await sendEmailVerification(apiKey, auth.idToken);
      } catch {}
      await chrome.storage.local.set({auth: null, membership: null, device_usage: null, membership_checked_at: 0});
      if (els.loginPassword) els.loginPassword.value = '';
      return setMsg(
        els.loginMsg,
        'Email not verified. We sent a verification email. Check your inbox (and Spam/Junk), then log in again.',
        'err'
      );
    }

    await chrome.storage.local.set({auth, membership: null, device_usage: null, membership_checked_at: 0});
    if (els.loginPassword) els.loginPassword.value = '';
    try {
      chrome.runtime.sendMessage({method: 'sync'});
    } catch {}
    await refreshApp({forceMembershipSync: true});
  } catch (e) {
    setMsg(els.loginMsg, e.message || 'Login failed', 'err');
  } finally {
    setBusy([els.btnLogin, els.btnBackFromLogin, els.btnGoForgotFromLogin, els.btnGoSignupFromLogin], false);
  }
};

const doSignup = async () => {
  currentPrefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  const apiKey = getApiKey();
  const email = (els.signupEmail?.value || '').trim();
  const password = els.signupPassword?.value || '';
  const password2 = els.signupPassword2?.value || '';

  if (!apiKey) return setMsg(els.signupMsg, 'Missing Firebase API key. Set it in Options.', 'err');
  if (!email || !password) return setMsg(els.signupMsg, 'Enter email and password.', 'err');
  if (password !== password2) return setMsg(els.signupMsg, 'Passwords do not match.', 'err');

  setBusy([els.btnSignup, els.btnBackFromSignup, els.btnGoLoginFromSignup], true);
  setMsg(els.signupMsg, 'Creating account...', '');
  try {
    await chrome.storage.local.set({authEmail: email});
    const data = await firebasePost(apiKey, 'accounts:signUp', {email, password, returnSecureToken: true});
    try {
      await sendEmailVerification(apiKey, data.idToken);
    } catch {}

    if (els.signupPassword) els.signupPassword.value = '';
    if (els.signupPassword2) els.signupPassword2.value = '';
    setScreen('login', {
      message: 'Account created. Check your inbox (and Spam/Junk) to verify, then log in.',
      messageType: 'ok'
    });
    if (els.loginEmail) els.loginEmail.value = email;
    els.loginPassword?.focus?.();
  } catch (e) {
    setMsg(els.signupMsg, e.message || 'Sign up failed', 'err');
  } finally {
    setBusy([els.btnSignup, els.btnBackFromSignup, els.btnGoLoginFromSignup], false);
  }
};

const doForgot = async () => {
  currentPrefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  const apiKey = getApiKey();
  const email = (els.forgotEmail?.value || '').trim();

  if (!apiKey) return setMsg(els.forgotMsg, 'Missing Firebase API key. Set it in Options.', 'err');
  if (!email) return setMsg(els.forgotMsg, 'Enter your email.', 'err');

  setBusy([els.btnForgot, els.btnBackFromForgot], true);
  setMsg(els.forgotMsg, 'Sending reset email...', '');
  try {
    await sendPasswordReset(apiKey, email);
    setMsg(els.forgotMsg, 'Password reset email sent. Check your inbox (and Spam/Junk).', 'ok');
  } catch (e) {
    setMsg(els.forgotMsg, e.message || 'Failed to send reset email', 'err');
  } finally {
    setBusy([els.btnForgot, els.btnBackFromForgot], false);
  }
};

els.btnGoLogin?.addEventListener('click', () => setScreen('login'));
els.btnGoSignup?.addEventListener('click', () => setScreen('signup'));
els.btnBackFromLogin?.addEventListener('click', () => setScreen('welcome'));
els.btnGoForgotFromLogin?.addEventListener('click', () => setScreen('forgot'));
els.btnGoSignupFromLogin?.addEventListener('click', () => setScreen('signup'));
els.btnBackFromSignup?.addEventListener('click', () => setScreen('welcome'));
els.btnGoLoginFromSignup?.addEventListener('click', () => setScreen('login'));
els.btnBackFromForgot?.addEventListener('click', () => setScreen('login'));

els.btnLogin?.addEventListener('click', (e) => {
  e?.preventDefault?.();
  doLogin().catch(() => {});
});
els.btnSignup?.addEventListener('click', () => doSignup().catch(() => {}));
els.btnForgot?.addEventListener('click', () => doForgot().catch(() => {}));

els.btnRefresh?.addEventListener('click', () => refreshApp({forceMembershipSync: true}).catch(() => {}));
els.btnLogout?.addEventListener('click', () => logout().catch(() => {}));
els.btnQuickTest?.addEventListener('click', async () => {
  setBusy([els.btnQuickTest], true);
  try {
    const r = await runQuickSelfTestFlow();
    if (r.mode === 'start') {
      setQuickTestUi('running');
      setMsg(els.appMsg, 'Test started. Switch tabs or move your mouse out, then reopen this popup and click Test again.', '');
      return;
    }

    const events = r.summary?.events || [];
    if (events.length) {
      setQuickTestUi('fail');
      setMsg(els.appMsg, 'Function failed.', 'err');
    } else {
      const startedAt = Number(r.summary?.startedAt || 0);
      const elapsedMs = startedAt ? Date.now() - startedAt : 0;
      if (elapsedMs > 0 && elapsedMs < 1500) {
        setQuickTestUi('idle');
        setMsg(
          els.appMsg,
          "No events detected. You probably didn't switch tabs or move your mouse out of the page.\n\nDo that now, then click Test again.",
          ''
        );
        return;
      }

      setQuickTestUi('pass');
      setMsg(
        els.appMsg,
        "No events detected.\n\nIf you switched tabs or moved your mouse out of the page during the test, Hide activity is working. If you didn't, try again.",
        'ok'
      );
    }
    setTimeout(() => setQuickTestUi('idle'), 2500);
  } catch (e) {
    setQuickTestUi('idle');
    setMsg(els.appMsg, e.message || 'Test failed to run', 'err');
  } finally {
    setBusy([els.btnQuickTest], false);
  }
});

els.btnMenu?.addEventListener('click', () => setScreen('menu'));
els.btnMenuBack?.addEventListener('click', () => setScreen('app'));
els.btnPayments?.addEventListener('click', () => {
  setScreen('payments');
  loadPaymentHistory().catch(() => {});
});
els.btnGuidedTour?.addEventListener('click', () => startGuidedTour({markSeen: false}).catch(() => {}));
paymentsEls.back?.addEventListener('click', () => setScreen('app'));
paymentsEls.refresh?.addEventListener('click', () => loadPaymentHistory().catch(() => {}));

els.btnLegal?.addEventListener('click', () => setScreen('legal'));
els.btnLegalBack?.addEventListener('click', () => setScreen('menu'));
els.btnOpenPrivacy?.addEventListener('click', () => openPrivacy().catch(() => {}));
els.btnOpenTerms?.addEventListener('click', () => openTerms().catch(() => {}));
els.btnOpenEula?.addEventListener('click', () => openEula().catch(() => {}));
els.btnContact?.addEventListener('click', () => openContact().catch(() => {}));

els.btnLogoutAll?.addEventListener('click', () => logoutAllDevices().catch(() => {}));

els.billingPlan?.addEventListener('change', async () => {
  await chrome.storage.local.set({billing_plan: String(els.billingPlan.value || 'sub')});
});

els.btnUpgrade?.addEventListener('click', async () => {
  // `popup-patches.js` intercepts this for `billing_plan === 'sub'` to do subscription checkout.
  const plan = String(els.billingPlan?.value || 'sub');
  if (plan === 'one_time') await openCheckout({autoRenew: false});
});

els.masterEnabled?.addEventListener('change', async () => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  currentPrefs = prefs;
  if (!isAuthValid(prefs.auth)) {
    if (els.masterEnabled) els.masterEnabled.checked = false;
    updateStealthVisibility(false);
    if (prefs.stealth_icon) await setStealthIcon(false);
    await chrome.storage.local.set({enabled: false, hosts: []});
    setScreen('welcome', {message: 'Sign in to use Hide activity.', messageType: ''});
    return;
  }

  const enabled = Boolean(els.masterEnabled.checked);
  updateStealthVisibility(enabled);
  if (!enabled && prefs.stealth_icon) await setStealthIcon(false);
  if (enabled && !isMembershipActive(prefs.membership)) {
    // Membership data can be stale; try one sync before denying.
    let membership = prefs.membership;
    try {
      const r = await syncMembership();
      membership = r?.membership || membership;
    } catch {}

    if (!isMembershipActive(membership)) {
      if (els.masterEnabled) els.masterEnabled.checked = false;
      await chrome.storage.local.set({enabled: false, hosts: []});
      try {
        chrome.runtime.sendMessage({method: 'sync'});
      } catch {}
      refreshApp({forceMembershipSync: true}).catch(() => {});
      return;
    }
  }

  await chrome.storage.local.set({enabled, hosts: enabled ? ['*'] : []});
  try {
    chrome.runtime.sendMessage({method: 'sync'});
  } catch {}
  refreshApp().catch(() => {});
});

[
  els.optSpoofVisibilityState,
  els.optSpoofHidden,
  els.optSpoofWebkitVisibilityState,
  els.optSpoofWebkitHidden,
  els.optSpoofHasFocus,
  els.optBlockVisibilityChange,
  els.optBlockWebkitVisibilityChange,
  els.optBlockMozVisibilityChange,
  els.optBlockPageHide,
  els.optBlockFocusEvents,
  els.optBlockFocusInOut,
  els.optKeepAnimation,
  els.optBlockPointerCapture,
  els.optBlockMouseLeave,
  els.optBlockMouseOut
].forEach((el) => el?.addEventListener?.('change', () => saveCompatFromUI().catch(() => {})));

els.btnCompatDefaults?.addEventListener('click', async () => {
  await chrome.storage.local.set({...COMPAT_DEFAULTS, ...computeLegacyCompat(COMPAT_DEFAULTS)});
  await renderCompat();
  try {
    chrome.runtime.sendMessage({method: 'sync'});
  } catch {}
});

els.stealthIcon?.addEventListener('change', async () => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  currentPrefs = prefs;
  if (!isAuthValid(prefs.auth)) {
    await chrome.storage.local.set({stealth_icon: false});
    els.stealthIcon.checked = false;
    try {
      chrome.runtime.sendMessage({method: 'sync'});
    } catch {}
    return;
  }
  if (!isEnabledEverywhere(prefs)) {
    await setStealthIcon(false);
    updateStealthVisibility(false);
    return;
  }
  await chrome.storage.local.set({stealth_icon: Boolean(els.stealthIcon.checked)});
  try {
    chrome.runtime.sendMessage({method: 'sync'});
  } catch {}
});

els.stealthIconTheme?.addEventListener('change', async () => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  currentPrefs = prefs;
  if (!isAuthValid(prefs.auth)) {
    await setStealthIconTheme('light');
    return;
  }
  await setStealthIconTheme(String(els.stealthIconTheme.value || 'light'));
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.membership || changes.device_usage || changes.membership_checked_at) {
    chrome.storage.local
      .get(STORAGE_DEFAULTS)
      .then((prefs) => {
        setMembershipUI(prefs.membership);
        setDeviceUI(prefs.device_usage, prefs.membership);
      })
      .catch(() => {});
  }
  if (
    changes.spoof_visibility_state ||
    changes.spoof_hidden ||
    changes.spoof_webkit_visibility_state ||
    changes.spoof_webkit_hidden ||
    changes.spoof_has_focus ||
    changes.block_visibilitychange ||
    changes.block_webkitvisibilitychange ||
    changes.block_mozvisibilitychange ||
    changes.block_pagehide ||
    changes.block_focus_events ||
    changes.block_focusinout ||
    changes.keep_animation ||
    changes.block_pointercapture ||
    changes.block_mouseleave ||
    changes.block_mouseout
  ) {
    renderCompat().catch(() => {});
  }
});

const submitOnEnter = (inputs, fn) => {
  for (const el of inputs || []) {
    el?.addEventListener?.('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault?.();
      fn();
    });
  }
};

submitOnEnter([els.loginEmail, els.loginPassword], () => doLogin().catch(() => {}));
submitOnEnter([els.signupEmail, els.signupPassword, els.signupPassword2], () => doSignup().catch(() => {}));
submitOnEnter([els.forgotEmail], () => doForgot().catch(() => {}));

const init = async () => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  currentPrefs = prefs;

  if (els.loginEmail && prefs.authEmail) els.loginEmail.value = String(prefs.authEmail || '');
  if (els.loginRemember) els.loginRemember.checked = prefs.remember_me !== false;
  if (els.signupEmail && prefs.authEmail) els.signupEmail.value = String(prefs.authEmail || '');
  if (els.billingPlan && prefs.billing_plan) els.billingPlan.value = String(prefs.billing_plan || 'sub');

  if (els.masterEnabled) els.masterEnabled.checked = isEnabledEverywhere(prefs);
  if (els.stealthIcon) els.stealthIcon.checked = Boolean(prefs.stealth_icon);
  if (els.stealthIconTheme) els.stealthIconTheme.value = String(prefs.stealth_icon_theme || 'light') === 'dark' ? 'dark' : 'light';
  if (els.btnGuidedTour) els.btnGuidedTour.style.display = '';

  await ensureDeviceId().catch(() => {});
  await refreshApp({forceMembershipSync: isAuthValid(prefs.auth)}).catch(() => {});
  setQuickTestUi('idle');
  await syncQuickTestUiFromTab().catch(() => {});
  renderCompat().catch(() => {});
  checkBackendHealth().catch(() => {});
  try {
    chrome.runtime.sendMessage({method: 'sync'});
  } catch {}
};

init().catch(() => {
  if (els.topSubtitle) els.topSubtitle.textContent = 'Error';
  setScreen('welcome', {message: 'Failed to load state.', messageType: 'err'});
});

})();
