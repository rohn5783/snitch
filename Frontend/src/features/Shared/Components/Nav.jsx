import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router'
import { useAuth } from '../../auth/hook/useAuth'

const Nav = () => {
    const navigate = useNavigate()
    const user = useSelector(state => state.auth.user)
    const cartItems = useSelector(state => state.cart?.items)
    const wishlistItems = useSelector(state => state.wishlist?.items)
    const [searchOpen, setSearchOpen] = useState(false)
    const [searchValue, setSearchValue] = useState('')
    const { handleLogout } = useAuth()

    function handleSearchSubmit(e) {
        e.preventDefault()
        if (searchValue.trim()) {
            navigate(`/?search=${encodeURIComponent(searchValue.trim())}`)
            setSearchOpen(false)
            setSearchValue('')
        }
    }

    return (
        <nav
            className="px-8 lg:px-16 xl:px-24 pt-10 pb-6 flex items-center justify-between border-b"
            style={{ borderColor: '#e4e2df', position: 'relative' }}
        >
            <Link
                to="/"
                className="text-sm font-medium tracking-[0.35em] uppercase hover:opacity-80 transition-opacity"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: '#C9A96E' }}
            >
                Snitch.
            </Link>

            {/* Inline search bar */}
            {searchOpen && (
                <form
                    onSubmit={handleSearchSubmit}
                    style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '340px',
                        display: 'flex',
                        alignItems: 'center',
                        borderBottom: '1px solid #1b1c1a',
                    }}
                >
                    <input
                        autoFocus
                        value={searchValue}
                        onChange={e => setSearchValue(e.target.value)}
                        placeholder="Search pieces..."
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '11px',
                            letterSpacing: '0.08em',
                            color: '#1b1c1a',
                            padding: '4px 0',
                        }}
                    />
                    <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9A96E', padding: '0 4px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setSearchOpen(false); setSearchValue(''); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B5ADA3', padding: '0 4px' }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </form>
            )}

            <div className="flex gap-6 items-center text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: '#7A6E63' }}>
                {user ? (
                    <>
                        {/* Search icon */}
                        <button
                            onClick={() => setSearchOpen(v => !v)}
                            aria-label="Search"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1b1c1a', padding: 0 }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </button>

                        {/* Profile link */}
                        <Link
                            to="/profile"
                            className="transition-colors hover:text-[#C9A96E]"
                            style={{ color: '#1b1c1a' }}
                        >
                            {user.fullname?.split(' ')[0] || 'Account'}
                        </Link>

                        {user.role === 'seller' && (
                            <Link to="/seller/dashboard" className="transition-colors hover:text-[#C9A96E]">Seller Dashboard</Link>
                        )}

                        {/* Wishlist heart icon with count */}
                        <Link
                            to="/wishlist"
                            className="relative flex items-center hover:opacity-70 transition-opacity"
                            style={{ color: '#1b1c1a' }}
                            aria-label="Wishlist"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            {wishlistItems?.length > 0 && (
                                <span
                                    className="absolute -top-2 -right-2 flex items-center justify-center rounded-full text-white"
                                    style={{
                                        backgroundColor: '#C9A96E',
                                        width: '16px',
                                        height: '16px',
                                        fontSize: '9px',
                                        fontFamily: "'Inter', sans-serif",
                                        fontWeight: 600,
                                        letterSpacing: 0,
                                    }}
                                >
                                    {wishlistItems.length > 9 ? '9+' : wishlistItems.length}
                                </span>
                            )}
                        </Link>

                        {/* Cart bag icon with count */}
                        <Link
                            to="/cart"
                            className="relative flex items-center hover:opacity-70 transition-opacity"
                            style={{ color: '#1b1c1a' }}
                            aria-label="Shopping cart"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <path d="M16 10a4 4 0 0 1-8 0" />
                            </svg>
                            {cartItems?.length > 0 && (
                                <span
                                    className="absolute -top-2 -right-2 flex items-center justify-center rounded-full text-white"
                                    style={{
                                        backgroundColor: '#C9A96E',
                                        width: '16px',
                                        height: '16px',
                                        fontSize: '9px',
                                        fontFamily: "'Inter', sans-serif",
                                        fontWeight: 600,
                                        letterSpacing: 0,
                                    }}
                                >
                                    {cartItems.length > 9 ? '9+' : cartItems.length}
                                </span>
                            )}
                        </Link>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="transition-colors hover:text-[#C9A96E]"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6E63', fontFamily: "'Inter', sans-serif", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, padding: 0 }}
                        >
                            Sign Out
                        </button>
                    </>
                ) : (
                    <>
                        {/* Search icon even when not logged in */}
                        <button
                            onClick={() => setSearchOpen(v => !v)}
                            aria-label="Search"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6E63', padding: 0 }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </button>
                        <Link to="/login" className="transition-colors hover:text-[#C9A96E]">Sign In</Link>
                        <Link to="/register" className="transition-colors hover:text-[#C9A96E]">Sign Up</Link>
                    </>
                )}
            </div>
        </nav>
    )
}

export default Nav
