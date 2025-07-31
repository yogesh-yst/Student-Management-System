import React, { useState, useEffect } from 'react';
//import Button from "@/components/ui/button";
//import { AlertCircle } from "lucide-react";

const API_BASE_URL = 'http://localhost:5000/api'; // Adjust if your backend runs on a different port

// Inline styles to ensure styling works regardless of external CSS
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '3rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  contentWrapper: {
    width: '100%',
    maxWidth: '900px',
    marginBottom: '2rem'
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2.25rem',
    fontWeight: '800',
    color: '#111827',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#4B5563'
  },
  formSection: {
    marginBottom: '2rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1rem',
    borderRadius: '0.375rem',
    border: '1px solid #D1D5DB',
    fontSize: '1rem'
  },
  button: {
    backgroundColor: '#3B82F6',
    color: 'white',
    padding: '0.75rem 1rem',
    borderRadius: '0.375rem',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    marginBottom: '1rem'
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    cursor: 'not-allowed'
  },
  smallText: {
    fontSize: '0.75rem',
    color: '#6B7280'
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1rem'
  },
  tableContainer: {
    border: '1px solid #E5E7EB',
    borderRadius: '0.5rem',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: '#F9FAFB',
    textAlign: 'left'
  },
  tableHeaderCell: {
    padding: '0.75rem 1rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase'
  },
  tableCell: {
    padding: '1rem',
    borderTop: '1px solid #E5E7EB',
    fontSize: '0.875rem'
  },
  alert: {
    padding: '1rem',
    borderRadius: '0.375rem',
    marginBottom: '1rem'
  },
  alertSuccess: {
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    color: '#065F46',
    fontSize: '1.25rem', // Larger font size
    fontWeight: 'bold',  // Bolder text
  },
  alertWarning: {
    backgroundColor: '#FFFBEB',
    border: '1px solid #FEF3C7',
    color: '#92400E',
    fontSize: '1.25rem', // Larger font size
    fontWeight: 'bold',  // Bolder text
  },
  alertError: {
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    color: '#B91C1C',
    fontSize: '1.25rem', // Larger font size
    fontWeight: 'bold',  // Bolder text
  },
  alertTitle: {
    fontWeight: '600',
    marginBottom: '0.25rem'
  },
  alertDescription: {
    fontSize: '0.875rem'
  }
};

function App() {
    const [studentId, setStudentId] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [attendanceList, setAttendanceList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleCheckIn = async () => {
        if (!studentId.trim()) {
            setStatusMessage('Please enter a Student ID.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/checkin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ studentId }),
            });

            const data = await response.json();
            
            if (response.ok) {
                setStatusMessage(`✅ ${data.message}`);
                fetchTodayAttendance();
            } else if (response.status === 409) {
                setStatusMessage(`⚠️ ${data.error}`);
            }
            else {
                setError(data.error || 'Failed to check in.');
            }
        } catch (error) {
            setError(error.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
            // Clear the input field
            setStudentId('');
            // Focus the input field after a delay
            setTimeout(() => {
                document.getElementById('studentId').focus();
            }, 1000);
        }
    };

    const fetchTodayAttendance = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/attendance/today`);
            if (!response.ok) {
                throw new Error(`Failed to fetch attendance: ${response.status}`);
            }
            const data = await response.json();
            setAttendanceList(data);
        } catch (error) {
            setError(error.message || 'Error fetching today\'s attendance.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTodayAttendance(); // Fetch attendance on component mount
    }, []);

    const getAlertStyle = () => {
        if (statusMessage.startsWith("✅")) {
            return styles.alertSuccess;
        } else if (statusMessage.startsWith("⚠️")) {
            return styles.alertWarning;
        } else {
            return styles.alertError;
        }
    };

    const getAlertTitle = () => {
        if (statusMessage.startsWith("✅")) {
            return "Success";
        } else if (statusMessage.startsWith("⚠️")) {
            return "Warning";
        } else {
            return "Error";
        }
    };

    const [searchTerm, setSearchTerm] = useState('');

    // Filter attendanceList by first name (case-insensitive)
    const filteredAttendance = attendanceList.filter(record =>
        record.name && record.name.toLowerCase().startsWith(searchTerm.trim().toLowerCase())
    );

    return (
        <div style={styles.container}>
            <div style={styles.contentWrapper}>
                <div style={styles.header}>
                    <h1 style={styles.title}>CMC Bala Vihar Attendance</h1>
                    <p style={styles.subtitle}>Scan QR Code / Enter Student ID</p>
                </div>
                
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
        </div>
    );
}
export default App;
