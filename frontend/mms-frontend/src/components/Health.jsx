import React from 'react';

const Health = () => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: '#f0f9ff',
            fontFamily: 'Arial, sans-serif'
        }}>
            <div style={{
                textAlign: 'center',
                padding: '2rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                border: '2px solid #10b981'
            }}>
                <div style={{
                    fontSize: '3rem',
                    color: '#10b981',
                    marginBottom: '1rem'
                }}>
                    ✅
                </div>
                <h1 style={{
                    color: '#065f46',
                    fontSize: '1.5rem',
                    margin: '0 0 0.5rem 0'
                }}>
                    Service Healthy
                </h1>
                <p style={{
                    color: '#6b7280',
                    fontSize: '1rem',
                    margin: '0'
                }}>
                    Member Management System is running successfully
                </p>
                <div style={{
                    marginTop: '1rem',
                    fontSize: '0.875rem',
                    color: '#9ca3af'
                }}>
                    Status: OK | Timestamp: {new Date().toISOString()}
                </div>
            </div>
        </div>
    );
};

export default Health;
