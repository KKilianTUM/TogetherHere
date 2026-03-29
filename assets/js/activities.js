// Simple modal logic (prototype counter + modal)
const backdrop = document.getElementById("modalBackdrop");
const closeBtn = document.getElementById("modalClose");

const mTitle = document.getElementById("modalTitle");
const mDesc  = document.getElementById("modalDesc");

const mLocWrap = document.getElementById("modalLocation");
const mLocVal  = document.getElementById("modalLocationValue");

const mDateWrap = document.getElementById("modalDateTime");
const mDateVal  = document.getElementById("modalDateTimeValue");

const mInit = document.getElementById("modalInitiator");
const mCountText = document.getElementById("modalCountText");
const mPBar = document.getElementById("modalPBar");

const mReq = document.getElementById("modalReq");
const mImg  = document.getElementById("modalImg");
const modalContainer = backdrop?.querySelector(".modal");
const heroPlusBtn = document.getElementById("heroPlusBtn");
const headerPlusBtn = document.getElementById("headerPlusBtn");
const createForm = document.getElementById("activityCreateForm");
const creatorAnchor = document.getElementById("activityCreatorAnchor");
const createFormError = document.getElementById("createFormError");
const firstCategoryRow = document.querySelector(".category .slider-row");

let activeCard = null;
let lastFocusedElement = null;
let uploadedImageUrl = "";

function safeInt(v, fallback=0){
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function formatCardCount(card){
  const label = card.dataset.label || "Participants";
  const signed = safeInt(card.dataset.signed, 0);
  const needed = safeInt(card.dataset.needed, 0);
  if (needed <= 0) return `${label}: ${signed}`;
  return `${label}: ${signed} / ${needed}`;
}

function formatDateNice(isoLocal){
  const d = new Date(isoLocal);
  if (isNaN(d.getTime())) return "";
  const weekday = d.toLocaleDateString("en-GB", { weekday:"short" });
  const day = String(d.getDate()).padStart(2,"0");
  const month = d.toLocaleDateString("en-GB", { month:"short" });
  const time = d.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
  return `${weekday}, ${day} ${month} • ${time}`;
}

function renderModalParticipants(card){
  const signed = safeInt(card.dataset.signed, 0);
  const neededRaw = safeInt(card.dataset.needed, 0);
  const needed = Math.max(1, neededRaw || 1);
  const pct = Math.max(0, Math.min(100, (signed / needed) * 100));
  mCountText.textContent = neededRaw > 0 ? `${signed} / ${neededRaw}` : `${signed}`;
  mPBar.style.width = pct + "%";
}

function openModal(card){
  activeCard = card;
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  mTitle.textContent = card.dataset.title || "Activity";
  mDesc.textContent  = card.dataset.desc || "";
  mImg.src           = card.dataset.img || card.querySelector("img")?.src || "";

  const meet = (card.dataset.meet || "").trim();
  mLocVal.textContent = meet ? `Meet: ${meet}` : (card.dataset.location || "");

  const dt = (card.dataset.datetime || "").trim();
  mDateVal.textContent = formatDateNice(dt);

  mInit.replaceChildren();
  const hostLabel = document.createElement("b");
  hostLabel.textContent = "Host:";
  mInit.append(hostLabel, ` ${(card.dataset.initiator || "").trim()}`);

  renderModalParticipants(card);

  mReq.textContent = (card.dataset.requirements || "None.").trim() || "None.";

  backdrop.style.display = "flex";
  backdrop.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  closeBtn.focus({ preventScroll: true });
}

function closeModal(){
  backdrop.style.display = "none";
  backdrop.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  activeCard = null;
  if (lastFocusedElement) {
    lastFocusedElement.focus({ preventScroll: true });
    lastFocusedElement = null;
  }
}

// Calendar (.ics) download helper
function toICSDateLocal(dateObj){
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth()+1).padStart(2,"0");
  const d = String(dateObj.getDate()).padStart(2,"0");
  const hh = String(dateObj.getHours()).padStart(2,"0");
  const mm = String(dateObj.getMinutes()).padStart(2,"0");
  return `${y}${m}${d}T${hh}${mm}00`;
}

function downloadICS({ title, startISO, durationMin, location, description }){
  const start = new Date(startISO);
  if (isNaN(start.getTime())) return;

  const dur = Math.max(15, safeInt(durationMin, 60));
  const end = new Date(start.getTime() + dur * 60 * 1000);

  const dtStart = toICSDateLocal(start);
  const dtEnd   = toICSDateLocal(end);

  const safe = (s="") => String(s)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

  const ics =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TogetherHere//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${Date.now()}@togetherhere
DTSTAMP:${toICSDateLocal(new Date())}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${safe(title)}
LOCATION:${safe(location)}
DESCRIPTION:${safe(description)}
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "togetherhere-event.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function handleCalendarAdd(){
  if (!activeCard) return;
  downloadICS({
    title: activeCard.dataset.title || "TogetherHere activity",
    startISO: activeCard.dataset.datetime || "",
    durationMin: activeCard.dataset.duration || "60",
    location: `Meet: ${(activeCard.dataset.meet || "").trim()}`,
    description: activeCard.dataset.desc || ""
  });
}

function openMapsForActiveCard(){
  if (!activeCard) return;

  const q = (activeCard.dataset.maps || activeCard.dataset.meet || "").trim();
  if (!q) return;

  const encoded = encodeURIComponent(q);

  const isAppleDevice = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  const appleMapsUrl = `maps://?q=${encoded}`;
  const appleMapsHttp = `https://maps.apple.com/?q=${encoded}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  const safeOpenExternal = (url) => {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win) win.opener = null;
    return win;
  };

  if (isAppleDevice && isSafari) {
    const w = safeOpenExternal(appleMapsUrl);
    if (!w) safeOpenExternal(appleMapsHttp);
    return;
  }
  safeOpenExternal(googleMapsUrl);
}

function normalizeDateTimeInput(input){
  const raw = String(input || "").trim();
  if (!raw) return null;

  const compact = raw.replace(/\./g, ":").replace(/\s+/g, " ").trim();
  const lower = compact.toLowerCase();
  const weekdays = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const match = lower.match(/^next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)(?:\s+(\d{1,2}:\d{2}))?$/i);

  if (match){
    const dayIdx = weekdays.indexOf(match[1]);
    const now = new Date();
    const result = new Date(now);
    const delta = (dayIdx - now.getDay() + 7) % 7 || 7;
    result.setDate(now.getDate() + delta);

    if (match[2]){
      const [hh, mm] = match[2].split(":").map((x) => parseInt(x, 10));
      if (hh > 23 || mm > 59) return null;
      result.setHours(hh, mm, 0, 0);
    } else {
      result.setHours(12, 0, 0, 0);
    }
    return result;
  }

  const parsed = new Date(compact);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function openCreateForm(){
  if (!createForm || !heroPlusBtn) return;
  createForm.hidden = false;
  heroPlusBtn.setAttribute("aria-expanded", "true");
  const firstInput = createForm.querySelector("input[name='title']");
  if (firstInput instanceof HTMLElement) firstInput.focus({ preventScroll: false });
}

function getWordCount(text){
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function hasAtLeastTwoRealWords(text){
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const realWords = words.filter((word) => /\p{L}/u.test(word));
  return realWords.length >= 2;
}

function combineDateAndTimeInput(dateInput, timeInput){
  const dateRaw = String(dateInput || "").trim();
  const timeRaw = String(timeInput || "").trim();
  if (!dateRaw || !timeRaw) return null;
  const parsed = new Date(`${dateRaw}T${timeRaw}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function generateUniquePlaceholderImage(){
  const usedImages = new Set(
    Array.from(document.querySelectorAll(".card")).flatMap((card) => {
      const imgEl = card.querySelector("img");
      return [card.dataset.img, imgEl?.getAttribute("src")].filter(Boolean);
    })
  );

  let candidate = "";
  do {
    const hue = Math.floor(Math.random() * 360);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 280'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='hsl(${hue} 85% 78%)'/>
          <stop offset='100%' stop-color='hsl(${(hue + 50) % 360} 88% 56%)'/>
        </linearGradient>
      </defs>
      <path d='M0 26 Q0 0 26 0 H454 Q480 0 480 26 V280 H0 Z' fill='url(#g)'/>
      <circle cx='92' cy='74' r='34' fill='rgba(255,255,255,.32)'/>
      <path d='M30 230 L170 120 L250 198 L330 150 L450 230' stroke='rgba(255,255,255,.68)' stroke-width='16' fill='none' stroke-linecap='round' stroke-linejoin='round'/>
    </svg>`;
    candidate = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  } while (usedImages.has(candidate));

  return candidate;
}

function buildDateForCard(dateObj){
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  const hh = String(dateObj.getHours()).padStart(2, "0");
  const mm = String(dateObj.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function buildCardFromForm(formData, dateObj){
  if (!firstCategoryRow) return;
  const escapeHtml = (text) => String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const card = document.createElement("article");
  const title = formData.title.trim();
  const location = formData.location.trim();
  const description = formData.description.trim();
  const img = uploadedImageUrl || generateUniquePlaceholderImage();
  const dateISO = buildDateForCard(dateObj);
  const dateLabel = dateObj.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
  const timeLabel = dateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

  card.className = "card";
  card.dataset.title = title;
  card.dataset.meet = location;
  card.dataset.maps = location;
  card.dataset.datetime = dateISO;
  card.dataset.duration = "60";
  card.dataset.initiator = "Initiated by You";
  card.dataset.requirements = "None.";
  card.dataset.desc = description;
  card.dataset.img = img;
  card.dataset.label = "Participants";
  card.dataset.signed = "1";
  card.dataset.needed = String(formData.needed);
  const safeTitle = escapeHtml(title);
  const safeLocation = escapeHtml(location);
  const safeDescription = escapeHtml(description.slice(0, 80));
  card.innerHTML = `
    <img alt="User created activity" src="${img}" width="240" height="140" loading="lazy" decoding="async">
    <div class="card-body">
      <h3>${safeTitle}</h3>
      <p>${safeDescription}${description.length > 80 ? "…" : ""}</p>
      <div class="meta">
        <div class="meta-line"><span>Meet:</span><span>${safeLocation}</span></div>
        <div class="meta-line"><span>${dateLabel}</span><span class="dot-sep">•</span><span>${timeLabel}</span></div>
      </div>
      <div class="count" data-count-ui></div>
      <button class="more" type="button">More</button>
    </div>`;

  firstCategoryRow.prepend(card);
  const ui = card.querySelector("[data-count-ui]");
  if (ui) ui.textContent = formatCardCount(card);
}

// Events
document.addEventListener("click", (e) => {
  const moreBtn = e.target.closest(".more");
  if (moreBtn){
    const card = moreBtn.closest(".card");
    if (card) openModal(card);
  }
  if (e.target === backdrop) closeModal();
});

closeBtn.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && backdrop.style.display === "flex") closeModal();
  if (e.key !== "Tab" || backdrop.style.display !== "flex" || !modalContainer) return;

  const focusableSelectors = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ];
  const focusables = Array.from(modalContainer.querySelectorAll(focusableSelectors.join(",")))
    .filter((el) => el instanceof HTMLElement && !el.hasAttribute("hidden"));
  if (!focusables.length) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;

  if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
});

// Clickable Date/Time -> Calendar
mDateWrap.addEventListener("click", handleCalendarAdd);
mDateWrap.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    handleCalendarAdd();
  }
});

// Clickable Location -> Maps
mLocWrap.addEventListener("click", openMapsForActiveCard);
mLocWrap.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    openMapsForActiveCard();
  }
});

[heroPlusBtn, headerPlusBtn].forEach((button) => {
  if (!button) return;
  button.addEventListener("click", () => {
    openCreateForm();
    if (button === heroPlusBtn) {
      heroPlusBtn.classList.add("is-hidden");
      return;
    }
    quickScrollToCreator();
  });
});

function quickScrollToCreator() {
  if (!creatorAnchor) return;
  const startY = window.scrollY;
  const targetY = Math.max(
    0,
    creatorAnchor.getBoundingClientRect().top + window.scrollY - 72
  );
  const duration = 160;
  const startTime = performance.now();

  const step = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    window.scrollTo(0, startY + (targetY - startY) * eased);
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

if (creatorAnchor && headerPlusBtn) {
  const toggleHeaderPlus = () => {
    const markerBottom = creatorAnchor.getBoundingClientRect().bottom;
    headerPlusBtn.classList.toggle("is-visible", markerBottom < 0);
  };
  document.addEventListener("scroll", toggleHeaderPlus, { passive: true });
  toggleHeaderPlus();
}

if (createForm) {
  const imageInput = createForm.querySelector("input[name='image']");
  imageInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    uploadedImageUrl = file ? URL.createObjectURL(file) : "";
  });

  createForm.addEventListener("submit", (e) => {
    e.preventDefault();
    createFormError.textContent = "";
    const titleInput = createForm.querySelector("input[name='title']");
    const locationInput = createForm.querySelector("input[name='location']");
    const dateInput = createForm.querySelector("input[name='date']");
    const timeInput = createForm.querySelector("input[name='time']");
    const neededInput = createForm.querySelector("input[name='needed']");
    const descriptionInput = createForm.querySelector("textarea[name='description']");
    if (!titleInput || !locationInput || !dateInput || !timeInput || !neededInput || !descriptionInput) return;

    const formData = {
      title: titleInput.value,
      location: locationInput.value,
      date: dateInput.value,
      time: timeInput.value,
      needed: safeInt(neededInput.value, 0),
      description: descriptionInput.value
    };

    if (!formData.location) {
      createFormError.textContent = "Please add a location.";
      return;
    }
    if (!formData.date || !formData.time) {
      createFormError.textContent = "Please add date and time.";
      return;
    }

    const parsedDate = combineDateAndTimeInput(formData.date, formData.time);
    if (!parsedDate) {
      createFormError.textContent = "Please enter a valid date and a valid time.";
      return;
    }
    if (parsedDate.getTime() < Date.now()) {
      createFormError.textContent = "Event date/time cannot be in the past.";
      return;
    }
    if (!formData.title.trim()) {
      createFormError.textContent = "Please add a title.";
      return;
    }
    if (!hasAtLeastTwoRealWords(formData.title)) {
      createFormError.textContent = "Title must contain at least two real words.";
      return;
    }
    if (formData.needed < 1) {
      createFormError.textContent = "Please add at least 1 participant.";
      return;
    }
    if (getWordCount(formData.description) < 20) {
      createFormError.textContent = "Description must be at least 20 words.";
      return;
    }

    buildCardFromForm(formData, parsedDate);
    createForm.reset();
    uploadedImageUrl = "";
    createFormError.textContent = "";
    createForm.hidden = true;
    heroPlusBtn?.classList.remove("is-hidden");
    heroPlusBtn?.setAttribute("aria-expanded", "false");
  });
}

// Render the counter UI on each card
document.querySelectorAll(".card").forEach(card => {
  const ui = card.querySelector("[data-count-ui]");
  if (ui) ui.textContent = formatCardCount(card);
});
