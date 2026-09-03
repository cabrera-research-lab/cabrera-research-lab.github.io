export type InternalTool = {
  id: string;
  label: string;
  title: string;
  description: string;
  path: string;
};

export const INTERNAL_TOOLS: InternalTool[] = [
  {
    id: 'teaming',
    label: 'TE∆MING',
    title: 'TE∆MING SYSTEM',
    description: 'Mission-aligned cadence updates — daily, weekly, monthly, quarterly.',
    path: '/',
  },
  {
    id: 'mission-moments',
    label: 'Mission Moments',
    title: 'B2B Cohort Onboarding QC',
    description: 'Cohort setup review, belt paths, and go-live checks.',
    path: '/mission-moments',
  },
  {
    id: 'seo-geo',
    label: 'SEO & GEO',
    title: 'Search & generative health',
    description: 'SEO and GEO QC for practice.stsi.pro, stsi.pro, Camp, and JOST.',
    path: '/seo-geo',
  },
];

export function isToolActive(tool: InternalTool, pathname: string): boolean {
  if (tool.id === 'teaming') return pathname === '/';
  if (tool.id === 'mission-moments') {
    return pathname.startsWith('/mission-moments') || pathname.startsWith('/b2b-qc');
  }
  if (tool.id === 'seo-geo') return pathname.startsWith('/seo-geo');
  return pathname.startsWith(tool.path);
}

export function activeToolId(pathname: string): string | null {
  const match = INTERNAL_TOOLS.find((tool) => isToolActive(tool, pathname));
  return match?.id ?? null;
}
