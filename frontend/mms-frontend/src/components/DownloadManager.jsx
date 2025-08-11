import React, { useState, useEffect } from 'react';
import config from '../config'; 

const DownloadManager = ({ isOpen, onClose }) => {
    const [generatedReports, setGeneratedReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [downloadingFiles, setDownloadingFiles] = useState(new Set());

    useEffect(() => {
        if (isOpen) {
            fetchGeneratedReports();
        }
    }, [isOpen]);

    const fetchGeneratedReports = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${config.API_URL}/api/reports/generated`, {
                credentials: 'include',
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch generated reports');
            }
            
            const data = await response.json();
            setGeneratedReports(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (fileId, filename) => {
        try {
            setDownloadingFiles(prev => new Set([...prev, fileId]));
            
            const response = await fetch(`${config.API_URL}/api/reports/download/${fileId}`, {
                credentials: 'include',
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Download failed');
            }
            
            // Create blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // Refresh the list to update download count
            fetchGeneratedReports();
            
        } catch (err) {
            alert(`Download failed: ${err.message}`);
        } finally {
            setDownloadingFiles(prev => {
                const newSet = new Set(prev);
                newSet.delete(fileId);
                return newSet;
            });
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTimeRemaining = (expiresAt) => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = expiry - now;
        
        if (diff <= 0) return 'Expired';
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h`;
        return 'Less than 1h';
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
            width: '90%',
            maxWidth: '800px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        },
        header: {
            padding: '1.5rem',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        title: {
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
            padding: '0.5rem',
        },
        content: {
            flex: 1,
            overflow: 'auto',
            padding: '1.5rem',
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
        reportsList: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
        },
        reportCard: {
            border: '1px solid #E5E7EB',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            backgroundColor: 'white',
            transition: 'all 0.2s',
        },
        reportCardHover: {
            boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
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
        reportId: {
            fontSize: '0.75rem',
            color: '#6B7280',
            fontFamily: 'monospace',
        },
        statusBadge: {
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '500',
        },
        statusActive: {
            backgroundColor: '#DCFCE7',
            color: '#166534',
        },
        statusExpired: {
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
        },
        reportMeta: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem',
        },
        metaItem: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
        },
        metaLabel: {
            fontSize: '0.75rem',
            color: '#6B7280',
            fontWeight: '500',
            textTransform: 'uppercase',
        },
        metaValue: {
            fontSize: '0.875rem',
            color: '#111827',
        },
        parametersSection: {
            marginBottom: '1rem',
        },
        parametersTitle: {
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem',
        },
        parametersList: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
        },
        parameterTag: {
            padding: '0.25rem 0.5rem',
            backgroundColor: '#F3F4F6',
            color: '#374151',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
        },
        actions: {
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
        },
        downloadButton: {
            padding: '0.5rem 1rem',
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s',
        },
        downloadButtonHover: {
            backgroundColor: '#2563EB',
        },
        downloadButtonDisabled: {
            backgroundColor: '#9CA3AF',
            cursor: 'not-allowed',
        },
        refreshButton: {
            padding: '0.5rem 1rem',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #D1D5DB',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontWeight: '500',
        },
        spinner: {
            width: '1rem',
            height: '1rem',
            border: '2px solid transparent',
            borderTop: '2px solid currentColor',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
        },
    };

    if (!isOpen) return null;

    return (
        <div style={styles.modal} onClick={onClose}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div style={styles.header}>
                    <h2 style={styles.title}>Download Manager</h2>
                    <button
                        style={styles.closeButton}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div style={styles.content}>
                    {loading ? (
                        <div style={styles.loadingContainer}>
                            <div style={styles.spinner}></div>
                            <p>Loading generated reports...</p>
                        </div>
                    ) : error ? (
                        <div style={styles.errorContainer}>
                            Error: {error}
                            <button
                                style={styles.refreshButton}
                                onClick={fetchGeneratedReports}
                            >
                                Retry
                            </button>
                        </div>
                    ) : generatedReports.length === 0 ? (
                        <div style={styles.emptyState}>
                            <p>No generated reports found.</p>
                            <p>Generate a report to see it here for download.</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                                    {generatedReports.length} report{generatedReports.length !== 1 ? 's' : ''} available
                                </span>
                                <button
                                    style={styles.refreshButton}
                                    onClick={fetchGeneratedReports}
                                    disabled={loading}
                                >
                                    Refresh
                                </button>
                            </div>

                            <div style={styles.reportsList}>
                                {generatedReports.map((report) => {
                                    const isExpired = new Date() > new Date(report.expires_at);
                                    const isDownloading = downloadingFiles.has(report.file_id);
                                    
                                    return (
                                        <div
                                            key={report.file_id}
                                            style={styles.reportCard}
                                            onMouseEnter={(e) => {
                                                Object.assign(e.target.style, styles.reportCardHover);
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        >
                                            <div style={styles.reportHeader}>
                                                <div>
                                                    <h3 style={styles.reportTitle}>{report.filename}</h3>
                                                    <p style={styles.reportId}>ID: {report.report_id}</p>
                                                </div>
                                                <span
                                                    style={{
                                                        ...styles.statusBadge,
                                                        ...(isExpired ? styles.statusExpired : styles.statusActive)
                                                    }}
                                                >
                                                    {isExpired ? 'Expired' : 'Available'}
                                                </span>
                                            </div>

                                            <div style={styles.reportMeta}>
                                                <div style={styles.metaItem}>
                                                    <span style={styles.metaLabel}>Generated</span>
                                                    <span style={styles.metaValue}>
                                                        {formatDate(report.generated_at)}
                                                    </span>
                                                </div>
                                                <div style={styles.metaItem}>
                                                    <span style={styles.metaLabel}>File Size</span>
                                                    <span style={styles.metaValue}>
                                                        {formatFileSize(report.file_size)}
                                                    </span>
                                                </div>
                                                <div style={styles.metaItem}>
                                                    <span style={styles.metaLabel}>Downloads</span>
                                                    <span style={styles.metaValue}>
                                                        {report.download_count}
                                                    </span>
                                                </div>
                                                <div style={styles.metaItem}>
                                                    <span style={styles.metaLabel}>Expires</span>
                                                    <span style={styles.metaValue}>
                                                        {getTimeRemaining(report.expires_at)}
                                                    </span>
                                                </div>
                                            </div>

                                            {Object.keys(report.parameters).length > 0 && (
                                                <div style={styles.parametersSection}>
                                                    <h4 style={styles.parametersTitle}>Parameters Used:</h4>
                                                    <div style={styles.parametersList}>
                                                        {Object.entries(report.parameters).map(([key, value]) => (
                                                            <span key={key} style={styles.parameterTag}>
                                                                {key}: {String(value)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div style={styles.actions}>
                                                <button
                                                    style={{
                                                        ...styles.downloadButton,
                                                        ...(isExpired || isDownloading ? styles.downloadButtonDisabled : {})
                                                    }}
                                                    onClick={() => handleDownload(report.file_id, report.filename)}
                                                    disabled={isExpired || isDownloading}
                                                    onMouseEnter={(e) => {
                                                        if (!isExpired && !isDownloading) {
                                                            Object.assign(e.target.style, styles.downloadButtonHover);
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isExpired && !isDownloading) {
                                                            e.target.style.backgroundColor = '#3B82F6';
                                                        }
                                                    }}
                                                >
                                                    {isDownloading ? (
                                                        <>
                                                            <div style={styles.spinner}></div>
                                                            Downloading...
                                                        </>
                                                    ) : isExpired ? (
                                                        'Expired'
                                                    ) : (
                                                        '↓ Download'
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

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

export default DownloadManager;