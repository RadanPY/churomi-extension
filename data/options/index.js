/* global CHUROMI_DEFAULTS */

const $ = (id) => document.getElementById(id);

const FREE_MODE = true;
const FREE_MEMBERSHIP = Object.freeze({status: 'active', plan: 'free', active: true, valid_until: 0, free: true});

const STORAGE_DEFAULTS = {
  backendUrl:
    typeof CHUROMI_DEFAULTS === 'object' && CHUROMI_DEFAULTS.backendUrl ? CHUROMI_DEFAULTS.backendUrl : 'https://api.churomi.com',
  firebaseApiKey: '',
  device_id: '',
  auth: null,
  authEmail: '',
  enabled: false,
  hosts: [],
  stealth_icon: false,
  log: false,
  membership: null,
  membership_checked_at: 0
};

const els = {
  backendUrl: $('backendUrl'),
  firebaseApiKey: $('firebaseApiKey'),
  btnSaveBackend: $('btn-save-backend'),
  btnTestBackend: $('btn-test-backend'),
  backendStatus: $('backendStatus'),

  accountInfo: $('accountInfo'),
  btnLogout: $('btn-logout'),

  enabled: $('enabled'),
  log: $('log'),
  save: $('save'),
  reset: $('reset'),
  toast: $('toast'),

  legalPrivacy: $('legalPrivacy'),
  legalTerms: $('legalTerms')
};

const normalizeBackendUrl = (url) => String(url || '').trim().replace(/\/$/, '');

const getSiteUrl = () =>
  String(
    (typeof CHUROMI_DEFAULTS === 'object' && CHUROMI_DEFAULTS.siteUrl) ? CHUROMI_DEFAULTS.siteUrl : 'https://churomi.com'
  )
    .trim()
    .replace(/\/$/, '');

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
  const token = getAuthIdToken(auth);
  if (!token) return false;
  const expiresAtMs = getAuthExpiryMs(auth) ?? getJwtExpiryMs(token);
  if (expiresAtMs != null) return expiresAtMs > Date.now();
  return true;
};

const isEnabledEverywhere = (prefs) => Boolean(prefs?.enabled) || (Array.isArray(prefs?.hosts) && prefs.hosts.includes('*'));

const setToast = (text, kind = '') => {
  if (!els.toast) return;
  els.toast.textContent = text || '';
  els.toast.className = kind ? `msg ${kind}` : '';
};

const setBackendStatus = (text) => {
  if (!els.backendStatus) return;
  els.backendStatus.textContent = text || '';
};

const renderAccount = (prefs) => {
  if (!els.accountInfo) return;
  if (FREE_MODE) {
    els.accountInfo.textContent = 'Free access is active. No account, login, or payment is required.';
    return;
  }

  if (!isAuthValid(prefs.auth)) {
    els.accountInfo.textContent = 'Not logged in.';
    return;
  }

  const auth = parseAuthValue(prefs.auth);
  const email = String(auth?.email || prefs.authEmail || '').trim();
  const checkedAt = Number(prefs.membership_checked_at || 0);
  const checkedText = checkedAt ? ` (checked ${new Date(checkedAt).toLocaleString()})` : '';
  els.accountInfo.textContent = email ? `Logged in as ${email}${checkedText}` : `Logged in${checkedText}`;
};

const syncLegalLinks = () => {
  const base = getSiteUrl();
  if (els.legalPrivacy) els.legalPrivacy.href = `${base}/privacy`;
  if (els.legalTerms) els.legalTerms.href = `${base}/terms`;
};

const loadState = async () => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  if (els.backendUrl) els.backendUrl.value = String(prefs.backendUrl || '');
  if (els.enabled) els.enabled.checked = isEnabledEverywhere(prefs);
  if (els.log) els.log.checked = Boolean(prefs.log);
  renderAccount(prefs);
  syncLegalLinks();
  return prefs;
};

const saveBackend = async () => {
  setToast('', '');
  const backendUrl = normalizeBackendUrl(els.backendUrl?.value || '');
  await chrome.storage.local.set({
    backendUrl,
    firebaseApiKey: '',
    auth: null,
    authEmail: '',
    membership: {...FREE_MEMBERSHIP},
    membership_checked_at: Date.now()
  });
  syncLegalLinks();
  setToast('Saved.', 'ok');
  try {
    chrome.runtime.sendMessage({method: 'sync'});
  } catch {}
};

const testBackend = async () => {
  setBackendStatus('Testing...');
  const backendUrl = normalizeBackendUrl(els.backendUrl?.value || '');
  if (!backendUrl) return setBackendStatus('Missing Backend URL');
  try {
    const res = await fetch(`${backendUrl}/health`, {method: 'GET'});
    setBackendStatus(res.ok ? 'OK' : `HTTP ${res.status}`);
  } catch {
    setBackendStatus('Offline');
  }
};

const saveFeature = async () => {
  setToast('', '');
  const enabled = Boolean(els.enabled?.checked);
  const log = Boolean(els.log?.checked);
  await chrome.storage.local.set({enabled, hosts: enabled ? ['*'] : [], log});
  setToast('Saved.', 'ok');
  try {
    chrome.runtime.sendMessage({method: 'sync'});
  } catch {}
};

const resetFeature = async () => {
  setToast('', '');
  await chrome.storage.local.set({enabled: false, hosts: [], log: false});
  await loadState();
  setToast('Reset.', 'ok');
  try {
    chrome.runtime.sendMessage({method: 'sync'});
  } catch {}
};

const logout = async () => {
  setToast('', '');
  await chrome.storage.local.set({
    auth: null,
    authEmail: '',
    membership: {...FREE_MEMBERSHIP},
    membership_checked_at: Date.now(),
    enabled: false,
    hosts: [],
    stealth_icon: false,
    auto_renew: false
  });
  await loadState();
  setToast(FREE_MODE ? 'Settings reset.' : 'Logged out.', 'ok');
  try {
    chrome.runtime.sendMessage({method: 'sync'});
  } catch {}
};

els.btnSaveBackend?.addEventListener('click', () => saveBackend().catch(() => {}));
els.btnTestBackend?.addEventListener('click', () => testBackend().catch(() => {}));
els.save?.addEventListener('click', () => saveFeature().catch(() => {}));
els.reset?.addEventListener('click', () => resetFeature().catch(() => {}));
els.btnLogout?.addEventListener('click', () => logout().catch(() => {}));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.auth || changes.membership_checked_at) loadState().catch(() => {});
});

loadState().catch(() => {});
