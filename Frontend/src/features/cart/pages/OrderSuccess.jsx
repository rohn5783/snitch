import React from 'react'
import { useLocation, Link } from 'react-router'
import { useSelector } from 'react-redux'

const tokens = {
    surface: '#fbf9f6',
    surfaceLow: '#f5f3f0',
    surfaceLowest: '#ffffff',
    surfaceHigh: '#eae8e5',
    surfaceHighest: '#e4e2df',
    onSurface: '#1b1c1a',
    onSurfaceVariant: '#4d463a',
    secondary: '#7A6E63',
    muted: '#B5ADA3',
    primary: '#C9A96E',
    primaryDark: '#745a27',
    outlineVariant: '#d0c5b5',
    outline: '#7f7668',
}

const OrderSuccess = () => {
    const location = useLocation()
    const user = useSelector(state => state.auth?.user)

    const queryParams = new URLSearchParams(location.search)
    const orderId = queryParams.get("order_id") || "SN-" + Math.floor(100000 + Math.random() * 900000)

    // Calculate arrival window 3 to 5 days ahead
    const now = new Date()
    const startEstimate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const endEstimate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
    const options = { month: 'short', day: 'numeric' }
    const arrivalRange = `${startEstimate.toLocaleDateString('en-US', options)} — ${endEstimate.toLocaleDateString('en-US', options)}`

    return (
        <>
            <link
                href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap"
                rel="stylesheet"
            />
            <div 
                className="min-h-screen pb-24 selection:bg-[#C9A96E]/30"
                style={{ backgroundColor: tokens.surface, fontFamily: "'Inter', sans-serif" }}
            >
                <main className="pt-12 lg:pt-20 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                        
                        {/* Left Column: Success Message & Summary */}
                        <div className="lg:col-span-7 space-y-12">
                            <section className="space-y-6">
                                <span 
                                    className="uppercase tracking-[0.2em] text-[10px]"
                                    style={{ color: tokens.secondary }}
                                >
                                    TRANSACTION COMPLETE
                                </span>
                                <h1 
                                    className="text-5xl md:text-7xl leading-tight font-light tracking-tight"
                                    style={{ fontFamily: "'Cormorant Garamond', serif", color: tokens.onSurface }}
                                >
                                    A piece of our <br/>
                                    <i className="italic">Atelier</i> is yours.
                                </h1>
                                <div className="space-y-2 mt-6">
                                    <p 
                                        className="text-sm uppercase tracking-widest"
                                        style={{ color: tokens.outline }}
                                    >
                                        Order Reference
                                    </p>
                                    <p 
                                        className="text-2xl"
                                        style={{ fontFamily: "'Cormorant Garamond', serif", color: tokens.primaryDark }}
                                    >
                                        #{orderId}
                                    </p>
                                </div>
                            </section>
                            
                            <section 
                                className="p-8 md:p-12 space-y-8"
                                style={{ backgroundColor: tokens.surfaceLow }}
                            >
                                <h3 
                                    className="text-xl pb-4"
                                    style={{ fontFamily: "'Cormorant Garamond', serif", borderBottom: `1px solid ${tokens.outlineVariant}` }}
                                >
                                    Payment Confirmed
                                </h3>
                                
                                <p className="text-sm leading-relaxed" style={{ color: tokens.secondary }}>
                                    Your transaction has been authenticated and registered in the archive. Detailed receipts and line-item breakdowns are securely cataloged in your account orders archive.
                                </p>
                                
                                <div 
                                    className="space-y-4 pt-4"
                                    style={{ borderTop: `1px solid ${tokens.outlineVariant}` }}
                                >
                                    <div 
                                        className="flex justify-between text-sm uppercase tracking-widest"
                                        style={{ color: tokens.secondary }}
                                    >
                                        <span>Status</span>
                                        <span className="font-medium" style={{ color: '#4a7a4a' }}>Paid</span>
                                    </div>
                                    <div 
                                        className="flex justify-between text-sm uppercase tracking-widest"
                                        style={{ color: tokens.secondary }}
                                    >
                                        <span>Shipping</span>
                                        <span>Complimentary</span>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right Column: Delivery Details & Actions */}
                        <div className="lg:col-span-5 lg:sticky lg:top-40 space-y-12 mt-12 lg:mt-0">
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <h3 
                                        className="text-xl italic"
                                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                                    >
                                        Arrival Estimate
                                    </h3>
                                    <p 
                                        className="leading-relaxed"
                                        style={{ color: tokens.onSurfaceVariant }}
                                    >
                                        Your curated selection is being prepared for transit. Expect arrival between <span className="font-semibold" style={{ color: tokens.onSurface }}>{arrivalRange}</span>.
                                    </p>
                                </div>
                                
                                <div className="space-y-4">
                                    <h3 
                                        className="text-xl italic"
                                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                                    >
                                        Recipient
                                    </h3>
                                    <p 
                                        className="leading-relaxed uppercase tracking-tighter text-sm"
                                        style={{ color: tokens.onSurfaceVariant }}
                                    >
                                        {user?.fullname || 'Esteemed Patron'}<br/>
                                        {user?.email || 'Archive Dispatch'}<br/>
                                        {user?.contact ? `Tel: ${user.contact}` : 'Priority Courier Dispatch'}
                                    </p>
                                </div>
                                
                                <div className="flex flex-col gap-4 pt-8">
                                    {/* Primary CTA */}
                                    <Link 
                                        to="/orders" 
                                        className="py-5 px-8 text-center text-xs uppercase tracking-[0.2em] transition-all duration-300"
                                        style={{
                                            backgroundColor: tokens.primaryDark,
                                            color: '#ffffff',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.opacity = '0.9'
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.opacity = '1'
                                        }}
                                    >
                                        View Order Status
                                    </Link>
                                    
                                    {/* Secondary CTA */}
                                    <Link 
                                        to="/" 
                                        className="py-5 px-8 text-center text-xs uppercase tracking-[0.2em] transition-all duration-300"
                                        style={{
                                            backgroundColor: 'transparent',
                                            border: `1px solid ${tokens.outline}`,
                                            color: tokens.onSurface,
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.backgroundColor = tokens.surfaceLow
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.backgroundColor = 'transparent'
                                        }}
                                    >
                                        Continue Shopping
                                    </Link>
                                </div>
                            </div>
                            
                            <div 
                                className="pt-12"
                                style={{ borderTop: `1px solid ${tokens.outlineVariant}40` }}
                            >
                                <p 
                                    className="text-[10px] uppercase tracking-widest leading-loose"
                                    style={{ color: tokens.outline }}
                                >
                                    A confirmation email has been dispatched. For bespoke alterations or inquiries, please contact our private concierge.
                                </p>
                            </div>
                        </div>
                        
                    </div>
                </main>
            </div>
        </>
    )
}

export default OrderSuccess
