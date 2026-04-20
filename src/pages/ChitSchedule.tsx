import { useEffect, useState, useMemo } from 'react';
import { apiService } from '../services/api';
import { ChitScheduleGroup, ChitSchedule as ChitScheduleType, ChitScheme, Customer } from '../types';

// interface MemberSummary {
//   customerId: string;
//   customerName: string;
//   customerEmail: string;
//   customerPhone: string;
//   allocationCount: number;
// }

export default function ChitSchedule() {
  const [scheduleGroups, setScheduleGroups] = useState<ChitScheduleGroup[]>([]);
  const [schemes, setSchemes] = useState<ChitScheme[]>([]);
  const [_customers, setCustomers] = useState<Customer[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [_editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{ customerId: string; amount: string; date: string }>({
    customerId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [_saving, setSaving] = useState<string | null>(null);
  const [schemeMembers, setSchemeMembers] = useState<Customer[]>([]);
  const [_memberSummary, setMemberSummary] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [customerPayments, setCustomerPayments] = useState<any[]>([]);
  const [editingPayment, setEditingPayment] = useState<{ installmentNumber: number; amount: string; date: string } | null>(null);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [paymentScheduleData, setPaymentScheduleData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedSchemeId && schemes.length > 0) {
      loadSchedule(selectedSchemeId);
      loadMemberSummary(selectedSchemeId);
      setCurrentPage(1); // Reset to first page when scheme changes
      setSelectedCustomerId(null); // Reset selected customer when scheme changes
      setSelectedEntryId(null); // Reset selected entry when scheme changes
      setSearchQuery('');
      // Load all payments for this scheme
      loadAllPaymentsForScheme(selectedSchemeId);
      // Load payment schedule data for detailed summary
      loadPaymentScheduleData(selectedSchemeId);
    }
  }, [selectedSchemeId, schemes]);

  const loadPaymentScheduleData = async (schemeId: string) => {
    try {
      const data = await apiService.getPaymentSchedule(schemeId);
      setPaymentScheduleData(data);
    } catch (error) {
      // Silently fail - we'll calculate from existing payment data instead
      console.warn('Payment schedule API not available, will calculate from existing data:', error);
      setPaymentScheduleData(null);
    }
  };

  // Reload payments when customer is selected
  useEffect(() => {
    if (selectedCustomerId && selectedSchemeId) {
      loadAllPaymentsForScheme(selectedSchemeId);
    }
  }, [selectedCustomerId, selectedSchemeId]);

  const loadAllPaymentsForScheme = async (schemeId: string) => {
    try {
      const payments = await apiService.getPayments();
      const filteredPayments = payments.filter(
        (p: any) => p.schemeId === schemeId || p.scheme_id === schemeId
      );
      setCustomerPayments(filteredPayments);
    } catch (err: any) {
      console.error('Failed to load payments:', err);
      setCustomerPayments([]);
    }
  };

  const loadData = async () => {
    try {
      const [schemesData, customersData] = await Promise.all([
        apiService.getSchemes(),
        apiService.getCustomers()
      ]);
      setSchemes(schemesData);
      setCustomers(customersData);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      setLoading(false);
    }
  };

  const loadSchedule = async (schemeId: string) => {
    try {
      const schedules = await apiService.getSchedules(schemeId) as ChitScheduleType[];
      const scheme = schemes.find(s => s.id === schemeId);
      
      if (scheme) {
        // Load members of this scheme using dedicated API
        try {
          const members = await apiService.getSchemeMembers(schemeId);
          console.log(`Loaded ${members.length} members for scheme ${schemeId}:`, members);
          setSchemeMembers(members);
        } catch (err) {
          console.error('Failed to load scheme members:', err);
          setSchemeMembers([]);
        }
        
        // Ensure we have all months (1 to duration)
        const allSchedules: ChitScheduleType[] = [];
        for (let month = 1; month <= scheme.duration; month++) {
          const existing = schedules.find(s => s.monthNumber === month);
          if (existing) {
            allSchedules.push(existing);
          } else {
            allSchedules.push({
              id: '',
              schemeId,
              monthNumber: month,
              status: 'pending',
              allocationType: 'pending'
            });
          }
        }
        
        setScheduleGroups([{
          schemeId,
          schemeName: scheme.name,
          duration: scheme.duration,
          totalAmount: scheme.totalAmount,
          chitType: scheme.chitType,
          chitFrequency: scheme.chitFrequency,
          schedules: allSchedules
        }]);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load schedule';
      setError(errorMsg);
    }
  };

  const _handleGenerateSchedule = async (schemeId: string) => {
    if (!window.confirm('Generate schedule for this scheme? This will create rows for all months.')) {
      return;
    }

    try {
      setError('');
      await apiService.generateSchedule(schemeId);
      await loadSchedule(schemeId);
      alert('Schedule generated successfully!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to generate schedule';
      setError(errorMsg);
      alert(errorMsg);
    }
  };

  const _handleEditSchedule = (schedule: ChitScheduleType | { id?: string; customerId?: string; amountReceived?: number; allocationDate?: string }) => {
    if (!schedule.id) {
      // If schedule doesn't exist, we need to create it first
      // For now, we'll use a temporary ID based on the row
      const tempId = `temp-${schedule.customerId || 'new'}`;
      setEditingSchedule(tempId);
    } else {
      setEditingSchedule(schedule.id);
    }
    setEditingData({
      customerId: schedule.customerId || '',
      amount: schedule.amountReceived ? schedule.amountReceived.toString() : '',
      date: schedule.allocationDate || new Date().toISOString().split('T')[0]
    });
  };

  const _handleCancelEdit = () => {
    // setEditingSchedule(null);
    setEditingData({ customerId: '', amount: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleSaveAllocation = async (scheduleId: string) => {
    if (!editingData.customerId) {
      alert('Please select a customer');
      return;
    }

    try {
      setSaving(scheduleId);
      setError('');
      await apiService.allocateSchedule(
        scheduleId,
        editingData.customerId,
        editingData.date,
        editingData.amount ? parseFloat(editingData.amount) : undefined
      );
      await loadSchedule(selectedSchemeId);
      setEditingSchedule(null);
      setEditingData({ customerId: '', amount: '', date: new Date().toISOString().split('T')[0] });
      alert('Customer allocated successfully!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to allocate customer';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setSaving(null);
    }
  };

  const _handleRemoveAllocation = async (scheduleId: string) => {
    if (!window.confirm('Remove customer allocation for this month?')) {
      return;
    }

    try {
      setSaving(scheduleId);
      setError('');
      // Update schedule to remove customer allocation
      await apiService.allocateSchedule(scheduleId, '', '', undefined);
      await loadSchedule(selectedSchemeId);
      alert('Allocation removed successfully!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to remove allocation';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setSaving(null);
    }
  };

  const loadMemberSummary = async (schemeId: string) => {
    try {
      const summary = await apiService.getMemberSummary(schemeId);
      setMemberSummary(summary.members || []);
    } catch (err: any) {
      console.error('Failed to load member summary:', err);
    }
  };

  const _loadCustomerPayments = async (customerId: string, schemeId: string) => {
    try {
      // Load payments for this customer and scheme
      const payments = await apiService.getPayments();
      const filteredPayments = payments.filter(
        (p: any) => p.customerId === customerId && p.schemeId === schemeId
      );
      setCustomerPayments(filteredPayments);
    } catch (err: any) {
      console.error('Failed to load customer payments:', err);
      setCustomerPayments([]);
    }
  };

  const handleCustomerClick = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setSelectedEntryId(null); // Reset entry selection when clicking customer header
  };

  const handleEntryClick = (customerId: string, entryId: string) => {
    setSelectedCustomerId(customerId);
    setSelectedEntryId(entryId); // Set specific entry to show only its records
  };

  const toggleCustomerExpand = (customerId: string) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  // Group customers by customerId (show each customer once)
  const groupedCustomers = useMemo(() => {
    if (!schemeMembers.length) return [];
    
    const grouped: Record<string, any[]> = {};
    schemeMembers.forEach((member: any) => {
      const customerId = member.id;
      if (!grouped[customerId]) {
        grouped[customerId] = [];
      }
      grouped[customerId].push(member);
    });
    
    return Object.entries(grouped).map(([customerId, entries]) => ({
      customerId,
      customerName: entries[0].name,
      customerPhone: entries[0].phone,
      customerEmail: entries[0].email,
      customerWhatsApp: entries[0].whatsappNumber,
      totalEntries: entries.length,
      entries: entries.sort((a, b) => {
        // Sort by entryNumber if available, otherwise by entryId
        const aNum = a.entryNumber || parseInt(a.entryId) || 0;
        const bNum = b.entryNumber || parseInt(b.entryId) || 0;
        return aNum - bNum;
      })
    }));
  }, [schemeMembers]);

  // Filter customers by search (name, phone, whatsapp)
  const filteredGroupedCustomers = useMemo(() => {
    if (!searchQuery.trim()) return groupedCustomers;
    const q = searchQuery.trim().toLowerCase();
    return groupedCustomers.filter(
      g =>
        (g.customerName || '').toLowerCase().includes(q) ||
        (g.customerPhone || '').toLowerCase().includes(q) ||
        (g.customerEmail || '').toLowerCase().includes(q) ||
        (g.customerWhatsApp || '').toLowerCase().includes(q)
    );
  }, [groupedCustomers, searchQuery]);

  const handleBackToCustomers = () => {
    setSelectedCustomerId(null);
  };

  const handlePaymentEntry = async (installmentNumber: number, amount: string, date: string) => {
    if (!selectedCustomerId || !selectedSchemeId) return;
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    try {
      // Create payment
      await apiService.createPayment({
        customerId: selectedCustomerId,
        schemeId: selectedSchemeId,
        amount: parseFloat(amount),
        paymentDate: date,
        installmentNumber
      });
      
      // Reload payments for the scheme to update the UI
      // Use a small delay to ensure the database has been updated
      await new Promise(resolve => setTimeout(resolve, 100));
      await loadAllPaymentsForScheme(selectedSchemeId);
      
      // Clear editing state
      setEditingPayment(null);
      
      // Show success message
      alert('Payment recorded successfully!');
    } catch (err: any) {
      alert('Failed to record payment: ' + (err.message || 'Unknown error'));
    }
  };

  const _handleAutoAllocate = async (schemeId: string) => {
    if (!window.confirm('Auto allocate all members to remaining months? This will distribute all active members across unallocated months.')) {
      return;
    }

    try {
      setError('');
      setLoading(true);
      const result = await apiService.autoAllocateMembers(schemeId);
      await loadSchedule(schemeId);
      await loadMemberSummary(schemeId);
      
      // Show summary
      let summaryMsg = result.message + '\n\n';
      if (result.summary && result.summary.length > 0) {
        summaryMsg += 'Allocation Summary:\n';
        result.summary.forEach((item: any) => {
          summaryMsg += `- ${item.customerName}: ${item.allocations} month(s)\n`;
        });
      }
      
      alert(summaryMsg);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to auto allocate members';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const _handleReallocateAll = async (schemeId: string) => {
    if (!window.confirm('Re-allocate all members? This will CLEAR all existing allocations and redistribute all members fairly across all months. Continue?')) {
      return;
    }

    try {
      setError('');
      setLoading(true);
      const result = await apiService.reallocateAllMembers(schemeId);
      await loadSchedule(schemeId);
      
      // Show summary
      let summaryMsg = result.message + '\n\n';
      if (result.summary && result.summary.length > 0) {
        summaryMsg += 'Re-allocation Summary:\n';
        result.summary.forEach((item: any) => {
          summaryMsg += `- ${item.customerName}: ${item.allocations} month(s)\n`;
        });
      }
      
      alert(summaryMsg);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to reallocate all members';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const _getStatusBadge = (status: string) => {
    const styles: { [key: string]: { bg: string; color: string } } = {
      pending: { bg: '#fff3cd', color: '#856404' },
      allocated: { bg: '#d4edda', color: '#155724' },
      completed: { bg: '#d1ecf1', color: '#0c5460' },
      cancelled: { bg: '#f8d7da', color: '#721c24' }
    };
    const style = styles[status] || styles.pending;
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        background: style.bg,
        color: style.color
      }}>
        {status.toUpperCase()}
      </span>
    );
  };

  // Generate schedule rows: members × duration
  const scheduleRows = useMemo(() => {
    if (!selectedSchemeId || schemeMembers.length === 0) {
      return [];
    }

    const scheme = schemes.find(s => s.id === selectedSchemeId);
    if (!scheme) return [];

    // Calculate duration in periods (weeks or months)
    const duration = scheme.chitFrequency === 'week' 
      ? scheme.duration * 4 // Convert months to weeks (approximate)
      : scheme.duration; // Keep as months

    const rows: Array<{
      memberId: string;
      memberName: string;
      memberPhone: string;
      memberEmail?: string;
      period: number;
      periodLabel: string;
      scheduleId?: string;
      customerId?: string;
      allocationType?: string;
      allocationDate?: string;
      amountReceived?: number;
      status?: string;
    }> = [];

    // Generate rows for each member × each period
    for (let period = 1; period <= duration; period++) {
      for (const member of schemeMembers) {
        // Find matching schedule if exists
        const schedule = scheduleGroups[0]?.schedules.find(
          s => s.monthNumber === period && s.customerId === member.id
        );

        rows.push({
          memberId: member.id,
          memberName: member.name,
          memberPhone: member.phone,
          memberEmail: member.email,
          period: period,
          periodLabel: scheme.chitFrequency === 'week' ? `Week ${period}` : `Month ${period}`,
          scheduleId: schedule?.id,
          customerId: schedule?.customerId,
          allocationType: schedule?.allocationType,
          allocationDate: schedule?.allocationDate,
          amountReceived: schedule?.amountReceived,
          status: schedule?.status || 'pending'
        });
      }
    }

    return rows;
  }, [selectedSchemeId, schemeMembers, schemes, scheduleGroups]);

  // Pagination calculations
  const totalRows = scheduleRows.length;
  const totalPages = Math.ceil(totalRows / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const _paginatedRows = scheduleRows.slice(startIndex, endIndex);

  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, scheduleRows.length]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '15px', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, color: '#333' }}>Chit Schedule</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          {selectedSchemeId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="chit-schedule-customer-search" style={{ fontSize: '14px', color: '#666', fontWeight: '500', whiteSpace: 'nowrap' }}>
                Search Customer:
              </label>
              <input
                id="chit-schedule-customer-search"
                type="text"
                placeholder="Name, phone or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minWidth: '200px',
                  background: 'white'
                }}
              />
            </div>
          )}
          <select
            value={selectedSchemeId}
            onChange={(e) => setSelectedSchemeId(e.target.value)}
            style={{
              padding: '10px 15px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
              minWidth: '250px'
            }}
          >
            <option value="">Select a Chit Scheme</option>
            {schemes.filter(s => s.status === 'active').map(scheme => (
              <option key={scheme.id} value={scheme.id}>
                {scheme.name} - {scheme.duration} months
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: '#f8d7da', color: '#721c24', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Show Customer List or Installment Table based on selection */}
      {selectedSchemeId && !selectedCustomerId && (() => {
        const selectedScheme = schemes.find(s => s.id === selectedSchemeId);
        if (!selectedScheme) return null;
        
        const duration = selectedScheme.chitFrequency === 'week' 
          ? (selectedScheme.duration || 0) * 4 
          : (selectedScheme.duration || 0);
        
        return (
          <div>
            {/* Scheme Details */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#007bff', marginBottom: '15px' }}>{selectedScheme.name}</h2>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '14px', color: '#666' }}>
                <span><strong>Duration:</strong> {selectedScheme.chitFrequency === 'week' ? `${duration} weeks` : `${selectedScheme.duration} months`}</span>
                <span><strong>Total Amount:</strong> {formatCurrency(selectedScheme.totalAmount)}</span>
                <span><strong>Type:</strong> {selectedScheme.chitType === 'fixed' ? 'Fixed' : 'Auction'}</span>
              </div>
            </div>

            {/* Customer List Table */}
            <div className="card">
              <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Customers</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ minWidth: '800px' }}>
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Phone Number</th>
                      <th>WhatsApp Number</th>
                      <th>Due Date</th>
                      <th>Total Amount Paid</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroupedCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                          {searchQuery ? 'No customers match your search' : 'No customers found for this scheme'}
                        </td>
                      </tr>
                    ) : (
                      filteredGroupedCustomers.map((group) => {
                        const isExpanded = expandedCustomers.has(group.customerId);
                        
                        // Calculate payment summary for this customer (all entries combined)
                        const memberPayments = customerPayments.filter((p: any) => {
                          const customerMatch = String(p.customerId || p.customer_id) === String(group.customerId);
                          return customerMatch;
                        });
                        
                        // Sum all payment amounts for this customer across all installments
                        const totalPaid = memberPayments.reduce((sum: number, p: any) => {
                          return sum + (Number(p.amount) || 0);
                        }, 0);
                        
                        const installmentAmount = selectedScheme.monthlyInstallment || 0;
                        // Total due = number of entries × duration × installment amount
                        const totalDue = group.totalEntries * duration * installmentAmount;
                        const remaining = totalDue - totalPaid;
                        
                        // Determine status: Paid if fully paid, Partial if some payment but not full, Pending if no payment
                        let status = 'Pending';
                        if (remaining <= 0) {
                          status = 'Paid';
                        } else if (totalPaid > 0 && totalPaid < totalDue) {
                          status = 'Partial';
                        } else {
                          status = 'Pending';
                        }
                        
                        // Calculate next due date based on scheme start
                        let nextDueDate = '-';
                        if (selectedScheme.startDate) {
                          const startDate = new Date(selectedScheme.startDate);
                          const paidCount = memberPayments.length;
                          if (selectedScheme.chitFrequency === 'week') {
                            startDate.setDate(startDate.getDate() + paidCount * 7);
                          } else {
                            startDate.setMonth(startDate.getMonth() + paidCount);
                          }
                          nextDueDate = startDate.toISOString().split('T')[0];
                        }
                        
                        return (
                          <>
                            {/* Customer header row - always visible */}
                            <tr 
                              key={`header-${group.customerId}`}
                              onClick={() => toggleCustomerExpand(group.customerId)}
                              style={{ 
                                cursor: 'pointer',
                                background: '#f8f9fa',
                                borderBottom: '2px solid #ddd'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#e9ecef';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#f8f9fa';
                              }}
                            >
                              <td style={{ whiteSpace: 'nowrap', fontWeight: '600', padding: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontSize: '14px', userSelect: 'none' }}>
                                    {isExpanded ? '▼' : '▶'}
                                  </span>
                                  <span>{group.customerName}</span>
                                  <span style={{ 
                                    fontSize: '12px', 
                                    color: '#666', 
                                    fontWeight: 'normal',
                                    marginLeft: '8px'
                                  }}>
                                    ({group.totalEntries} {group.totalEntries === 1 ? 'entry' : 'entries'} - {group.totalEntries * duration} {selectedScheme.chitFrequency === 'week' ? 'weeks' : 'months'})
                                  </span>
                                </div>
                              </td>
                              <td style={{ whiteSpace: 'nowrap', padding: '12px' }}>{group.customerPhone}</td>
                              <td style={{ whiteSpace: 'nowrap', padding: '12px' }}>{group.customerWhatsApp || '-'}</td>
                              <td style={{ whiteSpace: 'nowrap', padding: '12px' }}>{nextDueDate}</td>
                              <td style={{ whiteSpace: 'nowrap', padding: '12px' }}>{formatCurrency(totalPaid)}</td>
                              <td style={{ whiteSpace: 'nowrap', padding: '12px' }}>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  background: status === 'Paid' ? '#d4edda' : status === 'Partial' ? '#fff3cd' : '#f8d7da',
                                  color: status === 'Paid' ? '#155724' : status === 'Partial' ? '#856404' : '#721c24'
                                }}>
                                  {status}
                                </span>
                              </td>
                            </tr>
                            
                            {/* Expanded entries - shown only when expanded */}
                            {isExpanded && group.entries.map((entry: any, entryIdx: number) => {
                              // Calculate payment summary for this specific entry
                              const entryPayments = customerPayments.filter((p: any) => {
                                const customerMatch = String(p.customerId || p.customer_id) === String(group.customerId);
                                // Note: We can't distinguish payments by entryId currently, so we'll show aggregated data
                                return customerMatch;
                              });
                              
                              const entryTotalPaid = entryPayments.reduce((sum: number, p: any) => {
                                return sum + (Number(p.amount) || 0);
                              }, 0) / group.totalEntries; // Divide by total entries to show per-entry average
                              
                              const entryTotalDue = duration * installmentAmount;
                              const entryRemaining = entryTotalDue - entryTotalPaid;
                              
                              let entryStatus = 'Pending';
                              if (entryRemaining <= 0) {
                                entryStatus = 'Paid';
                              } else if (entryTotalPaid > 0 && entryTotalPaid < entryTotalDue) {
                                entryStatus = 'Partial';
                              } else {
                                entryStatus = 'Pending';
                              }
                              
                              return (
                                <tr 
                                  key={`entry-${entry.entryId || entry.id}-${entryIdx}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEntryClick(group.customerId, entry.entryId || entry.id);
                                  }}
                                  style={{ 
                                    cursor: 'pointer',
                                    background: 'white',
                                    borderLeft: '3px solid #007bff'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f5f5f5';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'white';
                                  }}
                                >
                                  <td style={{ whiteSpace: 'nowrap', paddingLeft: '30px', fontWeight: '500' }}>
                                    Entry #{entry.entryNumber || (entryIdx + 1)}
                                  </td>
                                  <td style={{ whiteSpace: 'nowrap' }}>{entry.phone}</td>
                                  <td style={{ whiteSpace: 'nowrap' }}>{entry.whatsappNumber || '-'}</td>
                                  <td style={{ whiteSpace: 'nowrap' }}>{nextDueDate}</td>
                                  <td style={{ whiteSpace: 'nowrap' }}>{formatCurrency(entryTotalPaid)}</td>
                                  <td style={{ whiteSpace: 'nowrap' }}>
                                    <span style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      background: entryStatus === 'Paid' ? '#d4edda' : entryStatus === 'Partial' ? '#fff3cd' : '#f8d7da',
                                      color: entryStatus === 'Paid' ? '#155724' : entryStatus === 'Partial' ? '#856404' : '#721c24'
                                    }}>
                                      {entryStatus}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            
                            {/* Grand Summary Table - shown when expanded */}
                            {isExpanded && (() => {
                              // Calculate summary from payment schedule data or from existing payments
                              let customerScheduleRows: any[] = [];
                              
                              if (paymentScheduleData && paymentScheduleData.rows) {
                                // Use payment schedule data if available
                                customerScheduleRows = paymentScheduleData.rows.filter((r: any) => 
                                  String(r.customerId) === String(group.customerId)
                                );
                              } else {
                                // Fallback: Calculate from existing payments and scheme data
                                // Generate rows for each entry × duration
                                const schemeStartDate = selectedScheme.startDate ? new Date(selectedScheme.startDate) : new Date();
                                group.entries.forEach((entry: any) => {
                                  for (let month = 1; month <= duration; month++) {
                                    const dueDate = new Date(schemeStartDate);
                                    if (selectedScheme.chitFrequency === 'week') {
                                      dueDate.setDate(dueDate.getDate() + (month - 1) * 7);
                                    } else {
                                      dueDate.setMonth(dueDate.getMonth() + (month - 1));
                                    }
                                    
                                    // Find payment for this customer, month
                                    const payments = customerPayments.filter((p: any) => {
                                      const customerMatch = String(p.customerId || p.customer_id) === String(group.customerId);
                                      const monthMatch = Number(p.month) === month || Number(p.installmentNumber) === month;
                                      return customerMatch && monthMatch;
                                    });
                                    
                                    const paidAmount = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
                                    const dueAmount = installmentAmount;
                                    
                                    // Determine status
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const dueDateOnly = new Date(dueDate);
                                    dueDateOnly.setHours(0, 0, 0, 0);
                                    
                                    let status = 'pending';
                                    if (paidAmount >= dueAmount) {
                                      status = 'paid';
                                    } else if (dueDateOnly < today) {
                                      status = 'overdue';
                                    }
                                    
                                    customerScheduleRows.push({
                                      entryId: entry.entryId || entry.id,
                                      customerId: group.customerId,
                                      month,
                                      dueDate: dueDate.toISOString().split('T')[0],
                                      dueAmount,
                                      paidAmount,
                                      status
                                    });
                                  }
                                });
                              }
                              
                              // Group by entryId
                              const entryMap = new Map<string, any[]>();
                              customerScheduleRows.forEach((row: any) => {
                                if (!entryMap.has(row.entryId)) {
                                  entryMap.set(row.entryId, []);
                                }
                                entryMap.get(row.entryId)!.push(row);
                              });
                              
                              const entryIds = Array.from(entryMap.keys()).sort();
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              
                              const entrySummaries = entryIds.map((entryId, idx) => {
                                const rows = entryMap.get(entryId)!;
                                const overdueRows = rows.filter((r: any) => {
                                  const dueDate = new Date(r.dueDate);
                                  dueDate.setHours(0, 0, 0, 0);
                                  return r.status === 'overdue' || (dueDate < today && r.paidAmount < r.dueAmount);
                                });
                                const pendingRows = rows.filter((r: any) => {
                                  const dueDate = new Date(r.dueDate);
                                  dueDate.setHours(0, 0, 0, 0);
                                  return (r.status === 'pending' || (dueDate >= today && r.paidAmount < r.dueAmount));
                                });
                                
                                const overdueAmount = overdueRows.reduce((sum, r) => sum + (r.dueAmount - r.paidAmount), 0);
                                const pendingAmount = pendingRows.reduce((sum, r) => sum + (r.dueAmount - r.paidAmount), 0);
                                const totalPendingForEntry = overdueAmount + pendingAmount;
                                
                                const overdueDates = overdueRows.map((r: any) => r.dueDate).filter(Boolean).sort();
                                const pendingDates = pendingRows.map((r: any) => r.dueDate).filter(Boolean).sort();
                                
                                // Pending months count (all unpaid); Overdue months count (per admin rule: above X months = overdue)
                                const pendingMonthsCount = overdueRows.length + pendingRows.length;
                                const overdueMonthsCount = overdueRows.length;
                                
                                const pendingPastDueDates = overdueRows.map((r: any) => r.dueDate).filter(Boolean).sort();
                                const futureUnpaidRows = pendingRows.filter((r: any) => {
                                  const d = new Date(r.dueDate);
                                  d.setHours(0, 0, 0, 0);
                                  return d >= today;
                                });
                                const upcomingDates = futureUnpaidRows.map((r: any) => r.dueDate).filter(Boolean).sort().slice(0, 2);
                                
                                // Find entry number from group.entries
                                const entry = group.entries.find((e: any) => (e.entryId || e.id) === entryId);
                                const entryNumber = entry?.entryNumber || (idx + 1);
                                
                                return {
                                  entryNo: entryNumber,
                                  entryId,
                                  pendingMonthsCount,
                                  overdueMonthsCount,
                                  totalPendingAmount: totalPendingForEntry,
                                  overdueAmount,
                                  overdueDate: overdueDates.length > 0 
                                    ? (overdueDates.length <= 2 
                                        ? overdueDates.join(', ') 
                                        : `${overdueDates[0]} ... ${overdueDates[overdueDates.length - 1]} (${overdueDates.length})`)
                                    : '-',
                                  pendingPastDueDates,
                                  upcomingDates,
                                  pendingDates,
                                  installmentAmount: pendingAmount
                                };
                              });
                              
                              const grandOverdueAmount = entrySummaries.reduce((s, e) => s + e.overdueAmount, 0);
                              const grandTotalPending = entrySummaries.reduce((s, e) => s + e.totalPendingAmount, 0);
                              const grandPendingMonths = entrySummaries.reduce((s, e) => s + e.pendingMonthsCount, 0);
                              const grandOverdueMonths = entrySummaries.reduce((s, e) => s + (e.overdueMonthsCount || 0), 0);
                              
                              // Only render if we have entries
                              if (entrySummaries.length === 0) {
                                return null;
                              }
                              
                              return (
                                <tr key={`summary-${group.customerId}`}>
                                  <td colSpan={6} style={{ padding: 0, verticalAlign: 'top', borderTop: '3px solid #007bff' }}>
                                    <div style={{ padding: '20px', background: '#f8f9fa', margin: 0 }}>
                                      <h4 style={{ margin: '0 0 15px 0', color: '#007bff', fontSize: '16px' }}>
                                        Grand Total Summary - {group.customerName}
                                      </h4>
                                      <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                                        Overdue rule: above {selectedScheme?.overdueAfterMonths ?? 3} consecutive unpaid {selectedScheme.chitFrequency === 'week' ? 'weeks' : 'months'} = overdue
                                      </div>
                                      <div style={{ overflowX: 'auto' }}>
                                        <table className="table" style={{ minWidth: '700px', marginBottom: 0, background: 'white' }}>
                                          <thead>
                                            <tr style={{ background: '#e7f3ff' }}>
                                              <th style={{ whiteSpace: 'nowrap' }}>Entry No</th>
                                              <th style={{ whiteSpace: 'nowrap' }}>Pending months</th>
                                              <th style={{ whiteSpace: 'nowrap' }}>Overdue months</th>
                                              <th style={{ whiteSpace: 'nowrap' }}>Pending amount</th>
                                              <th style={{ whiteSpace: 'nowrap' }}>Pending overdue amount</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {entrySummaries.map((es) => (
                                              <tr key={es.entryId}>
                                                <td style={{ fontWeight: '600' }}>Entry #{es.entryNo}</td>
                                                <td style={{ whiteSpace: 'nowrap', fontWeight: '600', color: es.pendingMonthsCount > 0 ? '#856404' : undefined }}>
                                                  {es.pendingMonthsCount} {selectedScheme.chitFrequency === 'week' ? 'weeks' : 'months'}
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap', fontWeight: '500', color: es.overdueMonthsCount > 0 ? '#dc3545' : undefined }}>
                                                  {es.overdueMonthsCount} {selectedScheme.chitFrequency === 'week' ? 'weeks' : 'months'}
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap', color: es.totalPendingAmount > 0 ? '#856404' : undefined, fontWeight: '500' }}>
                                                  {formatCurrency(es.totalPendingAmount)}
                                                  {es.pendingMonthsCount > 0 && (
                                                    <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>
                                                      ({es.pendingMonthsCount} × {formatCurrency(selectedScheme.monthlyInstallment || 0)})
                                                    </span>
                                                  )}
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap', color: es.overdueAmount > 0 ? '#dc3545' : undefined, fontWeight: '500' }}>
                                                  {formatCurrency(es.overdueAmount)}
                                                  {es.overdueMonthsCount > 0 && (
                                                    <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>
                                                      ({es.overdueMonthsCount} × {formatCurrency(selectedScheme.monthlyInstallment || 0)})
                                                    </span>
                                                  )}
                                                </td>
                                              </tr>
                                            ))}
                                            <tr style={{ background: '#e7f3ff', fontWeight: '700', borderTop: '2px solid #007bff' }}>
                                              <td style={{ textAlign: 'right', paddingRight: '12px' }}>Grand total</td>
                                              <td style={{ whiteSpace: 'nowrap', color: grandPendingMonths > 0 ? '#856404' : undefined }}>{grandPendingMonths} {selectedScheme.chitFrequency === 'week' ? 'weeks' : 'months'}</td>
                                              <td style={{ whiteSpace: 'nowrap', color: grandOverdueMonths > 0 ? '#dc3545' : undefined }}>{grandOverdueMonths} {selectedScheme.chitFrequency === 'week' ? 'weeks' : 'months'}</td>
                                              <td style={{ whiteSpace: 'nowrap', fontSize: '15px', color: '#007bff' }}>{formatCurrency(grandTotalPending)}</td>
                                              <td style={{ whiteSpace: 'nowrap', fontSize: '15px', color: grandOverdueAmount > 0 ? '#dc3545' : undefined }}>{formatCurrency(grandOverdueAmount)}</td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })()}
                          </>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Show Installment/Payment Table when customer is selected */}
      {selectedCustomerId && selectedSchemeId && (() => {
        const selectedScheme = schemes.find(s => s.id === selectedSchemeId);
        const selectedCustomerGroup = groupedCustomers.find(g => g.customerId === selectedCustomerId);
        const duration = selectedScheme?.chitFrequency === 'week' 
          ? (selectedScheme?.duration || 0) * 4 
          : (selectedScheme?.duration || 0);
        const installmentAmount = selectedScheme?.monthlyInstallment || 0;
        
        if (!selectedScheme || !selectedCustomerGroup) return null;
        
        // Generate installment rows - if entryId is selected, show only that entry's rows
        const installmentRows: {
          entryId: string;
          entryNumber: number;
          installmentNumber: number;
          dueDate: string;
          installmentAmount: number;
          paidAmount: number;
          paymentDate: string;
          status: string;
        }[] = [];
        const schemeStartDate = selectedScheme?.startDate ? new Date(selectedScheme.startDate) : new Date();
        
        // Determine which entries to process
        const entriesToProcess = selectedEntryId 
          ? selectedCustomerGroup.entries.filter((e: any) => (e.entryId || e.id) === selectedEntryId)
          : selectedCustomerGroup.entries;
        
        // Loop through each entry (or just the selected one)
        entriesToProcess.forEach((entry: any, entryIdx: number) => {
          // For each entry, generate rows for all months
          for (let i = 1; i <= duration; i++) {
          // Find all payments for this installment (match by month/installmentNumber field)
          // Check both customerId formats and installment number formats
          // Sum all payments for this installment in case there are multiple records
          const payments = customerPayments.filter((p: any) => {
            const customerMatch = String(p.customerId || p.customer_id) === String(selectedCustomerId);
            const installmentMatch = 
              Number(p.month) === i || 
              Number(p.installmentNumber) === i || 
              Number(p.installment_number) === i;
            return customerMatch && installmentMatch;
          });
          
          // Sum all payment amounts for this installment
          const paidAmount = payments.reduce((sum: number, p: any) => {
            return sum + (Number(p.amount) || 0);
          }, 0);
          
          // Get the most recent payment date
          const latestPayment = payments.length > 0 
            ? payments.reduce((latest: any, current: any) => {
                const currentDate = current.paymentDate || current.payment_date || current.date || '';
                const latestDate = latest.paymentDate || latest.payment_date || latest.date || '';
                return currentDate > latestDate ? current : latest;
              })
            : null;
          
          // Calculate due date based on frequency
          const dueDate = new Date(schemeStartDate);
          if (selectedScheme?.chitFrequency === 'week') {
            dueDate.setDate(dueDate.getDate() + (i - 1) * 7);
          } else {
            dueDate.setMonth(dueDate.getMonth() + (i - 1));
          }
          
          // Format payment date if it exists
          let formattedPaymentDate = '';
          
          if (latestPayment && latestPayment.paymentDate) {
            const paymentDateValue = latestPayment.paymentDate || latestPayment.payment_date || latestPayment.date || '';
            if (paymentDateValue) {
              // If it's already a date string, use it; otherwise format it
              formattedPaymentDate = typeof paymentDateValue === 'string' 
                ? paymentDateValue.split('T')[0] // Extract date part if it includes time
                : new Date(paymentDateValue).toISOString().split('T')[0];
            }
          }
          
          // Determine status based on payment amount and due date
          let status = 'Pending';
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time to compare dates only
          const dueDateOnly = new Date(dueDate);
          dueDateOnly.setHours(0, 0, 0, 0);
          
          if (paidAmount >= installmentAmount) {
            // Fully paid
            status = 'Paid';
          } else if (paidAmount > 0 && paidAmount < installmentAmount) {
            // Partially paid - check if overdue
            if (dueDateOnly < today) {
              status = 'Overdue';
            } else {
              status = 'Pending';
            }
          } else {
            // Not paid at all - check if overdue
            if (dueDateOnly < today) {
              status = 'Overdue';
            } else {
              status = 'Pending';
            }
          }
          
            installmentRows.push({
              entryId: entry.entryId || entry.id,
              entryNumber: entry.entryNumber || (entryIdx + 1),
              installmentNumber: i,
              dueDate: dueDate.toISOString().split('T')[0],
              installmentAmount,
              paidAmount,
              paymentDate: formattedPaymentDate,
              status
            });
          }
        });
        
        return (
          <div>
            {/* Back Button and Customer Info */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <button
                onClick={handleBackToCustomers}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '15px'
                }}
              >
                ← Back to Customers
              </button>
              <h2 style={{ margin: 0, color: '#007bff' }}>{selectedCustomerGroup.customerName} - {selectedScheme.name}</h2>
              <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                <span><strong>Phone:</strong> {selectedCustomerGroup.customerPhone}</span>
                {selectedEntryId ? (
                  <>
                    <span style={{ marginLeft: '20px' }}><strong>Viewing Entry:</strong> #{selectedCustomerGroup.entries.find((e: any) => (e.entryId || e.id) === selectedEntryId)?.entryNumber || 'N/A'}</span>
                    <span style={{ marginLeft: '20px' }}><strong>Total EMI(s):</strong> {duration}</span>
                  </>
                ) : (
                  <>
                    <span style={{ marginLeft: '20px' }}><strong>Entries:</strong> {selectedCustomerGroup.totalEntries}</span>
                    <span style={{ marginLeft: '20px' }}><strong>Total EMI(s):</strong> {selectedCustomerGroup.totalEntries * duration}</span>
                  </>
                )}
              </div>
            </div>

            {/* Installment/Payment Table */}
            <div className="card">
              <h3 style={{ marginTop: 0, marginBottom: '15px' }}>
                {selectedEntryId 
                  ? `Installment Details - Entry #${selectedCustomerGroup.entries.find((e: any) => (e.entryId || e.id) === selectedEntryId)?.entryNumber || 'N/A'} (${duration} ${selectedScheme?.chitFrequency === 'week' ? 'weeks' : 'months'})`
                  : `Installment Details (${selectedCustomerGroup.totalEntries} ${selectedCustomerGroup.totalEntries === 1 ? 'entry' : 'entries'} × ${duration} ${selectedScheme?.chitFrequency === 'week' ? 'weeks' : 'months'} = ${selectedCustomerGroup.totalEntries * duration} rows)`
                }
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ minWidth: '1000px' }}>
                  <thead>
                    <tr>
                      {!selectedEntryId && <th>Entry #</th>}
                      <th>Installment #</th>
                      <th>Due Date</th>
                      <th>Installment Amount</th>
                      <th>Amount Paid</th>
                      <th>Payment Date</th>
                      <th>Status</th>
                      <th>Enter Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installmentRows.map((row, idx) => (
                      <tr key={`${row.entryId}-${row.installmentNumber}-${idx}`}>
                        {!selectedEntryId && (
                          <td style={{ fontWeight: '600', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            #{row.entryNumber}
                          </td>
                        )}
                        <td style={{ fontWeight: '600', textAlign: 'center', whiteSpace: 'nowrap' }}>{row.installmentNumber}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{row.dueDate || '-'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatCurrency(row.installmentAmount)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{row.paidAmount > 0 ? formatCurrency(row.paidAmount) : '-'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{row.paymentDate || '-'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            background: 
                              row.status === 'Paid' ? '#d4edda' : 
                              row.status === 'Overdue' ? '#f8d7da' : 
                              '#fff3cd',
                            color: 
                              row.status === 'Paid' ? '#155724' : 
                              row.status === 'Overdue' ? '#721c24' : 
                              '#856404'
                          }}>
                            {row.status}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {editingPayment?.installmentNumber === row.installmentNumber ? (
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                              <input
                                type="number"
                                placeholder="Amount"
                                value={editingPayment.amount}
                                onChange={(e) => setEditingPayment({ ...editingPayment, amount: e.target.value })}
                                style={{
                                  padding: '4px 8px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  width: '100px'
                                }}
                              />
                              <input
                                type="date"
                                value={editingPayment.date}
                                onChange={(e) => setEditingPayment({ ...editingPayment, date: e.target.value })}
                                style={{
                                  padding: '4px 8px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '12px'
                                }}
                              />
                              <button
                                onClick={() => {
                                  if (editingPayment.amount && editingPayment.date) {
                                    handlePaymentEntry(row.installmentNumber, editingPayment.amount, editingPayment.date);
                                  }
                                }}
                                style={{
                                  padding: '4px 8px',
                                  background: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingPayment(null)}
                                style={{
                                  padding: '4px 8px',
                                  background: '#6c757d',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingPayment({ 
                                installmentNumber: row.installmentNumber, 
                                amount: row.paidAmount > 0 ? String(row.installmentAmount - row.paidAmount) : '', 
                                date: new Date().toISOString().split('T')[0] 
                              })}
                              disabled={row.status === 'Paid'}
                              style={{
                                padding: '4px 8px',
                                background: row.status === 'Paid' ? '#6c757d' : '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: row.status === 'Paid' ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                                opacity: row.status === 'Paid' ? 0.6 : 1
                              }}
                            >
                              {row.status === 'Paid' ? 'Paid' : row.paidAmount > 0 ? 'Add Payment' : 'Enter Payment'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grand Summary Section - hidden when a particular entry is selected */}
            {!selectedEntryId && (() => {
              // Calculate summary for each entry
              const entrySummaries: Record<string, {
                entryNumber: number;
                pendingCount: number;
                overdueCount: number;
                paidCount: number;
                pendingDueDates: string[];
                overdueDueDates: string[];
                totalDueAmount: number;
                totalPaidAmount: number;
                totalPendingAmount: number;
                totalOverdueAmount: number;
              }> = {};

              installmentRows.forEach((row) => {
                const entryKey = row.entryId;
                if (!entrySummaries[entryKey]) {
                  entrySummaries[entryKey] = {
                    entryNumber: row.entryNumber,
                    pendingCount: 0,
                    overdueCount: 0,
                    paidCount: 0,
                    pendingDueDates: [],
                    overdueDueDates: [],
                    totalDueAmount: 0,
                    totalPaidAmount: 0,
                    totalPendingAmount: 0,
                    totalOverdueAmount: 0
                  };
                }

                const summary = entrySummaries[entryKey];
                summary.totalDueAmount += row.installmentAmount;
                summary.totalPaidAmount += row.paidAmount;

                if (row.status === 'Paid') {
                  summary.paidCount++;
                } else if (row.status === 'Overdue') {
                  summary.overdueCount++;
                  summary.overdueDueDates.push(row.dueDate);
                  summary.totalOverdueAmount += (row.installmentAmount - row.paidAmount);
                } else if (row.status === 'Pending') {
                  summary.pendingCount++;
                  summary.pendingDueDates.push(row.dueDate);
                  summary.totalPendingAmount += (row.installmentAmount - row.paidAmount);
                }
              });

              // Calculate grand totals
              const grandTotals = {
                totalEntries: Object.keys(entrySummaries).length,
                totalPendingCount: 0,
                totalOverdueCount: 0,
                totalPaidCount: 0,
                totalDueAmount: 0,
                totalPaidAmount: 0,
                totalPendingAmount: 0,
                totalOverdueAmount: 0
              };

              Object.values(entrySummaries).forEach(summary => {
                grandTotals.totalPendingCount += summary.pendingCount;
                grandTotals.totalOverdueCount += summary.overdueCount;
                grandTotals.totalPaidCount += summary.paidCount;
                grandTotals.totalDueAmount += summary.totalDueAmount;
                grandTotals.totalPaidAmount += summary.totalPaidAmount;
                grandTotals.totalPendingAmount += summary.totalPendingAmount;
                grandTotals.totalOverdueAmount += summary.totalOverdueAmount;
              });

              return (
                <div className="card" style={{ marginTop: '20px' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#007bff' }}>Grand Summary</h3>
                  
                  {/* Entry-wise Summary */}
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ marginBottom: '15px', color: '#333', fontSize: '16px' }}>Entry-wise Summary</h4>
                    <div style={{ display: 'grid', gap: '15px' }}>
                      {Object.values(entrySummaries)
                        .sort((a, b) => a.entryNumber - b.entryNumber)
                        .map((summary) => {
                          const earliestPendingDate = summary.pendingDueDates.length > 0 
                            ? summary.pendingDueDates.sort()[0] 
                            : null;
                          const latestPendingDate = summary.pendingDueDates.length > 0 
                            ? summary.pendingDueDates.sort().reverse()[0] 
                            : null;
                          const earliestOverdueDate = summary.overdueDueDates.length > 0 
                            ? summary.overdueDueDates.sort()[0] 
                            : null;
                          const latestOverdueDate = summary.overdueDueDates.length > 0 
                            ? summary.overdueDueDates.sort().reverse()[0] 
                            : null;

                          return (
                            <div 
                              key={summary.entryNumber}
                              style={{
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                padding: '15px',
                                background: '#f8f9fa'
                              }}
                            >
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '10px'
                              }}>
                                <h5 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#007bff' }}>
                                  Entry #{summary.entryNumber}
                                </h5>
                                <div style={{ display: 'flex', gap: '15px', fontSize: '14px' }}>
                                  <span style={{ color: '#28a745' }}>Paid: {summary.paidCount}</span>
                                  <span style={{ color: '#ffc107' }}>Pending: {summary.pendingCount}</span>
                                  <span style={{ color: '#dc3545' }}>Overdue: {summary.overdueCount}</span>
                                </div>
                              </div>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', fontSize: '14px' }}>
                                {summary.pendingCount > 0 && (
                                  <div>
                                    <strong style={{ color: '#666' }}>Pending Installments:</strong>
                                    <div style={{ marginTop: '5px' }}>
                                      <div>Count: <strong>{summary.pendingCount}</strong></div>
                                      {earliestPendingDate && (
                                        <div>Earliest Due: <strong>{earliestPendingDate}</strong></div>
                                      )}
                                      {latestPendingDate && latestPendingDate !== earliestPendingDate && (
                                        <div>Latest Due: <strong>{latestPendingDate}</strong></div>
                                      )}
                                      <div style={{ marginTop: '5px', color: '#ffc107', fontWeight: '600' }}>
                                        Due Amount: {formatCurrency(summary.totalPendingAmount)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {summary.overdueCount > 0 && (
                                  <div>
                                    <strong style={{ color: '#666' }}>Overdue Installments:</strong>
                                    <div style={{ marginTop: '5px' }}>
                                      <div>Count: <strong>{summary.overdueCount}</strong></div>
                                      {earliestOverdueDate && (
                                        <div>Earliest Due: <strong>{earliestOverdueDate}</strong></div>
                                      )}
                                      {latestOverdueDate && latestOverdueDate !== earliestOverdueDate && (
                                        <div>Latest Due: <strong>{latestOverdueDate}</strong></div>
                                      )}
                                      <div style={{ marginTop: '5px', color: '#dc3545', fontWeight: '600' }}>
                                        Overdue Amount: {formatCurrency(summary.totalOverdueAmount)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                <div>
                                  <strong style={{ color: '#666' }}>Total Summary:</strong>
                                  <div style={{ marginTop: '5px' }}>
                                    <div>Total Due: {formatCurrency(summary.totalDueAmount)}</div>
                                    <div>Total Paid: <span style={{ color: '#28a745' }}>{formatCurrency(summary.totalPaidAmount)}</span></div>
                                    <div style={{ marginTop: '5px', fontWeight: '600' }}>
                                      Remaining: {formatCurrency(summary.totalDueAmount - summary.totalPaidAmount)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div style={{
                    border: '2px solid #007bff',
                    borderRadius: '8px',
                    padding: '20px',
                    background: 'linear-gradient(135deg, #e7f3ff 0%, #cfe2ff 100%)',
                    marginTop: '20px'
                  }}>
                    <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#007bff', fontSize: '18px' }}>
                      Grand Total (All Entries)
                    </h4>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '20px',
                      fontSize: '15px'
                    }}>
                      <div>
                        <div style={{ color: '#666', marginBottom: '5px' }}>Total Entries:</div>
                        <div style={{ fontSize: '20px', fontWeight: '600', color: '#007bff' }}>
                          {grandTotals.totalEntries}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#666', marginBottom: '5px' }}>Paid Installments:</div>
                        <div style={{ fontSize: '20px', fontWeight: '600', color: '#28a745' }}>
                          {grandTotals.totalPaidCount}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#666', marginBottom: '5px' }}>Pending Installments:</div>
                        <div style={{ fontSize: '20px', fontWeight: '600', color: '#ffc107' }}>
                          {grandTotals.totalPendingCount}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#666', marginBottom: '5px' }}>Overdue Installments:</div>
                        <div style={{ fontSize: '20px', fontWeight: '600', color: '#dc3545' }}>
                          {grandTotals.totalOverdueCount}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#666', marginBottom: '5px' }}>Total Due Amount:</div>
                        <div style={{ fontSize: '20px', fontWeight: '600', color: '#333' }}>
                          {formatCurrency(grandTotals.totalDueAmount)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#666', marginBottom: '5px' }}>Total Paid Amount:</div>
                        <div style={{ fontSize: '20px', fontWeight: '600', color: '#28a745' }}>
                          {formatCurrency(grandTotals.totalPaidAmount)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#666', marginBottom: '5px' }}>Total Pending Amount:</div>
                        <div style={{ fontSize: '20px', fontWeight: '600', color: '#ffc107' }}>
                          {formatCurrency(grandTotals.totalPendingAmount)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#666', marginBottom: '5px' }}>Total Overdue Amount:</div>
                        <div style={{ fontSize: '20px', fontWeight: '600', color: '#dc3545' }}>
                          {formatCurrency(grandTotals.totalOverdueAmount)}
                        </div>
                      </div>
                      <div style={{ gridColumn: '1 / -1', marginTop: '10px', paddingTop: '15px', borderTop: '2px solid #007bff' }}>
                        <div style={{ color: '#666', marginBottom: '5px', fontSize: '16px' }}>Remaining Balance:</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#007bff' }}>
                          {formatCurrency(grandTotals.totalDueAmount - grandTotals.totalPaidAmount)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}
    </div>
  );
}

