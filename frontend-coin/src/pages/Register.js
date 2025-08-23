// src/pages/Register.js - Updated with password validation and email confirmation
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Register.css';

function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        country: '',
        countryCode: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isFormSent, setIsFormSent] = useState(false);
    const [userData, setUserData] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordValidation, setPasswordValidation] = useState({
        hasUppercase: false,
        hasLowercase: false,
        hasNumberOrSymbol: false,
        hasMinLength: false,
        passwordsMatch: false
    });
    const [emailSent, setEmailSent] = useState(false);

    // 🚀 NEW: Redirect logged-in users to dashboard
    useEffect(() => {
        const userData = localStorage.getItem('userData');
        if (userData) {
            console.log('User already logged in, redirecting to dashboard...');
            navigate('/dashboard');
        }
    }, [navigate]);

    // 🚀 NEW: Password validation
    useEffect(() => {
        const password = formData.password;
        const confirmPassword = formData.confirmPassword;

        setPasswordValidation({
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumberOrSymbol: /[0-9\-_!@#$%^&*()+={}[\]:";'<>?,./]/.test(password),
            hasMinLength: password.length >= 8,
            passwordsMatch: password === confirmPassword && password.length > 0
        });
    }, [formData.password, formData.confirmPassword]);

    const isPasswordValid = Object.values(passwordValidation).every(Boolean);

    // List of countries (keeping the same as before)
    const countries = [
        'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
        'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
        'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
        'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
        'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada',
        'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
        'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
        'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica',
        'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea',
        'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
        'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
        'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras',
        'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
        'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya',
        'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho',
        'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar',
        'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands',
        'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco',
        'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia',
        'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
        'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
        'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
        'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda',
        'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
        'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal',
        'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
        'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan',
        'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
        'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo',
        'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
        'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States',
        'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
        'Yemen', 'Zambia', 'Zimbabwe'
    ];

    // Country codes with flags (keeping the same as before)
    const countryCodes = [
        { code: '+1', country: 'United States', flag: '🇺🇸' },
        { code: '+1', country: 'Canada', flag: '🇨🇦' },
        { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
        { code: '+49', country: 'Germany', flag: '🇩🇪' },
        { code: '+33', country: 'France', flag: '🇫🇷' },
        { code: '+39', country: 'Italy', flag: '🇮🇹' },
        { code: '+34', country: 'Spain', flag: '🇪🇸' },
        { code: '+81', country: 'Japan', flag: '🇯🇵' },
        { code: '+86', country: 'China', flag: '🇨🇳' },
        { code: '+91', country: 'India', flag: '🇮🇳' },
        { code: '+61', country: 'Australia', flag: '🇦🇺' },
        { code: '+55', country: 'Brazil', flag: '🇧🇷' },
        { code: '+7', country: 'Russia', flag: '🇷🇺' },
        { code: '+66', country: 'Thailand', flag: '🇹🇭' },
        { code: '+65', country: 'Singapore', flag: '🇸🇬' },
        { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
        { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
        { code: '+63', country: 'Philippines', flag: '🇵🇭' },
        { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
        { code: '+82', country: 'South Korea', flag: '🇰🇷' },
        { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
        { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
        { code: '+46', country: 'Sweden', flag: '🇸🇪' },
        { code: '+47', country: 'Norway', flag: '🇳🇴' },
        { code: '+45', country: 'Denmark', flag: '🇩🇰' },
        { code: '+358', country: 'Finland', flag: '🇫🇮' }
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    // 🚀 UPDATED: Registration with password and email verification
    const handleSendForm = async (e) => {
        e.preventDefault();

        if (!isPasswordValid) {
            setError('Please ensure your password meets all requirements and passwords match.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // 🚀 NEW: Registration with password
            const registrationData = {
                name: formData.name,
                email: formData.email.toLowerCase().trim(),
                country: formData.country,
                phone: `${formData.countryCode} ${formData.phone}`,
                password: formData.password
            };

            const createUserResponse = await fetch('http://localhost:8080/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registrationData)
            });

            if (!createUserResponse.ok) {
                const errorData = await createUserResponse.text();
                throw new Error(errorData || `Registration failed: ${createUserResponse.status}`);
            }

            const result = await createUserResponse.json();
            console.log('Registration successful:', result);

            if (result.success) {
                // Store user data (not logged in until email verification)
                const newUserData = {
                    id: result.user.id,
                    fullName: result.user.name,
                    name: result.user.name,
                    email: result.user.email,
                    country: result.user.country,
                    phone: result.user.phone,
                    emailVerified: false,
                    photos: []
                };

                setUserData(newUserData);
                setIsFormSent(true);
                setEmailSent(true);

                alert('✅ Account created successfully! Please check your email to verify your account before signing in.');
            } else {
                throw new Error(result.message || 'Registration failed');
            }

        } catch (error) {
            console.error('Registration error:', error);

            if (error.message.includes('already exists')) {
                setError('An account with this email already exists. Please use a different email or try signing in.');
            } else {
                setError(error.message || 'Registration failed. Please try again.');
            }

            // Remove fallback for production - force proper backend implementation
        } finally {
            setIsLoading(false);
        }
    };

    // Check if form is valid
    const isFormValid = formData.name && formData.email && formData.country &&
        formData.countryCode && formData.phone && isPasswordValid;

    return (
        <div className="register-container">
            <div className="register-card">
                <div className="header-section">
                    <div className="icon-container">
                        <span className="lottery-icon">🎰</span>
                    </div>
                    <h1 className="title">Join Photo Lottery</h1>
                    <p className="subtitle">
                        {!isFormSent
                            ? "Create your secure account"
                            : emailSent
                                ? "Check your email to verify your account"
                                : "Account creation completed"
                        }
                    </p>
                </div>

                {!isFormSent ? (
                    // STEP 1: Account Information Form with Password
                    <form onSubmit={handleSendForm} className="register-form">
                        <div className="input-group">
                            <label htmlFor="name">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                placeholder="Enter your full name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="form-input"
                            />
                        </div>

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
                            <label htmlFor="country">Country</label>
                            <select
                                id="country"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                required
                                className="form-select"
                            >
                                <option value="">Select your country</option>
                                {countries.map((country) => (
                                    <option key={country} value={country}>
                                        {country}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="input-group">
                            <label htmlFor="phone">Phone Number</label>
                            <div className="phone-input-container">
                                <select
                                    id="countryCode"
                                    name="countryCode"
                                    value={formData.countryCode}
                                    onChange={handleChange}
                                    required
                                    className="country-code-select"
                                >
                                    <option value="">Code</option>
                                    {countryCodes.map((item, index) => (
                                        <option key={index} value={item.code}>
                                            {item.flag} {item.code} {item.country}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    placeholder="123 456 7890"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                    className="phone-input"
                                />
                            </div>
                        </div>

                        {/* 🚀 NEW: Password Fields */}
                        <div className="input-group">
                            <label htmlFor="password">Password</label>
                            <div className="password-container">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    placeholder="Create a strong password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="form-input password-input"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex="-1"
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <div className="password-container">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    placeholder="Confirm your password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    className="form-input password-input"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    tabIndex="-1"
                                >
                                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        {/* 🚀 NEW: Password Validation Indicators */}
                        {formData.password && (
                            <div className="password-requirements">
                                <h4>Password Requirements:</h4>
                                <div className="requirement-list">
                                    <div className={`requirement ${passwordValidation.hasMinLength ? 'valid' : 'invalid'}`}>
                                        {passwordValidation.hasMinLength ? '✅' : '❌'} At least 8 characters
                                    </div>
                                    <div className={`requirement ${passwordValidation.hasUppercase ? 'valid' : 'invalid'}`}>
                                        {passwordValidation.hasUppercase ? '✅' : '❌'} One uppercase letter (A-Z)
                                    </div>
                                    <div className={`requirement ${passwordValidation.hasLowercase ? 'valid' : 'invalid'}`}>
                                        {passwordValidation.hasLowercase ? '✅' : '❌'} One lowercase letter (a-z)
                                    </div>
                                    <div className={`requirement ${passwordValidation.hasNumberOrSymbol ? 'valid' : 'invalid'}`}>
                                        {passwordValidation.hasNumberOrSymbol ? '✅' : '❌'} One number or symbol (0-9, -, _, !, @, etc.)
                                    </div>
                                    {formData.confirmPassword && (
                                        <div className={`requirement ${passwordValidation.passwordsMatch ? 'valid' : 'invalid'}`}>
                                            {passwordValidation.passwordsMatch ? '✅' : '❌'} Passwords match
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="error-message" style={{
                                background: '#fee',
                                color: '#c53030',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                border: '1px solid #fed7d7'
                            }}>
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
                                    Creating Account...
                                </>
                            ) : (
                                '🚀 Create Account'
                            )}
                        </button>
                    </form>
                ) : (
                    // STEP 2: Email Verification Required
                    <div className="success-state">
                        <div style={{
                            background: 'linear-gradient(135deg, #e8f5e8, #f0fff0)',
                            padding: '30px',
                            borderRadius: '15px',
                            textAlign: 'center',
                            border: '2px solid #4ade80'
                        }}>
                            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📧</div>
                            <h3 style={{
                                color: '#16a34a',
                                marginBottom: '15px',
                                fontSize: '1.5rem'
                            }}>
                                Check Your Email!
                            </h3>
                            <p style={{
                                color: '#15803d',
                                marginBottom: '20px',
                                fontSize: '1rem',
                                lineHeight: '1.5'
                            }}>
                                We've sent a verification email to <strong>{userData?.email}</strong>.
                                Please click the verification link in your email to activate your account.
                            </p>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.8)',
                                padding: '15px',
                                borderRadius: '10px',
                                marginBottom: '25px'
                            }}>
                                <p style={{ color: '#374151', margin: 0, fontSize: '0.9rem' }}>
                                    📧 Check your inbox (and spam folder)<br />
                                    🔗 Click the verification link<br />
                                    🚀 Then sign in to start uploading photos!
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <Link
                                    to="/signin"
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 25px',
                                        borderRadius: '25px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        textDecoration: 'none',
                                        transition: 'all 0.3s ease',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    🔐 Go to Sign In
                                </Link>
                                <button
                                    onClick={() => window.location.reload()}
                                    style={{
                                        background: '#f8f9fa',
                                        color: '#666',
                                        border: '2px solid #e1e8ed',
                                        padding: '12px 25px',
                                        borderRadius: '25px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    🔄 Resend Email
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="footer-text">
                    <p>
                        {!isFormSent ? (
                            <>
                                Already have an account?
                                <Link to="/signin" style={{ color: '#667eea', textDecoration: 'none', fontWeight: '600', marginLeft: '8px' }}>
                                    Sign In
                                </Link>
                            </>
                        ) : (
                            'Secure email verification required'
                        )}
                    </p>
                </div>
            </div>

            {/* Background decoration */}
            <div className="bg-decoration">
                <div className="floating-icon">📸</div>
                <div className="floating-icon">🏆</div>
                <div className="floating-icon">🎊</div>
                <div className="floating-icon">✨</div>
            </div>
        </div>
    );
}

export default Register;