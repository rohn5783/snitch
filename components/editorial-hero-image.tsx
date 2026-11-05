import Image from "next/image";

export function EditorialHeroImage() {
  return (
    <div className="editorial-hero-image">
      <Image
        className="editorial-hero-image__photo"
        src="/snitch_editorial.png"
        alt="A dark, considered winter look in a city setting"
        fill
        loading="eager"
        sizes="(max-width: 760px) 100vw, 52vw"
        unoptimized
      />
      <div className="editorial-hero-image__shade" aria-hidden="true" />
      <span className="editorial-hero-image__caption">LOOK 01 / WINTER STUDY</span>
    </div>
  );
}
