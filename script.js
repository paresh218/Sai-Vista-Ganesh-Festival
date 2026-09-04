
// Ganpati T-shirt nomination
document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".menu-toggle");
  const siteNav = document.getElementById("siteNav");
  menuToggle?.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    menuToggle.setAttribute("aria-label", expanded ? "Open menu" : "Close menu");
    siteNav.classList.toggle("open", !expanded);
  });

// Daily important notice (day-specific event)
function initDailyNotice() {
  const dateEl = document.getElementById('dailyDate');
  const msgEl = document.getElementById('dailyMessage');
  if (!dateEl || !msgEl) return;

  const today = new Date();
  // Use local month/day; festival dates are in September 2026
  const month = today.getMonth() + 1; // 1-12
  const day = today.getDate();

  // Map of month-day -> message
  const map = {
    '9-5': '5 Sep — Janmashtami at Sai Vista Ground Floor Lawn (6:00 PM – 10:00 PM IST). Please join us for the celebration!',
    '9-14': '14 Sep — Opening Day: Miravnuk, Lezim and Ganesh Sthapana (3–7 PM).',
    '9-15': '15 Sep — Housie evening for residents.',
    '9-16': '16 Sep — Games and activities. Register for events.',
    '9-17': '17 Sep — Games and community activities.',
    '9-18': '18 Sep — Bollywood Night (special event).',
    '9-19': '19 Sep — Drawing Competition & Talent Show (session 1).',
    '9-20': '20 Sep — Blood donation, Treasure Hunt, Thali & Rangoli competition.',
    '9-21': '21 Sep — Talent Show (session 2).',
    '9-22': '22 Sep — Fancy Dress event.',
    '9-23': '23 Sep — No activity planned (schedule may be updated).',
    '9-24': '24 Sep — Satyanarayan Puja & Mahaprasad.',
    '9-25': '25 Sep — Visarjan, Lezim and evening DJ.'
  };

  const key = `${month}-${day}`;
  const text = map[key] || 'No special event scheduled for today — check the full schedule.';

  dateEl.textContent = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  // Build event display with possible countdown and label
  const countdownElId = 'dailyCountdown';
  const countdownWrapperId = 'dailyCountdownWrapper';
  const eventHtml = `
    <span class="daily-event-text">${text}</span>
    <span id="${countdownWrapperId}" class="daily-countdown-wrapper" style="display:inline-block;margin-left:10px">
      <span class="daily-countdown-label">Starts in</span>
      <span id="${countdownElId}" class="daily-countdown" aria-hidden="true"></span>
    </span>`;
  msgEl.innerHTML = eventHtml;

  // Try to parse a start time from the text (e.g., '3–7 PM', '8 AM', '7:30 PM')
  function parseTimeFromText(t) {
    // normalize hyphen characters
    const s = t.replace(/[–—]/g, '-');
    // regex to find patterns like '7:30 PM' or '8 AM' or '3-7 PM' (we pick first hour)
    const rx = /(\d{1,2}(?::\d{2})?)(?:\s*[\-–]\s*\d{1,2}(?::\d{2})?)?\s*(AM|PM|am|pm)/;
    const m = s.match(rx);
    if (m) {
      let hourPart = m[1];
      const ampm = m[2].toUpperCase();
      // if hourPart has minutes
      const parts = hourPart.split(':');
      let hh = parseInt(parts[0], 10);
      let mm = parts[1] ? parseInt(parts[1], 10) : 0;
      if (ampm === 'PM' && hh < 12) hh += 12;
      if (ampm === 'AM' && hh === 12) hh = 0;
      return { hh, mm };
    }
    // try range like '3-7 PM' where PM appears after range
    const rx2 = /(\d{1,2})\s*[\-–]\s*\d{1,2}\s*(AM|PM|am|pm)/;
    const m2 = s.match(rx2);
    if (m2) {
      let hh = parseInt(m2[1], 10);
      const ampm = m2[2].toUpperCase();
      if (ampm === 'PM' && hh < 12) hh += 12;
      if (ampm === 'AM' && hh === 12) hh = 0;
      return { hh, mm: 0 };
    }
    return null;
  }

  const parsed = parseTimeFromText(text);
  if (parsed) {
    // create a Date for the event time interpreted in IST (UTC+5:30)
    // We compute the UTC instant that corresponds to the given IST time, then
    // create a Date from that timestamp so the countdown is correct for all visitors.
    const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // 5h30m in ms
    const year = today.getFullYear();
    const monthIndex = today.getMonth(); // 0-based
    const dayOfMonth = today.getDate();
    // Date.UTC(year, monthIndex, day, hh, mm) is the UTC epoch for that UTC time;
    // subtract IST offset to get the UTC epoch that corresponds to hh:mm IST.
    const targetUtcMs = Date.UTC(year, monthIndex, dayOfMonth, parsed.hh, parsed.mm) - IST_OFFSET_MS;
    const target = new Date(targetUtcMs);
    const countdownEl = document.getElementById(countdownElId);
    function updateCountdown() {
      const now = new Date();
      const diff = target - now;
      if (diff <= 0) {
        countdownEl.textContent = 'Happening now!';
        return;
      }
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      countdownEl.textContent = `${hrs}h ${mins}m ${secs}s`;
    }
    updateCountdown();
    setInterval(updateCountdown, 1000);
  } else {
    // No parsable time — remove countdown wrapper element
    const wrapper = document.getElementById(countdownWrapperId);
    if (wrapper) wrapper.remove();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDailyNotice);
} else {
  initDailyNotice();
}

// Logo fallback: if image fails to load, show inline SVG or text fallback
function initLogoFallback() {
  const img = document.getElementById('brandLogoImg');
  const svg = document.getElementById('brandSvgLogo');
  const text = document.getElementById('brandLogoFallback');
  if (!img) return;

  function showSvg() {
    if (svg) svg.style.display = 'inline-block';
    if (text) text.style.display = 'none';
    img.style.display = 'none';
  }
  function showImg() {
    img.style.display = 'inline-block';
    if (svg) svg.style.display = 'none';
    if (text) text.style.display = 'none';
  }

  // Try current src first; if it loads, done. Otherwise try a few common candidate filenames.
  const candidates = [
    img.getAttribute('src'),
    'assets/sai-vista-logo.png',
    'assets/sai-vista-logo.jpg',
    'assets/sai-vista-logo.jpeg',
    'assets/sai-vista-logo.svg',
    'assets/logo.png',
    'assets/logo.svg'
  ].filter(Boolean);

  let tried = 0;
  function tryNext() {
    if (tried >= candidates.length) {
      showSvg();
      return;
    }
    const url = candidates[tried++];
    const tester = new Image();
    tester.onload = () => {
      // success: set img.src and show
      img.src = url;
      showImg();
    };
    tester.onerror = () => {
      // try next candidate
      tryNext();
    };
    // Add a small timeout to avoid indefinite waits on file:// in some browsers
    const loadTimeout = setTimeout(() => {
      tester.onerror();
    }, 2000);
    tester.onload = () => { clearTimeout(loadTimeout); img.src = url; showImg(); };
    tester.onerror = () => { clearTimeout(loadTimeout); tryNext(); };
    // start loading
    try { tester.src = url; } catch (e) { tryNext(); }
  }

  // If the initial image is already loaded, prefer it
  if (img.complete && img.naturalWidth > 0) {
    showImg();
  } else {
    // listen for initial load/error, but fall back to trying candidates
    let handled = false;
    function onLoad() { if (handled) return; handled = true; showImg(); }
    function onError() { if (handled) return; handled = true; tryNext(); }
    img.addEventListener('load', onLoad, { once: true });
    img.addEventListener('error', onError, { once: true });
    // Also start trying candidates after a short delay in case load doesn't fire on file://
    setTimeout(() => { if (!handled) tryNext(); }, 800);
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLogoFallback); else initLogoFallback();
  // Ensure menu toggle links close the mobile nav
  const _menuToggle = document.querySelector(".menu-toggle");
  const _siteNav = document.getElementById("siteNav");
  _siteNav?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    _siteNav.classList.remove("open");
    _menuToggle?.setAttribute("aria-expanded", "false");
    _menuToggle?.setAttribute("aria-label", "Open menu");
  }));

  const festivalStart = new Date("2026-09-14T09:00:00+05:30");
  const countdown = document.getElementById("festivalCountdown");
  const updateCountdown = () => {
    const remaining = festivalStart - new Date();
    if (remaining <= 0) {
      countdown.textContent = "Ganpati Bappa Morya!";
      return;
    }
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor(remaining / 3600000) % 24;
    countdown.textContent = `${days}d ${hours}h to go`;
  };
  if (countdown) { updateCountdown(); setInterval(updateCountdown, 60000); }

  const scheduleFilters = document.querySelectorAll(".schedule-filter");
  const scheduleCards = document.querySelectorAll(".schedule-card");
  scheduleFilters.forEach(button => button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    scheduleFilters.forEach(item => item.classList.toggle("active", item === button));
    scheduleCards.forEach(card => {
      const show = filter === "all" ||
        (filter === "featured" && card.classList.contains("featured")) ||
        (filter === "puja" && card.classList.contains("puja-card")) ||
        (filter === "activity" && card.classList.contains("activity-card"));
      card.classList.toggle("hidden", !show);
    });
  }));

  // T-shirt registration is handled by the official Google Form linked from index.html.
});



// Homepage schedule image viewer
document.addEventListener("DOMContentLoaded", () => {
  const scheduleModal = document.getElementById("scheduleModal");
  const closeScheduleModal = document.getElementById("closeScheduleModal");
  const openButtons = [
    document.getElementById("openScheduleImage"),
    document.getElementById("openScheduleImageCard")
  ].filter(Boolean);

  const openSchedule = () => {
    scheduleModal.classList.remove("hidden");
    scheduleModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeSchedule = () => {
    scheduleModal.classList.add("hidden");
    scheduleModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  openButtons.forEach(btn => btn.addEventListener("click", openSchedule));
  closeScheduleModal.addEventListener("click", closeSchedule);
  scheduleModal.addEventListener("click", e => {
    if (e.target === scheduleModal) closeSchedule();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !scheduleModal.classList.contains("hidden")) {
      closeSchedule();
    }
  });
});

// (splash modal removed – no initial popup on page load)

const AARTI_GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyK78libRqIDFcEY2j0TCTpQkmyphHPbnadD6_2BfdGk-_Sixo9Au-ieZw2HyfrxFOO/exec";
const PAYMENT_DASHBOARD_URL = "https://script.google.com/macros/s/AKfycbyYbNoSxhBIT2sSVfMSFY06YXAWGN99E_HunGAA2UMLA8vlJMn-_qdGCiQ1a8s6PsW3/exec";
const AARTI_MAX_CAPACITY = 10;

document.addEventListener("DOMContentLoaded", () => {
  const flatSelect = document.getElementById("flatNo");
  for (let floor = 1; floor <= 13; floor++) {
    for (let flat = 1; flat <= 4; flat++) {
      const flatNo = `${floor}${flat < 10 ? "0" + flat : flat}`;
      const option = document.createElement("option");
      option.value = flatNo;
      option.textContent = flatNo;
      flatSelect.appendChild(option);
    }
  }

  document.getElementById("whatsapp").addEventListener("input", function() {
    this.value = this.value.replace(/\D/g, "").slice(0, 10);
  });

  document.getElementById("date").addEventListener("change", () => {
    const date = document.getElementById("date").value;
    const slot = document.getElementById("slot").value;
    if (!slot) {
      document.getElementById("chartContainer").innerHTML = "<p>Now choose Morning or Evening to check availability.</p>";
      return;
    }
    updateChart(date, slot);
  });

  // Google Form integration
  const modal = document.getElementById("formModal");
  const frame = document.getElementById("formFrame");
  const external = document.getElementById("openExternalForm");
  const modalTitle = document.getElementById("modalTitle");

  const titles = {
    "https://forms.gle/LZDdZCUgNTp34tar5": "All Event Registration",
    "https://forms.gle/xkEiQqAmXVQ75Keb8": "Satyanarayan Pooja",
    "https://forms.gle/28994c4UexrtNWbXA": "Bollywood Night",
    "https://forms.gle/KC1wqmx4xjHbMRtz7": "Satyanarayan Prasad Availability",
    "https://forms.gle/2YapGuBbkc962JuZ6": "Fun Fair Stall Entry"
  };

  document.querySelectorAll(".form-open-btn").forEach(button => {
    button.addEventListener("click", (e) => {
      // Ignore disabled buttons (keeps visual but prevents action)
      if (button.disabled || button.getAttribute('aria-disabled') === 'true') return;
      const url = button.dataset.formUrl;
      modalTitle.textContent = titles[url] || "Sai Vista Registration Form";
      external.href = url;
      // forms.gle can redirect inside the iframe; use Google's embedded endpoint format
      frame.src = url;
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
    });
  });

  function closeModal() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    frame.src = "about:blank";
  }

  document.getElementById("closeModal").addEventListener("click", closeModal);
  modal.addEventListener("click", e => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
  });
});

window.selectSlot = async function(slotType) {
  document.getElementById("slot").value = slotType;

  document.querySelectorAll(".slot-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById(`${slotType}Slot`).classList.add("active");

  const selectedDate = document.getElementById("date").value;
  if (!selectedDate) {
    document.getElementById("chartContainer").innerHTML = "<p>Please select an Aarti date first.</p>";
    return;
  }
  await updateChart(selectedDate, slotType);
};

async function fetchSlotData() {
  const response = await fetch(AARTI_GOOGLE_SCRIPT_URL + "?action=slots", { cache: "no-store" });
  if (!response.ok) throw new Error("Availability request failed.");
  const payload = await response.json();
  if (payload.status && payload.status !== "success") throw new Error(payload.message || "Availability request failed.");
  return payload.slots || payload;
}

async function updateChart(date, slot) {
  const container = document.getElementById("chartContainer");
  const submit = document.getElementById("submitButton");
  container.innerHTML = "<p>⏳ Checking current registrations...</p>";

  try {
    const registrations = await fetchSlotData();
    const data = registrations[date] || { morning: 0, evening: 0 };
    const count = Math.min(Number(data[slot]) || 0, AARTI_MAX_CAPACITY);
    const remaining = Math.max(AARTI_MAX_CAPACITY - count, 0);
    const percentage = (count / AARTI_MAX_CAPACITY) * 100;

    container.innerHTML = `
      <div class="progress-wrap">
        <strong>${count} / ${AARTI_MAX_CAPACITY} registered</strong>
        <div class="progress-track"><div class="progress-fill" style="width:${percentage}%"></div></div>
        <span>${remaining ? `${remaining} slot${remaining === 1 ? "" : "s"} available` : "This slot is currently full."}</span>
      </div>`;
    submit.disabled = remaining === 0;
    submit.style.opacity = remaining === 0 ? ".55" : "1";
  } catch {
    container.innerHTML = "<p>Availability could not be loaded right now. Please submit and the committee can verify the slot.</p>";
    submit.disabled = false;
    submit.style.opacity = "1";
  }
}

document.getElementById("nominationForm").addEventListener("submit", async e => {
  e.preventDefault();

  const form = e.currentTarget;
  const submitButton = document.getElementById("submitButton");
  const spinner = document.getElementById("submitSpinner");
  const text = document.getElementById("submitButtonText");

  const data = {
    name: document.getElementById("name").value.trim(),
    flatNo: document.getElementById("flatNo").value,
    wing: document.getElementById("wing").value,
    whatsapp: document.getElementById("whatsapp").value.trim(),
    date: document.getElementById("date").value,
    slot: document.getElementById("slot").value,
    bringThali: document.getElementById("bringThali").checked.toString(),
    timestamp: new Date().toISOString()
  };

  if (!data.name || !data.flatNo || !data.wing || !/^\d{10}$/.test(data.whatsapp) || !data.date || !data.slot) {
    alert("Please fill all required fields correctly and select an Aarti slot.");
    return;
  }

  submitButton.disabled = true;
  spinner.classList.remove("hidden");
  text.textContent = "Submitting...";

  try {
    const response = await fetch(AARTI_GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(data).toString()
    });
    if (!response.ok) throw new Error("Nomination request failed.");
    const result = await response.json();
    if (result.status !== "success") throw new Error(result.message || "The selected slot is no longer available.");

    const slotLabel = data.slot === "morning" ? "Morning (8 AM)" : "Evening (7:30 PM)";
    const waText = `Hi Admin, I just registered for Ganesh Aarti on ${data.date} (${data.slot}). My details: ${data.name}, ${data.flatNo} ${data.wing}`;

    document.getElementById("successDetails").innerHTML = `
      <p><strong>${escapeHtml(data.date)}</strong> — ${slotLabel}</p>
      <p class="success-gap">Your nomination has been successfully registered.</p>
      <p><a href="https://wa.me/918149525915?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener">Open WhatsApp to message the admin →</a></p>`;
    form.classList.add("hidden");
    document.getElementById("successMessage").classList.remove("hidden");
  } catch (err) {
    console.error(err);
    alert(err.message || "There was a problem submitting the nomination. Please try again.");
    submitButton.disabled = false;
  } finally {
    spinner.classList.add("hidden");
    text.textContent = "Submit Aarti Nomination";
  }
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function parsePaymentCsv(text) {
  const rows = [], row = []; let value = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i], next = text[i + 1];
    if (char === '"' && quoted && next === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(value.trim()); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && next === "\n") i++; row.push(value.trim()); if (row.some(Boolean)) rows.push(row.splice(0)); value = ""; }
    else value += char;
  }
  if (value || row.length) { row.push(value.trim()); rows.push(row); }
  const headers = rows.shift().map(header => header.toLowerCase().replace(/[^a-z]/g, ""));
  return rows.map(record => Object.fromEntries(headers.map((header, i) => [header, record[i] || ""])));
}

function paymentRupees(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

async function initPaymentDashboard() {
  const dashboard = document.getElementById("paymentDashboard");
  if (!dashboard) return;
  try {
    // The Apps Script proxy keeps the Google Sheet URL and ID off the public website.
    const response = await fetch(PAYMENT_DASHBOARD_URL + "?action=payments", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load payment data");
    const payload = await response.json();
    if (payload.status !== "success" || !Array.isArray(payload.payments)) throw new Error(payload.message || "Payment data is unavailable");
    const payments = payload.payments.map(row => ({
      wing: String(row.wing || "").trim().toUpperCase(), flat: String(row.flat || "").trim(),
      paid: String(row.paid || "").trim().toLowerCase() === "yes",
      amount: Number(String(row.amount || "").replace(/[^0-9.-]/g, "")) || 0
    })).filter(row => row.wing && row.flat);
    if (!payments.length) throw new Error("No usable payment rows");
    renderPaymentDashboard(dashboard, payments);
  } catch (error) {
    dashboard.innerHTML = '<p class="dashboard-error">Collection data could not be loaded right now. Please refresh in a moment.</p>';
    console.error("Payment dashboard:", error);
  }
}


function renderPaymentDashboard(dashboard, payments) {
  const wings = [...new Set(payments.map(row => row.wing))].sort();
  let selectedWing = "All", statusFilter = "all", sortBy = "flat";
  const render = () => {
    const visible = payments.filter(row => (selectedWing === "All" || row.wing === selectedWing) && (statusFilter === "all" || String(row.paid) === statusFilter));
    const paid = payments.filter(row => row.paid), unpaid = payments.filter(row => !row.paid);
    const received = paid.reduce((sum, row) => sum + row.amount, 0), pending = unpaid.reduce((sum, row) => sum + row.amount, 0);
    const rows = [...visible].sort((a, b) => sortBy === "amount" ? b.amount - a.amount : sortBy === "status" ? Number(b.paid) - Number(a.paid) : a.flat.localeCompare(b.flat, undefined, { numeric: true }));
    const paidPercent = payments.length ? paid.length / payments.length * 100 : 0;
    const wingBars = wings.map(wing => {
      const wingRows = payments.filter(row => row.wing === wing), wingPaid = wingRows.filter(row => row.paid).length, percent = wingRows.length ? wingPaid / wingRows.length * 100 : 0;
      return `<div class="wing-row ${selectedWing === wing ? "active" : ""}"><button type="button" data-wing="${wing}">Wing ${wing}</button><div class="wing-bar" data-wing="${wing}" role="button" tabindex="0" aria-label="Show Wing ${wing} flats"><span class="wing-paid" style="width:${percent}%"></span><span class="wing-unpaid" style="width:${100 - percent}%"></span></div><span class="wing-count">${wingPaid} paid / ${wingRows.length}</span></div>`;
    }).join("");
    dashboard.innerHTML = `<div class="collection-summary"><article><small>Total flats</small><strong>${payments.length}</strong></article><article class="received"><small>Amount received</small><strong>${paymentRupees(received)}</strong></article><article class="pending"><small>Amount pending</small><strong>${paymentRupees(pending)}</strong></article><article><small>Collection rate</small><strong>${paidPercent.toFixed(1)}%</strong></article></div><div class="payment-viz"><article class="payment-card"><h3>Payments by Wing</h3><p>Green is paid; orange is pending. Click a wing to drill down.</p><div class="wing-chart">${wingBars}</div></article><article class="payment-card"><h3>Overall payment status</h3><p>Only “Yes” payments count toward money received.</p><div class="donut-layout"><div class="donut" style="--paid:${paidPercent}%"><div class="donut-label"><strong>${paid.length}</strong>paid</div></div><div class="legend"><span><i class="yes"></i>Paid: ${paid.length}</span><span><i class="no"></i>Pending: ${unpaid.length}</span></div></div></article></div><article class="payment-card"><div class="payment-toolbar"><h3>${selectedWing === "All" ? "All flats" : `Wing ${selectedWing} flats`} <small>(${visible.length})</small></h3><div class="payment-controls"><button type="button" id="showAllWings">All wings</button><select id="paymentStatus" aria-label="Filter payment status"><option value="all">All statuses</option><option value="true">Paid only</option><option value="false">Pending only</option></select><select id="paymentSort" aria-label="Sort flats"><option value="flat">Sort: Flat number</option><option value="status">Sort: Payment status</option><option value="amount">Sort: Amount</option></select></div></div><div class="payment-table-wrap">${rows.length ? `<table class="payment-table"><thead><tr><th>Wing</th><th>Flat</th><th>Status</th><th>Amount</th></tr></thead><tbody>${rows.map(row => `<tr><td>${escapeHtml(row.wing)}</td><td>${escapeHtml(row.flat)}</td><td><span class="status-pill ${row.paid ? "status-yes" : "status-no"}">${row.paid ? "Paid" : "Not paid"}</span></td><td>${paymentRupees(row.amount)}</td></tr>`).join("")}</tbody></table>` : '<p class="empty-state">No flats match this filter.</p>'}</div><p class="dashboard-note">Source: live Sai Vista contribution sheet · refreshed when the page loads</p></article>`;
    dashboard.querySelectorAll("[data-wing]").forEach(element => {
      const chooseWing = () => { selectedWing = element.dataset.wing; render(); };
      element.addEventListener("click", chooseWing);
      element.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseWing(); } });
    });
    dashboard.querySelector("#showAllWings").addEventListener("click", () => { selectedWing = "All"; render(); });
    const status = dashboard.querySelector("#paymentStatus"); status.value = statusFilter; status.addEventListener("change", event => { statusFilter = event.target.value; render(); });
    const sort = dashboard.querySelector("#paymentSort"); sort.value = sortBy; sort.addEventListener("change", event => { sortBy = event.target.value; render(); });
  };
  render();
}

document.addEventListener("DOMContentLoaded", initPaymentDashboard);
