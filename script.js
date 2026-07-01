let cities = [];
let emergencyCity = null;

/* ── START AFTER PAGE LOAD ── */
document.addEventListener("DOMContentLoaded", loadData);

/* ── LOAD DATA ── */
async function loadData() {
  try {
    const res = await fetch("data.txt");
    const text = await res.text();

    const lines = text.trim().split("\n");
    let temp = [];

    lines.forEach(line => {
      let parts = line.split(",");
      let name = parts[0].trim();
      let lastValue = parseFloat(parts[parts.length - 1]);

      if (!name || isNaN(lastValue)) return;

      temp.push({
        name: name,
        raw: lastValue
      });
    });

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

/* ── COLOR ── */
function getColor(risk) {
  if (risk > 70) return '#e53935';
  if (risk > 40) return '#fb8c00';
  return '#43a047';
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
}

/* ── POLICE PAGE ── */
function loadPolicePage() {
  let list   = document.getElementById("citiesList");
  let patrol = document.getElementById("patrolList");

  list.innerHTML = "";
  patrol.innerHTML = "";

  let sorted = [...cities].sort((a, b) => b.risk - a.risk);
  let top5   = sorted.slice(0, 5);

  if (emergencyCity) {
    let exists = top5.some(c => c.name === emergencyCity);

    if (!exists) {
      let emergencyObj = cities.find(c => c.name === emergencyCity);
      if (emergencyObj) top5.push(emergencyObj);
    }
  }

  /* ── TOP RISK LIST ── */
  top5.forEach((c, idx) => {
    const color = getColor(c.risk);

    list.innerHTML += `
      <div class="city-row">
        <div class="rank-badge">#${idx+1}</div>
        <div style="flex:1;padding:0 10px">
          <div class="city-row-name">${c.name}</div>
          <div class="city-row-bar">
            <div class="city-row-fill" style="width:${c.risk}%;background:${color}"></div>
          </div>
        </div>
        <div class="city-row-risk" style="color:${color}">
          ${c.risk.toFixed(1)}%
        </div>
      </div>
    `;
  });

  /* ── PATROL LIST ── */
  top5.forEach(c => {
    const isEmergency = (c.name === emergencyCity);
    const color = getColor(c.risk);

    const item = document.createElement("label");
    item.className = "patrol-item" + (isEmergency ? " emergency-item" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = c.name;
    checkbox.checked = isEmergency;

    checkbox.addEventListener("change", function () {
      if (this.value === emergencyCity && !this.checked) {
        this.checked = true;
        alert("Emergency city cannot be deselected!");
      }
    });

    item.appendChild(checkbox);

    item.innerHTML += `
      <div class="patrol-item-name">${c.name}</div>
      <div class="patrol-item-risk" style="color:${color}">
        ${c.risk.toFixed(1)}%
      </div>
    `;

    patrol.appendChild(item);
  });

  document.getElementById("emergencyBox").innerHTML = emergencyCity
    ? `<div>🚨</div><div>${emergencyCity.toUpperCase()}</div>`
    : `<div class="no-alert">NO ACTIVE ALERTS</div>`;
}

/* ── DEPLOY PATROL (UPDATED LOGIC) ── */
function sendPatrol() {
  let selected = document.querySelectorAll("#patrolList input:checked");

  if (selected.length === 0) {
    alert("Select at least one city");
    return;
  }

  let names = [];

  selected.forEach(s => {
    let cityName = s.value;
    let cityObj = cities.find(c => c.name === cityName);

    if (cityObj) {
      // 🔥 REDUCE RISK BY 10%
      cityObj.risk = Math.max(0, cityObj.risk - 10);
      names.push(cityName);
    }
  });

  // 🔄 REFRESH UI EVERYWHERE
  loadDropdown();
  loadPolicePage();

  document.getElementById("message").innerHTML =
    `🚓 Patrol deployed successfully! Risk reduced in: ${names.join(", ")}`;
}