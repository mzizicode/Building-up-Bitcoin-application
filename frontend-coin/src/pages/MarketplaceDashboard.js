// src/pages/MarketplaceDashboard.js - Main Marketplace Interface with Public/Private Access
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MarketplaceDashboard.css';

function MarketplaceDashboard() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [walletBalance, setWalletBalance] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showItemModal, setShowItemModal] = useState(false);

    // 🔐 NEW: Authentication state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userData, setUserData] = useState(null);

    // 🔐 NEW: Check authentication status
    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        const userDataStr = localStorage.getItem('userData');

        if (authToken && userDataStr) {
            setIsAuthenticated(true);
            setUserData(JSON.parse(userDataStr));
            console.log('✅ User is authenticated - full marketplace access');
        } else {
            setIsAuthenticated(false);
            console.log('👀 Viewing marketplace in read-only mode');
        }
    }, []);

    useEffect(() => {
        loadItems();
        loadCategories();
        if (isAuthenticated) {
            loadWalletBalance();
        }
    }, [currentPage, selectedCategory, sortBy, searchQuery, minPrice, maxPrice, isAuthenticated]);

    const loadItems = async () => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams({
                page: currentPage,
                size: 20,
                ...(searchQuery && { query: searchQuery }),
                ...(selectedCategory && { categoryId: selectedCategory }),
                ...(sortBy && { sortBy: sortBy }),
                ...(minPrice && { minPrice: minPrice }),
                ...(maxPrice && { maxPrice: maxPrice })
            });

            // 🔐 For demo purposes, load from localStorage if backend is not available
            const response = await fetch(`http://localhost:8080/api/marketplace/items?${params}`)
                .catch(() => null);

            if (response && response.ok) {
                const data = await response.json();
                if (data.success) {
                    setItems(data.items || []);
                    setTotalPages(data.totalPages || 0);
                    return;
                }
            }

            // 🔗 Fallback to localStorage demo data
            console.log('🔗 Loading demo marketplace data from localStorage');
            const demoItems = JSON.parse(localStorage.getItem('marketplaceProducts') || '[]');

            // Apply client-side filtering for demo
            let filteredItems = demoItems;

            if (searchQuery) {
                filteredItems = filteredItems.filter(item =>
                    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.description.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            if (selectedCategory) {
                filteredItems = filteredItems.filter(item =>
                    item.category === selectedCategory
                );
            }

            if (minPrice) {
                filteredItems = filteredItems.filter(item => item.price >= parseInt(minPrice));
            }

            if (maxPrice) {
                filteredItems = filteredItems.filter(item => item.price <= parseInt(maxPrice));
            }

            // Apply sorting
            switch (sortBy) {
                case 'price_asc':
                    filteredItems.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    filteredItems.sort((a, b) => b.price - a.price);
                    break;
                case 'oldest':
                    filteredItems.sort((a, b) => new Date(a.datePosted) - new Date(b.datePosted));
                    break;
                default: // newest
                    filteredItems.sort((a, b) => new Date(b.datePosted) - new Date(a.datePosted));
            }

            setItems(filteredItems);
            setTotalPages(Math.ceil(filteredItems.length / 20));

        } catch (error) {
            console.error('Failed to load marketplace items:', error);
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/marketplace/categories')
                .catch(() => null);

            if (response && response.ok) {
                const data = await response.json();
                if (data.success) {
                    setCategories(data.categories || []);
                    return;
                }
            }

            // 🔗 Fallback to demo categories
            const demoCategories = [
                { id: 'Photography', name: 'Photography' },
                { id: 'Electronics', name: 'Electronics' },
                { id: 'Books', name: 'Books' },
                { id: 'Travel', name: 'Travel' },
                { id: 'Art', name: 'Art & Crafts' },
                { id: 'Sports', name: 'Sports & Recreation' }
            ];
            setCategories(demoCategories);

        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const loadWalletBalance = async () => {
        if (!isAuthenticated) return;

        try {
            const response = await fetch('http://localhost:8080/api/wallet/balance', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            }).catch(() => null);

            if (response && response.ok) {
                const data = await response.json();
                if (data.success) {
                    setWalletBalance(data.wallet?.availableBalance || 0);
                    return;
                }
            }

            // 🔗 Fallback to localStorage wallet balance
            const savedBalance = localStorage.getItem('walletBalance');
            setWalletBalance(savedBalance ? parseInt(savedBalance) : 125);

        } catch (error) {
            console.error('Failed to load wallet balance:', error);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(0);
        loadItems();
    };

    const handleItemClick = async (item) => {
        setSelectedItem(item);
        setShowItemModal(true);

        // Track view only if authenticated
        if (isAuthenticated) {
            try {
                await fetch(`http://localhost:8080/api/marketplace/items/${item.id}/view`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
            } catch (error) {
                // Ignore view tracking errors
            }
        }
    };

    // 🔐 UPDATED: Check authentication before purchase
    const handlePurchase = async (item) => {
        if (!isAuthenticated) {
            alert('Please sign in to purchase items');
            navigate('/signin');
            return;
        }

        if (walletBalance < item.price) {
            alert('Insufficient coins! Please top up your wallet.');
            navigate('/wallet');
            return;
        }

        if (window.confirm(`Purchase "${item.title}" for ${item.price} coins?`)) {
            try {
                const response = await fetch('http://localhost:8080/api/orders', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        itemId: item.id,
                        quantity: 1
                    })
                }).catch(() => null);

                if (response && response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        alert('🎉 Purchase successful! Check your orders.');
                        setShowItemModal(false);
                        loadWalletBalance();
                        navigate('/orders');
                        return;
                    }
                }

                // 🔗 Demo purchase for localStorage
                alert('🎉 Demo purchase successful! (This is a demo transaction)');
                const newBalance = walletBalance - item.price;
                setWalletBalance(newBalance);
                localStorage.setItem('walletBalance', newBalance.toString());
                setShowItemModal(false);

            } catch (error) {
                alert('Purchase failed: ' + error.message);
            }
        }
    };

    // 🔐 UPDATED: Check authentication before favoriting
    const toggleFavorite = async (itemId) => {
        if (!isAuthenticated) {
            alert('Please sign in to save favorites');
            navigate('/signin');
            return;
        }

        try {
            const response = await fetch(`http://localhost:8080/api/marketplace/items/${itemId}/favorite`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            }).catch(() => null);

            if (response && response.ok) {
                loadItems(); // Refresh items to update favorite count
            } else {
                // Demo favorite toggle
                alert('❤️ Added to favorites! (Demo mode)');
            }
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        }
    };

    // 🔐 UPDATED: Check authentication before navigating to protected routes
    const handleProtectedNavigation = (route) => {
        if (!isAuthenticated) {
            alert('Please sign in to access this feature');
            navigate('/signin');
            return;
        }
        navigate(route);
    };

    const formatPrice = (price) => {
        return `${price} coins`;
    };

    const getConditionBadge = (condition) => {
        const badges = {
            'NEW': { text: 'New', color: '#10b981' },
            'USED_LIKE_NEW': { text: 'Like New', color: '#3b82f6' },
            'USED_GOOD': { text: 'Good', color: '#f59e0b' },
            'USED_FAIR': { text: 'Fair', color: '#ef4444' },
            'FOR_PARTS': { text: 'Parts', color: '#6b7280' },
            // Demo conditions
            'Used - Excellent': { text: 'Excellent', color: '#10b981' },
            'Used - Very Good': { text: 'Very Good', color: '#3b82f6' },
            'Used - Good': { text: 'Good', color: '#f59e0b' },
            'New': { text: 'New', color: '#10b981' }
        };

        const badge = badges[condition] || badges['NEW'];
        return (
            <span
                className="condition-badge"
                style={{ backgroundColor: badge.color }}
            >
                {badge.text}
            </span>
        );
    };

    const getItemImages = (item) => {
        try {
            // Handle both JSON string and direct array/string
            if (typeof item.images === 'string') {
                return JSON.parse(item.images);
            } else if (Array.isArray(item.images)) {
                return item.images;
            } else if (item.image) {
                return [item.image]; // Demo fallback
            }
            return [];
        } catch {
            return item.image ? [item.image] : [];
        }
    };

    return (
        <div className="marketplace-dashboard">
            {/* 🔐 UPDATED: Header with authentication-aware content */}
            <div className="marketplace-header">
                <div className="header-content">
                    <h1>🛍️ Marketplace</h1>
                    {isAuthenticated ? (
                        <p>Buy and sell with coins • Welcome back, {userData?.name}!</p>
                    ) : (
                        <p>Browse items • Sign in to buy and sell</p>
                    )}

                    {isAuthenticated ? (
                        <div className="wallet-display">
                            <span className="wallet-balance">💰 {walletBalance} coins</span>
                            <button
                                className="top-up-btn"
                                onClick={() => navigate('/wallet')}
                            >
                                Top Up
                            </button>
                        </div>
                    ) : (
                        <div className="auth-prompt">
                            <button
                                className="signin-btn"
                                onClick={() => navigate('/signin')}
                            >
                                🔐 Sign In to Trade
                            </button>
                            <button
                                className="register-btn"
                                onClick={() => navigate('/register')}
                            >
                                📝 Create Account
                            </button>
                        </div>
                    )}
                </div>

                <div className="quick-actions">
                    <button
                        className="action-btn sell-btn"
                        onClick={() => handleProtectedNavigation('/marketplace/sell')}
                    >
                        <span>📦 Sell Items</span>
                    </button>
                    <button
                        className="action-btn orders-btn"
                        onClick={() => handleProtectedNavigation('/orders')}
                    >
                        <span>📋 My Orders</span>
                    </button>
                    <button
                        className="action-btn favorites-btn"
                        onClick={() => handleProtectedNavigation('/favorites')}
                    >
                        <span>❤️ Favorites</span>
                    </button>
                </div>
            </div>

            {/* 🔐 UPDATED: Public access notice */}
            {!isAuthenticated && (
                <div className="public-access-notice">
                    <div className="notice-content">
                        <span className="notice-icon">👀</span>
                        <div className="notice-text">
                            <strong>Browsing in read-only mode</strong>
                            <p>Sign in to buy items, sell your own, and save favorites</p>
                        </div>
                        <button
                            className="notice-signin-btn"
                            onClick={() => navigate('/signin')}
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="search-section">
                <form onSubmit={handleSearch} className="search-form">
                    <div className="search-input-group">
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                        <button type="submit" className="search-btn">
                            🔍 Search
                        </button>
                    </div>
                </form>

                <div className="filters-section">
                    <button
                        className="filters-toggle"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        🔧 Filters {showFilters ? '−' : '+'}
                    </button>

                    {showFilters && (
                        <div className="filters-panel">
                            <div className="filter-group">
                                <label>Category</label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value);
                                        setCurrentPage(0);
                                    }}
                                    className="filter-select"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Sort By</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="price_asc">Price: Low to High</option>
                                    <option value="price_desc">Price: High to Low</option>
                                    <option value="views">Most Viewed</option>
                                    <option value="favorites">Most Favorited</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Price Range</label>
                                <div className="price-range">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value)}
                                        className="price-input"
                                    />
                                    <span>to</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                        className="price-input"
                                    />
                                    <span>coins</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Items Grid */}
            {isLoading ? (
                <div className="loading-section">
                    <div className="loading-spinner"></div>
                    <p>Loading marketplace items...</p>
                </div>
            ) : (
                <>
                    <div className="items-section">
                        <div className="section-header">
                            <h2>Available Items</h2>
                            <p>{items.length} items found</p>
                        </div>

                        {items.length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">🪐</span>
                                <h3>No items found</h3>
                                <p>Try adjusting your search or filters</p>
                                {isAuthenticated ? (
                                    <button
                                        className="sell-first-btn"
                                        onClick={() => navigate('/marketplace/sell')}
                                    >
                                        Be the first to sell!
                                    </button>
                                ) : (
                                    <button
                                        className="sell-first-btn"
                                        onClick={() => navigate('/signin')}
                                    >
                                        Sign in to start selling!
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="items-grid">
                                {items.map(item => {
                                    const images = getItemImages(item);
                                    return (
                                        <div
                                            key={item.id}
                                            className="item-card"
                                            onClick={() => handleItemClick(item)}
                                        >
                                            <div className="item-image">
                                                {images.length > 0 ? (
                                                    <img
                                                        src={images[0]}
                                                        alt={item.title}
                                                        onError={(e) => {
                                                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+No Image</text></svg>';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="no-image">
                                                        📦
                                                    </div>
                                                )}

                                                <button
                                                    className="favorite-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleFavorite(item.id);
                                                    }}
                                                >
                                                    ❤️ {item.favoritesCount || 0}
                                                </button>
                                            </div>

                                            <div className="item-details">
                                                <div className="item-header">
                                                    <h3 className="item-title">{item.title}</h3>
                                                    {getConditionBadge(item.condition)}
                                                </div>

                                                <p className="item-description">
                                                    {item.description?.substring(0, 100)}
                                                    {item.description?.length > 100 && '...'}
                                                </p>

                                                <div className="item-meta">
                                                    <span className="item-seller">👤 {item.seller || item.submittedBy}</span>
                                                    <span className="item-views">👀 {item.viewsCount || 0}</span>
                                                    {item.location && (
                                                        <span className="item-location">📍 {item.location}</span>
                                                    )}
                                                </div>

                                                <div className="item-footer">
                                                    <div className="item-price">
                                                        <span className="price">{formatPrice(item.price)}</span>
                                                        {item.originalPrice && item.originalPrice > item.price && (
                                                            <span className="original-price">
                                                                {formatPrice(item.originalPrice)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="item-actions">
                                                        {/* 🔐 UPDATED: Authentication-aware buy button */}
                                                        <button
                                                            className="buy-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!isAuthenticated) {
                                                                    alert('Please sign in to purchase items');
                                                                    navigate('/signin');
                                                                    return;
                                                                }
                                                                handlePurchase(item);
                                                            }}
                                                        >
                                                            {isAuthenticated ? '🛒 Buy Now' : '🔐 Sign in to Buy'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="page-btn"
                                disabled={currentPage === 0}
                                onClick={() => setCurrentPage(currentPage - 1)}
                            >
                                ← Previous
                            </button>

                            <span className="page-info">
                                Page {currentPage + 1} of {totalPages}
                            </span>

                            <button
                                className="page-btn"
                                disabled={currentPage >= totalPages - 1}
                                onClick={() => setCurrentPage(currentPage + 1)}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* 🔐 UPDATED: Authentication-aware Item Detail Modal */}
            {showItemModal && selectedItem && (
                <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
                    <div className="modal-content item-modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="modal-close"
                            onClick={() => setShowItemModal(false)}
                        >×</button>

                        <div className="modal-item-details">
                            <div className="modal-images">
                                {getItemImages(selectedItem).map((imageUrl, index) => (
                                    <img key={index} src={imageUrl} alt={`${selectedItem.title} ${index + 1}`} />
                                ))}
                            </div>

                            <div className="modal-info">
                                <div className="modal-header">
                                    <h2>{selectedItem.title}</h2>
                                    {getConditionBadge(selectedItem.condition)}
                                </div>

                                <div className="modal-price">
                                    <span className="current-price">{formatPrice(selectedItem.price)}</span>
                                    {selectedItem.originalPrice && selectedItem.originalPrice > selectedItem.price && (
                                        <span className="original-price">{formatPrice(selectedItem.originalPrice)}</span>
                                    )}
                                </div>

                                <div className="modal-meta">
                                    <p><strong>Seller:</strong> {selectedItem.seller || selectedItem.submittedBy}</p>
                                    <p><strong>Quantity:</strong> {selectedItem.quantity || 1} available</p>
                                    {selectedItem.location && <p><strong>Location:</strong> {selectedItem.location}</p>}
                                    <p><strong>Views:</strong> {selectedItem.viewsCount || 0}</p>
                                    <p><strong>Favorites:</strong> {selectedItem.favoritesCount || 0}</p>
                                </div>

                                <div className="modal-description">
                                    <h3>Description</h3>
                                    <p>{selectedItem.description}</p>
                                </div>

                                <div className="modal-actions">
                                    {isAuthenticated ? (
                                        <>
                                            <button
                                                className="modal-favorite-btn"
                                                onClick={() => toggleFavorite(selectedItem.id)}
                                            >
                                                ❤️ Add to Favorites
                                            </button>

                                            <button
                                                className="modal-buy-btn"
                                                onClick={() => handlePurchase(selectedItem)}
                                                disabled={walletBalance < selectedItem.price}
                                            >
                                                🛒 Buy for {formatPrice(selectedItem.price)}
                                            </button>
                                        </>
                                    ) : (
                                        <div className="auth-required-actions">
                                            <p style={{ marginBottom: '15px', color: '#666' }}>
                                                Sign in to purchase and save favorites
                                            </p>
                                            <button
                                                className="modal-signin-btn"
                                                onClick={() => navigate('/signin')}
                                            >
                                                🔐 Sign In to Buy
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isAuthenticated && walletBalance < selectedItem.price && (
                                    <div className="insufficient-funds">
                                        ⚠️ Insufficient coins. You need {selectedItem.price - walletBalance} more coins.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MarketplaceDashboard;