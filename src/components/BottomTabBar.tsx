import Link from "next/link";
import { Home, Users, User } from "lucide-react";

type TabKey = "home" | "squad" | "profile";

type BottomTabBarProps = {
  activeTab: TabKey;
};

type Tab = {
  key: TabKey;
  label: string;
  Icon: typeof Home;
  href?: string; // wired tabs navigate; Squad is an inert stub until it's built
};

const tabs: Tab[] = [
  { key: "home",    label: "Home",    Icon: Home,  href: "/" },
  { key: "squad",   label: "Squad",   Icon: Users },
  { key: "profile", label: "Profile", Icon: User,  href: "/profile" },
];

/**
 * Presentational bottom navigation bar. Home and Profile are real links;
 * Squad stays inert until its route exists. Active state is prop-driven —
 * each page renders the bar with its own activeTab. The owner Dashboard
 * entry moved to the Profile screen (D16 consolidation).
 */
export default function BottomTabBar({ activeTab }: BottomTabBarProps) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-card border-t border-card-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
      aria-label="Main navigation"
    >
      <div className="max-w-[390px] mx-auto flex">
        {tabs.map(({ key, label, Icon, href }) => {
          const isActive = key === activeTab;
          const classes = `flex-1 flex flex-col items-center justify-center py-3 gap-0.5 ${
            isActive ? "text-coral" : "text-ink-soft"
          }`;
          const content = (
            <>
              <Icon size={20} aria-hidden="true" />
              <span className="text-xs font-sans font-medium">{label}</span>
            </>
          );
          return href ? (
            <Link
              key={key}
              href={href}
              className={classes}
              role="tab"
              aria-selected={isActive}
              aria-label={label}
            >
              {content}
            </Link>
          ) : (
            <div
              key={key}
              className={classes}
              role="tab"
              aria-selected={isActive}
              aria-label={label}
            >
              {content}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
