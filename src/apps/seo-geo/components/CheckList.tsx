import type { HealthCheck } from '@/apps/seo-geo/lib/types';

const DOT: Record<HealthCheck['state'], string> = {
  pass: '✓',
  warn: '!',
  fail: '×',
};

export function CheckList({ title, checks }: { title: string; checks: HealthCheck[] }) {
  return (
    <section className="seo-geo-card">
      <h2>{title}</h2>
      <div className="seo-geo-checks">
        {checks.map((item) => (
          <article key={item.id} className={`seo-geo-check ${item.state}`}>
            <span className="seo-geo-dot" aria-hidden="true">
              {DOT[item.state]}
            </span>
            <div>
              <b>{item.name}</b>
              <p>{item.detail}</p>
            </div>
            <span className="seo-geo-tag">{item.state}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
