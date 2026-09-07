export const mockComplaints = [
  {
    id: 'CMP001',
    customerId: 'c1',
    customerName: 'Rahul Sharma',
    workerId: 'w2',
    workerName: 'Ramesh Yadav',
    bookingId: 'BK002',
    serviceName: 'Electrical',
    subject: 'Worker arrived 45 minutes late',
    description: 'The worker was supposed to arrive at 2:00 PM but came at 2:45 PM without any prior notification. The work was done well but the delay was inconvenient.',
    status: 'open',
    priority: 'medium',
    createdAt: '2026-08-28T16:30:00',
    resolvedAt: null,
    resolution: null
  },
  {
    id: 'CMP002',
    customerId: 'c2',
    customerName: 'Priya Patel',
    workerId: 'w1',
    workerName: 'Suresh Kumar',
    bookingId: 'BK003',
    serviceName: 'Plumbing',
    subject: 'Incomplete work — leak returned after 2 days',
    description: 'The plumber fixed the kitchen sink but the leak returned after 2 days. Requesting a free revisit to complete the repair properly.',
    status: 'in-progress',
    priority: 'high',
    createdAt: '2026-08-26T10:00:00',
    resolvedAt: null,
    resolution: null
  },
  {
    id: 'CMP003',
    customerId: 'c1',
    customerName: 'Rahul Sharma',
    workerId: 'w3',
    workerName: 'Meena Devi',
    bookingId: 'BK003',
    serviceName: 'Cleaning',
    subject: 'Overcharged for cleaning supplies',
    description: 'Was charged ₹200 extra for cleaning supplies which were not discussed during booking. Requesting refund for the additional charge.',
    status: 'resolved',
    priority: 'low',
    createdAt: '2026-08-25T14:00:00',
    resolvedAt: '2026-08-27T11:00:00',
    resolution: 'Refund of ₹200 processed. Worker counseled about transparent pricing.'
  },
  {
    id: 'CMP004',
    customerId: 'c2',
    customerName: 'Priya Patel',
    workerId: 'w4',
    workerName: 'Vikram Singh',
    bookingId: 'BK004',
    serviceName: 'AC Repair',
    subject: 'Worker was unprofessional',
    description: 'The worker made personal phone calls during the service and took multiple breaks. Total service time was 3 hours for what should have been a 1-hour job.',
    status: 'open',
    priority: 'high',
    createdAt: '2026-08-30T18:00:00',
    resolvedAt: null,
    resolution: null
  }
];

export const getComplaintsByStatus = (status) =>
  status === 'all' ? mockComplaints : mockComplaints.filter(c => c.status === status);
