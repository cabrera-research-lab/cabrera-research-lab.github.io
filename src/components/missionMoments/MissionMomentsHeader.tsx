export function MissionMomentsHeader() {
  return (
    <header className="b2b-qc-header">
      <div className="b2b-qc-brand">
        <img
          src={`${import.meta.env.BASE_URL}logo_stsi.png`}
          alt="STSI Logo"
          className="b2b-qc-logo"
        />
        <div>
          <h1>Mission Moments QC Applet</h1>
          <p className="b2b-qc-sub">
            Seamless sign-in, correct first-click belt path, concise buyer-facing onboarding.
          </p>
        </div>
      </div>
      <div className="b2b-qc-pill">No Friction Standard</div>
    </header>
  );
}
