import React, { useState } from 'react';

const MemberDetails = ({ member, onMemberUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedMember, setEditedMember] = useState(null);

    const handleEdit = () => {
        setEditedMember({ ...member });
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/members/${editedMember.student_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(editedMember),
            });

            if (!response.ok) {
                throw new Error('Failed to update member');
            }

            const updatedMember = await response.json();
            onMemberUpdate(updatedMember);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating member:', error);
            // Add error handling UI if needed
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedMember(null);
    };

    const handleChange = (field, value) => {
        setEditedMember(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const styles = {
        container: {
            flex: '0 0 350px',
            maxWidth: '400px',
            minWidth: '250px',
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            position: 'sticky',
            top: '80px',
            alignSelf: 'flex-start',
            height: 'fit-content',
        },
        title: {
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '2rem',
            color: '#111827',
        },
        memberDetails: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
        },
        detailItem: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
        },
        detailLabel: {
            fontSize: '0.875rem',
            color: '#6B7280',
            fontWeight: '500',
        },
        detailValue: {
            fontSize: '1rem',
            color: '#111827',
        },
        buttonContainer: {
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '1rem',
        },
        editButton: {
            padding: '0.5rem 1rem',
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
        },
        saveButton: {
            backgroundColor: '#059669',
        },
        cancelButton: {
            backgroundColor: '#DC2626',
            marginLeft: '0.5rem',
        },
        input: {
            width: '100%',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid #D1D5DB',
            fontSize: '1rem',
        },
    };

    if (!member) {
        return (
            <div style={styles.container}>
                <h2 style={styles.title}>Member Details</h2>
                <p>Select a member to view details</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.buttonContainer}>
                <h2 style={styles.title}>Member Details</h2>
                {!isEditing ? (
                    <button onClick={handleEdit} style={styles.editButton}>
                        Edit
                    </button>
                ) : (
                    <div>
                        <button onClick={handleSave} style={{...styles.editButton, ...styles.saveButton}}>
                            Save
                        </button>
                        <button onClick={handleCancel} style={{...styles.editButton, ...styles.cancelButton}}>
                            Cancel
                        </button>
                    </div>
                )}
            </div>
            <div style={styles.memberDetails}>
                {isEditing ? (
                    // Edit form
                    <>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Name</span>
                            <input
                                style={styles.input}
                                value={editedMember.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                            />
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Grade</span>
                            <input
                                style={styles.input}
                                value={editedMember.grade}
                                onChange={(e) => handleChange('grade', e.target.value)}
                            />
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Parent Name</span>
                            <input
                                style={styles.input}
                                value={editedMember.parent_name || ''}
                                onChange={(e) => handleChange('parent_name', e.target.value)}
                            />
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Contact</span>
                            <input
                                style={styles.input}
                                value={editedMember.contact || ''}
                                onChange={(e) => handleChange('contact', e.target.value)}
                            />
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Email</span>
                            <input
                                style={styles.input}
                                value={editedMember.email || ''}
                                onChange={(e) => handleChange('email', e.target.value)}
                            />
                        </div>
                    </>
                ) : (
                    // Display mode
                    <>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Student ID</span>
                            <span style={styles.detailValue}>{member.student_id}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Name</span>
                            <span style={styles.detailValue}>{member.name}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Grade</span>
                            <span style={styles.detailValue}>{member.grade}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Status</span>
                            <span style={styles.detailValue}>{member.status}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Parent Name</span>
                            <span style={styles.detailValue}>{member.parent_name || 'N/A'}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Contact</span>
                            <span style={styles.detailValue}>{member.contact || 'N/A'}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Email</span>
                            <span style={styles.detailValue}>{member.email || 'N/A'}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MemberDetails;