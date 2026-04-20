import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

export default function AddCustomer() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsappNumber: '',
    address: '',
    city: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const checkPhoneExists = async (phone: string): Promise<boolean> => {
    if (!phone) return false;
    try {
      const customers = await apiService.getCustomers();
      return customers.some(c => c.phone === phone);
    } catch (err) {
      console.error('Failed to check phone:', err);
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear phone error when user types
    if (name === 'phone') {
      setPhoneError('');
    }
  };

  const handlePhoneBlur = async () => {
    if (formData.phone) {
      const exists = await checkPhoneExists(formData.phone);
      if (exists) {
        setPhoneError('This phone number already exists. Please use a different number.');
      } else {
        setPhoneError('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPhoneError('');

     // ✅ 10 digit validation
  if (formData.phone.length !== 10) {
    setPhoneError('Phone number must be exactly 10 digits');
    return;
  }

    // Check phone number before submitting
    if (formData.phone) {
      const exists = await checkPhoneExists(formData.phone);
      if (exists) {
        setPhoneError('This phone number already exists. Please use a different number.');
        return;
      }
    }

    setLoading(true);

    try {
      await apiService.addCustomer(formData);
      navigate('/customers');
    } catch (err: any) {
      setError(err.message || 'Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-5 text-gray-800 text-2xl md:text-3xl font-bold">Add New Customer</h1>

      {error && (
        <div className="card bg-red-100 text-red-800 mb-5">
          {error}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Row 1: Name, Phone, City */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter customer full name"
                className="w-full"
              />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              {/* <input
                type="number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handlePhoneBlur}
                required
                placeholder="Enter phone number"
                pattern="[0-9]{10}"
                className={`w-full ${phoneError ? 'border-red-500' : ''}`}
              />  */}
              <input
  type="text"
  name="phone"
  value={formData.phone}
  onChange={(e) => {
    const value = e.target.value.replace(/\D/g, ''); // only numbers
    if (value.length <= 10) {
      setFormData({ ...formData, phone: value });
    }
  }}
  onBlur={handlePhoneBlur}
  required
  placeholder="Enter phone number"
  className={`w-full ${phoneError ? 'border-red-500' : ''}`}
/>
              {phoneError && (
                <small className="text-red-600 block mt-1">{phoneError}</small>
              )}
            </div>

            <div className="form-group">
              <label>City *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                placeholder="Enter city"
                className="w-full"
              />
            </div>
          </div>

          {/* Row 2: Email, WhatsApp Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                className="w-full"
              />
            </div>

            <div className="form-group">
              <label>WhatsApp Number</label>
              {/* <input
                type="tel"
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleChange}
                placeholder="Enter WhatsApp number"
                pattern="[0-9]{10}"
                className="w-full"
              /> */}
              <input
  type="text"
  name="whatsappNumber"
  value={formData.whatsappNumber}
  onChange={(e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setFormData({ ...formData, whatsappNumber: value });
    }
  }}
  placeholder="Enter WhatsApp number"
  className="w-full"
/>
            </div>
          </div>

          {/* Row 3: Address (Full Width) */}
          <div className="form-group mb-5">
            <label>Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter address"
              rows={3}
              className="w-full p-2.5 border border-gray-300 rounded font-inherit text-base focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Row 4: Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 mt-5">
            <button type="submit" className="btn btn-primary" disabled={loading || !!phoneError}>
              {loading ? 'Adding...' : 'Add Customer'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/customers')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
