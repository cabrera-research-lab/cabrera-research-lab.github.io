import { useOrgSettings } from '@/apps/teaming/hooks/useOrgSettings';

function VisionText({ text }: { text: string }) {
  const match = text.match(/^(\S+)(\s[\s\S]*)$/);
  if (match && /^[0-9*★∆]/.test(match[1])) {
    return (
      <>
        <span className="num">{match[1]}</span>
        {match[2]}
      </>
    );
  }
  return <>{text}</>;
}

export function MissionVisionHero() {
  const { settings } = useOrgSettings();
  const { mission, vision } = settings.statement;

  return (
    <div className="mv-hero">
      <div className="mv-col mv-mission">
        <div className="mv-label">Mission</div>
        <div className="mv-text">{mission}</div>
      </div>
      <div className="mv-arrow" aria-hidden="true">
        →
      </div>
      <div className="mv-col mv-vision">
        <div className="mv-label">Vision</div>
        <div className="mv-text">
          <VisionText text={vision} />
        </div>
      </div>
    </div>
  );
}
