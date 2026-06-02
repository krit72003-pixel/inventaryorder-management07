import React, { useState, useEffect } from 'react'
import { API_URL } from '../App'
import { Plus, ShoppingCart, Calendar, User, Search, Trash2, ArrowLeft, Eye, EyeOff, AlertTriangle } from 'lucide-react'
function Orders({ showNotification }) {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  
  // View states
  const [isCreating, setIsCreating] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  
  // Checkout Builder State
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [cartItems, setCartItems] = useState([{ product_id: '', quantity: 1 }])
  const [checkoutErrors, setCheckoutErrors] = useState('')
  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [resOrders, resProducts, resCustomers] = await Promise.all([
        fetch(`${API_URL}/orders`),
        fetch(`${API_URL}/products`),
        fetch(`${API_URL}/customers`)
      ])
      
      if (resOrders.ok) setOrders(await resOrders.json())
      if (resProducts.ok) setProducts(await resProducts.json())
      if (resCustomers.ok) setCustomers(await resCustomers.json())
    } catch (err) {
      console.error(err)
      showNotification('Error fetching order registry databases.', 'error')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    fetchInitialData()
  }, [])
  const handleToggleExpand = (id) => {
    setExpandedOrderId(expandedOrderId === id ? null : id)
  }
  const handleAddCartRow = () => {
    setCartItems([...cartItems, { product_id: '', quantity: 1 }])
  }
  const handleRemoveCartRow = (index) => {
    const updated = [...cartItems]
    updated.splice(index, 1)
    setCartItems(updated.length > 0 ? updated : [{ product_id: '', quantity: 1 }])
  }
  const handleCartItemChange = (index, field, value) => {
    const updated = [...cartItems]
    updated[index][field] = value
    setCartItems(updated)
  }
  // Calculate cart totals live
  const calculateCartTotals = () => {
    let subtotal = 0
    let itemErrors = []
    
    cartItems.forEach((item, index) => {
      if (!item.product_id) return
      
      const prod = products.find((p) => p.id === parseInt(item.product_id))
      if (!prod) return
      
      subtotal += parseFloat(prod.price) * item.quantity
      
      // Stock warning in UI
      if (item.quantity > prod.stock) {
        itemErrors.push(`Row ${index + 1}: '${prod.name}' exceeds available stock (${prod.stock}).`)
      }
    })
    return {
      subtotal,
      hasErrors: itemErrors.length > 0,
      errorsList: itemErrors
    }
  }
  const { subtotal, hasErrors, errorsList } = calculateCartTotals()
  const handleCheckoutSubmit = async (e) => {
    e.preventDefault()
    setCheckoutErrors('')
    if (!selectedCustomerId) {
      setCheckoutErrors('Please select an active customer.')
      return
    }
    // Filter empty rows
    const validItems = cartItems.filter((item) => item.product_id !== '')
    if (validItems.length === 0) {
      setCheckoutErrors('Please add at least one valid product item.')
      return
    }
    // Check duplicate products in cart
    const prodIds = validItems.map((item) => item.product_id)
    const hasDuplicates = new Set(prodIds).size !== prodIds.length
    if (hasDuplicates) {
      setCheckoutErrors('Duplicate products found in cart. Please merge them.')
      return
    }
    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: parseInt(selectedCustomerId),
          items: validItems.map((item) => ({
            product_id: parseInt(item.product_id),
            quantity: parseInt(item.quantity)
          }))
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to complete transaction.')
      }
      showNotification(`Order #${data.id} placed successfully. Inventory has been updated!`)
      setIsCreating(false)
      // Reset checkout cart
      setSelectedCustomerId('')
      setCartItems([{ product_id: '', quantity: 1 }])
      
      // Reload everything
      fetchInitialData()
    } catch (err) {
      console.error(err)
      setCheckoutErrors(err.message)
    }
  }
  const handleCancelOrder = async (id) => {
    if (!window.confirm(`Are you sure you want to cancel Order #${id}? Stock inventory will be automatically restored.`)) return
    try {
      const res = await fetch(`${API_URL}/orders/${id}/cancel`, {
        method: 'POST'
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to cancel order.')
      }
      showNotification(`Order #${id} has been cancelled. Inventory levels restored.`)
      fetchInitialData()
    } catch (err) {
      console.error(err)
      showNotification(err.message, 'error')
    }
  }
  if (isCreating) {
    return (
      <div className="fade-in">
        <div className="header-bar">
          <div>
            <h1 className="page-title">Create Checkout Order</h1>
            <p className="subtitle">Assemble items, verify stock levels, and generate invoices.</p>
          </div>
          <button className="btn btn-secondary" onClick={() => setIsCreating(false)}>
            <ArrowLeft size={16} /> Back to Registry
          </button>
        </div>
        <form onSubmit={handleCheckoutSubmit} className="order-builder">
          {/* Cart item builder */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.5rem' }}>Select Products</h3>
            {checkoutErrors && (
              <div className="alert-banner">
                <AlertTriangle size={18} />
                <span style={{ fontSize: '0.85rem' }}>{checkoutErrors}</span>
              </div>
            )}
            {errorsList.length > 0 && (
              <div className="alert-banner" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: 'var(--warning)' }}>
                <AlertTriangle size={18} />
                <div style={{ fontSize: '0.85rem' }}>
                  {errorsList.map((err, i) => <div key={i}>{err}</div>)}
                </div>
              </div>
            )}
            <div className="order-items-list">
              {cartItems.map((item, index) => {
                const selectedProd = products.find((p) => p.id === parseInt(item.product_id))
                return (
                  <div key={index} className="order-item-row">
                    {/* Product Selection */}
                    <div>
                      <select
                        className="form-input"
                        value={item.product_id}
                        onChange={(e) => handleCartItemChange(index, 'product_id', e.target.value)}
                        required
                      >
                        <option value="">-- Choose Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) — ${parseFloat(p.price).toFixed(2)} [Stock: {p.stock}]
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Unit Price Display */}
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {selectedProd ? `$${parseFloat(selectedProd.price).toFixed(2)}` : '—'}
                    </div>
                    {/* Quantity Picker */}
                    <div>
                      <input
                        type="number"
                        min="1"
                        required
                        className="form-input"
                        value={item.quantity}
                        onChange={(e) => handleCartItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    {/* Row delete action */}
                    <div>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.5rem' }}
                        onClick={() => handleRemoveCartRow(index)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: '1.5rem' }}
              onClick={handleAddCartRow}
            >
              <Plus size={16} /> Add Another Product
            </button>
          </div>
          {/* Checkout billing/summary panel */}
          <div className="glass-card" style={{ height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.5rem' }}>Checkout Summary</h3>
            {/* Customer select */}
            <div className="form-group">
              <label className="form-label">Billing Customer *</label>
              <select
                className="form-input"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                required
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>
            {/* Price Calculations */}
            <div className="summary-box" style={{ marginTop: '2rem' }}>
              <div className="summary-row">
                <span style={{ color: 'var(--text-muted)' }}>Items Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span style={{ color: 'var(--text-muted)' }}>Tax (GST/VAT)</span>
                <span>$0.00</span>
              </div>
              <div className="summary-row">
                <span style={{ color: 'var(--text-muted)' }}>Shipping Cost</span>
                <span style={{ color: 'var(--success)' }}>FREE</span>
              </div>
              <div className="summary-row summary-total">
                <span>Grand Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '2rem', padding: '1rem' }}
              disabled={hasErrors || cartItems.some((item) => !item.product_id)}
            >
              <ShoppingCart size={18} /> Place Order
            </button>
          </div>
        </form>
      </div>
    )
  }
  return (
    <div className="fade-in">
      <div className="header-bar">
        <div>
          <h1 className="page-title">Order Registry</h1>
          <p className="subtitle">Manage transaction history, invoicing, and inventory restock approvals.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
          <Plus size={18} /> Create New Order
        </button>
      </div>
      {/* Orders List Display */}
      <div className="glass-card">
        {loading ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading registry lists...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-dim)' }}>No transaction logs available. Try placing a new order.</div>
        ) : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Date Placed</th>
                  <th>Total Cost</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const isExpanded = expandedOrderId === o.id
                  const isCancelled = o.status === 'cancelled'
                  return (
                    <React.Fragment key={o.id}>
                      <tr 
                        style={{ borderBottom: isExpanded ? 'none' : '' }}
                      >
                        <td style={{ fontWeight: 600 }}>#{o.id}</td>
                        <td>
                          <div>
                            <div style={{ fontWeight: 500 }}>{o.customer?.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{o.customer?.email}</div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', align: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                            <Calendar size={14} color="var(--text-dim)" />
                            <span>{new Date(o.created_at).toLocaleString()}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                          ${parseFloat(o.total_amount).toFixed(2)}
                        </td>
                        <td>
                          <span className={`badge ${isCancelled ? 'badge-danger' : 'badge-success'}`}>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleToggleExpand(o.id)}>
                              {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />} Details
                            </button>
                            {!isCancelled && (
                              <button className="btn btn-danger btn-sm" onClick={() => handleCancelOrder(o.id)}>
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expandable Order Items row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="6" style={{ padding: '0 1.25rem 1.15rem 1.25rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                              <h5 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                                Order Items Breakdown
                              </h5>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {o.items?.map((item) => (
                                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px dashed rgba(255,255,255,0.03)', paddingBottom: '0.25rem' }}>
                                    <div>
                                      <span style={{ fontWeight: 500 }}>{item.product?.name}</span>
                                      <code style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>({item.product?.sku})</code>
                                    </div>
                                    <div style={{ color: 'var(--text-muted)' }}>
                                      x{item.quantity} @ ${parseFloat(item.price_at_purchase).toFixed(2)} each &mdash; 
                                      <span style={{ fontWeight: 600, color: 'var(--text-main)', marginLeft: '0.5rem' }}>
                                        ${(parseFloat(item.price_at_purchase) * item.quantity).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
export default Orders
