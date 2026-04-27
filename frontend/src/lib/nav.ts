export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export const sideNavItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "dashboard" },
  { href: "/map", label: "Floor Map", icon: "map" },
  { href: "/sensors", label: "Sensor List", icon: "sensors" },
  { href: "/history", label: "History", icon: "history" },
];

export const topIconLinks: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: "notifications" },
  { href: "/search", label: "Search", icon: "search" },
];
