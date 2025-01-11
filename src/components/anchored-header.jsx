export const AnchoredHeader = ({ children, level, id, ...props }) => {
  const HeaderTag = `h${level}`;
  const link = `#${id}`;

  return (
    <a href={link} className="group no-underline">
    <HeaderTag id={id} {...props}><span className="absolute -translate-x-[140%] opacity-0 group-hover:opacity-35">#</span>{' '}
      {children}
    </HeaderTag>
    </a>
  );
};
