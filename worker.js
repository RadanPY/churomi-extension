/* global CHUROMI_DEFAULTS */

importScripts('config.js');

const CONTENT_SCRIPT_IDS = ['churomi-isolated', 'churomi-main'];

const STORAGE_DEFAULTS = {
  backendUrl:
    typeof CHUROMI_DEFAULTS === 'object' && CHUROMI_DEFAULTS.backendUrl ? CHUROMI_DEFAULTS.backendUrl : 'https://api.churomi.com',
  firebaseApiKey:
    typeof CHUROMI_DEFAULTS === 'object' && CHUROMI_DEFAULTS.firebaseApiKey ? CHUROMI_DEFAULTS.firebaseApiKey : '',
  device_id: '',
  auth: null,
  enabled: false,
  hosts: [],
  stealth_icon: false,
  stealth_icon_theme: 'light',
  auto_renew: false,
  log: false,
  membership: null,
  device_usage: null,
  membership_checked_at: 0,
  server_failures: 0,
  last_membership_error: '',
  last_content_script_error: '',
  remember_me: true
};

const ICONS = {
  enabled: {
    16: 'icons/churomi-16.png',
    32: 'icons/churomi-32.png',
    48: 'icons/churomi-48.png'
  },
  disabled: {
    16: 'icons/churomi-disabled-16.png',
    32: 'icons/churomi-disabled-32.png',
    48: 'icons/churomi-disabled-48.png'
  },
  stealthEnabled: {
    16: 'icons/state-white-16.png',
    32: 'icons/state-white-32.png',
    48: 'icons/state-white-48.png'
  },
  stealthEnabledDark: {
    16: 'icons/state-dark-16.png',
    32: 'icons/state-dark-32.png',
    48: 'icons/state-dark-48.png'
  }
};

const BACKEND_HEALTH_ALARM = 'churomi-backend-health';
const MEMBERSHIP_ALARM = 'churomi-membership';

const normalizeBackendUrl = (url) => String(url || '').trim().replace(/\/$/, '');

const withLog = async (fn) => {
  try {
    const {log} = await chrome.storage.local.get({log: false});
    if (!log) return;
    fn();
  } catch {}
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

const ensureFreshAuth = async (prefs) => {
  if (!prefs?.remember_me) return prefs?.auth || null;
  const apiKey = String(prefs.firebaseApiKey || '').trim();
  const auth = parseAuthValue(prefs.auth);
  if (!apiKey || !auth || typeof auth !== 'object') return null;

  const refreshToken = String(auth.refreshToken || '').trim();
  if (!refreshToken) return auth;
  if (!isExpiringSoon(auth)) return auth;

  const data = await firebaseRefreshToken(apiKey, refreshToken);
  const expiresIn = Number(data.expires_in || data.expiresIn || 3600);
  const exp = Date.now() + expiresIn * 1000 - 60_000;
  const nextAuth = {
    email: String(auth.email || '').trim(),
    idToken: data.id_token || data.idToken,
    refreshToken: data.refresh_token || data.refreshToken || refreshToken,
    exp
  };
  await chrome.storage.local.set({auth: nextAuth});
  return nextAuth;
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

const hex = (buf) => Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');

const ensureDeviceId = async () => {
  const {device_id} = await chrome.storage.local.get({device_id: ''});
  const existing = String(device_id || '').trim();
  if (existing) return existing;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = hex(bytes);
  await chrome.storage.local.set({device_id: id});
  return id;
};

const isEnabledEverywhere = (prefs) => Boolean(prefs?.enabled) || (Array.isArray(prefs?.hosts) && prefs.hosts.includes('*'));

const updateActionIcon = async () => {
  const prefs = await chrome.storage.local.get({enabled: false, hosts: [], stealth_icon: false, stealth_icon_theme: 'light'});
  const enabled = isEnabledEverywhere(prefs);
  const stealth = Boolean(prefs.stealth_icon);
  const stealthTheme = String(prefs.stealth_icon_theme || 'light') === 'dark' ? 'dark' : 'light';

  const stealthIcon = stealthTheme === 'dark' ? ICONS.stealthEnabledDark : ICONS.stealthEnabled;
  const icon = enabled ? (stealth ? stealthIcon : ICONS.enabled) : ICONS.disabled;
  try {
    await chrome.action.setIcon({path: icon});
  } catch {}
};

const unregisterContentScripts = async () => {
  try {
    await new Promise((resolve) => {
      chrome.scripting.unregisterContentScripts({ids: CONTENT_SCRIPT_IDS}, () => {
        // Prevent "Unchecked runtime.lastError" noise when scripts aren't registered yet.
        void chrome.runtime?.lastError;
        resolve();
      });
    });
  } catch {}
};

const registerContentScriptsIfEnabled = async () => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  if (!isEnabledEverywhere(prefs)) return;

  if (!isAuthValid(prefs.auth)) return disableEverything({reason: 'not_signed_in'}).catch(() => {});
  if (!isMembershipActive(prefs.membership)) return disableEverything({reason: 'membership_inactive'}).catch(() => {});

  await unregisterContentScripts();
  try {
    await chrome.storage.local.set({last_content_script_error: ''});
    await new Promise((resolve, reject) => {
      chrome.scripting.registerContentScripts(
        [
          {
            id: 'churomi-isolated',
            matches: ['*://*/*'],
            allFrames: true,
            matchOriginAsFallback: true,
            js: ['data/inject/isolated.js'],
            runAt: 'document_start',
            world: 'ISOLATED'
          },
          {
            id: 'churomi-main',
            matches: ['*://*/*'],
            allFrames: true,
            matchOriginAsFallback: true,
            js: ['data/inject/main.js'],
            runAt: 'document_start',
            world: 'MAIN'
          }
        ],
        () => {
          const err = chrome.runtime?.lastError;
          if (err) reject(new Error(err.message || String(err)));
          else resolve();
        }
      );
    });
  } catch (err) {
    const msg = String(err?.message || err);
    await chrome.storage.local.set({last_content_script_error: msg});
    await withLog(() => console.log('[churomi] registerContentScripts failed:', msg));
  }
};

const disableEverything = async ({reason = 'disabled'} = {}) => {
  await chrome.storage.local.set({
    enabled: false,
    hosts: [],
    stealth_icon: false,
    server_failures: 0
  });
  await unregisterContentScripts();
  await updateActionIcon();
  await withLog(() => console.log('[churomi] disabled:', reason));
};

const checkServerHealth = async () => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  if (!isEnabledEverywhere(prefs)) return;
  const base = normalizeBackendUrl(prefs.backendUrl);
  if (!base) return;

  try {
    const res = await fetch(`${base}/health`, {method: 'GET'});
    if (!res.ok) throw new Error(`health ${res.status}`);
    await chrome.storage.local.set({server_failures: 0});
  } catch (err) {
    const failures = Number(prefs.server_failures || 0) + 1;
    await chrome.storage.local.set({server_failures: failures});
    await withLog(() => console.log('[churomi] health failed:', failures, String(err?.message || err)));
    // Don't force-disable the feature when the server is down; the core "hide activity" logic is local.
  }
};

const syncMembership = async () => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  if (!isAuthValid(prefs.auth)) {
    await chrome.storage.local.set({
      membership: null,
      device_usage: null,
      membership_checked_at: Date.now(),
      last_membership_error: 'Not signed in.'
    });
    await disableEverything({reason: 'not_signed_in'}).catch(() => {});
    return;
  }

  const base = normalizeBackendUrl(prefs.backendUrl);
  if (!base) return;
  const deviceId = await ensureDeviceId();
  const tokenAuth = await ensureFreshAuth(prefs).catch(() => null);
  const token = getAuthIdToken(parseAuthValue(tokenAuth || prefs.auth));

  try {
    await chrome.storage.local.set({last_membership_error: ''});
    const res = await fetch(`${base}/api/membership/status`, {
      headers: {Authorization: `Bearer ${token}`, 'x-device-id': deviceId}
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `membership ${res.status}`);

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
      membership_checked_at: Date.now()
    });

    const m = membership;
    if (!isMembershipActive(m)) {
      await chrome.storage.local.set({last_membership_error: 'Membership inactive.'});
      await disableEverything({reason: 'membership_inactive'}).catch(() => {});
    }
  } catch (err) {
    const msg = String(err?.message || err);
    await chrome.storage.local.set({last_membership_error: msg});
    await withLog(() => console.log('[churomi] membership sync failed:', String(err?.message || err)));
  }
};

const initStorageDefaults = async () => {
  const prefs = await chrome.storage.local.get(STORAGE_DEFAULTS);
  await chrome.storage.local.set({...STORAGE_DEFAULTS, ...prefs});
};

const ensureAlarms = async () => {
  try {
    await chrome.alarms.create(BACKEND_HEALTH_ALARM, {periodInMinutes: 2});
    await chrome.alarms.create(MEMBERSHIP_ALARM, {periodInMinutes: 2});
  } catch {}
};

chrome.runtime.onInstalled.addListener(() => {
  initStorageDefaults()
    .then(updateActionIcon)
    .then(registerContentScriptsIfEnabled)
    .then(ensureAlarms)
    .catch(() => {});
});

chrome.runtime.onStartup?.addListener?.(() => {
  initStorageDefaults()
    .then(updateActionIcon)
    .then(registerContentScriptsIfEnabled)
    .then(ensureAlarms)
    .catch(() => {});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm?.name === BACKEND_HEALTH_ALARM) checkServerHealth().catch(() => {});
  if (alarm?.name === MEMBERSHIP_ALARM) syncMembership().catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const method = msg?.method || msg?.type || '';
  if (method === 'sync') {
    Promise.resolve()
      .then(updateActionIcon)
      .then(registerContentScriptsIfEnabled)
      .then(() => sendResponse?.({ok: true}))
      .catch(() => sendResponse?.({ok: false}));
    return true;
  }
  sendResponse?.({ok: true});
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.enabled || changes.hosts) {
    registerContentScriptsIfEnabled().catch(() => {});
    updateActionIcon().catch(() => {});
  }
  if (changes.stealth_icon) updateActionIcon().catch(() => {});
  if (changes.stealth_icon_theme) updateActionIcon().catch(() => {});
  if (changes.auth || changes.membership) {
    registerContentScriptsIfEnabled().catch(() => {});
    updateActionIcon().catch(() => {});
  }
});
