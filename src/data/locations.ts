// Centralized location data for SEO scalability
// When adding a new location:
// 1. Add a new entry to this array
// 2. The /locations/[slug] page and sitemap will automatically include it
// 3. Update any hardcoded mentions in other pages if you want deeper customization
// 4. Rebuild/deploy

export interface Location {
  slug: string;
  name: string;
  fullName: string; // e.g. "Rochester, NY"
  description: string;
  isPrimary?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export const locations: Location[] = [
  {
    slug: 'rochester',
    name: 'Rochester',
    fullName: 'Rochester, NY',
    description: 'Locally owned and operated in Rochester, NY. We provide expert stairlifts, ramps, vertical platform lifts, and home accessibility solutions throughout the greater Rochester area.',
    isPrimary: true,
    metaTitle: 'Home Accessibility Services in Rochester, NY | Stairlifts, Ramps & More',
    metaDescription: 'Freedom Mobility NY offers stairlifts, ramps, vertical lifts and expert installation in Rochester, NY. Free in-home consultations. Serving the greater Rochester area.',
  },
  {
    slug: 'buffalo',
    name: 'Buffalo',
    fullName: 'Buffalo, NY',
    description: 'Expert home accessibility services in Buffalo, NY and surrounding areas. Stairlifts, ramps, vertical platform lifts installed by local professionals.',
    metaTitle: 'Stairlifts, Ramps & Lifts in Buffalo, NY | Freedom Mobility NY',
    metaDescription: 'Professional stairlift, ramp and vertical platform lift installation in Buffalo, NY. Free consultations from your local accessibility experts.',
  },
  {
    slug: 'syracuse',
    name: 'Syracuse',
    fullName: 'Syracuse, NY',
    description: 'Serving Syracuse, NY with high-quality stairlifts, ramps, vertical lifts and home modifications. Locally owned team providing personalized service.',
    metaTitle: 'Accessibility Solutions in Syracuse, NY | Stairlifts & Ramps',
    metaDescription: 'Freedom Mobility NY provides stairlifts, ramps and vertical platform lifts in Syracuse, NY. Free in-home consultations. Call (585) 488-0771.',
  },
];

// Helper to get a location by slug
export function getLocationBySlug(slug: string): Location | undefined {
  return locations.find(loc => loc.slug === slug);
}

// Get all slugs for getStaticPaths
export function getAllLocationSlugs(): string[] {
  return locations.map(loc => loc.slug);
}
