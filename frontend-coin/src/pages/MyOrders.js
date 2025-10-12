import React, { useState, useEffect } from 'react';
import './MyOrders.css';

function MyOrders() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // all, buying, selling
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
        loadOrders();
    }, [activeTab]);

    const loadOrders = async () => {
        try {
            setIsLoading(true);

            const response = await fetch('http://localhost:8080/api/orders/my-orders', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            }).catch(() => null);

            if (response && response.ok) {
                const data = await response.json();
                if (data.success) {
                    setOrders(data.orders || []);
                    return;
                }
            }

            // Demo orders data
            const demoOrders = [
                {
                    id: 1,
                    orderNumber: 'ORD-12345',
                    item: {
                        title: 'Professional Camera Lens',
                        price: 450,
                        images: ['https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400']
                    },
                    seller: { name: 'John Doe', id: 1 },
                    buyer: { name: 'Current User', id: 2 },
                    status: 'DELIVERED',
                    paymentStatus: 'RELEASED',
                    totalAmount: 450,
                    quantity: 1,
                    createdAt: '2024-12-01T10:00:00',
                    deliveredAt: '2024-12-05T14:30:00',
                    type: 'purchase' // This user bought this item
                },
                {
                    id: 2,
                    orderNumber: 'ORD-12346',
                    item: {
                        title: 'Vintage Photography Book',
                        price: 75,
                        images: ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400']
                    },
                    seller: { name: 'Current User', id: 2 },
                    buyer: { name: 'Sarah Wilson', id: 3 },
                    status: 'SHIPPED',
                    paymentStatus: 'ESCROWED',
                    totalAmount: 75,
                    quantity: 1,
                    createdAt: '2024-11-28T15:30:00',
                    shippedAt: '2024-11-30T09:15:00',
                    trackingNumber: 'TRK123456789',
                    type: 'sale' // This user sold this item
                },
                {
                    id: 3,
                    orderNumber: 'ORD-12347',
                    item: {
                        title: 'Digital Art Tablet',
                        price: 320,
                        images: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400']
                    },
                    seller: { name: 'Tech Store', id: 4 },
                    buyer: { name: 'Current User', id: 2 },
                    status: 'CONFIRMED',
                    paymentStatus: 'ESCROWED',
                    totalAmount: 320,
                    quantity: 1,
                    createdAt: '2024-12-02T08:45:00',
                    type: 'purchase'
                }
            ];

            setOrders(demoOrders);

        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getFilteredOrders = () => {
        switch (activeTab) {
            case 'buying':
                return orders.filter(order => order.type === 'purchase');
            case 'selling':
                return orders.filter(order => order.type === 'sale');
            default:
                return orders;
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'PENDING': '#f59e0b',
            'CONFIRMED': '#3b82f6',
            'SHIPPED': '#8b5cf6',
            'DELIVERED': '#10b981',
            'COMPLETED': '#059669',
            'CANCELLED': '#ef4444',
            'DISPUTED': '#dc2626'
        };
        return colors[status] || '#6b7280';
    };

    const getStatusIcon = (status) => {
        const icons = {
            'PENDING': '⏳',
            'CONFIRMED': '✅',
            'SHIPPED': '🚚',
            'DELIVERED': '📦',
            'COMPLETED': '🎉',
            'CANCELLED': '❌',
            'DISPUTED': '⚠️'
        };
        return icons[status] || '📋';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatPrice = (price) => `${price} coins`;

    const handleOrderAction = (order, action) => {
        switch (action) {
            case 'track':
                if (order.trackingNumber) {
                    alert(`Tracking Number: ${order.trackingNumber}\n\nStatus: ${order.status}`);
                } else {
                    alert('No tracking information available yet.');
                }
                break;
            case 'contact':
                const contactPerson = order.type === 'purchase' ? order.seller : order.buyer;
                alert(`Contact ${contactPerson.name} at their store or through the marketplace.`);
                break;
            case 'review':
                alert('Review functionality would open here.');
                break;
            case 'dispute':
                if (window.confirm('Are you sure you want to open a dispute for this order?')) {
                    alert('Dispute opened. Our support team will contact you soon.');
                }
                break;
            default:
                break;
        }
    };

    if (isLoading) {
        return (
            <div className="my-orders">
                <div className="max-w-6xl mx-auto">
                    <div className="orders-loading-section">
                        <div className="orders-loading-spinner"></div>
                        <p>Loading your orders...</p>
                    </div>
                </div>
            </div>
        );
    }

    const filteredOrders = getFilteredOrders();

    return (
        <div className="my-orders">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="orders-header">
                    <div className="orders-nav">
                        <h1 className="orders-title">My Orders</h1>
                        <button
                            onClick={() => window.history.back()}
                            className="back-button"
                        >
                            ← Back
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="orders-tabs">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`tab-button ${activeTab === 'all' ? 'active all' : ''}`}
                        >
                            All Orders ({orders.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('buying')}
                            className={`tab-button ${activeTab === 'buying' ? 'active buying' : ''}`}
                        >
                            My Purchases ({orders.filter(o => o.type === 'purchase').length})
                        </button>
                        <button
                            onClick={() => setActiveTab('selling')}
                            className={`tab-button ${activeTab === 'selling' ? 'active selling' : ''}`}
                        >
                            My Sales ({orders.filter(o => o.type === 'sale').length})
                        </button>
                    </div>
                </div>

                {/* Orders List */}
                {filteredOrders.length === 0 ? (
                    <div className="orders-empty-state">
                        <div className="empty-orders-icon">📦</div>
                        <h3 className="empty-orders-title">No Orders Found</h3>
                        <p className="empty-orders-subtitle">
                            {activeTab === 'buying'
                                ? "You haven't made any purchases yet."
                                : activeTab === 'selling'
                                    ? "You haven't made any sales yet."
                                    : "You don't have any orders yet."}
                        </p>
                        <button
                            onClick={() => window.location.href = '/marketplace'}
                            className="browse-marketplace-btn"
                        >
                            Browse Marketplace
                        </button>
                    </div>
                ) : (
                    <div className="orders-list">
                        {filteredOrders.map(order => (
                            <div key={order.id} className="order-card">
                                <div className="order-content">
                                    {/* Order Header */}
                                    <div className="order-header">
                                        <div className="order-status-info">
                                            <div
                                                className="status-indicator"
                                                style={{ backgroundColor: getStatusColor(order.status) }}
                                            >
                                                {getStatusIcon(order.status)}
                                            </div>
                                            <div className="order-details">
                                                <h3 className="order-number">
                                                    Order #{order.orderNumber}
                                                </h3>
                                                <p className="order-participant">
                                                    {order.type === 'purchase' ? 'Purchased from' : 'Sold to'}{' '}
                                                    <span className="participant-name">
                                                        {order.type === 'purchase' ? order.seller.name : order.buyer.name}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="order-pricing">
                                            <div className="order-total">
                                                {formatPrice(order.totalAmount)}
                                            </div>
                                            <div className="order-date">
                                                {formatDate(order.createdAt)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order Content */}
                                    <div className="order-content-grid">
                                        {/* Item Info */}
                                        <div className="order-item-info">
                                            <div className="item-thumbnail">
                                                {order.item.images && order.item.images.length > 0 ? (
                                                    <img
                                                        src={order.item.images[0]}
                                                        alt={order.item.title}
                                                    />
                                                ) : (
                                                    <div className="item-thumbnail-placeholder">
                                                        📦
                                                    </div>
                                                )}
                                            </div>

                                            <div className="item-details">
                                                <h4 className="item-name">
                                                    {order.item.title}
                                                </h4>

                                                <div className="item-metadata">
                                                    <div className="metadata-item">
                                                        <span className="metadata-label">Quantity:</span> {order.quantity}
                                                    </div>
                                                    <div className="metadata-item">
                                                        <span className="metadata-label">Unit Price:</span> {formatPrice(order.item.price)}
                                                    </div>
                                                    <div className="metadata-item">
                                                        <span className="metadata-label">Status:</span>
                                                        <span
                                                            className="status-badge"
                                                            style={{ backgroundColor: getStatusColor(order.status) }}
                                                        >
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                    <div className="metadata-item">
                                                        <span className="metadata-label">Payment:</span>
                                                        <span className="payment-status">{order.paymentStatus.toLowerCase()}</span>
                                                    </div>
                                                </div>

                                                {/* Tracking Info */}
                                                {order.trackingNumber && (
                                                    <div className="tracking-info">
                                                        <div className="tracking-number">
                                                            <span className="tracking-label">Tracking:</span> {order.trackingNumber}
                                                        </div>
                                                        {order.shippedAt && (
                                                            <div className="shipped-date">
                                                                Shipped: {formatDate(order.shippedAt)}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="order-actions">
                                            <h5 className="actions-title">Actions</h5>

                                            {order.status === 'SHIPPED' && (
                                                <button
                                                    onClick={() => handleOrderAction(order, 'track')}
                                                    className="action-button track"
                                                >
                                                    🔍 Track Order
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleOrderAction(order, 'contact')}
                                                className="action-button contact"
                                            >
                                                💬 Contact {order.type === 'purchase' ? 'Seller' : 'Buyer'}
                                            </button>

                                            {order.status === 'DELIVERED' && (
                                                <button
                                                    onClick={() => handleOrderAction(order, 'review')}
                                                    className="action-button review"
                                                >
                                                    ⭐ Leave Review
                                                </button>
                                            )}

                                            {['CONFIRMED', 'SHIPPED'].includes(order.status) && (
                                                <button
                                                    onClick={() => handleOrderAction(order, 'dispute')}
                                                    className="action-button dispute"
                                                >
                                                    ⚠️ Open Dispute
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyOrders;