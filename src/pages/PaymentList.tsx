import { useEffect, useState, useMemo } from 'react';
import { apiService } from '../services/api';
import { ChitScheme, PaymentSchedule, PaymentScheduleRow } from '../types';
import Pagination from '../components/Pagination';

export default function PaymentList() {
  const [schemes, setSchemes] = useState<ChitScheme[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('');
  const [schedule, setSchedule] = useState<PaymentSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});
  const [interestInputs, setInterestInputs] = useState<Record<string, string>>({});
  const [processingPayments, setProcessingPayments] = useState<Set<string>>(new Set());
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSchemes();
  }, []);

  useEffect(() => {
    if (selectedSchemeId) {
      loadPaymentSchedule(selectedSchemeId);
      // Start with all customers collapsed
      setExpandedCustomers(new Set());
    } else {
      setSchedule(null);
      setExpandedCustomers(new Set());
    }
    setSearchQuery('');
  }, [selectedSchemeId]);

  const toggleCustomer = (customerId: string) => {
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

  const loadSchemes = async () => {
    try {
      const data = await apiService.getSchemes();
      setSchemes(data);
    } catch (error) {
      console.error('Failed to load schemes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentSchedule = async (schemeId: string) => {
    try {
      setLoading(true);
      const data = await apiService.getPaymentSchedule(schemeId);
      setSchedule(data);
    } catch (error) {
      console.error('Failed to load payment schedule:', error);
      alert('Failed to load payment schedule');
    } finally {
      setLoading(false);
    }
  };

  // Group rows by customer
  const groupedRows = useMemo(() => {
    if (!schedule) return [];
    
    const grouped: Record<string, PaymentScheduleRow[]> = {};
    schedule.rows.forEach(row => {
      if (!grouped[row.customerId]) {
        grouped[row.customerId] = [];
      }
      grouped[row.customerId].push(row);
    });
    
    return Object.entries(grouped).map(([customerId, rows]) => ({
      customerId,
      customerName: rows[0].customerName,
      customerPhone: rows[0].customerPhone || '',
      customerEmail: rows[0].customerEmail || '',
      rows: rows.sort((a, b) => {
        // Sort by entryId first (to group by membership), then by month
        if (a.entryId !== b.entryId) {
          return a.entryId.localeCompare(b.entryId);
        }
        return a.month - b.month;
      })
    }));
  }, [schedule]);

  // Filter by search query (customer name, phone, email) and paginate
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return groupedRows;
    const q = searchQuery.trim().toLowerCase();
    return groupedRows.filter(
      g =>
        (g.customerName || '').toLowerCase().includes(q) ||
        (g.customerPhone || '').toLowerCase().includes(q) ||
        (g.customerEmail || '').toLowerCase().includes(q)
    );
  }, [groupedRows, searchQuery]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGroups = filteredRows.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePaymentInputChange = (rowKey: string, value: string) => {
    setPaymentInputs(prev => ({ ...prev, [rowKey]: value }));
  };

  const handleInterestInputChange = (rowKey: string, value: string) => {
    setInterestInputs(prev => ({ ...prev, [rowKey]: value }));
  };

  const getRowKey = (row: PaymentScheduleRow) => {
    return `${row.customerId}-${row.entryId}-${row.month}`;
  };

  const handleEnterPayment = async (row: PaymentScheduleRow) => {
    const rowKey = getRowKey(row);
    const amountStr = paymentInputs[rowKey];
    
    if (!amountStr || parseFloat(amountStr) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    const amount = parseFloat(amountStr);
    setProcessingPayments(prev => new Set(prev).add(rowKey));

    try {
      await apiService.createPayment({
        customerId: row.customerId,
        schemeId: selectedSchemeId,
        amount: amount,
        paymentDate: new Date().toISOString().split('T')[0],
        installmentNumber: row.month
      });
      
      // Clear input and reload schedule
      setPaymentInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[rowKey];
        return newInputs;
      });
      
      if (selectedSchemeId) {
        await loadPaymentSchedule(selectedSchemeId);
      }
    } catch (error: any) {
      console.error('Failed to record payment:', error);
      alert(error.message || 'Failed to record payment');
    } finally {
      setProcessingPayments(prev => {
        const newSet = new Set(prev);
        newSet.delete(rowKey);
        return newSet;
      });
    }
  };

  const handleAddInterest = async (row: PaymentScheduleRow) => {
    const rowKey = getRowKey(row);
    const interestStr = interestInputs[rowKey];
    
    if (!interestStr || parseFloat(interestStr) <= 0) {
      alert('Please enter a valid interest amount');
      return;
    }

    const interestAmount = parseFloat(interestStr);
    setProcessingPayments(prev => new Set(prev).add(rowKey));

    try {
      // Add interest as a payment (you may want to create a separate interest endpoint)
      await apiService.createPayment({
        customerId: row.customerId,
        schemeId: selectedSchemeId,
        amount: interestAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        installmentNumber: row.month
      });
      
      // Clear input and reload schedule
      setInterestInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[rowKey];
        return newInputs;
      });
      
      if (selectedSchemeId) {
        await loadPaymentSchedule(selectedSchemeId);
      }
    } catch (error: any) {
      console.error('Failed to add interest:', error);
      alert(error.message || 'Failed to add interest');
    } finally {
      setProcessingPayments(prev => {
        const newSet = new Set(prev);
        newSet.delete(rowKey);
        return newSet;
      });
    }
  };

  const getTotalStats = () => {
    if (!schedule) return { totalDue: 0, totalPaid: 0, totalPending: 0 };
    
    let totalDue = 0;
    let totalPaid = 0;
    let totalPending = 0;
    
    schedule.rows.forEach(row => {
      totalDue += row.dueAmount;
      totalPaid += row.paidAmount;
      if (row.status === 'pending' || row.status === 'overdue') {
        totalPending += row.dueAmount - row.paidAmount;
      }
    });
    
    return { totalDue, totalPaid, totalPending };
  };

  const stats = getTotalStats();

  if (loading && !schedule) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '15px', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, color: '#333' }}>Payment Management</h1>
        {schedule && (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#28a745',
              padding: '8px 16px',
              background: '#d4edda',
              borderRadius: '6px',
              border: '1px solid #c3e6cb'
            }}>
              Total Paid: {formatCurrency(stats.totalPaid)}
            </div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#ffc107',
              padding: '8px 16px',
              background: '#fff3cd',
              borderRadius: '6px',
              border: '1px solid #ffeaa7'
            }}>
              Total Pending: {formatCurrency(stats.totalPending)}
            </div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#007bff',
              padding: '8px 16px',
              background: '#e7f3ff',
              borderRadius: '6px',
              border: '1px solid #b3d9ff'
            }}>
              Total Due: {formatCurrency(stats.totalDue)}
            </div>
          </div>
        )}
      </div>

      {/* Scheme Selection & Search */}
      <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', color: '#666', fontWeight: '500', whiteSpace: 'nowrap' }}>Select Chit Scheme:</span>
          <select
            value={selectedSchemeId}
            onChange={(e) => {
              setSelectedSchemeId(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '250px',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">-- Select Scheme --</option>
            {schemes.map(scheme => (
              <option key={scheme.id} value={scheme.id}>
                {scheme.name} ({scheme.duration} months)
              </option>
            ))}
          </select>
          {schedule && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="payment-customer-search" style={{ fontSize: '14px', color: '#666', fontWeight: '500', whiteSpace: 'nowrap' }}>
                Search Customer:
              </label>
              <input
                id="payment-customer-search"
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
          {schedule && (
            <div style={{ fontSize: '14px', color: '#666' }}>
              <strong>{schedule.schemeName}</strong> - {schedule.duration} months - {formatCurrency(schedule.monthlyInstallment)}/month
            </div>
          )}
        </div>
      </div>

      {!selectedSchemeId ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          Please select a chit scheme to view payment schedule
        </div>
      ) : loading ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>Loading payment schedule...</div>
      ) : !schedule || paginatedGroups.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          No customers found for this scheme
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ minWidth: '1600px' }}>
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>Customer Name</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Phone</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Month</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Due Date</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Due Amount</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Paid Date</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Paid Amount</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ whiteSpace: 'nowrap', width: '300px' }}>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGroups.map((group, groupIdx) => {
                    const isExpanded = expandedCustomers.has(group.customerId);
                    const totalRows = group.rows.length;
                    
                    return (
                      <>
                        {/* Customer header row - always visible */}
                        <tr 
                          key={`header-${group.customerId}`}
                          style={{ 
                            background: '#f8f9fa',
                            cursor: 'pointer',
                            borderBottom: '2px solid #ddd'
                          }}
                          onClick={() => toggleCustomer(group.customerId)}
                        >
                          <td style={{ 
                            whiteSpace: 'nowrap', 
                            fontWeight: '600',
                            padding: '12px',
                            borderRight: '2px solid #ddd'
                          }}>
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
                                ({totalRows} {totalRows === 1 ? 'record' : 'records'})
                              </span>
                            </div>
                          </td>
                          <td style={{ 
                            whiteSpace: 'nowrap',
                            padding: '12px',
                            borderRight: '2px solid #ddd'
                          }}>
                            {group.customerPhone || 'N/A'}
                          </td>
                          <td colSpan={7} style={{ padding: '12px', color: '#666', fontStyle: 'italic' }}>
                            {isExpanded ? 'Click to collapse' : 'Click to expand payment records'}
                          </td>
                        </tr>
                        
                        {/* Payment rows - shown only when expanded */}
                        {isExpanded && group.rows.map((row, rowIdx) => {
                          const rowKey = getRowKey(row);
                          const isProcessing = processingPayments.has(rowKey);
                          
                          return (
                            <tr key={rowKey} style={{ background: row.status === 'overdue' ? '#fff5f5' : 'white' }}>
                              <td style={{ whiteSpace: 'nowrap', textAlign: 'center', borderRight: '2px solid #ddd' }}>
                                {/* Empty cell - customer name already shown in header */}
                              </td>
                              <td style={{ whiteSpace: 'nowrap', borderRight: '2px solid #ddd' }}>
                                {/* Empty cell - phone already shown in header */}
                              </td>
                              <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 8px',
                              background: '#e7f3ff',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#007bff'
                            }}>
                              #{row.month}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.dueDate)}</td>
                          <td style={{ whiteSpace: 'nowrap', fontWeight: '500' }}>
                            {formatCurrency(row.dueAmount)}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {row.paidDate ? formatDate(row.paidDate) : '-'}
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontWeight: '600', color: row.paidAmount > 0 ? '#28a745' : '#666' }}>
                            {formatCurrency(row.paidAmount)}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'capitalize',
                              background: 
                                row.status === 'paid' ? '#d4edda' :
                                row.status === 'pending' ? '#fff3cd' :
                                '#f8d7da',
                              color: 
                                row.status === 'paid' ? '#155724' :
                                row.status === 'pending' ? '#856404' :
                                '#721c24'
                            }}>
                              {row.status}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <input
                                type="number"
                                placeholder="Amount"
                                value={paymentInputs[rowKey] || ''}
                                onChange={(e) => handlePaymentInputChange(rowKey, e.target.value)}
                                disabled={isProcessing || row.status === 'paid'}
                                style={{
                                  padding: '6px 10px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '13px',
                                  width: '100px',
                                  background: row.status === 'paid' ? '#f0f0f0' : 'white'
                                }}
                              />
                              <button
                                onClick={() => handleEnterPayment(row)}
                                disabled={isProcessing || row.status === 'paid' || !paymentInputs[rowKey]}
                                style={{
                                  padding: '6px 12px',
                                  border: 'none',
                                  borderRadius: '4px',
                                  background: row.status === 'paid' ? '#ccc' : '#007bff',
                                  color: 'white',
                                  cursor: row.status === 'paid' ? 'not-allowed' : 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  opacity: (isProcessing || row.status === 'paid' || !paymentInputs[rowKey]) ? 0.6 : 1
                                }}
                              >
                                {isProcessing ? 'Processing...' : 'Enter Payment'}
                              </button>
                              {row.status === 'overdue' && (
                                <>
                                  <input
                                    type="number"
                                    placeholder="Interest"
                                    value={interestInputs[rowKey] || ''}
                                    onChange={(e) => handleInterestInputChange(rowKey, e.target.value)}
                                    disabled={isProcessing}
                                    style={{
                                      padding: '6px 10px',
                                      border: '1px solid #dc3545',
                                      borderRadius: '4px',
                                      fontSize: '13px',
                                      width: '90px',
                                      background: 'white'
                                    }}
                                  />
                                  <button
                                    onClick={() => handleAddInterest(row)}
                                    disabled={isProcessing || !interestInputs[rowKey]}
                                    style={{
                                      padding: '6px 12px',
                                      border: 'none',
                                      borderRadius: '4px',
                                      background: '#dc3545',
                                      color: 'white',
                                      cursor: isProcessing || !interestInputs[rowKey] ? 'not-allowed' : 'pointer',
                                      fontSize: '12px',
                                      fontWeight: '500',
                                      opacity: (isProcessing || !interestInputs[rowKey]) ? 0.6 : 1
                                    }}
                                  >
                                    {isProcessing ? '...' : 'Add Interest'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                          );
                        })}
                        
                        {/* Grand Total Summary Table - shown when expanded */}
                        {isExpanded && schedule && (() => {
                          const selectedScheme = schemes.find(s => s.id === selectedSchemeId);
                          // Group rows by entryId
                          const entryMap = new Map<string, PaymentScheduleRow[]>();
                          group.rows.forEach(row => {
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
                            const overdueRows = rows.filter(r => r.status === 'overdue');
                            const pendingRows = rows.filter(r => r.status === 'pending');
                            const overdueAmount = overdueRows.reduce((sum, r) => sum + (r.dueAmount - r.paidAmount), 0);
                            const pendingAmount = pendingRows.reduce((sum, r) => sum + (r.dueAmount - r.paidAmount), 0);
                            const totalPendingForEntry = overdueAmount + pendingAmount;
                            const overdueDates = overdueRows.map(r => r.dueDate).filter(Boolean).sort();
                            const pendingDates = pendingRows.map(r => r.dueDate).filter(Boolean).sort();
                            const pendingMonthsCount = overdueRows.length + pendingRows.length;
                            const overdueMonthsCount = overdueRows.length;
                            const pendingPastDueDates = overdueRows.map(r => r.dueDate).filter(Boolean).sort();
                            const futureUnpaidRows = pendingRows.filter(r => {
                              const d = new Date(r.dueDate);
                              d.setHours(0, 0, 0, 0);
                              return d >= today;
                            });
                            const upcomingDates = futureUnpaidRows.map(r => r.dueDate).filter(Boolean).sort().slice(0, 2);
                            return {
                              entryNo: idx + 1,
                              entryId,
                              pendingMonthsCount,
                              overdueMonthsCount,
                              totalPendingAmount: totalPendingForEntry,
                              overdueAmount,
                              pendingPastDueDates,
                              upcomingDates,
                              overdueDate: overdueDates.length > 0 ? (overdueDates.length <= 2 ? overdueDates.join(', ') : `${overdueDates[0]} ... ${overdueDates[overdueDates.length - 1]} (${overdueDates.length})`) : '-'
                            };
                          });
                          
                          const grandOverdueAmount = entrySummaries.reduce((s, e) => s + e.overdueAmount, 0);
                          const grandTotalPending = entrySummaries.reduce((s, e) => s + e.totalPendingAmount, 0);
                          const grandPendingMonths = entrySummaries.reduce((s, e) => s + e.pendingMonthsCount, 0);
                          const grandOverdueMonths = entrySummaries.reduce((s, e) => s + (e.overdueMonthsCount || 0), 0);
                          const allPendingPastDueDates = entrySummaries.flatMap((e: any) => e.pendingPastDueDates || []).filter(Boolean).sort();
                          const upcomingNext2 = [...new Set(entrySummaries.flatMap((e: any) => e.upcomingDates || []).filter(Boolean).sort())].slice(0, 2);
                          
                          return (
                            <tr key={`summary-${group.customerId}`}>
                              <td colSpan={9} style={{ padding: 0, verticalAlign: 'top', borderTop: '3px solid #007bff' }}>
                                <div style={{ padding: '20px', background: '#f8f9fa', margin: 0 }}>
                                  <h4 style={{ margin: '0 0 15px 0', color: '#007bff', fontSize: '16px' }}>Grand Total Summary - {group.customerName}</h4>
                                  {(allPendingPastDueDates.length > 0 || upcomingNext2.length > 0) && (
                                    <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#e7f3ff', borderRadius: '6px', fontSize: '14px' }}>
                                      <strong>Pending (past-due):</strong> {allPendingPastDueDates.length} month(s)
                                      {allPendingPastDueDates.length > 0 && (
                                        <span style={{ marginLeft: '6px' }}>({allPendingPastDueDates.length <= 3 ? allPendingPastDueDates.join(', ') : `${allPendingPastDueDates[0]} ... ${allPendingPastDueDates[allPendingPastDueDates.length - 1]}`})</span>
                                      )}
                                      <span style={{ marginLeft: '16px' }}><strong>Upcoming (next 2):</strong></span>
                                      {upcomingNext2.length > 0 ? (
                                        <span style={{ marginLeft: '6px' }}>{upcomingNext2.length} month(s) ({upcomingNext2.join(', ')})</span>
                                      ) : (
                                        <span style={{ marginLeft: '6px', color: '#666' }}>None</span>
                                      )}
                                    </div>
                                  )}
                                  <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                                    Overdue rule: above {selectedScheme?.overdueAfterMonths ?? 3} consecutive unpaid months = overdue
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
                                            <td style={{ whiteSpace: 'nowrap', fontWeight: '600', color: es.pendingMonthsCount > 0 ? '#856404' : undefined }}>{es.pendingMonthsCount} months</td>
                                            <td style={{ whiteSpace: 'nowrap', fontWeight: '500', color: es.overdueMonthsCount > 0 ? '#dc3545' : undefined }}>{es.overdueMonthsCount} months</td>
                                            <td style={{ whiteSpace: 'nowrap', color: es.totalPendingAmount > 0 ? '#856404' : undefined, fontWeight: '500' }}>
                                              {formatCurrency(es.totalPendingAmount)}
                                              {es.pendingMonthsCount > 0 && (
                                                <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>
                                                  ({es.pendingMonthsCount} × {formatCurrency(schedule.monthlyInstallment || 0)})
                                                </span>
                                              )}
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap', color: es.overdueAmount > 0 ? '#dc3545' : undefined, fontWeight: '500' }}>
                                              {formatCurrency(es.overdueAmount)}
                                              {es.overdueMonthsCount > 0 && (
                                                <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>
                                                  ({es.overdueMonthsCount} × {formatCurrency(schedule.monthlyInstallment || 0)})
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                        <tr style={{ background: '#e7f3ff', fontWeight: '700', borderTop: '2px solid #007bff' }}>
                                          <td style={{ textAlign: 'right', paddingRight: '12px' }}>Grand total</td>
                                          <td style={{ whiteSpace: 'nowrap', color: grandPendingMonths > 0 ? '#856404' : undefined }}>{grandPendingMonths} months</td>
                                          <td style={{ whiteSpace: 'nowrap', color: grandOverdueMonths > 0 ? '#dc3545' : undefined }}>{grandOverdueMonths} months</td>
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
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRows.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
