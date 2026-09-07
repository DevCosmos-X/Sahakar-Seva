export const mockWorkers = [
  {
    id: 'w1',
    name: 'Suresh Kumar',
    email: 'suresh@example.com',
    phone: '+91 76543 21098',
    avatar: null,
    skills: ['Plumbing', 'Pipe Fitting'],
    cooperative: 'Delhi Workers Cooperative Society',
    rating: 4.8,
    totalJobs: 245,
    earnings: 73500,
    fairnessPosition: 1,
    available: true,
    verified: true,
    certificates: [
      { name: 'Plumbing License', issuer: 'ITI Delhi', date: '2023-06-15' },
      { name: 'Safety Training Certificate', issuer: 'NSDC', date: '2024-01-20' }
    ],
    joinDate: '2024-03-15',
    leaveRequests: [
      { id: 'lr1', startDate: '2026-09-10', endDate: '2026-09-12', reason: 'Family function', status: 'approved' },
      { id: 'lr2', startDate: '2026-09-20', endDate: '2026-09-20', reason: 'Medical appointment', status: 'pending' }
    ]
  },
  {
    id: 'w2',
    name: 'Ramesh Yadav',
    email: 'ramesh@example.com',
    phone: '+91 65432 10987',
    avatar: null,
    skills: ['Electrical', 'Wiring', 'Fan Installation'],
    cooperative: 'Delhi Workers Cooperative Society',
    rating: 4.6,
    totalJobs: 189,
    earnings: 56700,
    fairnessPosition: 2,
    available: true,
    verified: true,
    certificates: [
      { name: 'Electrician License', issuer: 'ITI Mumbai', date: '2022-11-10' },
      { name: 'Industrial Safety Certificate', issuer: 'NSDC', date: '2023-08-05' }
    ],
    joinDate: '2024-05-22',
    leaveRequests: []
  },
  {
    id: 'w3',
    name: 'Meena Devi',
    email: 'meena@example.com',
    phone: '+91 54321 09876',
    avatar: null,
    skills: ['House Cleaning', 'Deep Cleaning', 'Kitchen Cleaning'],
    cooperative: 'Women Workers Cooperative',
    rating: 4.9,
    totalJobs: 312,
    earnings: 93600,
    fairnessPosition: 3,
    available: false,
    verified: true,
    certificates: [
      { name: 'Hygiene Training Certificate', issuer: 'FSSAI', date: '2024-03-01' }
    ],
    joinDate: '2024-01-10',
    leaveRequests: [
      { id: 'lr3', startDate: '2026-08-31', endDate: '2026-09-02', reason: 'Personal leave', status: 'approved' }
    ]
  },
  {
    id: 'w4',
    name: 'Vikram Singh',
    email: 'vikram@example.com',
    phone: '+91 43210 98765',
    avatar: null,
    skills: ['AC Repair', 'AC Installation', 'Refrigerator Repair'],
    cooperative: 'Delhi Workers Cooperative Society',
    rating: 4.5,
    totalJobs: 156,
    earnings: 46800,
    fairnessPosition: 4,
    available: true,
    verified: false,
    certificates: [
      { name: 'HVAC Certification', issuer: 'LG Academy', date: '2024-07-15' }
    ],
    joinDate: '2024-08-01',
    leaveRequests: []
  },
  {
    id: 'w5',
    name: 'Anita Kumari',
    email: 'anita@example.com',
    phone: '+91 32109 87654',
    avatar: null,
    skills: ['Painting', 'Wall Texture', 'Waterproofing'],
    cooperative: 'Women Workers Cooperative',
    rating: 4.7,
    totalJobs: 98,
    earnings: 29400,
    fairnessPosition: 5,
    available: true,
    verified: false,
    certificates: [
      { name: 'Painting Skills Certificate', issuer: 'PMKVY', date: '2024-09-10' }
    ],
    joinDate: '2024-09-15',
    leaveRequests: []
  }
];

export const getPendingVerifications = () => mockWorkers.filter(w => !w.verified);
export const getVerifiedWorkers = () => mockWorkers.filter(w => w.verified);
export const getAvailableWorkers = () => mockWorkers.filter(w => w.available && w.verified);
