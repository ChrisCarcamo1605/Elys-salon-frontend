// Inline SVG icons. All use currentColor and stroke-width 1.5 for a light, modern feel.
const Icon = ({ d, size = 20, fill = "none", stroke = "currentColor", sw = 1.7, children, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={stroke}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {d ? <path d={d} /> : children}
  </svg>
);

const Icons = {
  Lock: (p) => <Icon {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/></Icon>,
  Unlock: (p) => <Icon {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7a4 4 0 0 1 7.5-2"/></Icon>,
  Cart: (p) => <Icon {...p}><path d="M3 4h2.2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 1.95-1.55L21.5 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/></Icon>,
  Box: (p) => <Icon {...p}><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/></Icon>,
  Chart: (p) => <Icon {...p}><path d="M3.5 20.5h17"/><path d="M6 17V11M10 17V7M14 17v-4M18 17V9"/></Icon>,
  Trophy: (p) => <Icon {...p}><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a2 2 0 0 0 0 4H7M17 6h2.5a2 2 0 0 1 0 4H17"/><path d="M9.5 13.5 9 18h6l-.5-4.5M8 20.5h8"/></Icon>,
  Settings: (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.8-1.4-2-3.4-2.2.8a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.4 2a7.6 7.6 0 0 0-2.6 1.5l-2.2-.8-2 3.4 1.8 1.4a7.6 7.6 0 0 0 0 3l-1.8 1.4 2 3.4 2.2-.8a7.6 7.6 0 0 0 2.6 1.5l.4 2h4l.4-2a7.6 7.6 0 0 0 2.6-1.5l2.2.8 2-3.4z"/></Icon>,
  Users: (p) => <Icon {...p}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.7-3.5 3.3-5.5 6.5-5.5s5.8 2 6.5 5.5"/><circle cx="17" cy="9" r="2.8"/><path d="M16 14.7c2.7.2 4.6 1.9 5.2 4.8"/></Icon>,
  Search: (p) => <Icon {...p}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></Icon>,
  Plus: (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  Minus: (p) => <Icon {...p}><path d="M5 12h14"/></Icon>,
  X: (p) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18"/></Icon>,
  Check: (p) => <Icon {...p}><path d="m4.5 12.5 5 5 10-11"/></Icon>,
  Tag: (p) => <Icon {...p}><path d="M3.5 3.5h7L21 14l-7 7L3.5 10.5z"/><circle cx="8" cy="8" r="1.4"/></Icon>,
  Trash: (p) => <Icon {...p}><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8l1-13M10 11v7M14 11v7"/></Icon>,
  Cash: (p) => <Icon {...p}><rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5h.01M18 14.5h.01"/></Icon>,
  Card: (p) => <Icon {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19M6 15h3"/></Icon>,
  ArrowLeft: (p) => <Icon {...p}><path d="M19 12H5M11 18l-6-6 6-6"/></Icon>,
  ArrowRight: (p) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Icon>,
  Logout: (p) => <Icon {...p}><path d="M9 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4M16 8l4 4-4 4M9.5 12H20"/></Icon>,
  Sparkle: (p) => <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.5 2.5M16 16l2.5 2.5M5.5 18.5 8 16M16 8l2.5-2.5"/></Icon>,
  Receipt: (p) => <Icon {...p}><path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21zM8 8h8M8 12h8M8 16h5"/></Icon>,
  Clock: (p) => <Icon {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></Icon>,
  TrendUp: (p) => <Icon {...p}><path d="M3 17l6-6 4 4 8-9M14 6h7v7"/></Icon>,
  Moon: (p) => <Icon {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></Icon>,
  Sun: (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></Icon>,
  Backspace: (p) => <Icon {...p}><path d="M22 5H9L2 12l7 7h13a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/></Icon>,
  Grip: (p) => <Icon {...p} sw={0}><circle cx="9" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.5" fill="currentColor" stroke="none"/></Icon>,
  Refresh: (p) => <Icon {...p}><path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9c2.4 0 4.6.9 6.2 2.4L21 8"/><path d="M21 3v5h-5"/></Icon>,
  Eye: (p) => <Icon {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></Icon>,
  EyeOff: (p) => <Icon {...p}><path d="M17.9 17.9A9.9 9.9 0 0 1 12 19C5.6 19 2 12 2 12a17.8 17.8 0 0 1 5.1-5.9M9.5 4.6A9.2 9.2 0 0 1 12 5c6.4 0 10 7 10 7a17.8 17.8 0 0 1-2.3 3.5M3 3l18 18"/></Icon>,
};

export { Icons };
