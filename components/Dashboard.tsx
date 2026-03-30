'use client';

import { useEffect, useState, useCallback } from 'react';

type Status = 'open' | 'in_progress' | 'resolved' | 'closed';
type Filter = 'all' | Status;

interface Ticket {
  id: number;
  ticket_id: string;
  reporter: string;
  description: string;
  task_id: string | null;
  status: Status;
  channel: string;
  created_at: string;
  permalink: string;
}

interface Stats {
  open: string;
  in_progress: string;
  resolved: string;
  total: string;
}

const STATUS_COLORS: Record<Status, { bg: string; text: string }> = {
  open:        { bg: '#3d1515', text: '#f87171' },
  in_progress: { bg: '#3d2d0a', text: '#fbbf24' },
  resolved:    { bg: '#0d2d1a', text: '#34d399' },
  closed:      { bg: '#1e1e2e', text: '#94a3b8' },
};

const STATUS_LABELS: Record<Status, string> = {
  open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
};

function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.closed;
  return <span style={{ background: c.bg, color: c.text, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{STATUS_LABELS[status] ?? status}</span>;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#1a1d2e', border: '1px solid #2d3148', borderRadius: 12, padding: '20px 24px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats>({ open: '0', in_progress: '0', resolved: '0', total: '0' });
  const [filter, setFilter] = useState<Filter>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets?status=${filter}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.tickets) setTickets(data.tickets);
      if (data.stats) setStats(data.stats);
      setLastRefresh(new Date());
    } catch {}
  }, [filter]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const updateStatus = async (ticketId: string, newStatus: Status) => {
    setUpdating(ticketId);
    try {
      await fetch(`/api/tickets/${ticketId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      await fetchData();
    } finally { setUpdating(null); }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const filters: { label: string; value: Filter }[] = [
    { label: 'All', value: 'all' }, { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' }, { label: 'Resolved', value: 'resolved' }, { label: 'Closed', value: 'closed' },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Yosemite Model Run Issues</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>Issues reported via @ModelRunIssue in Slack</p>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <StatCard label="Open" value={parseInt(stats.open)} color="#f87171" />
        <StatCard label="In Progress" value={parseInt(stats.in_progress)} color="#fbbf24" />
        <StatCard label="Resolved" value={parseInt(stats.resolved)} color="#34d399" />
        <StatCard label="Total" value={parseInt(stats.total)} color="#e2e8f0" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {filters.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: filter === f.value ? '#3b82f6' : '#1a1d2e', color: filter === f.value ? '#fff' : '#94a3b8' }}>{f.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
          Auto-refreshes every 15s · Last: {lastRefresh.toLocaleTimeString()}
        </div>
      </div>
      <div style={{ background: '#1a1d2e', border: '1px solid #2d3148', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2d3148' }}>
              {['Ticket','Reporter','Error / Description','Task ID','Status','Channel','Reported','Actions','Link'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '48px 16px', textAlign: 'center', color: '#475569' }}>No tickets yet — tag @ModelRunIssue in Slack to log one.</td></tr>
            ) : tickets.map((ticket, i) => (
              <tr key={ticket.id} style={{ borderBottom: i < tickets.length - 1 ? '1px solid #1e2235' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1e2235')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#60a5fa', whiteSpace: 'nowrap' }}>{ticket.ticket_id}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#e2e8f0', whiteSpace: 'nowrap' }}>{ticket.reporter}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#cbd5e1', maxWidth: 280 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.description}</div></td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#e2e8f0', whiteSpace: 'nowrap' }}>{ticket.task_id ?? '—'}</td>
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}><StatusBadge status={ticket.status} /></td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>{ticket.channel}</td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(ticket.created_at)}</td>
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  <select disabled={updating === ticket.ticket_id} value={ticket.status} onChange={e => updateStatus(ticket.ticket_id, e.target.value as Status)}
                    style={{ background: '#0f1117', border: '1px solid #2d3148', borderRadius: 6, color: '#94a3b8', fontSize: 12, padding: '4px 8px', cursor: 'pointer', opacity: updating === ticket.ticket_id ? 0.5 : 1 }}>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </td>
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  {ticket.permalink ? <a href={ticket.permalink} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontSize: 13, textDecoration: 'none' }}>View →</a> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
