// Elements
const els = {
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  locateBtn: document.getElementById('locateBtn'),
  placeLabel: document.getElementById('placeLabel'),
  result: document.getElementById('result'),
  ratingText: document.getElementById('ratingText'),
  sunsetTime: document.getElementById('sunsetTime'),
  twilightRange: document.getElementById('twilightRange'),
  explain: document.getElementById('explain'),
  dateLabel: document.getElementById('dateLabel'),
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  daySelector: document.getElementById('daySelector'),
  saveFavoriteBtn: document.getElementById('saveFavoriteBtn'),
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
      <div class="favorite-item-coords">${fav.latitude.toFixed(2)}, ${fav.longitude.toFixed(2)}</div>
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
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', name);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'he');
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error('שגיאה באיתור הכתובת');
  const j = await r.json();
  if (!j.results || j.results.length === 0) throw new Error('לא נמצא מיקום תואם');
  const top = j.results[0];
  return {
    name: [top.name, top.admin1, top.country].filter(Boolean).join(', '),
    latitude: top.latitude,
    longitude: top.longitude
  };
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
  setError('');
  show(els.loading);
  
  currentLocation = location;
  
  try {
    const forecast = await getForecast(location.latitude, location.longitude);
    const pick = pickSunsetIndex(forecast, selectedDay);
    if (!pick) throw new Error('לא נמצאה שקיעה מתאימה בטווח הקרוב');
    const score = scoreSunsetPoint(forecast, pick.index);

    els.placeLabel.textContent = location.label || 'מיקום נבחר';
    const icon = score.klass === 'good' ? '🌟' : score.klass === 'nice' ? '✨' : score.klass === 'clear' ? '☀️' : '🌫️';
    els.ratingText.textContent = `${icon} ${score.label}`;
    els.ratingText.className = `rating ${score.klass}`;
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
    
    // Check if already in favorites
    const favorites = getFavorites();
    const isFavorite = favorites.some(f => 
      f.latitude === location.latitude && f.longitude === location.longitude
    );
    els.saveFavoriteBtn.style.opacity = isFavorite ? '0.5' : '1';
    els.saveFavoriteBtn.title = isFavorite ? 'כבר שמור כמועדף' : 'שמור כמועדף';
    
    hide(els.loading);
    show(els.result);
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
  if (!els.menuToggle || !els.menuPanel) return;

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

  els.menuPanel.addEventListener('click', (ev) => {
    const item = ev.target.closest('.menu-item');
    if (!item) return;
    ev.preventDefault();
    const url = item.dataset.url;
    if (url) {
      window.location.href = url;
    } else {
      const targetId = item.dataset.target;
      if (targetId) {
        const section = document.getElementById(targetId);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
    closeMenu();
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
els.searchBtn.addEventListener('click', onSearch);
els.searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSearch(); });
els.locateBtn.addEventListener('click', onLocate);
els.saveFavoriteBtn.addEventListener('click', () => {
  if (currentLocation) {
    addFavorite(currentLocation);
    els.saveFavoriteBtn.style.opacity = '0.5';
    els.saveFavoriteBtn.title = 'כבר שמור כמועדף';
  }
});

setupMenu();
setupDaySelector();
renderFavorites();

// Make removeFavorite available globally for onclick handlers
window.removeFavorite = removeFavorite;
  
  