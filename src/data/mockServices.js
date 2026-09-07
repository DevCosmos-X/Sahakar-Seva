// Ported from e:\sahakar-seva-progress\src\data\mockServices.js
//
// ONE change from web: the web file opens with
//   import { Wrench, Zap, SprayCan, Paintbrush, Hammer, Wind, Bug, Settings } from 'lucide-react';
// ...but then stores `icon: 'Wrench'` as a STRING on every service. Those imported components
// are never referenced — the import is dead code on web too. So the data layer here is already
// view-decoupled (icon *names*, mapped to components at render time), which is the approach we
// want on mobile anyway. The dead import is simply dropped; no data shape changed.
//
// The name->component mapping lives in the icon registry used by the service grid
// (see CustomerDashboard / BookingPage when those are ported in Phase 7).

export const mockServices = [
  {
    id: 'plumbing',
    name: 'Plumbing',
    nameHi: 'प्लंबिंग',
    icon: 'Wrench',
    color: '#3b82f6',
    basePrice: 299,
    description: 'Pipe repair, leak fixing, tap installation & more',
    descriptionHi: 'पाइप मरम्मत, लीक ठीक करना, नल लगाना और बहुत कुछ',
    avgDuration: '1-2 hrs',
    weatherMultiplier: 1.0
  },
  {
    id: 'electrical',
    name: 'Electrical',
    nameHi: 'इलेक्ट्रिकल',
    icon: 'Zap',
    color: '#f59e0b',
    basePrice: 349,
    description: 'Wiring, switch repair, fan installation, MCB fixes',
    descriptionHi: 'वायरिंग, स्विच मरम्मत, पंखा लगाना, MCB ठीक करना',
    avgDuration: '1-3 hrs',
    weatherMultiplier: 1.3
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    nameHi: 'सफाई',
    icon: 'SprayCan',
    color: '#10b981',
    basePrice: 499,
    description: 'Home deep cleaning, kitchen, bathroom, sofa cleaning',
    descriptionHi: 'घर की गहरी सफाई, किचन, बाथरूम, सोफा सफाई',
    avgDuration: '3-5 hrs',
    weatherMultiplier: 0.8
  },
  {
    id: 'painting',
    name: 'Painting',
    nameHi: 'पेंटिंग',
    icon: 'Paintbrush',
    color: '#8b5cf6',
    basePrice: 999,
    description: 'Wall painting, texture work, waterproofing',
    descriptionHi: 'दीवार पेंटिंग, टेक्सचर वर्क, वॉटरप्रूफिंग',
    avgDuration: '1-3 days',
    weatherMultiplier: 0.5
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    nameHi: 'बढ़ईगिरी',
    icon: 'Hammer',
    color: '#d97706',
    basePrice: 449,
    description: 'Furniture repair, door fixing, shelf installation',
    descriptionHi: 'फर्नीचर मरम्मत, दरवाज़ा ठीक करना, शेल्फ लगाना',
    avgDuration: '2-4 hrs',
    weatherMultiplier: 1.0
  },
  {
    id: 'ac-repair',
    name: 'AC Repair',
    nameHi: 'AC मरम्मत',
    icon: 'Wind',
    color: '#06b6d4',
    basePrice: 399,
    description: 'AC servicing, gas refill, installation & repair',
    descriptionHi: 'AC सर्विसिंग, गैस रीफिल, इंस्टॉलेशन और मरम्मत',
    avgDuration: '1-2 hrs',
    weatherMultiplier: 1.5
  },
  {
    id: 'pest-control',
    name: 'Pest Control',
    nameHi: 'कीट नियंत्रण',
    icon: 'Bug',
    color: '#ef4444',
    basePrice: 799,
    description: 'Cockroach, termite, mosquito, rat control',
    descriptionHi: 'कॉकरोच, दीमक, मच्छर, चूहा नियंत्रण',
    avgDuration: '2-3 hrs',
    weatherMultiplier: 1.2
  },
  {
    id: 'appliance-repair',
    name: 'Appliance Repair',
    nameHi: 'उपकरण मरम्मत',
    icon: 'Settings',
    color: '#6366f1',
    basePrice: 349,
    description: 'Washing machine, refrigerator, microwave repair',
    descriptionHi: 'वॉशिंग मशीन, फ्रिज, माइक्रोवेव मरम्मत',
    avgDuration: '1-3 hrs',
    weatherMultiplier: 1.0
  }
];

export const getServiceById = (id) => mockServices.find(s => s.id === id);

export const weatherConditions = [
  { condition: 'Clear', multiplier: 1.0, icon: '☀️' },
  { condition: 'Rainy', multiplier: 1.3, icon: '🌧️' },
  { condition: 'Hot (>40°C)', multiplier: 1.2, icon: '🔥' },
  { condition: 'Cold (<10°C)', multiplier: 1.1, icon: '❄️' }
];

export const currentWeather = { condition: 'Rainy', multiplier: 1.3, icon: '🌧️' };
