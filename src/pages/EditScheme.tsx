import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../services/api';

export default function EditScheme() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    totalAmount: '',
    duration: '',
    monthlyInstallment: '',
    startDate: '',
    endDate: '',
    chitFrequency: 'month' as 'week' | 'month',
    chitType: 'auction' as 'fixed' | 'auction',
    totalMembers: '',
    currentMembers: '',
    status: 'active' as 'active' | 'completed' | 'cancelled'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasPayments, setHasPayments] = useState(false);

  useEffect(() => {
    loadScheme();
  }, [id]);

  const loadScheme = async () => {
    if (!id) {
      navigate('/schemes');
      return;
    }

    try {
      const scheme = await apiService.getSchemeById(id);
      if (scheme) {
        // Check if scheme has payments
        if (scheme.hasPayments) {
          setHasPayments(true);
          setError('This scheme cannot be edited because it has completed installments. Payments have already been recorded for this scheme.');
        }
        
        // Round up the installment amount
        const roundedInstallment = Math.ceil(scheme.monthlyInstallment);
        setFormData({
          name: scheme.name,
          totalAmount: String(scheme.totalAmount),
          duration: String(scheme.duration),
          monthlyInstallment: roundedInstallment.toFixed(2),
          startDate: scheme.startDate,
          endDate: scheme.endDate,
          chitFrequency: scheme.chitFrequency || 'month',
          chitType: scheme.chitType || 'auction',
          totalMembers: String(scheme.totalMembers),
          currentMembers: String(scheme.currentMembers),
          status: scheme.status
        });
      } else {
        setError('Scheme not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load scheme');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updatedFormData = {
        ...prev,
        [name]: value
      };
      
      // Auto-convert duration when frequency changes
      if (name === 'chitFrequency' && prev.duration) {
        const currentDuration = parseInt(prev.duration);
        if (currentDuration > 0) {
          if (prev.chitFrequency === 'month' && value === 'week') {
            // Convert months to weeks: months * 4
            updatedFormData.duration = String(currentDuration * 4);
          } else if (prev.chitFrequency === 'week' && value === 'month') {
            // Convert weeks to months: weeks / 4 (round to nearest)
            updatedFormData.duration = String(Math.round(currentDuration / 4));
          }
        }
      }
      
      // Auto-calculate installment if total amount, duration, and frequency are provided
      if (name === 'totalAmount' || name === 'duration' || name === 'chitFrequency') {
        const totalAmount = name === 'totalAmount' ? parseFloat(value) : parseFloat(updatedFormData.totalAmount);
        const duration = name === 'duration' ? parseInt(updatedFormData.duration) : parseInt(value);
        const frequency = name === 'chitFrequency' ? value : updatedFormData.chitFrequency;
        
        if (totalAmount && duration && duration > 0) {
          let installment = 0;
          if (frequency === 'week') {
            // For weekly: total amount divided by duration in weeks
            installment = totalAmount / duration;
          } else {
            // For monthly: total amount divided by duration in months
            installment = totalAmount / duration;
          }
          
          updatedFormData.monthlyInstallment = installment.toFixed(2);
        }
      }

      // Auto-calculate end date if start date and duration are provided
      if (name === 'startDate' || name === 'duration' || name === 'chitFrequency') {
        const startDate = name === 'startDate' ? value : updatedFormData.startDate;
        const duration = name === 'duration' ? parseInt(updatedFormData.duration) : parseInt(value);
        const frequency = name === 'chitFrequency' ? value : updatedFormData.chitFrequency;
        
        if (startDate && duration) {
          const start = new Date(startDate);
          if (frequency === 'week') {
            // Add weeks
            start.setDate(start.getDate() + (duration * 7));
          } else {
            // Add months
            start.setMonth(start.getMonth() + duration);
          }
          const endDate = start.toISOString().split('T')[0];
          updatedFormData.endDate = endDate;
        }
      }
      
      return updatedFormData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    // Prevent submission if scheme has payments
    if (hasPayments) {
      setError('Cannot update scheme: Payments have already been recorded for this scheme.');
      return;
    }

    setError('');
    setSaving(true);

    try {
      await apiService.updateScheme(id, {
        name: formData.name,
        totalAmount: parseFloat(formData.totalAmount),
        duration: parseInt(formData.duration),
        monthlyInstallment: parseFloat(formData.monthlyInstallment),
        startDate: formData.startDate,
        endDate: formData.endDate,
        chitFrequency: formData.chitFrequency,
        chitType: formData.chitType,
        totalMembers: parseInt(formData.totalMembers),
        currentMembers: parseInt(formData.currentMembers),
        status: formData.status
      });
      navigate('/schemes');
    } catch (err: any) {
      setError(err.message || 'Failed to update scheme');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>Edit Chit Scheme</h1>

      {error && (
        <div className="card" style={{
          background: hasPayments ? '#fff3cd' : '#f8d7da',
          color: hasPayments ? '#856404' : '#721c24',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {hasPayments && (
        <div className="card" style={{
          background: '#fff3cd',
          color: '#856404',
          marginBottom: '20px',
          border: '1px solid #ffc107'
        }}>
          <strong>⚠️ Editing Disabled:</strong> This scheme has completed installments. Payments have already been recorded, so the scheme details cannot be modified to maintain data integrity.
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Row 1: Scheme Name (Full Width) */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label>Scheme Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., Monthly Chit Scheme - 1 Lakh"
                disabled={hasPayments}
                style={hasPayments ? { background: '#e9ecef', cursor: 'not-allowed' } : {}}
              />
          </div>

          {/* Row 2: Total Amount, Duration, Monthly Installment */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>Total Amount (₹) *</label>
              <input
                type="number"
                name="totalAmount"
                value={formData.totalAmount}
                onChange={handleChange}
                required
                min="1000"
                step="1000"
                placeholder="100000"
                disabled={hasPayments}
                style={hasPayments ? { background: '#e9ecef', cursor: 'not-allowed' } : {}}
              />
            </div>

            <div className="form-group">
              <label>Duration ({formData.chitFrequency === 'week' ? 'weeks' : 'months'}) *</label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                required
                min="1"
                placeholder={formData.chitFrequency === 'week' ? '48' : '12'}
                disabled={hasPayments}
                style={hasPayments ? { background: '#e9ecef', cursor: 'not-allowed' } : {}}
              />
            </div>

            <div className="form-group">
              <label>
                Installment ({formData.chitFrequency === 'week' ? 'Week' : 'Month'}) (₹) *
              </label>
              <input
                type="number"
                name="monthlyInstallment"
                value={formData.monthlyInstallment}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="Auto-calculated"
                style={hasPayments ? { background: '#e9ecef', cursor: 'not-allowed', MozAppearance: 'textfield' } : { MozAppearance: 'textfield' }}
                className="no-spinner"
                disabled={hasPayments}
              />
            </div>
          </div>

          {/* Row 3: Start Date, End Date, Chit Frequency */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                disabled={hasPayments}
                style={hasPayments ? { background: '#e9ecef', cursor: 'not-allowed' } : {}}
              />
            </div>

            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                disabled={hasPayments}
                style={hasPayments ? { background: '#e9ecef', cursor: 'not-allowed' } : {}}
              />
            </div>

            <div className="form-group">
              <label>Chit Frequency *</label>
              <select
                name="chitFrequency"
                value={formData.chitFrequency}
                onChange={handleChange}
                required
                disabled={hasPayments}
                style={hasPayments ? { background: '#e9ecef', cursor: 'not-allowed' } : {}}
              >
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
          </div>

          {/* Row 4: Chit Type, Total Members, Status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>Chit Type *</label>
              <select
                name="chitType"
                value={formData.chitType}
                onChange={handleChange}
                required
                disabled={hasPayments}
                style={hasPayments ? { background: '#e9ecef', cursor: 'not-allowed' } : {}}
              >
                <option value="fixed">Fixed</option>
                <option value="auction">Auction</option>
              </select>
            </div>

            <div className="form-group">
              <label>Total Members *</label>
              <input
                type="number"
                name="totalMembers"
                value={formData.totalMembers}
                onChange={handleChange}
                required
                min="1"
                placeholder="20"
                disabled={hasPayments}
                style={hasPayments ? { background: '#e9ecef', cursor: 'not-allowed' } : {}}
              />
            </div>

            <div className="form-group">
              <label>Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                disabled={hasPayments}
                style={hasPayments ? { background: '#e9ecef', cursor: 'not-allowed' } : {}}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving || hasPayments}>
              {saving ? 'Updating...' : hasPayments ? 'Editing Disabled' : 'Update Scheme'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/schemes')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

