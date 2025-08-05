import React, { useState, useEffect } from 'react';

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);

    const styles = {
        container: {
            padding: '2rem',
            marginTop: '60px',
            maxWidth: '1200px',
            margin: '60px auto 0',
        },
        header: {
            marginBottom: '2rem',
        },
        title: {
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '0.5rem',
        },
        subtitle: {
            color: '#6B7280',
            fontSize: '1rem',
        },
        filterSection: {
            backgroundColor: '#F9FAFB',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        filterGroup: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
        },
        filterLabel: {
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
        },
        select: {
            padding: '0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid #D1D5DB',
            fontSize: '0.875rem',
            backgroundColor: 'white',
        },
        statsContainer: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
        },
        statCard: {
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
        },
        statNumber: {
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#1F2937',
        },
        statLabel: {
            fontSize: '0.875rem',
            color: '#6B7280',
            marginTop: '0.5rem',
        },
        reportsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '1.5rem',
        },
        reportCard: {
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            padding: '1.5rem',
            border: '1px solid #E5E7EB',
            transition: 'all 0.2s',
            cursor: 'pointer',
        },
        reportCardHover: {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            borderColor: '#3B82F6',
        },
        reportHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1rem',
        },
        reportTitle: {
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '0.25rem',
        },
        reportCategory: {
            padding: '0.25rem 0.75rem',
            backgroundColor: '#EFF6FF',
            color: '#1E40AF',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '500',
        },
        reportDescription: {
            color: '#6B7280',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            marginBottom: '1rem',
        },
        reportMeta: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: '#9CA3AF',
            marginBottom: '1rem',
        },
        reportActions: {
            display: 'flex',
            gap: '0.75rem',
        },
        primaryButton: {
            padding: '0.5rem 1rem',
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontWeight: '500',
        },
        secondaryButton: {
            padding: '0.5rem 1rem',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #D1D5DB',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            cursor: 'pointer',
        },
        loadingContainer: {
            textAlign: 'center',
            padding: '3rem',
            color: '#6B7280',
        },
        errorContainer: {
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            padding: '1rem',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
        },
        emptyState: {
            textAlign: 'center',
            padding: '3rem',
            color: '#6B7280',
        },
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
        },
        modalHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
        },
        modalTitle: {
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#111827',
        },
        closeButton: {
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#6B7280',
        },
    };

    useEffect(() => {
        fetchReports();
        fetchCategories();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/api/reports', {
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error('Failed to fetch reports');
            }
            const data = await response.json();
            setReports(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/reports/categories', {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setCategories(['All', ...data]);
            }
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    const filteredReports = reports.filter(report => 
        selectedCategory === 'All' || report.category === selectedCategory
    );

    const handleReportClick = async (report) => {
        try {
            const response = await fetch(`http://localhost:5000/api/reports/${report.report_id}`, {
                credentials: 'include',
            });
            if (response.ok) {
                const detailedReport = await response.json();
                setSelectedReport(detailedReport);
                setShowReportModal(true);
            }
        } catch (err) {
            console.error('Failed to fetch report details:', err);
        }
    };

    const handleGenerateReport = async (reportId) => {
        // For now, just show an alert. In a real implementation, 
        // this would open a parameter form or generate the report
        alert(`Generating report: ${reportId}\n\nThis would typically open a parameter form or start the report generation process.`);
    };

    const getCategoryColor = (category) => {
        const colors = {
            'Attendance': { bg: '#EFF6FF', text: '#1E40AF' },
            'Students': { bg: '#F0FDF4', text: '#166534' },
            'Analytics': { bg: '#FEF3C7', text: '#92400E' },
            'Volunteers': { bg: '#FDF2F8', text: '#BE185D' },
        };
        return colors[category] || { bg: '#F3F4F6', text: '#374151' };
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingContainer}>
                    <div>Loading reports...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.errorContainer}>
                    Error: {error}
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>Reports Dashboard</h1>
                <p style={styles.subtitle}>
                    Generate and view various reports for your Bala Vihar center
                </p>
            </div>

            {/* Filters */}
            <div style={styles.filterSection}>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Category:</label>
                    <select
                        style={styles.select}
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </div>
                <div style={styles.filterGroup}>
                    <span style={styles.filterLabel}>
                        Showing {filteredReports.length} of {reports.length} reports
                    </span>
                </div>
            </div>

            {/* Statistics */}
            <div style={styles.statsContainer}>
                <div style={styles.statCard}>
                    <div style={styles.statNumber}>{reports.length}</div>
                    <div style={styles.statLabel}>Total Reports</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statNumber}>{reports.filter(r => r.is_active).length}</div>
                    <div style={styles.statLabel}>Active Reports</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statNumber}>{categories.length - 1}</div>
                    <div style={styles.statLabel}>Categories</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statNumber}>{filteredReports.length}</div>
                    <div style={styles.statLabel}>Filtered Results</div>
                </div>
            </div>

            {/* Reports Grid */}
            {filteredReports.length > 0 ? (
                <div style={styles.reportsGrid}>
                    {filteredReports.map((report) => {
                        const categoryColors = getCategoryColor(report.category);
                        return (
                            <div
                                key={report.report_id}
                                style={styles.reportCard}
                                onClick={() => handleReportClick(report)}
                                onMouseEnter={(e) => {
                                    Object.assign(e.target.style, styles.reportCardHover);
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
                                    e.target.style.borderColor = '#E5E7EB';
                                }}
                            >
                                <div style={styles.reportHeader}>
                                    <div>
                                        <h3 style={styles.reportTitle}>{report.title}</h3>
                                    </div>
                                    <span 
                                        style={{
                                            ...styles.reportCategory,
                                            backgroundColor: categoryColors.bg,
                                            color: categoryColors.text
                                        }}
                                    >
                                        {report.category}
                                    </span>
                                </div>
                                
                                <p style={styles.reportDescription}>
                                    {report.description}
                                </p>
                                
                                <div style={styles.reportMeta}>
                                    <span>Est. time: {report.estimated_time}</span>
                                    <span>Formats: {report.output_format.join(', ')}</span>
                                </div>
                                
                                <div style={styles.reportActions}>
                                    <button
                                        style={styles.primaryButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleGenerateReport(report.report_id);
                                        }}
                                    >
                                        Generate Report
                                    </button>
                                    <button
                                        style={styles.secondaryButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReportClick(report);
                                        }}
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={styles.emptyState}>
                    <p>No reports found for the selected category.</p>
                </div>
            )}

            {/* Report Details Modal */}
            {showReportModal && selectedReport && (
                <div style={styles.modal} onClick={() => setShowReportModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>{selectedReport.title}</h2>
                            <button
                                style={styles.closeButton}
                                onClick={() => setShowReportModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div>
                            <p><strong>Description:</strong> {selectedReport.description}</p>
                            <p><strong>Category:</strong> {selectedReport.category}</p>
                            <p><strong>Estimated Time:</strong> {selectedReport.estimated_time}</p>
                            <p><strong>Output Formats:</strong> {selectedReport.output_format.join(', ')}</p>
                            
                            {selectedReport.parameters && selectedReport.parameters.length > 0 && (
                                <div>
                                    <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Parameters:</h3>
                                    <ul style={{ paddingLeft: '1.5rem' }}>
                                        {selectedReport.parameters.map((param, index) => (
                                            <li key={index} style={{ marginBottom: '0.5rem' }}>
                                                <strong>{param.label}</strong> ({param.type})
                                                {param.required && <span style={{ color: '#DC2626' }}> *</span>}
                                                {param.options && (
                                                    <span style={{ color: '#6B7280' }}>
                                                        {' '}Options: {param.options.join(', ')}
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                                <button
                                    style={styles.primaryButton}
                                    onClick={() => {
                                        setShowReportModal(false);
                                        handleGenerateReport(selectedReport.report_id);
                                    }}
                                >
                                    Generate Report
                                </button>
                                <button
                                    style={styles.secondaryButton}
                                    onClick={() => setShowReportModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;