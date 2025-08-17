import React, { useState, useEffect } from 'react';
import MemberDetails from './MemberDetails';
//import config from '../config';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const Members = () => {
    const [members, setMembers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);

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
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
        },
        title: {
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#111827',
            margin: 0,
        },
        addButton: {
            padding: '0.75rem 1.5rem',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
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
        statsContainer: {
            display: 'flex',
            gap: '1rem',
            marginBottom: '1.5rem',
        },
        statCard: {
            backgroundColor: '#F3F4F6',
            padding: '1rem',
            borderRadius: '0.375rem',
            textAlign: 'center',
            minWidth: '100px',
        },
        statNumber: {
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1F2937',
        },
        statLabel: {
            fontSize: '0.75rem',
            color: '#6B7280',
            textTransform: 'uppercase',
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
        emptyState: {
            textAlign: 'center',
            padding: '2rem',
            color: '#6B7280',
        },
    };

    useEffect(() => {
        const fetchMembers = async () => {
            try { 
                const token = localStorage.getItem("token");
                const response = await fetch(`${API_BASE_URL}/api/members`, {
                    credentials: 'include',
                     headers: {
                        "Authorization": `Bearer ${token}`
                    }
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

    const handleMemberAdd = (newMember) => {
        setMembers(prevMembers => [...prevMembers, newMember]);
        setSelectedMember(newMember);
    };

    const handleAddNewMember = () => {
        setSelectedMember(null);
        setIsAddingNew(true);
    };

    const handleCancelAdd = () => {
        setIsAddingNew(false);
    };

    const handleMemberSelect = (member) => {
        if (isAddingNew) {
            setIsAddingNew(false);
        }
        setSelectedMember(member);
    };

    // Calculate stats
    const activeMembers = members.filter(m => m.status === 'Active').length;
    const totalMembers = members.length;

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
                <div style={styles.header}>
                    <h1 style={styles.title}>Members Directory</h1>
                    <button onClick={handleAddNewMember} style={styles.addButton}>
                        <span>+</span>
                        Add New Member
                    </button>
                </div>
            </div>
            
            {/* Main Content Panels */}
            <div style={{ display: 'flex', gap: '2rem', flex: 1, minHeight: 0 }}>
                <div style={styles.mainPanel}>
                    <div style={styles.searchContainer}>
                        <input
                            type="text"
                            placeholder="Search members by name, ID, or grade..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                        />
                        
                        {/* Stats */}
                        <div style={styles.statsContainer}>
                            <div style={styles.statCard}>
                                <div style={styles.statNumber}>{totalMembers}</div>
                                <div style={styles.statLabel}>Total Members</div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={styles.statNumber}>{activeMembers}</div>
                                <div style={styles.statLabel}>Active Members</div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={styles.statNumber}>{filteredMembers.length}</div>
                                <div style={styles.statLabel}>Filtered Results</div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div style={styles.loadingText}>Loading members...</div>
                    ) : error ? (
                        <div style={styles.errorText}>{error}</div>
                    ) : filteredMembers.length > 0 ? (
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeader}>Student ID</th>
                                        <th style={styles.tableHeader}>Name</th>
                                        <th style={styles.tableHeader}>Grade</th>
                                        <th style={styles.tableHeader}>Status</th>
                                        <th style={styles.tableHeader}>Contact</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMembers.map((member) => (
                                        <tr 
                                            key={member.student_id}
                                            onClick={() => handleMemberSelect(member)}
                                            style={{
                                                ...styles.tableCell,
                                                ...styles.tableRow,
                                                ...(selectedMember?.student_id === member.student_id && !isAddingNew ? styles.selectedRow : {})
                                            }}
                                        >
                                            <td style={styles.tableCell}>{member.student_id}</td>
                                            <td style={styles.tableCell}>{member.name}</td>
                                            <td style={styles.tableCell}>{member.grade}</td>
                                            <td style={styles.tableCell}>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '0.25rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500',
                                                    backgroundColor: member.status === 'Active' ? '#DCFCE7' : '#FEF3C7',
                                                    color: member.status === 'Active' ? '#166534' : '#92400E'
                                                }}>
                                                    {member.status}
                                                </span>
                                            </td>
                                            <td style={styles.tableCell}>{member.contact || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={styles.emptyState}>
                            {searchTerm ? 
                                `No members found matching "${searchTerm}"` : 
                                'No members found. Add your first member!'
                            }
                        </div>
                    )}
                </div>
                
                <MemberDetails 
                    member={selectedMember} 
                    onMemberUpdate={handleMemberUpdate}
                    onMemberAdd={handleMemberAdd}
                    isAddingNew={isAddingNew}
                    onCancelAdd={handleCancelAdd}
                />
            </div>
        </div>
    );
};

export default Members;