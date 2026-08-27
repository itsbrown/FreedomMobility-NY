import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { draftToMarkdown, markdownToHtml, saveLocalDraft, BLOG_DRAFTS_KEY } from '../src/lib/blog-admin-client';

describe('device draft markdown', () => {
  it('wraps a draft as a repo-ready markdown file with draft: true', () => {
    const md = draftToMarkdown({
      id: 'abc',
      slug: 'winter-battery-tips',
      title: 'Winter battery tips | Freedom Mobility NY',
      headline: 'Winter battery tips',
      description: 'Keep outdoor lifts running in Buffalo snow.',
      category: 'Service',
      body: '## Cold weather\n\nCharge the batteries.',
      updatedAt: '2026-08-27T00:00:00.000Z',
    });
    assert.match(md, /draft: true/);
    assert.match(md, /category: Service/);
    assert.match(md, /## Cold weather/);
  });

  it('renders headings, lists, and links', () => {
    const html = markdownToHtml('## Cost\n\n- Straight: **$3,000**\n- Curved: more\n\nSee the [guide](/resources/stairlift-cost-guide).');
    assert.match(html, /<h2>Cost<\/h2>/);
    assert.match(html, /<strong>\$3,000<\/strong>/);
    assert.match(html, /href="\/resources\/stairlift-cost-guide"/);
  });
});

describe('device draft store', () => {
  it('round-trips a draft in localStorage', () => {
    globalThis.localStorage = {
      store: {} as Record<string, string>,
      getItem(key: string) { return this.store[key] ?? null; },
      setItem(key: string, value: string) { this.store[key] = value; },
      removeItem(key: string) { delete this.store[key]; },
      clear() { this.store = {}; },
      key() { return null; },
      get length() { return Object.keys(this.store).length; },
    } as unknown as Storage;

    const saved = saveLocalDraft({
      headline: 'Test post',
      slug: 'Test Post!!',
      description: 'Hello',
      category: 'Ramps',
      body: 'Body',
    });
    assert.equal(saved.slug, 'test-post');
    assert.ok(localStorage.getItem(BLOG_DRAFTS_KEY)?.includes('Test post'));
  });
});
