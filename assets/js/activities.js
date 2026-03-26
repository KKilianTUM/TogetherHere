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

let activeCard = null;

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

  mTitle.textContent = card.dataset.title || "Activity";
  mDesc.textContent  = card.dataset.desc || "";
  mImg.src           = card.dataset.img || card.querySelector("img")?.src || "";

  const meet = (card.dataset.meet || "").trim();
  mLocVal.textContent = meet ? `Meet: ${meet}` : (card.dataset.location || "");

  const dt = (card.dataset.datetime || "").trim();
  mDateVal.textContent = formatDateNice(dt);

  mInit.innerHTML = `<b>Host:</b> ${(card.dataset.initiator || "").trim()}`;

  renderModalParticipants(card);

  mReq.textContent = (card.dataset.requirements || "None.").trim() || "None.";

  backdrop.style.display = "flex";
  document.body.style.overflow = "hidden";
  closeBtn.focus();
}

function closeModal(){
  backdrop.style.display = "none";
  document.body.style.overflow = "";
  activeCard = null;
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

  if (isAppleDevice && isSafari) {
    const w = window.open(appleMapsUrl, "_blank");
    if (!w) window.open(appleMapsHttp, "_blank");
    return;
  }
  window.open(googleMapsUrl, "_blank");
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

// Render the counter UI on each card
document.querySelectorAll(".card").forEach(card => {
  const ui = card.querySelector("[data-count-ui]");
  if (ui) ui.textContent = formatCardCount(card);
});
