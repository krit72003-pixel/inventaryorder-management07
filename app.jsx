import React, { useState, useEffect } from 'react'
import { LayoutDashboard, ShoppingCart, Users, Package, AlertCircle } from 'lucide-react'
import Dashboard from './components/Dashboard'
import Products from './components/Products'
import Customers from './components/Customers'
import Orders from './components/Orders'
// Determine the API base URL dynamically
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [notification, setNotification] = useState(null)
  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
  }
  // Render components dynamically based on state
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} showNotification={showNotification} />
      case 'products':
        return <Products showNotification={showNotification} />
      case 'customers':
        return <Customers showNotification={showNotification} />
      case 'orders':
        return <Orders showNotification={showNotification} />
      default:
        return <Dashboard setActiveTab={setActiveTab} showNotification={showNotification} />
    }
  }
  return (
    <div className="app-container">
      {/* Toast Notification */}
      {notification && (
        <div 
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 9999,
            backgroundColor: notification.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
            color: '#fff',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            align: 'center',
            gap: '0.75rem',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          <AlertCircle size={20} />
          <span style={{ fontWeight: 600 }}>{notification.message}</span>
        </div>
      )}
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">
            <Package size={24} color="#fff" />
          </div>
          <span className="logo-text">StockFlow</span>
          <span className="logo-tag">v1.0</span>
        </div>
        <nav>
          <ul className="nav-links">
            <li>
              <div 
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </div>
            </li>
            <li>
              <div 
                className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
                onClick={() => setActiveTab('products')}
              >
                <Package size={20} />
                <span>Products</span>
              </div>
            </li>
            <li>
              <div 
                className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
                onClick={() => setActiveTab('customers')}
              >
                <Users size={20} />
                <span>Customers</span>
              </div>
            </li>
            <li>
              <div 
                className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                <ShoppingCart size={20} />
                <span>Orders</span>
              </div>
            </li>
          </ul>
        </nav>
        <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center' }}>
          Assessment Project &copy; 2026
        </div>
      </aside>
      {/* Main Content Area */}
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  )
}
export default App
