import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const faq = z.object({
  question: z.string(),
  answer: z.string(),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(170),
    headline: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    category: z.enum(['Stairlifts', 'Ramps', 'Lifts', 'Service', 'Aging in place']),
    tags: z.array(z.string()).default([]),
    cities: z.array(z.string()).default(['Rochester', 'Buffalo', 'Syracuse']),
    hero: z.string().optional(),
    ctaTitle: z.string().default('Get a free in-home consultation'),
    ctaBody: z.string().default('We’ll measure your stairs or entry, explain options, and leave a written quote. No pressure.'),
    ctaHref: z.string().default('/contact'),
    ctaLabel: z.string().default('Request Free Quote'),
    relatedHrefs: z.array(z.string()).default([]),
    faqs: z.array(faq).default([]),
  }),
});

export const collections = { blog };
