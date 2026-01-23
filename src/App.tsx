import Points from "./pages/Points";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import MyRewards from "./pages/MyRewards";
import RewardDetails from "./pages/RewardDetails";

import { Routes, Route, Link } from "react-router-dom";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth";
import { useAuth } from "./state/auth";

import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import SignOut from "./pages/SignOut";
import { ToastViewport } from "./components/ui/Toast";
import { LoyaltyTabBar } from "./components/ui/LoyaltyTabBar";

// Simple placeholder component (for pages not built yet)
function SimplePage({ text }: { text: string }) {
  return <div className="p-6">{text}</div>;
}

// --- Header sub-component that switches links based on auth state
function AuthNav() {
  const { user } = useAuth();
  if (!user) return <Link to="/signin">Sign In</Link>;
  return (
    <>
      <Link to="/points">Points</Link>
      <Link to="/profile">Profile</Link>
      <Link to="/signout">Sign Out</Link>
    </>
  );
}

export default function App() {
  useSupabaseAuth();

  return (
    <div className="min-h-full flex flex-col bg-black text-white">
      {/* Header */}
      <header className="w-full bg-black border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-14 grid grid-cols-3 items-center">
          {/* Left: nav (desktop) */}
          <nav className="hidden sm:flex gap-4 text-sm">
            <Link to="/">Home</Link>
            <Link to="/menu">Menu</Link>
            <Link to="/location">Location</Link>
            <AuthNav />
          </nav>

          {/* Center: logo */}
          <div className="justify-self-center">
            <Link to="/" className="text-lg font-semibold tracking-wide">
              CO
            </Link>
          </div>

          {/* Right: cart */}
          <div className="justify-self-end">
            <Link
              to="/cart"
              className="px-2 py-1 rounded hover:bg-white/10"
              aria-label="Cart"
            >
              🛒 Cart
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 pb-24">
        <div className="mb-3 rounded-lg bg-white/10 p-2 text-xs uppercase tracking-[0.18em] opacity-70">
          C&amp;O Rewards
        </div>
        <Routes>
          {/* Loyalty home */}
          <Route path="/" element={<Home />} />

          {/* Core flows */}
          <Route path="/menu" element={<SimplePage text="Menu (Square integration TBD)" />} />
          <Route path="/cart" element={<SimplePage text="Cart" />} />
          <Route path="/checkout" element={<SimplePage text="Checkout" />} />

          {/* Loyalty pages */}
          <Route path="/points" element={<Points />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<SimplePage text="Order History" />} />
          <Route path="/location" element={<SimplePage text="Location" />} />
          <Route path="/privacy" element={<SimplePage text="Privacy &amp; Data" />} />
          <Route path="/my-rewards" element={<MyRewards />} />
          <Route path="/reward/:id" element={<RewardDetails />} />

          {/* Auth */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signout" element={<SignOut />} />
        </Routes>
      </main>

      {/* Bottom tab bar (mobile) */}
      <LoyaltyTabBar />

      {/* Footer (desktop) */}
      <footer className="hidden sm:block border-t border-white/10 mt-4">
        <div className="max-w-5xl mx-auto px-4 py-6 text-sm grid sm:grid-cols-3 gap-4 items-center">
          <div className="opacity-80">© 2025 C&amp;O Coffee Collective. All rights reserved.</div>
          <div className="flex gap-4 justify-center sm:justify-start">
            <Link to="/privacy">Privacy &amp; Data</Link>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook</a>
          </div>
          <div className="justify-self-end">CO</div>
        </div>
      </footer>

      {/* Toasts container */}
      <ToastViewport />
    </div>
  );
}
