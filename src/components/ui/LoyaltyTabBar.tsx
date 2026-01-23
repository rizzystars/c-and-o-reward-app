import { NavLink } from "react-router-dom";
import { useAuth } from "../../state/auth";

function TabItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex-1 flex flex-col items-center justify-center text-xs py-2",
          isActive ? "font-semibold" : "opacity-70",
        ].join(" ")
      }
    >
      <span>{label}</span>
    </NavLink>
  );
}

export function LoyaltyTabBar() {
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 z-40 sm:hidden">
      <div className="max-w-5xl mx-auto flex">
        <TabItem to="/" label="Home" />
        <TabItem to="/menu" label="Order" />
        <TabItem to="/points" label="Rewards" />
        <TabItem to={user ? "/profile" : "/signin"} label={user ? "Profile" : "Sign In"} />
      </div>
    </nav>
  );
}
