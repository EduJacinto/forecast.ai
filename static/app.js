/* app.js — Forecast.ai frontend logic */

let chartInstance = null;
/**
shows a loading spinner on the predict button
*/
function setLoading(loading) {
  const btn    = document.getElementById('predict-btn');
  const label  = document.getElementById('btn-label');
  const arrow  = document.getElementById('btn-arrow');
  const spinner = document.getElementById('btn-spinner');

  btn.disabled = loading;
  label.textContent = loading ? 'Training model…' : 'Predict';
  arrow.classList.toggle('hidden', loading);
  spinner.classList.toggle('hidden', !loading);
}
/**
displays an error message to the user
*/
function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
}
/**
hides the error message
*/
function hideError() {
  document.getElementById('error-msg').classList.add('hidden');
}
/**
gets the users input of the stock ticker, sends it to the server and then displays the predicted stock graph/chart
*/
async function runPrediction() {
  const ticker = document.getElementById('ticker-input').value.trim().toUpperCase();
  if (!ticker) { showError('Please enter a ticker symbol.'); return; }

  hideError();
  setLoading(true);
  document.getElementById('chart-section').classList.add('hidden');

  try {
    const res = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker })
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || 'Something went wrong.');
      return;
    }

    renderChart(data);

  } catch (e) {
    showError('Network error — is the server running?');
  } finally {
    setLoading(false);
  }
}

/**
Gets the stock data from the sever and displays the graph/chart showing the past prices and the predicted future prices
*/
function renderChart(data) {
  const { ticker, historical, forecast } = data;

  /* ── Determine up/down ─────────────────────────────────────── */
  const firstPrice = historical[0][1];
  const lastHist   = historical[historical.length - 1][1];
  const isUp       = lastHist >= firstPrice;
  const histColor  = isUp ? '#34d399' : '#f87171';          /* green / red */
  const histColorFade = isUp
    ? 'rgba(52,211,153,0)'
    : 'rgba(248,113,113,0)';
  const histColorMid = isUp
    ? 'rgba(52,211,153,0.25)'
    : 'rgba(248,113,113,0.25)';

  /* ── Labels & datasets ─────────────────────────────────────── */
  const histLabels = historical.map(d => d[0]);
  const histPrices = historical.map(d => d[1]);

  const forecastLabels = forecast.map(d => d[0]);
  const forecastPrices = forecast.map(d => d[1]);

  const allLabels = [...histLabels, ...forecastLabels];

  /* historical dataset — null-pad the forecast portion */
  const histData = [
    ...histPrices,
    ...new Array(forecastPrices.length).fill(null)
  ];
  /* forecast dataset — null-pad the historical portion, overlap by 1 */
  const forecastData = [
    ...new Array(histPrices.length - 1).fill(null),
    histPrices[histPrices.length - 1],   /* bridge the gap */
    ...forecastPrices
  ];

  /* ── Destroy old chart ─────────────────────────────────────── */
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  const canvas = document.getElementById('priceChart');
  const ctx = canvas.getContext('2d');

  /* ── Gradient fills ────────────────────────────────────────── */
  function makeGradient(topColor, bottomColor) {
    const h = canvas.offsetHeight || 340;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0,   topColor);
    g.addColorStop(0.6, bottomColor);
    g.addColorStop(1,   bottomColor);
    return g;
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [
        {
          label: 'Historical',
          data: histData,
          borderColor: histColor,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.35,
          fill: true,
          backgroundColor: makeGradient(histColorMid, histColorFade),
          spanGaps: false,
          segment: {
            borderColor: () => histColor,
          },
        },
        {
          label: '30-day forecast',
          data: forecastData,
          borderColor: '#a78bfa',
          borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.35,
          fill: true,
          backgroundColor: makeGradient('rgba(167,139,250,0.22)', 'rgba(167,139,250,0)'),
          spanGaps: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1a28',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#8888a0',
          bodyColor: '#f0f0f5',
          titleFont: { size: 11, family: "'Inter', sans-serif" },
          bodyFont:  { size: 13, family: "'Inter', sans-serif", weight: '600' },
          padding: 10,
          callbacks: {
            label: ctx => {
              if (ctx.parsed.y === null) return null;
              return ' $' + ctx.parsed.y.toFixed(2);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#55556a',
            font: { size: 11 },
            maxTicksLimit: 10,
            maxRotation: 0,
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.06)' },
        },
        y: {
          position: 'right',
          ticks: {
            color: '#55556a',
            font: { size: 11 },
            callback: v => '$' + v.toFixed(0),
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.06)' },
        }
      }
    }
  });

  /* ── Header meta ───────────────────────────────────────────── */
  document.getElementById('chart-ticker').textContent = ticker;

  const pctChange = ((lastHist - firstPrice) / firstPrice * 100).toFixed(2);
  const changeEl  = document.getElementById('chart-change');
  changeEl.textContent = (isUp ? '▲ ' : '▼ ') + Math.abs(pctChange) + '% (90d)';
  changeEl.className  = 'chart-change ' + (isUp ? 'up' : 'down');

  /* ── Legend dot ────────────────────────────────────────────── */
  document.getElementById('legend-hist-dot').style.background = histColor;

  /* ── Stat cards ────────────────────────────────────────────── */
  const lastForecast = forecastPrices[forecastPrices.length - 1];
  const forecastChange = ((lastForecast - lastHist) / lastHist * 100).toFixed(2);
  const forecastUp = lastForecast >= lastHist;

  const stats = [
    { label: 'Last close',       value: '$' + lastHist.toFixed(2) },
    { label: '30d forecast',     value: '$' + lastForecast.toFixed(2) },
    { label: 'Forecast change',  value: (forecastUp ? '+' : '') + forecastChange + '%', color: forecastUp ? '#34d399' : '#f87171' },
    { label: 'High (90d)', value: '$' + Math.max(...histPrices).toFixed(2) },
    { label: 'Low (90d)',  value: '$' + Math.min(...histPrices).toFixed(2) },
  ];

  const statsRow = document.getElementById('stats-row');
  statsRow.innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-card-label">${s.label}</div>
      <div class="stat-card-value" style="${s.color ? 'color:' + s.color : ''}">${s.value}</div>
    </div>
  `).join('');

  document.getElementById('chart-section').classList.remove('hidden');
}

/* ── Enter key support ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('ticker-input');
  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') runPrediction();
    });
  }
});