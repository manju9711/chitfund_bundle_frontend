import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Customer, ChitScheme } from '../types';
import Pagination from '../components/Pagination';

export default function CustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [schemes, setSchemes] = useState<ChitScheme[]>([]);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [selectedSchemes, setSelectedSchemes] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadCustomers();
    loadSchemes();
  }, []);

  const loadSchemes = async () => {
    try {
      const data = await apiService.getSchemes();
      setSchemes(data);
    } catch (error) {
      console.error('Failed to load schemes:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await apiService.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter(customer => {
      const searchLower = searchTerm.toLowerCase();
      return (
        customer.name.toLowerCase().includes(searchLower) ||
        (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
        (customer.phone && customer.phone.includes(searchTerm)) ||
        (customer.whatsappNumber && customer.whatsappNumber.includes(searchTerm))
      );
    });

    if (statusFilter !== 'all') {
      filtered = filtered.filter(customer => customer.status === statusFilter);
    }

    return filtered;
  }, [customers, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c => c.status === 'active').length;
    const inactive = customers.filter(c => c.status === 'inactive').length;
    return { total, active, inactive };
  }, [customers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, filteredCustomers.length]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    setDeletingId(id);
    try {
      await apiService.deleteCustomer(id);
      await loadCustomers();
    } catch (error: any) {
      alert(error.message || 'Failed to delete customer');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSchemeToggle = (schemeId: string) => {
    setSelectedSchemes(prev => 
      prev.includes(schemeId) 
        ? prev.filter(id => id !== schemeId)
        : [...prev, schemeId]
    );
  };

  const handleAssignToSchemes = async (customerId: string) => {
    if (selectedSchemes.length === 0) {
      alert('Please select at least one scheme');
      return;
    }

    setAssigning(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      const errorMessages: string[] = [];
      
      for (const schemeId of selectedSchemes) {
        try {
          const result = await apiService.addCustomersToScheme(schemeId, [customerId]);
          if (result && typeof result.added === 'number' && result.added > 0) {
            successCount++;
          } else {
            const scheme = schemes.find(s => s.id === schemeId);
            const schemeName = scheme?.name || schemeId;
            if (result && result.skipped > 0) {
              errorMessages.push(`${schemeName}: Customer is already a member`);
            } else if (result && result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
              errorMessages.push(`${schemeName}: ${result.errors.join(', ')}`);
            } else {
              errorMessages.push(`${schemeName}: Could not be added (may already be a member)`);
            }
            errorCount++;
          }
        } catch (error: any) {
          const scheme = schemes.find(s => s.id === schemeId);
          const schemeName = scheme?.name || schemeId;
          const errorMsg = error?.response?.data?.message || error?.message || 'Failed to assign';
          errorMessages.push(`${schemeName}: ${errorMsg}`);
          errorCount++;
        }
      }

      if (successCount > 0) {
        const message = `Successfully assigned to ${successCount} scheme(s)${errorCount > 0 ? `\n\nFailed:\n${errorMessages.join('\n')}` : ''}`;
        alert(message);
        await loadSchemes();
        setShowAssignModal(null);
        setSelectedSchemes([]);
      } else {
        const message = `Failed to assign customer to any scheme:\n\n${errorMessages.join('\n')}`;
        alert(message);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to assign customer to schemes');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Search and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
        <h1 className="m-0 text-gray-800 text-2xl md:text-3xl font-bold">Customers</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-base min-w-0 sm:min-w-[250px] sm:max-w-[300px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
          <Link 
            to="/customers/add" 
            className="btn btn-primary no-underline font-bold text-center whitespace-nowrap"
          >
            Add New Customer
          </Link>
        </div>
      </div>

      {/* Status Filter Chips */}
      <div className="card mb-5 p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm text-gray-600 font-medium">Filter by Status:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-1.5 rounded-full border-none cursor-pointer text-sm font-medium transition-all duration-200 ${
              statusFilter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-1.5 rounded-full border-none cursor-pointer text-sm font-medium transition-all duration-200 ${
              statusFilter === 'active' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active ({stats.active})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-4 py-1.5 rounded-full border-none cursor-pointer text-sm font-medium transition-all duration-200 ${
              statusFilter === 'inactive' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Inactive ({stats.inactive})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="table-wrapper">
          <table className="table min-w-[900px] w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>WhatsApp</th>
                <th>City</th>
                <th>Address</th>
                <th>Status</th>
                <th>Joined Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10">
                    {searchTerm ? 'No customers found matching your search' : 'No customers found'}
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map(customer => (
                  <tr key={customer.id}>
                    <td className="whitespace-nowrap font-medium">
                      <Link 
                        to={`/customers/detail/${customer.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        style={{ textDecoration: 'none' }}
                      >
                        {customer.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">{customer.email || 'N/A'}</td>
                    <td className="whitespace-nowrap">{customer.phone}</td>
                    <td className="whitespace-nowrap">{customer.whatsappNumber || 'N/A'}</td>
                    <td className="whitespace-nowrap">{customer.city || 'N/A'}</td>
                    <td className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap" title={customer.address}>
                      {customer.address || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className={`badge ${customer.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">{customer.createdAt}</td>
                    <td>
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => navigate(`/customers/edit/${customer.id}`)}
                          className="p-2 border-none rounded-md bg-blue-50 text-blue-600 cursor-pointer text-lg flex items-center justify-center w-9 h-9 transition-all duration-200 hover:bg-blue-600 hover:text-white hover:scale-110"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          disabled={deletingId === customer.id}
                          className={`p-2 border-none rounded-md cursor-pointer text-lg flex items-center justify-center w-9 h-9 transition-all duration-200 ${
                            deletingId === customer.id
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-60'
                              : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white hover:scale-110'
                          }`}
                          title={deletingId === customer.id ? 'Deleting...' : 'Delete'}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end mt-5">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCustomers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Assign to Schemes Modal */}
      {showAssignModal && (() => {
        const customer = customers.find(c => c.id === showAssignModal);
        return (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4"
            onClick={() => setShowAssignModal(null)}
          >
            <div 
              className="card max-w-2xl w-full max-h-[80vh] overflow-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mt-0 mb-4 text-xl font-semibold">Assign to Schemes</h2>
              {customer && (
                <p className="text-gray-600 mb-5">
                  Assign <strong>{customer.name}</strong> to one or more schemes
                </p>
              )}
              
              {selectedSchemes.length > 0 && (
                <div className="mb-4 p-2.5 bg-blue-50 rounded text-sm">
                  <strong>Selected ({selectedSchemes.length}):</strong>{' '}
                  {selectedSchemes.map(id => {
                    const scheme = schemes.find(s => s.id === id);
                    return scheme?.name;
                  }).filter(Boolean).join(', ')}
                </div>
              )}

              <div className="max-h-96 overflow-y-auto mb-5">
                {schemes.length === 0 ? (
                  <div className="text-center py-5 text-gray-600">
                    No schemes found
                  </div>
                ) : (
                  schemes.map(scheme => {
                    const isFull = scheme.currentMembers >= scheme.totalMembers;
                    const isActive = scheme.status === 'active';
                    return (
                      <div 
                        key={scheme.id} 
                        className={`flex items-center p-2.5 border-b border-gray-200 ${
                          isFull ? 'opacity-60 bg-gray-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'
                        }`}
                        onClick={() => !isFull && handleSchemeToggle(scheme.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSchemes.includes(scheme.id)}
                          onChange={() => !isFull && handleSchemeToggle(scheme.id)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={isFull}
                          className="mr-2.5 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="font-medium flex items-center gap-2">
                            {scheme.name}
                            {isFull && <span className="text-xs text-red-600 font-normal">(Full)</span>}
                            {!isActive && <span className="text-xs text-gray-500 font-normal">({scheme.status})</span>}
                          </div>
                          <div className="text-xs text-gray-600">
                            Members: {scheme.currentMembers} / {scheme.totalMembers} | Amount: ₹{scheme.totalAmount.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={() => {
                    setShowAssignModal(null);
                    setSelectedSchemes([]);
                  }}
                  className="btn bg-gray-600 text-white hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAssignToSchemes(showAssignModal)}
                  disabled={selectedSchemes.length === 0 || assigning}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigning ? 'Assigning...' : `Assign to ${selectedSchemes.length} Scheme(s)`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
