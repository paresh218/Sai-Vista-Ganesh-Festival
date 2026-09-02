
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
  siteNav?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    siteNav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "Open menu");
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

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyK78libRqIDFcEY2j0TCTpQkmyphHPbnadD6_2BfdGk-_Sixo9Au-ieZw2HyfrxFOO/exec";
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
    button.addEventListener("click", () => {
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
  const response = await fetch(GOOGLE_SCRIPT_URL + "?action=slots", { cache: "no-store" });
  if (!response.ok) throw new Error("Availability request failed.");
  return response.json();
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
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(data).toString()
    });

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
    alert("There was a problem submitting the nomination. Please try again.");
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
