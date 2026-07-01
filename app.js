/* ──────────────────────────────────────────
   FIXED — WHITE MAP + SELECTED CITY HIGHLIGHT ONLY
   ────────────────────────────────────────── */

let cities = [];
let emergencyCity = null;
let map = null;
let markers = [];
let highlightedLayer = null;
let highlightedMarker = null;

/* ── START AFTER PAGE LOAD ── */
document.addEventListener("DOMContentLoaded", loadData);

/* ── LOAD DATA FROM YOUR FILE ── */
async function loadData() {
  try {
    const res = await fetch("data.txt");
    const text = await res.text();

    const lines = text.trim().split("\n");

    let temp = [];

    lines.forEach(line => {
      let parts = line.split(",");

      let name = parts[0].trim();

      // get LAST numeric value safely
      let lastValue = parseFloat(parts[parts.length - 1]);

      if (!name || isNaN(lastValue)) return;

      temp.push({
        name: name,
        raw: lastValue
      });
    });

    /* NORMALIZE TO 0–100 */
    let max = Math.max(...temp.map(c => c.raw));

    cities = temp.map(c => ({
      name: c.name,
      risk: (c.raw / max) * 100
    }));

  } catch (e) {
    console.log("Error loading file", e);
  }

  loadDropdown();
}

/* ── PAGE SWITCH ── */
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");

  if (pageId === "publicPage") setTimeout(initMap, 200);
  if (pageId === "policePage") loadPolicePage();
}

/* ── DROPDOWN ── */
function loadDropdown() {
  let select = document.getElementById("citySelect");
  select.innerHTML = "";

  cities.forEach((c, i) => {
    let option = document.createElement("option");
    option.value = i;
    option.text = `${c.name} (Risk: ${c.risk.toFixed(1)}%)`;
    select.add(option);
  });
}

/* ── MAP INIT ── */
function initMap() {
  if (map) return;

  map = L.map('map').setView([20, 78], 3);

  /* ✅ WHITE / LIGHT BACKGROUND TILES */
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  plotCities();
}

/* ── COLOR ── */
function getColor(risk) {
  if (risk > 70) return '#e53935';
  if (risk > 40) return '#fb8c00';
  return '#43a047';
}

/* ── RANDOM COORDS (SINCE DATA IS GLOBAL) ── */
function getCoords() {
  return [
    -60 + Math.random() * 120,
    -180 + Math.random() * 360
  ];
}

/* ── PLOT — plain small markers, NO highlight circle ── */
function plotCities() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  cities.forEach((city, index) => {
    const coords = getCoords();
    const color = getColor(city.risk);

    const marker = L.circleMarker(coords, {
      radius: 5,
      color: '#ffffff',       /* white border so dots stand out on light map */
      weight: 1.5,
      fillColor: color,
      fillOpacity: 0.85
    }).addTo(map);

    marker.bindPopup(`<b>${city.name}</b><br>Risk: ${city.risk.toFixed(1)}%`);

    /* store coords on marker so we can re-fly to it later */
    marker._cityIndex = index;
    marker._coords = coords;

    markers.push(marker);
  });
}

/* ── CHECK RISK ── */
function checkRisk() {
  let index = parseInt(document.getElementById("citySelect").value);
  let city = cities[index];

  emergencyCity = city.name;

  let color = getColor(city.risk);

  document.getElementById("result").innerHTML = `
    <div class="risk-card">
      <div class="city-name">${city.name}</div>
      <div class="risk-value" style="color:${color}">
        ${city.risk.toFixed(1)}%
      </div>
    </div>
  `;

  highlightCity(city, index);
}

/* ── HIGHLIGHT — only the selected city ── */
function highlightCity(city, index) {
  /* Remove previous highlight circle */
  if (highlightedLayer) {
    map.removeLayer(highlightedLayer);
    highlightedLayer = null;
  }

  /* Reset previous highlighted marker back to normal */
  if (highlightedMarker) {
    const prevColor = getColor(highlightedMarker._city.risk);
    highlightedMarker.setStyle({
      radius: 5,
      color: '#ffffff',
      weight: 1.5,
      fillColor: prevColor,
      fillOpacity: 0.85
    });
    highlightedMarker = null;
  }

  /* Find the marker for the selected city */
  const selectedMarker = markers[index];
  if (!selectedMarker) return;

  const coords = selectedMarker._coords;
  const color = getColor(city.risk);

  /* ✅ Add highlight circle ONLY around selected city */
  highlightedLayer = L.circle(coords, {
    radius: 400000,
    color: color,
    weight: 2,
    fillColor: color,
    fillOpacity: 0.12
  }).addTo(map);

  /* Make the selected marker bigger and bolder */
  selectedMarker.setStyle({
    radius: 9,
    color: color,
    weight: 2.5,
    fillColor: color,
    fillOpacity: 1
  });

  /* Store reference so we can reset it next time */
  selectedMarker._city = city;
  highlightedMarker = selectedMarker;

  /* Open its popup */
  selectedMarker.openPopup();

  /* Fly to it */
  map.flyTo(coords, 4, { duration: 1.2 });
}

/* ── POLICE PAGE ── */
function loadPolicePage() {
  let list = document.getElementById("citiesList");
  let patrol = document.getElementById("patrolList");

  list.innerHTML = "";
  patrol.innerHTML = "";

  let top = [...cities].sort((a, b) => b.risk - a.risk).slice(0, 5);

  top.forEach((c, i) => {
    list.innerHTML += `
      <div class="city-row">
        <div>#${i + 1}</div>
        <div>${c.name}</div>
        <div>${c.risk.toFixed(1)}%</div>
      </div>
    `;
  });

  top.forEach(c => {
    let item = document.createElement("label");

    item.innerHTML = `
      <input type="checkbox" value="${c.name}" ${c.name === emergencyCity ? "checked" : ""}>
      ${c.name}
    `;

    patrol.appendChild(item);
  });

  document.getElementById("emergencyBox").innerHTML =
    emergencyCity ? `🚨 ${emergencyCity}` : "NO ALERT";
}

/* ── SEND PATROL ── */
function sendPatrol() {
  let selected = document.querySelectorAll("#patrolList input:checked");

  if (selected.length === 0) {
    alert("Select at least one city");
    return;
  }

  let names = [...selected].map(s => s.value).join(", ");

  document.getElementById("message").innerHTML =
    `🚓 Patrol sent to ${names}`;
}
