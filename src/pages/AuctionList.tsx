import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Grid,
  Paper,
} from '@mui/material';
import { apiService } from '../services/api';

const formatCurrency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function AuctionList() {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDialog, setStartDialog] = useState(false);
  const [auctionDate, setAuctionDate] = useState(new Date().toISOString().slice(0, 10));
  const [monthNumber, setMonthNumber] = useState<number>(1);
  const [selectedAuction, setSelectedAuction] = useState<any>(null);
  const [bidDialog, setBidDialog] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [schemeMembers, setSchemeMembers] = useState<any[]>([]);
  const [selectedBidCustomerId, setSelectedBidCustomerId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedSchemeId) loadAuctions();
    else setAuctions([]);
  }, [selectedSchemeId]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadData = async () => {
    try {
      setError('');
      const s = await apiService.getSchemes();
      setSchemes(s);
      if (s.length && !selectedSchemeId) setSelectedSchemeId(String(s[0].id));
    } catch (err: any) {
      setError(err.message || 'Failed to load schemes');
    } finally {
      setLoading(false);
    }
  };

  const loadAuctions = async () => {
    if (!selectedSchemeId) return;
    try {
      const a = await apiService.getAuctions(selectedSchemeId);
      setAuctions(a);
      const members = await apiService.getSchemeMembers(selectedSchemeId);
      setSchemeMembers(members);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStartAuction = async () => {
    try {
      setError('');
      await apiService.createAuction(selectedSchemeId, auctionDate, monthNumber);
      setStartDialog(false);
      loadAuctions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleViewAuction = async (auction: any) => {
    try {
      const a = await apiService.getAuction(auction.id);
      setSelectedAuction(a);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeclareWinner = async () => {
    if (!selectedAuction) return;
    try {
      setError('');
      await apiService.declareWinner(selectedAuction.id);
      loadAuctions();
      setSelectedAuction(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmitBid = async () => {
    if (!selectedAuction || !discountAmount || parseFloat(discountAmount) < 0) return;
    const customerId = selectedBidCustomerId || (schemeMembers[0]?.id ?? schemeMembers[0]?.customer_id);
    if (!customerId) {
      setError('Select a member to place bid');
      return;
    }
    try {
      setError('');
      await apiService.submitBid(selectedAuction.id, customerId, parseFloat(discountAmount));
      const a = await apiService.getAuction(selectedAuction.id);
      setSelectedAuction(a);
      setBidDialog(false);
      setDiscountAmount('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Auction Management</Typography>
        <Button component={RouterLink} to="/auctions/dashboard" variant="outlined">Dashboard</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <FormControl sx={{ minWidth: 220 }}>
                <InputLabel>Chit Scheme</InputLabel>
                <Select value={selectedSchemeId} label="Chit Scheme" onChange={(e) => setSelectedSchemeId(e.target.value)}>
                  {schemes.map((s) => (
                    <MenuItem key={s.id} value={String(s.id)}>{s.name} - {s.duration} months</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {isAdmin && (
              <Grid item>
                <Button variant="contained" color="primary" onClick={() => setStartDialog(true)}>Start Monthly Auction</Button>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Base Amount</TableCell>
              <TableCell>Winner</TableCell>
              <TableCell>Prize Amount</TableCell>
              <TableCell>Dividend/Member</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {auctions.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center">No auctions for this scheme</TableCell></TableRow>
            )}
            {auctions.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.auction_date}</TableCell>
                <TableCell>{formatCurrency(parseFloat(a.base_amount))}</TableCell>
                <TableCell>{a.winner_name || '-'}</TableCell>
                <TableCell>{a.prize_amount ? formatCurrency(parseFloat(a.prize_amount)) : '-'}</TableCell>
                <TableCell>{a.dividend_per_member ? formatCurrency(parseFloat(a.dividend_per_member)) : '-'}</TableCell>
                <TableCell><Chip label={a.status} color={a.status === 'completed' ? 'success' : a.status === 'scheduled' ? 'warning' : 'default'} size="small" /></TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleViewAuction(a)}>View</Button>
                  {a.status === 'scheduled' && (
                    <Button size="small" color="primary" onClick={() => { setSelectedAuction(a); setBidDialog(true); setSelectedBidCustomerId(schemeMembers[0]?.id ? String(schemeMembers[0].id) : ''); }} sx={{ ml: 1 }}>Bid</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={startDialog} onClose={() => setStartDialog(false)}>
        <DialogTitle>Start Monthly Auction</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Auction Date" type="date" value={auctionDate} onChange={(e) => setAuctionDate(e.target.value)} sx={{ mt: 1 }} InputLabelProps={{ shrink: true }} />
          <TextField fullWidth label="Month Number" type="number" value={monthNumber} onChange={(e) => setMonthNumber(parseInt(e.target.value) || 1)} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStartDialog(false)}>Cancel</Button>
          <Button onClick={handleStartAuction} variant="contained">Start</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!selectedAuction && !bidDialog} onClose={() => setSelectedAuction(null)} maxWidth="md" fullWidth>
        <DialogTitle>Auction Details</DialogTitle>
        <DialogContent>
          {selectedAuction && (
            <Box>
              <Typography><strong>Scheme:</strong> {selectedAuction.scheme_name}</Typography>
              <Typography><strong>Date:</strong> {selectedAuction.auction_date}</Typography>
              <Typography><strong>Base Amount:</strong> {formatCurrency(parseFloat(selectedAuction.base_amount))}</Typography>
              <Typography><strong>Status:</strong> {selectedAuction.status}</Typography>
              {selectedAuction.bids?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1">Bids (lowest wins)</Typography>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>Member</TableCell><TableCell>Discount</TableCell></TableRow></TableHead>
                    <TableBody>
                      {selectedAuction.bids.map((b: any) => (
                        <TableRow key={b.id}>
                          <TableCell>{b.customer_name}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(b.discount_amount))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
              {selectedAuction.status === 'completed' && (
                <Typography sx={{ mt: 2 }}><strong>Prize:</strong> {formatCurrency(parseFloat(selectedAuction.prize_amount || 0))} | <strong>Dividend/Member:</strong> {formatCurrency(parseFloat(selectedAuction.dividend_per_member || 0))}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedAuction(null)}>Close</Button>
          {selectedAuction?.status === 'scheduled' && selectedAuction.bids?.length > 0 && isAdmin && (
            <Button onClick={handleDeclareWinner} variant="contained" color="success">Declare Winner (Lowest Bid)</Button>
          )}
          {selectedAuction?.status === 'scheduled' && (
            <Button onClick={() => { setBidDialog(true); setSelectedBidCustomerId(schemeMembers[0]?.id ? String(schemeMembers[0].id) : ''); }} variant="contained">Place Bid</Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={bidDialog} onClose={() => setBidDialog(false)}>
        <DialogTitle>Submit Bid (Discount Amount)</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Enter the discount you want. Lowest bid wins. Prize = Chit Value - Discount - Commission
          </Typography>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Member</InputLabel>
            <Select value={selectedBidCustomerId} label="Member" onChange={(e) => setSelectedBidCustomerId(e.target.value)}>
              {schemeMembers.map((m: any) => (
                <MenuItem key={m.id} value={String(m.id)}>{m.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth label="Discount Amount (₹)" type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBidDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmitBid} variant="contained" disabled={!discountAmount || parseFloat(discountAmount) < 0}>Submit Bid</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
