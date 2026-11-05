"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useStore } from "@/components/store-provider";

const mainLinks = [
  { label: "Men", href: "/?search=men#collection" },
  { label: "Women", href: "/?search=women#collection" },
  { label: "New arrivals", href: "/?sort=new#collection" },
  { label: "Collections", href: "/#collections" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { user, cart, wishlist, signOut, notify } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  if (pathname.startsWith("/login") || pathname.startsWith("/register")) return null;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (query) router.push(`/?search=${encodeURIComponent(query)}#collection`);
    setSearch("");
    setSearchOpen(false);
    setMenuOpen(false);
  }

  async function handleSignOut() {
    try {
      await signOut();
      notify("You have signed out.");
      router.push("/");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not sign out.", "error");
    }
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <button className="icon-button mobile-menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          <span className="menu-glyph" aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
        </button>
        <Link className="wordmark" href="/" aria-label="Snitch home">SNITCH<span>®</span></Link>
        <nav className={`primary-nav ${menuOpen ? "primary-nav--open" : ""}`} aria-label="Main navigation">
          {mainLinks.map((item) => <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
          <Link className="mobile-only" href="/orders" onClick={() => setMenuOpen(false)}>Orders</Link>
          <Link className="mobile-only" href={user?.role === "seller" ? "/seller/dashboard" : "/register"} onClick={() => setMenuOpen(false)}>Sell with us</Link>
        </nav>
        {searchOpen && (
          <form className="header-search" onSubmit={submitSearch}>
            <label className="sr-only" htmlFor="site-search">Search the collection</label>
            <input id="site-search" autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the collection" />
          </form>
        )}
        <div className="header-actions">
          <button className="header-action search-action" onClick={() => setSearchOpen((open) => !open)} aria-label={searchOpen ? "Close search" : "Search"}>
            <Icon name="search" />
          </button>
          <Link className="header-action account-action" href={user ? "/profile" : "/login"}>{user ? user.fullname.split(" ")[0] : "Account"}</Link>
          <Link className="header-action wishlist-action" href="/wishlist" aria-label={`Wishlist${wishlist.length ? `, ${wishlist.length} items` : ""}`}>
            <Icon name="heart" />{wishlist.length > 0 && <span className="count-badge">{wishlist.length}</span>}
          </Link>
          <Link className="header-action bag-action" href="/cart" aria-label={`Shopping bag${cart.items.length ? `, ${cart.items.length} items` : ""}`}>
            <Icon name="bag" /><span className="bag-label">Bag</span>{cart.items.length > 0 && <span className="count-badge">{cart.items.length}</span>}
          </Link>
          <button className="header-action sell-action" onClick={user ? handleSignOut : () => router.push("/register")}>
            {user ? "Sign out" : "Sell with us"}
          </button>
        </div>
      </div>
      <nav className="mobile-category-nav" aria-label="Shop categories">
        {mainLinks.map((item) => <Link key={item.label} href={item.href}>{item.label}</Link>)}
      </nav>
      <div className={`mobile-scrim ${menuOpen ? "mobile-scrim--visible" : ""}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
    </header>
  );
}

function Icon({ name }: { name: "search" | "heart" | "bag" }) {
  const common = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "search") return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
  if (name === "heart") return <svg {...common}><path d="M20.2 4.9a5.2 5.2 0 0 0-7.4 0L12 5.7l-.8-.8a5.2 5.2 0 1 0-7.4 7.4L12 20.5l8.2-8.2a5.2 5.2 0 0 0 0-7.4Z" /></svg>;
  return <svg {...common}><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>;
}
