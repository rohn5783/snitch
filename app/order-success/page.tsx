import Link from "next/link";

type SearchParams = Promise<{ order_id?: string | string[] }>;

export default async function OrderSuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const orderId = Array.isArray(query.order_id) ? query.order_id[0] : query.order_id;
  return (
    <section className="order-success page-gutter">
      <span className="order-success__mark" aria-hidden="true">✓</span>
      <span className="eyebrow">THAT&apos;S A GOOD CHOICE</span>
      <h1>It&apos;s yours.<br /><em>Now make it yours.</em></h1>
      <p>Your payment has been verified. We have the details and your seller will take it from here.</p>
      {orderId && <div className="order-success__reference"><span className="eyebrow">PAYMENT REFERENCE</span><strong>{orderId}</strong></div>}
      <div className="order-success__actions"><Link className="solid-button" href="/orders">FOLLOW YOUR ORDER <span aria-hidden="true">↗</span></Link><Link className="text-link" href="/#collection">BACK TO THE EDIT</Link></div>
    </section>
  );
}
