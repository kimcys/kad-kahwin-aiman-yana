const INVITATION = {
  couple: "Aiman Alyana",
  eventTitle: "Walimatul Urus Aiman & Alyana",
  startDate: "2026-08-08T11:00:00+08:00",
  endDate: "2026-08-08T15:00:00+08:00",
  venue: "Seri Mentari Glasshall",
  address: "Seri Mentari Glasshall, Jalan Bukit Katil - Duyong, 75460 Melaka, Malaysia",
  calendarDescription: "Walimatul Urus Muhammad Aiman Hakim Bin Azahari dan Nurul Alyana Binti Che Aman. 11 Pagi - 3 Petang. #AiLoveYa",
  defaultWishes: [
    { name: "Tetamu", message: "Tahniah Aiman dan Alyana. Semoga berbahagia hingga ke Jannah." },
    { name: "Keluarga", message: "Semoga majlis dipermudahkan dan diberkati Allah SWT." }
  ]
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

const body = document.body;
const opening = $("#opening");
const card = $("#card");
const panelOverlay = $("#panelOverlay");
const panels = $$(".bottom-panel");
const loverAudio = $("#loverAudio");
let musicPlaying = false;
let sparkleInterval = null;
let unlocked = false;

const params = new URLSearchParams(window.location.search);
const guest = params.get("to") || params.get("guest") || "";

if (guest.trim()) {
  const guestLine = $("#guestLine");
  if (guestLine) {
    guestLine.textContent = guest.trim();
    guestLine.classList.add("has-guest");
  }
}

if ("inert" in card) {
  card.inert = true;
}

function unlockCard() {
  if (unlocked) return;
  unlocked = true;

  body.classList.remove("card-closed");
  body.classList.add("card-opened");
  card.classList.remove("is-locked");
  if ("inert" in card) {
    card.inert = false;
  }

  opening.classList.add("is-hidden");
  opening.setAttribute("aria-hidden", "true");
  card.scrollTop = 0;
  startSparkleLoop();
  startMusic();

  window.setTimeout(() => {
    opening.hidden = true;
  }, 900);
}

const openButton = $("#openInvite");
openButton.addEventListener("click", (event) => {
  event.stopPropagation();
  unlockCard();
});

opening.addEventListener("click", unlockCard);

if (params.get("open") === "1") {
  unlockCard();
}

function updateCountdown() {
  const target = new Date(INVITATION.startDate).getTime();
  const now = Date.now();
  const difference = Math.max(target - now, 0);

  const second = 1000;
  const minute = second * 60;
  const hour = minute * 60;
  const day = hour * 24;

  $("#days").textContent = Math.floor(difference / day);
  $("#hours").textContent = Math.floor((difference % day) / hour);
  $("#minutes").textContent = Math.floor((difference % hour) / minute);
  $("#seconds").textContent = Math.floor((difference % minute) / second);
}

updateCountdown();
window.setInterval(updateCountdown, 1000);

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  $$(".reveal").forEach((element) => revealObserver.observe(element));
} else {
  $$(".reveal").forEach((element) => element.classList.add("is-visible"));
}

function openPanel(panelId) {
  if (body.classList.contains("card-closed")) return;

  panels.forEach((panel) => {
    panel.hidden = true;
  });

  const panel = document.getElementById(panelId);
  if (!panel) return;

  panel.hidden = false;
  panelOverlay.hidden = false;
}

function closePanels() {
  panels.forEach((panel) => {
    panel.hidden = true;
  });
  panelOverlay.hidden = true;
}

$$("[data-panel]").forEach((button) => {
  button.addEventListener("click", () => openPanel(button.dataset.panel));
});

$$(".panel-close").forEach((button) => button.addEventListener("click", closePanels));
panelOverlay.addEventListener("click", closePanels);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePanels();
});

function formatCalendarDate(dateString) {
  return new Date(dateString).toISOString().replace(/-|:|\.\d{3}/g, "");
}

function setupCalendarLinks() {
  const start = formatCalendarDate(INVITATION.startDate);
  const end = formatCalendarDate(INVITATION.endDate);
  const calendarParams = new URLSearchParams({
    action: "TEMPLATE",
    text: INVITATION.eventTitle,
    dates: `${start}/${end}`,
    details: INVITATION.calendarDescription,
    location: INVITATION.address
  });

  $("#googleCalendar").href = `https://calendar.google.com/calendar/render?${calendarParams.toString()}`;

  $("#appleCalendar").addEventListener("click", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Aiman Alyana Lover Inspired Digital Card//MS",
      "BEGIN:VEVENT",
      `UID:${Date.now()}@aiman-alyana-card`,
      `DTSTAMP:${formatCalendarDate(new Date().toISOString())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${INVITATION.eventTitle}`,
      `DESCRIPTION:${INVITATION.calendarDescription}`,
      `LOCATION:${INVITATION.address}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "aiman-alyana-walimatul-urus.ics";
    link.click();
    URL.revokeObjectURL(url);
  });
}

function setupLocationLinks() {
  const encodedAddress = encodeURIComponent(INVITATION.address);
  $("#googleMaps").href = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  $("#waze").href = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
}

setupCalendarLinks();
setupLocationLinks();

function getStoredWishes() {
  try {
    return JSON.parse(localStorage.getItem("aiman-alyana-wishes")) || INVITATION.defaultWishes;
  } catch {
    return INVITATION.defaultWishes;
  }
}

function setStoredWishes(wishes) {
  localStorage.setItem("aiman-alyana-wishes", JSON.stringify(wishes));
}

function renderWishes() {
  const wishList = $("#wishList");
  const wishes = getStoredWishes();
  wishList.innerHTML = "";

  wishes.slice().reverse().forEach((wish) => {
    const item = document.createElement("div");
    item.className = "wish-card";

    const name = document.createElement("strong");
    name.textContent = wish.name;

    const message = document.createElement("p");
    message.textContent = wish.message;

    item.append(name, message);
    wishList.append(item);
  });
}

$("#wishForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = String(form.get("name") || "").trim();
  const message = String(form.get("message") || "").trim();
  if (!name || !message) return;

  const wishes = getStoredWishes();
  wishes.push({ name, message });
  setStoredWishes(wishes);
  event.currentTarget.reset();
  renderWishes();
  closePanels();
});

renderWishes();

$("#rsvpForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const rsvp = {
    name: String(form.get("name") || "").trim(),
    attendance: String(form.get("attendance") || ""),
    guests: Number(form.get("guests") || 0),
    submittedAt: new Date().toISOString()
  };

  let existing = [];
  try {
    existing = JSON.parse(localStorage.getItem("aiman-alyana-rsvp") || "[]");
  } catch {
    existing = [];
  }

  existing.push(rsvp);
  localStorage.setItem("aiman-alyana-rsvp", JSON.stringify(existing));

  $("#rsvpStatus").textContent = `Terima kasih, ${rsvp.name}. RSVP anda telah disimpan pada peranti ini.`;
  event.currentTarget.reset();
});

function createSparkle() {
  const sparkle = document.createElement("span");
  sparkle.className = "floating-heart";
  sparkle.textContent = Math.random() > 0.5 ? "\u2661" : "\u2726";
  sparkle.style.left = `${Math.random() * 100}%`;
  sparkle.style.fontSize = `${14 + Math.random() * 22}px`;
  sparkle.style.setProperty("--duration", `${8 + Math.random() * 8}s`);
  $(".sparkle-field").append(sparkle);
  window.setTimeout(() => sparkle.remove(), 17000);
}

function startSparkleLoop() {
  if (sparkleInterval) return;
  createSparkle();
  sparkleInterval = window.setInterval(createSparkle, 950);
}

async function startMusic() {
  if (!loverAudio) return;

  try {
    loverAudio.volume = 0.58;
    await loverAudio.play();
    musicPlaying = true;
    $("#musicToggle").textContent = "Hentikan Lagu";
    const status = $("#musicStatus");
    if (status) status.textContent = "Lagu sedang dimainkan.";
  } catch (error) {
    const status = $("#musicStatus");
    if (status) status.textContent = "Lagu tidak dapat dimainkan. Sila tekan butang sekali lagi.";
  }
}

function stopMusic() {
  if (!loverAudio) return;
  loverAudio.pause();
  musicPlaying = false;
  $("#musicToggle").textContent = "Mainkan Lagu";
  const status = $("#musicStatus");
  if (status) status.textContent = "Lagu dihentikan.";
}

if (loverAudio) {
  loverAudio.addEventListener("ended", () => {
    musicPlaying = false;
    $("#musicToggle").textContent = "Mainkan Lagu";
  });
}

$("#musicToggle").addEventListener("click", () => {
  if (musicPlaying) {
    stopMusic();
  } else {
    startMusic();
  }
});

$$("a[aria-disabled='true']").forEach((link) => {
  link.addEventListener("click", (event) => event.preventDefault());
});
