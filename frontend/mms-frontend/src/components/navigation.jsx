import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png'; // Make sure logo is in this path

const Navigation = ({ onLogout }) => {
    const location = useLocation();
    
    const styles = {
        nav: {
            backgroundColor: '#1E40AF',
            padding: '1rem',
            color: 'white',
            width: '100%',
            position: 'fixed',
            top: 0,
            zIndex: 1000,
        },
        container: {
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        logoContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
        },
        logo: {
            height: '40px',
            width: 'auto',
        },
        title: {
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: 'white',
        },
        menu: {
            display: 'flex',
            gap: '2rem',
            alignItems: 'center',
        },
        menuItem: {
            color: 'white',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            transition: 'background-color 0.2s',
        },
        activeMenuItem: {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
        },
        logoutButton: {
            backgroundColor: '#DC2626',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
        },
    };

    return (
        <nav style={styles.nav}>
            <div style={styles.container}>
                <div style={styles.logoContainer}>
                    <img src={logo} alt="CMC Logo" style={styles.logo} />
                    <span style={styles.title}>CMC Bala Vihar</span>
                </div>
                <div style={styles.menu}>
                    <Link 
                        to="/" 
                        style={{
                            ...styles.menuItem,
                            ...(location.pathname === '/' ? styles.activeMenuItem : {})
                        }}
                    >
                        Home
                    </Link>
                    <Link 
                        to="/members" 
                        style={{
                            ...styles.menuItem,
                            ...(location.pathname === '/members' ? styles.activeMenuItem : {})
                        }}
                    >
                        Members
                    </Link>
                    <Link 
                        to="/reports" 
                        style={{
                            ...styles.menuItem,
                            ...(location.pathname === '/reports' ? styles.activeMenuItem : {})
                        }}
                    >
                        Reports
                    </Link>
                    <button onClick={onLogout} style={styles.logoutButton}>
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;