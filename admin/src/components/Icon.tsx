import type { CSSProperties } from 'react';

export type IconName = 'print';

const ICON_PATHS: Record<IconName, string> = {
  print: 'M18 3H6V7H4C3.44772 7 3 7.44772 3 8V14C3 14.5523 3.44772 15 4 15H6V19C6 19.5523 6.44772 20 7 20H17C17.5523 20 18 19.5523 18 19V15H20C20.5523 15 21 14.5523 21 14V8C21 7.44772 20.5523 7 20 7H18V3ZM8 5H16V7H8V5ZM6 11C5.44772 11 5 10.5523 5 10C5 9.44772 5.44772 9 6 9C6.55228 9 7 9.44772 7 10C7 10.5523 6.55228 11 6 11ZM8 17H16V14H8V17Z',
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export default function Icon({
  name,
  size = 16,
  color = 'currentColor',
  className,
  style,
  title,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={!title}
      aria-label={title ?? undefined}
      role="img"
      className={className}
      style={style}
    >
      <path d={ICON_PATHS[name]} fill={color} />
    </svg>
  );
}

// Notes:
// - This file currently contains only the print icon used by TreeViewer.
// - Add more icon names here as needed: download, close, help, info, arrow, etc.
// - Keeping icons in one shared component makes the plugin UI consistent and easier
//   to maintain across TreeViewer, TreeEditor, and any future plugin controls.
