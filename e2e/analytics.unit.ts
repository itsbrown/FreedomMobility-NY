import assert from 'node:assert/strict';
import vm from 'node:vm';
import { describe, it } from 'node:test';
import {
  GA_MEASUREMENT_ID,
  analyticsBootSource,
  campaignParams,
  consumeLead,
  createLeadMarker,
  guideCompleteParams,
  pagePath,
  readLeadMarker,
  referrerHost,
  referrerValue,
  rememberLead,
  sanitizedCampaignSearch,
  sanitizeEventParams,
} from '../src/lib/analytics';

describe('GA4 page view boot', () => {
  it('sends one config hit and no manual page_view on the production host', () => {
    const source = analyticsBootSource();
    assert.equal(source.includes('G-E42WXVRWT2'), false);
    assert.equal(source.includes(GA_MEASUREMENT_ID), true);
    assert.equal(GA_MEASUREMENT_ID, 'G-GD5R53T6FM');

    const created: Array<Record<string, unknown>> = [];
    const listeners: Record<string, Array<() => void>> = {};
    const sandbox = {
      URL,
      URLSearchParams,
      Date,
      Object,
      location: {
        hostname: 'www.freedommobilityny.com',
        pathname: '/contact',
        search: '?utm_source=newsletter&utm_medium=email&utm_campaign=spring&utm_content=a@b.com&utm_term=preview-secret',
        origin: 'https://www.freedommobilityny.com',
      },
      document: {
        referrer: 'https://news.example/story?email=a@b.com',
        head: { appendChild(node: Record<string, unknown>) { created.push(node); } },
        createElement() { return {}; },
      },
      history: {
        pushState() { return 'pushed'; },
        replaceState() { return 'replaced'; },
      },
      window: {
        addEventListener(type: string, fn: () => void) {
          listeners[type] = listeners[type] || [];
          listeners[type].push(fn);
        },
      },
    };
    const context = vm.createContext(sandbox);
    vm.runInContext(source, context);
    const windowRecord = sandbox.window as typeof sandbox.window & {
      dataLayer: unknown[][];
      gtag: (...args: unknown[]) => void;
      fmTrack: (name: string, params?: Record<string, unknown>) => void;
    };
    const layer = windowRecord.dataLayer;
    const configs = layer.filter((entry) => entry[0] === 'config');
    const manualViews = layer.filter((entry) => entry[0] === 'event' && entry[1] === 'page_view');
    assert.equal(configs.length, 1);
    assert.equal(manualViews.length, 0);
    assert.equal(configs[0][1], 'G-GD5R53T6FM');
    const config = configs[0][2] as Record<string, unknown>;
    assert.equal(config.send_page_view, true);
    assert.equal(config.page_path, '/contact');
    assert.equal(config.page_location, 'https://www.freedommobilityny.com/contact');
    assert.equal(config.page_referrer, 'https://news.example');
    assert.equal(config.campaign_source, 'newsletter');
    assert.equal(config.campaign_medium, 'email');
    assert.equal(config.campaign_name, 'spring');
    assert.equal(config.campaign_content, undefined);
    assert.equal(config.campaign_term, 'preview');
    assert.equal('linker' in config, false);
    assert.equal(created[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-GD5R53T6FM');

    sandbox.history.pushState();
    assert.equal(layer.filter((entry) => entry[0] === 'config').length, 1);
    assert.equal(layer.filter((entry) => entry[0] === 'event' && entry[1] === 'page_view').length, 0);

    windowRecord.fmTrack('generate_lead', {
      form: 'contact',
      email: 'a@b.com',
      message: 'call me',
      phone: '5855551212',
    });
    const events = layer.filter((entry) => entry[0] === 'event');
    assert.equal(events.length, 1);
    assert.equal(JSON.stringify(events[0][2]), JSON.stringify({ form: 'contact' }));

    windowRecord.fmTrack('not_a_real_event', { form: 'contact' });
    assert.equal(layer.filter((entry) => entry[0] === 'event').length, 1);
  });

  it('does not load GA4 off the production hosts', () => {
    const sandbox = {
      URL,
      URLSearchParams,
      Date,
      Object,
      location: { hostname: 'localhost', pathname: '/', search: '', origin: 'http://localhost:4321' },
      document: { referrer: '', head: { appendChild() { throw new Error('should not append'); } }, createElement() { return {}; } },
      history: { pushState() {}, replaceState() {} },
      window: { addEventListener() {} },
    };
    vm.runInContext(analyticsBootSource(), vm.createContext(sandbox));
    const track = (sandbox.window as { fmTrack?: (name: string) => void }).fmTrack;
    assert.equal(typeof track, 'function');
    track?.('phone_click');
    assert.equal('dataLayer' in sandbox.window, false);
  });
});

describe('analytics sanitizers', () => {
  it('strips query, email, and traversal from page paths', () => {
    assert.equal(pagePath('/stairs-where-to-start?email=a@b.com'), '/stairs-where-to-start');
    assert.equal(pagePath('/../secret'), '/');
    assert.equal(pagePath('https://freedommobilityny.com/ramps?x=1'), '/ramps');
  });

  it('keeps a same-site referrer path and an external origin', () => {
    assert.equal(referrerValue('https://freedommobilityny.com/contact?email=a@b.com'), 'https://freedommobilityny.com/contact');
    assert.equal(referrerValue('https://news.example/a?q=1'), 'https://news.example');
    assert.equal(referrerHost('https://news.example/a?email=a@b.com'), 'news.example');
  });

  it('forwards only campaign tokens', () => {
    const search = sanitizedCampaignSearch('?utm_medium=email&fm_c=spring-stairs&email=a@b.com&gclid=abc&utm_content=a@b.com');
    assert.equal(search, '?utm_medium=email&fm_c=spring-stairs');
    assert.deepEqual(campaignParams('?utm_campaign=preview-secret&utm_source=ok'), {
      campaign_source: 'ok',
      campaign_name: 'preview',
    });
  });

  it('drops form fields from event parameters', () => {
    assert.deepEqual(sanitizeEventParams({
      place: 'header',
      channel: 'email',
      email: 'a@b.com',
      name: 'Jane',
      message: 'hello',
      phone: '585',
      page_location: 'https://example.com/?a=1',
    }), { place: 'header', channel: 'email' });
    assert.deepEqual(guideCompleteParams('stairlift'), { guide: 'stairs-where-to-start', result: 'stairlift' });
    assert.equal(guideCompleteParams('Jane Smith'), null);
  });
});

describe('lead success marker', () => {
  it('round-trips an allowlisted form and ignores extra fields', () => {
    const now = 1_700_000_000_000;
    const marker = createLeadMarker('contact', now);
    assert.equal(readLeadMarker(marker, now + 1000), 'contact');
    assert.equal(readLeadMarker(JSON.stringify({ form: 'contact', t: now, email: 'a@b.com' }), now), 'contact');
    assert.equal(readLeadMarker(marker, now + 31 * 60 * 1000), null);
    assert.equal(createLeadMarker('pay'), null);
  });

  it('consumes the marker so a refresh does not fire again', () => {
    const store = new Map<string, string>();
    globalThis.sessionStorage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => { store.set(key, value); },
      removeItem: (key) => { store.delete(key); },
      clear: () => { store.clear(); },
      key: () => null,
      get length() { return store.size; },
    } as Storage;
    rememberLead('stairs_guide');
    assert.equal(consumeLead(), 'stairs_guide');
    assert.equal(consumeLead(), null);
  });
});
