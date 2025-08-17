// frontend/src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import config from '../config';

const API_BASE_URL = config.API_URL;

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Check if user is already authenticated on component mount
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    console.log('User already authenticated:', data.user);
                    onLogin(data.user);
                }
            }
        } catch (err) {
            console.log('Auth check failed:', err);
            // User is not authenticated, continue to login form
        } finally {
            setCheckingAuth(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Basic validation
        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password');
            setLoading(false);
            return;
        }

        try {
            console.log('Attempting login with:', { username });
            console.log('API URL:', `${API_BASE_URL}/api/login`);
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // This is crucial for session cookies
                body: JSON.stringify({ 
                    username: username.trim(), 
                    password: password 
                }),
            });
            
            const data = await response.json();

            console.log('Login response status:', response.status);

            if (response.ok) {

                console.log('Login successful:', data);
                
                localStorage.setItem("token", data.token);

                // Clear form
                setUsername('');
                setPassword('');

                // Call the parent component's login handler
                onLogin(data.user);
            } else {
                console.log('Login failed:', data.error);
                setError(data.error || 'Login failed. Please try again.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Network error. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    // Show loading spinner while checking authentication
    if (checkingAuth) {
        return (
            <div style={styles.container}>
                <div style={styles.form}>
                    <div style={styles.loading}>
                        <div style={styles.spinner}></div>
                        <p>Checking authentication...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <form onSubmit={handleSubmit} style={styles.form}>
                <h1 style={styles.title}>CMC Bala Vihar Login</h1>
                
                {error && (
                    <div style={styles.error}>
                        <strong>Error:</strong> {error}
                    </div>
                )}
                
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        style={styles.input}
                        disabled={loading}
                        autoComplete="username"
                        autoFocus
                    />
                </div>
                
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        style={styles.input}
                        disabled={loading}
                        autoComplete="current-password"
                    />
                </div>
                
                <button 
                    type="submit" 
                    style={{
                        ...styles.button,
                        ...(loading ? styles.buttonDisabled : {})
                    }}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <span style={styles.spinner}></span>
                            Logging in...
                        </>
                    ) : (
                        'Login'
                    )}
                </button>
                
                <div style={styles.footer}>
                    <p style={styles.defaultCreds}>
                        <strong>Default credentials:</strong><br/>
                        Username: admin<br/>
                        Password: admin123
                    </p>
                </div>
            </form>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '1rem',
    },
    form: {
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid #e5e7eb',
    },
    title: {
        textAlign: 'center',
        marginBottom: '2rem',
        color: '#111827',
        fontSize: '1.75rem',
        fontWeight: 'bold',
    },
    inputGroup: {
        marginBottom: '1.5rem',
    },
    label: {
        display: 'block',
        marginBottom: '0.5rem',
        color: '#374151',
        fontSize: '0.875rem',
        fontWeight: '500',
    },
    input: {
        width: '100%',
        padding: '0.75rem',
        borderRadius: '0.375rem',
        border: '1px solid #D1D5DB',
        fontSize: '1rem',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxSizing: 'border-box',
    },
    button: {
        width: '100%',
        padding: '0.75rem',
        backgroundColor: '#3B82F6',
        color: 'white',
        border: 'none',
        borderRadius: '0.375rem',
        fontSize: '1rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
    },
    buttonDisabled: {
        backgroundColor: '#9CA3AF',
        cursor: 'not-allowed',
    },
    error: {
        color: '#DC2626',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '0.375rem',
        padding: '0.75rem',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
    },
    loading: {
        textAlign: 'center',
        padding: '2rem',
        color: '#6B7280',
    },
    footer: {
        marginTop: '1.5rem',
        textAlign: 'center',
    },
    defaultCreds: {
        fontSize: '0.75rem',
        color: '#6B7280',
        backgroundColor: '#F9FAFB',
        padding: '0.75rem',
        borderRadius: '0.375rem',
        border: '1px solid #E5E7EB',
    },
    spinner: {
        width: '1rem',
        height: '1rem',
        border: '2px solid transparent',
        borderTop: '2px solid currentColor',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    }
};

export default Login;