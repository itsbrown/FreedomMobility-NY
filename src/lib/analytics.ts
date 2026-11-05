/**
 * Freedom Mobility NY analytics helpers.
 *
 * Measurement ID is the Freedom property from the request (G-GD5R53T6FM).
 * No screenshot was attached in this workspace, so the glyphs were not
 * re-read from an image. Do not substitute the Rochester HealthTech ID.
 *
 * Page views are the single GA4 config hit. Do not also emit a manual
 * page_view. Plausible stays as a separate product.
 */

export const GA_MEASUREMENT_ID = 'G-GD5R53T6FM';

export const LEAD_STORAGE_KEY = 'fm_lead';
export const LEAD_TTL_MS = 30 * 60 * 1000;

export const LEAD_FORMS = ['contact', 'stairs_guide'] as const;
export type LeadForm = (typeof LEAD_FORMS)[number];

export const GUIDE_ID = 'stairs-where-to-start';
export const GUIDE_RESULTS = ['assessment', 'ramp-or-vpl', 'vpl', 'ramp-or-stairlift', 'stairlift'] as const;

const PLACE = /^[A-Za-z0-9_-]{1,40}$/;

export function hostAllowed(hostname: string): boolean {
  const host = String(hostname || '').trim().toLowerCase();
  return host === 'freedommobilityny.com' || host === 'www.freedommobilityny.com';
}

export function pagePath(value: string): string {
  let path = String(value || '/');
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      path = '/';
    }
  }
  const cut = path.search(/[?#]/);
  if (cut !== -1) path = path.slice(0, cut);
  if (!path) path = '/';
  if (path.charAt(0) !== '/') path = '/' + path;
  if (path.length > 180 || path.indexOf('@') !== -1 || path.indexOf('..') !== -1) return '/';
  if (!/^\/[A-Za-z0-9._~/-]*$/.test(path)) return '/';
  return path;
}

export function pageLocation(origin: string, pathname: string): string {
  return String(origin || '').replace(/\/+$/, '') + pagePath(pathname);
}

export function referrerValue(referrer: string, currentHostAllowed: (hostname: string) => boolean = hostAllowed): string {
  const value = String(referrer || '').trim();
  if (!value) return '';
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return '';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
  if (!currentHostAllowed(url.hostname)) return url.origin;
  return url.origin + pagePath(url.pathname);
}

export function referrerHost(referrer: string): string {
  const value = String(referrer || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    const host = url.hostname.toLowerCase();
    if (!/^[a-z0-9.-]{1,253}$/.test(host) || host.indexOf('@') !== -1) return '';
    return host;
  } catch {
    return '';
  }
}

/** GA4 campaign fields. Drops emails and collapses preview tokens. */
export function campaignParams(search: string): Record<string, string> {
  const tokenOk = /^[A-Za-z0-9._~+-]{1,80}$/;
  const params = new URLSearchParams(search || '');
  const map: Array<[string, string]> = [
    ['utm_source', 'campaign_source'],
    ['utm_medium', 'campaign_medium'],
    ['utm_campaign', 'campaign_name'],
    ['utm_content', 'campaign_content'],
    ['utm_term', 'campaign_term'],
  ];
  const out: Record<string, string> = {};
  for (let i = 0; i < map.length; i++) {
    const token = (params.get(map[i][0]) || '').trim();
    if (!tokenOk.test(token) || token.indexOf('@') !== -1) continue;
    out[map[i][1]] = /^preview-/i.test(token) ? 'preview' : token;
  }
  return out;
}

export const CAMPAIGN_QUERY_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'rh_c', 'fm_c'] as const;

/** Query string safe to forward to the first-party visit endpoint. */
export function sanitizedCampaignSearch(search: string): string {
  const tokenOk = /^[A-Za-z0-9._~+-]{1,80}$/;
  const params = new URLSearchParams(search || '');
  const out = new URLSearchParams();
  for (const key of CAMPAIGN_QUERY_KEYS) {
    const token = (params.get(key) || '').trim();
    if (!tokenOk.test(token) || token.indexOf('@') !== -1) continue;
    out.set(key, /^preview-/i.test(token) ? 'preview' : token);
  }
  const serialized = out.toString();
  return serialized ? '?' + serialized : '';
}

export function sanitizeEventParams(params: Record<string, unknown> | null | undefined): Record<string, string> {
  const placeOk = /^[A-Za-z0-9_-]{1,40}$/;
  const uuidOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const results = ['assessment', 'ramp-or-vpl', 'vpl', 'ramp-or-stairlift', 'stairlift'];
  const source = params || {};
  const out: Record<string, string> = {};
  const place = source.place;
  if (typeof place === 'string' && placeOk.test(place)) out.place = place;
  const channel = source.channel;
  if (channel === 'email' || channel === 'page') out.channel = channel;
  const form = source.form;
  if (form === 'contact' || form === 'stairs_guide') out.form = form;
  const guide = source.guide;
  if (guide === 'stairs-where-to-start') out.guide = guide;
  const result = source.result;
  if (typeof result === 'string' && results.indexOf(result) !== -1) out.result = result;
  const slot = source.slot;
  if (slot === 'hero') out.slot = slot;
  const variant = source.variant_id;
  if (variant === 'default' || (typeof variant === 'string' && uuidOk.test(variant))) {
    out.variant_id = variant === 'default' ? 'default' : variant.toLowerCase();
  }
  const rule = source.rule;
  if (rule === 'email_campaign' || rule === 'outreach' || rule === 'followup' || rule === 'holdout' || rule === 'default') {
    out.rule = rule;
  }
  let holdout = source.holdout;
  if (holdout === true) holdout = 'true';
  if (holdout === false) holdout = 'false';
  if (holdout === 'true' || holdout === 'false') out.holdout = holdout;
  return out;
}

export function isAllowedEvent(name: string): boolean {
  return name === 'click_contact'
    || name === 'phone_click'
    || name === 'generate_lead'
    || name === 'guide_start'
    || name === 'guide_complete'
    || name === 'personalization_view';
}

export function createLeadMarker(form: string, now = Date.now()): string | null {
  if (form !== 'contact' && form !== 'stairs_guide') return null;
  return JSON.stringify({ form, t: now });
}

export function readLeadMarker(raw: string | null, now = Date.now()): LeadForm | null {
  if (!raw || raw.length > 200) return null;
  try {
    const data = JSON.parse(raw) as { form?: unknown; t?: unknown };
    if (!data || (data.form !== 'contact' && data.form !== 'stairs_guide')) return null;
    if (typeof data.t !== 'number' || !Number.isFinite(data.t)) return null;
    if (now - data.t > LEAD_TTL_MS || data.t > now + 60_000) return null;
    return data.form;
  } catch {
    return null;
  }
}

export function rememberLead(form: LeadForm): void {
  const marker = createLeadMarker(form);
  if (!marker) return;
  try {
    sessionStorage.setItem(LEAD_STORAGE_KEY, marker);
  } catch {
    /* storage unavailable: skip the event rather than block the form */
  }
}

export function consumeLead(now = Date.now()): LeadForm | null {
  try {
    const raw = sessionStorage.getItem(LEAD_STORAGE_KEY);
    sessionStorage.removeItem(LEAD_STORAGE_KEY);
    return readLeadMarker(raw, now);
  } catch {
    return null;
  }
}

export function guideCompleteParams(result: string): { guide: string; result: string } | null {
  if ((GUIDE_RESULTS as readonly string[]).indexOf(result) === -1) return null;
  return { guide: GUIDE_ID, result };
}

declare global {
  interface Window {
    fmTrack?: (name: string, params?: Record<string, unknown>) => void;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __fmWelcomeExpired?: boolean;
    __fmWelcomeSettled?: boolean;
  }
}

export function placeFromAnchor(anchor: Element): string {
  const explicit = anchor.getAttribute('data-fm-place') || '';
  if (PLACE.test(explicit)) return explicit;
  if (anchor.closest('header')) return 'header';
  if (anchor.closest('footer')) return 'footer';
  return 'page';
}

export function bootClickTracking(doc: Document = document): void {
  doc.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    const place = placeFromAnchor(anchor);
    const track = window.fmTrack;
    if (typeof track !== 'function') return;
    if (href.indexOf('tel:') === 0) {
      track('phone_click', { place });
      return;
    }
    if (href.indexOf('mailto:') === 0) {
      track('click_contact', { place, channel: 'email' });
      return;
    }
    let path = href;
    if (/^https?:\/\//i.test(href)) {
      try {
        path = new URL(href).pathname;
      } catch {
        return;
      }
    }
    const normalized = pagePath(path).replace(/\/+$/, '') || '/';
    if (normalized === '/contact') track('click_contact', { place, channel: 'page' });
  });
}

function bootBody(): string {
  return `
window.fmTrack = function fmTrack(name, params) {
  if (!hostAllowed(location.hostname)) return;
  if (!isAllowedEvent(name)) return;
  var clean = sanitizeEventParams(params || {});
  if (typeof window.gtag === 'function') window.gtag('event', name, clean);
};
if (!hostAllowed(location.hostname)) return;
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = gtag;
var gaScript = document.createElement('script');
gaScript.async = true;
gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}';
document.head.appendChild(gaScript);
var fmPath = pagePath(location.pathname);
var fmLocation = pageLocation(location.origin, location.pathname);
var fmReferrer = referrerValue(document.referrer);
var fmConfig = {
  anonymize_ip: true,
  send_page_view: true,
  page_location: fmLocation,
  page_path: fmPath,
  page_referrer: fmReferrer
};
var fmCampaign = campaignParams(location.search);
for (var fmKey in fmCampaign) {
  if (Object.prototype.hasOwnProperty.call(fmCampaign, fmKey)) fmConfig[fmKey] = fmCampaign[fmKey];
}
function fmSyncPage() {
  gtag('set', {
    page_location: pageLocation(location.origin, location.pathname),
    page_path: pagePath(location.pathname),
    page_referrer: referrerValue(document.referrer)
  });
}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', fmConfig);
var fmPush = history.pushState;
var fmReplace = history.replaceState;
history.pushState = function () {
  var result = fmPush.apply(history, arguments);
  fmSyncPage();
  return result;
};
history.replaceState = function () {
  var replaced = fmReplace.apply(history, arguments);
  fmSyncPage();
  return replaced;
};
window.addEventListener('popstate', fmSyncPage);
window.addEventListener('hashchange', fmSyncPage);
`;
}

/** Classic head script. One GA4 config hit, no manual page_view. */
export function analyticsBootSource(): string {
  return (
    hostAllowed.toString() +
    '\n' +
    pagePath.toString() +
    '\n' +
    pageLocation.toString() +
    '\n' +
    referrerValue.toString() +
    '\n' +
    campaignParams.toString() +
    '\n' +
    sanitizeEventParams.toString() +
    '\n' +
    isAllowedEvent.toString() +
    '\n' +
    '(function(){\n' +
    bootBody() +
    '\n})();\n'
  );
}
