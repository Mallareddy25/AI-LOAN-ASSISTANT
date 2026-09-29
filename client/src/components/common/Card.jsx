/** Base glass card with an optional interactive tilt. */
export default function Card({ as: Tag = 'div', tilt = false, className = '', children, ...rest }) {
  return (
    <Tag
      className={`glass glass-edge glass-hover ${tilt ? 'tilt-card' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
