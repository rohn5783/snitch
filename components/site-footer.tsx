import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Link className="wordmark wordmark--footer" href="/">SNITCH<span>®</span></Link>
          <p>Dress like you mean it.<br />Style, on your own terms.</p>
        </div>
        <div className="footer-column"><span className="eyebrow">Explore</span><Link href="/?search=men#collection">Men</Link><Link href="/?search=women#collection">Women</Link><Link href="/#collections">Collections</Link></div>
        <div className="footer-column"><span className="eyebrow">Your account</span><Link href="/profile">Profile</Link><Link href="/orders">Orders</Link><Link href="/wishlist">Wishlist</Link></div>
        <div className="footer-note"><span className="eyebrow">A different point of view</span><p>Good clothes aren&apos;t about keeping up. They&apos;re about finding what feels like you.</p><Link className="text-link" href="/register">Be part of it <span aria-hidden="true">↗</span></Link></div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} SNITCH. All rights reserved.</span><span>Made for the ones who make their own rules.</span><Link href="/seller/dashboard">Independent sellers welcome</Link></div>
    </footer>
  );
}
