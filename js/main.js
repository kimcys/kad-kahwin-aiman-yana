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
const wishPrevPage = $("#wishPrevPage");
const wishNextPage = $("#wishNextPage");
const wishPageInfo = $("#wishPageInfo");
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
  $("#googleMaps").href = INVITATION.googleMapsUrl;
  $("#waze").href = INVITATION.wazeUrl;
}

setupCalendarLinks();
setupLocationLinks();

function getRsvpGuestCount(rsvp) {
  const guests = Number.parseInt(String(rsvp.guests ?? "0"), 10);
  return Number.isFinite(guests) && guests >= 0 ? guests : 0;
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

// $("#wishForm").addEventListener("submit", (event) => {
//   event.preventDefault();
//   const form = new FormData(event.currentTarget);
//   const name = String(form.get("name") || "").trim();
//   const message = String(form.get("message") || "").trim();
//   if (!name || !message) return;

//   const wishes = getStoredWishes();
//   wishes.push({ name, message });
//   setStoredWishes(wishes);
//   event.currentTarget.reset();
//   renderWishes();
//   closePanels();
// });

// renderWishes();

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
    name.textContent = wish.name;

    const message = document.createElement("p");
    message.textContent = wish.message;

    item.append(name, message);
    wishList.append(item);
  });

  wishList.classList.remove("is-changing");
}

function updateWishPaginationUI() {
  if (!wishPrevPage || !wishNextPage || !wishPageInfo) {
    return;
  }

  if (wishLoading && wishCountKnown) {
    wishPageInfo.textContent = `Halaman ${wishCurrentPage}/${wishTotalPages}`;
  } else if (wishLoading) {
    wishPageInfo.textContent = `Halaman ${wishCurrentPage}`;
  } else if (wishCountKnown) {
    wishPageInfo.textContent = `Halaman ${wishCurrentPage}/${wishTotalPages}`;
  } else {
    wishPageInfo.textContent = `Halaman ${wishCurrentPage}`;
  }

  wishPrevPage.disabled = wishLoading || wishCurrentPage <= 1;
  wishNextPage.disabled = wishLoading || (wishCountKnown ? wishCurrentPage >= wishTotalPages : !wishHasMorePages);
}

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
  updateWishPaginationUI();

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
    const wishes = snapshot.docs.map((doc) => ({
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
      updateWishPaginationUI();
    }
  }
}

if (wishPrevPage) {
  wishPrevPage.addEventListener("click", () => {
    if (wishCurrentPage > 1) {
      void loadWishPage(wishCurrentPage - 1);
    }
  });
}

if (wishNextPage) {
  wishNextPage.addEventListener("click", () => {
    void loadWishPage(wishCurrentPage + 1);
  });
}

void loadWishPage(1, { resetHistory: true });

async function loadRsvpGuestTotal() {
  try {
    const snapshot = await getDocs(rsvpsCollection);
    setRsvpGuestCount(sumRsvpGuests(snapshot));
  } catch (error) {
    console.error("Error loading RSVP guest total:", error);
    setRsvpGuestCount("-");
  }
}

void loadRsvpGuestTotal();

onSnapshot(
  rsvpsCollection,
  (snapshot) => {
    setRsvpGuestCount(sumRsvpGuests(snapshot));
  },
  (error) => {
    console.error("Error watching RSVPs:", error);
  }
);

$("#wishForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const formElement = event.currentTarget;
  const form = new FormData(formElement);

  const name = String(form.get("name") || "").trim();
  const message = String(form.get("message") || "").trim();

  if (!name || !message) return;

  const submitButton = formElement.querySelector("button[type='submit']");
  submitButton.disabled = true;

  try {
    await addDoc(wishesCollection, {
      name,
      message,
      createdAt: serverTimestamp()
    });

    await loadWishPage(1, { resetHistory: true });
    formElement.reset();
    closePanels();
  } catch (error) {
    console.error("Error sending wish:", error);
    alert("Maaf, ucapan tidak dapat dihantar. Sila cuba lagi.");
  } finally {
    submitButton.disabled = false;
  }
});

$("#rsvpForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const formElement = event.currentTarget;
  const form = new FormData(formElement);

  const rsvp = {
    name: String(form.get("name") || "").trim(),
    attendance: String(form.get("attendance") || ""),
    guests: Number.parseInt(String(form.get("guests") || "0"), 10),
    submittedAt: serverTimestamp()
  };

  if (!rsvp.name || !rsvp.attendance) return;

  const submitButton = formElement.querySelector("button[type='submit']");
  submitButton.disabled = true;

  $("#rsvpStatus").textContent = "Menghantar RSVP...";

  try {
    await addDoc(rsvpsCollection, rsvp);

    $("#rsvpStatus").textContent = `Terima kasih, ${rsvp.name}. RSVP anda telah dihantar.`;
    formElement.reset();
  } catch (error) {
    console.error("Error sending RSVP:", error);
    $("#rsvpStatus").textContent = "Maaf, RSVP tidak dapat dihantar. Sila cuba lagi.";
  } finally {
    submitButton.disabled = false;
  }
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
