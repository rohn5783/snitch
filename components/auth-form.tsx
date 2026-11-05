"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useStore } from "@/components/store-provider";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const [fullname, setFullname] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSeller, setIsSeller] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { signIn, signUp } = useStore();
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = isRegister
        ? await signUp({ fullname: fullname.trim(), contact: contact.replace(/\D/g, "").slice(-10), email: email.trim(), password, isSeller })
        : await signIn(email.trim(), password);
      router.push(user.role === "seller" ? "/seller/dashboard" : "/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className={`auth-image ${isRegister ? "auth-image--register" : ""}`}>
        <Image src={isRegister ? "/snitch_editorial_warm.png" : "/snitch_editorial.png"} alt="" fill sizes="(max-width: 760px) 0px, 52vw" unoptimized />
        <div className="auth-image__overlay" />
        <Link className="wordmark auth-image__brand" href="/">SNITCH<span>®</span></Link>
        <div className="auth-image__quote"><span className="eyebrow">YOUR OWN POINT OF VIEW</span><p>{isRegister ? <>Nothing to prove.<br /><em>Everything to express.</em></> : <>A good thing<br /><em>looks good on you.</em></>}</p><span className="auth-image__folio">STUDY 01 — EST. 2025</span></div>
      </div>
      <section className="auth-panel">
        <Link className="wordmark auth-panel__brand" href="/">SNITCH<span>®</span></Link>
        <span className="eyebrow">{isRegister ? "FIND YOUR PEOPLE" : "WELCOME BACK"}</span>
        <h1>{isRegister ? <>Make it<br /><em>your own.</em></> : <>Good to<br /><em>see you.</em></>}</h1>
        <p className="auth-panel__intro">{isRegister ? "Join the edit. Shop independent labels or bring your collection to life." : "Your edit is waiting. Sign in to pick up where you left off."}</p>
        <form className="auth-form" onSubmit={submit}>
          {isRegister && <label>FULL NAME<input name="fullname" autoComplete="name" value={fullname} onChange={(event) => setFullname(event.target.value)} minLength={3} required placeholder="How should we call you?" /></label>}
          {isRegister && <label>PHONE NUMBER<input name="contact" autoComplete="tel" inputMode="numeric" pattern="[0-9+() -]{10,18}" value={contact} onChange={(event) => setContact(event.target.value)} required placeholder="+91 98765 43210" /></label>}
          <label>EMAIL ADDRESS<input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@somewhere.com" /></label>
          <label>PASSWORD<input name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={isRegister ? 6 : undefined} required placeholder={isRegister ? "At least 6 characters" : "Your password"} /></label>
          {isRegister && <label className="seller-check"><input type="checkbox" checked={isSeller} onChange={(event) => setIsSeller(event.target.checked)} /><span><strong>I have pieces to share.</strong><small>Open a seller studio and list your collection.</small></span></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="solid-button auth-submit" disabled={busy}>{busy ? "ONE MOMENT…" : isRegister ? "CREATE YOUR ACCOUNT" : "SIGN IN"} <span aria-hidden="true">↗</span></button>
        </form>
        <div className="auth-divider"><span>OR</span></div>
        <form action="/api/auth/google" method="get">
          <button className="oauth-button" type="submit"><GoogleMark /> Continue with Google</button>
        </form>
        <p className="auth-switch">{isRegister ? "Already know your way around?" : "New to the edit?"} <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
        <Link className="auth-back" href="/">← BACK TO SNITCH</Link>
      </section>
    </div>
  );
}

function GoogleMark() {
  return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.74 13.72 17.74 9.5 24 9.5Z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19Z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" /></svg>;
}
