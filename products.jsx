import React, { useState, useEffect } from 'react'
import { API_URL } from '../App'
import { Plus, Search, Edit2, Trash2, AlertTriangle, X } from 'lucide-react'
function Products({ showNotification }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  
  // Forms state
  const [formData, setFormData] = useState({ name: '', sku: '', price: '', stock: '', description: '' })
  const [editingId, setEditingId] = useState(null)
  const [formErrors, setFormErrors] = useState('')
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/products`)
      if (!res.ok) throw new Error('Could not retrieve product list.')
      const data = await res.json()
      setProducts(data)
    } catch (err) {
      console.error(err)
      showNotification('Error fetching product catalog', 'error')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    fetchProducts()
  }, [])
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }
  const handleOpenCreateModal = () => {
    setFormData({ name: '', sku: '', price: '', stock: '0', description: '' })
    setFormErrors('')
    setIsCreateModalOpen(true)
  }
  const handleOpenEditModal = (product) => {
    setEditingId(product.id)
    setFormData({
      name: product.name,
      sku: product.sku,
      price: product.price,
      stock: product.stock,
      description: product.description || ''
    })
    setFormErrors('')
    setIsEditModalOpen(true)
  }
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setFormErrors('')
    
    // Simple frontend validation
    if (!formData.name.trim() || !formData.sku.trim() || !formData.price) {
      setFormErrors('Please populate all mandatory fields.')
      return
    }
    try {
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock)
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create product.')
      }
      showNotification(`Product '${data.name}' added successfully.`)
      setIsCreateModalOpen(false)
      fetchProducts()
    } catch (err) {
      console.error(err)
      setFormErrors(err.message)
    }
  }
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setFormErrors('')
    try {
      const res = await fetch(`${API_URL}/products/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock)
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update product.')
      }
      showNotification(`Product '${data.name}' updated successfully.`)
      setIsEditModalOpen(false)
      fetchProducts()
    } catch (err) {
      console.error(err)
      setFormErrors(err.message)
    }
  }
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete '${name}'? This cannot be undone.`)) return
    try {
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to delete product.')
      }
      showNotification(`Product '${name}' deleted successfully.`)
      fetchProducts()
    } catch (err) {
      console.error(err)
      showNotification(err.message, 'error')
    }
  }
  // Filter products based on search term
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  )
  return (
    <div className="fade-in">
      <div className="header-bar">
        <div>
          <h1 className="page-title">Catalog Inventory</h1>
          <p className="subtitle">Configure products, stock configurations, and SKUs.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={18} /> Add Catalog Product
        </button>
      </div>
      {/* Actions and Search Filter */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="actions-header" style={{ marginBottom: 0 }}>
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search SKU or Product Name..."
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing {filteredProducts.length} of {products.length} Products
          </div>
        </div>
      </div>
      {/* Products Table Display */}
      <div className="glass-card">
        {loading ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Fetching catalog products...</div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-dim)' }}>No products found matching filters.</div>
        ) : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>SKU</th>
                  <th>Unit Price</th>
                  <th>Stock Count</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isLowStock = p.stock <= 5
                  const isOutOfStock = p.stock === 0
                  return (
                    <tr key={p.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '1rem' }}>{p.name}</div>
                          {p.description && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <code>{p.sku}</code>
                      </td>
                      <td style={{ fontWeight: 600 }}>${parseFloat(p.price).toFixed(2)}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: isOutOfStock ? 'var(--danger)' : isLowStock ? 'var(--warning)' : 'var(--text-main)' }}>
                          {p.stock} units
                        </span>
                      </td>
                      <td>
                        {isOutOfStock ? (
                          <span className="badge badge-danger">Out of Stock</span>
                        ) : isLowStock ? (
                          <span className="badge badge-warning">Low Stock</span>
                        ) : (
                          <span className="badge badge-success">Available</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEditModal(p)} title="Edit details">
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id, p.name)} title="Remove Product">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* --- CREATE MODAL --- */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <div className="modal-header">
              <h3 className="modal-title">New Catalog Product</h3>
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
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Mechanical Keyboard"
                  className="form-input"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unique SKU Code *</label>
                <input
                  type="text"
                  name="sku"
                  required
                  placeholder="e.g. KB-MECH-001"
                  className="form-input"
                  value={formData.sku}
                  onChange={handleInputChange}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Unit Price ($) *</label>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="99.99"
                    className="form-input"
                    value={formData.price}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Stock Count *</label>
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    required
                    placeholder="50"
                    className="form-input"
                    value={formData.stock}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  placeholder="Write a description for the product..."
                  className="form-input"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Product
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
              <h3 className="modal-title">Edit Product Details</h3>
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
                <label className="form-label">Product Name *</label>
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
                <label className="form-label">SKU Code (Read Only)</label>
                <input
                  type="text"
                  name="sku"
                  disabled
                  className="form-input"
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                  value={formData.sku}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Unit Price ($) *</label>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    min="0.01"
                    required
                    className="form-input"
                    value={formData.price}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Current Stock *</label>
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    required
                    className="form-input"
                    value={formData.stock}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-input"
                  value={formData.description}
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
export default Products
