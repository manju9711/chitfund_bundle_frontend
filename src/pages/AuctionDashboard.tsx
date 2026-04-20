import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from '@mui/material';
import { apiService } from '../services/api';

const formatCurrency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function AuctionDashboard() {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setError('');
      const [s, p, c] = await Promise.all([
        apiService.getSchemes(),
        apiService.getPayments(),
        apiService.getCustomers()
      ]);
      setSchemes(s);
      setPayments(p);
      setCustomers(c);

      const allAuctions: any[] = [];
      for (const scheme of s) {
        const a = await apiService.getAuctions(String(scheme.id));
        allAuctions.push(...a);
      }
      setAuctions(allAuctions.sort((a, b) => (b.auction_date || '').localeCompare(a.auction_date || '')));
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;

  const totalCollection = payments.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + parseFloat(p.amount || 0), 0);
  const activeSchemes = schemes.filter((s: any) => s.status === 'active').length;
  const pendingPayments = payments.filter((p: any) => p.status === 'pending' || p.status === 'overdue').length;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Auction Dashboard</Typography>
        <Button component={RouterLink} to="/auctions" variant="outlined">Back to Auctions</Button>
      </Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card><CardContent><Typography color="text.secondary">Total Collection</Typography><Typography variant="h5">{formatCurrency(totalCollection)}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card><CardContent><Typography color="text.secondary">Active Schemes</Typography><Typography variant="h5">{activeSchemes}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card><CardContent><Typography color="text.secondary">Total Customers</Typography><Typography variant="h5">{customers.length}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card><CardContent><Typography color="text.secondary">Pending Payments</Typography><Typography variant="h5">{pendingPayments}</Typography></CardContent></Card>
        </Grid>
      </Grid>
      <Typography variant="h6" gutterBottom>Recent Auctions</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Scheme</TableCell><TableCell>Winner</TableCell><TableCell>Status</TableCell><TableCell>Prize</TableCell></TableRow></TableHead>
          <TableBody>
            {auctions.slice(0, 10).map((a: any) => (
              <TableRow key={a.id}><TableCell>{a.auction_date}</TableCell><TableCell>{a.scheme_name}</TableCell><TableCell>{a.winner_name || '-'}</TableCell><TableCell>{a.status}</TableCell><TableCell>{a.prize_amount ? formatCurrency(parseFloat(a.prize_amount)) : '-'}</TableCell></TableRow>
            ))}
            {auctions.length === 0 && <TableRow><TableCell colSpan={5}>No auctions yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
