/** Consistent section eyebrow + heading + lede. */
export default function SectionHeading({ eyebrow, title, lede, align = 'left', className = '' }) {
  const alignment = align === 'center' ? 'items-center text-center mx-auto' : '';
  return (
    <div className={`flex max-w-2xl flex-col gap-3 ${alignment} ${className}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="text-2xl font-semibold sm:text-3xl lg:text-[2.1rem]">{title}</h2>
      {lede && <p className="lede">{lede}</p>}
    </div>
  );
}
