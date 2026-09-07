// AI Demand Forecasting Engine
// Client-side forecasting using weighted moving averages, seasonality, and weather factors

import { dayMultipliers, festivals } from '../data/mockHistoricalDemand';

/**
 * Weighted moving average — recent days contribute more
 */
export function weightedMovingAverage(data, windowSize = 7) {
  if (data.length < windowSize) return data[data.length - 1] || 0;

  const weights = [];
  let totalWeight = 0;
  for (let i = 0; i < windowSize; i++) {
    const w = i + 1; // 1, 2, 3, ... (most recent = highest weight)
    weights.push(w);
    totalWeight += w;
  }

  const recentData = data.slice(-windowSize);
  let weightedSum = 0;
  recentData.forEach((val, idx) => {
    weightedSum += val * weights[idx];
  });

  return weightedSum / totalWeight;
}

/**
 * Apply day-of-week seasonality
 */
export function applySeasonality(baseValue, dayOfWeek) {
  const multiplier = dayMultipliers[dayOfWeek] || 1.0;
  return Math.round(baseValue * multiplier);
}

/**
 * Apply weather impact factor
 */
export function applyWeatherFactor(baseValue, weatherCondition, category) {
  const weatherImpact = {
    Rainy: {
      plumbing: 1.4,
      electrical: 1.3,
      cleaning: 0.7,
      painting: 0.3,
      carpentry: 0.6,
      'ac-repair': 0.8,
      'pest-control': 1.2,
      'appliance-repair': 1.1
    },
    Hot: {
      plumbing: 1.0,
      electrical: 1.1,
      cleaning: 1.0,
      painting: 0.8,
      carpentry: 0.9,
      'ac-repair': 1.6,
      'pest-control': 1.3,
      'appliance-repair': 1.2
    },
    Clear: {
      plumbing: 1.0,
      electrical: 1.0,
      cleaning: 1.0,
      painting: 1.1,
      carpentry: 1.1,
      'ac-repair': 1.0,
      'pest-control': 1.0,
      'appliance-repair': 1.0
    }
  };

  const multiplier = weatherImpact[weatherCondition]?.[category] || 1.0;
  return Math.round(baseValue * multiplier);
}

/**
 * Check for upcoming festivals and their demand impact
 */
export function getFestivalMultiplier(dateStr, category) {
  const date = new Date(dateStr);
  for (const festival of festivals) {
    const festDate = new Date(festival.date);
    const diffDays = Math.abs((festDate - date) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7 && festival.affectedCategories.includes(category)) {
      // Stronger effect closer to the festival
      const proximity = 1 - (diffDays / 10);
      return {
        name: festival.name,
        multiplier: 1 + (festival.demandMultiplier - 1) * Math.max(proximity, 0.3)
      };
    }
  }
  return { name: null, multiplier: 1.0 };
}

/**
 * Generate forecast for a category over N days
 */
export function generateCategoryForecast(historicalData, category, days = 7) {
  // Extract historical values for this category
  const categoryHistory = historicalData.map(d => d.categories[category] || 0);

  const forecasts = [];
  const today = new Date();

  // Simulated weather for next 7 days
  const futureWeather = ['Rainy', 'Rainy', 'Clear', 'Clear', 'Hot', 'Clear', 'Rainy'];

  for (let i = 1; i <= days; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(forecastDate.getDate() + i);
    const dayOfWeek = forecastDate.getDay();
    const dateStr = forecastDate.toISOString().split('T')[0];

    // Base prediction from weighted moving average
    let basePrediction = weightedMovingAverage(categoryHistory, 7);

    // Apply seasonality
    basePrediction = applySeasonality(basePrediction, dayOfWeek);

    // Apply weather
    const weather = futureWeather[i - 1] || 'Clear';
    basePrediction = applyWeatherFactor(basePrediction, weather, category);

    // Check festival impact
    const festival = getFestivalMultiplier(dateStr, category);
    if (festival.multiplier > 1) {
      basePrediction = Math.round(basePrediction * festival.multiplier);
    }

    // Confidence band (±15-25%)
    const confidenceRange = 0.15 + (i * 0.015); // Wider band further out
    const low = Math.round(basePrediction * (1 - confidenceRange));
    const high = Math.round(basePrediction * (1 + confidenceRange));

    forecasts.push({
      date: dateStr,
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
      predicted: basePrediction,
      confidence: [low, high],
      weather,
      festival: festival.name
    });

    // Add prediction to history for next iteration
    categoryHistory.push(basePrediction);
  }

  return forecasts;
}

/**
 * Generate aggregate forecast across all categories
 */
export function generateForecast(historicalData, days = 7) {
  const categories = Object.keys(historicalData[0]?.categories || {});
  const totalHistory = historicalData.map(d => d.total);

  const forecasts = [];
  const today = new Date();

  for (let i = 1; i <= days; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(forecastDate.getDate() + i);
    const dateStr = forecastDate.toISOString().split('T')[0];
    const dayOfWeek = forecastDate.getDay();

    let totalPredicted = 0;
    const categoryBreakdown = {};

    categories.forEach(cat => {
      const catHistory = historicalData.map(d => d.categories[cat] || 0);
      let prediction = weightedMovingAverage(catHistory, 7);
      prediction = applySeasonality(prediction, dayOfWeek);
      categoryBreakdown[cat] = Math.round(prediction);
      totalPredicted += Math.round(prediction);
    });

    const confidenceRange = 0.12 + (i * 0.02);

    forecasts.push({
      date: dateStr,
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
      predicted: totalPredicted,
      confidence: [
        Math.round(totalPredicted * (1 - confidenceRange)),
        Math.round(totalPredicted * (1 + confidenceRange))
      ],
      categories: categoryBreakdown
    });
  }

  return forecasts;
}

/**
 * Generate zone-wise demand heatmap
 */
export function generateZoneForecast(historicalData, days = 7) {
  const zones = Object.keys(historicalData[0]?.zones || {});
  const forecasts = {};

  zones.forEach(zone => {
    const zoneHistory = historicalData.map(d => d.zones[zone] || 0);
    const predicted = Math.round(weightedMovingAverage(zoneHistory, 7));
    forecasts[zone] = predicted;
  });

  return forecasts;
}

/**
 * Get staffing recommendations
 */
export function getStaffingRecommendations(forecast, availableWorkersByCategory) {
  const recommendations = [];
  const categoryNames = {
    plumbing: 'Plumbers',
    electrical: 'Electricians',
    cleaning: 'Cleaners',
    painting: 'Painters',
    carpentry: 'Carpenters',
    'ac-repair': 'AC Technicians',
    'pest-control': 'Pest Control Staff',
    'appliance-repair': 'Appliance Technicians'
  };

  // Look at max demand across forecast period
  const maxDemand = {};
  forecast.forEach(day => {
    if (day.categories) {
      Object.entries(day.categories).forEach(([cat, demand]) => {
        maxDemand[cat] = Math.max(maxDemand[cat] || 0, demand);
      });
    }
  });

  Object.entries(maxDemand).forEach(([category, peakDemand]) => {
    const available = availableWorkersByCategory[category] || 0;
    const gap = peakDemand - available;
    const ratio = available / Math.max(peakDemand, 1);

    let urgency;
    if (ratio >= 1.1) urgency = 'covered';
    else if (ratio >= 0.8) urgency = 'tight';
    else urgency = 'understaffed';

    recommendations.push({
      category,
      categoryName: categoryNames[category] || category,
      peakDemand,
      available,
      gap: Math.max(gap, 0),
      urgency,
      message: urgency === 'understaffed'
        ? `Need ${gap} more ${categoryNames[category]?.toLowerCase() || category} this week`
        : urgency === 'tight'
        ? `${categoryNames[category]} supply is tight — consider standby workers`
        : `${categoryNames[category]} supply is adequate`
    });
  });

  // Sort: understaffed first
  recommendations.sort((a, b) => {
    const order = { understaffed: 0, tight: 1, covered: 2 };
    return order[a.urgency] - order[b.urgency];
  });

  return recommendations;
}
