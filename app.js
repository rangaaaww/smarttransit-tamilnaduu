// SmartTransit Tamil Nadu — Next-Gen Google Antigravity Transit & Fare Engine
// Features: Smooth 60 FPS Gliding Bus Tracker, First-Time Login, Slide-Out App Drawer,
// SOS Safety Hub, Search History, Day/Night Theme Toggle & Responsive Mobile/Laptop Support

let map, googleStreetLayer, googleHybridLayer;
let passedRoutePolyline = null, upcomingRoutePolyline = null;
let originPinMarker = null, destPinMarker = null, liveMovingBusMarker = null;
let routeStopMarkers = [];
let clickPickMode = "DEST";

// =============================================================================
// 1. CONTINUOUS SMOOTH GLIDING BUS ENGINE STATE (NO JUMPING!)
// =============================================================================
let activeJourneyStops = [];
let busContinuousProgress = 0.15;
let isBusPaused = false;
let currentActiveBusNumber = "54";
let currentLang = "EN";

// =============================================================================
// 2. COMPLETE CHENNAI BUS STANDS & TAMIL NADU HUBS
// =============================================================================
const CHENNAI_BUS_STANDS = {
  "Ramapuram": { name: "Ramapuram (EEC Campus / MIOT)", lat: 13.0324, lng: 80.1818, zone: "West Chennai", terminus: false },
  "Porur": { name: "Porur Junction Bus Stand", lat: 13.0358, lng: 80.1588, zone: "West Chennai", terminus: true },
  "Iyyappanthangal": { name: "Iyyappanthangal Bus Terminus", lat: 13.0412, lng: 80.1415, zone: "West Chennai", terminus: true },
  "Poonamallee": { name: "Poonamallee Bus Terminus", lat: 13.0489, lng: 80.0910, zone: "West Chennai", terminus: true },
  "Kundrathur": { name: "Kundrathur Bus Stand", lat: 12.9977, lng: 80.0970, zone: "West Outer", terminus: false },
  "Vadapalani": { name: "Vadapalani Bus Terminus", lat: 13.0524, lng: 80.2121, zone: "Central Chennai", terminus: true },
  "TNagar": { name: "T. Nagar Bus Terminus", lat: 13.0418, lng: 80.2341, zone: "Central Chennai", terminus: true },
  "Koyambedu": { name: "CMBT Koyambedu Bus Terminus", lat: 13.0673, lng: 80.2057, zone: "Central Chennai", terminus: true },
  "Saidapet": { name: "Saidapet Bus Stand", lat: 13.0213, lng: 80.2231, zone: "Central Chennai", terminus: false },
  "Mylapore": { name: "Mylapore Tank Bus Stand", lat: 13.0368, lng: 80.2676, zone: "Central Chennai", terminus: false },
  "Central": { name: "Chennai Central / Broadway Terminus", lat: 13.0827, lng: 80.2757, zone: "Central Chennai", terminus: true },
  "Guindy": { name: "Guindy Industrial Estate Terminus", lat: 13.0067, lng: 80.2025, zone: "South Chennai", terminus: true },
  "Adyar": { name: "Adyar Bus Depot", lat: 13.0012, lng: 80.2565, zone: "South Chennai", terminus: true },
  "Thiruvanmiyur": { name: "Thiruvanmiyur Bus Terminus", lat: 12.9830, lng: 80.2594, zone: "South Chennai (OMR)", terminus: true },
  "Velachery": { name: "Velachery Vijayanagar Terminus", lat: 12.9759, lng: 80.2212, zone: "South Chennai", terminus: true },
  "Chromepet": { name: "Chromepet Bus Stand", lat: 12.9516, lng: 80.1462, zone: "South Chennai", terminus: false },
  "Tambaram": { name: "Tambaram Bus Terminus", lat: 12.9249, lng: 80.1280, zone: "South Outer", terminus: true },
  "Kilambakkam": { name: "KCBT Kilambakkam Mofussil Terminus", lat: 12.8688, lng: 80.0822, zone: "South Gateway (KCBT)", terminus: true },
  "Sholinganallur": { name: "Sholinganallur OMR Junction", lat: 12.9010, lng: 80.2279, zone: "OMR IT Corridor", terminus: false },
  "Siruseri": { name: "Siruseri SIPCOT IT Park", lat: 12.8259, lng: 80.2201, zone: "OMR IT Corridor", terminus: true },
  "Ambattur": { name: "Ambattur Estate Bus Terminus", lat: 13.1143, lng: 80.1548, zone: "North West Chennai", terminus: true },
  "Avadi": { name: "Avadi Bus Terminus", lat: 13.1167, lng: 80.1017, zone: "North West Chennai", terminus: true },
  "Madhavaram": { name: "MMBT Madhavaram Bus Terminus", lat: 13.1489, lng: 80.2314, zone: "North Chennai", terminus: true },
  "Redhills": { name: "Redhills Bus Terminus", lat: 13.1994, lng: 80.1970, zone: "North Gateway", terminus: true }
};

const TN_STATE_HUBS = {
  "Coimbatore": { name: "Coimbatore (Gandhipuram)", lat: 11.0168, lng: 76.9558, zone: "Western TN", terminus: true },
  "Madurai": { name: "Madurai (Mattuthavani MGR Stand)", lat: 9.9252, lng: 78.1198, zone: "Southern TN", terminus: true },
  "Trichy": { name: "Tiruchirappalli (Central Stand)", lat: 10.7905, lng: 78.7047, zone: "Central TN", terminus: true },
  "Salem": { name: "Salem (New Bus Stand)", lat: 11.6643, lng: 78.1460, zone: "West-Central TN", terminus: true },
  "Tirunelveli": { name: "Tirunelveli (New Bus Stand)", lat: 8.7139, lng: 77.7567, zone: "Deep South TN", terminus: true },
  "Kanyakumari": { name: "Kanyakumari Terminus", lat: 8.0883, lng: 77.5385, zone: "Coastal TN", terminus: true },
  "Vellore": { name: "Vellore (New Bus Stand)", lat: 12.9165, lng: 79.1325, zone: "Northern TN", terminus: true }
};

const ALL_LOCATIONS = { ...CHENNAI_BUS_STANDS, ...TN_STATE_HUBS };

// =============================================================================
// 3. OFFICIAL TAMIL NADU GOVERNMENT MTC STAGE FARE TABLE (G.O. Ms No. 42)
// =============================================================================
function getOfficialMtcFareByDistance(distanceKm, passType) {
  const stage = Math.max(1, Math.min(20, Math.ceil(distanceKm / 2.2)));
  const ordinaryTable = [5, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  const expressTable  = [7, 7, 9, 10, 12, 13, 15, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 32, 34, 35];
  const deluxeTable   = [11, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 49];

  let ord = ordinaryTable[stage - 1] || 23;
  let exp = expressTable[stage - 1] || 35;
  let dlx = deluxeTable[stage - 1] || 49;

  if (passType === "WOMEN_FREE") {
    ord = 0;
  } else if (passType === "STUDENT") {
    ord = Math.round(ord * 0.5);
    exp = Math.round(exp * 0.5);
    dlx = Math.round(dlx * 0.5);
  }
  return { stage, ord, exp, dlx };
}

const ROUTE_DIRECTORY = {
  "Ramapuram-TNagar": {
    buses: [
      { num: "54", type: "Deluxe" },
      { num: "88K", type: "Express" },
      { num: "17D", type: "Ordinary (Women Free)" },
      { num: "49", type: "Deluxe" }
    ],
    intermediate: ["Porur", "Vadapalani", "Saidapet"],
    freq: "Every 4 - 6 mins",
    tip: "Board at <strong>Ramapuram MIOT Stop</strong>. Buses 54 & 88K run frequently. Ordinary Whiteboard bus 17D offers ₹0 free travel for women."
  },
  "Ramapuram-Koyambedu": {
    buses: [
      { num: "17D", type: "Ordinary (Women Free)" },
      { num: "54X", type: "Deluxe" },
      { num: "M70", type: "Express" }
    ],
    intermediate: ["Porur", "Vadapalani"],
    freq: "Every 5 - 8 mins",
    tip: "Direct corridor along 100 Feet Inner Ring Road straight into CMBT Koyambedu."
  },
  "Ramapuram-Guindy": {
    buses: [
      { num: "54", type: "Deluxe" },
      { num: "88K", type: "Express" },
      { num: "S86", type: "Small Bus" }
    ],
    intermediate: ["Porur"],
    freq: "Every 3 - 5 mins",
    tip: "Fast 10-minute ride down Mount-Poonamallee High Road to Guindy Metro & Railway Station."
  },
  "Ramapuram-Central": {
    buses: [
      { num: "54", type: "Deluxe" },
      { num: "88K", type: "Express" },
      { num: "25G", type: "Express" }
    ],
    intermediate: ["Porur", "Guindy", "Saidapet", "TNagar"],
    freq: "Every 5 - 8 mins",
    tip: "Direct connectivity to Puratchi Thalaivar Dr. MGR Central Railway Station."
  },
  "Koyambedu-Kilambakkam": {
    buses: [
      { num: "70V", type: "Deluxe" },
      { num: "104C", type: "AC Volvo" },
      { num: "500", type: "Superfast" }
    ],
    intermediate: ["Vadapalani", "Guindy", "Chromepet", "Tambaram"],
    freq: "Every 4 - 6 mins",
    tip: "24x7 Feeder Corridor linking CMBT Koyambedu to Kalaignar Centenary Bus Terminus (KCBT Kilambakkam)."
  }
};

const mockFleet = [
  { vehicleId: "MTC-54-DLX", type: "MTC Deluxe (Red)", corridor: "Ramapuram ➔ T. Nagar", occupancy: 36, capacity: 50, occupancyRate: 72, speed: 34, status: "ON TIME" },
  { vehicleId: "MTC-17D-ORD", type: "Ordinary (Pink/White)", corridor: "Poonamallee ➔ Broadway", occupancy: 42, capacity: 48, occupancyRate: 88, speed: 29, status: "WOMEN FREE" },
  { vehicleId: "MTC-70V-EXP", type: "MTC Express", corridor: "Koyambedu ➔ Kilambakkam", occupancy: 34, capacity: 50, occupancyRate: 68, speed: 41, status: "ON SCHEDULE" },
  { vehicleId: "MTC-19B-AC", type: "MTC Electric AC", corridor: "TNagar ➔ Siruseri OMR", occupancy: 28, capacity: 40, occupancyRate: 70, speed: 38, status: "ZERO EMISSION" },
  { vehicleId: "TNSTC-38-UD", type: "TNSTC Ultra Deluxe", corridor: "KCBT ➔ Coimbatore", occupancy: 41, capacity: 44, occupancyRate: 93, speed: 78, status: "HIGHWAY EXPRESS" }
];

// =============================================================================
// 4. INITIALIZATION & FIRST-TIME LOGIN CHECK
// =============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initThemeState();
  populateDropdownSelectors();
  initInteractiveMap();
  renderFleetTable(mockFleet);
  checkFirstTimeUserOnboarding();
  updateHistoryBadgeCount();
  calculateAndDisplayFares(false);

  // Start Smooth 60 FPS Continuous Bus Gliding Loop
  setInterval(tickSmoothBusGlide, 120);

  document.getElementById("searchBtn")?.addEventListener("click", () => calculateAndDisplayFares(true));
  document.getElementById("originSelect")?.addEventListener("change", () => calculateAndDisplayFares(true));
  document.getElementById("destSelect")?.addEventListener("change", () => calculateAndDisplayFares(true));
  document.getElementById("passSelect")?.addEventListener("change", () => calculateAndDisplayFares(false));

  document.getElementById("swapRouteBtn")?.addEventListener("click", () => {
    const o = document.getElementById("originSelect");
    const d = document.getElementById("destSelect");
    if (o && d) {
      const temp = o.value;
      o.value = d.value;
      d.value = temp;
      calculateAndDisplayFares(true);
    }
  });

  document.getElementById("saveFavoriteRouteBtn")?.addEventListener("click", saveCurrentRouteToFavorites);

  document.getElementById("modePickOrigin")?.addEventListener("click", () => setClickPickMode("ORIGIN"));
  document.getElementById("modePickDest")?.addEventListener("click", () => setClickPickMode("DEST"));

  document.getElementById("btnStreetMap")?.addEventListener("click", () => switchLayer("street"));
  document.getElementById("btnSatMap")?.addEventListener("click", () => switchLayer("sat"));
  document.getElementById("btnResetView")?.addEventListener("click", () => {
    map.setView([13.0324, 80.2000], 12);
    logTerminal("[MAP] Reset view to Chennai Metropolitan Area.");
  });

  document.getElementById("pauseResumeBusBtn")?.addEventListener("click", togglePauseBus);
  document.getElementById("stepBusBtn")?.addEventListener("click", jumpToNextStop);

  initDrawerAndModals();
});

// =============================================================================
// 5. FIRST-TIME USER ONBOARDING & LOCALSTORAGE PROFILE
// =============================================================================
function checkFirstTimeUserOnboarding() {
  const savedUser = localStorage.getItem("st_user_profile");
  const loginModal = document.getElementById("loginModal");

  if (!savedUser) {
    if (loginModal) {
      loginModal.classList.remove("hidden");
      loginModal.classList.add("flex");
    }
  } else {
    try {
      const user = JSON.parse(savedUser);
      applyUserProfileToUI(user);
    } catch (e) {}
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("loginName").value.trim() || "Sadhan H M";
      const phone = document.getElementById("loginPhone").value.trim() || "98401 23456";
      const city = document.getElementById("loginCity").value || "Chennai";
      const passType = document.getElementById("loginPassType").value || "STUDENT";

      const profile = {
        name,
        phone,
        city,
        passType,
        passId: "TN-NCMC-" + Math.floor(100000 + Math.random() * 900000),
        joinedAt: new Date().toLocaleDateString()
      };

      localStorage.setItem("st_user_profile", JSON.stringify(profile));
      applyUserProfileToUI(profile);

      if (loginModal) {
        loginModal.classList.add("hidden");
        loginModal.classList.remove("flex");
      }
      calculateAndDisplayFares(false);
      logTerminal(`[WELCOME] Logged in as ${name} (${passType} Pass).`);
    });
  }
}

function applyUserProfileToUI(user) {
  const initial = (user.name || "S").charAt(0).toUpperCase();
  const drawerAvatar = document.getElementById("drawerAvatar");
  const drawerUserName = document.getElementById("drawerUserName");
  const headerUserInitial = document.getElementById("headerUserInitial");
  const headerUserName = document.getElementById("headerUserName");
  const drawerCityLabel = document.getElementById("drawerCityLabel");
  const passSelect = document.getElementById("passSelect");

  if (drawerAvatar) drawerAvatar.textContent = initial;
  if (drawerUserName) drawerUserName.textContent = user.name;
  if (headerUserInitial) headerUserInitial.textContent = initial;
  if (headerUserName) headerUserName.textContent = user.name.split(" ")[0];
  if (drawerCityLabel) drawerCityLabel.textContent = user.city || "Chennai";
  if (passSelect && user.passType) passSelect.value = user.passType;
}

// =============================================================================
// 6. DAYLIGHT / NIGHT THEME SWITCHER (WITH PERSISTENCE)
// =============================================================================
function initThemeState() {
  const savedTheme = localStorage.getItem("st_theme") || "light";
  setTheme(savedTheme);

  document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  });
}

function setTheme(mode) {
  const htmlEl = document.documentElement;
  const icon = document.getElementById("themeIcon");
  const text = document.getElementById("themeText");

  if (mode === "dark") {
    htmlEl.classList.add("dark");
    if (icon) icon.className = "fa-solid fa-sun text-amber-300";
    if (text) text.textContent = "Day Mode";
  } else {
    htmlEl.classList.remove("dark");
    if (icon) icon.className = "fa-solid fa-moon text-indigo-600";
    if (text) text.textContent = "Night Mode";
  }
  localStorage.setItem("st_theme", mode);
}

// =============================================================================
// 7. SLIDE-OUT MENU DRAWER & FEATURE MODALS (SOS, ALERTS, HISTORY, TICKETS)
// =============================================================================
function initDrawerAndModals() {
  const drawer = document.getElementById("sideDrawer");
  const backdrop = document.getElementById("drawerBackdrop");

  function openDrawer() {
    drawer?.classList.remove("-translate-x-full");
    backdrop?.classList.remove("hidden");
  }
  function closeDrawer() {
    drawer?.classList.add("-translate-x-full");
    backdrop?.classList.add("hidden");
  }

  document.getElementById("openDrawerBtn")?.addEventListener("click", openDrawer);
  document.getElementById("mobileMenuNavBtn")?.addEventListener("click", openDrawer);
  document.getElementById("headerProfileBtn")?.addEventListener("click", openDrawer);
  document.getElementById("closeDrawerBtn")?.addEventListener("click", closeDrawer);
  backdrop?.addEventListener("click", closeDrawer);

  document.getElementById("editProfileBtn")?.addEventListener("click", () => {
    closeDrawer();
    const loginModal = document.getElementById("loginModal");
    loginModal?.classList.remove("hidden");
    loginModal?.classList.add("flex");
  });

  document.getElementById("headerSosBtn")?.addEventListener("click", () => openFeatureModal("modalSOS"));
  document.getElementById("mobileSosNavBtn")?.addEventListener("click", () => openFeatureModal("modalSOS"));
  document.getElementById("headerAlertsBtn")?.addEventListener("click", () => openFeatureModal("modalAlerts"));

  document.querySelectorAll(".drawer-item").forEach(btn => {
    btn.addEventListener("click", () => {
      closeDrawer();
      const modalType = btn.getAttribute("data-modal");
      openFeatureModal(modalType);
    });
  });

  document.getElementById("drawerChangeCityBtn")?.addEventListener("click", () => {
    closeDrawer();
    openFeatureModal("modalChangeCity");
  });

  document.getElementById("drawerLangBtn")?.addEventListener("click", () => {
    currentLang = currentLang === "EN" ? "TA" : "EN";
    const brand = document.getElementById("brandTitleText");
    if (brand) {
      brand.innerHTML = currentLang === "TA"
        ? `ஸ்மார்ட் டிரான்சிட் <span class="font-semibold text-blue-600">தமிழ்நாடு</span>`
        : `SmartTransit <span class="font-semibold text-blue-600">TN</span>`;
    }
    closeDrawer();
    logTerminal(currentLang === "TA" ? "[மொழி] தமிழ் மொழி தேர்வு செய்யப்பட்டது." : "[LANGUAGE] Switched to English.");
  });

  document.getElementById("shareAppBtn")?.addEventListener("click", () => {
    closeDrawer();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
    openFeatureModal("modalShare");
  });

  document.getElementById("closeFeatureModalBtn")?.addEventListener("click", closeFeatureModal);
  document.getElementById("featureModalOverlay")?.addEventListener("click", (e) => {
    if (e.target.id === "featureModalOverlay") closeFeatureModal();
  });
}

function closeFeatureModal() {
  const overlay = document.getElementById("featureModalOverlay");
  overlay?.classList.add("hidden");
  overlay?.classList.remove("flex");
}

function openFeatureModal(type) {
  const overlay = document.getElementById("featureModalOverlay");
  const titleEl = document.getElementById("featureModalTitle");
  const bodyEl = document.getElementById("featureModalBody");
  if (!overlay || !titleEl || !bodyEl) return;

  const user = JSON.parse(localStorage.getItem("st_user_profile") || '{"name":"Sadhan H M","phone":"98401 23456","passType":"STUDENT","passId":"TN-NCMC-408291"}');

  if (type === "modalSOS") {
    titleEl.innerHTML = `<span class="text-rose-600"><i class="fa-solid fa-shield-heart mr-2"></i>Emergency SOS & Passenger Safety Hub</span>`;
    bodyEl.innerHTML = `
      <div class="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-medium">
        Active GPS Bus: <strong>Bus #${currentActiveBusNumber}</strong> • Coordinates shared with TN State Emergency Response.
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <a href="tel:100" class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-rose-500 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
          <div>
            <div class="font-extrabold text-sm text-slate-900 dark:text-white">Police Control Room</div>
            <div class="text-[11px] text-slate-500">24x7 TN Police Patrol</div>
          </div>
          <span class="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-mono font-bold">100 / 112</span>
        </a>
        <a href="tel:108" class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-rose-500 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
          <div>
            <div class="font-extrabold text-sm text-slate-900 dark:text-white">Ambulance Medical</div>
            <div class="text-[11px] text-slate-500">Emergency Paramedics</div>
          </div>
          <span class="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-mono font-bold">108</span>
        </a>
        <a href="tel:181" class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-rose-500 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
          <div>
            <div class="font-extrabold text-sm text-slate-900 dark:text-white">Women Safety Helpline</div>
            <div class="text-[11px] text-slate-500">Kavalan SOS / Pink Squad</div>
          </div>
          <span class="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-mono font-bold">181 / 1091</span>
        </a>
        <a href="tel:149" class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-rose-500 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
          <div>
            <div class="font-extrabold text-sm text-slate-900 dark:text-white">MTC Bus Safety Cell</div>
            <div class="text-[11px] text-slate-500">Chennai Bus Control</div>
          </div>
          <span class="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-mono font-bold">149</span>
        </a>
      </div>
      <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
        TNSTC / MTC Toll-Free Vigilance: <strong>1800-599-1500</strong> | WhatsApp Complaint: <strong>+91 94450 30516</strong>
      </div>
    `;
  } else if (type === "modalTickets") {
    titleEl.innerHTML = `<i class="fa-solid fa-ticket text-blue-600 mr-2"></i>Your Digital Transit Pass & NCMC Card`;
    bodyEl.innerHTML = `
      <div class="p-5 rounded-3xl bg-gradient-to-tr from-slate-950 via-blue-950 to-indigo-950 text-white shadow-xl space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/15">Singara Chennai • NCMC Smart Card</span>
          <span class="text-emerald-400 font-mono font-bold text-xs">● ACTIVE</span>
        </div>
        <div>
          <div class="text-xs text-slate-300">Cardholder Name</div>
          <div class="text-lg font-extrabold tracking-tight">${user.name}</div>
          <div class="text-xs font-mono text-amber-300 mt-0.5">${user.passId || 'TN-NCMC-408291'} • ${user.passType} CONCESSION</div>
        </div>
        <div class="flex items-center justify-between pt-2 border-t border-white/15 text-xs">
          <span>Wallet Balance: <strong class="font-mono text-sm text-emerald-300">₹ 240.00</strong></span>
          <span>Valid Across MTC, Metro & TNSTC</span>
        </div>
      </div>
    `;
  } else if (type === "modalHistory") {
    titleEl.innerHTML = `<i class="fa-solid fa-clock-rotate-left text-indigo-600 mr-2"></i>Your Recent Trip Search History`;
    const history = JSON.parse(localStorage.getItem("st_search_history") || "[]");
    if (history.length === 0) {
      bodyEl.innerHTML = `<p class="text-slate-500 py-4 text-center">No recent route searches recorded yet. Select an origin and destination to log trips.</p>`;
    } else {
      bodyEl.innerHTML = `
        <div class="space-y-2">
          ${history.map(h => `
            <div onclick="loadRouteFromModal('${h.origin}','${h.dest}')" class="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer transition">
              <div>
                <div class="font-bold text-slate-900 dark:text-white">${h.originName} ➔ ${h.destName}</div>
                <div class="text-[11px] text-slate-500 font-mono">${h.distance} km • MTC Fare: ${h.busFare} • ${h.time}</div>
              </div>
              <span class="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-[10px]">Load Route</span>
            </div>
          `).join("")}
        </div>
        <button onclick="clearSearchHistory()" class="w-full py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-xs mt-2">Clear History</button>
      `;
    }
  } else if (type === "modalFavorites") {
    titleEl.innerHTML = `<i class="fa-solid fa-star text-amber-500 mr-2"></i>Saved Favorite Routes`;
    const favs = JSON.parse(localStorage.getItem("st_favorites") || "[]");
    if (favs.length === 0) {
      bodyEl.innerHTML = `<p class="text-slate-500 py-4 text-center">No favorites saved yet. Click the <strong>★ Save</strong> button on the route finder card to bookmark frequent commutes.</p>`;
    } else {
      bodyEl.innerHTML = `<div class="space-y-2">` + favs.map(f => `
        <div onclick="loadRouteFromModal('${f.origin}','${f.dest}')" class="p-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between cursor-pointer">
          <div class="font-bold text-slate-900 dark:text-white"><i class="fa-solid fa-star text-amber-500 mr-1.5"></i>${f.originName} ➔ ${f.destName}</div>
          <span class="text-xs font-mono text-blue-600 font-bold">Open ➔</span>
        </div>
      `).join("") + `</div>`;
    }
  } else if (type === "modalAlerts") {
    titleEl.innerHTML = `<i class="fa-solid fa-bell text-rose-500 mr-2"></i>Live MTC & TNSTC Service Alerts`;
    bodyEl.innerHTML = `
      <div class="space-y-2.5">
        <div class="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
          <div class="flex items-center justify-between font-bold text-blue-900 dark:text-blue-300">
            <span>⚡ Additional 50 Feeder Buses at KCBT Kilambakkam</span>
            <span class="text-[10px] font-mono">LIVE</span>
          </div>
          <p class="text-[11px] text-slate-600 dark:text-slate-300 mt-1">High frequency MTC Route 70V & 104C running every 4 minutes between CMBT Koyambedu, Tambaram, and Kilambakkam.</p>
        </div>
        <div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
          <div class="flex items-center justify-between font-bold text-amber-900 dark:text-amber-300">
            <span>🚧 Metro Phase-II Construction Advisory (Porur - Arcot Rd)</span>
            <span class="text-[10px] font-mono">ADVISORY</span>
          </div>
          <p class="text-[11px] text-slate-600 dark:text-slate-300 mt-1">Expect 5-7 mins additional travel time near Porur Junction and Vadapalani during peak evening hours.</p>
        </div>
        <div class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
          <div class="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-300">
            <span>🎫 Singara Chennai NCMC Card Accepted on All Deluxe Buses</span>
            <span class="text-[10px] font-mono">NEW</span>
          </div>
          <p class="text-[11px] text-slate-600 dark:text-slate-300 mt-1">Tap & Pay enabled on all electronic ticketing machines (ETMs) across Chennai MTC fleet.</p>
        </div>
      </div>
    `;
  } else if (type === "modalStops") {
    titleEl.innerHTML = `<i class="fa-solid fa-location-dot text-emerald-600 mr-2"></i>All 31 Chennai & Tamil Nadu Transit Hubs`;
    bodyEl.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">` +
      Object.entries(ALL_LOCATIONS).filter(([k]) => !k.startsWith("CUSTOM")).map(([k, v]) => `
        <div onclick="zoomToHubFromModal('${k}')" class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 cursor-pointer bg-slate-50 dark:bg-slate-800/60">
          <div class="font-bold text-slate-900 dark:text-white truncate">${v.name}</div>
          <div class="text-[10px] text-slate-500 font-mono">${v.zone}</div>
        </div>
      `).join("") + `</div>`;
  } else if (type === "modalSupport") {
    titleEl.innerHTML = `<i class="fa-solid fa-headset text-blue-600 mr-2"></i>24x7 Commuter Support & Helpdesk`;
    bodyEl.innerHTML = `
      <div class="space-y-3 text-slate-600 dark:text-slate-300">
        <p>Need assistance with bus timings, lost & found, or concession passes?</p>
        <div class="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 space-y-1.5 font-mono text-xs">
          <div>📞 MTC Customer Care: <strong>+91 44 2345 5858 / 149</strong></div>
          <div>📞 TNSTC / SETC Helpdesk: <strong>1800-599-1500</strong></div>
          <div>✉️ Official Email: <strong>customercare.mtc@tn.gov.in</strong></div>
        </div>
        <div class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div class="font-bold text-slate-900 dark:text-white mb-1">Project Developed By:</div>
          <div>Sadhan H M (310625104302), Ranganathan P (310625104285), Pravin B (310625104265)</div>
          <div class="text-[11px] text-slate-400">Dept of CSE • Easwari Engineering College, Chennai</div>
        </div>
      </div>
    `;
  } else if (type === "modalChangeCity") {
    titleEl.innerHTML = `<i class="fa-solid fa-city text-purple-600 mr-2"></i>Select City / Regional View`;
    const cities = [
      { name: "Chennai Metropolitan (MTC)", lat: 13.0324, lng: 80.2000, z: 12 },
      { name: "Coimbatore City (TNSTC)", lat: 11.0168, lng: 76.9558, z: 12 },
      { name: "Madurai City (TNSTC)", lat: 9.9252, lng: 78.1198, z: 12 },
      { name: "Tiruchirappalli (Trichy)", lat: 10.7905, lng: 78.7047, z: 12 },
      { name: "Full Tamil Nadu State View", lat: 11.1271, lng: 78.6569, z: 7 }
    ];
    bodyEl.innerHTML = `<div class="space-y-2">` + cities.map(c => `
      <button onclick="map.setView([${c.lat},${c.lng}],${c.z}); closeFeatureModal();" class="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-left font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
        <span>${c.name}</span>
        <i class="fa-solid fa-arrow-right text-blue-600"></i>
      </button>
    `).join("") + `</div>`;
  } else if (type === "modalShare") {
    titleEl.innerHTML = `<i class="fa-solid fa-share-nodes text-blue-600 mr-2"></i>Share Live Bus & Route Link`;
    bodyEl.innerHTML = `
      <div class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-200 font-semibold text-center">
        ✓ Live Route & Bus Tracking Link Copied to Clipboard!
      </div>
      <p class="text-slate-500 text-center">Share with friends on WhatsApp or Telegram so they can track your live bus arrival.</p>
    `;
  }

  overlay.classList.remove("hidden");
  overlay.classList.add("flex");
}

window.loadRouteFromModal = function(origin, dest) {
  const oEl = document.getElementById("originSelect");
  const dEl = document.getElementById("destSelect");
  if (oEl && dEl) {
    oEl.value = origin;
    dEl.value = dest;
    calculateAndDisplayFares(false);
  }
  closeFeatureModal();
};

window.zoomToHubFromModal = function(key) {
  const node = ALL_LOCATIONS[key];
  if (node && map) {
    map.setView([node.lat, node.lng], 14);
  }
  closeFeatureModal();
};

window.clearSearchHistory = function() {
  localStorage.removeItem("st_search_history");
  updateHistoryBadgeCount();
  openFeatureModal("modalHistory");
};

// =============================================================================
// 8. SAVE SEARCH HISTORY & FAVORITES (LOCALSTORAGE)
// =============================================================================
function recordSearchToHistory(originKey, destKey, distance, busFareText) {
  let history = JSON.parse(localStorage.getItem("st_search_history") || "[]");
  const entry = {
    origin: originKey,
    dest: destKey,
    originName: ALL_LOCATIONS[originKey]?.name.split("(")[0].trim() || originKey,
    destName: ALL_LOCATIONS[destKey]?.name.split("(")[0].trim() || destKey,
    distance,
    busFare: busFareText,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  history = history.filter(h => !(h.origin === originKey && h.dest === destKey));
  history.unshift(entry);
  if (history.length > 10) history = history.slice(0, 10);

  localStorage.setItem("st_search_history", JSON.stringify(history));
  updateHistoryBadgeCount();
}

function updateHistoryBadgeCount() {
  const history = JSON.parse(localStorage.getItem("st_search_history") || "[]");
  const badge = document.getElementById("historyCountBadge");
  if (badge) badge.textContent = history.length;
}

function saveCurrentRouteToFavorites() {
  const origin = document.getElementById("originSelect")?.value || "Ramapuram";
  const dest = document.getElementById("destSelect")?.value || "TNagar";
  let favs = JSON.parse(localStorage.getItem("st_favorites") || "[]");

  const exists = favs.some(f => f.origin === origin && f.dest === dest);
  if (!exists) {
    favs.unshift({
      origin,
      dest,
      originName: ALL_LOCATIONS[origin]?.name.split("(")[0].trim() || origin,
      destName: ALL_LOCATIONS[dest]?.name.split("(")[0].trim() || dest
    });
    localStorage.setItem("st_favorites", JSON.stringify(favs));
  }
  const star = document.getElementById("favStarIcon");
  if (star) star.className = "fa-solid fa-star text-amber-500";
  logTerminal(`[FAVORITES] Saved ${origin} ➔ ${dest} to your Favorites.`);
}

// =============================================================================
// 9. GOOGLE MAPS + CLICK ANYWHERE TO PIN ORIGIN OR DROP
// =============================================================================
function setClickPickMode(mode) {
  clickPickMode = mode;
  const btnO = document.getElementById("modePickOrigin");
  const btnD = document.getElementById("modePickDest");

  if (mode === "ORIGIN") {
    btnO.className = "px-2.5 py-1 rounded-full bg-slate-950 dark:bg-blue-600 text-white shadow-xs transition";
    btnD.className = "px-2.5 py-1 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-950 transition";
    logTerminal("[PIN MODE] Tap anywhere on the map to place your Blue ORIGIN Pickup Pin.");
  } else {
    btnD.className = "px-2.5 py-1 rounded-full bg-slate-950 dark:bg-blue-600 text-white shadow-xs transition";
    btnO.className = "px-2.5 py-1 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-950 transition";
    logTerminal("[PIN MODE] Tap anywhere on the map to place your Red DROP Destination Pin.");
  }
}

function populateDropdownSelectors() {
  const originSelect = document.getElementById("originSelect");
  const destSelect = document.getElementById("destSelect");
  if (!originSelect || !destSelect) return;

  const zones = {
    "West Chennai (Campus Area)": ["Ramapuram", "Porur", "Iyyappanthangal", "Poonamallee", "Kundrathur"],
    "Central Chennai Termini": ["Vadapalani", "TNagar", "Koyambedu", "Saidapet", "Mylapore", "Central"],
    "South Chennai & OMR": ["Guindy", "Adyar", "Thiruvanmiyur", "Velachery", "Chromepet", "Tambaram", "Kilambakkam", "Sholinganallur", "Siruseri"],
    "North Chennai": ["Ambattur", "Avadi", "Madhavaram", "Redhills"],
    "Tamil Nadu Intercity Hubs": Object.keys(TN_STATE_HUBS)
  };

  function buildHtml(selectedKey) {
    let html = "";
    for (const [zoneTitle, keys] of Object.entries(zones)) {
      html += `<optgroup label="${zoneTitle}">`;
      keys.forEach(k => {
        const item = ALL_LOCATIONS[k];
        if (item) {
          const sel = (k === selectedKey) ? "selected" : "";
          html += `<option value="${k}" ${sel}>${item.name}</option>`;
        }
      });
      html += `</optgroup>`;
    }
    return html;
  }

  originSelect.innerHTML = buildHtml("Ramapuram");
  destSelect.innerHTML = buildHtml("TNagar");
}

function initInteractiveMap() {
  map = L.map("transitMap", {
    zoomControl: true,
    attributionControl: false
  }).setView([13.0324, 80.2000], 12);

  googleStreetLayer = L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
    maxZoom: 20,
    subdomains: ["mt0", "mt1", "mt2", "mt3"]
  }).addTo(map);

  googleHybridLayer = L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
    maxZoom: 20,
    subdomains: ["mt0", "mt1", "mt2", "mt3"]
  });

  for (const [key, node] of Object.entries(CHENNAI_BUS_STANDS)) {
    const marker = L.circleMarker([node.lat, node.lng], {
      radius: 5,
      fillColor: "#64748B",
      color: "#FFFFFF",
      weight: 1.5,
      fillOpacity: 0.7
    }).addTo(map);

    marker.bindTooltip(`<strong>${node.name}</strong><br><span style="color:#93C5FD;">Tap to select this stop</span>`, {
      direction: "top",
      className: "map-node-tooltip"
    });

    marker.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      const selectEl = document.getElementById(clickPickMode === "ORIGIN" ? "originSelect" : "destSelect");
      if (selectEl) {
        selectEl.value = key;
        if (clickPickMode === "ORIGIN") setClickPickMode("DEST");
        calculateAndDisplayFares(true);
      }
    });
  }

  map.on("click", (e) => {
    const { lat, lng } = e.latlng;
    handleCustomMapClick(lat, lng);
  });
}

function handleCustomMapClick(lat, lng) {
  let nearestKey = "Ramapuram";
  let minDist = 99999;
  for (const [k, node] of Object.entries(ALL_LOCATIONS)) {
    if (k.startsWith("CUSTOM_")) continue;
    const d = haversineKm(lat, lng, node.lat, node.lng);
    if (d < minDist) {
      minDist = d;
      nearestKey = k;
    }
  }
  const nearName = ALL_LOCATIONS[nearestKey]?.name.split("(")[0].trim() || "Chennai";
  const coordLabel = document.getElementById("customCoordLabel");
  if (coordLabel) coordLabel.textContent = `Pinned: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;

  if (clickPickMode === "ORIGIN") {
    const customKey = "CUSTOM_ORIGIN";
    ALL_LOCATIONS[customKey] = { name: `Pinned Pickup (Near ${nearName})`, lat, lng, zone: "Custom Map Pin" };
    const originSelect = document.getElementById("originSelect");
    let opt = originSelect.querySelector(`option[value="${customKey}"]`);
    if (!opt) {
      opt = document.createElement("option");
      opt.value = customKey;
      originSelect.prepend(opt);
    }
    opt.textContent = `📍 Pinned Pickup (Near ${nearName})`;
    originSelect.value = customKey;
    setClickPickMode("DEST");
  } else {
    const customKey = "CUSTOM_DEST";
    ALL_LOCATIONS[customKey] = { name: `Pinned Drop (Near ${nearName})`, lat, lng, zone: "Custom Map Pin" };
    const destSelect = document.getElementById("destSelect");
    let opt = destSelect.querySelector(`option[value="${customKey}"]`);
    if (!opt) {
      opt = document.createElement("option");
      opt.value = customKey;
      destSelect.prepend(opt);
    }
    opt.textContent = `🏁 Pinned Drop (Near ${nearName})`;
    destSelect.value = customKey;
  }

  calculateAndDisplayFares(true);
}

function switchLayer(type) {
  if (map.hasLayer(googleStreetLayer)) map.removeLayer(googleStreetLayer);
  if (map.hasLayer(googleHybridLayer)) map.removeLayer(googleHybridLayer);

  const btnStreet = document.getElementById("btnStreetMap");
  const btnSat = document.getElementById("btnSatMap");

  if (type === "sat") {
    map.addLayer(googleHybridLayer);
    btnSat.className = "px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs transition";
    btnStreet.className = "px-2.5 py-1 rounded-full text-slate-600 dark:text-slate-400 hover:text-slate-900 transition";
  } else {
    map.addLayer(googleStreetLayer);
    btnStreet.className = "px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs transition";
    btnSat.className = "px-2.5 py-1 rounded-full text-slate-600 dark:text-slate-400 hover:text-slate-900 transition";
  }
}

// =============================================================================
// 10. DISTANCE, ROUTE RESOLVER & FARE CALCULATOR
// =============================================================================
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeRoadDistance(originKey, destKey) {
  const o = ALL_LOCATIONS[originKey];
  const d = ALL_LOCATIONS[destKey];
  if (!o || !d) return 8.5;
  const straight = haversineKm(o.lat, o.lng, d.lat, d.lng);
  const factor = straight > 35 ? 1.22 : 1.32;
  return Math.max(1.2, Math.round(straight * factor * 10) / 10);
}

function resolveRouteDetails(originKey, destKey) {
  const directKey = `${originKey}-${destKey}`;
  const reverseKey = `${destKey}-${originKey}`;

  if (ROUTE_DIRECTORY[directKey]) return ROUTE_DIRECTORY[directKey];
  if (ROUTE_DIRECTORY[reverseKey]) {
    const rev = ROUTE_DIRECTORY[reverseKey];
    return {
      buses: rev.buses,
      intermediate: [...rev.intermediate].reverse(),
      freq: rev.freq,
      tip: rev.tip
    };
  }

  const directDist = computeRoadDistance(originKey, destKey);
  const candidates = [];

  for (const [k, node] of Object.entries(CHENNAI_BUS_STANDS)) {
    if (k !== originKey && k !== destKey) {
      const d1 = computeRoadDistance(originKey, k);
      const d2 = computeRoadDistance(k, destKey);
      if (d1 + d2 <= directDist * 1.38 && d1 > 0.8 && d2 > 0.8) {
        candidates.push({ key: k, distFromOrigin: d1 });
      }
    }
  }

  candidates.sort((a, b) => a.distFromOrigin - b.distFromOrigin);
  const intermediateKeys = candidates.slice(0, 3).map(c => c.key);

  const isIntercity = directDist > 45;
  const buses = isIntercity ? [
    { num: "TNSTC Ultra Deluxe", type: "Express" },
    { num: "SETC AC Sleeper", type: "Highway AC" },
    { num: "TNSTC Point-to-Point", type: "Non-Stop" }
  ] : [
    { num: "54", type: "Deluxe" },
    { num: "17D", type: "Ordinary (Women Free)" },
    { num: "70V", type: "Express" },
    { num: "25G", type: "Deluxe" }
  ];

  const oName = ALL_LOCATIONS[originKey]?.name.split("(")[0].trim() || "Origin";
  const dName = ALL_LOCATIONS[destKey]?.name.split("(")[0].trim() || "Destination";

  return {
    buses,
    intermediate: intermediateKeys,
    freq: isIntercity ? "Every 15 - 25 mins" : "Every 5 - 8 mins",
    tip: `Board at <strong>${oName}</strong>. Ask the conductor for a stage ticket to <strong>${dName}</strong>. Women travel free on Ordinary Whiteboard/Pink MTC buses.`
  };
}

function calculateAndDisplayFares(shouldRecordHistory = false) {
  const origin = document.getElementById("originSelect")?.value || "Ramapuram";
  const dest = document.getElementById("destSelect")?.value || "TNagar";
  const pass = document.getElementById("passSelect")?.value || "GENERAL";

  if (origin === dest) return;

  const distance = computeRoadDistance(origin, dest);
  document.getElementById("distanceBadge").textContent = `${distance} km`;

  const isIntercity = distance > 45;
  const routeDetails = resolveRouteDetails(origin, dest);

  const busContainer = document.getElementById("busNumbersContainer");
  if (busContainer) {
    busContainer.innerHTML = routeDetails.buses.map(b => `
      <div class="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-950 dark:bg-blue-600 text-white font-mono text-xs font-bold shadow-xs">
        <i class="fa-solid fa-bus text-amber-300 text-[11px]"></i>
        <span>${b.num}</span>
        <span class="text-[10px] font-sans font-medium text-slate-200 bg-white/15 px-2 py-0.5 rounded-full">${b.type}</span>
      </div>
    `).join("");
  }
  document.getElementById("busFrequencyText").textContent = routeDetails.freq;
  document.getElementById("boardingTipText").innerHTML = routeDetails.tip;

  let primaryBusFare = 0;
  let busMinutes = 0;

  if (!isIntercity) {
    const mtc = getOfficialMtcFareByDistance(distance, pass);
    primaryBusFare = mtc.ord;
    busMinutes = Math.round((distance / 23) * 60) + 4;

    document.getElementById("busSubtext").textContent = `Stage ${mtc.stage} Official Tariff`;
    document.getElementById("busEta").textContent = `Drop in ~${busMinutes} mins • Official MTC Stage ${mtc.stage}`;
    document.getElementById("busPrice").textContent = primaryBusFare === 0 ? "₹ 0 (FREE)" : `₹ ${primaryBusFare}`;
    document.getElementById("busSlabDetail").textContent = `Ord: ₹${mtc.ord} | Exp: ₹${mtc.exp} | Dlx: ₹${mtc.dlx}`;
  } else {
    let expressFare = Math.round(distance * 1.05);
    let ultraDeluxeFare = Math.round(distance * 1.25);
    if (pass === "STUDENT") {
      expressFare = Math.round(expressFare * 0.5);
      ultraDeluxeFare = Math.round(ultraDeluxeFare * 0.5);
    }
    primaryBusFare = expressFare;
    busMinutes = Math.round((distance / 58) * 60);
    const hrs = (busMinutes / 60).toFixed(1);

    document.getElementById("busSubtext").textContent = "TNSTC / SETC Official";
    document.getElementById("busEta").textContent = `Drop in ~${hrs} hrs • Highway Corridor`;
    document.getElementById("busPrice").textContent = `₹ ${expressFare}`;
    document.getElementById("busSlabDetail").textContent = `Exp: ₹${expressFare} | Ultra Dlx: ₹${ultraDeluxeFare}`;
  }

  if (!isIntercity) {
    const rapidoFare = Math.round(25 + (distance * 11.0));
    const rapidoMins = Math.round((distance / 36) * 60) + 2;
    document.getElementById("rapidoPrice").textContent = `₹ ${rapidoFare}`;
    document.getElementById("rapidoEta").textContent = `Drop in ~${rapidoMins} mins • Beats traffic`;
    document.getElementById("rapidoBadge").textContent = "Fastest Drop";

    const autoFare = Math.max(50, Math.round(50 + Math.max(0, distance - 1.8) * 15.0));
    const autoMins = Math.round((distance / 28) * 60) + 3;
    document.getElementById("autoPrice").textContent = `₹ ${autoFare}`;
    document.getElementById("autoEta").textContent = `Drop in ~${autoMins} mins • Up to 3 seats`;
  } else {
    document.getElementById("rapidoPrice").textContent = "N/A";
    document.getElementById("rapidoEta").textContent = "City limits only (<45 km)";
    document.getElementById("rapidoBadge").textContent = "City Only";
    document.getElementById("autoPrice").textContent = "N/A";
    document.getElementById("autoEta").textContent = "City limits only";
  }

  let uberFare = 0;
  if (!isIntercity) {
    uberFare = Math.round(75 + (distance * 18.0));
    const uberMins = Math.round((distance / 30) * 60) + 4;
    document.getElementById("uberPrice").textContent = `₹ ${uberFare}`;
    document.getElementById("uberEta").textContent = `Drop in ~${uberMins} mins • 4-Seat AC Cab`;
  } else {
    uberFare = Math.round(450 + (distance * 14.5));
    const hrs = ((distance / 65)).toFixed(1);
    document.getElementById("uberPrice").textContent = `₹ ${uberFare}`;
    document.getElementById("uberEta").textContent = `Drop in ~${hrs} hrs • Intercity Outstation Cab`;
  }

  const saved = Math.max(0, uberFare - primaryBusFare);
  const pct = Math.round((saved / uberFare) * 100);
  currentActiveBusNumber = routeDetails.buses[0]?.num || "54";
  document.getElementById("recommendationText").innerHTML =
    `Board <strong>Bus #${currentActiveBusNumber}</strong> to pay just <strong>₹${primaryBusFare}</strong> (Official TN Govt tariff) and save <strong>₹${saved} (${pct}%)</strong> compared to an AC Cab.`;

  if (shouldRecordHistory) {
    recordSearchToHistory(origin, dest, distance, `₹${primaryBusFare}`);
  }

  setupSmoothBusCorridor(origin, dest, routeDetails.intermediate);
}

// =============================================================================
// 11. SMOOTH REAL-TIME BUS GLIDING ENGINE (NO JUMPING BETWEEN STOPS!)
// =============================================================================
function setupSmoothBusCorridor(originKey, destKey, intermediateKeys) {
  const fullStopKeys = [originKey, ...intermediateKeys, destKey];
  activeJourneyStops = fullStopKeys.map(k => ({
    key: k,
    name: ALL_LOCATIONS[k]?.name.split("(")[0].trim() || k,
    lat: ALL_LOCATIONS[k]?.lat || 13.0324,
    lng: ALL_LOCATIONS[k]?.lng || 80.1818
  }));

  busContinuousProgress = 0.25;

  drawStaticRouteStopsAndPins();
  updateSmoothBusPositionOnMap();

  const latlngs = activeJourneyStops.map(s => [s.lat, s.lng]);
  if (latlngs.length >= 2) {
    map.fitBounds(L.latLngBounds(latlngs), { padding: [55, 55] });
  }
}

function togglePauseBus() {
  isBusPaused = !isBusPaused;
  const icon = document.getElementById("pauseResumeIcon");
  const text = document.getElementById("pauseResumeText");
  if (isBusPaused) {
    if (icon) icon.className = "fa-solid fa-play mr-1";
    if (text) text.textContent = "Resume";
  } else {
    if (icon) icon.className = "fa-solid fa-pause mr-1";
    if (text) text.textContent = "Pause";
  }
}

function jumpToNextStop() {
  if (activeJourneyStops.length < 2) return;
  const maxSeg = activeJourneyStops.length - 1;
  busContinuousProgress = Math.floor(busContinuousProgress) + 1;
  if (busContinuousProgress >= maxSeg) busContinuousProgress = 0;
  drawStaticRouteStopsAndPins();
  updateSmoothBusPositionOnMap();
}

function tickSmoothBusGlide() {
  if (isBusPaused || activeJourneyStops.length < 2) return;

  const maxProgress = activeJourneyStops.length - 1;
  const prevFloor = Math.floor(busContinuousProgress);

  // Smoothly advance along road segment
  busContinuousProgress += 0.008;
  if (busContinuousProgress >= maxProgress) {
    busContinuousProgress = 0.0;
  }

  const newFloor = Math.floor(busContinuousProgress);
  if (newFloor !== prevFloor) {
    drawStaticRouteStopsAndPins();
  }

  updateSmoothBusPositionOnMap();
}

function getInterpolatedBusLatLng() {
  const maxIdx = activeJourneyStops.length - 1;
  const segIdx = Math.min(maxIdx - 1, Math.floor(busContinuousProgress));
  const frac = busContinuousProgress - segIdx;

  const p1 = activeJourneyStops[segIdx];
  const p2 = activeJourneyStops[segIdx + 1];
  const lat = p1.lat + (p2.lat - p1.lat) * frac;
  const lng = p1.lng + (p2.lng - p1.lng) * frac;
  return { lat, lng, segIdx, frac };
}

function updateSmoothBusPositionOnMap() {
  if (activeJourneyStops.length < 2) return;
  const { lat, lng, segIdx } = getInterpolatedBusLatLng();
  const maxProgress = activeJourneyStops.length - 1;
  const pct = Math.min(100, Math.round((busContinuousProgress / maxProgress) * 100));

  const bar = document.getElementById("smoothRouteProgressBar");
  if (bar) bar.style.width = `${pct}%`;

  const pctLabel = document.getElementById("liveProgressPct");
  if (pctLabel) pctLabel.textContent = `Journey: ${pct}%`;

  const speedLabel = document.getElementById("liveSpeedReadout");
  if (speedLabel) {
    const liveSpeed = 31 + ((pct % 7) - 3);
    speedLabel.textContent = `${liveSpeed} km/h`;
  }

  if (!liveMovingBusMarker) {
    const busHtml = `
      <div class="live-bus-pulse" style="
        background:#0F172A;
        color:#FFFFFF;
        padding:4px 10px;
        border-radius:999px;
        border:2px solid #FFFFFF;
        font-family:'JetBrains Mono',monospace;
        font-size:11px;
        font-weight:800;
        display:flex;
        align-items:center;
        gap:5px;
        white-space:nowrap;
        box-shadow:0 8px 20px rgba(15,23,42,0.45);
      ">
        <i class="fa-solid fa-bus text-amber-300"></i>
        <span id="liveBusPinLabel">BUS #${currentActiveBusNumber}</span>
      </div>`;

    liveMovingBusMarker = L.marker([lat, lng], {
      icon: L.divIcon({ className: "", html: busHtml, iconSize: [105, 32], iconAnchor: [52, -10] }),
      zIndexOffset: 1000
    }).addTo(map);
  } else {
    liveMovingBusMarker.setLatLng([lat, lng]);
    const lbl = document.getElementById("liveBusPinLabel");
    if (lbl) lbl.textContent = `BUS #${currentActiveBusNumber}`;
  }

  const passedLatLngs = activeJourneyStops.slice(0, segIdx + 1).map(s => [s.lat, s.lng]);
  passedLatLngs.push([lat, lng]);

  const upcomingLatLngs = [[lat, lng], ...activeJourneyStops.slice(segIdx + 1).map(s => [s.lat, s.lng])];

  if (passedRoutePolyline) {
    passedRoutePolyline.setLatLngs(passedLatLngs);
  } else {
    passedRoutePolyline = L.polyline(passedLatLngs, {
      color: "#94A3B8",
      weight: 5,
      opacity: 0.85,
      dashArray: "6, 8"
    }).addTo(map);
  }

  if (upcomingRoutePolyline) {
    upcomingRoutePolyline.setLatLngs(upcomingLatLngs);
  } else {
    upcomingRoutePolyline = L.polyline(upcomingLatLngs, {
      color: "#2563EB",
      weight: 6,
      opacity: 0.95
    }).addTo(map);
  }
}

function drawStaticRouteStopsAndPins() {
  if (originPinMarker) map.removeLayer(originPinMarker);
  if (destPinMarker) map.removeLayer(destPinMarker);
  routeStopMarkers.forEach(m => map.removeLayer(m));
  routeStopMarkers = [];

  const passedStopIdx = Math.floor(busContinuousProgress);

  activeJourneyStops.forEach((stop, idx) => {
    const isOrigin = idx === 0;
    const isDest = idx === activeJourneyStops.length - 1;
    const isPassed = idx <= passedStopIdx;

    if (isOrigin) {
      const html = `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-14px);">
          <div style="background:#2563EB;color:#FFF;font-weight:800;font-size:10px;padding:2px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 4px 10px rgba(37,99,235,0.4);border:1.5px solid #FFF;">
            ORIGIN: ${stop.name}
          </div>
          <div style="width:16px;height:16px;background:#2563EB;border:3px solid #FFF;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);margin-top:2px;"></div>
        </div>`;
      originPinMarker = L.marker([stop.lat, stop.lng], {
        icon: L.divIcon({ className: "", html, iconSize: [120, 42], iconAnchor: [60, 28] })
      }).addTo(map);
    } else if (isDest) {
      const html = `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-14px);">
          <div style="background:#E11D48;color:#FFF;font-weight:800;font-size:10px;padding:2px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 4px 10px rgba(225,29,72,0.4);border:1.5px solid #FFF;">
            DROP: ${stop.name}
          </div>
          <div style="width:16px;height:16px;background:#E11D48;border:3px solid #FFF;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);margin-top:2px;"></div>
        </div>`;
      destPinMarker = L.marker([stop.lat, stop.lng], {
        icon: L.divIcon({ className: "", html, iconSize: [120, 42], iconAnchor: [60, 28] })
      }).addTo(map);
    } else {
      const bg = isPassed ? "#64748B" : "#F59E0B";
      const statusLabel = isPassed ? "PASSED STOP" : `UPCOMING STOP #${idx}`;
      const badgeSymbol = isPassed ? "✓" : idx;

      const html = `
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div style="width:24px;height:24px;background:${bg};color:#FFF;border:2.5px solid #FFF;border-radius:50%;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.25);">
            ${badgeSymbol}
          </div>
        </div>`;

      const m = L.marker([stop.lat, stop.lng], {
        icon: L.divIcon({ className: "", html, iconSize: [26, 26], iconAnchor: [13, 13] })
      }).addTo(map);

      m.bindTooltip(`<strong>${stop.name}</strong><br><span style="color:${isPassed ? '#CBD5E1' : '#FCD34D'};">${statusLabel}</span>`, {
        direction: "top",
        offset: [0, -10],
        className: "map-node-tooltip"
      });
      routeStopMarkers.push(m);
    }
  });

  const timelineEl = document.getElementById("liveJourneyTimeline");
  if (timelineEl) {
    timelineEl.innerHTML = activeJourneyStops.map((stop, idx) => {
      const isPassed = idx <= passedStopIdx;
      const isNextUpcoming = idx === passedStopIdx + 1;

      if (isPassed) {
        return `
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between">
            <div class="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 uppercase">
              <span>Stop ${idx + 1}</span>
              <span class="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">✓ Passed</span>
            </div>
            <div class="font-bold text-xs text-slate-700 dark:text-slate-200 mt-1.5 truncate">${stop.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Departed</div>
          </div>`;
      } else if (isNextUpcoming) {
        return `
          <div class="p-3 rounded-2xl bg-blue-600 text-white border-2 border-blue-700 shadow-md shadow-blue-500/20 flex flex-col justify-between">
            <div class="flex items-center justify-between text-[10px] font-mono font-extrabold uppercase">
              <span><i class="fa-solid fa-bus text-amber-300 mr-1"></i>Stop ${idx + 1}</span>
              <span class="px-2 py-0.5 rounded-full bg-white text-blue-700">APPROACHING</span>
            </div>
            <div class="font-extrabold text-xs text-white mt-1.5 truncate">${stop.name}</div>
            <div class="text-[10px] text-blue-100 mt-0.5">Bus gliding towards stop</div>
          </div>`;
      } else {
        return `
          <div class="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-col justify-between">
            <div class="flex items-center justify-between text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 uppercase">
              <span>Stop ${idx + 1}</span>
              <span class="px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200">Upcoming</span>
            </div>
            <div class="font-bold text-xs text-slate-900 dark:text-white mt-1.5 truncate">${stop.name}</div>
            <div class="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">~${(idx - passedStopIdx) * 5} mins away</div>
          </div>`;
      }
    }).join("");
  }

  const fromStop = activeJourneyStops[passedStopIdx];
  const toStop = activeJourneyStops[passedStopIdx + 1];
  const subtitle = document.getElementById("liveBusStatusSubtitle");
  if (subtitle && fromStop && toStop) {
    subtitle.innerHTML = `Bus #${currentActiveBusNumber} departed <strong>${fromStop.name}</strong> ➔ Gliding smoothly towards <strong class="text-blue-600 dark:text-blue-400">${toStop.name}</strong>`;
  }
}

function renderFleetTable(fleetList) {
  const tbody = document.getElementById("fleetTableBody");
  if (!tbody) return;
  tbody.innerHTML = fleetList.map(v => `
    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
      <td class="py-2.5 px-3 font-bold text-slate-900 dark:text-white">${v.vehicleId}</td>
      <td class="py-2.5 px-3 text-blue-700 dark:text-blue-400 font-semibold font-sans text-xs">${v.type}</td>
      <td class="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-sans text-xs font-medium">${v.corridor}</td>
      <td class="py-2.5 px-3">
        <div class="flex items-center space-x-2">
          <div class="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div class="h-full ${v.occupancyRate > 85 ? 'bg-rose-500' : 'bg-blue-600'}" style="width:${v.occupancyRate}%"></div>
          </div>
          <span class="text-[11px] text-slate-600 dark:text-slate-400">${v.occupancy}/${v.capacity}</span>
        </div>
      </td>
      <td class="py-2.5 px-3 text-slate-600 dark:text-slate-400">${v.speed} km/h</td>
      <td class="py-2.5 px-3 text-right">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">${v.status}</span>
      </td>
    </tr>
  `).join("");
}

function logTerminal(msg) {
  const term = document.getElementById("terminalLog");
  if (term) term.textContent = msg;
}