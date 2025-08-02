import React from 'react';

const Home = ({ 
    studentId, 
    setStudentId, 
    handleCheckIn, 
    loading, 
    statusMessage, 
    getAlertStyle, 
    getAlertTitle,
    searchTerm,
    setSearchTerm,
    error,
    filteredAttendance,
    styles 
}) => {
    return (
        <div style={{...styles.contentWrapper, ...styles.mainContent}}>
            {/* Move the attendance content from App.jsx to here */}
            <div style={styles.header}>
                <h1 style={styles.title}>CMC Bala Vihar Attendance</h1>
                <p style={styles.subtitle}>Scan QR Code / Enter Student ID</p>
            </div>
            
            {/* Rest of the attendance UI code from App.jsx */}
            <div style={styles.formSection}>
                <input
                    id="studentId"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleCheckIn();
                        }
                    }}
                    placeholder="Enter Student ID"
                    style={styles.input}
                    disabled={loading}
                />
                
                <button
                    onClick={handleCheckIn}
                    disabled={loading}
                    style={{
                        ...styles.button,
                        ...(loading ? styles.buttonDisabled : {})
                    }}
                >
                    {loading ? 'Checking In...' : 'Check In'}
                </button>
                
                {statusMessage && (
                    <div style={{...styles.alert, ...getAlertStyle()}}>
                        <div style={styles.alertTitle}>{getAlertTitle()}</div>
                        <div style={styles.alertDescription}>
                            {statusMessage.replace(/^[\u2705\u274C\u26A0\s]+/, '')}
                        </div>
                    </div>
                )}
                
                <p style={styles.smallText}>
                    *Enter Student ID and press Check In or hit Enter to log attendance
                </p>
            </div>

            <div>
                <h2 style={styles.sectionTitle}>Today's Attendance</h2>
                {/* Search box for filtering by first name */}
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by first name"
                    style={{ ...styles.input, marginBottom: '1.5rem' }}
                    disabled={loading}
                />
                {loading ? (
                    <p>Loading attendance data...</p>
                ) : error ? (
                    <div style={{...styles.alert, ...styles.alertError}}>
                        <div style={styles.alertTitle}>Error</div>
                        <div style={styles.alertDescription}>{error}</div>
                    </div>
                ) : filteredAttendance.length > 0 ? (
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead style={styles.tableHeader}>
                                <tr>
                                    <th style={styles.tableHeaderCell}>Student ID</th>
                                    <th style={styles.tableHeaderCell}>Name</th>
                                    <th style={styles.tableHeaderCell}>Check in Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAttendance.map((record) => (
                                    <tr key={record.student_id}>
                                        <td style={styles.tableCell}>{record.student_id}</td>
                                        <td style={styles.tableCell}>{record.name}</td>
                                        <td style={styles.tableCell}>{record.timestamp}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p>No attendance records for today yet.</p>
                )}
            </div>
        </div>
    );
};

export default Home;