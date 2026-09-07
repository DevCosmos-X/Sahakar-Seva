export const mockUsers = [
  {
    id: 'c1',
    name: 'Rahul Sharma',
    email: 'rahul@example.com',
    password: 'password123',
    role: 'customer',
    phone: '+91 98765 43210',
    address: '12, Sector 45, Gurugram, Haryana',
    language: 'en',
    avatar: null,
    savedAddresses: [
      { label: 'Home', address: '12, Sector 45, Gurugram, Haryana' },
      { label: 'Office', address: '5th Floor, Tower B, Cyber Hub, Gurugram' }
    ]
  },
  {
    id: 'c2',
    name: 'Priya Patel',
    email: 'priya@example.com',
    password: 'password123',
    role: 'customer',
    phone: '+91 87654 32109',
    address: '34, MG Road, Bengaluru, Karnataka',
    language: 'hi',
    avatar: null,
    savedAddresses: [
      { label: 'Home', address: '34, MG Road, Bengaluru, Karnataka' }
    ]
  },
  {
    id: 'w1',
    name: 'Suresh Kumar',
    email: 'suresh@example.com',
    password: 'password123',
    role: 'worker',
    phone: '+91 76543 21098',
    skills: ['Plumbing', 'Pipe Fitting'],
    cooperative: 'Delhi Workers Cooperative Society',
    rating: 4.8,
    totalJobs: 245,
    fairnessPosition: 1,
    available: true,
    verified: true,
    certificates: ['Plumbing License', 'Safety Training Certificate'],
    joinDate: '2024-03-15'
  },
  {
    id: 'w2',
    name: 'Ramesh Yadav',
    email: 'ramesh@example.com',
    password: 'password123',
    role: 'worker',
    phone: '+91 65432 10987',
    skills: ['Electrical', 'Wiring', 'Fan Installation'],
    cooperative: 'Delhi Workers Cooperative Society',
    rating: 4.6,
    totalJobs: 189,
    fairnessPosition: 2,
    available: true,
    verified: true,
    certificates: ['Electrician License', 'Industrial Safety Certificate'],
    joinDate: '2024-05-22'
  },
  {
    id: 'w3',
    name: 'Meena Devi',
    email: 'meena@example.com',
    password: 'password123',
    role: 'worker',
    phone: '+91 54321 09876',
    skills: ['House Cleaning', 'Deep Cleaning', 'Kitchen Cleaning'],
    cooperative: 'Women Workers Cooperative',
    rating: 4.9,
    totalJobs: 312,
    fairnessPosition: 3,
    available: false,
    verified: true,
    certificates: ['Hygiene Training Certificate'],
    joinDate: '2024-01-10'
  },
  {
    id: 'w4',
    name: 'Vikram Singh',
    email: 'vikram@example.com',
    password: 'password123',
    role: 'worker',
    phone: '+91 43210 98765',
    skills: ['AC Repair', 'AC Installation', 'Refrigerator Repair'],
    cooperative: 'Delhi Workers Cooperative Society',
    rating: 4.5,
    totalJobs: 156,
    fairnessPosition: 4,
    available: true,
    verified: false,
    certificates: ['HVAC Certification'],
    joinDate: '2024-08-01'
  },
  {
    id: 'a1',
    name: 'Admin',
    email: 'admin@coopgig.com',
    password: 'admin123',
    role: 'admin',
    phone: '+91 99999 99999'
  }
];

export const getUser = (email, password, role) => {
  return mockUsers.find(
    u => u.email === email && u.password === password && u.role === role
  ) || null;
};
