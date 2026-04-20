import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiService } from '../services/api';

interface PaymentSchedule {
  monthNumber: number;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  paymentDate: string | null;
  paidAmount: number | null;
}

interface SchemeDetail {
  membershipId: string;
  joinedDate: string;
  membershipStatus: string;
  schemeId: string;
  schemeName: string;
  totalAmount: number;
  duration: number;
  monthlyInstallment: number;
  chitFrequency: 'week' | 'month';
  chitType: 'fixed' | 'auction';
  startDate: string;
  endDate: string;
  schemeStatus: string;
  schedule: PaymentSchedule[];
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const _navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [schemes, setSchemes] = useState<SchemeDetail[]>([]);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<{
    schemeId: string;
    schemeName: string;
    installmentNumber: number;
    amount: number;
    dueDate: string;
  } | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    if (id) {
      loadCustomerDetail(id);
    }
  }, [id]);

  const loadCustomerDetail = async (customerId: string) => {
    try {
      setLoading(true);
      const data = await apiService.getCustomerDetail(customerId);
      setCustomer(data.customer);
      setSchemes(data.schemes);
    } catch (err: any) {
      setError(err.message || 'Failed to load customer details');
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

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: { bg: string; color: string } } = {
      paid: { bg: '#d4edda', color: '#155724' },
      pending: { bg: '#fff3cd', color: '#856404' },
      overdue: { bg: '#f8d7da', color: '#721c24' }
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

  const getCurrentInstallment = (schedule: PaymentSchedule[]): PaymentSchedule | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find the first pending or overdue installment
    const current = schedule.find(item => {
      const dueDate = new Date(item.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return item.status === 'pending' || item.status === 'overdue';
    });
    
    return current || null;
  };

  const getAllPendingInstallments = (schedule: PaymentSchedule[]): PaymentSchedule[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Return all pending and overdue installments that are due (not future installments)
    return schedule.filter(item => {
      const dueDate = new Date(item.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      // Only include if status is pending/overdue AND due date has passed or is today
      return (item.status === 'pending' || item.status === 'overdue') && dueDate <= today;
    });
  };

  const getCurrentAndOverdueInstallments = (schedule: PaymentSchedule[]): PaymentSchedule[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return schedule.map(item => {
      // Skip paid installments
      if (item.status === 'paid') {
        return null;
      }
      
      const dueDate = new Date(item.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      // Determine if this installment should be shown and its status
      if (dueDate < today) {
        // Due date has passed - this is overdue
        return { ...item, status: 'overdue' as const };
      } else if (dueDate.getTime() === today.getTime()) {
        // Due date is today - this is current pending
        return { ...item, status: 'pending' as const };
      }
      
      // Future installments - don't show
      return null;
    }).filter((item): item is PaymentSchedule => item !== null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handlePaymentClick = (schemeId: string, schemeName: string, installmentNumber: number, amount: number, dueDate: string) => {
    setSelectedPayment({ schemeId, schemeName, installmentNumber, amount, dueDate });
    setPaymentData({
      amount: amount.toString(),
      paymentDate: new Date().toISOString().split('T')[0]
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment || !id) return;

    setSubmittingPayment(true);
    setError('');

    try {
      await apiService.createPayment({
        customerId: id,
        schemeId: selectedPayment.schemeId,
        amount: parseFloat(paymentData.amount),
        paymentDate: paymentData.paymentDate,
        installmentNumber: selectedPayment.installmentNumber
      });

      // Close modal and refresh data
      setShowPaymentModal(false);
      setSelectedPayment(null);
      await loadCustomerDetail(id);
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  if (error || !customer) {
    return (
      <div>
        <div className="card" style={{ background: '#f8d7da', color: '#721c24' }}>
          {error || 'Customer not found'}
        </div>
        <Link to="/customers" className="btn btn-primary" style={{ marginTop: '20px' }}>
          Back to Customers
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#333' }}>Customer Details</h1>
        <Link to="/customers" className="btn" style={{ background: '#6c757d', color: 'white', textDecoration: 'none' }}>
          ← Back to Customers
        </Link>
      </div>

      {/* Customer Info Card */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h2 style={{ marginTop: 0, color: '#007bff' }}>{customer.name}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          <div>
            <strong>Email:</strong> {customer.email}
          </div>
          <div>
            <strong>Phone:</strong> {customer.phone}
          </div>
          {customer.whatsappNumber && (
            <div>
              <strong>WhatsApp:</strong> {customer.whatsappNumber}
            </div>
          )}
          {customer.city && (
            <div>
              <strong>City:</strong> {customer.city}
            </div>
          )}
          <div>
            <strong>Address:</strong> {customer.address || 'N/A'}
          </div>
          <div>
            <strong>Status:</strong>{' '}
            <span className={`badge ${customer.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
              {customer.status}
            </span>
          </div>
        </div>
      </div>

      {/* All Schemes List with Pending and Overdue Installments */}
      {schemes.length > 0 && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>
            All Schemes ({schemes.length} {schemes.length === 1 ? 'Scheme' : 'Schemes'})
          </h2>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: '1000px', background: 'white' }}>
              <thead>
                <tr>
                  <th>Scheme Name</th>
                  <th>Total Amount</th>
                  <th>Duration</th>
                  <th>Monthly Installment</th>
                  <th>Pending Installments</th>
                  <th>Overdue Installments</th>
                  <th>Total Pending Amount</th>
                  <th>Total Overdue Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {schemes.map((scheme) => {
                  const currentAndOverdue = getCurrentAndOverdueInstallments(scheme.schedule);
                  const pendingInstallments = currentAndOverdue.filter(item => item.status === 'pending');
                  const overdueInstallments = currentAndOverdue.filter(item => item.status === 'overdue');
                  const totalPendingAmount = pendingInstallments.reduce((sum, item) => sum + item.amount, 0);
                  const totalOverdueAmount = overdueInstallments.reduce((sum, item) => sum + item.amount, 0);
                  
                  return (
                    <tr key={scheme.schemeId}>
                      <td style={{ fontWeight: '600' }}>{scheme.schemeName}</td>
                      <td>{formatCurrency(scheme.totalAmount)}</td>
                      <td>{scheme.duration} {scheme.chitFrequency === 'week' ? 'weeks' : 'months'}</td>
                      <td>{formatCurrency(scheme.monthlyInstallment)}</td>
                      <td>
                        <span style={{ 
                          background: '#fff3cd', 
                          color: '#856404', 
                          padding: '4px 8px', 
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {pendingInstallments.length}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          background: '#f8d7da', 
                          color: '#721c24', 
                          padding: '4px 8px', 
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {overdueInstallments.length}
                        </span>
                      </td>
                      <td style={{ color: '#ffc107', fontWeight: '600' }}>
                        {formatCurrency(totalPendingAmount)}
                      </td>
                      <td style={{ color: '#dc3545', fontWeight: '600' }}>
                        {formatCurrency(totalOverdueAmount)}
                      </td>
                      <td>
                        <span className={`badge ${scheme.schemeStatus === 'active' ? 'badge-success' : scheme.schemeStatus === 'completed' ? 'badge-info' : 'badge-danger'}`}>
                          {scheme.schemeStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Detailed Pending and Overdue Installments for Each Scheme */}
          {schemes.map((scheme) => {
            const currentAndOverdue = getCurrentAndOverdueInstallments(scheme.schedule);
            const overdueInstallments = currentAndOverdue.filter(item => item.status === 'overdue');
            const pendingInstallments = currentAndOverdue.filter(item => item.status === 'pending');
            // Sort: overdue first, then pending, both sorted by month number
            const allPendingAndOverdue = [...overdueInstallments, ...pendingInstallments].sort((a, b) => {
              // If one is overdue and one is pending, overdue comes first
              if (a.status === 'overdue' && b.status === 'pending') return -1;
              if (a.status === 'pending' && b.status === 'overdue') return 1;
              // Otherwise sort by month number
              return a.monthNumber - b.monthNumber;
            });
            
            if (allPendingAndOverdue.length === 0) return null;
            
            return (
              <div key={scheme.schemeId} style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #e0e0e0' }}>
                <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#007bff' }}>
                  {scheme.schemeName} - Pending & Overdue Installments
                </h3>
                
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ minWidth: '800px', background: 'white' }}>
                    <thead>
                      <tr>
                        <th>Installment #</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPendingAndOverdue.map((item) => (
                        <tr key={`${scheme.schemeId}-${item.monthNumber}`}>
                          <td>#{item.monthNumber}</td>
                          <td>{formatDate(item.dueDate)}</td>
                          <td>{formatCurrency(item.amount)}</td>
                          <td>{getStatusBadge(item.status)}</td>
                          <td>
                            <button
                              onClick={() => handlePaymentClick(scheme.schemeId, scheme.schemeName, item.monthNumber, item.amount, item.dueDate)}
                              className="btn btn-primary"
                              style={{ padding: '4px 12px', fontSize: '12px' }}
                            >
                              Enter Payment
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#e7f3ff', fontWeight: 'bold' }}>
                        <td colSpan={2} style={{ textAlign: 'right', paddingRight: '15px' }}>Total Due:</td>
                        <td style={{ color: '#007bff' }}>
                          {formatCurrency(allPendingAndOverdue.reduce((sum, item) => sum + item.amount, 0))}
                        </td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Grand Summary Card - All Schemes Overview */}
      {schemes.length > 0 && (() => {
        // Calculate grand totals across all schemes
        const grandTotalAmount = schemes.reduce((sum, s) => sum + s.totalAmount, 0);
        const grandTotalPaid = schemes.reduce((sum, s) => {
          return sum + s.schedule
            .filter(item => item.status === 'paid' && item.paidAmount)
            .reduce((schemeSum, item) => schemeSum + (item.paidAmount || 0), 0);
        }, 0);
        const grandTotalPending = schemes.reduce((sum, s) => {
          return sum + s.schedule
            .filter(item => item.status === 'pending')
            .reduce((schemeSum, item) => schemeSum + item.amount, 0);
        }, 0);
        const grandTotalOverdue = schemes.reduce((sum, s) => {
          return sum + s.schedule
            .filter(item => item.status === 'overdue')
            .reduce((schemeSum, item) => schemeSum + item.amount, 0);
        }, 0);

        // Get all pending and overdue installments from all schemes
        const currentInstallments = schemes
          .flatMap(scheme => {
            const pendingInstallments = getAllPendingInstallments(scheme.schedule);
            return pendingInstallments.map(item => ({
              ...item,
              schemeName: scheme.schemeName,
              schemeId: scheme.schemeId
            }));
          })
          .sort((a, b) => {
            // Sort by scheme name first, then by installment number
            if (a.schemeName !== b.schemeName) {
              return a.schemeName.localeCompare(b.schemeName);
            }
            return a.monthNumber - b.monthNumber;
          }) as Array<PaymentSchedule & { schemeName: string; schemeId: string }>;

        // Get previous installments (paid ones)
        const previousInstallments = schemes
          .flatMap(scheme => 
            scheme.schedule
              .filter(item => item.status === 'paid')
              .map(item => ({ ...item, schemeName: scheme.schemeName, schemeId: scheme.schemeId }))
          )
          .sort((a, b) => {
            const dateA = new Date(a.dueDate).getTime();
            const dateB = new Date(b.dueDate).getTime();
            return dateB - dateA; // Most recent first
          })
          .slice(0, 5); // Show last 5 paid installments

        return (
          <div className="card" style={{ marginBottom: '30px', background: '#f8f9fa' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>
              Grand Summary - All Schemes ({schemes.length} {schemes.length === 1 ? 'Scheme' : 'Schemes'})
            </h3>
            
            {/* Grand Total Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
              marginBottom: '25px'
            }}>
              <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #007bff' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Total Scheme Amount</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
                  {formatCurrency(grandTotalAmount)}
                </div>
              </div>
              <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #28a745' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Total Paid Amount</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                  {formatCurrency(grandTotalPaid)}
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                  {((grandTotalPaid / grandTotalAmount) * 100).toFixed(1)}% of total
                </div>
              </div>
              <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ffc107' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Total Pending</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffc107' }}>
                  {formatCurrency(grandTotalPending)}
                </div>
              </div>
              <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #dc3545' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Total Overdue</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc3545' }}>
                  {formatCurrency(grandTotalOverdue)}
                </div>
              </div>
            </div>
            
            {/* Summary Row */}
            <div style={{
              background: 'white',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '25px',
              border: '1px solid #ddd'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Total Paid Amount</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                    {formatCurrency(grandTotalPaid)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Remaining Amount</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#007bff' }}>
                    {formatCurrency(grandTotalAmount - grandTotalPaid)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Payment Progress</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                    {((grandTotalPaid / grandTotalAmount) * 100).toFixed(1)}%
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    background: '#e0e0e0', 
                    borderRadius: '4px', 
                    marginTop: '5px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(grandTotalPaid / grandTotalAmount) * 100}%`,
                      height: '100%',
                      background: '#28a745',
                      transition: 'width 0.3s'
                    }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Installments Across All Schemes */}
            {currentInstallments.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#333', fontSize: '16px' }}>
                  Current Installments ({currentInstallments.length})
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ minWidth: '800px', background: 'white' }}>
                    <thead>
                      <tr>
                        <th>Scheme Name</th>
                        <th>Installment</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentInstallments.map((item, idx) => (
                        <tr key={`${item.schemeId}-${item.monthNumber}-${idx}`}>
                          <td style={{ fontWeight: '600' }}>{item.schemeName}</td>
                          <td>#{item.monthNumber}</td>
                          <td>{formatDate(item.dueDate)}</td>
                          <td>{formatCurrency(item.amount)}</td>
                          <td>{getStatusBadge(item.status)}</td>
                          <td>
                            <button
                              onClick={() => handlePaymentClick(item.schemeId, item.schemeName, item.monthNumber, item.amount, item.dueDate)}
                              className="btn btn-primary"
                              style={{ padding: '4px 12px', fontSize: '12px' }}
                            >
                              Enter Payment
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#e7f3ff', fontWeight: 'bold' }}>
                        <td colSpan={3} style={{ textAlign: 'right', paddingRight: '15px' }}>Total Current Due:</td>
                        <td style={{ color: '#007bff' }}>
                          {formatCurrency(currentInstallments.reduce((sum, item) => sum + item.amount, 0))}
                        </td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Previous Installments (Last 5 Paid) */}
            {previousInstallments.length > 0 && (
              <div>
                <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#333', fontSize: '16px' }}>
                  Recent Paid Installments (Last 5)
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ minWidth: '800px', background: 'white' }}>
                    <thead>
                      <tr>
                        <th>Scheme Name</th>
                        <th>Installment</th>
                        <th>Due Date</th>
                        <th>Payment Date</th>
                        <th>Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previousInstallments.map((item, idx) => (
                        <tr key={`${item.schemeId}-${item.monthNumber}-${idx}`}>
                          <td style={{ fontWeight: '600' }}>{item.schemeName}</td>
                          <td>#{item.monthNumber}</td>
                          <td>{formatDate(item.dueDate)}</td>
                          <td>{item.paymentDate ? formatDate(item.paymentDate) : '-'}</td>
                          <td style={{ color: '#28a745', fontWeight: '600' }}>
                            {item.paidAmount ? formatCurrency(item.paidAmount) : formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}


      {/* Payment Entry Modal */}
      {showPaymentModal && selectedPayment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowPaymentModal(false)}>
          <div className="card" style={{
            maxWidth: '500px',
            width: '90%',
            position: 'relative',
            background: 'white'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Enter Payment</h3>
            
            {error && (
              <div style={{
                background: '#f8d7da',
                color: '#721c24',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '15px'
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
              <div><strong>Scheme:</strong> {selectedPayment.schemeName}</div>
              <div><strong>Installment:</strong> #{selectedPayment.installmentNumber}</div>
              <div><strong>Due Date:</strong> {formatDate(selectedPayment.dueDate)}</div>
              <div><strong>Amount Due:</strong> {formatCurrency(selectedPayment.amount)}</div>
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Payment Amount *</label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  placeholder="Enter payment amount"
                  className="w-full"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Payment Date *</label>
                <input
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                  required
                  className="w-full"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                    setError('');
                  }}
                  disabled={submittingPayment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingPayment}
                >
                  {submittingPayment ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

