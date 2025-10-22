import { Routes, Route, Link } from "react-router-dom";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import SignOut from "./pages/SignOut";

function Header(){
  return (
    <header className="w-full bg-black border-b border-white/10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="px-2 py-1 rounded hover:bg-white/10">?</button>
          <nav className="hidden sm:flex gap-4 text-sm">
            <Link to="/">Home</Link>
            <Link to="/menu">Menu</Link>
            <Link to="/location">Location</Link>
            <Link to="/signin">Sign In</Link>
          </nav>
        </div>
        <Link to="/" className="text-lg font-semibold">C&O</Link>
        <Link to="/cart" className="px-2 py-1 rounded hover:bg-white/10">?? Cart</Link>
      </div>
    </header>
  );
}

function Footer(){
  return (
    <footer className="mt-auto border-t border-white/10">
      <div className="max-w-5xl mx-auto px-4 py-6 text-sm grid sm:grid-cols-3 gap-4">
        <div className="opacity-80">© 2025 C&O Coffee Collective. All rights reserved.</div>
        <div className="flex gap-4">
          <a href="#/privacy">Privacy & Data</a>
          <a href="https://instagram.com" target="_blank">Instagram</a>
          <a href="https://facebook.com" target="_blank">Facebook</a>
        </div>
        <div className="justify-self-end">C&O</div>
      </div>
    </footer>
  );
}

const Page = (t:string) => () => <div className="p-6">{t}</div>;

export default function App(){
  useSupabaseAuth();
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="mb-4 rounded-lg bg-white/10 p-3 text-2xl font-bold">Tailwind OK ?</div>
        <Routes>
          <Route path="/" element={<Page("Home")/>} />
          <Route path="/menu" element={<Page("Menu (Square)")/>} />
          <Route path="/cart" element={<Page("Cart")/>} />
          <Route path="/checkout" element={<Page("Checkout")/>} />
          <Route path="/points" element={<Page("Points & Rewards")/>} />
          <Route path="/profile" element={<Page("Profile")/>} />
          <Route path="/orders" element={<Page("Order History")/>} />
          <Route path="/location" element={<Page("Location")/>} />
          <Route path="/privacy" element={<Page("Privacy & Data")/>} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signout" element={<SignOut />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
