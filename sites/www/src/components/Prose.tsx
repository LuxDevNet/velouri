interface ProseProps {
  title: string;
  children: React.ReactNode;
}

// Shared `prose` component, seeded once per page (prose-privacy, prose-terms,
// prose-data, prose-about) on the spine.
export default function Prose({ title, children }: ProseProps) {
  return (
    <article className="prose">
      <h1>{title}</h1>
      {children}
    </article>
  );
}
