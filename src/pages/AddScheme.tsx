import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

export default function AddScheme() {
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
    status: 'active' as 'active' | 'completed' | 'cancelled'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setError('');
    setLoading(true);

    try {
      await apiService.addScheme({
        name: formData.name,
        totalAmount: parseFloat(formData.totalAmount),
        duration: parseInt(formData.duration),
        monthlyInstallment: parseFloat(formData.monthlyInstallment),
        startDate: formData.startDate,
        endDate: formData.endDate,
        chitFrequency: formData.chitFrequency,
        chitType: formData.chitType,
        totalMembers: parseInt(formData.totalMembers),
        currentMembers: 0,
        status: formData.status
      });
      navigate('/schemes');
    } catch (err: any) {
      setError(err.message || 'Failed to create scheme');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>Create New Chit Scheme</h1>

      {error && (
        <div className="card" style={{
          background: '#f8d7da',
          color: '#721c24',
          marginBottom: '20px'
        }}>
          {error}
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
                readOnly
                style={{ 
                  background: '#f8f9fa',
                  MozAppearance: 'textfield'
                }}
                className="no-spinner"
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
              />
            </div>

            <div className="form-group">
              <label>Chit Frequency *</label>
              <select
                name="chitFrequency"
                value={formData.chitFrequency}
                onChange={handleChange}
                required
              >
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
          </div>

          {/* Row 4: Chit Type, Total Members */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>Chit Type *</label>
              <select
                name="chitType"
                value={formData.chitType}
                onChange={handleChange}
                required
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
              />
            </div>
          </div>

          {/* Row 5: Status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="form-group">
              {/* Empty space for alignment */}
            </div>

            <div className="form-group">
              {/* Empty space for alignment */}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Scheme'}
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

