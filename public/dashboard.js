

const userEmail = localStorage.getItem('userEmail');
if (!userEmail) window.location.href = 'login.html';

const userName = localStorage.getItem('userName') || 'there';
document.getElementById('greeting').textContent = `Hi, ${userName} 👋`;

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'login.html';
});

let currentWeather = null;
let currentLocation = '';
let reminderInterval = null;
let reminderMins = 20;
let countdownInterval = null;
let nextReminderTime = null;

function getRiskClass(level) {
  return level.toLowerCase().replace(' ', '');
}

const riskDescriptions = {
  Low:      'Conditions are manageable. Stay hydrated and take regular breaks.',
  Moderate: 'Heat is building. Limit sun exposure between 11am–3pm.',
  High:     'Dangerous heat. Work early morning or after sunset only.',
  Extreme:  'STOP non-essential outdoor activity. Move to shade or A/C immediately.'
};

let searchTimeout = null;
const cityInput   = document.getElementById('citySearch');
const dropdown    = document.getElementById('searchDropdown');

cityInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const q = cityInput.value.trim();
  if (q.length < 2) { dropdown.classList.remove('open'); return; }
  searchTimeout = setTimeout(() => geocodeCity(q), 400);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-input-wrap')) dropdown.classList.remove('open');
});

async function geocodeCity(q) {
  try {
    const res  = await fetch(`/weather/geocode?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    renderDropdown(data);
  } catch { dropdown.classList.remove('open'); }
}

function renderDropdown(results) {
  if (!results.length) { dropdown.classList.remove('open'); return; }
  dropdown.innerHTML = results.map((r, i) =>
    `<div class="dropdown-item" data-i="${i}">
       <span>${r.name}</span>
       <span class="dropdown-country">${r.country || ''}</span>
     </div>`
  ).join('');
  dropdown.__results = results;
  dropdown.classList.add('open');
  dropdown.querySelectorAll('.dropdown-item').forEach(el => {
    el.addEventListener('click', () => {
      const r = dropdown.__results[el.dataset.i];
      cityInput.value = r.name;
      dropdown.classList.remove('open');
      loadWeather(r.latitude, r.longitude, `${r.name}${r.country ? ', ' + r.country : ''}`);
    });
  });
}

document.getElementById('gpsBtn').addEventListener('click', () => {
  if (!navigator.geolocation) { alert('Geolocation not supported by your browser.'); return; }
  setLoading(true);
  navigator.geolocation.getCurrentPosition(
    pos => loadWeather(pos.coords.latitude, pos.coords.longitude, 'Your Location'),
    ()  => { setLoading(false); alert('Could not get your location. Please search manually.'); }
  );
});

async function loadWeather(lat, lon, locationName) {
  setLoading(true);
  try {
    const res  = await fetch(`/weather?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Weather fetch failed');
    currentWeather  = data;
    currentLocation = locationName;
    renderWeather(data, locationName);
  } catch (err) {
    setLoading(false);
    showEmptyState();
    alert('Could not load weather data. Please try again.');
  }
}

function renderWeather(d, locationName) {
  setLoading(false);

document.getElementById('emptyState').style.display    = 'none';
  document.getElementById('weatherContent').style.display = '';

const meta = document.getElementById('locationMeta');
  meta.style.display = 'flex';
  document.getElementById('locationName').textContent = locationName;
  document.getElementById('lastUpdated').textContent  = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

  renderRiskCard(d);
  renderStats(d);
  renderHourlyBar(d);
  renderSafeTimes(d.safestTimes);
  renderTips(d.tips);
  renderReportCard(d, locationName);
  loadSavedReports();
}

function renderRiskCard(d) {
  const level = d.heatRiskLevel;
  const cls   = getRiskClass(level);

  const badge = document.getElementById('riskBadge');
  badge.textContent = level.toUpperCase();
  badge.className   = `risk-badge ${cls}`;

  document.getElementById('riskDesc').textContent   = riskDescriptions[level] || '';
  document.getElementById('riskTempBig').textContent = `${Math.round(d.feelsLike)}°C`;

const glowColors = { low:'#22c55e', moderate:'#eab308', high:'#f97316', extreme:'#ef4444' };
  const riskCard = document.getElementById('riskCard');
  riskCard.style.borderColor = glowColors[cls] + '44';
  document.getElementById('riskGlow').style.background = glowColors[cls];
}

function renderStats(d) {
  document.getElementById('statTemp').textContent     = `${Math.round(d.temperature)}°C`;
  document.getElementById('statHumidity').textContent = `${d.humidity}%`;
  document.getElementById('statUV').textContent       = d.uvIndex.toFixed(1);
}

function renderHourlyBar(d) {
  const bar      = document.getElementById('hourlyBar');
  const nowHour  = new Date().getHours();
  bar.innerHTML  = '';

  d.hourlyTimes.forEach((timeStr, i) => {
    const hour  = new Date(timeStr).getHours();
    const temp  = Math.round(d.hourlyFeelsLike[i]);
    const risk  = (d.hourlyRiskLevels[i] || 'Low').toLowerCase();
    const isNow = hour === nowHour;

    const card = document.createElement('div');
    card.className = `hour-card${isNow ? ' current' : ''}`;
    card.innerHTML = `
      <span class="hour-time">${String(hour).padStart(2,'0')}:00</span>
      <span class="hour-temp">${temp}°</span>
      <span class="hour-dot ${risk}"></span>
    `;
    bar.appendChild(card);

if (isNow) {
      setTimeout(() => card.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' }), 300);
    }
  });
}

function renderSafeTimes(times) {
  const wrap = document.getElementById('safeTimes');
  wrap.innerHTML = '';
  if (!times || !times.length) {
    wrap.innerHTML = `<span class="safe-time-pill none">No safe outdoor hours today</span>`;
    return;
  }
  times.forEach(t => {
    const pill = document.createElement('span');
    const isNone = t.toLowerCase().includes('no safe');
    pill.className = `safe-time-pill${isNone ? ' none' : ''}`;
    pill.textContent = t;
    wrap.appendChild(pill);
  });
}

function renderTips(tips) {
  const grid = document.getElementById('tipsGrid');
  grid.innerHTML = '';
  (tips || []).forEach((tip, i) => {
    const card = document.createElement('div');
    card.className = 'tip-card';
    card.innerHTML = `<span class="tip-num">${String(i + 1).padStart(2, '0')}</span><span>${tip}</span>`;
    grid.appendChild(card);
  });
}

function renderReportCard(d, locationName) {
  const now       = new Date();
  const dateStr   = now.toLocaleDateString('en-AE', { weekday:'short', year:'numeric', month:'short', day:'numeric' });
  const timeStr   = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  const level     = d.heatRiskLevel;
  const cls       = getRiskClass(level);

  document.getElementById('rcDate').textContent     = `${dateStr} · ${timeStr}`;
  document.getElementById('rcLocation').textContent = locationName;

  const rcBadge = document.getElementById('rcRiskBadge');
  rcBadge.textContent = level.toUpperCase();
  rcBadge.className   = `rc-risk-badge ${cls}`;

  document.getElementById('rcFeelsLike').textContent = `${Math.round(d.feelsLike)}°C`;
  document.getElementById('rcHumidity').textContent  = `${d.humidity}%`;
  document.getElementById('rcUV').textContent        = d.uvIndex.toFixed(1);

  document.getElementById('rcTimesList').innerHTML = (d.safestTimes || []).join('<br>') || 'N/A';
  document.getElementById('rcTipsList').innerHTML  = (d.tips || []).slice(0,2).map(t => `• ${t}`).join('<br>');
}

document.getElementById('downloadBtn').addEventListener('click', async () => {
  if (!currentWeather) return;
  try {
    const canvas = await html2canvas(document.getElementById('report-card'), {
      backgroundColor: '#0a0f1e',
      scale: 2,
      useCORS: true
    });
    const link = document.createElement('a');
    link.download = 'HeatIQ-report.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Report downloaded!');
  } catch { showToast('Download failed. Try again.'); }
});

document.getElementById('copyBtn').addEventListener('click', () => {
  if (!currentWeather) return;
  const d    = currentWeather;
  const now  = new Date().toLocaleDateString('en-AE', { month:'short', day:'numeric', year:'numeric' });
  const text = [
    `HeatIQ Safety Report — ${currentLocation} — ${now}`,
    `Risk: ${d.heatRiskLevel.toUpperCase()} | Feels Like: ${Math.round(d.feelsLike)}°C | Humidity: ${d.humidity}% | UV: ${d.uvIndex.toFixed(1)}`,
    `Safe times: ${(d.safestTimes || []).join(', ') || 'None today'}`,
    `Tips: ${(d.tips || []).slice(0,2).join(' / ')}`,
    `Stay safe! — ClimaTech HeatIQ`
  ].join('\n');
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!')).catch(() => showToast('Copy failed.'));
});

document.getElementById('saveReportBtn').addEventListener('click', async () => {
  if (!currentWeather) return;
  const d = currentWeather;
  try {
    const res = await fetch('/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userEmail,
        locationName:  currentLocation,
        temperature:   d.temperature,
        feelsLike:     d.feelsLike,
        humidity:      d.humidity,
        uvIndex:       d.uvIndex,
        heatRiskLevel: d.heatRiskLevel,
        safestTimes:   d.safestTimes,
        tips:          d.tips
      })
    });
    if (res.ok) {
      showToast('Report saved!');
      loadSavedReports();
    } else {
      showToast('Could not save report.');
    }
  } catch { showToast('Connection error.'); }
});

async function loadSavedReports() {
  try {
    const res  = await fetch(`/reports?userEmail=${encodeURIComponent(userEmail)}`);
    const data = await res.json();
    renderSavedReports(data);
  } catch {  }
}

function renderSavedReports(reports) {
  const list  = document.getElementById('savedReportsList');
  const count = document.getElementById('savedCount');

  if (!reports || !reports.length) {
    list.innerHTML = `<div class="saved-empty">No saved reports yet. Save one above!</div>`;
    count.textContent = '0 reports';
    return;
  }

  count.textContent = `${reports.length} report${reports.length !== 1 ? 's' : ''}`;
  list.innerHTML = reports.map(r => {
    const date = new Date(r.createdAt).toLocaleDateString('en-AE', { month:'short', day:'numeric', year:'numeric' });
    const cls  = getRiskClass(r.heatRiskLevel || 'Low');
    return `
      <div class="saved-report-row">
        <div class="saved-row-left">
          <span class="saved-risk-badge ${cls}">${(r.heatRiskLevel || '—').toUpperCase()}</span>
          <span class="saved-location">${r.locationName || '—'}</span>
          <span class="saved-date">${date}</span>
        </div>
        <button class="btn-delete-report" data-id="${r._id}">Delete</button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.btn-delete-report').forEach(btn => {
    btn.addEventListener('click', () => deleteReport(btn.dataset.id));
  });
}

async function deleteReport(id) {
  try {
    const res = await fetch(`/reports/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) loadSavedReports();
  } catch {  }
}

const reminderToggle   = document.getElementById('reminderToggle');
const reminderSettings = document.getElementById('reminderSettings');
const reminderLabel    = document.getElementById('reminderLabel');

reminderToggle.addEventListener('change', () => {
  if (reminderToggle.checked) {
    enableReminders();
  } else {
    disableReminders();
  }
});

document.querySelectorAll('.interval-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.interval-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    reminderMins = parseInt(btn.dataset.mins);
    if (reminderToggle.checked) {
      disableReminders();
      enableReminders();
    }
  });
});

function enableReminders() {
  Notification.requestPermission().then(perm => {
    if (perm !== 'granted') {
      alert('Please allow notifications to use this feature.');
      reminderToggle.checked = false;
      return;
    }
    reminderSettings.style.display = '';
    reminderLabel.textContent = 'On';
    scheduleNextReminder();
  });
}

function scheduleNextReminder() {
  clearInterval(reminderInterval);
  clearInterval(countdownInterval);

  nextReminderTime = Date.now() + reminderMins * 60 * 1000;
  updateCountdown();

  reminderInterval = setInterval(() => {
    new Notification('HeatIQ Reminder', {
      body: 'Time to drink water! Take a shade break if you\'re outside.',
      icon: 'assets/hlogo.png'
    });
    nextReminderTime = Date.now() + reminderMins * 60 * 1000;
  }, reminderMins * 60 * 1000);

  countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  if (!nextReminderTime) return;
  const remaining = Math.max(0, Math.floor((nextReminderTime - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const el = document.getElementById('nextReminderIn');
  if (el) el.textContent = `${m}m ${String(s).padStart(2,'0')}s`;
}

function disableReminders() {
  clearInterval(reminderInterval);
  clearInterval(countdownInterval);
  reminderSettings.style.display = 'none';
  reminderLabel.textContent = 'Off';
  nextReminderTime = null;
}

let toastTimeout = null;
function showToast(msg) {
  const toast = document.getElementById('reportToast');
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

function setLoading(on) {
  document.getElementById('loadingState').style.display  = on ? 'flex' : 'none';
  document.getElementById('emptyState').style.display    = on ? 'none' : '';
  document.getElementById('weatherContent').style.display = 'none';
  if (on) document.getElementById('emptyState').style.display = 'none';
}

function showEmptyState() {
  document.getElementById('emptyState').style.display    = '';
  document.getElementById('loadingState').style.display  = 'none';
  document.getElementById('weatherContent').style.display = 'none';
}

loadSavedReports();