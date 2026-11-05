"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/use-protected-route";
import { useStore } from "@/components/store-provider";

export default function ProfilePage() {
  const { ready, user } = useProtectedRoute();
  const { signOut, notify } = useStore();
  const router = useRouter();

  async function logout() {
    try {
      await signOut();
      router.replace("/");
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not sign out.", "error");
    }
  }

  if (!ready || !user) return <div className="center-state"><span className="loading-mark" /></div>;
  return (
    <div className="account-page page-gutter profile-page">
      <header className="page-heading" data-reveal><span className="eyebrow">YOUR EDIT / ACCOUNT</span><h1>Your corner<br /><em>of the world.</em></h1><p>All yours. No one else&apos;s.</p></header>
      <section className="profile-card">
        <div className="profile-card__avatar" aria-hidden="true">{user.fullname.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase()}</div>
        <div className="profile-card__identity"><span className="eyebrow">GOOD TO HAVE YOU HERE</span><h2>{user.fullname}</h2><span className={`status-pill status-pill--${user.role}`}>{user.role}</span></div>
        <div className="profile-card__details"><div><span className="eyebrow">EMAIL ADDRESS</span><p>{user.email}</p></div><div><span className="eyebrow">PHONE NUMBER</span><p>{user.contact || "Not added yet"}</p></div></div>
        <div className="profile-card__links"><Link href="/orders">YOUR ORDERS <span aria-hidden="true">↗</span></Link><Link href="/wishlist">YOUR WISHLIST <span aria-hidden="true">↗</span></Link>{user.role === "seller" && <Link href="/seller/dashboard">YOUR STUDIO <span aria-hidden="true">↗</span></Link>}</div>
        <button className="outline-button" onClick={logout}>SIGN OUT</button>
      </section>
    </div>
  );
}
