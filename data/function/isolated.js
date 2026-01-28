// Content script (ISOLATED world).
// Bridges extension storage state into the page via a DOM element dataset so the MAIN-world script can read it.

const PORT_ID = 'churomi-port';

const DEFAULTS = {
  enabled: false,
  hosts: [],
  // Activity hiding toggles (exposed in popup "Compatibility").
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
  block_pointercapture: true,
  block_mouseleave: true,
  block_mouseout: true,

  keep_animation: true
};

const boolString = (v) => (v ? 'true' : 'false');

const isEnabledEverywhere = (prefs) => {
  const hosts = Array.isArray(prefs?.hosts) ? prefs.hosts : [];
  return Boolean(prefs?.enabled) || hosts.includes('*');
};

const getPort = () => {
  let el = document.getElementById(PORT_ID);
  if (el) return el;
  el = document.createElement('span');
  el.id = PORT_ID;
  document.documentElement.appendChild(el);
  return el;
};

const applyPrefsToPort = (prefs) => {
  const port = getPort();
  port.dataset.enabled = boolString(isEnabledEverywhere(prefs));
  port.dataset.spoofVisibility = boolString(Boolean(prefs.spoof_visibility));
  port.dataset.spoofHidden = boolString(Boolean(prefs.spoof_hidden));
  port.dataset.spoofVisibilityState = boolString(Boolean(prefs.spoof_visibility_state));
  port.dataset.spoofWebkitHidden = boolString(Boolean(prefs.spoof_webkit_hidden));
  port.dataset.spoofWebkitVisibilityState = boolString(Boolean(prefs.spoof_webkit_visibility_state));
  port.dataset.spoofHasFocus = boolString(Boolean(prefs.spoof_has_focus));

  port.dataset.blockVisibilityEvents = boolString(Boolean(prefs.block_visibility_events));
  port.dataset.blockVisibilityChange = boolString(Boolean(prefs.block_visibilitychange));
  port.dataset.blockWebkitVisibilityChange = boolString(Boolean(prefs.block_webkitvisibilitychange));
  port.dataset.blockMozVisibilityChange = boolString(Boolean(prefs.block_mozvisibilitychange));
  port.dataset.blockPageHide = boolString(Boolean(prefs.block_pagehide));
  port.dataset.blockFocusEvents = boolString(Boolean(prefs.block_focus_events));
  port.dataset.blockFocusInOut = boolString(Boolean(prefs.block_focusinout));
  port.dataset.blockPointerCapture = boolString(Boolean(prefs.block_pointercapture));
  port.dataset.blockMouseLeave = boolString(Boolean(prefs.block_mouseleave));
  port.dataset.blockMouseOut = boolString(Boolean(prefs.block_mouseout));

  port.dataset.keepAnimation = boolString(Boolean(prefs.keep_animation));
  port.dispatchEvent(new CustomEvent('churomi-port-updated'));
};

const sync = async () => {
  try {
    const prefs = await chrome.storage.local.get(DEFAULTS);
    applyPrefsToPort(prefs);
  } catch {}
};

sync().catch(() => {});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (
    changes.enabled ||
    changes.hosts ||
    changes.spoof_visibility ||
    changes.spoof_hidden ||
    changes.spoof_visibility_state ||
    changes.spoof_webkit_hidden ||
    changes.spoof_webkit_visibility_state ||
    changes.spoof_has_focus ||
    changes.block_visibility_events ||
    changes.block_visibilitychange ||
    changes.block_webkitvisibilitychange ||
    changes.block_mozvisibilitychange ||
    changes.block_pagehide ||
    changes.block_focus_events ||
    changes.block_focusinout ||
    changes.block_pointercapture ||
    changes.block_mouseleave ||
    changes.block_mouseout ||
    changes.keep_animation
  ) {
    sync().catch(() => {});
  }
});
