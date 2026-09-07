// 30 days of mock historical demand data per category per zone
// Used by the AI demand forecasting engine

const categories = ['plumbing', 'electrical', 'cleaning', 'painting', 'carpentry', 'ac-repair', 'pest-control', 'appliance-repair'];
const zones = ['North', 'South', 'East', 'West', 'Central'];

// Base demand patterns per category (daily average)
const baseDemand = {
  plumbing: 18,
  electrical: 22,
  cleaning: 30,
  painting: 8,
  carpentry: 10,
  'ac-repair': 25,
  'pest-control': 12,
  'appliance-repair': 15
};

// Day-of-week multipliers (0 = Sunday)
const dayMultipliers = [1.3, 0.8, 0.85, 0.9, 0.95, 1.0, 1.4];

// Zone distribution weights
const zoneWeights = {
  North: 0.22,
  South: 0.28,
  East: 0.15,
  West: 0.18,
  Central: 0.17
};

// Generate 30 days of historical data
function generateHistoricalData() {
  const data = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];

    // Add some randomness
    const randomFactor = () => 0.8 + Math.random() * 0.4;

    const dayData = {
      date: dateStr,
      dayOfWeek,
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
      categories: {},
      zones: {},
      total: 0,
      weather: i % 7 < 2 ? 'Rainy' : i % 5 === 0 ? 'Hot' : 'Clear'
    };

    let totalDay = 0;

    // Generate per-category demand
    categories.forEach(cat => {
      const base = baseDemand[cat];
      const dayMult = dayMultipliers[dayOfWeek];
      const weatherMult = dayData.weather === 'Rainy' && (cat === 'plumbing' || cat === 'electrical') ? 1.4
        : dayData.weather === 'Hot' && cat === 'ac-repair' ? 1.6
        : dayData.weather === 'Rainy' && cat === 'painting' ? 0.4
        : 1.0;

      const demand = Math.round(base * dayMult * weatherMult * randomFactor());
      dayData.categories[cat] = demand;
      totalDay += demand;
    });

    // Generate per-zone demand
    zones.forEach(zone => {
      const zoneDemand = Math.round(totalDay * zoneWeights[zone] * randomFactor());
      dayData.zones[zone] = zoneDemand;
    });

    dayData.total = totalDay;
    data.push(dayData);
  }

  return data;
}

export const historicalDemand = generateHistoricalData();

// Available workers per category (for staffing gap analysis)
export const availableWorkersByCategory = {
  plumbing: 15,
  electrical: 18,
  cleaning: 25,
  painting: 6,
  carpentry: 8,
  'ac-repair': 20,
  'pest-control': 10,
  'appliance-repair': 12
};

// Available workers per zone
export const availableWorkersByZone = {
  North: 28,
  South: 35,
  East: 18,
  West: 22,
  Central: 20
};

// Festival/event data for spike detection
export const festivals = [
  { name: 'Diwali', date: '2026-10-20', demandMultiplier: 1.8, affectedCategories: ['cleaning', 'painting', 'electrical'] },
  { name: 'Holi', date: '2027-03-14', demandMultiplier: 1.5, affectedCategories: ['cleaning', 'painting'] },
  { name: 'Ganesh Chaturthi', date: '2026-09-07', demandMultiplier: 1.4, affectedCategories: ['cleaning', 'electrical', 'plumbing'] },
  { name: 'Navratri', date: '2026-10-02', demandMultiplier: 1.3, affectedCategories: ['cleaning', 'painting'] }
];

export { categories, zones, baseDemand, dayMultipliers, zoneWeights };
