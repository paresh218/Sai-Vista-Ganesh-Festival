
const t = (key, values = {}) => {
  const translator = window.SaiVistaI18n;
  if (translator) return translator.t(key, values);
  return String(key).replace(/\{(\w+)\}/g, (_match, name) => values[name] ?? `{${name}}`);
};

const currentLocale = () => window.SaiVistaI18n?.locale || "en-IN";
const publicContent = () => {const content=window.SaiVistaContent || {festivalEvents:{},updates:[],finance:{}};return {...content,updates:EventUX.notices(content.updates||[])};};
// Main navigation and festival interactions.
document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".menu-toggle");
  const siteNav = document.getElementById("siteNav");
  menuToggle?.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    menuToggle.setAttribute("aria-label", expanded ? "Open menu" : "Close menu");
    siteNav.classList.toggle("open", !expanded);
  });

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
  scheduleFilters.forEach(button => button.setAttribute("aria-pressed", String(button.classList.contains("active"))));
  scheduleFilters.forEach(button => button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    scheduleFilters.forEach(item => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });
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
// Paste the separately deployed visitor-counter Apps Script /exec URL here.
// This endpoint stores a single aggregate page-view number, not visitor identities.
const VISITOR_COUNTER_URL = "https://script.google.com/macros/s/AKfycbzGowm9XvdFIlsTFp7HgQZ0S2gCweAismk5mHcvKtGr8MUtwDr9jmmznsrNmIHltV_6/exec";
const AARTI_MAX_CAPACITY = 10;
const AARTI_RESERVED_DATE = "2026-09-20";
const AARTI_RESERVATION_NOTICE = "The evening Aarti on 20 September 2026 is reserved for senior citizens as a token of respect. If there are senior citizens in your family, please invite them to attend with a pooja thali. Morning Aarti registration remains open for 20 September.";

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
    const eveningButton = document.getElementById("eveningSlot");
    eveningButton.disabled = date === AARTI_RESERVED_DATE;
    if (eveningButton.disabled && document.getElementById("slot").value === "evening") {
      document.getElementById("slot").value = "";
      eveningButton.classList.remove("active");
    }
    const slot = document.getElementById("slot").value;
    document.getElementById("submitButton").disabled = !slot;
    document.getElementById("submitButton").style.opacity = slot ? "1" : ".55";
    const AARTI_MIN = '2026-09-15';
    const AARTI_MAX = '2026-09-24';
    if (date && (date < AARTI_MIN || date > AARTI_MAX)) {
      document.getElementById("chartContainer").innerHTML = `<p>${t("Please select an Aarti date between {min} and {max}.", { min: AARTI_MIN, max: AARTI_MAX })}</p>`;
      return;
    }
    if (!slot) {
      document.getElementById("chartContainer").innerHTML = `<p>${t("Now choose Morning or Evening to check availability.")}</p>`;
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
      modalTitle.textContent = t(titles[url] || "Sai Vista Registration Form");
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
  if (document.getElementById("date").value === AARTI_RESERVED_DATE && slotType === "evening") {
    return;
  }
  document.getElementById("slot").value = slotType;

  document.querySelectorAll(".slot-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById(`${slotType}Slot`).classList.add("active");

  const selectedDate = document.getElementById("date").value;
  if (!selectedDate) {
    document.getElementById("chartContainer").innerHTML = `<p>${t("Please select an Aarti date first.")}</p>`;
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
  if (date === AARTI_RESERVED_DATE && slot === "evening") {
    container.textContent = t(AARTI_RESERVATION_NOTICE);
    submit.disabled = true;
    return;
  }
  container.innerHTML = `<p>${t("⏳ Checking current registrations...")}</p>`;

  try {
    const registrations = await fetchSlotData();
    const data = registrations[date] || { morning: 0, evening: 0 };
    const count = Math.min(Number(data[slot]) || 0, AARTI_MAX_CAPACITY);
    const remaining = Math.max(AARTI_MAX_CAPACITY - count, 0);
    const percentage = (count / AARTI_MAX_CAPACITY) * 100;

    container.innerHTML = `
      <div class="progress-wrap">
        <strong>${t("{count} / {capacity} registered", { count, capacity: AARTI_MAX_CAPACITY })}</strong>
        <div class="progress-track"><div class="progress-fill" style="width:${percentage}%"></div></div>
        <span>${remaining ? t(remaining === 1 ? "{count} slot available" : "{count} slots available", { count: remaining }) : t("This slot is currently full.")}</span>
      </div>`;
    submit.disabled = remaining === 0;
    submit.style.opacity = remaining === 0 ? ".55" : "1";
  } catch {
    container.innerHTML = `<p>${t("Availability could not be loaded right now. Please submit and the committee can verify the slot.")}</p>`;
    submit.disabled = false;
    submit.style.opacity = "1";
  }
}

document.getElementById("nominationForm").addEventListener("submit", async e => {
  e.preventDefault();

  const form = e.currentTarget;
  if (!form.reportValidity()) return;
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
    alert(t("Please fill all required fields correctly and select an Aarti slot."));
    return;
  }
  if (data.date === AARTI_RESERVED_DATE && data.slot === "evening") {
    alert(t(AARTI_RESERVATION_NOTICE));
    return;
  }
  if (data.bringThali !== "true") {
    alert(t("Please confirm that you will bring your own pooja thali and prasad."));
    return;
  }
  // Enforce Aarti date range (inclusive)
  const AARTI_MIN = '2026-09-15';
  const AARTI_MAX = '2026-09-24';
  if (data.date && (data.date < AARTI_MIN || data.date > AARTI_MAX)) {
    alert(t("Please select an Aarti date between {min} and {max}.", { min: AARTI_MIN, max: AARTI_MAX }));
    return;
  }

  submitButton.disabled = true;
  spinner.classList.remove("hidden");
  text.textContent = t("Submitting...");

  try {
    const response = await fetch(AARTI_GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(data).toString()
    });
    if (!response.ok) throw new Error("Nomination request failed.");
    const result = await response.json();
    if (result.status !== "success") throw new Error(result.message || "The selected slot is no longer available.");

    const slotLabel = data.slot === "morning" ? t("Morning (8 AM)") : t("Evening (7:30 PM)");
    const waText = `Hi Admin, I just registered for Ganesh Aarti on ${data.date} (${data.slot}). My details: ${data.name}, ${data.flatNo} ${data.wing}`;

    document.getElementById("successDetails").innerHTML = `
      <p><strong>${escapeHtml(data.date)}</strong> — ${slotLabel}</p>
      <p class="success-gap">${t("Your nomination has been successfully registered.")}</p>
      <p><a href="https://wa.me/917621940889?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener">${t("Open WhatsApp to message the admin →")}</a></p>`;
    form.classList.add("hidden");
    document.getElementById("successMessage").classList.remove("hidden");
  } catch (err) {
    console.error(err);
    alert(err.message || t("There was a problem submitting the nomination. Please try again."));
    submitButton.disabled = false;
  } finally {
    spinner.classList.add("hidden");
    text.textContent = t("Submit Aarti Nomination");
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
  return new Intl.NumberFormat(currentLocale(), { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function initPaymentDashboard() {
  const dashboard = document.getElementById("paymentDashboard");
  if (!dashboard) return;
  fetch(PAYMENT_DASHBOARD_URL + "?action=payments", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Could not load payment data");
      return response.json();
    })
    .then((payload) => {
      if (payload.status !== "success" || !Array.isArray(payload.payments)) throw new Error(payload.message || "Payment data is unavailable");
      const payments = payload.payments.map((row) => ({
        wing: String(row.wing || "").trim().toUpperCase(), flat: String(row.flat || "").trim(),
        paid: String(row.paid || "").trim().toLowerCase() === "yes",
        amount: Number(String(row.amount || "").replace(/[^0-9.-]/g, "")) || 0
      })).filter((row) => row.wing && row.flat);
      if (!payments.length) throw new Error("No usable payment rows");
      renderPaymentDashboard(dashboard, payments);
    })
    .catch((error) => {
      dashboard.innerHTML = `<p class="dashboard-error">${t("Collection data could not be loaded right now. Please refresh in a moment.")}</p>`;
      console.error("Payment dashboard:", error);
    });
}

function financeRupees(value) {
  return new Intl.NumberFormat(currentLocale(), { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function initFinanceDashboard() {
  const dashboard = document.getElementById("financeDashboard");
  if (!dashboard) return;
  const finance = publicContent().finance || {};
  const safeAmount = (value) => value === null || value === "" || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);
  const collection = safeAmount(finance.collectionTotal);
  const expenses = safeAmount(finance.expenseTotal);
  const balance = collection !== null && expenses !== null ? collection - expenses : null;
  const categories = Array.isArray(finance.categories) ? finance.categories.filter((item) => item && item.name && Number.isFinite(Number(item.amount))) : [];
  const receipts = Array.isArray(finance.receipts) ? finance.receipts.filter((item) => item && item.label && /^https:\/\//.test(item.href || "")) : [];
  const displayedValue = (value) => value === null ? t("Not published") : financeRupees(value);
  const updated = finance.lastUpdated
    ? new Date(`${finance.lastUpdated}T00:00:00`).toLocaleDateString(currentLocale(), { day: "numeric", month: "long", year: "numeric" })
    : t("Pending committee verification");

  dashboard.innerHTML = `<div class="finance-summary"><article><small>${t("Total Collection")}</small><strong>${displayedValue(collection)}</strong></article><article><small>${t("Total Expenses")}</small><strong>${displayedValue(expenses)}</strong></article><article><small>${t("Balance")}</small><strong>${displayedValue(balance)}</strong></article></div><div class="finance-disclosure"><div class="panel-kicker">${t("LAST UPDATED")}</div><p>${t("Verified on: {date}", { date: updated })}</p><h3>${t("Expenses by category")}</h3>${categories.length ? `<ul class="expense-category-list">${categories.map((item) => `<li><span>${escapeHtml(t(item.name))}</span><strong>${financeRupees(Number(item.amount))}</strong></li>`).join("")}</ul>` : `<p class="finance-empty">${t("Verified category totals will be published here after committee approval.")}</p>`}${receipts.length ? `<h3>${t("Published bills and receipts")}</h3><ul class="receipt-list">${receipts.map((item) => `<li><a href="${escapeHtml(item.href)}" target="_blank" rel="noopener">${escapeHtml(t(item.label))}</a></li>`).join("")}</ul>` : ""}</div>`;
}

function initCommitteeUpdates() {
  const list = document.getElementById("updatesList");
  if (!list) return;
  const updates = Array.isArray(publicContent().updates) ? publicContent().updates : [];
  if (!updates.length) {
    list.innerHTML = `<p class="empty-state">${t("No committee updates have been published yet.")}</p>`;
    return;
  }
  list.innerHTML = updates.map((update) => {
    const date = update.date ? new Date(`${update.date}T00:00:00`).toLocaleDateString(currentLocale(), { day: "numeric", month: "short", year: "numeric" }) : "";
    const href = String(update.href || "#schedule").startsWith("#") ? update.href : "#schedule";
    return `<article class="update-card"><div class="update-meta"><span class="update-tag">${escapeHtml(t(update.category || "Update"))}</span><time datetime="${escapeHtml(update.date || "")}">${escapeHtml(date)}</time></div><h3>${escapeHtml(t(update.title || ""))}</h3><p>${escapeHtml(t(update.body || ""))}</p><a href="${escapeHtml(href)}">${escapeHtml(t(update.action || "View update"))} →</a></article>`;
  }).join("");
}


function renderPaymentDashboard(dashboard, payments) {
  const wings = [...new Set(payments.map(row => row.wing))].sort();
  let selectedWing = "All", statusFilter = "all", sortBy = "flat";
  const render = () => {
    const detailsOpen = dashboard.querySelector(".dashboard-details")?.open || false;
    const visible = payments.filter(row => (selectedWing === "All" || row.wing === selectedWing) && (statusFilter === "all" || String(row.paid) === statusFilter));
    const paid = payments.filter(row => row.paid), unpaid = payments.filter(row => !row.paid);
    const received = paid.reduce((sum, row) => sum + row.amount, 0), pending = unpaid.reduce((sum, row) => sum + row.amount, 0);
    const rows = [...visible].sort((a, b) => sortBy === "amount" ? b.amount - a.amount : sortBy === "status" ? Number(b.paid) - Number(a.paid) : a.flat.localeCompare(b.flat, undefined, { numeric: true }));
    const paidPercent = payments.length ? paid.length / payments.length * 100 : 0;
    const wingBars = wings.map(wing => {
      const wingRows = payments.filter(row => row.wing === wing), wingPaid = wingRows.filter(row => row.paid).length, percent = wingRows.length ? wingPaid / wingRows.length * 100 : 0;
      return `<div class="wing-row ${selectedWing === wing ? "active" : ""}"><button type="button" data-wing="${wing}">${t("Wing {wing}", { wing })}</button><div class="wing-bar" data-wing="${wing}" role="button" tabindex="0" aria-label="${t("Show Wing {wing} flats", { wing })}"><span class="wing-paid" style="width:${percent}%"></span><span class="wing-unpaid" style="width:${100 - percent}%"></span></div><span class="wing-count">${t("{paid} paid / {total}", { paid: wingPaid, total: wingRows.length })}</span></div>`;
    }).join("");
    dashboard.innerHTML = `<div class="collection-summary"><article><small>Total flats</small><strong>${payments.length}</strong></article><article class="received"><small>Amount received</small><strong>${paymentRupees(received)}</strong></article><article class="pending"><small>Amount pending</small><strong>${paymentRupees(pending)}</strong></article><article><small>Collection rate</small><strong>${paidPercent.toFixed(1)}%</strong></article></div><div class="payment-viz"><article class="payment-card"><h3>Payments by Wing</h3><p>Green is paid; orange is pending. Click a wing to drill down.</p><div class="wing-chart">${wingBars}</div></article><article class="payment-card"><h3>Overall payment status</h3><p>Only “Yes” payments count toward money received.</p><div class="donut-layout"><div class="donut" style="--paid:${paidPercent}%"><div class="donut-label"><strong>${paid.length}</strong>paid</div></div><div class="legend"><span><i class="yes"></i>Paid: ${paid.length}</span><span><i class="no"></i>Pending: ${unpaid.length}</span></div></div></article></div><article class="payment-card"><div class="payment-toolbar"><h3>${selectedWing === "All" ? t("All flats") : t("Wing {wing} flats", { wing: selectedWing })} <small>(${visible.length})</small></h3><div class="payment-controls"><select id="paymentWing" aria-label="Filter by wing"><option value="All">All wings</option>${["A", "B", "C", "D", "E", "F"].map(wing => `<option value="${wing}">${t("Wing {wing}", { wing })}</option>`).join("")}</select><select id="paymentStatus" aria-label="Filter payment status"><option value="all">All statuses</option><option value="true">Paid only</option><option value="false">Pending only</option></select><select id="paymentSort" aria-label="Sort flats"><option value="flat">Sort: Flat number</option><option value="status">Sort: Payment status</option><option value="amount">Sort: Amount</option></select></div></div><div class="payment-table-wrap">${rows.length ? `<table class="payment-table"><thead><tr><th>Wing</th><th>Flat</th><th>Status</th><th>Amount</th></tr></thead><tbody>${rows.map(row => `<tr><td>${escapeHtml(row.wing)}</td><td>${escapeHtml(row.flat)}</td><td><span class="status-pill ${row.paid ? "status-yes" : "status-no"}">${row.paid ? t("Paid") : t("Not paid")}</span></td><td>${paymentRupees(row.amount)}</td></tr>`).join("")}</tbody></table>` : '<p class="empty-state">No flats match this filter.</p>'}</div><p class="dashboard-note">Source: live Sai Vista contribution sheet · refreshed when the page loads</p></article>`;
    const details = document.createElement("details");
    details.className = "dashboard-details";
    details.open = detailsOpen;
    const summary = document.createElement("summary");
    summary.textContent = "Click here to see more details";
    details.append(summary);
    const summaryCards = dashboard.querySelector(".collection-summary");
    while (summaryCards.nextElementSibling) details.append(summaryCards.nextElementSibling);
    dashboard.append(details);
    window.SaiVistaI18n?.refresh();
    dashboard.querySelectorAll("[data-wing]").forEach(element => {
      const chooseWing = () => { selectedWing = element.dataset.wing; render(); };
      element.addEventListener("click", chooseWing);
      element.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseWing(); } });
    });
    const wingSelect = dashboard.querySelector("#paymentWing"); wingSelect.value = selectedWing; wingSelect.addEventListener("change", event => { selectedWing = event.target.value; render(); });
    const status = dashboard.querySelector("#paymentStatus"); status.value = statusFilter; status.addEventListener("change", event => { statusFilter = event.target.value; render(); });
    const sort = dashboard.querySelector("#paymentSort"); sort.value = sortBy; sort.addEventListener("change", event => { sortBy = event.target.value; render(); });
  };
  document.addEventListener("sai-vista-language-change", render);
  render();
}

document.addEventListener("DOMContentLoaded", initPaymentDashboard);
document.addEventListener("DOMContentLoaded", initCommitteeUpdates);
document.addEventListener("sai-vista-language-change", () => {
  initCommitteeUpdates();
});

// Client-side notification centre. Read status is kept per browser so the badge
// remains until a resident opens an update or chooses to mark it as read.
document.addEventListener("DOMContentLoaded", () => {
  const bell = document.getElementById("notificationBell");
  const panel = document.getElementById("notificationPanel");
  const count = document.getElementById("notificationCount");
  const list = document.getElementById("notificationList");
  const markAll = document.getElementById("markAllNotificationsRead");
  const enableAlerts = document.getElementById("enableBrowserNotifications");
  const alertStatus = document.getElementById("browserNotificationStatus");
  if (!bell || !panel || !count || !list || !markAll || !enableAlerts || !alertStatus) return;

  const storageKey = "saiVistaReadNotifications";
  let notifications = (publicContent().updates || []).map(update => ({...update}));

  const getReadIds = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return new Set(Array.isArray(saved) ? saved : []);
    } catch (_) {
      return new Set();
    }
  };
  const saveReadIds = (readIds) => localStorage.setItem(storageKey, JSON.stringify([...readIds]));

  const renderNotifications = () => {
    notifications = publicContent().updates || [];
    const readIds = getReadIds();
    const unread = notifications.filter((notification) => !readIds.has(notification.id));
    count.hidden = unread.length === 0;
    count.textContent = String(unread.length);
    bell.setAttribute("aria-label", unread.length ? t("Open notifications, {count} unread", { count: unread.length }) : t("Open notifications"));
    list.innerHTML = notifications.map((notification) => {
      const isUnread = !readIds.has(notification.id);
      return `<article class="notification-item ${isUnread ? "unread" : ""}">
        <i class="notification-dot" aria-hidden="true"></i>
        <div class="notification-copy">
          <h3>${t(notification.title)}</h3>
          <p>${t(notification.body)}</p>
          <a href="${notification.href}" data-notification-id="${notification.id}">${t(notification.action)} →</a>
        </div>
      </article>`;
    }).join("");
    list.querySelectorAll("[data-notification-id]").forEach((link) => {
      link.addEventListener("click", () => {
        const latestReadIds = getReadIds();
        latestReadIds.add(link.dataset.notificationId);
        saveReadIds(latestReadIds);
        renderNotifications();
        panel.classList.add("hidden");
        bell.setAttribute("aria-expanded", "false");
      });
    });
  };

  const updateBrowserAlertStatus = () => {
    if (!("Notification" in window)) {
      enableAlerts.hidden = true;
      alertStatus.textContent = t("Browser alerts are not supported on this device.");
      return;
    }
    if (Notification.permission === "granted") {
      enableAlerts.hidden = true;
      alertStatus.textContent = t("Browser alerts are enabled while this page is open.");
    } else if (Notification.permission === "denied") {
      enableAlerts.hidden = true;
      alertStatus.textContent = t("Browser alerts are blocked in your browser settings.");
    }
  };

  bell.addEventListener("click", () => {
    const opening = panel.classList.contains("hidden");
    panel.classList.toggle("hidden", !opening);
    bell.setAttribute("aria-expanded", String(opening));
  });
  markAll.addEventListener("click", () => {
    saveReadIds(new Set(notifications.map((notification) => notification.id)));
    renderNotifications();
  });
  enableAlerts.addEventListener("click", async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    updateBrowserAlertStatus();
    if (permission === "granted") new Notification(t("Sai Vista Aarti updates"), { body: t("Aarti notifications are enabled while this page is open.") });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      panel.classList.add("hidden");
      bell.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("click", (event) => {
    if (!panel.classList.contains("hidden") && !panel.contains(event.target) && !bell.contains(event.target)) {
      panel.classList.add("hidden");
      bell.setAttribute("aria-expanded", "false");
    }
  });

  renderNotifications();
  setInterval(()=>{renderNotifications();initCommitteeUpdates();},60000);
  updateBrowserAlertStatus();
  document.addEventListener("sai-vista-language-change", () => {
    renderNotifications();
    updateBrowserAlertStatus();
  });
});

// PWA installation is available only from a secure hosted site (HTTPS or localhost).
let deferredInstallPrompt;
document.addEventListener("DOMContentLoaded", () => {
  const installButtons = [...document.querySelectorAll(".install-app-trigger")];
  if (!installButtons.length) return;
  const setInstallButtonVisibility = (visible) => installButtons.forEach((button) => button.classList.toggle("hidden", !visible));

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    setInstallButtonVisibility(true);
  });

  installButtons.forEach((installButton) => installButton.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = undefined;
      setInstallButtonVisibility(false);
    }));

  window.addEventListener("appinstalled", () => setInstallButtonVisibility(false));

  // Service worker registration and update checks are handled by site-updates.js.
});

// Downloads a portable calendar file without sending resident information anywhere.
document.addEventListener("DOMContentLoaded", () => {
  const calendarButton = document.getElementById("downloadFestivalCalendar");
  if (!calendarButton) return;

  const events = [
    ["20260914", "Mirvanuk with Lezim Performance & Ganesh Sthapana", "Mirvanuk with Lezim Performance: 2:30 PM–6:30 PM IST. Lezim coordinator: Monica Jadhav. Ganesh Sthapana by Sandeep Prajapati: 7:00 PM IST."],
    ["20260915", "Housie", "Community Housie evening. Coordinators: Shilpi Jain & Priyanka Merai."],
    ["20260916", "Lemon & Spoon and Three-legged Race", "Join us for the Lemon & Spoon and Three-legged Race games."],
    ["20260917", "Musical Chairs", "Musical Chairs, plus additional games as time permits."],
    ["20260918", "Bollywood Night", "Wing competition — 1 entry per wing. Coordinator: Deepti Lakhotia."],
    ["20260919", "Drawing Competition for Kids, Talent Show - Season 1 & Dhol Tasha Vaadan", "Drawing Competition for Kids and Talent Show - Season 1. Dhol Tasha Vaadan: 4:00 PM–6:00 PM IST, ground floor near the Pandal. Sponsored by the Cricket team. Thank you to the Cricket team for their support!"],
    ["20260920", "Community Activity Day", "Blood Donation (coordinators: Deepak Karade & Sameer Gandhi); Treasure Hunt; Thali & Rangoli Competition; Fun n Fair (coordinator: Priyank Sharma)."],
    ["20260921", "Talent Show 2", "Second talent-show session."],
    ["20260922", "Fancy Dress", "Fancy Dress event."],
    ["20260924", "Satyanarayan Puja & Mahaprasad", "Satyanarayan Puja. Mahaprasad: 7:00 PM–10:00 PM IST."],
    ["20260925", "Visarjan, Lezim & DJ", "Visarjan programme with Lezim and evening DJ. Lezim coordinator: Monica Jadhav."],
    ["20260923", "No Stove Cooking Competition", "Participation gift for all; gifts worth ₹10,000 in total, sponsored by Artisanal Sweets."]
  ];
  const toNextDay = (date) => {
    const year = Number(date.slice(0, 4)), month = Number(date.slice(4, 6)) - 1, day = Number(date.slice(6, 8));
    const next = new Date(Date.UTC(year, month, day + 1));
    return `${next.getUTCFullYear()}${String(next.getUTCMonth() + 1).padStart(2, "0")}${String(next.getUTCDate()).padStart(2, "0")}`;
  };
  const escapeIcs = (value) => String(value).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  calendarButton.addEventListener("click", () => {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Sai Vista//Ganpati Festival 2026//EN",
      "CALSCALE:GREGORIAN",
      ...events.flatMap(([date, title, description], index) => [
        "BEGIN:VEVENT",
        `UID:sai-vista-ganpati-2026-${index + 1}@saivista`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${date}`,
        `DTEND;VALUE=DATE:${toNextDay(date)}`,
        `SUMMARY:${escapeIcs(title)}`,
        `DESCRIPTION:${escapeIcs(description)}`,
        "LOCATION:Sai Vista, Rahatani",
        "END:VEVENT"
      ]),
      "END:VCALENDAR"
    ].join("\r\n");
    const calendarFile = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(calendarFile);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sai-vista-ganpati-2026.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
});

// Suggestions remain on the visitor's device until they choose to review and send them in WhatsApp.
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("suggestionForm");
  const message = document.getElementById("suggestionMessage");
  if (!form || !message) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const suggestion = message.value.trim();
    if (!suggestion) return;
    const text = `Hi Sai Vista Cultural Committee, I have a suggestion for Ganpati 2026:\n\n${suggestion}`;
    window.open(`https://wa.me/917621940889?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  });
});

// Privacy-preserving shared counter: one increment per browser tab session and no personal data.
document.addEventListener("DOMContentLoaded", async () => {
  const counter = document.getElementById("siteViewCounter");
  if (!counter || !VISITOR_COUNTER_URL) return;
  const separator = VISITOR_COUNTER_URL.includes("?") ? "&" : "?";
  const url = `${VISITOR_COUNTER_URL}${separator}action=`;
  try {
    const countedThisSession = sessionStorage.getItem("saiVistaPageViewCounted") === "true";
    const response = await fetch(`${url}${countedThisSession ? "count" : "visit"}&_=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Counter request failed");
    const data = await response.json();
    if (!countedThisSession) sessionStorage.setItem("saiVistaPageViewCounted", "true");
    const value = Number(data.count);
    if (!Number.isFinite(value)) throw new Error("Counter response was invalid");
    counter.textContent = t("Page views: {count}", { count: new Intl.NumberFormat(currentLocale()).format(value) });
    counter.hidden = false;
  } catch (error) {
    console.warn("Visitor counter unavailable:", error);
  }
});

// The website asks the operating system for a compatible UPI app; it never handles payment credentials.
document.addEventListener("DOMContentLoaded", () => {
  const openPayment = document.getElementById("openKurtaPayment");
  const paymentModal = document.getElementById("upiPaymentModal");
  const closePayment = document.getElementById("closeUpiPayment");
  const launchApps = document.getElementById("launchUpiApps");
  const copyUpiId = document.getElementById("copyUpiId");
  const help = document.getElementById("upiPaymentHelp");
  if (!openPayment || !paymentModal || !closePayment || !launchApps || !copyUpiId || !help) return;

  const closeModal = () => {
    paymentModal.classList.add("hidden");
    paymentModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };
  openPayment.addEventListener("click", () => {
    paymentModal.classList.remove("hidden");
    paymentModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });
  closePayment.addEventListener("click", closeModal);
  paymentModal.addEventListener("click", (event) => {
    if (event.target === paymentModal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !paymentModal.classList.contains("hidden")) closeModal();
  });

  launchApps.addEventListener("click", (event) => {
    // Android's intent URL asks the system to resolve a compatible UPI app.
    // Other platforms use the standard UPI intent in the href as a fallback.
    if (/Android/i.test(navigator.userAgent) && launchApps.dataset.androidIntent) {
      event.preventDefault();
      window.location.href = launchApps.dataset.androidIntent;
    }
  });

  copyUpiId.addEventListener("click", async () => {
    const upiId = "karade.deepak1@ibl";
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(upiId);
      else {
        const temporaryInput = document.createElement("textarea");
        temporaryInput.value = upiId;
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        document.execCommand("copy");
        temporaryInput.remove();
      }
      help.textContent = t("UPI ID copied. Open any UPI app and paste it to pay ₹300.");
    } catch (_) {
      help.textContent = t("Copy is unavailable on this browser. Use karade.deepak1@ibl in your UPI app.");
    }
  });
});

// Show the invitation once per tab session; the launcher stays available.
document.addEventListener("DOMContentLoaded", () => {
  const panel = document.getElementById("promotionChat");
  const launcher = document.getElementById("promotionLauncher");
  const close = document.getElementById("promotionClose");
  if (!panel || !launcher || !close) return;
  let interacted = false;
  const setOpen = (open, returnFocus = false) => {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    if (returnFocus) launcher.focus();
  };
  const remember = () => {
    interacted = true;
    try { sessionStorage.setItem("saiVistaPromotionSeen", "1"); } catch (_) {}
  };
  launcher.addEventListener("click", () => { remember(); setOpen(panel.hidden); });
  close.addEventListener("click", () => { remember(); setOpen(false, true); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      remember();
      setOpen(false, panel.contains(document.activeElement));
    }
  });
  let seen = false;
  try { seen = sessionStorage.getItem("saiVistaPromotionSeen") === "1"; } catch (_) {}
  if (!seen) {
    const showWhenReady = () => {
      if (interacted) return;
      if (document.hidden || document.querySelector('[aria-modal="true"]:not(.hidden):not([hidden])')) {
        window.setTimeout(showWhenReady, 2000);
        return;
      }
      remember();
      setOpen(true);
    };
    window.setTimeout(showWhenReady, 4500);
  }
});

// Native modal keeps focus inside the registration form and supports Escape.
document.addEventListener("DOMContentLoaded", () => {
  const dialog = document.getElementById("aartiRegistrationDialog");
  const opener = document.getElementById("openAartiRegistration");
  if (!dialog || !opener) return;
  let previousOverflow = "";
  opener.addEventListener("click", () => {
    previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
  });
  document.getElementById("closeAartiRegistration").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    document.body.style.overflow = previousOverflow;
    opener.focus();
  });
});
