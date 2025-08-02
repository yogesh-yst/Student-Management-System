import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Navigation from './components/navigation';
import Home from './components/Home';
import Members from './components/Members';
import Reports from './components/Reports';

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
  },
   headerContent: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    logoutButton: {
        padding: '0.5rem 1rem',
        backgroundColor: '#EF4444',
        color: 'white',
        border: 'none',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    mainContent: {
        marginTop: '80px', // Add space for fixed navigation
        width: '100%',
    },
};

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [studentId, setStudentId] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [attendanceList, setAttendanceList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE_URL}/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

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
                credentials: 'include', 
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
            const response = await fetch(`${API_BASE_URL}/attendance/today`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Include cookies/session
            });
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

    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <Router>
            <Navigation onLogout={handleLogout} />
            <div style={styles.container}>
                <Routes>
                    <Route 
                        path="/" 
                        element={
                            <Home 
                                studentId={studentId}
                                setStudentId={setStudentId}
                                handleCheckIn={handleCheckIn}
                                loading={loading}
                                statusMessage={statusMessage}
                                getAlertStyle={getAlertStyle}
                                getAlertTitle={getAlertTitle}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                error={error}
                                filteredAttendance={filteredAttendance}
                                styles={styles}
                            />
                        } 
                    />
                    <Route path="/members" element={<Members />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
