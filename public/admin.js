

const adminEmail = localStorage.getItem('userEmail');
const userRole = localStorage.getItem('userRole');
if (!adminEmail || userRole !== 'admin') window.location.href = 'login.html';

const adminName    = localStorage.getItem('userName')    || 'Admin';
const adminCompany = localStorage.getItem('userCompany') || 'Your Company';

document.getElementById('topbarAdmin').textContent   = adminName;
document.getElementById('topbarCompany').textContent = adminCompany;

const today = new Date();
document.getElementById('todayDate').textContent = today.toLocaleDateString('en-AE', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});
document.getElementById('printDate').textContent = today.toLocaleDateString('en-AE', {
  year: 'numeric', month: 'short', day: 'numeric'
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'login.html';
});

let workers = [];
let workerWeather = {};

function getRiskClass(level = '') {
  return (level || '').toLowerCase().replace(' ', '');
}
const riskColors = {
  low:      '#22c55e',
  moderate: '#eab308',
  high:     '#f97316',
  extreme:  '#ef4444'
};

const addBtn     = document.getElementById('addWorkerBtn');
const addForm    = document.getElementById('addWorkerForm');
const closeBtn   = document.getElementById('closeFormBtn');
const cancelBtn  = document.getElementById('cancelFormBtn');

addBtn.addEventListener('click', () => {
  addForm.style.display = '';
  addBtn.style.display  = 'none';
  addForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
closeBtn.addEventListener('click',  hideForm);
cancelBtn.addEventListener('click', hideForm);

function hideForm() {
  addForm.style.display = 'none';
  addBtn.style.display  = '';
  clearFormFields();
  document.getElementById('formError').style.display = 'none';
}
function clearFormFields() {
  ['wName','wRole','wEmail','wPhone','wCity'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('wShiftStart').value = '06:00';
  document.getElementById('wShiftEnd').value   = '14:00';
}

document.getElementById('saveWorkerBtn').addEventListener('click', async () => {
  const name       = document.getElementById('wName').value.trim();
  const jobRole    = document.getElementById('wRole').value.trim();
  const email      = document.getElementById('wEmail').value.trim();
  const phone      = document.getElementById('wPhone').value.trim();
  const shiftStart = document.getElementById('wShiftStart').value;
  const shiftEnd   = document.getElementById('wShiftEnd').value;
  const city       = document.getElementById('wCity').value.trim();
  const errEl      = document.getElementById('formError');

  if (!name || !jobRole || !shiftStart || !shiftEnd || !city) {
    errEl.textContent = 'Please fill in all required fields.';
    errEl.style.display = '';
    return;
  }
  errEl.style.display = 'none';

  const payload = { adminEmail, workerName: name, jobRole, workerEmail: email, phone, shiftStart, shiftEnd, locationCity: city };

  try {
    const res = await fetch('/admin/workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error();
    hideForm();
    loadWorkers();
  } catch {
    errEl.textContent = 'Could not save worker. Please try again.';
    errEl.style.display = '';
  }
});

async function loadWorkers() {
  try {
    const res  = await fetch(`/admin/workers?adminEmail=${encodeURIComponent(adminEmail)}`);
    const data = await res.json();
    workers = Array.isArray(data) ? data : [];
  } catch {
    workers = [];
  }
  renderWorkerCards();
  fetchAllWorkerWeather();
  updateSummaryStats();
  renderBriefing();
  loadReports();
}

function renderWorkerCards() {
  const grid  = document.getElementById('workerGrid');
  const count = document.getElementById('workerCount');
  count.textContent = `${workers.length} worker${workers.length !== 1 ? 's' : ''}`;

  if (!workers.length) {
    grid.innerHTML = `<div class="workers-empty" id="workersEmpty">No workers added yet. Click "Add Worker" to get started.</div>`;
    return;
  }

  grid.innerHTML = workers.map(w => {
    const wx      = workerWeather[w._id];
    const level   = wx ? wx.heatRiskLevel : 'loading';
    const cls     = wx ? getRiskClass(level) : 'loading';
    const feels   = wx ? `${Math.round(wx.feelsLike)}°C` : '—';
    const color   = riskColors[cls] || 'transparent';
    const isOn    = isOnShift(w.shiftStart, w.shiftEnd);

    return `
      <div class="worker-card" style="--wc-color:${color}" data-id="${w._id}">
        <div class="worker-card-top">
          <div>
            <div class="worker-name">${w.workerName}</div>
            <div class="worker-role">${w.jobRole || '—'}</div>
          </div>
          <div class="worker-card-actions">
            <button class="btn-icon" onclick="deleteWorker('${w._id}')" title="Delete worker">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>
        <div class="worker-meta">
          <div class="worker-meta-row">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${w.shiftStart || '—'} – ${w.shiftEnd || '—'}
            <span style="margin-left:4px;color:${isOn ? '#4ade80' : 'var(--text-dim)'};font-size:11px;font-weight:700;">
              ${isOn ? '● ON SHIFT' : '○ OFF'}
            </span>
          </div>
          <div class="worker-meta-row">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ${w.locationCity || 'No location set'}
          </div>
        </div>
        <div class="worker-risk-row">
          <span class="worker-risk-badge ${cls}">
            ${wx ? level.toUpperCase() : 'Loading...'}
          </span>
          <span class="worker-feels">${feels}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function fetchAllWorkerWeather() {
  if (!workers.length) return;

  const promises = workers.map(async (w) => {
    if (!w.locationCity) return;
    try {

      const geoRes  = await fetch(`/weather/geocode?q=${encodeURIComponent(w.locationCity)}`);
      const geoData = await geoRes.json();
      if (!geoData.length) return;
      const { latitude, longitude } = geoData[0];

const wxRes  = await fetch(`/weather?lat=${latitude}&lon=${longitude}`);
      const wxData = await wxRes.json();

      workerWeather[w._id] = {
        heatRiskLevel: wxData.heatRiskLevel,
        feelsLike:     wxData.feelsLike
      };
    } catch {  }
  });

  await Promise.all(promises);

renderWorkerCards();
  updateSummaryStats();
  renderBriefing();
}

async function deleteWorker(id) {
  if (!confirm('Remove this worker?')) return;
  try {
    const res = await fetch(`/admin/workers/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) loadWorkers();
  } catch { alert('Could not delete worker.'); }
}

function isOnShift(start, end) {
  if (!start || !end) return false;
  const now = new Date();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const nowMins   = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins   = eh * 60 + em;
  return nowMins >= startMins && nowMins <= endMins;
}

function updateSummaryStats() {
  const total   = workers.length;
  const onShift = workers.filter(w => isOnShift(w.shiftStart, w.shiftEnd)).length;
  const atRisk  = workers.filter(w => {
    const wx = workerWeather[w._id];
    return wx && (wx.heatRiskLevel === 'High' || wx.heatRiskLevel === 'Extreme');
  }).length;

  document.getElementById('statTotal').textContent   = total;
  document.getElementById('statOnShift').textContent = onShift;
  document.getElementById('statAtRisk').textContent  = atRisk;
}

function renderBriefing() {
  const wrap = document.getElementById('briefingContent');

  if (!workers.length) {
    wrap.innerHTML = `<div class="briefing-empty">Add workers to generate today's briefing.</div>`;
    return;
  }

  wrap.innerHTML = workers.map(w => {
    const wx    = workerWeather[w._id];
    const level = wx ? wx.heatRiskLevel : 'Loading';
    const cls   = wx ? getRiskClass(level) : 'loading';
    return `
      <div class="briefing-row">
        <span class="briefing-name">${w.workerName}</span>
        <span class="briefing-shift">${w.shiftStart || '—'} – ${w.shiftEnd || '—'}</span>
        <span class="briefing-city">${w.locationCity || '—'}</span>
        <span class="briefing-risk-badge ${cls}">${level.toUpperCase()}</span>
      </div>
    `;
  }).join('');

document.getElementById('printContent').innerHTML = wrap.innerHTML;
}

document.getElementById('copyBriefingBtn').addEventListener('click', () => {
  const lines = workers.map(w => {
    const wx    = workerWeather[w._id];
    const level = wx ? wx.heatRiskLevel : '—';
    return `${w.workerName} | ${w.jobRole} | ${w.shiftStart}–${w.shiftEnd} | ${w.locationCity} | Risk: ${level}`;
  });
  const text = [
    `HeatIQ Daily Briefing — ${today.toLocaleDateString('en-AE')}`,
    `Company: ${adminCompany}`,
    '—'.repeat(40),
    ...lines
  ].join('\n');
  navigator.clipboard.writeText(text).then(() => alert('Briefing copied to clipboard!'));
});

document.getElementById('printBriefingBtn').addEventListener('click', () => {
  window.print();
});

async function loadReports() {
  try {
    const res  = await fetch(`/admin/reports?adminEmail=${encodeURIComponent(adminEmail)}`);
    const data = await res.json();
    renderReportsTable(Array.isArray(data) ? data : []);
    document.getElementById('statReports').textContent = Array.isArray(data) ? data.length : 0;
  } catch {
    document.getElementById('statReports').textContent = '—';
  }
}

function renderReportsTable(reports) {
  const wrap = document.getElementById('reportsTableWrap');
  if (!reports.length) {
    wrap.innerHTML = `<div class="table-empty">No reports submitted by workers today.</div>`;
    return;
  }
  wrap.innerHTML = `
    <table class="reports-table">
      <thead>
        <tr>
          <th>Worker</th>
          <th>Location</th>
          <th>Risk</th>
          <th>Feels Like</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        ${reports.map(r => {
          const t   = new Date(r.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
          const cls = getRiskClass(r.heatRiskLevel || '');
          return `
            <tr>
              <td class="td-name">${r.userEmail || '—'}</td>
              <td>${r.locationName || '—'}</td>
              <td><span class="td-risk-badge ${cls}">${(r.heatRiskLevel || '—').toUpperCase()}</span></td>
              <td>${r.feelsLike != null ? Math.round(r.feelsLike) + '°C' : '—'}</td>
              <td>${t}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

document.getElementById('feedbackBtn').addEventListener('click', () => {
  const text  = document.getElementById('feedbackText').value.trim();
  const toast = document.getElementById('feedbackToast');
  if (!text) { toast.textContent = 'Please write something first.'; toast.style.color = '#f87171'; return; }

  document.getElementById('feedbackText').value = '';
  toast.style.color = '#4ade80';
  toast.textContent = '✅ Feedback sent — thank you!';
  setTimeout(() => { toast.textContent = ''; }, 3000);
});

loadWorkers();