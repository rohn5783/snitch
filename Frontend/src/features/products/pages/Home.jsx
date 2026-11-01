import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useProduct } from '../hooks/useProduct';
import { useNavigate, useSearchParams } from 'react-router';
import { useWishlist } from '../../wishlist/hook/useWishlist';
import { useToast } from '../../Shared/Components/Toast';
import { setSearchQuery, setSelectedCategory, setPriceRange, resetFilters } from '../state/product.slice';

const Home = () => {
    const products = useSelector(state => state.product.products);
    const searchQuery = useSelector(state => state.product.searchQuery);
    const selectedCategory = useSelector(state => state.product.selectedCategory);
    const priceRange = useSelector(state => state.product.priceRange);
    const user = useSelector(state => state.auth.user);

    const { handleGetAllProducts } = useProduct();
    const { isWishlisted, handleToggleWishlist, handleGetWishlist } = useWishlist();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();

    // Local search input state (controlled, dispatched on change)
    const [localSearch, setLocalSearch] = useState(searchQuery);

    useEffect(() => {
        handleGetAllProducts();
        if (user) handleGetWishlist();
    }, []);

    // Sync URL search param on mount
    useEffect(() => {
        const urlSearch = searchParams.get('search');
        if (urlSearch) {
            setLocalSearch(urlSearch);
            dispatch(setSearchQuery(urlSearch));
        }
    }, []);

    // Derive unique categories from product titles (simple word extraction)
    const categories = useMemo(() => {
        const cats = new Set();
        products.forEach(p => {
            // Use first word of title as a rough category
            if (p.title) cats.add(p.title.split(' ')[0]);
        });
        return Array.from(cats);
    }, [products]);

    // Client-side filter logic
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            // Search filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchesTitle = p.title?.toLowerCase().includes(q);
                const matchesDesc = p.description?.toLowerCase().includes(q);
                if (!matchesTitle && !matchesDesc) return false;
            }
            // Category filter
            if (selectedCategory) {
                if (!p.title?.toLowerCase().includes(selectedCategory.toLowerCase())) return false;
            }
            // Price filter
            const amount = p.price?.amount;
            if (priceRange.min !== '' && amount < Number(priceRange.min)) return false;
            if (priceRange.max !== '' && amount > Number(priceRange.max)) return false;

            return true;
        });
    }, [products, searchQuery, selectedCategory, priceRange]);

    async function handleHeartClick(e, productId) {
        e.stopPropagation();
        if (!user) {
            navigate('/login');
            return;
        }
        try {
            const added = await handleToggleWishlist(productId);
            addToast({
                message: added ? 'Added to wishlist.' : 'Removed from wishlist.',
                type: added ? 'success' : 'info',
            });
        } catch {
            addToast({ message: 'Could not update wishlist.', type: 'error' });
        }
    }

    return (
        <>
            {/* Google Fonts */}
            <link
                href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap"
                rel="stylesheet"
            />

            <div
                className="min-h-screen selection:bg-[#C9A96E]/30"
                style={{ backgroundColor: '#fbf9f6', fontFamily: "'Inter', sans-serif" }}
            >
                <div className="max-w-7xl mx-auto px-8 lg:px-16 xl:px-24">
                    {/* ── Hero / Header ── */}
                    <div className="pt-20 pb-12 text-center flex flex-col items-center">
                        <span className="text-[10px] uppercase tracking-[0.24em] font-medium mb-6" style={{ color: '#C9A96E' }}>
                            The Collection
                        </span>
                        <h1
                            className="text-5xl lg:text-7xl font-light leading-tight mb-6"
                            style={{ fontFamily: "'Cormorant Garamond', serif", color: '#1b1c1a' }}
                        >
                            Curated Archive
                        </h1>
                        <p className="max-w-xl mx-auto text-sm leading-relaxed" style={{ color: '#7A6E63' }}>
                            Discover our latest curation of premium minimalist pieces, meticulously designed for effortless elegance and enduring quality.
                        </p>
                    </div>

                    {/* ── Search + Filters ── */}
                    <div className="mb-12 flex flex-col gap-6">
                        {/* Search bar */}
                        <div
                            className="flex items-center gap-3 pb-3 mx-auto w-full max-w-lg"
                            style={{ borderBottom: '1px solid #1b1c1a' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B5ADA3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search pieces..."
                                value={localSearch}
                                onChange={e => {
                                    setLocalSearch(e.target.value);
                                    dispatch(setSearchQuery(e.target.value));
                                }}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '12px',
                                    letterSpacing: '0.06em',
                                    color: '#1b1c1a',
                                }}
                            />
                            {localSearch && (
                                <button
                                    onClick={() => { setLocalSearch(''); dispatch(setSearchQuery('')); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B5ADA3' }}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Category Pills + Price Range */}
                        <div className="flex flex-wrap items-center gap-4 justify-center">
                            {/* All pill */}
                            <button
                                onClick={() => dispatch(setSelectedCategory(''))}
                                className="px-4 py-2 text-[9px] uppercase tracking-[0.2em] font-medium transition-all duration-200 border"
                                style={{
                                    backgroundColor: selectedCategory === '' ? '#1b1c1a' : 'transparent',
                                    color: selectedCategory === '' ? '#fbf9f6' : '#7A6E63',
                                    borderColor: selectedCategory === '' ? '#1b1c1a' : '#d0c5b5',
                                }}
                            >
                                All
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => dispatch(setSelectedCategory(selectedCategory === cat ? '' : cat))}
                                    className="px-4 py-2 text-[9px] uppercase tracking-[0.2em] font-medium transition-all duration-200 border"
                                    style={{
                                        backgroundColor: selectedCategory === cat ? '#1b1c1a' : 'transparent',
                                        color: selectedCategory === cat ? '#fbf9f6' : '#7A6E63',
                                        borderColor: selectedCategory === cat ? '#1b1c1a' : '#d0c5b5',
                                    }}
                                >
                                    {cat}
                                </button>
                            ))}

                            {/* Divider */}
                            <span style={{ width: '1px', height: '24px', backgroundColor: '#e4e2df' }} />

                            {/* Price range */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={priceRange.min}
                                    onChange={e => dispatch(setPriceRange({ ...priceRange, min: e.target.value }))}
                                    style={{
                                        width: '72px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderBottom: '1px solid #d0c5b5',
                                        outline: 'none',
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: '11px',
                                        color: '#1b1c1a',
                                        padding: '2px 4px',
                                        textAlign: 'center',
                                    }}
                                />
                                <span style={{ color: '#B5ADA3', fontSize: '10px' }}>—</span>
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={priceRange.max}
                                    onChange={e => dispatch(setPriceRange({ ...priceRange, max: e.target.value }))}
                                    style={{
                                        width: '72px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderBottom: '1px solid #d0c5b5',
                                        outline: 'none',
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: '11px',
                                        color: '#1b1c1a',
                                        padding: '2px 4px',
                                        textAlign: 'center',
                                    }}
                                />
                            </div>

                            {/* Reset filters */}
                            {(searchQuery || selectedCategory || priceRange.min || priceRange.max) && (
                                <button
                                    onClick={() => { dispatch(resetFilters()); setLocalSearch(''); }}
                                    className="text-[9px] uppercase tracking-[0.18em] font-medium transition-colors hover:text-[#C9A96E]"
                                    style={{ color: '#B5ADA3', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Product Grid ── */}
                    {filteredProducts && filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16 pb-32">
                            {filteredProducts.map(product => {
                                const imageUrl = product.images && product.images.length > 0
                                    ? product.images[0].url
                                    : '/snitch_editorial_warm.png';
                                const wishlisted = isWishlisted(product._id);

                                return (
                                    <div
                                        onClick={() => navigate(`/product/${product._id}`)}
                                        key={product._id}
                                        className="group cursor-pointer flex flex-col"
                                        style={{ position: 'relative' }}
                                    >
                                        {/* Image Container */}
                                        <div className="aspect-[4/5] overflow-hidden mb-6" style={{ backgroundColor: '#f5f3f0', position: 'relative' }}>
                                            <img
                                                src={imageUrl}
                                                alt={product.title}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                            {/* Wishlist Heart */}
                                            <button
                                                onClick={(e) => handleHeartClick(e, product._id)}
                                                aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                                                style={{
                                                    position: 'absolute',
                                                    top: '12px',
                                                    right: '12px',
                                                    background: 'rgba(251,249,246,0.85)',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '34px',
                                                    height: '34px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    opacity: wishlisted ? 1 : 0,
                                                    transition: 'opacity 0.2s ease',
                                                }}
                                                className="group-hover:opacity-100"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill={wishlisted ? '#C9A96E' : 'none'}
                                                    stroke={wishlisted ? '#C9A96E' : '#1b1c1a'}
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Product Details */}
                                        <div className="flex flex-col gap-2">
                                            <h3
                                                className="text-xl leading-snug transition-colors duration-300 group-hover:text-[#C9A96E]"
                                                style={{ fontFamily: "'Cormorant Garamond', serif", color: '#1b1c1a' }}
                                            >
                                                {product.title}
                                            </h3>

                                            <p
                                                className="text-[12px] line-clamp-2 leading-relaxed"
                                                style={{ color: '#7A6E63' }}
                                            >
                                                {product.description}
                                            </p>

                                            <div className="mt-2">
                                                <span
                                                    className="text-[10px] uppercase tracking-[0.2em] font-medium"
                                                    style={{ color: '#1b1c1a' }}
                                                >
                                                    {product.price?.currency} {product.price?.amount?.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-24 text-center flex flex-col items-center">
                            <h2 className="text-2xl mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", color: '#1b1c1a' }}>
                                No pieces found.
                            </h2>
                            <p className="max-w-md mx-auto text-sm leading-relaxed" style={{ color: '#7A6E63' }}>
                                {searchQuery || selectedCategory || priceRange.min || priceRange.max
                                    ? 'Try adjusting your filters.'
                                    : 'We are currently preparing our next collection. Please check back later.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <footer className="border-t py-12 text-center" style={{ borderColor: '#e4e2df' }}>
                    <span
                        className="text-[10px] uppercase tracking-[0.35em]"
                        style={{ fontFamily: "'Cormorant Garamond', serif", color: '#C9A96E' }}
                    >
                        Snitch. © {new Date().getFullYear()}
                    </span>
                </footer>
            </div>
        </>
    );
};

export default Home;
