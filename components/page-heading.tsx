import Link from "next/link";

export function PageHeading({
  label,
  title,
  backHref = "/",
  description,
}: {
  label: string;
  title: string;
  backHref?: string;
  description?: string;
}) {
  return (
    <header className="page-heading" data-reveal>
      <Link href={backHref} className="eyebrow page-heading__back"><span aria-hidden="true">←</span> BACK</Link>
      <span className="eyebrow">{label}</span>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}
