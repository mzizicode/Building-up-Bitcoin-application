import React, { useState, useEffect } from 'react';

function Favorites() {
    const [favorites, setFavorites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [walletBalance, setWalletBalance] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');

        if (!authToken || !userData) {
            // Redirect to sign in
            window.location.href = '/signin';
            return;
        }

        setIsAuthenticated(true);
        loadFavorites();
        loadWalletBalance();
    }, []);

    const loadFavorites = async () => {
        try {
            setIsLoading(true);

            const response = await fetch('http://localhost:8080/api/marketplace/favorites', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            }).catch(() => null);

            if (response && response.ok) {
                const data = await response.json();
                if (data.success) {
                    setFavorites(data.favorites || []);
                    return;
                }
            }

            // Demo favorites data
            const demoFavorites = [
                {
                    id: 1,
                    title: 'Professional Camera Lens',
                    description: 'High-quality 85mm f/1.4 lens perfect for portrait photography. Excellent optical quality with beautiful bokeh.',
                    price: 450,
                    originalPrice: 520,
                    condition: 'Used - Excellent',
                    images: ['https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400'],
                    seller: { name: 'PhotoPro Store', id: 1 },
                    viewsCount: 156,
                    favoritesCount: 23,
                    location: 'New York, NY',
                    isNegotiable: true,
                    createdAt: '2024-12-01T10:00:00',
                    favoritedAt: '2024-12-03T14:22:00'
                },
                {
                    id: 2,
                    title: 'Vintage Photography Book Collection',
                    description: 'Rare collection of 5 vintage photography books from renowned photographers. Great condition.',
                    price: 75,
                    condition: 'Used - Very Good',
                    images: ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400'],
                    seller: { name: 'BookLover42', id: 2 },
                    viewsCount: 89,
                    favoritesCount: 12,
                    location: 'San Francisco, CA',
                    isNegotiable: false,
                    createdAt: '2024-11-28T15:30:00',
                    favoritedAt: '2024-12-02T09:15:00'
                },
                {
                    id: 3,
                    title: 'Digital Art Tablet with Stylus',
                    description: 'Professional drawing tablet with pressure-sensitive stylus. Perfect for digital artists.',
                    price: 320,
                    originalPrice: 400,
                    condition: 'Used - Good',
                    images: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400'],
                    seller: { name: 'TechGear Hub', id: 3 },
                    viewsCount: 234,
                    favoritesCount: 45,
                    location: 'Los Angeles, CA',
                    isNegotiable: true,
                    createdAt: '2024-11-25T11:45:00',
                    favoritedAt: '2024-12-01T16:30:00'
                }
            ];

            setFavorites(demoFavorites);

        } catch (error) {
            console.error('Failed to load favorites:', error);
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

    const removeFavorite = async (itemId) => {
        try {
            const response = await fetch(`http://localhost:8080/api/marketplace/items/${itemId}/favorite`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            }).catch(() => null);

            // Remove from local state regardless of API response
            setFavorites(prev => prev.filter(item => item.id !== itemId));

            if (response && response.ok) {
                console.log('Successfully removed from favorites');
            } else {
                console.log('Removed from favorites (demo mode)');
            }
        } catch (error) {
            console.error('Failed to remove favorite:', error);
        }
    };

    const handlePurchase = async (item) => {
        if (walletBalance < item.price) {
            alert('Insufficient coins! Please top up your wallet.');
            window.location.href = '/wallet';
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
                        alert('Purchase successful! Check your orders.');
                        loadWalletBalance();
                        window.location.href = '/orders';
                        return;
                    }
                }

                alert('Demo purchase successful!');
                const newBalance = walletBalance - item.price;
                setWalletBalance(newBalance);
                localStorage.setItem('walletBalance', newBalance.toString());

            } catch (error) {
                alert('Purchase failed: ' + error.message);
            }
        }
    };

    const visitStore = (sellerId) => {
        window.location.href = `/marketplace/store/${sellerId}`;
    };

    const formatPrice = (price) => `${price} coins`;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

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
            <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-center min-h-96">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading your favorites...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold text-gray-800">My Favorites</h1>
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-full">
                                {walletBalance} coins
                            </div>
                            <button
                                onClick={() => window.history.back()}
                                className="text-pink-600 hover:text-pink-800 font-medium"
                            >
                                ← Back
                            </button>
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="text-6xl mb-4">❤️</div>
                        <p className="text-gray-600">
                            {favorites.length} item{favorites.length !== 1 ? 's' : ''} saved for later
                        </p>
                    </div>
                </div>

                {/* Favorites List */}
                {favorites.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <div className="text-6xl mb-4">💔</div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">No Favorites Yet</h3>
                        <p className="text-gray-600 mb-6">
                            Start exploring the marketplace and save items you love!
                        </p>
                        <button
                            onClick={() => window.location.href = '/marketplace'}
                            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300"
                        >
                            Browse Marketplace
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favorites.map(item => {
                            const images = getItemImages(item);
                            return (
                                <div
                                    key={item.id}
                                    className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
                                >
                                    {/* Item Image */}
                                    <div className="relative h-48 overflow-hidden">
                                        {images.length > 0 ? (
                                            <img
                                                src={images[0]}
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => {
                                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+No Image</text></svg>';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                <span className="text-4xl">📦</span>
                                            </div>
                                        )}

                                        {/* Remove from Favorites */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm('Remove this item from favorites?')) {
                                                    removeFavorite(item.id);
                                                }
                                            }}
                                            className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors duration-300"
                                            title="Remove from favorites"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>

                                        {/* Condition Badge */}
                                        <div className="absolute top-3 left-3">
                                            <span
                                                className="px-2 py-1 text-xs font-semibold text-white rounded-full"
                                                style={{ backgroundColor: getConditionColor(item.condition) }}
                                            >
                                                {item.condition?.replace('USED_', '').replace('_', ' ') || 'New'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Item Details */}
                                    <div className="p-6">
                                        <h3 className="font-bold text-gray-800 mb-2 line-clamp-2">
                                            {item.title}
                                        </h3>

                                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                            {item.description}
                                        </p>

                                        {/* Seller Info */}
                                        <div className="mb-3">
                                            <button
                                                onClick={() => visitStore(item.seller.id)}
                                                className="text-purple-600 hover:text-purple-800 font-semibold text-sm transition-colors duration-300"
                                            >
                                                🏪 {item.seller.name}
                                            </button>
                                        </div>

                                        {/* Stats & Location */}
                                        <div className="flex justify-between text-xs text-gray-500 mb-3">
                                            <div className="flex gap-3">
                                                <span>👁️ {item.viewsCount}</span>
                                                <span>❤️ {item.favoritesCount}</span>
                                            </div>
                                            {item.location && (
                                                <span>📍 {item.location}</span>
                                            )}
                                        </div>

                                        {/* Price and Actions */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex flex-col">
                                                <span className="text-xl font-bold text-purple-600">
                                                    {formatPrice(item.price)}
                                                </span>
                                                {item.originalPrice && item.originalPrice > item.price && (
                                                    <span className="text-sm text-gray-400 line-through">
                                                        {formatPrice(item.originalPrice)}
                                                    </span>
                                                )}
                                            </div>

                                            {item.isNegotiable && (
                                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                                    Negotiable
                                                </span>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => handlePurchase(item)}
                                                disabled={walletBalance < item.price}
                                                className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
                                                    walletBalance >= item.price
                                                        ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600'
                                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                }`}
                                            >
                                                {walletBalance >= item.price ? '🛒 Buy Now' : '💰 Insufficient Coins'}
                                            </button>

                                            <div className="text-center text-xs text-gray-500">
                                                Favorited on {formatDate(item.favoritedAt)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Quick Actions */}
                {favorites.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 mt-8 text-center">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => window.location.href = '/marketplace'}
                                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
                            >
                                Browse More Items
                            </button>
                            <button
                                onClick={() => window.location.href = '/wallet'}
                                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all duration-300"
                            >
                                Top Up Coins
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Favorites;