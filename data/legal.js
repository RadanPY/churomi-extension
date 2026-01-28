/* global CHUROMI_DEFAULTS */

const site = (
  typeof CHUROMI_DEFAULTS === 'object' && CHUROMI_DEFAULTS.siteUrl
    ? String(CHUROMI_DEFAULTS.siteUrl)
    : 'https://churomi.com'
)
  .trim()
  .replace(/\/$/, '');

document.getElementById('privacy').href = `${site}/privacy`;
document.getElementById('terms').href = `${site}/terms`;
document.getElementById('license').href = chrome.runtime.getURL('LICENSE.txt');

