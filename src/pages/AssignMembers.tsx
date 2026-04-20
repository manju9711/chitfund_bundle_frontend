import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { ChitScheme, Customer } from '../types';

export default function AssignMembers() {
  const { schemeId } = useParams<{ schemeId: string }>();
  const navigate = useNavigate();
  const [scheme, setScheme] = useState<ChitScheme | null>(null);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [addingCustomers, setAddingCustomers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (schemeId) {
      loadData();
    } else {
      setError('Scheme ID required');
      setLoading(false);
    }
  }, [schemeId]);

  const loadData = async () => {
    if (!schemeId) return;
    setLoading(true);
    setError('');
    try {
      const [schemeData, customersData] = await Promise.all([
        apiService.getSchemeById(schemeId),
        apiService.getCustomers()
      ]);
      if (schemeData) {
        setScheme(schemeData);
        setAllCustomers(customersData);
      } else {
        setError('Scheme not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerToggle = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleAddCustomers = async () => {
    if (!schemeId || selectedCustomers.length === 0) {
      alert('Please select at least one customer');
      return;
    }
    if (scheme && scheme.currentMembers + selectedCustomers.length > scheme.totalMembers) {
      alert(`Scheme allows maximum ${scheme.totalMembers} members. Currently ${scheme.currentMembers}. You selected ${selectedCustomers.length}.`);
      return;
    }
    setAddingCustomers(true);
    try {
      const result = await apiService.addCustomersToScheme(schemeId, selectedCustomers);
      alert(result.message || `Added ${result.added} customer(s) successfully`);
      navigate('/schemes');
    } catch (err: any) {
      alert(err.message || 'Failed to add customers');
    } finally {
      setAddingCustomers(false);
    }
  };

  const handleCancel = () => {
    navigate('/schemes');
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  if (error || !scheme) {
    return (
      <div className="card" style={{ padding: '20px' }}>
        <p style={{ color: '#dc3545' }}>{error || 'Scheme not found'}</p>
        <button type="button" className="btn" onClick={() => navigate('/schemes')}>
          Back to Schemes
        </button>
      </div>
    );
  }

  const isSchemeFull = scheme.currentMembers >= scheme.totalMembers;
  const activeCustomers = allCustomers.filter(c => c.status === 'active');

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn"
          style={{ background: '#6c757d', color: 'white' }}
          onClick={handleCancel}
        >
          ← Back to Schemes
        </button>
        <h1 style={{ margin: 0, color: '#333' }}>Assign Members to Scheme</h1>
      </div>

      <div className="card" style={{ marginBottom: '20px', padding: '20px', background: '#f0f8ff', border: '1px solid #007bff' }}>
        <h3 style={{ marginTop: 0, color: '#007bff' }}>{scheme.name}</h3>
        <p style={{ margin: '5px 0' }}>
          <strong>Members:</strong> {scheme.currentMembers} / {scheme.totalMembers}
        </p>
        <p style={{ margin: '5px 0' }}>
          <strong>Duration:</strong> {scheme.duration} {scheme.chitFrequency === 'week' ? 'weeks' : 'months'}
        </p>
        {isSchemeFull && (
          <p style={{ margin: '10px 0', color: '#856404', fontWeight: '600' }}>
            Scheme is full. Cannot assign more members.
          </p>
        )}
      </div>

      {!isSchemeFull && (
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: '15px' }}>Select customers to add</h2>

          {selectedCustomers.length > 0 && (
            <div style={{
              marginBottom: '15px',
              padding: '10px',
              background: '#e7f3ff',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              <strong>Selected ({selectedCustomers.length}):</strong>{' '}
              {selectedCustomers.map(id => {
                const customer = allCustomers.find(c => c.id === id);
                return customer?.name;
              }).filter(Boolean).join(', ')}
            </div>
          )}

          <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
            {activeCustomers.length === 0 ? (
              <p style={{ color: '#666' }}>No active customers available.</p>
            ) : (
              activeCustomers.map(customer => (
                <div
                  key={customer.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px',
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleCustomerToggle(customer.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedCustomers.includes(customer.id)}
                    onChange={() => handleCustomerToggle(customer.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginRight: '10px', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500' }}>{customer.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {customer.email || 'N/A'} | {customer.phone}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCancel}
              className="btn"
              style={{ background: '#6c757d', color: 'white' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddCustomers}
              disabled={selectedCustomers.length === 0 || addingCustomers}
              className="btn btn-primary"
            >
              {addingCustomers ? 'Adding...' : `Add ${selectedCustomers.length} Customer(s)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
