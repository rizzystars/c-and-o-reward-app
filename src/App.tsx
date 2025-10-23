import Points from "./pages/Points";
import { Routes, Route, Link } from "react-router-dom";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth";
import { useAuth } from "./state/auth";

import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import SignOut from "./pages/SignOut";

// (optional placeholders until you add real pages)
const Page = (t: string) => () => <div className="p-6">{t}</div>;

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
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="w-full bg-black border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-14 grid grid-cols-3 items-center">
          {/* Left: nav */}
          <nav className="hidden sm:flex gap-4 text-sm">
            <Link to="/">Home</Link>
            <Link to="/menu">Menu</Link>
            <Link to="/location">Location</Link>
            <AuthNav />
          </nav>

          {/* Center: logo */}
          <div className="justify-self-center">
            <Link to="/" className="text-lg font-semibold tracking-wide">CO</Link>
          </div>

          {/* Right: cart */}
          <div className="justify-self-end">
            <Link to="/cart" className="px-2 py-1 rounded hover:bg-white/10" aria-label="Cart">
              🛒 Cart
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="mb-4 rounded-lg bg-white/10 p-3 text-xl font-semibold">Tailwind OK</div>
        <Routes>
          <Route path="/" element={<Page("Home") />} />
          <Route path="/menu" element={<Page("Menu (Square)") />} />
          <Route path="/cart" element={<Page("Cart") />} />
          <Route path="/checkout" element={<Page("Checkout") />} />

          {/* Real Points page */}
          <Route path="/points" element={<Points />} />

          {/* Placeholders you can replace later */}
          <Route path="/profile" element={<Page("Profile") />} />
          <Route path="/orders" element={<Page("Order History") />} />
          <Route path="/location" element={<Page("Location") />} />
          <Route path="/privacy" element={<Page("Privacy & Data") />} />

          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signout" element={<SignOut />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-6 text-sm grid sm:grid-cols-3 gap-4 items-center">
          <div className="opacity-80">© 2025 C&amp;O Coffee Collective. All rights reserved.</div>
          <div className="flex gap-4 justify-center sm:justify-start">
            <a href="#/privacy">Privacy &amp; Data</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook</a>
          </div>
          <div className="justify-self-end">CO</div>
        </div>
      </footer>
    </div>
  );
}
