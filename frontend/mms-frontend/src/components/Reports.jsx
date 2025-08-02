import React from 'react';

const Reports = () => {
    const styles = {
        container: {
            padding: '2rem',
        },
        title: {
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: '2rem',
            color: '#111827',
        },
        reportList: {
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        },
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Reports</h1>
            {/* Add reports listing here */}
        </div>
    );
};

export default Reports;