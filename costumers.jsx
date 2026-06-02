import React, { useState, useEffect } from 'react'
import { API_URL } from '../App'
import { Plus, Search, Edit2, Trash2, Mail, Phone, MapPin, X, AlertTriangle } from 'lucide-react'
function Customers({ showNotification }) {
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal & Detailed view state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  
  // Forms state
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' })
  const [editingId, setEditingId] = useState(null)
  const [formErrors, setFormErrors] = useState('')
  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/customers`)
      if (!res.ok) throw new Error('Could not retrieve customer database.')
      const data = await res.json()
      setCustomers(data)
    } catch (err) {
      console.error(err)
      showNotification('Error fetching customers', 'error')
    } finally {
      setLoading(false)
    }
  }
  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (err) {
      console.error('Error loading order history contexts:', err)
    }
  }
  useEffect(() => {
    fetchCustomers()
    fetchOrders()
  }, [])
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }
  const handleOpenCreateModal = () => {
    setFormData({ name: '', email: '', phone: '', address: '' })
    setFormErrors('')
    setIsCreateModalOpen(true)
  }
  const handleOpenEditModal = (e, customer) => {
    e.stopPropagation() // Prevent opening customer details drawer
    setEditingId(customer.id)
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address || ''
    })
    setFormErrors('')
    setIsEditModalOpen(true)
  }
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setFormErrors('')
    if (!formData.name.trim() || !formData.email.trim()) {
      setFormErrors('Name and Email are mandatory fields.')
      return
    }
    try {
      const res = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to onboard customer.')
      }
      showNotification(`Customer '${data.name}' onboarded successfully.`)
      setIsCreateModalOpen(false)
      fetchCustomers()
    } catch (err) {
      console.error(err)
      setFormErrors(err.message)
    }
  }
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setFormErrors('')
    try {
      const res = await fetch(`${API_URL}/customers/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update customer details.')
      }
      showNotification(`Customer profile for '${data.name}' updated.`)
      setIsEditModalOpen(false)
      if (selectedCustomer?.id === editingId) {
        setSelectedCustomer(data)
      }
      fetchCustomers()
    } catch (err) {
      console.error(err)
      setFormErrors(err.message)
    }
  }
  const handleDelete = async (e, id, name) => {
    e.stopPropagation() // Prevent opening drawer
    if (!window.confirm(`Are you sure you want to remove customer '${name}'? This will delete all their historical orders.`)) return
    try {
      const res = await fetch(`${API_URL}/customers/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to delete customer.')
      }
      showNotification(`Customer '${name}' and associated history deleted.`)
      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null)
      }
      fetchCustomers()
      fetchOrders() // Refresh orders as some are deleted via cascade
    } catch (err) {
      console.error(err)
      showNotification(err.message, 'error')
    }
  }
  // Filter customers by search term
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  )
  // Get orders of the selected customer
  const customerOrders = orders.filter((o) => o.customer_id === selectedCustomer?.id)
  return (
    <div className="fade-in">
      <div className="header-bar">
        <div>
          <h1 className="page-title">Customer Database</h1>
          <p className="subtitle">Manage user records, profiles, and purchase frequencies.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={18} /> Add New Customer
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: selectedCustomer ? '1.2fr 1fr' : '1fr', gap: '2rem', transition: 'all 0.3s ease' }}>
        {/* Customer Directory */}
        <div className="glass-card">
          <div className="actions-header">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search by name or email..."
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Total Records: {filteredCustomers.length}
            </div>
          </div>
          {loading ? (
            <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Querying customer table...</div>
          ) : filteredCustomers.length === 0 ? (
            <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-dim)' }}>No customers matching filters.</div>
          ) : (
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Email Address</th>
                    <th>Phone</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => setSelectedCustomer(c)} 
                      style={{ cursor: 'pointer', background: selectedCustomer?.id === c.id ? 'rgba(139, 92, 246, 0.08)' : '' }}
                    >
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td><code>{c.email}</code></td>
                      <td>{c.phone || <span style={{ color: 'var(--text-dim)' }}>&mdash;</span>}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary btn-sm" onClick={(e) => handleOpenEditModal(e, c)} title="Edit profile">
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(e, c.id, c.name)} title="Remove customer">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Customer Details Drawer / Sidebar Panel */}
        {selectedCustomer && (
          <div className="glass-card fade-in" style={{ borderLeft: '3px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Profile Details</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registered on {new Date(selectedCustomer.created_at).toLocaleDateString()}</span>
              </div>
              <button className="modal-close" onClick={() => setSelectedCustomer(null)}>
                <X size={20} />
              </button>
            </div>
            {/* Profile Fields Card */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', align: 'center', gap: '0.5rem' }}>
                <Users size={16} color="var(--primary-light)" />
                <span style={{ fontWeight: 600 }}>{selectedCustomer.name}</span>
              </div>
              <div style={{ display: 'flex', align: 'center', gap: '0.5rem' }}>
                <Mail size={16} color="var(--text-muted)" />
                <span>{selectedCustomer.email}</span>
              </div>
              <div style={{ display: 'flex', align: 'center', gap: '0.5rem' }}>
                <Phone size={16} color="var(--text-muted)" />
                <span>{selectedCustomer.phone || <em style={{ color: 'var(--text-dim)' }}>No phone number</em>}</span>
              </div>
              <div style={{ display: 'flex', align: 'center', gap: '0.5rem' }}>
                <MapPin size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <span>{selectedCustomer.address || <em style={{ color: 'var(--text-dim)' }}>No registered address</em>}</span>
              </div>
            </div>
            {/* Customer Purchase Logs */}
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Purchase Order Log ({customerOrders.length})
            </h4>
            {customerOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                This customer has not placed any orders yet.
              </div>
            ) : (
              <div className="customer-history-grid" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {customerOrders.map((o) => (
                  <div 
                    key={o.id} 
                    style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Order #{o.id}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(o.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`badge ${o.status === 'cancelled' ? 'badge-danger' : 'badge-success'}`}>
                        {o.status}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                        ${parseFloat(o.total_amount).toFixed(2)}
                      </span>
                    </div>
                    {/* Order details items list */}
                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.5rem', color: 'var(--text-muted)' }}>
                      {o.items?.map((item) => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                          <span>{item.product?.name} x{item.quantity}</span>
                          <span>${(parseFloat(item.price_at_purchase) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {/* --- CREATE MODAL --- */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <div className="modal-header">
              <h3 className="modal-title">New Customer Profile</h3>
              <button className="modal-close" onClick={() => setIsCreateModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit}>
              {formErrors && (
                <div className="alert-banner">
                  <AlertTriangle size={18} />
                  <span style={{ fontSize: '0.85rem' }}>{formErrors}</span>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  className="form-input"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="e.g. sarah.j@company.com"
                  className="form-input"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="e.g. +1 555-0199"
                  className="form-input"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Billing Address</label>
                <input
                  type="text"
                  name="address"
                  placeholder="e.g. 123 Pine St, Seattle, WA"
                  className="form-input"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- EDIT MODAL --- */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Customer Profile</h3>
              <button className="modal-close" onClick={() => setIsEditModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit}>
              {formErrors && (
                <div className="alert-banner">
                  <AlertTriangle size={18} />
                  <span style={{ fontSize: '0.85rem' }}>{formErrors}</span>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="form-input"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address (Read Only)</label>
                <input
                  type="email"
                  name="email"
                  disabled
                  className="form-input"
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                  value={formData.email}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  className="form-input"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Billing/Shipping Address</label>
                <input
                  type="text"
                  name="address"
                  className="form-input"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default Customers
