// src/App.js - Complete with all marketplace routes
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import SignIn from './pages/SignIn';
import Dashboard from './pages/Dashboard';
import Lottery from './pages/Lottery';
import Marketplace from './pages/Marketplace';
import SellProduct from './pages/SellProduct';
import UserStore from './pages/UserStore';
import MyOrders from './pages/MyOrders';
import MyWalletDashboard from './pages/MyWalletDashboard';
import Navbar from './components/Navbar';
import NotificationTest from './services/NotificationTest';

function App() {
    useEffect(() => {
        // Inject fallback photos into localStorage if it's empty
        const existing = localStorage.getItem('allSubmissions');
        if (!existing || JSON.parse(existing).length === 0) {
            const mockSubmissions = [
                {
                    id: 1,
                    image: "https://picsum.photos/id/1015/300/200",
                    description: "Beautiful Mountain View",
                    user: "Demo User 1",
                    uploadDate: new Date().toLocaleDateString(),
                    status: "Submitted"
                },
                {
                    id: 2,
                    image: "https://picsum.photos/id/1020/300/200",
                    description: "Ocean Sunset",
                    user: "Demo User 2",
                    uploadDate: new Date().toLocaleDateString(),
                    status: "Winner"
                },
                {
                    id: 3,
                    image: "https://picsum.photos/id/1025/300/200",
                    description: "City Skyline",
                    user: "Demo User 3",
                    uploadDate: new Date().toLocaleDateString(),
                    status: "Submitted"
                }
            ];
            localStorage.setItem('allSubmissions', JSON.stringify(mockSubmissions));
        }

        // 🛍️ Initialize marketplace demo data if it doesn't exist
        const existingProducts = localStorage.getItem('marketplaceProducts');
        if (!existingProducts || JSON.parse(existingProducts).length === 0) {
            const demoProducts = [
                {
                    id: 1,
                    title: "Vintage Camera Lens",
                    description: "Professional 50mm lens in excellent condition. Perfect for portrait photography.",
                    price: 150,
                    image: "https://picsum.photos/id/250/400/300",
                    seller: "PhotoPro Mike",
                    sellerId: 1,
                    submittedBy: "PhotoPro Mike",
                    category: "Photography",
                    condition: "Used - Excellent",
                    datePosted: new Date().toISOString(),
                    status: "Available",
                    viewsCount: 45,
                    favoritesCount: 8,
                    quantity: 1
                },
                {
                    id: 2,
                    title: "Digital Art Tablet",
                    description: "Wacom drawing tablet with pressure sensitivity. Great for digital artists.",
                    price: 85,
                    image: "https://picsum.photos/id/326/400/300",
                    seller: "ArtistAnna",
                    sellerId: 2,
                    submittedBy: "ArtistAnna",
                    category: "Electronics",
                    condition: "Used - Good",
                    datePosted: new Date().toISOString(),
                    status: "Available",
                    viewsCount: 32,
                    favoritesCount: 5,
                    quantity: 1
                },
                {
                    id: 3,
                    title: "Photography Book Collection",
                    description: "Set of 5 professional photography books covering landscapes and portraits.",
                    price: 45,
                    image: "https://picsum.photos/id/481/400/300",
                    seller: "BookLover22",
                    sellerId: 3,
                    submittedBy: "BookLover22",
                    category: "Books",
                    condition: "Used - Good",
                    datePosted: new Date().toISOString(),
                    status: "Available",
                    viewsCount: 28,
                    favoritesCount: 3,
                    quantity: 2
                },
                {
                    id: 4,
                    title: "Travel Backpack",
                    description: "Durable 40L hiking backpack with multiple compartments. Perfect for photographers on the go.",
                    price: 75,
                    image: "https://picsum.photos/id/1/400/300",
                    seller: "AdventureSeeker",
                    sellerId: 4,
                    submittedBy: "AdventureSeeker",
                    category: "Travel",
                    condition: "Used - Very Good",
                    datePosted: new Date().toISOString(),
                    status: "Available",
                    viewsCount: 67,
                    favoritesCount: 12,
                    quantity: 1
                }
            ];
            localStorage.setItem('marketplaceProducts', JSON.stringify(demoProducts));
            console.log('💻 Demo marketplace products initialized');
        }

        // 💰 Initialize wallet demo data if user is logged in
        const userData = localStorage.getItem('userData');
        if (userData) {
            const existingWallet = localStorage.getItem('walletBalance');
            if (!existingWallet) {
                localStorage.setItem('walletBalance', '125'); // Default balance for demo
                console.log('💰 Demo wallet balance initialized: 125 coins');
            }
        }
    }, []);

    return (
        <Router>
            <Navbar />
            <Routes>
                {/* Landing page - lottery */}
                <Route path="/" element={<Lottery />} />
                <Route path="/lottery" element={<Lottery />} />

                {/* Authentication routes */}
                <Route path="/register" element={<Register />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/sign-in" element={<SignIn />} /> {/* Alternative route */}

                {/* Protected routes */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/wallet" element={<MyWalletDashboard />} />


                {/* 🛍️ MARKETPLACE ROUTES - All connected now */}
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/marketplace/sell" element={<SellProduct />} />
                <Route path="/marketplace/store/:userId" element={<UserStore />} />
                <Route path="/orders" element={<MyOrders />} />
                <Route path="/my-orders" element={<MyOrders />} /> {/* Alternative route */}

                {/* Catch all other routes and redirect to lottery */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>

            {/* 🧪 Development only - NotificationTest component */}
            {/* Uncomment line below for testing notifications */}
            {/* <NotificationTest /> */}
        </Router>
    );
}

export default App;