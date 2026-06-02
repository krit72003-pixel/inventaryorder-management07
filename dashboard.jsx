import React, { useState, useEffect } from 'react'
import { API_URL } from '../App'
import { TrendingUp, ShoppingBag, Package, Users, AlertTriangle, ArrowRight, Plus } from 'lucide-react'
function Dashboard({ setActiveTab, showNotification }) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/metrics`)
      if (!res.ok) throw new Error('Failed to retrieve system metrics.')
      const data = await res.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      console.error(err)
      setError('Could not connect to the backend server. Make sure the database and API are running.')
      showNotification('Error loading dashboard data', 'error')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    fetchMetrics()
  }, [])
  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <span style={{ color: 'var(--text-muted)' }}>Loading analytics dashboard...</span>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }
  if (error) {
    return (
      <div className="fade-in glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem' }}>
        <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
        <h3 style={{ marginBottom: '0.5rem' }}>Connection Failed</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '400px' }}>{error}</p>
        <button className="btn btn-primary" onClick={fetchMetrics}>
          Retry Connection
        </button>
      </div>
    )
  }
  return (
    <div className="fade-in">
      <div className="header-bar">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="subtitle">Real-time inventory thresholds, operations status, and sales charts.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchMetrics}>
            Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('orders')}>
            <Plus size={16} /> New Order
          </button>
        </div>
      </div>
      {/* Analytics Cards */}
      <div className="metrics-grid">
        <div className="glass-card metric-card" style={{ '--card-accent': 'var(--primary)' }}>
          <div className="metric-header">
            <span>Total Revenue</span>
            <div className="metric-icon-box">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="metric-value">
            ${parseFloat(metrics?.total_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="glass-card metric-card" style={{ '--card-accent': 'var(--secondary)' }}>
          <div className="metric-header">
            <span>Orders Completed</span>
            <div className="metric-icon-box">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div className="metric-value">{metrics?.total_orders}</div>
        </div>
        <div className="glass-card metric-card" style={{ '--card-accent': 'var(--success)' }}>
          <div className="metric-header">
            <span>Total Catalog</span>
            <div className="metric-icon-box">
              <Package size={16} />
            </div>
          </div>
          <div className="metric-value">{metrics?.total_products}</div>
        </div>
        <div className="glass-card metric-card" style={{ '--card-accent': '#ec4899' }}>
          <div className="metric-header">
            <span>Active Customers</span>
            <div className="metric-icon-box">
              <Users size={16} />
            </div>
          </div>
          <div className="metric-value">{metrics?.total_customers}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        {/* Low Stock Watchlist */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '1.5rem', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Low Stock Alert</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Products requiring immediate replenishment (Stock &le; 5)</p>
            </div>
            {metrics?.low_stock_count > 0 && (
              <span className="badge badge-danger">
                {metrics?.low_stock_count} Alert{metrics?.low_stock_count > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {metrics?.low_stock_items?.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', color: 'var(--text-dim)' }}>
              <Package size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <span>All catalog products are healthy. No replenishment needed.</span>
            </div>
          ) : (
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Stock</th>
                    <th>Replenish</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics?.low_stock_items?.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td><code>{item.sku}</code></td>
                      <td>
                        <span style={{ color: item.stock === 0 ? 'var(--danger)' : 'var(--warning)', fontWeight: 700 }}>
                          {item.stock} left
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('products')} style={{ padding: '0.25rem 0.6rem' }}>
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Quick Operations Shortcuts */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.5rem' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div 
                className="nav-item" 
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', justifyContent: 'space-between' }}
                onClick={() => setActiveTab('orders')}
              >
                <div style={{ display: 'flex', align: 'center', gap: '0.75rem' }}>
                  <ShoppingBag size={18} color="var(--primary-light)" />
                  <span>Create Checkout Order</span>
                </div>
                <ArrowRight size={16} />
              </div>
              <div 
                className="nav-item" 
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', justifyContent: 'space-between' }}
                onClick={() => setActiveTab('products')}
              >
                <div style={{ display: 'flex', align: 'center', gap: '0.75rem' }}>
                  <Package size={18} color="var(--secondary)" />
                  <span>Add Product Catalog Item</span>
                </div>
                <ArrowRight size={16} />
              </div>
              <div 
                className="nav-item" 
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', justifyContent: 'space-between' }}
                onClick={() => setActiveTab('customers')}
              >
                <div style={{ display: 'flex', align: 'center', gap: '0.75rem' }}>
                  <Users size={18} color="var(--success)" />
                  <span>Onboard New Customer</span>
                </div>
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px dashed var(--primary-glow)', padding: '1rem', borderRadius: '10px', marginTop: '1.5rem', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--primary-light)', display: 'block', marginBottom: '0.25rem' }}>Database Active:</span>
            Connection is established. Stock levels will adjust automatically on customer purchases.
          </div>
        </div>
      </div>
    </div>
  )
}
export default Dashboard
