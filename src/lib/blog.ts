import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

export function isLive(post: BlogPost): boolean {
  return post.data.draft !== true;
}

export function postSlug(post: BlogPost): string {
  return post.id.replace(/\.md$/, '');
}

export function publicPath(post: BlogPost): string {
  return `/resources/${postSlug(post)}`;
}

export function adminPreviewPath(post: BlogPost): string {
  return `/admin/blog/${postSlug(post)}`;
}

export function sortNewest(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => displayDate(b).valueOf() - displayDate(a).valueOf());
}

export async function getAllPosts(): Promise<BlogPost[]> {
  return sortNewest(await getCollection('blog'));
}

export async function getLivePosts(): Promise<BlogPost[]> {
  return sortNewest((await getCollection('blog')).filter(isLive));
}

export function relatedPosts(post: BlogPost, pool: BlogPost[], limit = 3): BlogPost[] {
  const live = pool.filter((item) => isLive(item) && postSlug(item) !== postSlug(post));
  const same = live.filter((item) => item.data.category === post.data.category);
  const rest = live.filter((item) => item.data.category !== post.data.category);
  return [...same, ...rest].slice(0, limit);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function displayDate(post: BlogPost): Date {
  return post.data.updatedDate ?? post.data.pubDate;
}
