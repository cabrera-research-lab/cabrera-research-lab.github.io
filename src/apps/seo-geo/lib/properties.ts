import type { Property, PropertyId } from '@/apps/seo-geo/lib/types';

export const PROPERTIES: Property[] = [
  {
    id: 'practice',
    label: 'practice.stsi.pro',
    hosts: ['practice.stsi.pro', 'stsi.tools', 'www.stsi.tools'],
    canonicalHost: 'practice.stsi.pro',
    fetchUrl: 'https://stsi.tools/',
    aliasUrl: 'https://practice.stsi.pro/',
    platform: 'django',
    platformLabel: 'Django · Practice',
    rubric: 'practice-app',
    description:
      'STSI Practice (live host stsi.tools). Public product story should be indexable; learner attempts stay private.',
  },
  {
    id: 'stsi-pro',
    label: 'stsi.pro',
    hosts: ['stsi.pro', 'www.stsi.pro'],
    canonicalHost: 'stsi.pro',
    fetchUrl: 'https://stsi.pro/',
    platform: 'wix',
    platformLabel: 'Wix · Marketing',
    rubric: 'marketing-site',
    description: 'Public marketing site — blog, products, podcast. Primary SEO and GEO property.',
  },
  {
    id: 'camp',
    label: 'camp.stsi.pro',
    hosts: ['camp.stsi.pro'],
    canonicalHost: 'camp.stsi.pro',
    fetchUrl: 'https://camp.stsi.pro/',
    platform: 'mighty-networks',
    platformLabel: 'Mighty Networks · Camp',
    rubric: 'community',
    description:
      'C∆MP community. Score the public join/landing surface; member spaces behind login are expected.',
  },
  {
    id: 'jost',
    label: 'jost.science',
    hosts: ['jost.science', 'www.jost.science'],
    canonicalHost: 'jost.science',
    fetchUrl: 'https://jost.science/',
    platform: 'open-science',
    platformLabel: 'Open science',
    rubric: 'open-science',
    description:
      'Journal of Systems Thinking (jost.science redirects to ScienceOpen). Web SEO plus scholarly and AI citability of open research.',
  },
  {
    id: 'cabreralab',
    label: 'cabreralab.science',
    hosts: ['cabreralab.science', 'www.cabreralab.science'],
    canonicalHost: 'cabreralab.science',
    fetchUrl: 'https://cabreralab.science/',
    aliasUrl: 'https://www.cabreralab.science/',
    platform: 'open-science',
    platformLabel: 'Cabrera Lab · Science',
    rubric: 'open-science',
    description:
      'Cabrera Research Lab — DSRP / O-Theory science partner of STSI. Public lab story, research, and contact.',
  },
  {
    id: 'evidence',
    label: 'evidence.cabreralab.science',
    hosts: ['evidence.cabreralab.science'],
    canonicalHost: 'evidence.cabreralab.science',
    fetchUrl: 'https://evidence.cabreralab.science/',
    platform: 'open-science',
    platformLabel: 'Cabrera Lab · Evidence',
    rubric: 'open-science',
    description:
      'Living DSRP / O-Theory evidence compendium. Indexable open science; AI crawlers should be able to quote the public record.',
  },
];

export const PROPERTY_IDS = PROPERTIES.map((property) => property.id);

export function isPropertyId(value: string | undefined): value is PropertyId {
  return !!value && (PROPERTY_IDS as string[]).includes(value);
}

export function getProperty(id: PropertyId): Property {
  const property = PROPERTIES.find((item) => item.id === id);
  if (!property) throw new Error(`Unknown SEO/GEO property: ${id}`);
  return property;
}
