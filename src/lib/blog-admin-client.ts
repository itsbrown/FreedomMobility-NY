export const BLOG_DRAFTS_KEY = 'fm-blog-drafts';

export const BLOG_CATEGORIES = ['Stairlifts', 'Ramps', 'Lifts', 'Service', 'Aging in place'] as const;

export interface LocalDraft {
  id: string;
  slug: string;
  title: string;
  headline: string;
  description: string;
  category: (typeof BLOG_CATEGORIES)[number];
  body: string;
  updatedAt: string;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function listLocalDrafts(): LocalDraft[] {
  try {
    const raw = localStorage.getItem(BLOG_DRAFTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === 'string');
  } catch {
    return [];
  }
}

export function getLocalDraft(id: string): LocalDraft | null {
  return listLocalDrafts().find((item) => item.id === id) ?? null;
}

export function saveLocalDraft(input: Partial<LocalDraft> & { id?: string }): LocalDraft {
  const drafts = listLocalDrafts();
  const id = input.id || uid();
  const existing = drafts.find((item) => item.id === id);
  const next: LocalDraft = {
    id,
    slug: (input.slug || existing?.slug || 'untitled').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'untitled',
    title: (input.title ?? existing?.title ?? '').trim(),
    headline: (input.headline ?? existing?.headline ?? input.title ?? '').trim(),
    description: (input.description ?? existing?.description ?? '').trim(),
    category: (input.category ?? existing?.category ?? 'Stairlifts') as LocalDraft['category'],
    body: input.body ?? existing?.body ?? '',
    updatedAt: new Date().toISOString(),
  };
  const rest = drafts.filter((item) => item.id !== id);
  localStorage.setItem(BLOG_DRAFTS_KEY, JSON.stringify([next, ...rest]));
  return next;
}

export function deleteLocalDraft(id: string): void {
  localStorage.setItem(BLOG_DRAFTS_KEY, JSON.stringify(listLocalDrafts().filter((item) => item.id !== id)));
}

export function draftToMarkdown(draft: LocalDraft): string {
  const title = draft.title || `${draft.headline} | Freedom Mobility NY`;
  return `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(draft.description || draft.headline)}
headline: ${JSON.stringify(draft.headline || draft.title)}
pubDate: ${new Date().toISOString().slice(0, 10)}
draft: true
category: ${draft.category}
tags: []
---

${draft.body.trim()}
`;
}

export function markdownToHtml(md: string): string {
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const blocks = escaped.split(/\n{2,}/);
  return blocks.map((block) => {
    const lines = block.split('\n');
    if (lines[0].startsWith('### ')) return `<h3>${inline(lines[0].slice(4))}</h3>`;
    if (lines[0].startsWith('## ')) return `<h2>${inline(lines[0].slice(3))}</h2>`;
    if (lines[0].startsWith('# ')) return `<h2>${inline(lines[0].slice(2))}</h2>`;
    if (lines.every((line) => line.startsWith('- '))) {
      return `<ul>${lines.map((line) => `<li>${inline(line.slice(2))}</li>`).join('')}</ul>`;
    }
    if (lines.every((line) => /^\d+\.\s/.test(line))) {
      return `<ol>${lines.map((line) => `<li>${inline(line.replace(/^\d+\.\s/, ''))}</li>`).join('')}</ol>`;
    }
    return `<p>${lines.map(inline).join('<br />')}</p>`;
  }).join('');
}

function inline(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
