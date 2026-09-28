import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBifW3zbncREMhxjqw9g0ITWnxD396Kkss",
  authDomain: "aiman-yana-wed.firebaseapp.com",
  projectId: "aiman-yana-wed",
  storageBucket: "aiman-yana-wed.firebasestorage.app",
  messagingSenderId: "171399879009",
  appId: "1:171399879009:web:fbf380999b1a22c2bbcd20",
  measurementId: "G-TEN91Q9VDR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const INVITATION = {
  couple: "Aiman Alyana",
  eventTitle: "Walimatul Urus Aiman & Alyana",
  startDate: "2026-08-08T11:00:00+08:00",
  endDate: "2026-08-08T15:00:00+08:00",
  venue: "Seri Mentari Glasshall",
  address: "Seri Mentari Glasshall, Jalan Bukit Katil - Duyong, 75460 Melaka, Malaysia",
  googleMapsUrl: "https://www.google.com/maps?q=2.1970694,102.2903182",
  wazeUrl: "https://waze.com/ul/hw22srxvwk",
  calendarDescription: "Walimatul Urus Muhammad Aiman Hakim Bin Azahari dan Nurul Alyana Binti Che Aman. 11 Pagi - 3 Petang. #AiLoveYa",
  defaultWishes: [
    { name: "Tetamu", message: "Tahniah Aiman dan Alyana. Semoga berbahagia hingga ke Jannah." },
    { name: "Keluarga", message: "Semoga majlis dipermudahkan dan diberkati Allah SWT." }
  ]
};

const WISHES_PAGE_SIZE = 3;
const wishesCollection = collection(db, "wishes");
const rsvpsCollection = collection(db, "rsvps");

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

const body = document.body;
const opening = $("#opening");
const card = $("#card");
const panelOverlay = $("#panelOverlay");
const panels = $$(".bottom-panel");
const loverAudio = $("#loverAudio");
const rsvpGuestCount = $("#rsvpGuestCount");
const wishList = $("#wishList");
let musicPlaying = false;
let sparkleInterval = null;
let unlocked = false;
let wishCurrentPage = 1;
let wishTotalPages = 1;
let wishCountKnown = false;
let wishHasMorePages = false;
let wishLoading = false;
let wishLoadToken = 0;
let wishPageEnds = new Map();

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

  const finished = difference === 0;
  $(".countdown-grid").hidden = finished;
  $("#countdownDone").hidden = !finished;
  $(".countdown .section-kicker").textContent = finished ? "Majlis telah berlangsung" : "Menghitung hari menuju majlis";
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
  button.addEventListener("click", () => {
    const page = button.dataset.page && document.getElementById(button.dataset.page);
    if (!page) {
      openPanel(button.dataset.panel);
      return;
    }

    // Nav shortcut: land on the related page first, so closing the panel leaves the guest there.
    card.scrollTo({ top: page.offsetTop - 16, behavior: "smooth" });
    window.setTimeout(() => openPanel(button.dataset.panel), 450);
  });
});

/* Full-page layout: one section per screen, content in a floating panel. */
function initPages() {
  const pages = $$("#card > .hero, #card > .section-card");
  const dots = $(".page-dots");

  $$("#card > .section-card").forEach((section) => {
    const panel = document.createElement("div");
    panel.className = "page-panel";
    panel.append(...section.childNodes);
    section.append(panel);
  });

  pages.forEach(() => dots.append(document.createElement("span")));

  const setActive = (page) => {
    const index = pages.indexOf(page);
    Array.from(dots.children).forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === index));
  };

  setActive(pages[0]);

  if ("IntersectionObserver" in window) {
    const pageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target);
      });
    }, { root: card, rootMargin: "-45% 0px -45% 0px" });

    pages.forEach((page) => pageObserver.observe(page));
  }

  // The "Leret ke atas" hint is only needed until the guest's first swipe.
  card.addEventListener("scroll", () => {
    if (card.scrollTop > 40) body.classList.add("has-swiped");
  }, { passive: true });
}

initPages();

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
  $("#googleMaps").href = INVITATION.googleMapsUrl;
  $("#waze").href = INVITATION.wazeUrl;
}

setupCalendarLinks();
setupLocationLinks();

function getRsvpGuestCount(rsvp) {
  const guests = Number.parseInt(String(rsvp.guests ?? "0"), 10);
  return Number.isFinite(guests) && guests >= 0 ? guests : 0;
}

function setRsvpStats(snapshot) {
  setRsvpGuestCount(sumRsvpGuests(snapshot));
}

function setRsvpGuestCount(totalGuests) {
  if (rsvpGuestCount) {
    rsvpGuestCount.textContent = String(totalGuests);
  }
}

function sumRsvpGuests(snapshot) {
  return snapshot.docs.reduce((sum, doc) => {
    return sum + getRsvpGuestCount(doc.data());
  }, 0);
}

function initCarousel(root) {
  const track = $("[data-carousel-track]", root);
  const slides = $$(".carousel-slide", root);
  const prevButton = $("[data-carousel-prev]", root);
  const nextButton = $("[data-carousel-next]", root);
  const dots = $("[data-carousel-dots]", root);

  if (!track || !prevButton || !nextButton || !dots || slides.length === 0) {
    return;
  }

  let currentIndex = 0;
  let autoplayId = null;


  function stopAutoplay() {
    if (autoplayId) {
      window.clearInterval(autoplayId);
      autoplayId = null;
    }
  }

  function setIndex(nextIndex) {
    currentIndex = ((nextIndex % slides.length) + slides.length) % slides.length;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === currentIndex);
    });

    Array.from(dots.children).forEach((dot, slideIndex) => {
      const active = slideIndex === currentIndex;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-current", active ? "true" : "false");
    });

    const hasMultipleSlides = slides.length > 1;
    prevButton.disabled = !hasMultipleSlides;
    nextButton.disabled = !hasMultipleSlides;
  }

  function moveTo(nextIndex) {
    setIndex(nextIndex);
    restartAutoplay();
  }

  function restartAutoplay() {
    stopAutoplay();

    if (slides.length < 2) {
      return;
    }

    autoplayId = window.setInterval(() => {
      setIndex(currentIndex + 1);
    }, 4200);
  }

  dots.innerHTML = "";

  slides.forEach((slide, slideIndex) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "carousel-dot";
    dot.setAttribute("aria-label", `Pergi ke slaid ${slideIndex + 1}`);
    dot.addEventListener("click", () => moveTo(slideIndex));
    dots.append(dot);
    slide.classList.toggle("is-active", slideIndex === 0);
  });

  prevButton.addEventListener("click", () => moveTo(currentIndex - 1));
  nextButton.addEventListener("click", () => moveTo(currentIndex + 1));

  root.addEventListener("pointerenter", stopAutoplay);
  root.addEventListener("pointerleave", restartAutoplay);
  root.addEventListener("focusin", stopAutoplay);
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget)) {
      restartAutoplay();
    }
  });

  setIndex(0);
  restartAutoplay();
}

const galleryCarousel = $("[data-carousel]");
if (galleryCarousel) {
  initCarousel(galleryCarousel);
}

// function getStoredWishes() {
//   try {
//     return JSON.parse(localStorage.getItem("aiman-alyana-wishes")) || INVITATION.defaultWishes;
//   } catch {
//     return INVITATION.defaultWishes;
//   }
// }

// function setStoredWishes(wishes) {
//   localStorage.setItem("aiman-alyana-wishes", JSON.stringify(wishes));
// }

// function renderWishes() {
//   const wishList = $("#wishList");
//   const wishes = getStoredWishes();
//   wishList.innerHTML = "";

//   wishes.slice().reverse().forEach((wish) => {
//     const item = document.createElement("div");
//     item.className = "wish-card";

//     const name = document.createElement("strong");
//     name.textContent = wish.name;

//     const message = document.createElement("p");
//     message.textContent = wish.message;

//     item.append(name, message);
//     wishList.append(item);
//   });
// }

const toast = $("#toast");
let toastTimer = null;

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.requestAnimationFrame(() => toast.classList.add("is-visible"));
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => { toast.hidden = true; }, 350);
  }, 3800);
}

// Remember on this phone that the guest has RSVP'd, so they are not asked again by default.
const RSVP_DONE_KEY = "aiman-alyana-rsvp-done";

function showRsvpDone(name) {
  if (!name) return;
  const note = $("#rsvpDone");
  note.textContent = `\u2713 Terima kasih, ${name}. Kehadiran anda telah disahkan.`;
  note.hidden = false;
  const button = $("#rsvpOpenButton");
  button.textContent = "Sahkan Untuk Tetamu Lain";
  button.classList.replace("primary-button", "secondary-button");
}

try {
  showRsvpDone(localStorage.getItem(RSVP_DONE_KEY));
} catch {
  // Storage unavailable; the note simply is not shown.
}

const rsvpForm = $("#rsvpForm");
const attendanceSelect = $("select[name='attendance']", rsvpForm);
const guestsField = $("#guestsField");
const guestsInput = $("input[name='guests']", guestsField);
const rsvpMessage = $("textarea[name='message']", rsvpForm);

// "Tidak Hadir" always counts as 0 guests, so the field is hidden instead of asked.
function syncGuestsField() {
  const notAttending = attendanceSelect.value === "Tidak Hadir";
  guestsField.hidden = notAttending;
  guestsInput.disabled = notAttending;
}

attendanceSelect.addEventListener("change", syncGuestsField);
rsvpForm.addEventListener("reset", () => window.setTimeout(syncGuestsField));
rsvpMessage.addEventListener("invalid", () => rsvpMessage.setCustomValidity("Sila tulis ucapan untuk pengantin."));
rsvpMessage.addEventListener("input", () => rsvpMessage.setCustomValidity(""));

// $("#rsvpForm").addEventListener("submit", (event) => {
//   event.preventDefault();
//   const form = new FormData(event.currentTarget);
//   const rsvp = {
//     name: String(form.get("name") || "").trim(),
//     attendance: String(form.get("attendance") || ""),
//     guests: Number(form.get("guests") || 0),
//     submittedAt: new Date().toISOString()
//   };

//   let existing = [];
//   try {
//     existing = JSON.parse(localStorage.getItem("aiman-alyana-rsvp") || "[]");
//   } catch {
//     existing = [];
//   }

//   existing.push(rsvp);
//   localStorage.setItem("aiman-alyana-rsvp", JSON.stringify(existing));

//   $("#rsvpStatus").textContent = `Terima kasih, ${rsvp.name}. RSVP anda telah disimpan pada peranti ini.`;
//   event.currentTarget.reset();
// });

const BEAD_COLORS = ["#ffd8e9", "#bfe8f5", "#fff1bb", "#e6d9ff", "#d6f5e3"];

// The guest's name as an Eras-style friendship bracelet: one letter per bead, hearts at the ends.
function createBracelet(fullName) {
  const bracelet = document.createElement("span");
  bracelet.className = "bracelet";
  bracelet.setAttribute("aria-hidden", "true");

  const letters = Array.from(String(fullName).toUpperCase().replace(/[^\p{L}\p{N} ]/gu, "").trim()).slice(0, 14);
  const beads = ["\u2661", ...(letters.length ? letters : ["\u2661"]), "\u2661"];

  // Long names get smaller beads so the bracelet stays on one line.
  bracelet.style.setProperty("--bead-size", `${Math.max(12, Math.min(20, Math.floor(250 / beads.length) - 3))}px`);

  beads.forEach((letter, index) => {
    const bead = document.createElement("span");
    bead.className = letter === " " ? "bead bead-gap" : letter === "\u2661" ? "bead bead-heart" : "bead";
    bead.textContent = letter === " " ? "" : letter;
    bead.style.setProperty("--bead", BEAD_COLORS[index % BEAD_COLORS.length]);
    bracelet.append(bead);
  });

  return bracelet;
}

function renderWishes(wishes) {
  if (!wishList) {
    return;
  }

  wishList.innerHTML = "";

  wishes.forEach((wish, wishIndex) => {
    const item = document.createElement("div");
    item.className = "wish-card";
    item.style.setProperty("--wish-delay", `${wishIndex * 55}ms`);

    const name = document.createElement("strong");
    name.className = "sr-only";
    name.textContent = wish.name;

    const message = document.createElement("p");
    message.textContent = wish.message;

    item.append(createBracelet(wish.name), name, message);
    wishList.append(item);
  });

  wishList.classList.remove("is-changing");
}

const WISH_ROTATE_MS = 6000;
let wishRotateId = null;

async function loadWishPage(pageNumber = 1, { resetHistory = false } = {}) {
  const normalizedPage = Math.max(1, pageNumber);

  if (resetHistory) {
    wishPageEnds.clear();
  }

  const previousCursor = normalizedPage > 1 ? wishPageEnds.get(normalizedPage - 1) : null;
  if (normalizedPage > 1 && !previousCursor) {
    return loadWishPage(1, { resetHistory: true });
  }

  const wishQuery = previousCursor
    ? query(
        wishesCollection,
        orderBy("createdAt", "desc"),
        startAfter(previousCursor),
        limit(WISHES_PAGE_SIZE)
      )
    : query(
        wishesCollection,
        orderBy("createdAt", "desc"),
        limit(WISHES_PAGE_SIZE)
      );

  const loadToken = ++wishLoadToken;
  wishLoading = true;
  wishList?.classList.add("is-changing");

  try {
    const [countResult, pageResult] = await Promise.allSettled([
      getCountFromServer(wishesCollection),
      getDocs(wishQuery)
    ]);

    if (loadToken !== wishLoadToken) {
      return;
    }

    if (countResult.status === "fulfilled") {
      wishCountKnown = true;
      const totalCount = Number(countResult.value.data().count) || 0;
      wishTotalPages = Math.max(1, Math.ceil(totalCount / WISHES_PAGE_SIZE));
    } else {
      wishCountKnown = false;
      console.error("Error counting wishes:", countResult.reason);
    }

    if (pageResult.status !== "fulfilled") {
      throw pageResult.reason;
    }

    const snapshot = pageResult.value;
    let wishes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    if (wishes.length === 0 && normalizedPage === 1) {
      renderWishes(INVITATION.defaultWishes.slice().reverse());
      wishCurrentPage = 1;
      wishTotalPages = 1;
      wishCountKnown = true;
      wishHasMorePages = false;
      wishPageEnds.clear();
      return;
    }

    if (normalizedPage > 1 && wishes.length < WISHES_PAGE_SIZE) {
      // Short last page: top it up with the newest wishes so every page shows a full set.
      const topUp = await getDocs(query(
        wishesCollection,
        orderBy("createdAt", "desc"),
        limit(WISHES_PAGE_SIZE - wishes.length)
      ));
      if (loadToken !== wishLoadToken) {
        return;
      }
      wishes = wishes.concat(topUp.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }

    renderWishes(wishes);
    wishCurrentPage = normalizedPage;

    if (snapshot.docs.length > 0) {
      wishPageEnds.set(normalizedPage, snapshot.docs[snapshot.docs.length - 1]);
    }

    wishHasMorePages = wishCountKnown
      ? wishCurrentPage < wishTotalPages
      : snapshot.docs.length === WISHES_PAGE_SIZE;
  } catch (error) {
    if (loadToken !== wishLoadToken) {
      return;
    }

    console.error("Error loading wishes:", error);

    if (normalizedPage === 1) {
      renderWishes(INVITATION.defaultWishes.slice().reverse());
      wishCurrentPage = 1;
      wishTotalPages = 1;
      wishCountKnown = true;
      wishHasMorePages = false;
      wishPageEnds.clear();
    }
  } finally {
    if (loadToken === wishLoadToken) {
      wishLoading = false;
    }
  }
}

// Wishes rotate on their own: next page every few seconds, back to page 1 after the last.
// With a single page there is nothing to rotate, so the list stays put.
function startWishRotation() {
  if (wishRotateId) window.clearInterval(wishRotateId);

  wishRotateId = window.setInterval(() => {
    if (wishLoading || document.hidden) return;
    if (wishHasMorePages) {
      void loadWishPage(wishCurrentPage + 1);
    } else if (wishCurrentPage > 1) {
      void loadWishPage(1, { resetHistory: true });
    }
  }, WISH_ROTATE_MS);
}

void loadWishPage(1, { resetHistory: true });
startWishRotation();

async function loadRsvpGuestTotal() {
  try {
    const snapshot = await getDocs(rsvpsCollection);
    setRsvpStats(snapshot);
  } catch (error) {
    console.error("Error loading RSVP guest total:", error);
    setRsvpGuestCount("-");
  }
}

void loadRsvpGuestTotal();

onSnapshot(
  rsvpsCollection,
  (snapshot) => {
    setRsvpStats(snapshot);
  },
  (error) => {
    console.error("Error watching RSVPs:", error);
  }
);

$("#rsvpForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const formElement = event.currentTarget;
  const form = new FormData(formElement);

  const attendance = String(form.get("attendance") || "");
  const parsedGuests = Number.parseInt(String(form.get("guests") || "1"), 10);
  const rsvp = {
    name: String(form.get("name") || "").trim().slice(0, 80),
    attendance,
    guests: attendance === "Tidak Hadir" ? 0 : Math.min(Math.max(Number.isFinite(parsedGuests) ? parsedGuests : 1, 1), 10),
    submittedAt: serverTimestamp()
  };
  // Every RSVP comes with a wish; it is posted to Ucapan Tetamu as well.
  const message = String(form.get("message") || "").trim().slice(0, 180);

  if (!rsvp.name || !rsvp.attendance || !message) return;

  const submitButton = formElement.querySelector("button[type='submit']");
  submitButton.disabled = true;

  $("#rsvpStatus").textContent = "Menghantar RSVP...";

  try {
    await Promise.all([
      addDoc(rsvpsCollection, rsvp),
      addDoc(wishesCollection, { name: rsvp.name, message, createdAt: serverTimestamp() })
    ]);

    await loadWishPage(1, { resetHistory: true });
    startWishRotation();
    $("#rsvpStatus").textContent = "";
    formElement.reset();
    closePanels();
    try {
      localStorage.setItem(RSVP_DONE_KEY, rsvp.name);
    } catch {
      // Not remembered; harmless.
    }
    showRsvpDone(rsvp.name);
    showToast(`Terima kasih, ${rsvp.name}! RSVP dan ucapan anda telah dihantar.`);
    $("#wishesSection").scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    console.error("Error sending RSVP:", error);
    $("#rsvpStatus").textContent = "Maaf, RSVP tidak dapat dihantar. Sila cuba lagi.";
  } finally {
    submitButton.disabled = false;
  }
});

const BUTTERFLY_SVG = '<svg viewBox="0 0 32 26" aria-hidden="true"><path d="M16 13C13 4 5-1 2 3s2 10 14 10Z" fill="#ffc4de"/><path d="M16 13c3-9 11-14 14-10s-2 10-14 10Z" fill="#bfe8f5"/><path d="M16 13c-2 5-9 11-11 8s2-7 11-8Z" fill="#ffd8e9"/><path d="M16 13c2 5 9 11 11 8s-2-7-11-8Z" fill="#d7efff"/><path d="M16 7v14" stroke="#be4077" stroke-width="1.4" stroke-linecap="round"/></svg>';

function createSparkle() {
  const sparkle = document.createElement("span");
  if (Math.random() < 0.18) {
    // Lover-era butterfly, fluttering as it rises.
    sparkle.className = "floating-heart floating-butterfly";
    sparkle.innerHTML = BUTTERFLY_SVG;
    sparkle.style.left = `${Math.random() * 100}%`;
    sparkle.style.setProperty("--size", `${20 + Math.random() * 14}px`);
    sparkle.style.setProperty("--duration", `${10 + Math.random() * 6}s`);
    $(".sparkle-field").append(sparkle);
    window.setTimeout(() => sparkle.remove(), 17000);
    return;
  }
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

/* ---------- Lightbox (Galeri & Potret) ---------- */

const lightbox = $("#lightbox");
const lightboxImg = $(".lightbox-img", lightbox);
const lightboxPrev = $(".lightbox-prev", lightbox);
const lightboxNext = $(".lightbox-next", lightbox);
const lightboxCount = $(".lightbox-count", lightbox);
let lightboxGroup = [];
let lightboxIndex = 0;
let lightboxTouchX = null;

function showLightboxImage(index) {
  lightboxIndex = (index + lightboxGroup.length) % lightboxGroup.length;
  const source = lightboxGroup[lightboxIndex];
  lightboxImg.src = source.currentSrc || source.src;
  lightboxImg.alt = source.alt;
  lightboxCount.textContent = lightboxGroup.length > 1 ? `${lightboxIndex + 1} / ${lightboxGroup.length}` : "";
}

function openLightbox(image) {
  lightboxGroup = $$(`[data-lightbox="${image.dataset.lightbox}"]`);
  const multiple = lightboxGroup.length > 1;
  lightboxPrev.hidden = !multiple;
  lightboxNext.hidden = !multiple;
  showLightboxImage(lightboxGroup.indexOf(image));
  lightbox.hidden = false;
  $(".lightbox-close", lightbox).focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.removeAttribute("src");
}

$$("[data-lightbox]").forEach((image) => {
  image.addEventListener("click", () => openLightbox(image));
});

lightboxPrev.addEventListener("click", (event) => {
  event.stopPropagation();
  showLightboxImage(lightboxIndex - 1);
});
lightboxNext.addEventListener("click", (event) => {
  event.stopPropagation();
  showLightboxImage(lightboxIndex + 1);
});
$(".lightbox-close", lightbox).addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
lightbox.addEventListener("touchstart", (event) => {
  lightboxTouchX = event.touches[0].clientX;
}, { passive: true });
lightbox.addEventListener("touchend", (event) => {
  if (lightboxTouchX === null || lightboxGroup.length < 2) return;
  const deltaX = event.changedTouches[0].clientX - lightboxTouchX;
  lightboxTouchX = null;
  if (Math.abs(deltaX) > 40) showLightboxImage(lightboxIndex + (deltaX < 0 ? 1 : -1));
});
window.addEventListener("keydown", (event) => {
  if (lightbox.hidden) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft" && lightboxGroup.length > 1) showLightboxImage(lightboxIndex - 1);
  if (event.key === "ArrowRight" && lightboxGroup.length > 1) showLightboxImage(lightboxIndex + 1);
});

// Runs last so everything the card uses on open (sparkles, music) is already defined.
if (params.get("open") === "1") {
  unlockCard();
}
