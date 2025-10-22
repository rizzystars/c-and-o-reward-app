import { Routes, Route, Link } from "react-router-dom";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import SignOut from "./pages/SignOut";

export default function App() {
  useSupabaseAuth();
  return (
    <div className="min-h-full flex flex-col">
      <header className="w-full bg-black border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <nav className="hidden sm:flex gap-4 text-sm">
            <Link to="/">Home</Link>
            <Link to="/menu">Menu</Link>
            <Link to="/location">Location</Link>
            <Link to="/signin">Sign In</Link>
          </nav>
          <Link to="/" className="text-lg font-semibold">CO</Link>
          <Link to="/cart" className="px-2 py-1 rounded hover:bg-white/10">?? Cart</Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="mb-4 rounded-lg bg-white/10 p-3 text-xl font-semibold">Tailwind OK</div>
        <Routes>
          <Route path="/" element={<div className="p-6">Home</div>} />
          <Route path="/menu" element={<div className="p-6">Menu (Square)</div>} />
          <Route path="/cart" element={<div className="p-6">Cart</div>} />
          <Route path="/checkout" element={<div className="p-6">Checkout</div>} />
          <Route path="/points" element={<div className="p-6">Points & Rewards</div>} />
          <Route path="/profile" element={<div className="p-6">Profile</div>} />
          <Route path="/orders" element={<div className="p-6">Order History</div>} />
          <Route path="/location" element={<div className="p-6">Location</div>} />
          <Route path="/privacy" element={<div className="p-6">Privacy & Data</div>} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signout" element={<SignOut />} />
        </Routes>
      </main>

      <footer className="mt-auto border-t border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-6 text-sm grid sm:grid-cols-3 gap-4">
          <div className="opacity-80">© 2025 C&O Coffee Collective. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#/privacy">Privacy & Data</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook</a>
          </div>
          <div className="justify-self-end">CO</div>
        </div>
      </footer>
    </div>
  );
}
