import React, { useState, useEffect } from 'react';
import { Search, Plus, Users, Phone, Mail, Eye, X, UserPlus } from 'lucide-react';

const FamilyManagement = () => {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isEditingFamily, setIsEditingFamily] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [availableMembers, setAvailableMembers] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const fetchFamilies = async (page = 1, search = '', status = 'All') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        status,
        sort_by: 'family_name',
        sort_order: 'asc'
      });

      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/families?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch families');

      const data = await response.json();
      setFamilies(data.families || []);
    } catch (err) {
      setError('Failed to load families: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilies(1, searchTerm, statusFilter);
  }, [searchTerm, statusFilter]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const handleViewDetails = (family) => {
    setSelectedFamily(family);
    setShowDetails(true);
    fetchFamilyMembers(family.family_id);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedFamily(null);
    setIsEditingFamily(false);
    setEditFormData({});
    setShowMemberSearch(false);
    setMemberSearchTerm('');
    setAvailableMembers([]);
    setFamilyMembers([]);
  };

  const handleEditFamily = (family) => {
    setEditFormData({
      family_name: family.family_name || '',
      primary_contact_email: family.primary_contact_email || '',
      primary_contact_phone: family.primary_contact_phone || '',
      address: family.address || '',
      status: family.status || 'Active'
    });
    setIsEditingFamily(true);
  };

  const handleSaveFamily = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/families/${selectedFamily.family_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });

      if (!response.ok) throw new Error('Failed to update family');

      // Update the family in the local state
      setFamilies(families.map(family => 
        family.family_id === selectedFamily.family_id 
          ? { ...family, ...editFormData }
          : family
      ));

      // Update the selected family
      setSelectedFamily({ ...selectedFamily, ...editFormData });
      setIsEditingFamily(false);
      setError('');
    } catch (err) {
      setError('Failed to update family: ' + err.message);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingFamily(false);
    setEditFormData({});
  };

  const handleFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Member management functions
  const fetchAvailableMembers = async (search = '') => {
    try {
      setLoadingMembers(true);
      const params = new URLSearchParams({
        search,
        limit: '20',
        exclude_family_id: selectedFamily?.family_id || ''
      });

      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/members?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch members');

      const data = await response.json();
      setAvailableMembers(data.members || []);
    } catch (err) {
      setError('Failed to load members: ' + err.message);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchFamilyMembers = async (familyId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/families/${familyId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch family members');

      const data = await response.json();
      setFamilyMembers(data.members || []);
    } catch (err) {
      setError('Failed to load family members: ' + err.message);
    }
  };

  const addMemberToFamily = async (memberId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/families/${selectedFamily.family_id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ member_id: memberId })
      });

      if (!response.ok) throw new Error('Failed to add member to family');

      // Refresh family members and available members
      await fetchFamilyMembers(selectedFamily.family_id);
      await fetchAvailableMembers(memberSearchTerm);
      
      // Update family count in the main list
      setFamilies(families.map(family => 
        family.family_id === selectedFamily.family_id 
          ? { ...family, member_count: (family.member_count || 0) + 1 }
          : family
      ));

      setError('');
    } catch (err) {
      setError('Failed to add member: ' + err.message);
    }
  };

  const removeMemberFromFamily = async (memberId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/families/${selectedFamily.family_id}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to remove member from family');

      // Refresh family members
      await fetchFamilyMembers(selectedFamily.family_id);
      
      // Update family count in the main list
      setFamilies(families.map(family => 
        family.family_id === selectedFamily.family_id 
          ? { ...family, member_count: Math.max((family.member_count || 1) - 1, 0) }
          : family
      ));

      setError('');
    } catch (err) {
      setError('Failed to remove member: ' + err.message);
    }
  };

  const handleShowMemberSearch = () => {
    setShowMemberSearch(true);
    fetchAvailableMembers();
  };

  const handleMemberSearchChange = (e) => {
    const value = e.target.value;
    setMemberSearchTerm(value);
    fetchAvailableMembers(value);
  };

  const FamilyCard = ({ family }) => (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
      padding: '24px',
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px'
      }}>
        <div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '4px'
          }}>
            {family.family_name}
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Family ID: {family.family_id}
          </p>
        </div>
        <span style={{
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500',
          backgroundColor: family.status === 'Active' ? '#d1fae5' : '#fee2e2',
          color: family.status === 'Active' ? '#065f46' : '#991b1b'
        }}>
          {family.status}
        </span>
      </div>

      <div style={{ marginBottom: '16px' }}>
        {family.primary_contact_email && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '8px'
          }}>
            <Mail size={16} style={{ marginRight: '8px' }} />
            {family.primary_contact_email}
          </div>
        )}
        
        {family.primary_contact_phone && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '8px'
          }}>
            <Phone size={16} style={{ marginRight: '8px' }} />
            {family.primary_contact_phone}
          </div>
        )}
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          <Users size={16} style={{ marginRight: '8px' }} />
          {family.member_count || 0} members ({family.children_count || 0} children)
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#1d4ed8',
            backgroundColor: '#dbeafe',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#bfdbfe'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#dbeafe'}
          onClick={() => handleViewDetails(family)}
        >
          <Eye size={16} style={{ marginRight: '4px' }} />
          View Details
        </button>
      </div>
    </div>
  );

  // Family Details Modal Component
  const FamilyDetailsModal = ({ family, isOpen, onClose }) => {
    if (!isOpen || !family) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              {isEditingFamily ? 'Edit Family' : family.family_name}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px',
                borderRadius: '4px'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              ×
            </button>
          </div>

          {isEditingFamily ? (
            // Edit Form
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Family Name
                </label>
                <input
                  type="text"
                  value={editFormData.family_name || ''}
                  onChange={(e) => handleFormChange('family_name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Primary Contact Email
                </label>
                <input
                  type="email"
                  value={editFormData.primary_contact_email || ''}
                  onChange={(e) => handleFormChange('primary_contact_email', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Primary Contact Phone
                </label>
                <input
                  type="tel"
                  value={editFormData.primary_contact_phone || ''}
                  onChange={(e) => handleFormChange('primary_contact_phone', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Address
                </label>
                <textarea
                  value={editFormData.address || ''}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Status
                </label>
                <select
                  value={editFormData.status || 'Active'}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          ) : (
            // Details View
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#111827',
                  marginBottom: '8px'
                }}>
                  Family Information
                </h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{
                    display: 'flex',
                    padding: '8px 0',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <span style={{ fontWeight: '500', width: '120px', color: '#374151' }}>Family ID:</span>
                    <span style={{ color: '#6b7280' }}>{family.family_id}</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    padding: '8px 0',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <span style={{ fontWeight: '500', width: '120px', color: '#374151' }}>Status:</span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: family.status === 'Active' ? '#d1fae5' : '#fee2e2',
                      color: family.status === 'Active' ? '#065f46' : '#991b1b'
                    }}>
                      {family.status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#111827',
                  marginBottom: '8px'
                }}>
                  Contact Information
                </h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {family.primary_contact_email && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <Mail size={16} style={{ marginRight: '8px', color: '#6b7280' }} />
                      <span style={{ color: '#374151' }}>{family.primary_contact_email}</span>
                    </div>
                  )}
                  {family.primary_contact_phone && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <Phone size={16} style={{ marginRight: '8px', color: '#6b7280' }} />
                      <span style={{ color: '#374151' }}>{family.primary_contact_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#111827',
                    margin: 0
                  }}>
                    Family Members
                  </h3>
                  <button
                    onClick={handleShowMemberSearch}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
                  >
                    <UserPlus size={14} />
                    Add Member
                  </button>
                </div>

                {/* Current Family Members */}
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  {familyMembers.length > 0 ? (
                    familyMembers.map((member, index) => (
                      <div key={member.member_id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white',
                        borderBottom: index < familyMembers.length - 1 ? '1px solid #e5e7eb' : 'none'
                      }}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#111827' }}>
                            {member.first_name} {member.last_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {member.email} • {member.phone || 'No phone'}
                          </div>
                        </div>
                        <button
                          onClick={() => removeMemberFromFamily(member.member_id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px 8px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
                          onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: '#6b7280',
                      backgroundColor: '#f9fafb'
                    }}>
                      <Users size={24} style={{ margin: '0 auto 8px', color: '#d1d5db' }} />
                      <div style={{ fontSize: '14px' }}>No members in this family yet</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "Add Member" to get started</div>
                    </div>
                  )}
                </div>

                {/* Member Search Modal */}
                {showMemberSearch && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1001
                  }}>
                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      padding: '20px',
                      maxWidth: '500px',
                      width: '90%',
                      maxHeight: '70vh',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px'
                      }}>
                        <h3 style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#111827',
                          margin: 0
                        }}>
                          Add Member to Family
                        </h3>
                        <button
                          onClick={() => setShowMemberSearch(false)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            color: '#6b7280',
                            padding: '4px'
                          }}
                        >
                          ×
                        </button>
                      </div>

                      <div style={{ position: 'relative', marginBottom: '16px' }}>
                        <Search 
                          size={16} 
                          style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9ca3af'
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Search members by name or email..."
                          value={memberSearchTerm}
                          onChange={handleMemberSearchChange}
                          style={{
                            width: '100%',
                            padding: '10px 16px 10px 40px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>

                      <div style={{
                        flex: 1,
                        overflow: 'auto',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}>
                        {loadingMembers ? (
                          <div style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: '#6b7280'
                          }}>
                            Loading members...
                          </div>
                        ) : availableMembers.length > 0 ? (
                          availableMembers.map((member, index) => (
                            <div key={member.member_id} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px',
                              backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white',
                              borderBottom: index < availableMembers.length - 1 ? '1px solid #e5e7eb' : 'none'
                            }}>
                              <div>
                                <div style={{ fontWeight: '500', color: '#111827' }}>
                                  {member.first_name} {member.last_name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                  {member.email}
                                </div>
                              </div>
                              <button
                                onClick={() => addMemberToFamily(member.member_id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 10px',
                                  backgroundColor: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
                              >
                                <Plus size={12} />
                                Add
                              </button>
                            </div>
                          ))
                        ) : (
                          <div style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: '#6b7280'
                          }}>
                            {memberSearchTerm ? 
                              `No members found matching "${memberSearchTerm}"` : 
                              'No available members to add'
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {family.address && (
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '8px'
                  }}>
                    Address
                  </h3>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    color: '#374151'
                  }}>
                    {family.address}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{
            marginTop: '24px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            {isEditingFamily ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#f9fafb'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFamily}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
                >
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#f9fafb'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                >
                  Close
                </button>
                <button
                  onClick={() => handleEditFamily(family)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
                >
                  Edit Family
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f9fafb',
      minHeight: '600px'
    },
    header: {
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '8px'
    },
    subtitle: {
      fontSize: '16px',
      color: '#6b7280'
    },
    filters: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    },
    searchInput: {
      width: '100%',
      padding: '12px 16px 12px 40px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none'
    },
    select: {
      padding: '12px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: 'white',
      fontSize: '14px',
      outline: 'none'
    },
    addButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 20px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '20px'
    },
    loading: {
      textAlign: 'center',
      padding: '40px',
      color: '#6b7280',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    error: {
      padding: '16px',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '6px',
      color: '#dc2626',
      marginBottom: '20px'
    },
    empty: {
      textAlign: 'center',
      padding: '40px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      color: '#6b7280'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Family Management</h1>
        <p style={styles.subtitle}>
          Manage family records and relationships for all students
        </p>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          alignItems: 'center', 
          flexWrap: 'wrap' 
        }}>
          <div style={{ flex: '2', minWidth: '300px', position: 'relative' }}>
            <Search 
              size={16} 
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }}
            />
            <input
              type="text"
              placeholder="Search families by name, ID, or contact..."
              value={searchTerm}
              onChange={handleSearch}
              style={styles.searchInput}
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              style={styles.select}
            >
              <option value="All">All Families</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <button
            style={styles.addButton}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            <Plus size={16} />
            New Family
          </button>
        </div>
      </div>

      {/* Content */}
      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>
          <div>Loading families...</div>
        </div>
      ) : families.length > 0 ? (
        <div style={styles.grid}>
          {families.map((family) => (
            <FamilyCard key={family.family_id} family={family} />
          ))}
        </div>
      ) : (
        <div style={styles.empty}>
          <Users size={48} style={{ margin: '0 auto 16px', color: '#d1d5db' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
            No families found
          </h3>
          <p style={{ marginBottom: '16px' }}>
            {searchTerm ? 
              `No families found matching "${searchTerm}"` : 
              'Get started by creating your first family record.'
            }
          </p>
          <button
            style={{
              ...styles.addButton,
              margin: '0 auto'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            <Plus size={16} />
            Create First Family
          </button>
        </div>
      )}
      
      {/* Family Details Modal */}
      <FamilyDetailsModal 
        family={selectedFamily}
        isOpen={showDetails}
        onClose={handleCloseDetails}
      />
    </div>
  );
};

export default FamilyManagement;
