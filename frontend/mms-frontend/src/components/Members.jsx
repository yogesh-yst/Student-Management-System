import React, { useState, useEffect } from 'react';
import MemberDetails from './MemberDetails';

const Members = () => {
    const [members, setMembers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);

    const styles = {
        container: {
            padding: '2rem',
            display: 'flex',
            gap: '2rem',
            marginTop: '60px', // Account for navigation bar
            height: 'calc(100vh - 60px)', // Fill viewport below nav
        },
        mainPanel: {
            flex: '1 1 60%',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minWidth: 0,
        },
        title: {
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: '2rem',
            color: '#111827',
        },
        searchContainer: {
            marginBottom: '1.5rem',
        },
        searchInput: {
            width: '100%',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid #D1D5DB',
            fontSize: '1rem',
            marginBottom: '1rem',
        },
        tableContainer: {
            flex: 1,
            overflowY: 'auto',
            border: '1px solid #E5E7EB',
            borderRadius: '0.5rem',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        },
        table: {
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
        },
        tableHeader: {
            position: 'sticky',
            top: 0,
            backgroundColor: '#F9FAFB',
            padding: '0.75rem 1rem',
            textAlign: 'left',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#6B7280',
            borderBottom: '1px solid #E5E7EB',
            zIndex: 1,
        },
        tableCell: {
            padding: '1rem',
            borderBottom: '1px solid #E5E7EB',
        },
        tableRow: {
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            ':hover': {
                backgroundColor: '#F9FAFB',
            },
        },
        selectedRow: {
            backgroundColor: '#EFF6FF',
        },
        loadingText: {
            textAlign: 'center',
            color: '#6B7280',
            padding: '2rem',
        },
        errorText: {
            color: '#DC2626',
            padding: '1rem',
            backgroundColor: '#FEF2F2',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
        },
    };

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/members', {
                    credentials: 'include',
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch members');
                }
                const data = await response.json();
                setMembers(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMembers();
    }, []);

    const filteredMembers = members.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleMemberUpdate = (updatedMember) => {
        setMembers(prevMembers => 
            prevMembers.map(member => 
                member.student_id === updatedMember.student_id ? updatedMember : member
            )
        );
        setSelectedMember(updatedMember);
    };

    return (
        <div style={{ ...styles.container, flexDirection: 'column', gap: 0 }}>
            {/* Top Panel */}
            <div style={{
                width: '100%',
                backgroundColor: '#F3F4F6',
                padding: '1.5rem 2rem',
                borderRadius: '0.5rem',
                marginBottom: '2rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            }}>
                <h1 style={{ ...styles.title, marginBottom: 0 }}>Members Directory</h1>
            </div>
            {/* Main Content Panels */}
            <div style={{ display: 'flex', gap: '2rem', flex: 1, minHeight: 0 }}>
                <div style={styles.mainPanel}>
                    <div style={styles.searchContainer}>
                        <input
                            type="text"
                            placeholder="Search members..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                        />
                    </div>

                    {loading ? (
                        <div style={styles.loadingText}>Loading members...</div>
                    ) : error ? (
                        <div style={styles.errorText}>{error}</div>
                    ) : (
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeader}>Student ID</th>
                                        <th style={styles.tableHeader}>Name</th>
                                        <th style={styles.tableHeader}>Grade</th>
                                        <th style={styles.tableHeader}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMembers.map((member) => (
                                        <tr 
                                            key={member.student_id}
                                            onClick={() => setSelectedMember(member)}
                                            style={{
                                                ...styles.tableCell,
                                                ...styles.tableRow,
                                                ...(selectedMember?.student_id === member.student_id ? styles.selectedRow : {})
                                            }}
                                        >
                                            <td style={styles.tableCell}>{member.student_id}</td>
                                            <td style={styles.tableCell}>{member.name}</td>
                                            <td style={styles.tableCell}>{member.grade}</td>
                                            <td style={styles.tableCell}>{member.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                
                <MemberDetails 
                    member={selectedMember} 
                    onMemberUpdate={handleMemberUpdate}
                />
            </div>
        </div>
    );
};

export default Members;