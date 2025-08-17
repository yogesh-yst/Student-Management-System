import React, { useState } from 'react';
//import config from '../config';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const MemberDetails = ({ member, onMemberUpdate, onMemberAdd, isAddingNew, onCancelAdd }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedMember, setEditedMember] = useState(null);
    const [errors, setErrors] = useState({});
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkInStatus, setCheckInStatus] = useState(null);

    // Update the newMemberTemplate to remove student_id
    const newMemberTemplate = {
        name: '',
        grade: '',
        status: 'Active',
        parent_name: '',
        contact: '',
        email: ''
    };

    const handleEdit = () => {
        setEditedMember({ ...member });
        setIsEditing(true);
        setErrors({});
    };

    const handleAddNew = () => {
        setEditedMember({ ...newMemberTemplate });
        setErrors({});
    };

    // Update validateForm to remove student_id validation
    const validateForm = (memberData) => {
        const newErrors = {};
        
        if (!memberData.name?.trim()) {
            newErrors.name = 'Name is required';
        }
        if (!memberData.grade?.trim()) {
            newErrors.grade = 'Grade is required';
        }
        if (!memberData.status?.trim()) {
            newErrors.status = 'Status is required';
        }
        
        // Email validation if provided
        if (memberData.email && !/\S+@\S+\.\S+/.test(memberData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm(editedMember)) {
            return;
        }

        try {
            let response;
            const token = localStorage.getItem("token");
            if (isAddingNew) {
                // Adding new member

                response = await fetch(`${API_BASE_URL}/api/members`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${token}`
                    },
                    credentials: 'include',
                    body: JSON.stringify(editedMember),
                });
            } else {
                // Updating existing member
                response = await fetch(`${API_BASE_URL}/api/members/${editedMember.student_id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${token}`
                    },
                    credentials: 'include',
                    body: JSON.stringify(editedMember),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 409) {
                    setErrors({ general: errorData.error });
                    return;
                }
                throw new Error(errorData.error || 'Failed to save member');
            }

            const savedMember = await response.json();
            
            if (isAddingNew) {
                onMemberAdd(savedMember);
                onCancelAdd(); // Close add mode
            } else {
                onMemberUpdate(savedMember);
                setIsEditing(false);
            }
            
            setEditedMember(null);
            setErrors({});
        } catch (error) {
            console.error('Error saving member:', error);
            setErrors({ general: error.message });
        }
    };

    const handleCancel = () => {
        if (isAddingNew) {
            onCancelAdd();
        } else {
            setIsEditing(false);
        }
        setEditedMember(null);
        setErrors({});
    };

    const handleChange = (field, value) => {
        setEditedMember(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const handleCheckIn = async () => {
        if (!member || checkingIn) return;
        
        setCheckingIn(true);
        setCheckInStatus(null);

        try {
             const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL}/api/checkin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    studentId: member.student_id,
                    name: member.name
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setCheckInStatus({ type: 'success', message: '✅ Check-in successful!' });
            } else if (response.status === 409) {
                setCheckInStatus({ type: 'warning', message: '⚠️ Already checked in today' });
            } else {
                throw new Error(data.error || 'Failed to check in');
            }
        } catch (error) {
            setCheckInStatus({ type: 'error', message: `❌ ${error.message}` });
        } finally {
            setCheckingIn(false);
        }
    };

    // Start add mode when isAddingNew prop changes to true
    React.useEffect(() => {
        if (isAddingNew) {
            handleAddNew();
        }
    }, [isAddingNew]);

    // Add this effect to clear status when member changes
    React.useEffect(() => {
        setCheckInStatus(null);
    }, [member]);

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
        inputError: {
            borderColor: '#DC2626',
        },
        select: {
            width: '100%',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid #D1D5DB',
            fontSize: '1rem',
            backgroundColor: 'white',
        },
        errorText: {
            color: '#DC2626',
            fontSize: '0.75rem',
            marginTop: '0.25rem',
        },
        generalError: {
            color: '#DC2626',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            padding: '0.5rem',
            backgroundColor: '#FEF2F2',
            borderRadius: '0.375rem',
            border: '1px solid #FECACA',
        },
        checkInButton: {
            padding: '0.75rem 1rem',
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            width: '100%',
            marginTop: '1rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
        },
        statusMessage: {
            padding: '0.75rem',
            borderRadius: '0.375rem',
            marginTop: '1rem',
            fontSize: '0.875rem',
            fontWeight: '500',
        },
        successMessage: {
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            border: '1px solid #A7F3D0',
        },
        warningMessage: {
            backgroundColor: '#FFFBEB',
            color: '#92400E',
            border: '1px solid #FEF3C7',
        },
        errorMessage: {
            backgroundColor: '#FEF2F2',
            color: '#B91C1C',
            border: '1px solid #FECACA',
        },
    };

    const gradeOptions = [
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
        'Parent', 'Teacher', 'Volunteer', 'Other'
    ];

    if (!member && !isAddingNew) {
        return (
            <div style={styles.container}>
                <h2 style={styles.title}>Member Details</h2>
                <p>Select a member to view details</p>
            </div>
        );
    }

    const displayMember = editedMember || member;
    const isInEditMode = isEditing || isAddingNew;

    return (
        <div style={styles.container}>
            <div style={styles.buttonContainer}>
                <h2 style={styles.title}>
                    {isAddingNew ? 'Add New Member' : 'Member Details'}
                </h2>
                {!isInEditMode ? (
                    <button onClick={handleEdit} style={styles.editButton}>
                        Edit
                    </button>
                ) : (
                    <div>
                        <button onClick={handleSave} style={{...styles.editButton, ...styles.saveButton}}>
                            {isAddingNew ? 'Add' : 'Save'}
                        </button>
                        <button onClick={handleCancel} style={{...styles.editButton, ...styles.cancelButton}}>
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {errors.general && (
                <div style={styles.generalError}>
                    {errors.general}
                </div>
            )}

            <div style={styles.memberDetails}>
                {isInEditMode ? (
                    // Edit/Add form
                    <>
                        {!isAddingNew && (
                            <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Member ID</span>
                                <input
                                    style={{
                                        ...styles.input,
                                        backgroundColor: '#f3f4f6',
                                        cursor: 'not-allowed'
                                    }}
                                    value={displayMember?.student_id || 'Auto-generated'}
                                    disabled={true}
                                />
                            </div>
                        )}
                        
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Name *</span>
                            <input
                                style={{
                                    ...styles.input,
                                    ...(errors.name ? styles.inputError : {})
                                }}
                                value={displayMember?.name || ''}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="Enter full name"
                            />
                            {errors.name && (
                                <span style={styles.errorText}>{errors.name}</span>
                            )}
                        </div>
                        
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Grade *</span>
                            <select
                                style={{
                                    ...styles.select,
                                    ...(errors.grade ? styles.inputError : {})
                                }}
                                value={displayMember?.grade || ''}
                                onChange={(e) => handleChange('grade', e.target.value)}
                            >
                                <option value="">Select Grade/Role</option>
                                {gradeOptions.map(grade => (
                                    <option key={grade} value={grade}>
                                        {grade}
                                    </option>
                                ))}
                            </select>
                            {errors.grade && (
                                <span style={styles.errorText}>{errors.grade}</span>
                            )}
                        </div>
                        
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Status *</span>
                            <select
                                style={{
                                    ...styles.select,
                                    ...(errors.status ? styles.inputError : {})
                                }}
                                value={displayMember?.status || 'Active'}
                                onChange={(e) => handleChange('status', e.target.value)}
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Alumni">Alumni</option>
                            </select>
                            {errors.status && (
                                <span style={styles.errorText}>{errors.status}</span>
                            )}
                        </div>
                        
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Parent Name</span>
                            <input
                                style={styles.input}
                                value={displayMember?.parent_name || ''}
                                onChange={(e) => handleChange('parent_name', e.target.value)}
                                placeholder="Enter parent/guardian name"
                            />
                        </div>
                        
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Contact</span>
                            <input
                                style={styles.input}
                                value={displayMember?.contact || ''}
                                onChange={(e) => handleChange('contact', e.target.value)}
                                placeholder="Enter phone number"
                            />
                        </div>
                        
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Email</span>
                            <input
                                style={{
                                    ...styles.input,
                                    ...(errors.email ? styles.inputError : {})
                                }}
                                type="email"
                                value={displayMember?.email || ''}
                                onChange={(e) => handleChange('email', e.target.value)}
                                placeholder="Enter email address"
                            />
                            {errors.email && (
                                <span style={styles.errorText}>{errors.email}</span>
                            )}
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

            {!isInEditMode && member && (
                <>
                    <button 
                        onClick={handleCheckIn}
                        disabled={checkingIn}
                        style={{
                            ...styles.checkInButton,
                            opacity: checkingIn ? 0.7 : 1,
                            cursor: checkingIn ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {checkingIn ? 'Checking in...' : 'Check In'}
                    </button>

                    {checkInStatus && (
                        <div style={{
                            ...styles.statusMessage,
                            ...(checkInStatus.type === 'success' ? styles.successMessage :
                                checkInStatus.type === 'warning' ? styles.warningMessage :
                                styles.errorMessage)
                        }}>
                            {checkInStatus.message}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MemberDetails;