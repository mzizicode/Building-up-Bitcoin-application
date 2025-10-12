import React, { useState, useEffect } from 'react';
import './UserStore.css';

function UserStore() {
    const userId = window.location.pathname.split('/').pop(); // Extract userId from URL
    const [store, setStore] = useState(null);
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [sortBy, setSortBy] = useState('newest');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);

    // Check authentication
    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        const userDataStr = localStorage.getItem('userData');

        if (authToken && userDataStr) {
            setIsAuthenticated(true);
            const userData = JSON.parse(userDataStr);
            loadWalletBalance();
        }
    }, []);

    useEffect(() => {
        loadStore();
    }, [userId, currentPage, sortBy]);

    const loadStore = async () => {
        try {
            setIsLoading(true);

            // Debug info
            console.log('🔍 Loading store for userId:', userId);
            console.log('🔍 API URL:', `http://localhost:8080/api/marketplace/store/${userId}?page=${currentPage}&size=20&sortBy=${sortBy}`);

            const authToken = localStorage.getItem('authToken');
            console.log('🔍 Auth token exists:', !!authToken);

            const response = await fetch(`http://localhost:8080/api/marketplace/store/${userId}?page=${currentPage}&size=20&sortBy=${sortBy}`, {
                headers: authToken ? {
                    'Authorization': `Bearer ${authToken}`
                } : {}
            }).catch((error) => {
                console.error('🚨 Fetch error:', error);
                return null;
            });

            console.log('🔍 Response status:', response?.status);
            console.log('🔍 Response ok:', response?.ok);

            if (response && response.ok) {
                const data = await response.json();
                console.log('🔍 API Response data:', data);

                if (data.success) {
                    console.log('✅ Using real backend data');
                    setStore(data.store);
                    setItems(data.items);
                    setTotalPages(data.totalPages);
                    return;
                } else {
                    console.log('❌ Backend returned success=false:', data.message);
                }
            } else {
                console.log('❌ API call failed, using fallback demo data');
            }

            // Fallback to demo data
            console.log('🔄 Loading demo store data');
            const demoStore = {
                storeId: userId,
                storeName: `User ${userId}'s Store`,
                sellerName: `User ${userId}`,
                totalItems: 5,
                activeItems: 4,
                memberSince: '2024-01-15T10:00:00'
            };

            const demoItems = [
                {
                    id: 1,
                    title: 'Professional Camera Lens',
                    description: 'High-quality lens for professional photography',
                    price: 450,
                    condition: 'Used - Excellent',
                    images: ['https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400'],
                    viewsCount: 123,
                    favoritesCount: 15,
                    createdAt: '2024-12-01T10:00:00'
                },
                {
                    id: 2,
                    title: 'Vintage Photography Book',
                    description: 'Rare collection of vintage photography techniques',
                    price: 75,
                    condition: 'Used - Good',
                    images: ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400'],
                    viewsCount: 89,
                    favoritesCount: 8,
                    createdAt: '2024-11-28T15:30:00'
                }
            ].filter((_, index) => index < 5);

            setStore(demoStore);
            setItems(demoItems);
            setTotalPages(1);

        } catch (error) {
            console.error('❌ Failed to load store:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadWalletBalance = async () => {
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

            const savedBalance = localStorage.getItem('walletBalance');
            setWalletBalance(savedBalance ? parseInt(savedBalance) : 125);
        } catch (error) {
            console.error('Failed to load wallet balance:', error);
        }
    };

    const handlePurchase = async (item) => {
        if (!isAuthenticated) {
            alert('Please sign in to purchase items');
            window.location.href = '/signin';
            return;
        }

        if (walletBalance < item.price) {
            alert('Insufficient coins! Please top up your wallet.');
            window.location.href = '/wallet';
            return;
        }

        if (window.confirm(`Purchase "${item.title}" for ${item.price} coins?`)) {
            try {
                alert('Purchase successful! (Demo mode)');
                const newBalance = walletBalance - item.price;
                setWalletBalance(newBalance);
                localStorage.setItem('walletBalance', newBalance.toString());
            } catch (error) {
                alert('Purchase failed: ' + error.message);
            }
        }
    };

    const formatPrice = (price) => `${price} coins`;

    const getConditionColor = (condition) => {
        const colors = {
            'NEW': '#10b981',
            'USED_LIKE_NEW': '#3b82f6',
            'USED_GOOD': '#f59e0b',
            'USED_FAIR': '#ef4444',
            'FOR_PARTS': '#6b7280',
            'Used - Excellent': '#10b981',
            'Used - Very Good': '#3b82f6',
            'Used - Good': '#f59e0b',
            'New': '#10b981'
        };
        return colors[condition] || '#6b7280';
    };

    const getItemImages = (item) => {
        try {
            if (typeof item.images === 'string') {
                return JSON.parse(item.images);
            } else if (Array.isArray(item.images)) {
                return item.images;
            }
            return item.image ? [item.image] : [];
        } catch {
            return item.image ? [item.image] : [];
        }
    };

    if (isLoading) {
        return (
            <div className="user-store">
                <div className="max-w-6xl mx-auto">
                    <div className="store-loading-section">
                        <div className="store-loading-spinner"></div>
                        <p>Loading store...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="user-store">
            <div className="max-w-6xl mx-auto">
                {/* Store Header */}
                <div className="store-header">
                    <div className="store-nav">
                        <button
                            onClick={() => window.location.href = '/marketplace'}
                            className="back-to-marketplace"
                        >
                            ← Back to Marketplace
                        </button>

                        {isAuthenticated && (
                            <div className="wallet-display">
                                💰 {walletBalance} coins
                            </div>
                        )}
                    </div>

                    <div className="store-profile">
                        <div className="store-avatar">
                            {store?.sellerName?.charAt(0) || 'U'}
                        </div>
                        <h1 className="store-name">
                            🏪 {store?.storeName}
                        </h1>
                        <p className="store-owner">
                            Managed by {store?.sellerName}
                        </p>

                        <div className="store-stats">
                            <div className="stat-item">
                                <div className="stat-number total">{store?.totalItems || 0}</div>
                                <div className="stat-label">Total Items</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number active">{store?.activeItems || 0}</div>
                                <div className="stat-label">Active Items</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number member">
                                    {store?.memberSince ? new Date(store.memberSince).getFullYear() : '2024'}
                                </div>
                                <div className="stat-label">Member Since</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Store Controls */}
                <div className="store-controls">
                    <div className="controls-header">
                        <h2 className="section-title">
                            Store Items ({items.length})
                        </h2>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="sort-select"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="views">Most Viewed</option>
                            <option value="favorites">Most Favorited</option>
                        </select>
                    </div>
                </div>

                {/* Store Items */}
                {items.length === 0 ? (
                    <div className="store-empty-state">
                        <div className="empty-icon">🏪</div>
                        <h3 className="empty-title">Store is Empty</h3>
                        <p className="empty-subtitle">This seller hasn't listed any items yet.</p>
                        <button
                            onClick={() => window.location.href = '/marketplace'}
                            className="empty-action-btn"
                        >
                            Browse Other Stores
                        </button>
                    </div>
                ) : (
                    <div className="store-items-grid">
                        {items.map(item => {
                            const images = getItemImages(item);
                            return (
                                <div
                                    key={item.id}
                                    className="store-item-card"
                                >
                                    {/* Item Image */}
                                    <div className="store-item-image">
                                        {images.length > 0 ? (
                                            <img
                                                src={images[0]}
                                                alt={item.title}
                                                onError={(e) => {
                                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+No Image</text></svg>';
                                                }}
                                            />
                                        ) : (
                                            <div className="item-image-placeholder">
                                                📦
                                            </div>
                                        )}

                                        {/* Condition Badge */}
                                        <div className="condition-badge" style={{ backgroundColor: getConditionColor(item.condition) }}>
                                            {item.condition?.replace('USED_', '').replace('_', ' ') || 'New'}
                                        </div>
                                    </div>

                                    {/* Item Details */}
                                    <div className="store-item-details">
                                        <h3 className="item-title">
                                            {item.title}
                                        </h3>

                                        <p className="item-description">
                                            {item.description}
                                        </p>

                                        {/* Stats */}
                                        <div className="item-stats">
                                            <span>👁️ {item.viewsCount || 0}</span>
                                            <span>❤️ {item.favoritesCount || 0}</span>
                                        </div>

                                        {/* Price and Action */}
                                        <div className="item-footer">
                                            <div className="item-pricing">
                                                <span className="item-price">
                                                    {formatPrice(item.price)}
                                                </span>
                                                {item.originalPrice && item.originalPrice > item.price && (
                                                    <span className="item-original-price">
                                                        {formatPrice(item.originalPrice)}
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePurchase(item);
                                                }}
                                                className={`item-buy-btn ${isAuthenticated ? 'authenticated' : 'unauthenticated'}`}
                                            >
                                                {isAuthenticated ? '🛒 Buy' : '🔐 Sign In'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="store-pagination">
                        <button
                            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                            disabled={currentPage === 0}
                            className="pagination-btn"
                        >
                            ← Previous
                        </button>

                        <span className="pagination-info">
                            Page {currentPage + 1} of {totalPages}
                        </span>

                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                            disabled={currentPage >= totalPages - 1}
                            className="pagination-btn"
                        >
                            Next →
                        </button>
                    </div>
                )}

                {/* Call to Action */}
                {!isAuthenticated && (
                    <div className="store-cta">
                        <h3 className="cta-title">Want to start your own store?</h3>
                        <p className="cta-subtitle">Sign up today and start selling your items to earn coins!</p>
                        <div className="cta-buttons">
                            <button
                                onClick={() => window.location.href = '/signin'}
                                className="cta-btn primary"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => window.location.href = '/register'}
                                className="cta-btn secondary"
                            >
                                Create Store
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserStore;