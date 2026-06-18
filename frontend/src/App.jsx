import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import './App.css';

const COUNTRIES = [
  { name: 'Iran', code: '+98', flag: '🇮🇷', placeholder: '912 345 6789' },
  { name: 'Turkey', code: '+90', flag: '🇹🇷', placeholder: '505 123 4567' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', placeholder: '7123 456789' },
  { name: 'Germany', code: '+49', flag: '🇩🇪', placeholder: '151 2345 6789' },
  { name: 'France', code: '+33', flag: '🇫🇷', placeholder: '6 1234 5678' },
  { name: 'Iraq', code: '+964', flag: '🇮🇶', placeholder: '770 123 4567' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪', placeholder: '50 123 4567' },
  { name: 'Other', code: '+', flag: '🌐', placeholder: 'Country code and phone number' }
];

function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
  const [authTab, setAuthTab] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authSuccess, setAuthSuccess] = useState(null);
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('username') || 'User');

  // Contacts & Categories State
  const [contacts, setContacts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Filters State
  const [filterName, setFilterName] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterEmail, setFilterEmail] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState('+98');
  const [localPhone, setLocalPhone] = useState('');

  // Form State
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    category_id: ''
  });

  // Fetch Data
  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const activeFilters = {
        name: filterName,
        city: filterCity,
        phone: filterPhone,
        email: filterEmail,
        category_id: selectedCategoryId
      };

      const [contactsData, categoriesData] = await Promise.all([
        api.getContacts(activeFilters),
        api.getCategories()
      ]);

      setContacts(contactsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err.message || 'Failed to fetch data.');
      // If token expired / invalid
      if (!api.isAuthenticated()) {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, filterName, filterCity, filterPhone, filterEmail, selectedCategoryId]);

  // Trigger fetch when authentication state, category, or search filters change
  useEffect(() => {
    // Debounce searches to prevent rapid backend hammering
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchData]);

  // Auth Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!authUsername || !authPassword) {
      setAuthError('Please fill in all fields.');
      return;
    }

    try {
      await api.login(authUsername, authPassword);
      localStorage.setItem('username', authUsername);
      setCurrentUser(authUsername);
      setIsAuthenticated(true);
      setAuthUsername('');
      setAuthPassword('');
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please verify credentials.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!authUsername || !authPassword) {
      setAuthError('Please fill in all fields.');
      return;
    }

    try {
      await api.register(authUsername, authPassword);
      setAuthSuccess('Registration successful! Please log in below.');
      setAuthTab('login');
      setAuthPassword('');
    } catch (err) {
      setAuthError(err.message || 'Registration failed. Username might be taken.');
    }
  };

  const handleLogout = () => {
    api.logout();
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setContacts([]);
    setCategories([]);
    setSelectedCategoryId(null);
  };

  // Contact CRUD Handlers
  const openAddModal = () => {
    setEditingContact(null);
    setContactForm({
      name: '',
      phone: '',
      email: '',
      city: '',
      category_id: ''
    });
    setSelectedCountryCode('+98');
    setLocalPhone('');
    setError(null);
    setShowContactModal(true);
  };

  const openEditModal = (contact) => {
    setEditingContact(contact);
    setContactForm({
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      city: contact.city,
      category_id: contact.category_id || ''
    });
    
    // Parse contact.phone (e.g. "+989121191626") into country code and local number
    const matchedCountry = COUNTRIES
      .filter(c => c.code !== '+')
      .sort((a, b) => b.code.length - a.code.length)
      .find(c => contact.phone.startsWith(c.code));
      
    if (matchedCountry) {
      setSelectedCountryCode(matchedCountry.code);
      setLocalPhone(contact.phone.slice(matchedCountry.code.length));
    } else if (contact.phone.startsWith('+')) {
      setSelectedCountryCode('+');
      setLocalPhone(contact.phone.slice(1));
    } else {
      setSelectedCountryCode('+98');
      setLocalPhone(contact.phone);
    }
    
    setError(null);
    setShowContactModal(true);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!contactForm.name || !localPhone || !contactForm.email || !contactForm.city) {
      setError('Please fill in all required fields.');
      return;
    }

    let cleanLocalPhone = localPhone.trim().replace(/\s+/g, '');
    // Strip leading zero if a specific country code is selected (not generic '+')
    if (selectedCountryCode !== '+' && cleanLocalPhone.startsWith('0')) {
      cleanLocalPhone = cleanLocalPhone.slice(1);
    }
    
    const fullPhone = selectedCountryCode + cleanLocalPhone;

    if (selectedCountryCode === '+' && !fullPhone.startsWith('+')) {
      setError('Phone number must start with a + followed by the country code.');
      return;
    }

    const payload = {
      name: contactForm.name,
      phone: fullPhone,
      email: contactForm.email,
      city: contactForm.city,
      category_id: contactForm.category_id ? parseInt(contactForm.category_id) : null
    };

    try {
      if (editingContact) {
        await api.updateContact(editingContact.id, payload);
        showToast('Contact updated successfully!');
      } else {
        await api.createContact(payload);
        showToast('Contact added successfully!');
      }
      setShowContactModal(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to save contact.');
    }
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    setError(null);
    try {
      await api.deleteContact(id);
      showToast('Contact deleted successfully!');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete contact.');
    }
  };

  const handleToggleFavorite = async (id) => {
    try {
      await api.toggleFavorite(id);
      // Fast updates: toggle favorite locally to prevent flicker before refetch completes
      setContacts(prev => prev.map(c => c.id === id ? { ...c, is_favorite: !c.is_favorite } : c));
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to toggle favorite.');
    }
  };

  // Category Handlers
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setError(null);
    try {
      await api.createCategory(newCategoryName.trim());
      setNewCategoryName('');
      showToast('Category created!');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to create category.');
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Delete category? Contacts in this category will be reset to unassigned.')) return;
    setError(null);
    try {
      await api.deleteCategory(catId);
      if (selectedCategoryId === catId) {
        setSelectedCategoryId(null);
      }
      showToast('Category deleted!');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete category.');
    }
  };

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  // Auth Screen Render
  if (!isAuthenticated) {
    return (
      <div className="auth-page">
        <div className="auth-container glass-panel animate-fade-in">
          <div className="auth-header">
            <div className="auth-logo">C</div>
            <h1 className="auth-title">Contact Manager</h1>
            <p className="auth-subtitle">Keep your contacts synchronized</p>
          </div>

          <div className="auth-tabs">
            <button
              className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
              onClick={() => { setAuthTab('login'); setAuthError(null); }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${authTab === 'register' ? 'active' : ''}`}
              onClick={() => { setAuthTab('register'); setAuthError(null); }}
            >
              Sign Up
            </button>
          </div>

          {authError && <div className="alert alert-danger">{authError}</div>}
          {authSuccess && <div className="alert alert-success">{authSuccess}</div>}

          <form onSubmit={authTab === 'login' ? handleLogin : handleRegister} className="auth-form">
            <div className="form-group">
              <input
                type="text"
                placeholder="Username"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
              {authTab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard Screen Render
  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo-container">
          <div className="logo-icon">C</div>
          <span className="logo-text">Contact Manager</span>
        </div>
        <div className="user-nav">
          <div className="user-profile">
            <div className="user-avatar">{currentUser[0]?.toUpperCase()}</div>
            <span className="username">{currentUser}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="dashboard-content">
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Search Filters */}
          <div className="sidebar-section">
            <h3 className="sidebar-title">Filters</h3>
            <div className="filter-group">
              <input
                type="text"
                placeholder="Search name..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Search phone..."
                value={filterPhone}
                onChange={(e) => setFilterPhone(e.target.value)}
              />
              <input
                type="text"
                placeholder="Search email..."
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
              />
              <input
                type="text"
                placeholder="Search city..."
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
              />
            </div>
            {(filterName || filterPhone || filterEmail || filterCity || selectedCategoryId) && (
              <button
                className="btn-logout"
                style={{ fontSize: '12px', padding: '6px' }}
                onClick={() => {
                  setFilterName('');
                  setFilterPhone('');
                  setFilterEmail('');
                  setFilterCity('');
                  setSelectedCategoryId(null);
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Categories Panel */}
          <div className="sidebar-section">
            <h3 className="sidebar-title">Categories</h3>
            <div className="category-list">
              <button
                className={`category-item ${selectedCategoryId === null ? 'active' : ''}`}
                onClick={() => setSelectedCategoryId(null)}
              >
                📁 All Contacts
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`category-item ${selectedCategoryId === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  <span className="category-meta">
                    🏷️ {cat.name}
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(cat.id);
                    }}
                    className="btn-delete-cat"
                  >
                    ✕
                  </span>
                </button>
              ))}
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleCreateCategory} className="add-category-form">
              <input
                type="text"
                placeholder="New category..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button type="submit" className="btn-add-cat">+</button>
            </form>
          </div>
        </aside>

        {/* Contacts Main Panel */}
        <main className="main-panel">
          {error && <div className="alert alert-danger">{error}</div>}
          {successMessage && <div className="alert alert-success">{successMessage}</div>}

          <div className="main-header">
            <div className="main-title-container">
              <h2 className="main-title">
                {selectedCategoryId
                  ? `${categories.find((c) => c.id === selectedCategoryId)?.name || 'Category'} Contacts`
                  : 'All Contacts'}
              </h2>
              <span className="main-subtitle">
                Showing {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button className="btn-primary" onClick={openAddModal}>
              + Add Contact
            </button>
          </div>

          {loading && contacts.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
              <div style={{ animation: 'pulse 1.5s infinite', fontSize: '18px' }}>Syncing with database...</div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="empty-state animate-fade-in">
              <span className="empty-icon">📇</span>
              <h4 className="empty-title">No Contacts Found</h4>
              <p className="empty-desc">
                {filterName || filterPhone || filterEmail || filterCity || selectedCategoryId
                  ? 'No contacts match your active filters. Try clearing them.'
                  : 'Start building your network by adding your first contact.'}
              </p>
              {!filterName && !filterPhone && !filterEmail && !filterCity && !selectedCategoryId && (
                <button className="btn-primary" onClick={openAddModal} style={{ marginTop: '10px' }}>
                  Create Contact
                </button>
              )}
            </div>
          ) : (
            <div className="contacts-grid">
              {contacts.map((contact) => {
                const category = categories.find((c) => c.id === contact.category_id);
                return (
                  <div key={contact.id} className="contact-card glass-panel animate-fade-in">
                    <div className="contact-card-header">
                      <div className="contact-profile">
                        <div className="contact-avatar">
                          {contact.name[0]?.toUpperCase()}
                        </div>
                        <div className="contact-meta">
                          <h4 className="contact-name">{contact.name}</h4>
                          {category && (
                            <span className="category-badge">{category.name}</span>
                          )}
                        </div>
                      </div>
                      <button
                        className={`btn-favorite-toggle ${contact.is_favorite ? 'favorite' : ''}`}
                        onClick={() => handleToggleFavorite(contact.id)}
                        title={contact.is_favorite ? 'Remove from Favorites' : 'Mark as Favorite'}
                      >
                        ★
                      </button>
                    </div>

                    <div className="contact-info-list">
                      <div className="contact-info-item">
                        <span className="info-icon">📞</span>
                        <span>{contact.phone}</span>
                      </div>
                      <div className="contact-info-item">
                        <span className="info-icon">✉️</span>
                        <span>{contact.email}</span>
                      </div>
                      <div className="contact-info-item">
                        <span className="info-icon">📍</span>
                        <span>{contact.city}</span>
                      </div>
                    </div>

                    <div className="contact-card-actions">
                      <button className="btn-action-edit" onClick={() => openEditModal(contact)}>
                        Edit
                      </button>
                      <button className="btn-action-delete" onClick={() => handleDeleteContact(contact.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Modal for Add / Edit Contact */}
      {showContactModal && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel animate-fade-in">
            <div className="modal-header">
              <h3 className="modal-title">{editingContact ? 'Edit Contact' : 'Add Contact'}</h3>
              <button className="btn-modal-close" onClick={() => setShowContactModal(false)}>✕</button>
            </div>

            {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

            <form onSubmit={handleContactSubmit} className="modal-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={selectedCountryCode}
                    onChange={(e) => setSelectedCountryCode(e.target.value)}
                    style={{ width: '160px', flexShrink: 0 }}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder={
                      COUNTRIES.find(c => c.code === selectedCountryCode)?.placeholder || 'Enter number'
                    }
                    value={localPhone}
                    onChange={(e) => setLocalPhone(e.target.value)}
                    style={{ flexGrow: 1 }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  placeholder="e.g. email@example.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  placeholder="e.g. Tehran"
                  value={contactForm.city}
                  onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={contactForm.category_id}
                  onChange={(e) => setContactForm({ ...contactForm, category_id: e.target.value })}
                >
                  <option value="">-- No Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowContactModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingContact ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;