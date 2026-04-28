import { Home, Users, User } from "lucide-react";

type BottomTabBarProps = {
  activeTab: "home" | "squad" | "profile";
};

type Tab = {
  key: "home" | "squad" | "profile";
  label: string;
  Icon: typeof Home;
};

const tabs: Tab[] = [
  { key: "home",    label: "Home",    Icon: Home },
  { key: "squad",   label: "Squad",   Icon: Users },
  { key: "profile", label: "Profile", Icon: User },
];

/**
 * Presentational bottom navigation bar.
 * Routing is NOT wired in M1 — tabs other than the active one are inert.
 * Navigation wiring arrives in M2 once D1 (state management) is decided.
 */
export default function BottomTabBar({ activeTab }: BottomTabBarProps) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-card border-t border-card-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
      aria-label="Main navigation"
    >
      <div className="max-w-[390px] mx-auto flex">
        {tabs.map(({ key, label, Icon }) => {
          const isActive = key === activeTab;
          return (
            <div
              key={key}
              // TODO: wire tab navigation when routes exist for Squad and Profile
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 ${
                isActive ? "text-coral" : "text-ink-soft"
              }`}
              role="tab"
              aria-selected={isActive}
              aria-label={label}
            >
              <Icon size={20} aria-hidden="true" />
              <span className="text-xs font-sans font-medium">{label}</span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
