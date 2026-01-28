// Content script (MAIN world).
// Makes the page "look active" by spoofing visibility/focus APIs and blocking corresponding events.
//
// This is intentionally readable for Chrome Web Store review.

(() => {
  const PORT_ID = 'churomi-port';

  const originalRaf = window.requestAnimationFrame?.bind(window);
  const originalCaf = window.cancelAnimationFrame?.bind(window);

  const hiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
  const visibilityStateDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
  const webkitHiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'webkitHidden');
  const webkitVisibilityStateDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'webkitVisibilityState');
  const hasFocusDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hasFocus');

  const readBool = (s) => String(s || '').toLowerCase() === 'true';

  const getPort = () => document.getElementById(PORT_ID);

  const getSettings = () => {
    const port = getPort();
    const dataset = port?.dataset || {};
    const legacySpoofVisibility = readBool(dataset.spoofVisibility);
    const legacyBlockVisibilityEvents = readBool(dataset.blockVisibilityEvents);
    return {
      enabled: readBool(dataset.enabled),
      spoofHidden: dataset.spoofHidden != null ? readBool(dataset.spoofHidden) : legacySpoofVisibility,
      spoofVisibilityState: dataset.spoofVisibilityState != null ? readBool(dataset.spoofVisibilityState) : legacySpoofVisibility,
      spoofWebkitHidden: dataset.spoofWebkitHidden != null ? readBool(dataset.spoofWebkitHidden) : legacySpoofVisibility,
      spoofWebkitVisibilityState:
        dataset.spoofWebkitVisibilityState != null ? readBool(dataset.spoofWebkitVisibilityState) : legacySpoofVisibility,
      spoofHasFocus: dataset.spoofHasFocus != null ? readBool(dataset.spoofHasFocus) : true,

      blockVisibilityChange: dataset.blockVisibilityChange != null ? readBool(dataset.blockVisibilityChange) : legacyBlockVisibilityEvents,
      blockWebkitVisibilityChange:
        dataset.blockWebkitVisibilityChange != null ? readBool(dataset.blockWebkitVisibilityChange) : legacyBlockVisibilityEvents,
      blockMozVisibilityChange:
        dataset.blockMozVisibilityChange != null ? readBool(dataset.blockMozVisibilityChange) : legacyBlockVisibilityEvents,
      blockPageHide: dataset.blockPageHide != null ? readBool(dataset.blockPageHide) : legacyBlockVisibilityEvents,
      blockFocusEvents: readBool(dataset.blockFocusEvents),
      blockFocusInOut: readBool(dataset.blockFocusInOut),
      blockPointerCapture: readBool(dataset.blockPointerCapture),
      blockMouseLeave: readBool(dataset.blockMouseLeave),
      blockMouseOut: readBool(dataset.blockMouseOut),

      keepAnimation: readBool(dataset.keepAnimation)
    };
  };

  const isActuallyHidden = () => {
    try {
      if (hiddenDescriptor?.get) return Boolean(hiddenDescriptor.get.call(document));
    } catch {}
    try {
      if (visibilityStateDescriptor?.get) return String(visibilityStateDescriptor.get.call(document)) !== 'visible';
    } catch {}
    try {
      if (webkitHiddenDescriptor?.get) return Boolean(webkitHiddenDescriptor.get.call(document));
    } catch {}
    try {
      if (webkitVisibilityStateDescriptor?.get) return String(webkitVisibilityStateDescriptor.get.call(document)) !== 'visible';
    } catch {}
    return document.visibilityState !== 'visible';
  };

  const shouldSpoofHidden = () => {
    const s = getSettings();
    return s.enabled && s.spoofHidden;
  };

  const shouldSpoofVisibilityState = () => {
    const s = getSettings();
    return s.enabled && s.spoofVisibilityState;
  };

  const shouldSpoofWebkitHidden = () => {
    const s = getSettings();
    return s.enabled && s.spoofWebkitHidden;
  };

  const shouldSpoofWebkitVisibilityState = () => {
    const s = getSettings();
    return s.enabled && s.spoofWebkitVisibilityState;
  };

  const shouldSpoofHasFocus = () => {
    const s = getSettings();
    return s.enabled && s.spoofHasFocus;
  };

  const shouldKeepAnimation = () => {
    const s = getSettings();
    return s.enabled && s.keepAnimation && isActuallyHidden();
  };

  const blockEvent = (event) => {
    if (!event) return;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    event.stopPropagation?.();
  };

  const shouldBlockVisibilityChange = () => {
    const s = getSettings();
    return s.enabled && s.blockVisibilityChange;
  };

  const shouldBlockWebkitVisibilityChange = () => {
    const s = getSettings();
    return s.enabled && s.blockWebkitVisibilityChange;
  };

  const shouldBlockMozVisibilityChange = () => {
    const s = getSettings();
    return s.enabled && s.blockMozVisibilityChange;
  };

  const shouldBlockPageHide = () => {
    const s = getSettings();
    return s.enabled && s.blockPageHide;
  };

  const shouldBlockFocusEvent = () => {
    const s = getSettings();
    return s.enabled && s.blockFocusEvents;
  };

  const shouldBlockFocusInOut = () => {
    const s = getSettings();
    return s.enabled && s.blockFocusInOut;
  };

  const shouldBlockPointerCapture = () => {
    const s = getSettings();
    return s.enabled && s.blockPointerCapture;
  };

  const shouldBlockMouseLeave = () => {
    const s = getSettings();
    return s.enabled && s.blockMouseLeave;
  };

  const shouldBlockMouseOut = () => {
    const s = getSettings();
    return s.enabled && s.blockMouseOut;
  };

  const addGuard = (target, type, guard, filter = () => true) => {
    try {
      target.addEventListener(
        type,
        (e) => {
          if (!guard()) return;
          if (!filter(e)) return;
          blockEvent(e);
        },
        true
      );
    } catch {}
  };

  const installEventGuards = () => {
    // Block visibility events from reaching the page.
    const visFilter = (e) => e?.target === document || e?.target === document.documentElement;
    addGuard(document, 'visibilitychange', shouldBlockVisibilityChange, visFilter);
    addGuard(document, 'webkitvisibilitychange', shouldBlockWebkitVisibilityChange, visFilter);
    addGuard(document, 'mozvisibilitychange', shouldBlockMozVisibilityChange, visFilter);
    addGuard(window, 'pagehide', shouldBlockPageHide);

    // Block focus/blur events from reaching the page.
    const focusFilter = (e) => e?.target === window || e?.target === document;
    addGuard(window, 'focus', shouldBlockFocusEvent, focusFilter);
    addGuard(window, 'blur', shouldBlockFocusEvent, focusFilter);
    addGuard(document, 'focusin', shouldBlockFocusInOut);
    addGuard(document, 'focusout', shouldBlockFocusInOut);

    // Block pointer/mouse events that some pages use as "activity" signals.
    addGuard(window, 'lostpointercapture', shouldBlockPointerCapture);
    addGuard(window, 'mouseleave', shouldBlockMouseLeave, (e) => e?.target === document || e?.target === window);
    addGuard(window, 'mouseout', shouldBlockMouseOut, (e) => e?.target === document.documentElement || e?.target === document.body);
  };

  const installVisibilitySpoofs = () => {
    const resolveHidden = () => Boolean(hiddenDescriptor?.get ? hiddenDescriptor.get.call(document) : false);
    const resolveVisibilityState = () =>
      String(visibilityStateDescriptor?.get ? visibilityStateDescriptor.get.call(document) : 'visible');
    const resolveWebkitHidden = () =>
      Boolean(webkitHiddenDescriptor?.get ? webkitHiddenDescriptor.get.call(document) : resolveHidden());
    const resolveWebkitVisibilityState = () =>
      String(webkitVisibilityStateDescriptor?.get ? webkitVisibilityStateDescriptor.get.call(document) : resolveVisibilityState());

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get() {
        return shouldSpoofHidden() ? false : resolveHidden();
      }
    });

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get() {
        return shouldSpoofVisibilityState() ? 'visible' : resolveVisibilityState();
      }
    });

    // Some sites (and test pages) check the legacy WebKit-prefixed visibility APIs in Chromium.
    Object.defineProperty(document, 'webkitHidden', {
      configurable: true,
      get() {
        return shouldSpoofWebkitHidden() ? false : resolveWebkitHidden();
      }
    });

    Object.defineProperty(document, 'webkitVisibilityState', {
      configurable: true,
      get() {
        return shouldSpoofWebkitVisibilityState() ? 'visible' : resolveWebkitVisibilityState();
      }
    });

    Object.defineProperty(document, 'hasFocus', {
      configurable: true,
      value() {
        if (shouldSpoofHasFocus()) return true;
        try {
          if (typeof hasFocusDescriptor?.value === 'function') return hasFocusDescriptor.value.call(document);
        } catch {}
        return true;
      }
    });
  };

  const installAnimationKeepAlive = () => {
    if (!originalRaf || !originalCaf) return;
    let lastTime = 0;

    window.requestAnimationFrame = new Proxy(originalRaf, {
      apply(target, thisArg, argArray) {
        const cb = argArray?.[0];
        if (typeof cb !== 'function') return Reflect.apply(target, thisArg, argArray);
        if (!shouldKeepAnimation()) return Reflect.apply(target, thisArg, argArray);

        const now = Date.now();
        const delay = Math.max(0, 10 - (now - lastTime));
        const id = setTimeout(() => cb(performance.now()), delay);
        lastTime = now + delay;
        return id;
      }
    });

    window.cancelAnimationFrame = new Proxy(originalCaf, {
      apply(target, thisArg, argArray) {
        const id = argArray?.[0];
        if (shouldKeepAnimation()) {
          clearTimeout(id);
          return;
        }
        return Reflect.apply(target, thisArg, argArray);
      }
    });
  };

  const ensurePort = () => {
    let el = getPort();
    if (el) return el;
    el = document.createElement('span');
    el.id = PORT_ID;
    document.documentElement.appendChild(el);
    return el;
  };

  ensurePort();
  installEventGuards();
  installVisibilitySpoofs();
  installAnimationKeepAlive();
})();
