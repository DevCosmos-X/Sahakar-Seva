// Mock routes for the live tracking map
// Each route is an array of [lat, lng] waypoints that a worker marker follows
// Using Delhi/Gurugram area coordinates for realism

export const mockRoutes = [
  {
    id: 'route1',
    name: 'Sector 29 → Sector 45, Gurugram',
    totalDuration: 30, // seconds for demo (represents ~20 min in reality)
    customerLocation: [28.4595, 77.0266],
    workerStart: [28.4689, 77.0413],
    waypoints: [
      [28.4689, 77.0413],
      [28.4680, 77.0400],
      [28.4672, 77.0385],
      [28.4665, 77.0370],
      [28.4658, 77.0355],
      [28.4650, 77.0340],
      [28.4643, 77.0328],
      [28.4636, 77.0315],
      [28.4628, 77.0305],
      [28.4620, 77.0295],
      [28.4613, 77.0285],
      [28.4607, 77.0278],
      [28.4600, 77.0270],
      [28.4595, 77.0266]
    ]
  },
  {
    id: 'route2',
    name: 'Rajouri Garden → Dwarka, Delhi',
    totalDuration: 36,
    customerLocation: [28.5921, 77.0460],
    workerStart: [28.6492, 77.1214],
    waypoints: [
      [28.6492, 77.1214],
      [28.6450, 77.1150],
      [28.6410, 77.1080],
      [28.6370, 77.1010],
      [28.6330, 77.0940],
      [28.6290, 77.0870],
      [28.6250, 77.0800],
      [28.6210, 77.0740],
      [28.6170, 77.0680],
      [28.6130, 77.0620],
      [28.6090, 77.0570],
      [28.6050, 77.0530],
      [28.6010, 77.0500],
      [28.5970, 77.0475],
      [28.5940, 77.0465],
      [28.5921, 77.0460]
    ]
  },
  {
    id: 'route3',
    name: 'Connaught Place → South Delhi',
    totalDuration: 32,
    customerLocation: [28.5494, 77.2001],
    workerStart: [28.6315, 77.2167],
    waypoints: [
      [28.6315, 77.2167],
      [28.6260, 77.2155],
      [28.6200, 77.2140],
      [28.6140, 77.2125],
      [28.6080, 77.2110],
      [28.6020, 77.2095],
      [28.5960, 77.2080],
      [28.5900, 77.2065],
      [28.5840, 77.2050],
      [28.5780, 77.2035],
      [28.5720, 77.2025],
      [28.5660, 77.2018],
      [28.5600, 77.2010],
      [28.5540, 77.2005],
      [28.5494, 77.2001]
    ]
  }
];

export const getRouteForBooking = (bookingId) => {
  // For the demo, cycle through routes based on booking ID
  const index = parseInt(bookingId.replace('BK', '')) % mockRoutes.length;
  return mockRoutes[index];
};
