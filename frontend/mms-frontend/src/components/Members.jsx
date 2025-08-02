import React from 'react';

const Members = () => {
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
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        },
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Members Directory</h1>
            {/* Add member listing functionality here */}
        </div>
    );
};

export default Members;