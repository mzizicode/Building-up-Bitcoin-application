// src/pages/SignIn.js - Complete Sign In Component
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './SignIn.css';

function SignIn() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        const userData = localStorage.getItem('userData');
        if (userData) {
            console.log('User already logged in, redirecting to dashboard...');
            navigate('/dashboard');
        }
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            console.log('Attempting sign in with:', formData.email);

            const response = await fetch('http://localhost:8080/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email.trim().toLowerCase(),
                    password: formData.password
                })
            });

            const result = await response.json();
            console.log('Sign in response:', result);

            if (response.ok && result.success) {
                // Check if email is verified
                if (!result.user.emailVerified) {
                    setError('Please verify your email before signing in. Check your inbox for the verification link.');
                    return;
                }

                // Store user data and JWT token
                const userData = {
                    id: result.user.id,
                    name: result.user.name,
                    fullName: result.user.name,
                    email: result.user.email,
                    country: result.user.country,
                    phone: result.user.phone,
                    emailVerified: result.user.emailVerified,
                    photos: []
                };

                localStorage.setItem('userData', JSON.stringify(userData));

                // Store JWT token for future requests
                if (result.token) {
                    localStorage.setItem('authToken', result.token);
                }

                // Show success message
                alert('🎉 Welcome back! Sign in successful!');

                // Navigate to dashboard
                navigate('/dashboard');
            } else {
                // Handle different error types
                if (result.message?.includes('not verified')) {
                    setError('Please verify your email before signing in. Check your inbox for the verification link.');
                } else if (result.message?.includes('Invalid credentials') || result.message?.includes('Invalid email or password')) {
                    setError('Invalid email or password. Please check your credentials and try again.');
                } else if (result.message?.includes('User not found')) {
                    setError('No account found with this email. Please check your email or create a new account.');
                } else {
                    setError(result.message || 'Sign in failed. Please try again.');
                }
            }

        } catch (error) {
            console.error('Sign in error:', error);
            setError('Network error. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const isFormValid = formData.email && formData.password;

    return (
        <div className="signin-container">
            <div className="signin-card">
                <div className="header-section">
                    <div className="icon-container">
                        <span className="signin-icon">🔐</span>
                    </div>
                    <h1 className="title">Welcome Back</h1>
                    <p className="subtitle">Sign in to your Photo Lottery account</p>
                </div>

                <form onSubmit={handleSubmit} className="signin-form">
                    <div className="input-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="your.email@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="form-input"
                            autoComplete="email"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-container">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="form-input password-input"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={togglePasswordVisibility}
                                tabIndex="-1"
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className={`submit-btn ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading || !isFormValid}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                Signing In...
                            </>
                        ) : (
                            '🚀 Sign In'
                        )}
                    </button>
                </form>

                <div className="divider">
                    <span>or</span>
                </div>

                <div className="auth-links">
                    <p>Don't have an account?
                        <Link to="/register" className="auth-link">Create Account</Link>
                    </p>
                    <Link to="/forgot-password" className="forgot-link">
                        Forgot your password?
                    </Link>
                </div>

                <div className="footer-text">
                    <p>Secure login with email verification</p>
                </div>
            </div>

            {/* Background decoration */}
            <div className="bg-decoration">
                <div className="floating-icon">🔐</div>
                <div className="floating-icon">📧</div>
                <div className="floating-icon">🎯</div>
                <div className="floating-icon">✨</div>
            </div>
        </div>
    );
}

export default SignIn;