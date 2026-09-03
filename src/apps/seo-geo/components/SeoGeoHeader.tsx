export function SeoGeoHeader() {
  return (
    <header className="seo-geo-header">
      <div className="seo-geo-brand">
        <img
          src={`${import.meta.env.BASE_URL}logo_stsi.png`}
          alt="STSI Logo"
          className="seo-geo-logo"
        />
        <div>
          <h1>SEO &amp; GEO Health</h1>
          <p className="seo-geo-sub">
            Search and generative-engine readiness across STSI public properties.
          </p>
        </div>
      </div>
      <div className="seo-geo-pill">Internal QC</div>
    </header>
  );
}
