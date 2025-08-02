import React, { useState } from 'react';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Login attempt:', { username, password });
        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                console.log('Login successful');
                onLogin();
            } else {
                console.log('Login failed:', data.error);
                setError(data.error);
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Failed to login');
        }
    };

    return (
        <div style={styles.container}>
            <form onSubmit={handleSubmit} style={styles.form}>
                <h1 style={styles.title}>Login</h1>
                {error && <div style={styles.error}>{error}</div>}
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    style={styles.input}
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    style={styles.input}
                />
                <button type="submit" style={styles.button}>
                    Login
                </button>
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
    },
    form: {
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
    },
    title: {
        textAlign: 'center',
        marginBottom: '2rem',
        color: '#111827',
        fontSize: '1.5rem',
        fontWeight: 'bold',
    },
    input: {
        width: '100%',
        padding: '0.75rem',
        marginBottom: '1rem',
        borderRadius: '0.375rem',
        border: '1px solid #D1D5DB',
        fontSize: '1rem',
    },
    button: {
        width: '100%',
        padding: '0.75rem',
        backgroundColor: '#3B82F6',
        color: 'white',
        border: 'none',
        borderRadius: '0.375rem',
        fontSize: '1rem',
        cursor: 'pointer',
    },
    error: {
        color: '#DC2626',
        marginBottom: '1rem',
        textAlign: 'center',
    }
};

export default Login;