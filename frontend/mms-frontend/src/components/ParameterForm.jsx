import React, { useState, useEffect } from 'react';

const ParameterForm = ({ report, onSubmit, onCancel, isSubmitting }) => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});

    useEffect(() => {
        // Initialize form data with default values
        const initialData = {};
        if (report?.parameters) {
            report.parameters.forEach(param => {
                if (param.default) {
                    if (param.default === 'today') {
                        initialData[param.name] = new Date().toISOString().split('T')[0];
                    } else {
                        initialData[param.name] = param.default;
                    }
                } else if (param.type === 'checkbox') {
                    initialData[param.name] = false;
                } else if (param.type === 'select' && param.options) {
                    initialData[param.name] = param.options[0];
                } else {
                    initialData[param.name] = '';
                }
            });
        }
        setFormData(initialData);
        setErrors({});
    }, [report]);

    const validateForm = () => {
        const newErrors = {};
        
        if (report?.parameters) {
            report.parameters.forEach(param => {
                if (param.required && !formData[param.name]) {
                    newErrors[param.name] = `${param.label} is required`;
                }
                
                // Date validation
                if (param.type === 'date' && formData[param.name]) {
                    const dateValue = new Date(formData[param.name]);
                    if (isNaN(dateValue.getTime())) {
                        newErrors[param.name] = 'Please enter a valid date';
                    }
                }
                
                // Email validation
                if (param.type === 'email' && formData[param.name]) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(formData[param.name])) {
                        newErrors[param.name] = 'Please enter a valid email address';
                    }
                }
                
                // Number validation
                if (param.type === 'number' && formData[param.name]) {
                    if (isNaN(Number(formData[param.name]))) {
                        newErrors[param.name] = 'Please enter a valid number';
                    }
                }
            });
        }
        
        // Date range validation
        const startDateParam = report?.parameters?.find(p => p.name === 'start_date');
        const endDateParam = report?.parameters?.find(p => p.name === 'end_date');
        
        if (startDateParam && endDateParam && formData.start_date && formData.end_date) {
            const startDate = new Date(formData.start_date);
            const endDate = new Date(formData.end_date);
            
            if (startDate > endDate) {
                newErrors.end_date = 'End date must be after start date';
            }
            
            // Don't allow future dates for attendance reports
            if (report.report_id === 'attendance_summary' || report.report_id === 'daily_attendance') {
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                
                if (startDate > today) {
                    newErrors.start_date = 'Start date cannot be in the future';
                }
                if (endDate > today) {
                    newErrors.end_date = 'End date cannot be in the future';
                }
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (paramName, value) => {
        setFormData(prev => ({
            ...prev,
            [paramName]: value
        }));
        
        // Clear error for this field
        if (errors[paramName]) {
            setErrors(prev => ({
                ...prev,
                [paramName]: ''
            }));
        }
    };

    const handleSubmit = (e, outputFormat = 'PDF') => {
        e.preventDefault();
        
        if (validateForm()) {
            onSubmit({
                parameters: formData,
                output_format: outputFormat
            });
        }
    };

    const renderInput = (param) => {
        const commonStyles = {
            width: '100%',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid #D1D5DB',
            fontSize: '0.875rem',
        };

        const errorStyles = {
            borderColor: '#DC2626',
            boxShadow: '0 0 0 1px #DC2626',
        };

        const inputStyles = {
            ...commonStyles,
            ...(errors[param.name] ? errorStyles : {})
        };

        switch (param.type) {
            case 'text':
            case 'email':
            case 'number':
                return (
                    <input
                        type={param.type}
                        value={formData[param.name] || ''}
                        onChange={(e) => handleInputChange(param.name, e.target.value)}
                        placeholder={param.placeholder || `Enter ${param.label.toLowerCase()}`}
                        style={inputStyles}
                    />
                );

            case 'date':
                return (
                    <input
                        type="date"
                        value={formData[param.name] || ''}
                        onChange={(e) => handleInputChange(param.name, e.target.value)}
                        style={inputStyles}
                    />
                );

            case 'select':
                return (
                    <select
                        value={formData[param.name] || (param.options ? param.options[0] : '')}
                        onChange={(e) => handleInputChange(param.name, e.target.value)}
                        style={{
                            ...inputStyles,
                            backgroundColor: 'white'
                        }}
                    >
                        {param.options?.map(option => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                );

            case 'checkbox':
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={formData[param.name] || false}
                            onChange={(e) => handleInputChange(param.name, e.target.checked)}
                            style={{ transform: 'scale(1.2)' }}
                        />
                        <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                            {param.description || param.label}
                        </span>
                    </div>
                );

            case 'textarea':
                return (
                    <textarea
                        value={formData[param.name] || ''}
                        onChange={(e) => handleInputChange(param.name, e.target.value)}
                        placeholder={param.placeholder || `Enter ${param.label.toLowerCase()}`}
                        rows={3}
                        style={{
                            ...inputStyles,
                            resize: 'vertical',
                            minHeight: '80px'
                        }}
                    />
                );

            default:
                return (
                    <input
                        type="text"
                        value={formData[param.name] || ''}
                        onChange={(e) => handleInputChange(param.name, e.target.value)}
                        placeholder={param.placeholder || `Enter ${param.label.toLowerCase()}`}
                        style={inputStyles}
                    />
                );
        }
    };

    const styles = {
        modal: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
        },
        modalContent: {
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        },
        header: {
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #E5E7EB',
        },
        title: {
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '0.5rem',
        },
        description: {
            color: '#6B7280',
            fontSize: '0.875rem',
        },
        form: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
        },
        formGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
        },
        label: {
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
        },
        required: {
            color: '#DC2626',
        },
        error: {
            color: '#DC2626',
            fontSize: '0.75rem',
            marginTop: '0.25rem',
        },
        outputSection: {
            padding: '1rem',
            backgroundColor: '#F9FAFB',
            borderRadius: '0.375rem',
            border: '1px solid #E5E7EB',
        },
        outputTitle: {
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.75rem',
        },
        formatButtons: {
            display: 'flex',
            gap: '0.5rem',
        },
        formatButton: {
            padding: '0.5rem 1rem',
            border: '1px solid #D1D5DB',
            borderRadius: '0.375rem',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '0.875rem',
            transition: 'all 0.2s',
        },
        formatButtonHover: {
            backgroundColor: '#F3F4F6',
            borderColor: '#9CA3AF',
        },
        actions: {
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #E5E7EB',
        },
        cancelButton: {
            padding: '0.75rem 1.5rem',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #D1D5DB',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
        },
        submitButton: {
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3B82F6',
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
        submitButtonDisabled: {
            backgroundColor: '#9CA3AF',
            cursor: 'not-allowed',
        },
        spinner: {
            width: '1rem',
            height: '1rem',
            border: '2px solid transparent',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
        },
    };

    if (!report) return null;

    return (
        <div style={styles.modal} onClick={onCancel}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div style={styles.header}>
                    <h2 style={styles.title}>Generate {report.title}</h2>
                    <p style={styles.description}>{report.description}</p>
                </div>

                <form style={styles.form} onSubmit={(e) => e.preventDefault()}>
                    {report.parameters?.map((param) => (
                        <div key={param.name} style={styles.formGroup}>
                            <label style={styles.label}>
                                {param.label}
                                {param.required && <span style={styles.required}>*</span>}
                            </label>
                            {renderInput(param)}
                            {errors[param.name] && (
                                <span style={styles.error}>{errors[param.name]}</span>
                            )}
                        </div>
                    ))}

                    {/* Output Format Selection */}
                    <div style={styles.outputSection}>
                        <div style={styles.outputTitle}>Output Format</div>
                        <div style={styles.formatButtons}>
                            {report.output_format?.map((format) => (
                                <button
                                    key={format}
                                    type="button"
                                    style={styles.formatButton}
                                    onMouseEnter={(e) => {
                                        Object.assign(e.target.style, styles.formatButtonHover);
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = 'white';
                                        e.target.style.borderColor = '#D1D5DB';
                                    }}
                                    onClick={(e) => handleSubmit(e, format)}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div style={styles.spinner}></div>
                                            Generating...
                                        </>
                                    ) : (
                                        `Generate ${format}`
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={styles.actions}>
                        <button
                            type="button"
                            onClick={onCancel}
                            style={styles.cancelButton}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                    </div>
                </form>

                <style jsx>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default ParameterForm;