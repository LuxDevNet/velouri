// Viewfinder.tsx — the one signature chrome device: corner ticks framing
// the scene, borrowed from a camera viewfinder. Decorative only.

export interface ViewfinderProps {
  label?: string;
}

export function Viewfinder({ label }: ViewfinderProps) {
  return (
    <div className="viewfinder" aria-hidden="true">
      <span className="tick tick-tl" />
      <span className="tick tick-tr" />
      <span className="tick tick-bl" />
      <span className="tick tick-br" />
      {label && <span className="viewfinder-label mono">{label}</span>}
    </div>
  );
}
