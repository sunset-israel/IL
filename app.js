// Elements
const els = {
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  locateBtn: document.getElementById('locateBtn'),
  placeLabel: document.getElementById('placeLabel'),
  result: document.getElementById('result'),
  ratingText: document.getElementById('ratingText'),
  favoriteHint: document.getElementById('favoriteHint'),
  sunsetTime: document.getElementById('sunsetTime'),
  twilightRange: document.getElementById('twilightRange'),
  explain: document.getElementById('explain'),
  dateLabel: document.getElementById('dateLabel'),
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  daySelector: document.getElementById('daySelector'),
  favoritesList: document.getElementById('favoritesList'),
  menuToggle: document.getElementById('menuToggle'),
  menuPanel: document.getElementById('menuPanel'),
  recommendedSection: document.getElementById('recommendedSection')
};

// State
let currentLocation = null;
let selectedDay = 0; // 0 = today, 1 = tomorrow, 2 = day after

// Utility functions
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }
function setError(msg) {
  if (!msg) { hide(els.error); els.error.textContent = ''; return; }
  els.error.textContent = msg;
  show(els.error);
}

function formatLocalTime(isoString, locale = 'he-IL') {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoString, locale = 'he-IL') {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString(locale, { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Favorites management
function getFavorites() {
  try {
    const stored = localStorage.getItem('sunsetFavorites');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem('sunsetFavorites', JSON.stringify(favorites));
  } catch (e) {
    console.error('Failed to save favorites:', e);
  }
}

function addFavorite(location) {
  const favorites = getFavorites();
  const exists = favorites.some(f => 
    f.latitude === location.latitude && f.longitude === location.longitude
  );
  if (!exists) {
    favorites.push({
      name: location.label,
      latitude: location.latitude,
      longitude: location.longitude
    });
    saveFavorites(favorites);
    renderFavorites();
  }
}

function removeFavorite(latitude, longitude) {
  const favorites = getFavorites();
  const filtered = favorites.filter(f => 
    !(f.latitude === latitude && f.longitude === longitude)
  );
  saveFavorites(filtered);
  renderFavorites();
}

function renderFavorites() {
  const favorites = getFavorites();
  els.favoritesList.innerHTML = '';
  
  if (favorites.length === 0) {
    els.favoritesList.innerHTML = '<p style="color: var(--muted); font-size: 0.9rem;">אין מיקומים שמורים</p>';
    return;
  }
  
  favorites.forEach(fav => {
    const item = document.createElement('div');
    item.className = 'favorite-item';
    item.innerHTML = `
      <button class="favorite-item-remove" onclick="removeFavorite(${fav.latitude}, ${fav.longitude}); event.stopPropagation();">×</button>
      <div class="favorite-item-name">${fav.name}</div>
    `;
    item.addEventListener('click', () => {
      currentLocation = { latitude: fav.latitude, longitude: fav.longitude, label: fav.name };
      evaluateLocation(currentLocation);
    });
    els.favoritesList.appendChild(item);
  });
}

// Geocoding
async function geocodeByName(name) {
  // רשימת מקומות ישראליים נפוצים עם קואורדינטות ידועות
  const israeliLocations = {
    'תל אביב': { lat: 32.0853, lon: 34.7818, name: 'תל אביב' },
    'תל אביב יפו': { lat: 32.0853, lon: 34.7818, name: 'תל אביב יפו' },
    'ירושלים': { lat: 31.7683, lon: 35.2137, name: 'ירושלים' },
    'חיפה': { lat: 32.7940, lon: 34.9896, name: 'חיפה' },
    'נתניה': { lat: 32.3320, lon: 34.8599, name: 'נתניה' },
    'אילת': { lat: 29.5577, lon: 34.9519, name: 'אילת' },
    'טבריה': { lat: 32.7959, lon: 35.5310, name: 'טבריה' },
    'צפת': { lat: 32.9646, lon: 35.4960, name: 'צפת' },
    'באר שבע': { lat: 31.2433, lon: 34.7938, name: 'באר שבע' },
    'אשדוד': { lat: 31.8044, lon: 34.6553, name: 'אשדוד' },
    'אשקלון': { lat: 31.6688, lon: 34.5743, name: 'אשקלון' },
    'רמת גן': { lat: 32.0820, lon: 34.8136, name: 'רמת גן' },
    'פתח תקווה': { lat: 32.0889, lon: 34.8564, name: 'פתח תקווה' },
    'רחובות': { lat: 31.8948, lon: 34.8093, name: 'רחובות' },
    'ראשון לציון': { lat: 31.9600, lon: 34.8017, name: 'ראשון לציון' },
    'הרצליה': { lat: 32.1633, lon: 34.8447, name: 'הרצליה' },
    'כפר סבא': { lat: 32.1719, lon: 34.9069, name: 'כפר סבא' },
    'רעננה': { lat: 32.1844, lon: 34.8717, name: 'רעננה' },
    'חדרה': { lat: 32.4340, lon: 34.9195, name: 'חדרה' },
    'זכרון יעקב': { lat: 32.5694, lon: 34.9522, name: 'זכרון יעקב' },
    'קיסריה': { lat: 32.5190, lon: 34.9045, name: 'קיסריה' },
    'נהריה': { lat: 33.0081, lon: 35.0981, name: 'נהריה' },
    'עכו': { lat: 32.9281, lon: 35.0825, name: 'עכו' },
    'כרמיאל': { lat: 32.9144, lon: 35.2922, name: 'כרמיאל' },
    'עמק הירדן': { lat: 32.7000, lon: 35.6000, name: 'עמק הירדן' },
    'רמת הגולן': { lat: 33.0000, lon: 35.7000, name: 'רמת הגולן' },
    'גולן': { lat: 33.0000, lon: 35.7000, name: 'רמת הגולן' },
    'מצפה רמון': { lat: 30.6094, lon: 34.8017, name: 'מצפה רמון' },
    'דימונה': { lat: 31.0694, lon: 35.0331, name: 'דימונה' },
    'יבנה': { lat: 31.8800, lon: 34.7400, name: 'יבנה' },
    'נתיבות': { lat: 31.4219, lon: 34.5881, name: 'נתיבות' },
    'שדרות': { lat: 31.5250, lon: 34.5961, name: 'שדרות' },
    'קריית גת': { lat: 31.6094, lon: 34.7717, name: 'קריית גת' },
    'קריית מלאכי': { lat: 31.7300, lon: 34.7467, name: 'קריית מלאכי' },
    'גדרה': { lat: 31.8139, lon: 34.7794, name: 'גדרה' },
    'רמלה': { lat: 31.9253, lon: 34.8669, name: 'רמלה' },
    'לוד': { lat: 31.9514, lon: 34.8953, name: 'לוד' },
    'מודיעין': { lat: 31.8992, lon: 35.0100, name: 'מודיעין' },
    'מודיעין מכבים רעות': { lat: 31.8992, lon: 35.0100, name: 'מודיעין מכבים רעות' },
    'מכבים': { lat: 31.8992, lon: 35.0100, name: 'מכבים' },
    'רעות': { lat: 31.8992, lon: 35.0100, name: 'רעות' },
    'שמונאים': { lat: 31.9333, lon: 35.0167, name: 'שמונאים' },
    'בית חורון': { lat: 31.8833, lon: 35.1167, name: 'בית חורון' },
    'רעות': { lat: 31.8992, lon: 35.0100, name: 'רעות' },
    'בית שמש': { lat: 31.7514, lon: 34.9883, name: 'בית שמש' },
    'ביתר עילית': { lat: 31.7000, lon: 35.1167, name: 'ביתר עילית' },
    'גבעת זאב': { lat: 31.8600, lon: 35.1700, name: 'גבעת זאב' },
    'מעלה אדומים': { lat: 31.7772, lon: 35.2981, name: 'מעלה אדומים' },
    'ערד': { lat: 31.2581, lon: 35.2128, name: 'ערד' },
    'ירוחם': { lat: 30.9881, lon: 34.9311, name: 'ירוחם' },
    'ים המלח': { lat: 31.5000, lon: 35.5000, name: 'ים המלח' },
    'עין גדי': { lat: 31.4500, lon: 35.3833, name: 'עין גדי' },
    'מצדה': { lat: 31.3167, lon: 35.3633, name: 'מצדה' },
    // ישובים קטנים, קיבוצים ומושבים
    'נווה צוף': { lat: 31.9500, lon: 35.2000, name: 'נווה צוף' },
    'זרעית': { lat: 33.0500, lon: 35.3000, name: 'זרעית' },
    'אלון שבות': { lat: 31.6500, lon: 35.1167, name: 'אלון שבות' },
    'כפר אדומים': { lat: 31.8167, lon: 35.3333, name: 'כפר אדומים' },
    'נווה דניאל': { lat: 31.6667, lon: 35.1333, name: 'נווה דניאל' },
    'גמזו': { lat: 31.9333, lon: 34.9500, name: 'גמזו' },
    'תל חדיד': { lat: 31.9833, lon: 34.9167, name: 'תל חדיד' },
    'רמת רחלים': { lat: 31.7833, lon: 35.2000, name: 'רמת רחלים' },
    'הר הצופים': { lat: 31.7925, lon: 35.2431, name: 'הר הצופים' },
    'ארמון הנציב': { lat: 31.7500, lon: 35.2333, name: 'ארמון הנציב' },
    'יד קנדי': { lat: 31.7667, lon: 35.2000, name: 'יד קנדי' },
    'פארק בריטניה': { lat: 31.7000, lon: 35.0167, name: 'פארק בריטניה' },
    'יער בן שמן': { lat: 31.9500, lon: 34.9167, name: 'יער בן שמן' },
    'יער צרעה': { lat: 31.7833, lon: 34.9500, name: 'יער צרעה' },
    'הבקעה': { lat: 31.8167, lon: 35.3333, name: 'הבקעה' },
    'טירת שלום': { lat: 31.8167, lon: 34.8500, name: 'טירת שלום' },
    'רמת פוריה': { lat: 32.7167, lon: 35.5500, name: 'רמת פוריה' },
    'בית השיטה': { lat: 32.5500, lon: 35.4333, name: 'בית השיטה' },
    'רכס כרמיה': { lat: 31.4500, lon: 34.5000, name: 'רכס כרמיה' },
    'שדה אליהו': { lat: 32.4333, lon: 35.5167, name: 'שדה אליהו' },
    'כרמיאל': { lat: 32.9144, lon: 35.2922, name: 'כרמיאל' },
    'אלון כרמיאל': { lat: 32.9144, lon: 35.2922, name: 'אלון כרמיאל' },
    'רמת הגולן': { lat: 33.0000, lon: 35.7000, name: 'רמת הגולן' },
    'גלבוע': { lat: 32.4500, lon: 35.4000, name: 'גלבוע' },
    'בית צידה': { lat: 32.8667, lon: 35.5333, name: 'בית צידה' },
    'נוף ענבלים': { lat: 31.8500, lon: 35.2500, name: 'נוף ענבלים' },
    'דרך אלון': { lat: 31.8500, lon: 35.2500, name: 'דרך אלון' },
    'חאן ענבלים': { lat: 31.8500, lon: 35.2500, name: 'חאן ענבלים' },
    // אזור בנימין
    'אריאל': { lat: 32.1044, lon: 35.2031, name: 'אריאל' },
    'בית אל': { lat: 31.9333, lon: 35.2167, name: 'בית אל' },
    'עפרה': { lat: 31.9500, lon: 35.2500, name: 'עפרה' },
    'קדומים': { lat: 32.2167, lon: 35.1500, name: 'קדומים' },
    'אלפי מנשה': { lat: 32.1667, lon: 35.0167, name: 'אלפי מנשה' },
    'שילה': { lat: 32.0500, lon: 35.2833, name: 'שילה' },
    'מעלה לבונה': { lat: 32.0667, lon: 35.2500, name: 'מעלה לבונה' },
    'עלי': { lat: 32.0667, lon: 35.2667, name: 'עלי' },
    'עמנואל': { lat: 32.1667, lon: 35.0333, name: 'עמנואל' },
    'קרני שומרון': { lat: 32.1833, lon: 35.0833, name: 'קרני שומרון' },
    'איתמר': { lat: 32.1667, lon: 35.2833, name: 'איתמר' },
    'יצהר': { lat: 32.1167, lon: 35.2167, name: 'יצהר' },
    'חרמש': { lat: 32.1333, lon: 35.0833, name: 'חרמש' },
    'יקיר': { lat: 32.1500, lon: 35.1000, name: 'יקיר' },
    'נופים': { lat: 32.1167, lon: 35.0333, name: 'נופים' },
    'מעלה מכמש': { lat: 31.8667, lon: 35.3000, name: 'מעלה מכמש' },
    'כוכב יעקב': { lat: 31.8833, lon: 35.2500, name: 'כוכב יעקב' },
    'פסגות': { lat: 31.9000, lon: 35.2167, name: 'פסגות' },
    'טלמון': { lat: 31.9333, lon: 35.0333, name: 'טלמון' },
    'דולב': { lat: 31.9167, lon: 35.0500, name: 'דולב' },
    'מצפה דני': { lat: 32.0000, lon: 35.0833, name: 'מצפה דני' },
    'רימונים': { lat: 32.1333, lon: 35.1333, name: 'רימונים' },
    'רבבה': { lat: 32.1000, lon: 35.1167, name: 'רבבה' },
    'שבות רחל': { lat: 31.8167, lon: 35.2833, name: 'שבות רחל' },
    'גבעון החדשה': { lat: 31.8500, lon: 35.1833, name: 'גבעון החדשה' },
    'גבעון': { lat: 31.8500, lon: 35.1833, name: 'גבעון' },
    'גבעון הישנה': { lat: 31.8500, lon: 35.1833, name: 'גבעון הישנה' },
    'גבעת אסף': { lat: 31.9167, lon: 35.2167, name: 'גבעת אסף' },
    'גבעת הראל': { lat: 31.8000, lon: 35.2000, name: 'גבעת הראל' },
    'גבעת רואה': { lat: 31.9000, lon: 35.1833, name: 'גבעת רואה' },
    // יישובים נוספים בשומרון
    'מעלה שומרון': { lat: 32.1667, lon: 35.0833, name: 'מעלה שומרון' },
    'חרשה': { lat: 32.1167, lon: 35.1833, name: 'חרשה' },
    'עלי': { lat: 32.0667, lon: 35.2667, name: 'עלי' },
    'עפרה': { lat: 31.9500, lon: 35.2500, name: 'עפרה' },
    'בית אל': { lat: 31.9333, lon: 35.2167, name: 'בית אל' },
    'אריאל': { lat: 32.1044, lon: 35.2031, name: 'אריאל' },
    'קדומים': { lat: 32.2167, lon: 35.1500, name: 'קדומים' },
    'קרני שומרון': { lat: 32.1833, lon: 35.0833, name: 'קרני שומרון' },
    'איתמר': { lat: 32.1667, lon: 35.2833, name: 'איתמר' },
    'יצהר': { lat: 32.1167, lon: 35.2167, name: 'יצהר' },
    'שילה': { lat: 32.0500, lon: 35.2833, name: 'שילה' },
    'מעלה לבונה': { lat: 32.0667, lon: 35.2500, name: 'מעלה לבונה' },
    'ברקן': { lat: 32.1833, lon: 35.1000, name: 'ברקן' },
    'יקיר': { lat: 32.1500, lon: 35.1000, name: 'יקיר' },
    'נופים': { lat: 32.1167, lon: 35.0333, name: 'נופים' },
    'חרמש': { lat: 32.1333, lon: 35.0833, name: 'חרמש' },
    'עמנואל': { lat: 32.1667, lon: 35.0333, name: 'עמנואל' },
    'אלפי מנשה': { lat: 32.1667, lon: 35.0167, name: 'אלפי מנשה' },
    'אורנית': { lat: 32.1333, lon: 35.0167, name: 'אורנית' },
    'נחליאל': { lat: 31.9833, lon: 35.1333, name: 'נחליאל' },
    'רימונים': { lat: 32.1333, lon: 35.1333, name: 'רימונים' },
    'רבבה': { lat: 32.1000, lon: 35.1167, name: 'רבבה' },
    'מצפה דני': { lat: 32.0000, lon: 35.0833, name: 'מצפה דני' },
    'מצפה יריחו': { lat: 31.8167, lon: 35.4000, name: 'מצפה יריחו' },
    'מצפה שלם': { lat: 31.8333, lon: 35.3500, name: 'מצפה שלם' },
    'מצפה כרמים': { lat: 31.8000, lon: 35.2833, name: 'מצפה כרמים' },
    'מעלה מכמש': { lat: 31.8667, lon: 35.3000, name: 'מעלה מכמש' },
    'כוכב יעקב': { lat: 31.8833, lon: 35.2500, name: 'כוכב יעקב' },
    'פסגות': { lat: 31.9000, lon: 35.2167, name: 'פסגות' },
    'טלמון': { lat: 31.9333, lon: 35.0333, name: 'טלמון' },
    'דולב': { lat: 31.9167, lon: 35.0500, name: 'דולב' },
    'גבעון החדשה': { lat: 31.8500, lon: 35.1833, name: 'גבעון החדשה' },
    'גבעון': { lat: 31.8500, lon: 35.1833, name: 'גבעון' },
    'גבעון הישנה': { lat: 31.8500, lon: 35.1833, name: 'גבעון הישנה' },
    'גבעת אסף': { lat: 31.9167, lon: 35.2167, name: 'גבעת אסף' },
    'גבעת הראל': { lat: 31.8000, lon: 35.2000, name: 'גבעת הראל' },
    'גבעת רואה': { lat: 31.9000, lon: 35.1833, name: 'גבעת רואה' },
    'כוכב השחר': { lat: 31.8500, lon: 35.3500, name: 'כוכב השחר' },
    'ענתות': { lat: 31.8167, lon: 35.2500, name: 'ענתות' },
    'עלמון': { lat: 31.8333, lon: 35.2833, name: 'עלמון' },
    'מעלה עמוס': { lat: 31.6500, lon: 35.2000, name: 'מעלה עמוס' },
    'תקוע': { lat: 31.6500, lon: 35.2500, name: 'תקוע' },
    'נוקדים': { lat: 31.6333, lon: 35.2333, name: 'נוקדים' },
    'רימון': { lat: 31.9333, lon: 35.1333, name: 'רימון' },
    'שבות רחל': { lat: 31.8167, lon: 35.2833, name: 'שבות רחל' },
    'קרית נטפים': { lat: 32.1167, lon: 35.0500, name: 'קרית נטפים' },
    // יישובים נוספים בשומרון
    'מעלה שומרון': { lat: 32.1667, lon: 35.0833, name: 'מעלה שומרון' },
    'חרשה': { lat: 32.1167, lon: 35.1833, name: 'חרשה' },
    'מעלה לבונה': { lat: 32.0667, lon: 35.2500, name: 'מעלה לבונה' },
    'עלי': { lat: 32.0667, lon: 35.2667, name: 'עלי' },
    'חרמש': { lat: 32.1333, lon: 35.0833, name: 'חרמש' },
    'יקיר': { lat: 32.1500, lon: 35.1000, name: 'יקיר' },
    'נופים': { lat: 32.1167, lon: 35.0333, name: 'נופים' },
    'ברקן': { lat: 32.1833, lon: 35.1000, name: 'ברקן' },
    'רבבה': { lat: 32.1000, lon: 35.1167, name: 'רבבה' },
    'רימונים': { lat: 32.1333, lon: 35.1333, name: 'רימונים' },
    'מצפה דני': { lat: 32.0000, lon: 35.0833, name: 'מצפה דני' },
    'נחליאל': { lat: 31.9833, lon: 35.1333, name: 'נחליאל' },
    'עמנואל': { lat: 32.1667, lon: 35.0333, name: 'עמנואל' },
    'אלפי מנשה': { lat: 32.1667, lon: 35.0167, name: 'אלפי מנשה' },
    'אורנית': { lat: 32.1333, lon: 35.0167, name: 'אורנית' },
    'קרני שומרון': { lat: 32.1833, lon: 35.0833, name: 'קרני שומרון' },
    'קדומים': { lat: 32.2167, lon: 35.1500, name: 'קדומים' },
    'איתמר': { lat: 32.1667, lon: 35.2833, name: 'איתמר' },
    'יצהר': { lat: 32.1167, lon: 35.2167, name: 'יצהר' },
    'שילה': { lat: 32.0500, lon: 35.2833, name: 'שילה' },
    'מצפה יריחו': { lat: 31.8167, lon: 35.4000, name: 'מצפה יריחו' },
    'מצפה שלם': { lat: 31.8333, lon: 35.3500, name: 'מצפה שלם' },
    'מצפה כרמים': { lat: 31.8000, lon: 35.2833, name: 'מצפה כרמים' },
    'מעלה מכמש': { lat: 31.8667, lon: 35.3000, name: 'מעלה מכמש' },
    'כוכב יעקב': { lat: 31.8833, lon: 35.2500, name: 'כוכב יעקב' },
    'פסגות': { lat: 31.9000, lon: 35.2167, name: 'פסגות' },
    'טלמון': { lat: 31.9333, lon: 35.0333, name: 'טלמון' },
    'דולב': { lat: 31.9167, lon: 35.0500, name: 'דולב' },
    'גבעון החדשה': { lat: 31.8500, lon: 35.1833, name: 'גבעון החדשה' },
    'גבעון': { lat: 31.8500, lon: 35.1833, name: 'גבעון' },
    'גבעון הישנה': { lat: 31.8500, lon: 35.1833, name: 'גבעון הישנה' },
    'גבעת אסף': { lat: 31.9167, lon: 35.2167, name: 'גבעת אסף' },
    'גבעת הראל': { lat: 31.8000, lon: 35.2000, name: 'גבעת הראל' },
    'גבעת רואה': { lat: 31.9000, lon: 35.1833, name: 'גבעת רואה' },
    'כוכב השחר': { lat: 31.8500, lon: 35.3500, name: 'כוכב השחר' },
    'ענתות': { lat: 31.8167, lon: 35.2500, name: 'ענתות' },
    'עלמון': { lat: 31.8333, lon: 35.2833, name: 'עלמון' },
    'מעלה עמוס': { lat: 31.6500, lon: 35.2000, name: 'מעלה עמוס' },
    'תקוע': { lat: 31.6500, lon: 35.2500, name: 'תקוע' },
    'נוקדים': { lat: 31.6333, lon: 35.2333, name: 'נוקדים' },
    'רימון': { lat: 31.9333, lon: 35.1333, name: 'רימון' },
    'שבות רחל': { lat: 31.8167, lon: 35.2833, name: 'שבות רחל' },
    'קרית נטפים': { lat: 32.1167, lon: 35.0500, name: 'קרית נטפים' },
    // יישובים נוספים בשומרון
    'חרמש': { lat: 32.1333, lon: 35.0833, name: 'חרמש' },
    'יקיר': { lat: 32.1500, lon: 35.1000, name: 'יקיר' },
    'נופים': { lat: 32.1167, lon: 35.0333, name: 'נופים' },
    'ברקן': { lat: 32.1833, lon: 35.1000, name: 'ברקן' },
    'רבבה': { lat: 32.1000, lon: 35.1167, name: 'רבבה' },
    'רימונים': { lat: 32.1333, lon: 35.1333, name: 'רימונים' },
    'מצפה דני': { lat: 32.0000, lon: 35.0833, name: 'מצפה דני' },
    'נחליאל': { lat: 31.9833, lon: 35.1333, name: 'נחליאל' },
    'עמנואל': { lat: 32.1667, lon: 35.0333, name: 'עמנואל' },
    'אלפי מנשה': { lat: 32.1667, lon: 35.0167, name: 'אלפי מנשה' },
    'אורנית': { lat: 32.1333, lon: 35.0167, name: 'אורנית' },
    'קרני שומרון': { lat: 32.1833, lon: 35.0833, name: 'קרני שומרון' },
    'קדומים': { lat: 32.2167, lon: 35.1500, name: 'קדומים' },
    'איתמר': { lat: 32.1667, lon: 35.2833, name: 'איתמר' },
    'יצהר': { lat: 32.1167, lon: 35.2167, name: 'יצהר' },
    'שילה': { lat: 32.0500, lon: 35.2833, name: 'שילה' },
    'מצפה יריחו': { lat: 31.8167, lon: 35.4000, name: 'מצפה יריחו' },
    'מצפה שלם': { lat: 31.8333, lon: 35.3500, name: 'מצפה שלם' },
    'מצפה כרמים': { lat: 31.8000, lon: 35.2833, name: 'מצפה כרמים' },
    'מעלה מכמש': { lat: 31.8667, lon: 35.3000, name: 'מעלה מכמש' },
    'כוכב יעקב': { lat: 31.8833, lon: 35.2500, name: 'כוכב יעקב' },
    'פסגות': { lat: 31.9000, lon: 35.2167, name: 'פסגות' },
    'טלמון': { lat: 31.9333, lon: 35.0333, name: 'טלמון' },
    'דולב': { lat: 31.9167, lon: 35.0500, name: 'דולב' },
    'גבעון החדשה': { lat: 31.8500, lon: 35.1833, name: 'גבעון החדשה' },
    'גבעון': { lat: 31.8500, lon: 35.1833, name: 'גבעון' },
    'גבעון הישנה': { lat: 31.8500, lon: 35.1833, name: 'גבעון הישנה' },
    'גבעת אסף': { lat: 31.9167, lon: 35.2167, name: 'גבעת אסף' },
    'גבעת הראל': { lat: 31.8000, lon: 35.2000, name: 'גבעת הראל' },
    'גבעת רואה': { lat: 31.9000, lon: 35.1833, name: 'גבעת רואה' },
    'כוכב השחר': { lat: 31.8500, lon: 35.3500, name: 'כוכב השחר' },
    'ענתות': { lat: 31.8167, lon: 35.2500, name: 'ענתות' },
    'עלמון': { lat: 31.8333, lon: 35.2833, name: 'עלמון' },
    'מעלה עמוס': { lat: 31.6500, lon: 35.2000, name: 'מעלה עמוס' },
    'תקוע': { lat: 31.6500, lon: 35.2500, name: 'תקוע' },
    'נוקדים': { lat: 31.6333, lon: 35.2333, name: 'נוקדים' },
    'רימון': { lat: 31.9333, lon: 35.1333, name: 'רימון' },
    'שבות רחל': { lat: 31.8167, lon: 35.2833, name: 'שבות רחל' },
    'גבעת זאב': { lat: 31.8600, lon: 35.1700, name: 'גבעת זאב' },
    'גבעת זאב מזרח': { lat: 31.8600, lon: 35.1700, name: 'גבעת זאב מזרח' },
    'גבעת זאב מערב': { lat: 31.8600, lon: 35.1700, name: 'גבעת זאב מערב' },
    'גבעת זאב צפון': { lat: 31.8600, lon: 35.1700, name: 'גבעת זאב צפון' },
    'גבעת זאב דרום': { lat: 31.8600, lon: 35.1700, name: 'גבעת זאב דרום' },
    'גבעת זאב מרכז': { lat: 31.8600, lon: 35.1700, name: 'גבעת זאב מרכז' },
    'גבעת זאב הישנה': { lat: 31.8600, lon: 35.1700, name: 'גבעת זאב הישנה' },
    'גבעת זאב החדשה': { lat: 31.8600, lon: 35.1700, name: 'גבעת זאב החדשה' },
    // אזור יהודה ושומרון
    'אפרת': { lat: 31.6500, lon: 35.1500, name: 'אפרת' },
    'גוש עציון': { lat: 31.6500, lon: 35.1167, name: 'גוש עציון' },
    'קריית ארבע': { lat: 31.5167, lon: 35.1167, name: 'קריית ארבע' },
    'מודיעין עילית': { lat: 31.9333, lon: 35.0333, name: 'מודיעין עילית' },
    'ביתר עילית': { lat: 31.7000, lon: 35.1167, name: 'ביתר עילית' },
    'מעלה אדומים': { lat: 31.7772, lon: 35.2981, name: 'מעלה אדומים' },
    'קרני שומרון': { lat: 32.1833, lon: 35.0833, name: 'קרני שומרון' },
    'אורנית': { lat: 32.1333, lon: 35.0167, name: 'אורנית' },
    'קדומים': { lat: 32.2167, lon: 35.1500, name: 'קדומים' },
    'קרית נטפים': { lat: 32.1167, lon: 35.0500, name: 'קרית נטפים' },
    'מעלה עמוס': { lat: 31.6500, lon: 35.2000, name: 'מעלה עמוס' },
    'תקוע': { lat: 31.6500, lon: 35.2500, name: 'תקוע' },
    'נוקדים': { lat: 31.6333, lon: 35.2333, name: 'נוקדים' },
    'עלמון': { lat: 31.8333, lon: 35.2833, name: 'עלמון' },
    'ענתות': { lat: 31.8167, lon: 35.2500, name: 'ענתות' },
    'כוכב השחר': { lat: 31.8500, lon: 35.3500, name: 'כוכב השחר' },
    'מעלה מכמש': { lat: 31.8667, lon: 35.3000, name: 'מעלה מכמש' },
    'רימון': { lat: 31.9333, lon: 35.1333, name: 'רימון' },
    'מעלה לבונה': { lat: 32.0667, lon: 35.2500, name: 'מעלה לבונה' },
    'שילה': { lat: 32.0500, lon: 35.2833, name: 'שילה' },
    'איתמר': { lat: 32.1667, lon: 35.2833, name: 'איתמר' },
    'יצהר': { lat: 32.1167, lon: 35.2167, name: 'יצהר' },
    'ברקן': { lat: 32.1833, lon: 35.1000, name: 'ברקן' },
    'רבבה': { lat: 32.1000, lon: 35.1167, name: 'רבבה' },
    'יקיר': { lat: 32.1500, lon: 35.1000, name: 'יקיר' },
    'נופים': { lat: 32.1167, lon: 35.0333, name: 'נופים' },
    'חרמש': { lat: 32.1333, lon: 35.0833, name: 'חרמש' },
    'עמנואל': { lat: 32.1667, lon: 35.0333, name: 'עמנואל' },
    'אלפי מנשה': { lat: 32.1667, lon: 35.0167, name: 'אלפי מנשה' },
    'אורנית': { lat: 32.1333, lon: 35.0167, name: 'אורנית' },
    'טלמון': { lat: 31.9333, lon: 35.0333, name: 'טלמון' },
    'דולב': { lat: 31.9167, lon: 35.0500, name: 'דולב' },
    'נחליאל': { lat: 31.9833, lon: 35.1333, name: 'נחליאל' },
    'מצפה יריחו': { lat: 31.8167, lon: 35.4000, name: 'מצפה יריחו' },
    'מצפה שלם': { lat: 31.8333, lon: 35.3500, name: 'מצפה שלם' },
    'מצפה כרמים': { lat: 31.8000, lon: 35.2833, name: 'מצפה כרמים' },
    'מצפה דני': { lat: 32.0000, lon: 35.0833, name: 'מצפה דני' },
    'מצפה רמון': { lat: 30.6094, lon: 34.8017, name: 'מצפה רמון' },
    'מצפה יאיר': { lat: 31.7833, lon: 35.2000, name: 'מצפה יאיר' },
    'מצפה עמיחי': { lat: 32.0833, lon: 35.2833, name: 'מצפה עמיחי' },
    'מצפה אילן': { lat: 32.1000, lon: 35.2500, name: 'מצפה אילן' },
    'מצפה נוף ענבלים': { lat: 31.8500, lon: 35.2500, name: 'מצפה נוף ענבלים' },
    'מצפה שגב': { lat: 32.9167, lon: 35.3833, name: 'מצפה שגב' },
    'מצפה שובל': { lat: 32.0500, lon: 35.4000, name: 'מצפה שובל' },
    'מצפה מתניה': { lat: 32.3500, lon: 35.3167, name: 'מצפה מתניה' },
    'מצפה עופר': { lat: 32.7167, lon: 35.5500, name: 'מצפה עופר' },
    'מצפה אפיק': { lat: 32.7833, lon: 35.7000, name: 'מצפה אפיק' },
    'מצפה השלום': { lat: 33.0000, lon: 35.7000, name: 'מצפה השלום' },
    'מצפה אופיר': { lat: 32.8333, lon: 35.6833, name: 'מצפה אופיר' },
    'מצפה דובי וערן שמיר': { lat: 32.4500, lon: 35.4000, name: 'מצפה דובי וערן שמיר' },
    'מצפה חרובים': { lat: 32.5500, lon: 35.4333, name: 'מצפה חרובים' },
    'מצפה יהונתן דויטש': { lat: 32.4500, lon: 35.4000, name: 'מצפה יהונתן דויטש' },
    'מצפה כתף שאול': { lat: 32.4500, lon: 35.4000, name: 'מצפה כתף שאול' },
    'מצפה נדב מילוא': { lat: 32.4333, lon: 35.5167, name: 'מצפה נדב מילוא' },
    'מצפור הסיירים': { lat: 31.4500, lon: 34.5000, name: 'מצפור הסיירים' },
    'מצפור נדב': { lat: 32.9144, lon: 35.2922, name: 'מצפור נדב' },
    'מצפור בית צידה': { lat: 32.8667, lon: 35.5333, name: 'מצפור בית צידה' },
    'מצפור אבינדב': { lat: 32.4500, lon: 35.4000, name: 'מצפור אבינדב' },
    'מצפור רועי': { lat: 31.9833, lon: 34.9167, name: 'מצפור רועי' },
    'תצפית יהודאי': { lat: 31.7925, lon: 35.2431, name: 'תצפית יהודאי' },
    'תצפית הר הצופים': { lat: 31.7925, lon: 35.2431, name: 'תצפית הר הצופים' },
    'מצפה הפסנתר': { lat: 31.7667, lon: 35.2000, name: 'מצפה הפסנתר' },
    'מצפ-תל': { lat: 31.7500, lon: 35.2333, name: 'מצפ-תל' },
    'מצפה יאיר': { lat: 31.7833, lon: 35.2000, name: 'מצפה יאיר' },
    'מצפה משואה': { lat: 31.7000, lon: 35.0167, name: 'מצפה משואה' },
    'מצפה משה שעיה': { lat: 31.8992, lon: 35.0100, name: 'מצפה משה שעיה' },
    'מצפה מודיעין': { lat: 31.8992, lon: 35.0100, name: 'מצפה מודיעין' },
    'מצפה אלון': { lat: 31.8167, lon: 35.3333, name: 'מצפה אלון' },
    'מצפור האלף': { lat: 31.6667, lon: 35.1333, name: 'מצפור האלף' },
    'מצפה נתן': { lat: 31.8992, lon: 35.0100, name: 'מצפה נתן' },
    'מצפה השניים': { lat: 31.9333, lon: 34.9500, name: 'מצפה השניים' },
    'מצפה שמש': { lat: 31.7833, lon: 34.9500, name: 'מצפה שמש' },
    'מצפה בניה': { lat: 33.0833, lon: 35.5167, name: 'מצפה בניה' },
    'מצפה הימים': { lat: 32.8000, lon: 35.5000, name: 'מצפה הימים' },
    'מצפה אלון טירת שלום': { lat: 31.8167, lon: 34.8500, name: 'מצפה אלון טירת שלום' },
    // ערים ועיירות נוספות
    'קריית שמונה': { lat: 33.2079, lon: 35.5703, name: 'קריית שמונה' },
    'מעלות': { lat: 33.0167, lon: 35.2833, name: 'מעלות' },
    'מגדל': { lat: 32.9167, lon: 35.5000, name: 'מגדל' },
    'ראש פינה': { lat: 32.9708, lon: 35.5458, name: 'ראש פינה' },
    'מטולה': { lat: 33.2833, lon: 35.5833, name: 'מטולה' },
    'צפת': { lat: 32.9646, lon: 35.4960, name: 'צפת' },
    'רמת ישי': { lat: 32.7000, lon: 35.1667, name: 'רמת ישי' },
    'יקנעם': { lat: 32.6667, lon: 35.1000, name: 'יקנעם' },
    'זכרון יעקב': { lat: 32.5694, lon: 34.9522, name: 'זכרון יעקב' },
    'בנימינה': { lat: 32.5167, lon: 34.9500, name: 'בנימינה' },
    'גבעתיים': { lat: 32.0697, lon: 34.8122, name: 'גבעתיים' },
    'בני ברק': { lat: 32.0903, lon: 34.8397, name: 'בני ברק' },
    'חולון': { lat: 32.0103, lon: 34.7792, name: 'חולון' },
    'בת ים': { lat: 32.0167, lon: 34.7500, name: 'בת ים' },
    'ראש העין': { lat: 32.0958, lon: 34.9567, name: 'ראש העין' },
    'הוד השרון': { lat: 32.1500, lon: 34.8833, name: 'הוד השרון' },
    'כפר יונה': { lat: 32.3167, lon: 34.9333, name: 'כפר יונה' },
    'קדימה': { lat: 32.2833, lon: 34.9167, name: 'קדימה' },
    'צורן': { lat: 32.2833, lon: 34.9167, name: 'צורן' },
    'גן יבנה': { lat: 31.7833, lon: 34.7167, name: 'גן יבנה' },
    'קריית מלאכי': { lat: 31.7300, lon: 34.7467, name: 'קריית מלאכי' },
    'קריית גת': { lat: 31.6094, lon: 34.7717, name: 'קריית גת' },
    'קריית עקרון': { lat: 31.8500, lon: 34.8167, name: 'קריית עקרון' },
    'קריית שמונה': { lat: 33.2079, lon: 35.5703, name: 'קריית שמונה' },
    'קריית ארבע': { lat: 31.5167, lon: 35.1167, name: 'קריית ארבע' },
    'קריית טבעון': { lat: 32.7167, lon: 35.1167, name: 'קריית טבעון' },
    'קריית ביאליק': { lat: 32.8333, lon: 35.0833, name: 'קריית ביאליק' },
    'קריית מוצקין': { lat: 32.8333, lon: 35.0833, name: 'קריית מוצקין' },
    'קריית ים': { lat: 32.8500, lon: 35.0667, name: 'קריית ים' },
    'קריית אתא': { lat: 32.8000, lon: 35.1000, name: 'קריית אתא' },
    'קריית שמואל': { lat: 32.8333, lon: 35.0833, name: 'קריית שמואל' },
    'קריית חיים': { lat: 32.8333, lon: 35.0833, name: 'קריית חיים' },
    'קריית ענבים': { lat: 31.8167, lon: 35.1167, name: 'קריית ענבים' },
    'קריית אונו': { lat: 32.0667, lon: 34.8500, name: 'קריית אונו' },
    'קריית נטפים': { lat: 32.1167, lon: 35.0500, name: 'קריית נטפים' },
    // קיבוצים ומושבים - צפון
    'דגניה א': { lat: 32.7000, lon: 35.5833, name: 'דגניה א' },
    'דגניה ב': { lat: 32.7000, lon: 35.5833, name: 'דגניה ב' },
    'אפיקים': { lat: 32.6833, lon: 35.5667, name: 'אפיקים' },
    'כנרת': { lat: 32.7167, lon: 35.5667, name: 'כנרת' },
    'דגניה': { lat: 32.7000, lon: 35.5833, name: 'דגניה' },
    'עין גב': { lat: 32.7833, lon: 35.6333, name: 'עין גב' },
    'מסדה': { lat: 32.6833, lon: 35.6000, name: 'מסדה' },
    'שער הגולן': { lat: 32.6833, lon: 35.6000, name: 'שער הגולן' },
    'תל קציר': { lat: 32.7000, lon: 35.6167, name: 'תל קציר' },
    'מעלה גמלא': { lat: 32.8833, lon: 35.6833, name: 'מעלה גמלא' },
    'קצרין': { lat: 32.9833, lon: 35.7000, name: 'קצרין' },
    'חיספין': { lat: 32.7500, lon: 35.8000, name: 'חיספין' },
    'אלוני הבשן': { lat: 33.0333, lon: 35.8333, name: 'אלוני הבשן' },
    // קיבוצים ומושבים - מרכז
    'גבעת ברנר': { lat: 31.8667, lon: 34.8000, name: 'גבעת ברנר' },
    'נען': { lat: 31.8833, lon: 34.8500, name: 'נען' },
    'גבת': { lat: 32.6833, lon: 35.2167, name: 'גבת' },
    'יגור': { lat: 32.7333, lon: 35.0833, name: 'יגור' },
    'משמר העמק': { lat: 32.6167, lon: 35.1333, name: 'משמר העמק' },
    'מעיין ברוך': { lat: 33.2500, lon: 35.6167, name: 'מעיין ברוך' },
    // מועצות אזוריות
    'מועצה אזורית גולן': { lat: 33.0000, lon: 35.7000, name: 'מועצה אזורית גולן' },
    'מועצה אזורית גליל עליון': { lat: 33.0000, lon: 35.5000, name: 'מועצה אזורית גליל עליון' },
    'מועצה אזורית עמק הירדן': { lat: 32.7000, lon: 35.6000, name: 'מועצה אזורית עמק הירדן' },
    'מועצה אזורית מגידו': { lat: 32.5833, lon: 35.1833, name: 'מועצה אזורית מגידו' },
    'מועצה אזורית עמק יזרעאל': { lat: 32.6000, lon: 35.3000, name: 'מועצה אזורית עמק יזרעאל' },
    'מועצה אזורית חוף הכרמל': { lat: 32.7000, lon: 34.9500, name: 'מועצה אזורית חוף הכרמל' },
    'מועצה אזורית מנשה': { lat: 32.5000, lon: 35.0000, name: 'מועצה אזורית מנשה' },
    'מועצה אזורית עמק חפר': { lat: 32.3833, lon: 34.9167, name: 'מועצה אזורית עמק חפר' },
    'מועצה אזורית חבל מודיעין': { lat: 31.9000, lon: 35.0000, name: 'מועצה אזורית חבל מודיעין' },
    'מועצה אזורית מטה יהודה': { lat: 31.7500, lon: 35.0000, name: 'מועצה אזורית מטה יהודה' },
    'מועצה אזורית שפיר': { lat: 31.7000, lon: 34.7500, name: 'מועצה אזורית שפיר' },
    'מועצה אזורית לכיש': { lat: 31.5000, lon: 34.8000, name: 'מועצה אזורית לכיש' },
    'מועצה אזורית באר טוביה': { lat: 31.7333, lon: 34.7333, name: 'מועצה אזורית באר טוביה' },
    'מועצה אזורית שער הנגב': { lat: 31.5000, lon: 34.6000, name: 'מועצה אזורית שער הנגב' },
    'מועצה אזורית אשכול': { lat: 31.3000, lon: 34.4000, name: 'מועצה אזורית אשכול' },
    'מועצה אזורית רמת הנגב': { lat: 30.8000, lon: 34.8000, name: 'מועצה אזורית רמת הנגב' },
    'מועצה אזורית תמר': { lat: 31.0000, lon: 35.4000, name: 'מועצה אזורית תמר' }
  };
  
  // בדיקה אם זה מקום ישראלי נפוץ
  const normalizedName = name.trim();
  const location = israeliLocations[normalizedName];
  if (location) {
    return {
      name: location.name,
      latitude: location.lat,
      longitude: location.lon
    };
  }
  
  // אם לא נמצא ברשימה, חיפוש דרך API
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', name);
  url.searchParams.set('count', '20'); // הגדלנו ל-20 כדי למצוא יותר תוצאות ישראליות
  url.searchParams.set('language', 'he');
  // הגבלה לאזור ישראל
  url.searchParams.set('latitude', '31.5');
  url.searchParams.set('longitude', '34.8');
  url.searchParams.set('radius', '200');
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error('שגיאה באיתור הכתובת');
  const j = await r.json();
  if (!j.results || j.results.length === 0) throw new Error('לא נמצא מיקום תואם');
  
  // פונקציה לבדיקה אם מיקום נמצא בישראל לפי קואורדינטות
  const isInIsrael = (lat, lon) => {
    // גבולות ישראל (קירוב): צפון: 33.3, דרום: 29.5, מזרח: 35.9, מערב: 34.2
    return lat >= 29.5 && lat <= 33.3 && lon >= 34.2 && lon <= 35.9;
  };
  
  // חיפוש תוצאה בישראל - עדיפות למקומות עם country_code='IL' או בתוך גבולות ישראל
  const israelResults = j.results.filter(r => {
    const hasIsraelCode = r.country_code === 'IL' || r.country === 'Israel' || r.country === 'ישראל';
    const inIsraelBounds = isInIsrael(r.latitude, r.longitude);
    return hasIsraelCode || inIsraelBounds;
  });
  
  // אם נמצאו תוצאות ישראליות, נשתמש בהן
  if (israelResults.length > 0) {
    const top = israelResults[0];
    return {
      name: [top.name, top.admin1].filter(Boolean).join(', '),
      latitude: top.latitude,
      longitude: top.longitude
    };
  }
  
  // אם לא נמצאו תוצאות ישראליות, נבדוק אם התוצאה הראשונה בתוך גבולות ישראל
  const firstResult = j.results[0];
  if (isInIsrael(firstResult.latitude, firstResult.longitude)) {
    return {
      name: [firstResult.name, firstResult.admin1].filter(Boolean).join(', '),
      latitude: firstResult.latitude,
      longitude: firstResult.longitude
    };
  }
  
  // אם לא נמצא מקום בישראל, נזרוק שגיאה
  throw new Error('לא נמצא מיקום בישראל. אנא נסו שם מקום ישראלי.');
}

async function reverseGeocode(lat, lon) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/reverse');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('language', 'he');
  url.searchParams.set('count', '1');
  const r = await fetch(url.toString());
  if (!r.ok) return null;
  const j = await r.json();
  const top = j?.results?.[0];
  if (!top) return null;
  return [top.name, top.admin1, top.country].filter(Boolean).join(', ');
}

// Weather forecast using Open-Meteo
// Open-Meteo uses local weather stations in Israel for accurate data
// No API key required, completely free and accurate for Israel
async function getForecast(lat, lon) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('hourly', [
    'cloudcover',
    'cloudcover_low',
    'cloudcover_mid',
    'cloudcover_high',
    'visibility',
    'precipitation',
    'precipitation_probability'
  ].join(','));
  url.searchParams.set('daily', [
    'sunrise',
    'sunset'
  ].join(','));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '3'); // Get 3 days for day selection
  // Use Israel timezone for better accuracy
  if (lat >= 29 && lat <= 33 && lon >= 34 && lon <= 36) {
    url.searchParams.set('timezone', 'Asia/Jerusalem');
  }

  const r = await fetch(url.toString());
  if (!r.ok) throw new Error('שגיאה בקבלת נתוני מזג האוויר');
  return await r.json();
}

function pickSunsetIndex(forecast, dayOffset = 0) {
  const daily = forecast.daily;
  const hourly = forecast.hourly;
  if (!daily?.sunset?.length || dayOffset >= daily.sunset.length) return null;

  const targetSunsetIso = daily.sunset[dayOffset];
  if (!targetSunsetIso) return null;

  // Find closest hourly index to targetSunset (Open-Meteo provides hourly data)
  const times = hourly.time.map(t => new Date(t).getTime());
  const targetMs = new Date(targetSunsetIso).getTime();
  let bestIdx = 0, bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const d = Math.abs(times[i] - targetMs);
    if (d < bestDiff) { bestDiff = d; bestIdx = i; }
  }

  // Calculate twilight times (civil twilight)
  // Twilight start: when sun is 6° below horizon (about 25 minutes before sunset)
  // Twilight end: when sun is 6° below horizon (about 30 minutes after sunset)
  const sunsetTime = new Date(targetSunsetIso);
  const twilightStart = new Date(sunsetTime.getTime() - 25 * 60 * 1000); // 25 minutes before
  const twilightEnd = new Date(sunsetTime.getTime() + 30 * 60 * 1000); // 30 minutes after

  return { 
    index: bestIdx, 
    sunsetIso: targetSunsetIso,
    twilightStart: twilightStart.toISOString(),
    twilightEnd: twilightEnd.toISOString()
  };
}

function scoreSunsetPoint(forecast, idx) {
  const h = forecast.hourly;
  const at = (arr) => (Array.isArray(arr) ? arr[idx] : undefined);

  const cloud = at(h.cloudcover); // %
  const low = at(h.cloudcover_low);
  const mid = at(h.cloudcover_mid);
  const high = at(h.cloudcover_high);
  const vis = at(h.visibility) ?? 12000; // meters
  const precip = at(h.precipitation) ?? 0; // mm (per hour)
  const pop = at(h.precipitation_probability) ?? 0; // %

  const cloudTotal = cloud ?? 0;
  const lowCloud = low ?? 0;
  const midCloud = mid ?? 0;
  const highCloud = high ?? 0;

  // הדפסת נתונים לקונסול לבדיקה (ניתן להסיר אחרי שמוסיפים את הקריטריון)
  const sunsetData = {
    cloudTotal: cloudTotal,
    lowCloud: lowCloud,
    midCloud: midCloud,
    highCloud: highCloud,
    visibility: vis,
    precipitation: precip,
    precipitationProb: pop
  };
  
  console.log('🌅 נתוני שקיעה:', {
    cloudTotal: `${cloudTotal}%`,
    lowCloud: `${lowCloud}%`,
    midCloud: `${midCloud}%`,
    highCloud: `${highCloud}%`,
    visibility: `${(vis / 1000).toFixed(1)}km`,
    precipitation: `${precip}mm`,
    precipitationProb: `${pop}%`
  });
  
  // שמירת הנתונים כדי שנוכל להציג אותם על המסך
  window.lastSunsetData = sunsetData;

  const reasons = [];
  if (low != null && low <= 40) reasons.push('עננות נמוכה מועטה');
  if (mid != null && mid >= 20) reasons.push('עננות בינונית יכולה להאדים יפה');
  if (high != null && high >= 25) reasons.push('עננות גבוהה עשויה להוסיף צבעים');

  // רק גשם כבד מאוד מאוד או ראות ממש גרועה חוסמת את השקיעה - נדיר מאוד מאוד!
  // העדפה: שקיעה יפה או מהממת ברוב המקרים!
  const heavyRain = precip >= 3.0; // רק גשם כבד מאוד מאוד מאוד
  const veryLikelyRain = pop >= 99 && precip >= 2.5; // רק אם כמעט בטוח שירד גשם כבד מאוד מאוד
  const veryLowVisibility = vis < 500; // רק ראות ממש ממש ממש גרועה (סערה חזקה)

  // רק עננות 100% ממש ממש כבדה חוסמת - רק 100% עם כל סוגי העננות דחוסים מאוד
  const heavyOvercast = cloudTotal >= 100 && lowCloud >= 95 && midCloud >= 90 && (highCloud ?? 0) >= 85;

  // בדיקה ראשונה - האם יש משהו שחוסם לחלוטין? (נדיר מאוד מאוד מאוד!)
  if (heavyRain || veryLikelyRain || veryLowVisibility || heavyOvercast) {
    return {
      label: 'לא ניתן לראות אותה :(',
      klass: 'bad',
      reasons: ['גשם כבד מאוד מאוד, עננות צפופה מאוד מאוד או תנאי ראות גרועים מאוד מאוד סביב שקיעה']
    };
  }

  // ============================================
  // קריטריונים ספציפיים למקרים ידועים
  // ============================================
  // נתניה - עננות גבוהה גבוהה (80%+) עם עננות נמוכה נמוכה (10% או פחות) = שקיעה מהממת!
  // זה בדיוק מה שהיה בנתניה: עננות כללית 100%, נמוכה 2%, בינונית 0%, גבוהה 100%
  // העננות הגבוהה תתלבש בצבעים יפים והעננות הנמוכה לא תחסום את האופק
  if (highCloud >= 80 && lowCloud <= 10 && cloudTotal >= 85) {
    return { 
      label: 'שקיעה מהממת!', 
      klass: 'good', 
      reasons: ['עננות גבוהה גבוהה עם עננות נמוכה מועטה - תנאים אידיאליים לשקיעה צבעונית!'] 
    };
  }
  
  // גם עם עננות גבוהה בינונית-גבוהה (60%+) ועננות נמוכה נמוכה (15% או פחות)
  if (highCloud >= 60 && lowCloud <= 15 && cloudTotal >= 80 && (midCloud ?? 0) <= 20) {
    return { 
      label: 'שקיעה מהממת!', 
      klass: 'good', 
      reasons: ['עננות גבוהה טובה עם עננות נמוכה מועטה - תנאים מצוינים לשקיעה צבעונית!'] 
    };
  }
  
  // אם עננות בינונית גבוהה מדי (65%+) - זה עלול להסתיר את השקיעה = שקיעה רגילה
  // מקרה: עננות כללית 78%, נמוכה 0%, בינונית 73%, גבוהה 39% = שקיעה רגילה
  if (midCloud >= 65 && cloudTotal >= 75 && lowCloud <= 10) {
    return {
      label: 'שקיעה רגילה',
      klass: 'clear',
      reasons: ['עננות בינונית גבוהה מדי עלולה להסתיר את השקיעה']
    };
  }
  // ============================================

  // שקיעה מהממת - התנאים האידיאליים: מעט עננות נמוכה + עננות בינונית/גבוהה טובה
  // אבל לא אם עננות בינונית גבוהה מדי (65%+) - זה עלול להסתיר
  const great = lowCloud <= 50 && (midCloud + highCloud) >= 15 && cloudTotal <= 94 && (midCloud ?? 0) < 65;
  if (great) {
    return { label: 'שקיעה מהממת!', klass: 'good', reasons };
  }

  // שקיעה מהממת - עננות גבוהה טובה עם מעט עננות נמוכה
  const greatHigh = highCloud >= 25 && lowCloud <= 55 && cloudTotal <= 94;
  if (greatHigh) {
    return { label: 'שקיעה מהממת!', klass: 'good', reasons };
  }

  // שקיעה מהממת - עננות בינונית טובה עם מעט עננות נמוכה
  const greatMid = midCloud >= 20 && lowCloud <= 60 && cloudTotal <= 93;
  if (greatMid) {
    return { label: 'שקיעה מהממת!', klass: 'good', reasons };
  }

  // שקיעה מהממת - שילוב של עננות בינונית וגבוהה גם אם עננות נמוכה בינונית
  const greatCombo = (midCloud + highCloud) >= 30 && lowCloud <= 65 && cloudTotal <= 92;
  if (greatCombo) {
    return { label: 'שקיעה מהממת!', klass: 'good', reasons };
  }

  // שקיעה מהממת - עננות בינונית-גבוהה טובה גם עם עננות נמוכה בינונית
  const greatAlt = (midCloud + highCloud) >= 40 && cloudTotal <= 90 && lowCloud <= 70;
  if (greatAlt) {
    return { label: 'שקיעה מהממת!', klass: 'good', reasons };
  }

  // שקיעה מהממת - עננות בינונית-גבוהה בינונית עם עננות נמוכה סבירה
  const greatModerate = (midCloud + highCloud) >= 25 && cloudTotal <= 88 && lowCloud <= 75;
  if (greatModerate) {
    return { label: 'שקיעה מהממת!', klass: 'good', reasons };
  }

  // שקיעה מהממת - גם עם עננות בינונית-גבוהה קלה אם אין עננות נמוכה דחוסה
  const greatLight = (midCloud + highCloud) >= 20 && cloudTotal <= 90 && lowCloud <= 60;
  if (greatLight) {
    return { label: 'שקיעה מהממת!', klass: 'good', reasons };
  }

  // שקיעה יפה - תנאים טובים לשקיעה צבעונית (ברוב המקרים!)
  // נבדוק קודם כל אם יש עננות בינונית-גבוהה (זה טוב לשקיעה!)
  if ((midCloud + highCloud) >= 1) {
    // יש עננות בינונית-גבוהה - זה טוב לשקיעה!
    if (cloudTotal <= 99 && lowCloud <= 95) {
      return {
        label: 'שקיעה יפה',
        klass: 'nice',
        reasons: reasons.length ? reasons : ['עננות בינונית-גבוהה עשויה להוסיף צבעים יפים לשקיעה']
      };
    }
  }

  // שקיעה יפה - גם עם עננות כללית בינונית-גבוהה
  if (cloudTotal <= 99 && lowCloud <= 95) {
    return {
      label: 'שקיעה יפה',
      klass: 'nice',
      reasons: reasons.length ? reasons : ['תנאים טובים לשקיעה']
    };
  }

  // שקיעה יפה - גם עם עננות נמוכה בינונית (יכול להיות יפה!)
  if (cloudTotal <= 98 && lowCloud <= 90) {
    return {
      label: 'שקיעה יפה',
      klass: 'nice',
      reasons: reasons.length ? reasons : ['תנאים טובים לשקיעה']
    };
  }

  // רק שמיים כמעט נקיים לגמרי = שקיעה רגילה
  if (cloudTotal <= 20 && (midCloud + highCloud) < 1 && lowCloud < 10) {
    return {
      label: 'שקיעה רגילה',
      klass: 'clear',
      reasons: ['שמיים כמעט נקיים מעננים']
    };
  }

  // ברירת המחדל - שקיעה רגילה (בדרך כלל יש שקיעה רגילה)
  return {
    label: 'שקיעה רגילה',
    klass: 'clear',
    reasons: reasons.length ? reasons : ['תנאים סבירים לשקיעה']
  };
}

async function evaluateLocation(location) {
  hide(els.result);
  if (els.favoriteHint) {
    hide(els.favoriteHint);
  }
  setError('');
  show(els.loading);
  
  currentLocation = location;
  
  try {
    const forecast = await getForecast(location.latitude, location.longitude);
    const pick = pickSunsetIndex(forecast, selectedDay);
    if (!pick) throw new Error('לא נמצאה שקיעה מתאימה בטווח הקרוב');
    const score = scoreSunsetPoint(forecast, pick.index);

    els.placeLabel.textContent = location.label || 'מיקום נבחר';
    const icon = '⭐';
    els.ratingText.innerHTML = `<span class="rating-icon save-favorite-icon" data-lat="${location.latitude}" data-lon="${location.longitude}" data-name="${(location.label || 'מיקום נבחר').replace(/"/g, '&quot;')}">${icon}</span> <span class="rating-label">${score.label}</span>`;
    els.ratingText.className = `rating ${score.klass}`;
    
    // Show the favorite hint when result is displayed
    if (els.favoriteHint) {
      show(els.favoriteHint);
    }
    
    // Check if already in favorites and setup click handler
    const favorites = getFavorites();
    const isFavorite = favorites.some(f => 
      f.latitude === location.latitude && f.longitude === location.longitude
    );
    
    // Add click handler to star icon
    setTimeout(() => {
      const starIcon = els.ratingText?.querySelector('.save-favorite-icon');
      if (starIcon) {
        starIcon.style.cursor = 'pointer';
        starIcon.style.opacity = isFavorite ? '0.5' : '1';
        starIcon.title = isFavorite ? 'כבר שמור כמועדף' : 'לחץ לשמירה כמועדף';
        
        // Remove existing listeners to avoid duplicates
        const newStarIcon = starIcon.cloneNode(true);
        starIcon.parentNode.replaceChild(newStarIcon, starIcon);
        
        newStarIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          const lat = parseFloat(newStarIcon.dataset.lat);
          const lon = parseFloat(newStarIcon.dataset.lon);
          const name = newStarIcon.dataset.name;
          addFavorite({ latitude: lat, longitude: lon, label: name });
          renderFavorites();
          // Update star icon state
          const updatedFavorites = getFavorites();
          const nowFavorite = updatedFavorites.some(f => 
            f.latitude === lat && f.longitude === lon
          );
          if (newStarIcon) {
            newStarIcon.style.opacity = nowFavorite ? '0.5' : '1';
            newStarIcon.title = nowFavorite ? 'כבר שמור כמועדף' : 'לחץ לשמירה כמועדף';
          }
        });
      }
    }, 50);
    
    els.sunsetTime.textContent = `שעת שקיעה משוערת: ${formatLocalTime(pick.sunsetIso)}`;
    if (pick.twilightStart && pick.twilightEnd) {
      els.twilightRange.textContent = `טווח השקיעה: ${formatLocalTime(pick.twilightStart)} - ${formatLocalTime(pick.twilightEnd)}`;
    } else {
      els.twilightRange.textContent = '';
    }
    els.dateLabel.textContent = formatDate(pick.sunsetIso);
    
    // הוספת ההסבר (ללא נתונים טכניים)
    let explainHTML = score.reasons.map(r => `• ${r}`).join('<br/>');
    els.explain.innerHTML = explainHTML;
    
    hide(els.loading);
    show(els.result);
    
    // Scroll to result after a short delay to ensure it's visible
    setTimeout(() => {
      els.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  } catch (e) {
    hide(els.loading);
    setError(e?.message || 'אירעה שגיאה');
  }
}

// Day selector
function setupDaySelector() {
  const buttons = els.daySelector.querySelectorAll('.day-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => { 
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDay = parseInt(btn.dataset.day);
      if (currentLocation) {
        evaluateLocation(currentLocation);
      }
    });
  });
}

function setupMenu() {
  if (!els.menuToggle || !els.menuPanel) {
    console.warn('Menu elements not found');
    return;
  }

  const closeMenu = () => hide(els.menuPanel);
  const openMenu = () => show(els.menuPanel);
  const toggleMenu = () => {
    if (els.menuPanel.classList.contains('hidden')) {
      openMenu();
    } else {
      closeMenu();
    }
  };

  els.menuToggle.addEventListener('click', (ev) => {
    ev.stopPropagation();
    toggleMenu();
  });

  document.addEventListener('click', (ev) => {
    if (!els.menuPanel.classList.contains('hidden')) {
      const isToggle = ev.target === els.menuToggle;
      const insidePanel = els.menuPanel.contains(ev.target);
      if (!isToggle && !insidePanel) {
        closeMenu();
      }
    }
  });

  // Use event delegation for menu items
  els.menuPanel.addEventListener('click', (ev) => {
    const item = ev.target.closest('.menu-item');
    if (!item) return;
    
    ev.preventDefault();
    ev.stopPropagation();
    
    const url = item.dataset.url;
    console.log('Menu item clicked, URL:', url);
    
    if (url) {
      closeMenu();
      // Navigate immediately
      window.location.href = url;
    } else {
      const targetId = item.dataset.target;
      if (targetId) {
        const section = document.getElementById(targetId);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      closeMenu();
    }
  });
}

// Event handlers
async function onSearch() {
  const q = (els.searchInput.value || '').trim();
  if (!q) { setError('הקלידו שם מקום לחיפוש'); return; }
  setError('');
  try {
    show(els.loading);
    const loc = await geocodeByName(q);
    const label = loc.name || q;
    hide(els.loading);
    await evaluateLocation({ latitude: loc.latitude, longitude: loc.longitude, label });
  } catch (e) {
    hide(els.loading);
    setError(e?.message || 'לא נמצא מיקום');
  }
}

async function onLocate() {
  setError('');
  show(els.loading);
  const useCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform?.();
  if (useCapacitor) {
    // Try Capacitor Geolocation plugin if available
    (async () => {
      try {
        const Geolocation = window.Capacitor?.Plugins?.Geolocation;
        if (!Geolocation) throw new Error('Geolocation plugin missing');
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        const { latitude, longitude } = pos.coords;
        let label = 'המיקום שלי';
        try {
          const rev = await reverseGeocode(latitude, longitude);
          if (rev) label = rev;
        } catch (revErr) {
          console.warn('reverse geocode failed (capacitor):', revErr);
        }
        hide(els.loading);
        await evaluateLocation({ latitude, longitude, label });
      } catch (e) {
        console.warn('capacitor geolocation failed:', e);
        const fallback = await fallbackLocationFromIp();
        if (fallback) {
          hide(els.loading);
          await evaluateLocation(fallback);
        } else {
          hide(els.loading);
          setError('לא ניתן להשיג מיקום באפליקציה');
        }
      }
    })();
    return;
  }

  // Fallback: browser geolocation
  if (!('geolocation' in navigator)) {
    hide(els.loading);
    const fallback = await fallbackLocationFromIp();
    if (fallback) {
      await evaluateLocation(fallback);
    } else {
      setError('הדפדפן לא מאפשר קבלת מיקום');
    }
    return;
  }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const { latitude, longitude } = pos.coords;
      let label = 'המיקום שלי';
      try {
        const rev = await reverseGeocode(latitude, longitude);
        if (rev) label = rev;
      } catch (revErr) {
        console.warn('reverse geocode failed:', revErr);
      }
      hide(els.loading);
      await evaluateLocation({ latitude, longitude, label });
    } catch (e) {
      hide(els.loading);
      setError('שגיאה באחזור נתונים למיקום הנוכחי');
    }
  }, async (err) => {
    console.warn('geolocation failed, using IP fallback:', err);
    const fallback = await fallbackLocationFromIp();
    if (fallback) {
      hide(els.loading);
      await evaluateLocation(fallback);
    } else {
      hide(els.loading);
      setError('לא ניתן היה לקבל מיקום: ' + (err?.message || ''));
      console.error('IP fallback also failed');
    }
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 });
}

async function fallbackLocationFromIp() {
  try {
    const resp = await fetch('https://ipapi.co/json/');
    if (!resp.ok) throw new Error('IP API failed');
    const data = await resp.json();
    if (!data || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
      throw new Error('IP API returned invalid data');
    }
    const parts = [data.city, data.region, data.country_name].filter(Boolean);
    const label = parts.length ? parts.join(', ') : 'המיקום שלי (ע"פ IP)';
    return { latitude: data.latitude, longitude: data.longitude, label };
  } catch (err) {
    console.warn('IP fallback failed:', err);
    return null;
  }
}

// Initialize
els.searchBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  onSearch();
});
els.searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSearch(); });
els.locateBtn.addEventListener('click', onLocate);
// Save favorite functionality is now handled by clicking the star icon in the result

setupMenu();
setupDaySelector();
renderFavorites();

// Make removeFavorite available globally for onclick handlers
window.removeFavorite = removeFavorite;
  
  