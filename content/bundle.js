(() => {
  // content/utils/storage.js
  var DEFAULT_SETTINGS = {
    enabled: true,
    darkMode: true,
    sidebar: true,
    clutterRemoval: true,
    assignmentTracker: true,
    sidebarCollapsed: false,
    domain: "ugvle.ucsc.cmb.ac.lk",
    pinnedCourses: []
  };
  async function getSettings() {
    try {
      const result = await chrome.storage.sync.get("moodleRedesign");
      return { ...DEFAULT_SETTINGS, ...result.moodleRedesign || {} };
    } catch (e) {
      console.warn("[MoodleRedesign] Storage unavailable, using defaults:", e.message);
      return { ...DEFAULT_SETTINGS };
    }
  }
  async function saveSettings(updates) {
    try {
      const current = await getSettings();
      const merged = { ...current, ...updates };
      await chrome.storage.sync.set({ moodleRedesign: merged });
      return merged;
    } catch (e) {
      console.warn("[MoodleRedesign] Storage save failed:", e.message);
    }
  }
  function onSettingsChange(callback) {
    try {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === "sync" && changes.moodleRedesign) {
          const newVal = { ...DEFAULT_SETTINGS, ...changes.moodleRedesign.newValue || {} };
          const oldVal = { ...DEFAULT_SETTINGS, ...changes.moodleRedesign.oldValue || {} };
          callback(newVal, oldVal);
        }
      });
    } catch (e) {
      console.warn("[MoodleRedesign] Storage listener failed:", e.message);
    }
  }

  // content/utils/dom.js
  function waitForElement(selector, timeout = 1e4) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(selector);
      if (existing) {
        resolve(existing);
        return;
      }
      const observer = new MutationObserver((_, obs) => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`waitForElement: "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }
  function getPageType() {
    const body = document.body;
    if (!body) return "unknown";
    const classes = body.className;
    if (classes.includes("path-site") || classes.includes("path-frontpage"))
      return "dashboard";
    if (classes.includes("path-my") && !classes.includes("path-my-courses"))
      return "dashboard";
    if (classes.includes("path-my-courses"))
      return "courses";
    if (classes.includes("path-my"))
      return "dashboard";
    if (classes.includes("path-course-view"))
      return "course-view";
    if (classes.includes("path-mod-assign"))
      return "assignment";
    if (classes.includes("path-grade"))
      return "grades";
    if (classes.includes("path-calendar"))
      return "calendar";
    return "unknown";
  }
  function extractText(selectorOrEl) {
    const el = typeof selectorOrEl === "string" ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (!el) return "";
    const clone = el.cloneNode(true);
    const hidden = clone.querySelectorAll(".sr-only, .accesshide");
    hidden.forEach((h) => h.remove());
    return clone.textContent.trim().replace(/\s{2,}/g, " ");
  }
  function createElement(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "className") {
        el.className = value;
      } else if (key === "style" && typeof value === "object") {
        Object.assign(el.style, value);
      } else if (key.startsWith("on") && typeof value === "function") {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === "dataset" && typeof value === "object") {
        Object.assign(el.dataset, value);
      } else {
        el.setAttribute(key, value);
      }
    }
    for (const child of children) {
      if (typeof child === "string") {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof Element) {
        el.appendChild(child);
      }
    }
    return el;
  }

  // content/utils/icons.js
  var ICONS = {
    home: `<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>`,
    "book-open": `<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>`,
    "clipboard-list": `<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>`,
    calendar: `<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>`,
    settings: `<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>`,
    "log-out": `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" x2="9" y1="12" y2="12"/>`,
    "chevron-down": `<path d="m6 9 6 6 6-6"/>`,
    "chevron-right": `<path d="m9 18 6-6-6-6"/>`,
    "chevron-left": `<path d="m15 18-6-6 6-6"/>`,
    "check-circle": `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>`,
    "alert-circle": `<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>`,
    clock: `<circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>`,
    search: `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`,
    menu: `<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>`,
    x: `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,
    "panel-left": `<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>`,
    sparkles: `<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>`,
    "file-text": `<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>`,
    "help-circle": `<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>`,
    link: `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
    "pen-tool": `<path d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"/><path d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"/><path d="m2.3 2.3 7.286 7.286"/><circle cx="11" cy="11" r="2"/>`,
    "bar-chart": `<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>`,
    check: `<path d="M20 6 9 17l-5-5"/>`,
    user: `<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
    zap: `<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>`,
    filter: `<polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>`,
    "arrow-up-down": `<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>`,
    circle: `<circle cx="12" cy="12" r="10"/>`,
    star: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
    "graduation-cap": `<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>`
  };
  function getIcon(name, size = 20, strokeWidth = 1.75) {
    const paths = ICONS[name];
    if (!paths) {
      console.warn(`[MoodleRedesign] Unknown icon: "${name}"`);
      return "";
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  }

  // content/ui/sidebar.js
  var COURSE_COLORS = [
    "var(--accent-blue)",
    "var(--accent-purple)",
    "var(--accent-cyan)",
    "var(--accent-green)",
    "var(--accent-amber)",
    "var(--accent-pink)"
  ];
  var BRAND_NAME = "Lauxup";
  var BRAND_SUBTITLE = "UCSC";
  var BRAND_LOGO_PATH = "icons/ucsc_logo.jpg";
  async function initSidebar() {
    const settings = await getSettings();
    const userName = extractUserName();
    const courses = extractCourses();
    const currentPage = getPageType();
    const moodleBase = getMoodleBase();
    const sidebar = createElement("nav", {
      className: `mr-sidebar mr-animate-slideInLeft ${settings.sidebarCollapsed ? "collapsed" : ""}`,
      "aria-label": "Main navigation"
    });
    sidebar.innerHTML = buildSidebarHTML(userName, courses, currentPage, moodleBase, settings);
    document.body.prepend(sidebar);
    if (settings.sidebarCollapsed) {
      document.body.classList.add("mr-sidebar-collapsed");
    } else {
      document.body.classList.add("mr-sidebar-active");
    }
    const scrim = createElement("div", { className: "mr-sidebar-scrim" });
    scrim.addEventListener("click", () => {
      sidebar.classList.remove("mobile-open");
      scrim.classList.remove("active");
    });
    document.body.prepend(scrim);
    setupSidebarEvents(sidebar, scrim);
    updateSidebarToggle(sidebar);
  }
  function buildSidebarHTML(userName, courses, currentPage, base, settings) {
    const brandLogoUrl = chrome.runtime.getURL(BRAND_LOGO_PATH);
    const navItems = [
      { icon: "home", label: "Dashboard", path: "/my/", page: "dashboard" },
      { icon: "book-open", label: "My Courses", path: "/my/courses.php", page: "courses", key: "courses" },
      { icon: "clipboard-list", label: "Assignments", action: "assignments", page: null },
      { icon: "calendar", label: "Calendar", path: "/calendar/view.php?view=month", page: "calendar" }
    ];
    const initials = userName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
    const orderedCourses = orderCourses(courses, settings.pinnedCourses || []);
    const isCourseContext = currentPage === "courses" || orderedCourses.some((course) => isCurrentCourse(course.url));
    let html = `
    <!-- Brand & Toggle -->
    <div class="mr-sidebar__brand">
      <a href="https://ugvle.ucsc.cmb.ac.lk/ugvle_25/" class="mr-sidebar__brand-link">
        <div class="mr-sidebar__brand-icon">
          <img src="${brandLogoUrl}" alt="${BRAND_SUBTITLE} logo" class="mr-sidebar__brand-logo">
        </div>
        <div class="mr-sidebar__brand-text">
          <span class="mr-sidebar__brand-name">${BRAND_NAME}</span>
          <span class="mr-sidebar__brand-sub">${BRAND_SUBTITLE}</span>
        </div>
      </a>
      <button class="mr-sidebar__toggle" data-action="toggle-sidebar" title="Toggle sidebar ([)" aria-label="Toggle sidebar">
        ${getSidebarToggleIcon(settings.sidebarCollapsed)}
      </button>
    </div>

    <!-- Navigation -->
    <div class="mr-sidebar__nav">
      <div class="mr-sidebar__section-title">Navigation</div>
  `;
    for (const item of navItems) {
      const isActive = item.key === "courses" ? isCourseContext : item.page === currentPage;
      html += buildNavItem(item, base, isActive);
      if (item.key === "courses" && orderedCourses.length > 0) {
        html += `<div class="mr-sidebar__subnav">`;
        orderedCourses.forEach((course, index) => {
          html += buildCourseItem(course, index, settings.pinnedCourses || []);
        });
        html += `</div>`;
      }
    }
    html += `</div>`;
    const loginUrl = getLoginUrl();
    if (loginUrl) {
      html += `
      <div class="mr-sidebar__user" style="justify-content: center;">
        <a href="${loginUrl}" class="btn btn-primary" style="width: 100%; text-align: center;">Log In</a>
      </div>
    `;
    } else {
      const nativeLogoutLink = document.querySelector('a[href*="login/logout.php"]');
      const logoutUrl = nativeLogoutLink ? nativeLogoutLink.href : getMoodleBase() + "/login/logout.php";
      html += `
        <div class="mr-sidebar__user">
          <div class="mr-avatar">${initials}</div>
          <div class="mr-sidebar__user-info">
            <a href="${getMoodleBase()}/user/profile.php" class="mr-sidebar__user-name" style="text-decoration:none;">${userName}</a>
            <a href="${logoutUrl}" class="mr-sidebar__user-role" style="text-decoration:none; color: var(--danger);">Log Out</a>
          </div>
          <span class="mr-sidebar__nav-icon" style="cursor:pointer" data-action="settings" title="Preferences">
            ${getIcon("settings", 16)}
          </span>
        </div>
      `;
    }
    return html;
  }
  function buildNavItem(item, base, isActive) {
    const href = item.path ? `${base}${item.path}` : "#";
    const actionAttr = item.action ? `data-action="${item.action}"` : "";
    return `
    <a class="mr-sidebar__nav-item ${isActive ? "active" : ""}" href="${href}" ${actionAttr}>
      <span class="mr-sidebar__nav-icon">${getIcon(item.icon, 18)}</span>
      <span class="mr-sidebar__label">${item.label}</span>
    </a>
  `;
  }
  function buildCourseItem(course, index, pinnedUrls) {
    const color = COURSE_COLORS[index % COURSE_COLORS.length];
    const pinned = pinnedUrls.includes(course.url);
    return `
    <a class="mr-sidebar__nav-item mr-sidebar__course-item ${isCurrentCourse(course.url) ? "active" : ""}" href="${course.url}">
      <span class="mr-sidebar__course-dot" style="background:${color}"></span>
      <span class="mr-sidebar__label mr-sidebar__course-label">${course.shortName}</span>
      <span class="mr-sidebar__pin-btn ${pinned ? "pinned" : ""}" data-action="toggle-pin" data-url="${course.url}" title="${pinned ? "Unpin" : "Pin"}">
        ${getIcon("star", 14)}
      </span>
    </a>
  `;
  }
  function orderCourses(courses, pinnedUrls) {
    const pinned = [];
    const unpinned = [];
    courses.forEach((course) => {
      if (pinnedUrls.includes(course.url)) {
        pinned.push(course);
      } else {
        unpinned.push(course);
      }
    });
    return [...pinned, ...unpinned];
  }
  function getSidebarToggleIcon(isCollapsed) {
    return getIcon(isCollapsed ? "chevron-right" : "chevron-left", 16);
  }
  function updateSidebarToggle(sidebar) {
    const toggle = sidebar.querySelector(".mr-sidebar__toggle");
    if (!toggle) return;
    const isCollapsed = sidebar.classList.contains("collapsed");
    toggle.innerHTML = getSidebarToggleIcon(isCollapsed);
    toggle.title = isCollapsed ? "Expand sidebar ([)" : "Collapse sidebar ([)";
    toggle.setAttribute("aria-label", toggle.title);
  }
  function getLoginUrl() {
    const loginLink = document.querySelector('.logininfo a[href*="login/"]');
    if (loginLink && loginLink.textContent.toLowerCase().includes("log in")) {
      return loginLink.href;
    }
    const userMenu = document.querySelector(".usermenu, #user-menu-toggle, .userbutton");
    if (!userMenu) {
      return getMoodleBase() + "/login/index.php";
    }
    return null;
  }
  function setupSidebarEvents(sidebar, scrim) {
    sidebar.addEventListener("click", async (e) => {
      const target = e.target.closest("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      if (action === "toggle-pin") {
        e.preventDefault();
        e.stopPropagation();
        const url = target.dataset.url;
        const settings = await getSettings();
        let pinned = settings.pinnedCourses || [];
        if (pinned.includes(url)) {
          pinned = pinned.filter((u) => u !== url);
        } else {
          pinned.push(url);
        }
        await saveSettings({ pinnedCourses: pinned });
        return;
      }
      if (action === "toggle-sidebar") {
        e.preventDefault();
        sidebar.classList.toggle("collapsed");
        const isCollapsed = sidebar.classList.contains("collapsed");
        document.body.classList.toggle("mr-sidebar-active", !isCollapsed);
        document.body.classList.toggle("mr-sidebar-collapsed", isCollapsed);
        updateSidebarToggle(sidebar);
        await saveSettings({ sidebarCollapsed: isCollapsed });
      }
      if (action === "assignments") {
        e.preventDefault();
        const overlay = document.querySelector(".mr-assignments-overlay");
        if (overlay) {
          overlay.classList.add("active");
        }
      }
      if (action === "settings") {
        window.location.href = getMoodleBase() + "/user/preferences.php";
      }
    });
    if (window.innerWidth <= 768) {
      const hamburger = createElement("button", {
        className: "mr-btn--icon",
        style: {
          position: "fixed",
          top: "12px",
          left: "12px",
          zIndex: "1048",
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          padding: "8px",
          color: "var(--text-primary)"
        },
        onClick: () => {
          sidebar.classList.toggle("mobile-open");
          scrim.classList.toggle("active");
        }
      });
      hamburger.innerHTML = getIcon("menu", 20);
      document.body.prepend(hamburger);
    }
  }
  function extractUserName() {
    const userMenu = document.querySelector("#user-menu-toggle .usertext, .usermenu .usertext, .userbutton .usertext");
    if (userMenu) return userMenu.textContent.trim();
    const userLink = document.querySelector(".usermenu a[title], .userbutton");
    if (userLink) return userLink.title || userLink.textContent.trim();
    return "Student";
  }
  function extractCourses() {
    const courses = [];
    const seen = /* @__PURE__ */ new Set();
    const cards = document.querySelectorAll('.card.dashboard-card, .coursebox, [data-region="course-content"] .coursename a');
    cards.forEach((card) => {
      const link = card.querySelector("a.aalink, a.coursename, .coursename a") || card;
      if (!link.href) return;
      const name = link.textContent?.trim() || card.querySelector(".coursename")?.textContent?.trim();
      if (!name || seen.has(link.href)) return;
      seen.add(link.href);
      courses.push({
        name,
        shortName: shortenCourseName(name),
        url: link.href
      });
    });
    if (courses.length === 0) {
      const navCourses = document.querySelectorAll('#nav-drawer .list-group-item[data-key^="course"], .courselistitem a');
      navCourses.forEach((item) => {
        const href = item.href || item.querySelector("a")?.href;
        const name = item.textContent?.trim();
        if (!href || !name || seen.has(href)) return;
        seen.add(href);
        courses.push({
          name,
          shortName: shortenCourseName(name),
          url: href
        });
      });
    }
    if (courses.length === 0) {
      const overviewItems = document.querySelectorAll('[data-region="paged-content-page"] [data-region="course-content"]');
      overviewItems.forEach((item) => {
        const link = item.querySelector("a");
        const name = item.querySelector(".coursename")?.textContent?.trim() || link?.textContent?.trim();
        if (!link?.href || !name || seen.has(link.href)) return;
        seen.add(link.href);
        courses.push({
          name,
          shortName: shortenCourseName(name),
          url: link.href
        });
      });
    }
    return courses.slice(0, 15);
  }
  function shortenCourseName(name) {
    const codeMatch = name.match(/[A-Z]{2,4}\s?\d{3,4}/);
    if (codeMatch) return codeMatch[0];
    if (name.length > 25) return name.substring(0, 25) + "\u2026";
    return name;
  }
  function isCurrentCourse(url) {
    return window.location.href.includes(url);
  }
  function getMoodleBase() {
    const pathParts = window.location.pathname.split("/");
    if (pathParts.length > 1 && pathParts[1]) {
      return `/${pathParts[1]}`;
    }
    return "";
  }

  // content/ui/dashboard.js
  async function initDashboard() {
    if (getPageType() !== "dashboard") return;
    try {
      const mainRegion = await waitForElement("#region-main", 5e3);
      const dashboard = createElement("div", { className: "mr-dashboard mr-animate-fadeIn" });
      mainRegion.prepend(dashboard);
      let updateTimer = null;
      const updateDashboard = () => {
        const userName = extractUserName2();
        const courses = extractCourseCards();
        const timeline = extractTimelineItems();
        dashboard.innerHTML = buildDashboardHTML(userName, courses, timeline);
        requestAnimationFrame(() => {
          animateProgressRings();
        });
        Array.from(mainRegion.children).forEach((child) => {
          if (child !== dashboard) {
            child.style.display = "none";
          }
        });
      };
      updateDashboard();
      const observer = new MutationObserver((mutations) => {
        const isNativeChange = mutations.some((m) => !dashboard.contains(m.target));
        if (isNativeChange) {
          clearTimeout(updateTimer);
          updateTimer = setTimeout(() => {
            updateDashboard();
          }, 100);
        }
      });
      observer.observe(mainRegion, { childList: true, subtree: true });
    } catch (e) {
      console.warn("[MoodleRedesign] Dashboard init failed:", e.message);
    }
  }
  function buildDashboardHTML(userName, courses, timeline) {
    const greeting = getGreeting();
    const today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric"
    });
    const todayItems = timeline.filter((item) => {
      if (!item.dueDate) return false;
      const now = /* @__PURE__ */ new Date();
      const due = new Date(item.dueDate);
      const diff = (due - now) / (1e3 * 60 * 60);
      return diff <= 24 && diff > -48;
    });
    const pendingCount = timeline.filter((i) => !i.completed).length;
    const totalCourses = courses.length;
    const avgProgress = courses.length > 0 ? Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / courses.length) : 0;
    let html = "";
    html += `
    <div class="mr-greeting">
      <h1 class="mr-greeting__title">${greeting}, ${firstName(userName)}</h1>
      <p class="mr-greeting__subtitle">${today}</p>
    </div>
  `;
    html += `
    <div class="mr-stats mr-stagger">
      <div class="mr-stat-card">
        <div class="mr-stat-card__icon">${getIcon("book-open", 20)}</div>
        <div class="mr-stat-card__value">${totalCourses}</div>
        <div class="mr-stat-card__label">Courses</div>
      </div>
      <div class="mr-stat-card">
        <div class="mr-stat-card__icon">${getIcon("clipboard-list", 20)}</div>
        <div class="mr-stat-card__value">${pendingCount}</div>
        <div class="mr-stat-card__label">Pending</div>
      </div>
      <div class="mr-stat-card">
        <div class="mr-stat-card__icon">${getIcon("bar-chart", 20)}</div>
        <div class="mr-stat-card__value">${avgProgress}%</div>
        <div class="mr-stat-card__label">Progress</div>
      </div>
      <div class="mr-stat-card">
        <div class="mr-stat-card__icon">${getIcon("zap", 20)}</div>
        <div class="mr-stat-card__value">${todayItems.length}</div>
        <div class="mr-stat-card__label">Due Today</div>
      </div>
    </div>
  `;
    html += buildTodayPanel(todayItems);
    if (courses.length > 0) {
      html += `<div class="mr-section-header">${getIcon("book-open", 18)} My Courses</div>`;
      html += `<div class="mr-courses-grid mr-stagger">`;
      courses.forEach((course) => {
        html += buildCourseCard(course);
      });
      html += `</div>`;
    }
    return html;
  }
  function buildTodayPanel(items) {
    let html = `
    <div class="mr-today mr-animate-fadeInUp">
      <div class="mr-today__header">
        <div class="mr-today__title">
          ${getIcon("clock", 16)} Due Today
        </div>
        <span class="mr-today__count">${items.length} item${items.length !== 1 ? "s" : ""}</span>
      </div>
  `;
    if (items.length === 0) {
      html += `
      <div class="mr-empty" style="padding: var(--space-lg);">
        <div class="mr-empty__icon mr-animate-float">${getIcon("sparkles", 32)}</div>
        <div class="mr-empty__title">All clear!</div>
        <div class="mr-empty__desc">Nothing due today. Enjoy your day.</div>
      </div>
    `;
    } else {
      html += `<div class="mr-today__list">`;
      items.forEach((item) => {
        const status = getItemStatus(item);
        html += `
        <div class="mr-today__item">
          <span class="mr-status-dot mr-status-dot--${status}"></span>
          <div class="mr-today__item-name">
            <a href="${item.url || "#"}">${item.name}</a>
            ${item.course ? `<div class="mr-today__item-course">${item.course}</div>` : ""}
          </div>
          <span class="mr-today__item-due">${formatRelativeTime(item.dueDate)}</span>
        </div>
      `;
      });
      html += `</div>`;
    }
    html += `</div>`;
    return html;
  }
  function buildCourseCard(course) {
    const progress = normalizeProgress(course.progress);
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - progress / 100 * circumference;
    const gradientId = createProgressGradientId(course);
    return `
    <a class="mr-course-card" href="${course.url}">
      <div class="mr-course-card__header">
        <div class="mr-course-card__info">
          <h3 class="mr-course-card__name">${course.name}</h3>
          <div class="mr-course-card__meta">
            ${course.category ? `<span>${course.category}</span>` : ""}
          </div>
        </div>
        <div class="mr-progress-ring" aria-label="${progress}% course progress">
          <svg width="68" height="68" viewBox="0 0 68 68" role="presentation">
            <defs>
              <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--card-accent, var(--accent-blue))"></stop>
                <stop offset="100%" stop-color="var(--accent-cyan)"></stop>
              </linearGradient>
            </defs>
            <circle
              class="mr-progress-ring__bg"
              cx="34"
              cy="34"
              r="${radius}"
              stroke-width="6"
            ></circle>
            <circle
              class="mr-progress-ring__fill"
              cx="34"
              cy="34"
              r="${radius}"
              stroke-width="6"
              stroke-dasharray="${circumference.toFixed(2)}"
              stroke-dashoffset="${circumference.toFixed(2)}"
              data-target-offset="${offset.toFixed(2)}"
              style="stroke: url(#${gradientId})"
            ></circle>
          </svg>
          <span class="mr-progress-ring__label">${progress}%</span>
        </div>
      </div>
      <div class="mr-course-card__footer">
        ${course.nextDeadline ? `<div class="mr-course-card__deadline">
               ${getIcon("clock", 14)}
               <span>${course.nextDeadline}</span>
             </div>` : `<div class="mr-course-card__deadline" style="color: var(--text-muted)">No upcoming deadlines</div>`}
      </div>
    </a>
  `;
  }
  function animateProgressRings() {
    const rings = document.querySelectorAll(".mr-progress-ring__fill");
    rings.forEach((ring, index) => {
      const targetOffset = ring.dataset.targetOffset;
      setTimeout(() => {
        ring.style.strokeDashoffset = targetOffset;
      }, 100 + index * 80);
    });
  }
  function normalizeProgress(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.min(100, Math.max(0, Math.round(numeric)));
  }
  function createProgressGradientId(course) {
    const seed = course.url || course.name || "course";
    return `mr-progress-gradient-${seed.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "course"}`;
  }
  function extractProgressValue(container) {
    const sources = container.querySelectorAll(
      '.progress-bar, [role="progressbar"], [data-progress], .progress-percent, .progress-percentage, .percentage, .progress-text'
    );
    for (const source of sources) {
      const rawValues = [
        source.getAttribute("aria-valuenow"),
        source.getAttribute("data-progress"),
        source.style?.width,
        source.textContent
      ];
      for (const rawValue of rawValues) {
        const progress = parseProgressValue(rawValue);
        if (progress !== null) {
          return progress;
        }
      }
    }
    return 0;
  }
  function parseProgressValue(rawValue) {
    if (rawValue === null || rawValue === void 0) return null;
    const match = String(rawValue).match(/(\d{1,3})(?:\.\d+)?\s*%?/);
    if (!match) return null;
    return normalizeProgress(match[1]);
  }
  function extractUserName2() {
    const candidates = [
      document.querySelector("#user-menu-toggle .usertext, .usermenu .usertext, .userbutton .usertext")?.textContent,
      document.querySelector(".usermenu a[title], .userbutton[title], #user-menu-toggle[title]")?.getAttribute("title"),
      document.querySelector(".mr-sidebar__user-name")?.textContent,
      document.querySelector(
        'a[href*="/user/profile.php"] .media-body, a[href*="/user/profile.php"] .usertext, a[href*="/user/profile.php"][title]'
      )?.getAttribute("title"),
      document.querySelector(
        'a[href*="/user/profile.php"] .media-body, a[href*="/user/profile.php"] .usertext, a[href*="/user/profile.php"][title]'
      )?.textContent,
      document.querySelector(".userpicture[alt], .avatar img[alt]")?.getAttribute("alt")
    ];
    const normalizedCandidates = candidates.map(normalizeUserNameCandidate).filter(Boolean);
    return normalizedCandidates.sort((left, right) => scoreUserNameCandidate(right) - scoreUserNameCandidate(left))[0] || "Student";
  }
  function normalizeUserNameCandidate(value) {
    if (!value) return "";
    let candidate = String(value).split("\n").map((part) => part.trim()).filter(Boolean).join(" ");
    candidate = candidate.replace(/\s+/g, " ").trim();
    candidate = candidate.replace(/^(?:user\s+picture|picture)\s+of\s+/i, "");
    candidate = candidate.replace(/^(?:view|edit)\s+(?:full\s+)?profile\s+(?:of\s+)?/i, "");
    candidate = candidate.replace(/^(?:view|edit)\s+(?:my\s+)?profile\s*/i, "");
    candidate = candidate.replace(/^profile\s+(?:of\s+)?/i, "");
    candidate = candidate.replace(/^logged in as\s+/i, "");
    candidate = candidate.replace(/^user:\s*/i, "");
    return isLikelyUserName(candidate) ? candidate : "";
  }
  function isLikelyUserName(candidate) {
    if (!candidate || candidate.length < 2) return false;
    if (/[<>@/\\]/.test(candidate)) return false;
    return !/^(?:view|profile|preferences|dashboard|log(?:ged)?\s*in|log(?:ged)?\s*out|edit|user\s*menu)$/i.test(candidate);
  }
  function scoreUserNameCandidate(candidate) {
    let score = candidate.length;
    if (candidate.includes(" ")) score += 20;
    if (/^[A-Z]{2,4}$/.test(candidate)) score += 8;
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(candidate)) score += 30;
    return score;
  }
  function extractCourseCards() {
    const courses = [];
    const seen = /* @__PURE__ */ new Set();
    const cards = document.querySelectorAll(".card.dashboard-card");
    cards.forEach((card) => {
      const link = card.querySelector('a.aalink, a.coursename, .coursename a, a[href*="course/view"]');
      if (!link?.href || seen.has(link.href)) return;
      seen.add(link.href);
      const nameNode = card.querySelector(".coursename") || card.querySelector(".multiline .aalink") || link;
      const name = extractText(nameNode);
      const progress = extractProgressValue(card);
      const category = card.querySelector(".categoryname, .text-muted")?.textContent?.trim() || "";
      courses.push({ name, url: link.href, progress, category, nextDeadline: null });
    });
    if (courses.length === 0) {
      const overviewCards = document.querySelectorAll('[data-region="paged-content-page"] [data-region="course-content"]');
      overviewCards.forEach((card) => {
        const link = card.querySelector('a[href*="course/view"]');
        if (!link?.href || seen.has(link.href)) return;
        seen.add(link.href);
        const nameNode = card.querySelector(".coursename") || link;
        const name = extractText(nameNode);
        const progress = extractProgressValue(card);
        courses.push({ name, url: link.href, progress, category: "", nextDeadline: null });
      });
    }
    if (courses.length === 0) {
      const courseBoxes = document.querySelectorAll(".coursebox");
      courseBoxes.forEach((box) => {
        const link = box.querySelector(".coursename a");
        if (!link?.href || seen.has(link.href)) return;
        seen.add(link.href);
        const name = link.textContent.trim();
        courses.push({ name, url: link.href, progress: 0, category: "", nextDeadline: null });
      });
    }
    return courses;
  }
  function extractTimelineItems() {
    const items = [];
    const timelineItems = document.querySelectorAll('[data-region="timeline"] .list-group-item, [data-region="timeline"] [data-region="event-list-item"]');
    timelineItems.forEach((item) => {
      const link = item.querySelector("a");
      const name = link?.textContent?.trim() || item.querySelector(".event-name")?.textContent?.trim();
      if (!name) return;
      const courseEl = item.querySelector(".course-name, .text-muted");
      const dateEl = item.querySelector('.date, time, [data-region="event-date"]');
      let dueDate = null;
      if (dateEl) {
        const datetime = dateEl.getAttribute("datetime") || dateEl.textContent?.trim();
        try {
          dueDate = new Date(datetime);
          if (isNaN(dueDate.getTime())) dueDate = null;
        } catch {
          dueDate = null;
        }
      }
      items.push({
        name,
        url: link?.href || "#",
        course: courseEl?.textContent?.trim() || "",
        dueDate,
        completed: false
      });
    });
    return items;
  }
  function getGreeting() {
    const hour = (/* @__PURE__ */ new Date()).getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }
  function firstName(fullName) {
    return fullName.split(" ")[0] || fullName;
  }
  function getItemStatus(item) {
    if (!item.dueDate) return "upcoming";
    const now = /* @__PURE__ */ new Date();
    const due = new Date(item.dueDate);
    const hoursLeft = (due - now) / (1e3 * 60 * 60);
    if (hoursLeft < 0) return "overdue";
    if (hoursLeft < 48) return "soon";
    return "upcoming";
  }
  function formatRelativeTime(date) {
    if (!date) return "";
    const now = /* @__PURE__ */ new Date();
    const diff = date - now;
    const hours = Math.abs(diff) / (1e3 * 60 * 60);
    const days = Math.floor(hours / 24);
    if (diff < 0) {
      if (hours < 1) return "Just now";
      if (hours < 24) return `${Math.floor(hours)}h ago`;
      return `${days}d ago`;
    } else {
      if (hours < 1) return "Due soon";
      if (hours < 24) return `in ${Math.floor(hours)}h`;
      return `in ${days}d`;
    }
  }

  // content/ui/coursePage.js
  async function initCoursePage() {
    if (getPageType() !== "course-view") return;
    try {
      await waitForElement(".course-content", 5e3);
      enhanceSections();
    } catch (e) {
      console.warn("[MoodleRedesign] Course page init failed:", e.message);
    }
  }
  function enhanceSections() {
    const courseContent = document.querySelector(".course-content");
    if (!courseContent) return;
    const sections = courseContent.querySelectorAll(".section.main, li.section");
    if (sections.length === 0) return;
    const mainRegion = document.querySelector("#region-main");
    if (!mainRegion) return;
    let header = document.querySelector(".mr-course-header");
    if (!header) {
      header = createElement("div", { className: "mr-course-header mr-animate-fadeInDown" });
      header.innerHTML = buildHeaderHTML();
    }
    let wrapper = document.querySelector(".mr-course-sections");
    if (!wrapper) {
      wrapper = createElement("div", { className: "mr-course-sections mr-animate-fadeIn" });
    }
    const originalContent = mainRegion.querySelector(".course-content");
    if (originalContent) {
      originalContent.style.position = "absolute";
      originalContent.style.left = "-9999px";
      originalContent.style.visibility = "hidden";
      originalContent.style.height = "0";
      originalContent.style.overflow = "hidden";
    }
    if (!wrapper.isConnected) {
      mainRegion.prepend(wrapper);
    }
    if (!header.isConnected) {
      mainRegion.prepend(header);
    }
    renderSections(courseContent, wrapper);
    setupCourseInteractions(wrapper, courseContent);
    observeCourseContent(courseContent, wrapper);
  }
  function buildHeaderHTML() {
    const courseTitle = document.querySelector(
      "#page-header .page-header-headings h1, .page-context-header .page-header-headings h1"
    );
    const title = courseTitle?.textContent?.trim() || "Course";
    return `
    <h1 class="mr-course-header__title">${title}</h1>
    <div class="mr-course-header__breadcrumb">
      <a href="${getMoodleBase2()}/my/">${getIcon("home", 14)} Dashboard</a>
      <span>&gt;</span>
      <span>${title}</span>
    </div>
  `;
  }
  function renderSections(courseContent, wrapper) {
    const sections = Array.from(courseContent.querySelectorAll(".section.main, li.section"));
    if (sections.length === 0) return;
    const expandedSections = new Set(
      Array.from(wrapper.querySelectorAll(".mr-section.expanded")).map((section) => section.dataset.sectionKey)
    );
    wrapper.replaceChildren();
    sections.forEach((section, index) => {
      const sectionKey = getSectionKey(section, index);
      const sectionCard = buildSectionCard(section, index, expandedSections.has(sectionKey), sectionKey);
      if (sectionCard) {
        wrapper.appendChild(sectionCard);
      }
    });
  }
  function buildSectionCard(section, index, isExpanded = false, sectionKey = "") {
    const titleEl = section.querySelector(".sectionname, .section-title h3, .course-section-header h3, .sectionname a");
    let title = titleEl?.textContent?.trim();
    if (!title || title === "") {
      title = index === 0 ? "General" : `Topic ${index}`;
    }
    const activities = Array.from(section.querySelectorAll(".activity"));
    if (activities.length === 0 && index > 0) return null;
    const sectionProgress = getSectionProgress(activities);
    const card = createElement("div", {
      className: `mr-section ${isExpanded || index <= 1 ? "expanded" : ""}`,
      dataset: { sectionKey }
    });
    let headerHTML = `
    <div class="mr-section__header" data-action="toggle-section">
      <div class="mr-section__header-left">
        <span class="mr-section__chevron">${getIcon("chevron-right", 16)}</span>
        <span class="mr-section__title">${title}</span>
        <span class="mr-section__count">${activities.length}</span>
      </div>
      ${sectionProgress.trackableCount > 0 ? `<div class="mr-section__progress" title="${sectionProgress.completedCount} of ${sectionProgress.trackableCount} tracked activities completed">
             <div class="mr-section__progress-bar">
               <div class="mr-section__progress-fill" style="width: ${sectionProgress.percentage}%"></div>
             </div>
             <span class="mr-section__progress-text">${sectionProgress.percentage}%</span>
           </div>` : ""}
    </div>
  `;
    let contentHTML = `<div class="mr-section__content"><div class="mr-section__activity-list">`;
    activities.forEach((activity, actIndex) => {
      contentHTML += buildActivityItem(activity, index + "-" + actIndex);
    });
    contentHTML += `</div></div>`;
    card.innerHTML = headerHTML + contentHTML;
    return card;
  }
  function buildActivityItem(activity, uid) {
    const type = getActivityType(activity);
    const icon = getActivityIcon(type);
    const iconClass = `mr-activity__icon--${type}`;
    const completion = getActivityCompletion(activity);
    const actId = activity.id || `mr-act-${uid}`;
    if (!activity.id) activity.id = actId;
    const link = activity.querySelector(".activityinstance a, .aalink, .activity-name-area a");
    const name = link?.textContent?.trim() || activity.querySelector(".instancename")?.textContent?.trim() || "Activity";
    const url = link?.href || "#";
    const desc = activity.querySelector(".contentafterlink, .activity-description, .text-muted")?.textContent?.trim() || "";
    const toggleLabel = completion.completed ? "Mark as not done" : "Mark as done";
    return `
      <div class="mr-activity">
        <div class="mr-activity__icon ${iconClass}">
          ${getIcon(icon, 18)}
        </div>
        <div class="mr-activity__info">
          <div class="mr-activity__name">
            <a href="${url}">${cleanName(name)}</a>
          </div>
          ${desc ? `<div class="mr-activity__desc">${truncate(desc, 60)}</div>` : ""}
        </div>
        ${completion.trackable ? `<div class="mr-activity__status">
               ${completion.toggleable ? `<button
                    type="button"
                    class="mr-activity__completion mr-activity__completion--${completion.completed ? "done" : "pending"}"
                    data-action="toggle-completion"
                    data-activity-id="${actId}"
                    aria-pressed="${completion.completed ? "true" : "false"}"
                    aria-label="${toggleLabel}"
                    title="${toggleLabel}"
                  >
                    ${getIcon("check", 12)}
                  </button>` : `<span class="mr-activity__completion mr-activity__completion--${completion.completed ? "done" : "pending"}" title="${completion.completed ? "Completed automatically" : "Not completed yet"}">
                    ${getIcon("check", 12)}
                  </span>`}
             </div>` : ""}
      </div>
    `;
  }
  function getSectionProgress(activities) {
    const summary = activities.reduce((result, activity) => {
      const completion = getActivityCompletion(activity);
      if (!completion.trackable) return result;
      result.trackableCount += 1;
      if (completion.completed) {
        result.completedCount += 1;
      }
      return result;
    }, { completedCount: 0, trackableCount: 0 });
    return {
      ...summary,
      percentage: summary.trackableCount > 0 ? Math.round(summary.completedCount / summary.trackableCount * 100) : 0
    };
  }
  function getActivityCompletion(activity) {
    const completionRoot = activity.querySelector(
      '.completion-info, .completion-container, .activity-completion, [data-region="completionrequirements"], .automatic-completion-conditions, .manual-completion, .manualcompletion, .autocompletion'
    );
    const toggleControl = findCompletionToggleControl(activity);
    const completed = hasCompletedCompletionState(completionRoot, toggleControl);
    const pending = hasPendingCompletionState(completionRoot, toggleControl);
    const trackable = !!toggleControl || completed || pending;
    if (!trackable) {
      return { trackable: false, completed: false, toggleable: false };
    }
    return {
      trackable: true,
      completed,
      toggleable: !!toggleControl
    };
  }
  function hasCompletedCompletionState(completionRoot, toggleControl) {
    if (toggleControl?.matches('input[type="checkbox"]')) {
      return toggleControl.checked;
    }
    if (toggleControl?.getAttribute("aria-pressed") === "true" || toggleControl?.getAttribute("aria-checked") === "true") {
      return true;
    }
    const completedMarker = completionRoot?.querySelector(
      '.badge-success, .btn-success, .completion_complete, .completion-complete, .is-complete, [data-value="1"], [aria-pressed="true"], [aria-checked="true"]'
    );
    if (completedMarker) {
      return true;
    }
    const completionText = getCompletionStateText(completionRoot, toggleControl);
    const looksPending = /mark as (?:done|complete)|not completed|to do|\bincomplete\b/.test(completionText);
    const looksCompleted = /\bmarked as done\b|\bmarked as complete\b|\bcompleted\b|\bdone\b/.test(completionText);
    return !looksPending && looksCompleted;
  }
  function hasPendingCompletionState(completionRoot, toggleControl) {
    if (toggleControl?.matches('input[type="checkbox"]')) {
      return !toggleControl.checked;
    }
    if (toggleControl?.getAttribute("aria-pressed") === "false" || toggleControl?.getAttribute("aria-checked") === "false") {
      return true;
    }
    const pendingMarker = completionRoot?.querySelector(
      '.completion_incomplete, .completion-incomplete, [data-value="0"], [aria-pressed="false"], [aria-checked="false"]'
    );
    if (pendingMarker) {
      return true;
    }
    const completionText = getCompletionStateText(completionRoot, toggleControl);
    return /mark as (?:done|complete)|not completed|to do|\bincomplete\b/.test(completionText);
  }
  function getCompletionStateText(completionRoot, toggleControl) {
    return [
      completionRoot?.textContent,
      completionRoot?.getAttribute("title"),
      completionRoot?.getAttribute("aria-label"),
      toggleControl?.textContent,
      toggleControl?.getAttribute("title"),
      toggleControl?.getAttribute("aria-label")
    ].filter(Boolean).join(" ").toLowerCase();
  }
  function getSectionKey(section, index) {
    return section.id || section.getAttribute("data-sectionid") || `section-${index}`;
  }
  function setupCourseInteractions(wrapper, courseContent) {
    if (wrapper.dataset.bound === "true") return;
    wrapper.dataset.bound = "true";
    wrapper.addEventListener("click", (event) => {
      const completionButton = event.target.closest('[data-action="toggle-completion"]');
      if (completionButton) {
        event.preventDefault();
        event.stopPropagation();
        toggleActivityCompletion(completionButton, courseContent, wrapper);
        return;
      }
      const sectionHeader = event.target.closest('[data-action="toggle-section"]');
      if (sectionHeader) {
        sectionHeader.closest(".mr-section")?.classList.toggle("expanded");
      }
    });
  }
  function observeCourseContent(courseContent, wrapper) {
    if (courseContent.dataset.mrObserved === "true") return;
    courseContent.dataset.mrObserved = "true";
    let refreshTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        renderSections(courseContent, wrapper);
      }, 120);
    });
    observer.observe(courseContent, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-pressed", "aria-checked", "title", "data-value"]
    });
  }
  function toggleActivityCompletion(button, courseContent, wrapper) {
    if (button.disabled) return;
    const activityId = button.dataset.activityId;
    if (!activityId) return;
    const nativeActivity = document.getElementById(activityId);
    if (!nativeActivity) return;
    const nativeControl = findCompletionToggleControl(nativeActivity);
    if (!nativeControl) return;
    button.disabled = true;
    button.classList.add("is-loading");
    button.setAttribute("aria-busy", "true");
    nativeControl.click();
    setTimeout(() => {
      renderSections(courseContent, wrapper);
    }, 800);
  }
  function findCompletionToggleControl(activity) {
    const candidates = activity.querySelectorAll(`
    [data-action="toggle-manual-completion"],
    .manual-completion button,
    .manual-completion [role="button"],
    .manualcompletion button,
    .manualcompletion [role="button"],
    .completion-container button,
    .completion-container [role="button"],
    .completion-container input[type="checkbox"],
    .completion-container a,
    [data-region="completionrequirements"] button,
    [data-region="completionrequirements"] [role="button"],
    [aria-pressed],
    [aria-checked]
  `);
    return Array.from(candidates).find(isCompletionToggleControl) || null;
  }
  function isCompletionToggleControl(control) {
    if (!control || control.matches('[disabled], [aria-disabled="true"]')) {
      return false;
    }
    if (control.matches('[data-action="toggle-manual-completion"], .manual-completion button, .manual-completion [role="button"], .manualcompletion button, .manualcompletion [role="button"], .completion-container button, .completion-container input[type="checkbox"], [data-region="completionrequirements"] button')) {
      return true;
    }
    if (control.matches("[aria-pressed], [aria-checked]")) {
      return !!control.closest(
        '.completion-info, .completion-container, .activity-completion, [data-region="completionrequirements"], .manual-completion, .manualcompletion'
      );
    }
    if (control.matches(".completion-container a")) {
      const text = [
        control.textContent,
        control.getAttribute("title"),
        control.getAttribute("aria-label")
      ].filter(Boolean).join(" ").toLowerCase();
      return /mark as (?:done|complete)|completed|not completed/.test(text);
    }
    return false;
  }
  function getActivityType(activity) {
    const classes = activity.className || "";
    if (classes.includes("modtype_assign")) return "assign";
    if (classes.includes("modtype_quiz")) return "quiz";
    if (classes.includes("modtype_resource") || classes.includes("modtype_folder")) return "resource";
    if (classes.includes("modtype_url")) return "url";
    if (classes.includes("modtype_forum")) return "forum";
    if (classes.includes("modtype_page")) return "resource";
    if (classes.includes("modtype_label")) return "resource";
    return "resource";
  }
  function getActivityIcon(type) {
    const icons = {
      assign: "pen-tool",
      quiz: "help-circle",
      resource: "file-text",
      url: "link",
      forum: "clipboard-list"
    };
    return icons[type] || "file-text";
  }
  function cleanName(name) {
    return name.replace(/^\s+|\s+$/g, "").replace(/\s{2,}/g, " ");
  }
  function truncate(str, len) {
    if (str.length <= len) return str;
    return str.substring(0, len) + "...";
  }
  function getMoodleBase2() {
    const pathParts = window.location.pathname.split("/");
    if (pathParts.length > 1 && pathParts[1]) {
      return `/${pathParts[1]}`;
    }
    return "";
  }

  // content/ui/clutter.js
  var CLUTTER_SELECTORS = [
    // Sidebar blocks we replace
    ".block_calendar_month",
    ".block_online_users",
    ".block_badges",
    ".block_tags",
    ".block_blog_menu",
    ".block_blog_recent",
    ".block_login",
    ".block_rss_client",
    // Footer
    "#page-footer .logininfo",
    "#page-footer .tool_usertours-resettourcontainer",
    "#page-footer .sitelink",
    // Edit mode (students don't need this)
    ".editmode-switch-form",
    // Misc clutter
    ".usermenu .divider:last-child",
    "#page-navbar"
  ];
  var DECLUTTER_CLASS = "mr-decluttered";
  function initClutterRemoval() {
    const style = document.createElement("style");
    style.textContent = `.${DECLUTTER_CLASS} { display: none !important; }`;
    document.head.appendChild(style);
    applyClutter();
    const observer = new MutationObserver(() => {
      applyClutter();
    });
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
  function applyClutter() {
    for (const selector of CLUTTER_SELECTORS) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          if (!el.classList.contains(DECLUTTER_CLASS)) {
            el.classList.add(DECLUTTER_CLASS);
          }
        });
      } catch (e) {
      }
    }
  }

  // content/features/assignmentTracker.js
  var assignmentsData = [];
  var currentFilter = "all";
  function initAssignmentTracker() {
    assignmentsData = extractAssignments();
    const overlay = buildOverlay();
    document.body.appendChild(overlay);
    renderAssignments();
  }
  function buildOverlay() {
    const overlay = createElement("div", { className: "mr-assignments-overlay" });
    overlay.innerHTML = `
    <div class="mr-assignments-scrim" data-action="close-assignments"></div>
    <div class="mr-assignments-panel">
      <div class="mr-assignments__header">
        <div class="mr-assignments__title">
          ${getIcon("clipboard-list", 20)} Assignments
        </div>
        <button class="mr-assignments__close" data-action="close-assignments">
          ${getIcon("x", 18)}
        </button>
      </div>
      <div class="mr-assignments__filters">
        <button class="mr-filter-pill active" data-filter="all">All</button>
        <button class="mr-filter-pill" data-filter="overdue">Overdue</button>
        <button class="mr-filter-pill" data-filter="soon">Due Soon</button>
        <button class="mr-filter-pill" data-filter="upcoming">Upcoming</button>
        <button class="mr-filter-pill" data-filter="done">Completed</button>
      </div>
      <div class="mr-assignments__list" id="mr-assignments-list"></div>
      <div class="mr-assignments__stats" id="mr-assignments-stats"></div>
    </div>
  `;
    overlay.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]");
      if (action?.dataset.action === "close-assignments") {
        overlay.classList.remove("active");
      }
      const filterBtn = e.target.closest("[data-filter]");
      if (filterBtn) {
        currentFilter = filterBtn.dataset.filter;
        overlay.querySelectorAll(".mr-filter-pill").forEach((p) => p.classList.remove("active"));
        filterBtn.classList.add("active");
        renderAssignments();
      }
    });
    return overlay;
  }
  function renderAssignments() {
    const list = document.getElementById("mr-assignments-list");
    const stats = document.getElementById("mr-assignments-stats");
    if (!list) return;
    let filtered = assignmentsData;
    if (currentFilter !== "all") {
      filtered = assignmentsData.filter((a) => getStatus(a) === currentFilter);
    }
    filtered.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
    if (filtered.length === 0) {
      list.innerHTML = `
      <div class="mr-empty">
        <div class="mr-empty__icon mr-animate-float">${getIcon("sparkles", 40)}</div>
        <div class="mr-empty__title">${currentFilter === "all" ? "No assignments found" : "All clear!"}</div>
        <div class="mr-empty__desc">
          ${currentFilter === "all" ? "Navigate to your course pages to populate this tracker." : `No ${currentFilter} assignments right now.`}
        </div>
      </div>
    `;
    } else {
      list.innerHTML = filtered.map((a, i) => buildAssignmentItem(a, i)).join("");
    }
    if (stats) {
      const overdue = assignmentsData.filter((a) => getStatus(a) === "overdue").length;
      const soon = assignmentsData.filter((a) => getStatus(a) === "soon").length;
      const upcoming = assignmentsData.filter((a) => getStatus(a) === "upcoming").length;
      const done = assignmentsData.filter((a) => getStatus(a) === "done").length;
      stats.innerHTML = `
      <span class="mr-assignments__stats-item">
        <span class="mr-status-dot mr-status-dot--overdue"></span> ${overdue} overdue
      </span>
      <span class="mr-assignments__stats-item">
        <span class="mr-status-dot mr-status-dot--soon"></span> ${soon} due soon
      </span>
      <span class="mr-assignments__stats-item">
        <span class="mr-status-dot mr-status-dot--upcoming"></span> ${upcoming} upcoming
      </span>
      <span class="mr-assignments__stats-item">
        <span class="mr-status-dot mr-status-dot--done"></span> ${done} done
      </span>
    `;
    }
  }
  function buildAssignmentItem(assignment, index) {
    const status = getStatus(assignment);
    const statusClass = status === "overdue" ? "mr-assignment-item--overdue" : status === "soon" ? "mr-assignment-item--soon" : "";
    return `
    <div class="mr-assignment-item ${statusClass} mr-animate-fadeInUp" style="animation-delay: ${index * 30}ms">
      <div class="mr-assignment-item__status">
        <span class="mr-status-dot mr-status-dot--${status}"></span>
      </div>
      <div class="mr-assignment-item__content">
        <div class="mr-assignment-item__name">
          <a href="${assignment.url}">${assignment.name}</a>
        </div>
        <div class="mr-assignment-item__meta">
          ${assignment.course ? `<span class="mr-badge mr-badge--gray">${assignment.course}</span>` : ""}
          ${assignment.dueDate ? `<span class="mr-assignment-item__due">
                 ${getIcon("clock", 12)} ${formatDueDate(assignment.dueDate)}
               </span>` : ""}
        </div>
      </div>
    </div>
  `;
  }
  function extractAssignments() {
    const assignments = [];
    const seen = /* @__PURE__ */ new Set();
    const timelineItems = document.querySelectorAll(
      '[data-region="timeline"] .list-group-item, [data-region="timeline"] [data-region="event-list-item"], [data-region="event-list-content-container"] [data-region="event-list-item"]'
    );
    timelineItems.forEach((item) => {
      const link = item.querySelector("a");
      const name = link?.textContent?.trim() || item.querySelector(".event-name-container")?.textContent?.trim();
      if (!name || seen.has(name)) return;
      seen.add(name);
      const courseEl = item.querySelector(".course-name, .text-muted small");
      const dateEl = item.querySelector("time, [datetime], .date");
      let dueDate = null;
      if (dateEl) {
        const dt = dateEl.getAttribute("datetime") || dateEl.textContent?.trim();
        try {
          dueDate = new Date(dt);
          if (isNaN(dueDate.getTime())) dueDate = null;
        } catch {
          dueDate = null;
        }
      }
      assignments.push({
        name,
        url: link?.href || "#",
        course: courseEl?.textContent?.trim() || "",
        dueDate,
        completed: false,
        type: "timeline"
      });
    });
    const courseAssignments = document.querySelectorAll(".activity.modtype_assign");
    courseAssignments.forEach((act) => {
      const link = act.querySelector(".activityinstance a, .aalink, .activity-name-area a");
      const name = link?.textContent?.trim();
      if (!name || seen.has(name)) return;
      seen.add(name);
      const isCompleted = !!act.querySelector(".completion-info .badge-success, .complete");
      assignments.push({
        name,
        url: link?.href || "#",
        course: document.querySelector("#page-header h1, .page-context-header h1")?.textContent?.trim() || "",
        dueDate: null,
        completed: isCompleted,
        type: "course"
      });
    });
    return assignments;
  }
  function getStatus(assignment) {
    if (assignment.completed) return "done";
    if (!assignment.dueDate) return "upcoming";
    const now = /* @__PURE__ */ new Date();
    const due = new Date(assignment.dueDate);
    const hoursLeft = (due - now) / (1e3 * 60 * 60);
    if (hoursLeft < 0) return "overdue";
    if (hoursLeft < 48) return "soon";
    return "upcoming";
  }
  function formatDueDate(date) {
    if (!date) return "";
    const now = /* @__PURE__ */ new Date();
    const due = new Date(date);
    const diff = due - now;
    const hours = Math.abs(diff) / (1e3 * 60 * 60);
    const days = Math.floor(hours / 24);
    if (diff < 0) {
      if (hours < 1) return "Just overdue";
      if (hours < 24) return `${Math.floor(hours)}h overdue`;
      return `${days}d overdue`;
    } else {
      if (hours < 1) return "Due very soon";
      if (hours < 24) return `Due in ${Math.floor(hours)}h`;
      if (days === 1) return "Due tomorrow";
      return `Due in ${days} days`;
    }
  }

  // content/features/shortcuts.js
  var SHORTCUTS = {
    "d": () => navigateTo("/my/"),
    "c": () => navigateTo("/my/courses.php"),
    "a": () => toggleAssignmentTracker(),
    "[": () => toggleSidebar(),
    "/": () => focusSearch(),
    "Escape": () => closeOverlays()
  };
  function navigateTo(path) {
    const base = getMoodleBase3();
    window.location.href = base + path;
  }
  function getMoodleBase3() {
    const match = window.location.pathname.match(/^(\/[^/]+\/)/);
    return match ? match[1].replace(/\/$/, "") : "";
  }
  function toggleAssignmentTracker() {
    const overlay = document.querySelector(".mr-assignments-overlay");
    if (overlay) {
      overlay.classList.toggle("active");
    }
  }
  function toggleSidebar() {
    const sidebar = document.querySelector(".mr-sidebar");
    if (sidebar) {
      sidebar.classList.toggle("collapsed");
      const body = document.body;
      if (sidebar.classList.contains("collapsed")) {
        body.classList.remove("mr-sidebar-active");
        body.classList.add("mr-sidebar-collapsed");
      } else {
        body.classList.remove("mr-sidebar-collapsed");
        body.classList.add("mr-sidebar-active");
      }
    }
  }
  function focusSearch() {
    const searchInput = document.querySelector('input[name="q"], input[type="search"], .simplesearchform input');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }
  function closeOverlays() {
    const overlay = document.querySelector(".mr-assignments-overlay.active");
    if (overlay) {
      overlay.classList.remove("active");
      return;
    }
    const modal = document.querySelector(".modal.show");
    if (modal) {
      const closeBtn = modal.querySelector('[data-dismiss="modal"], .btn-close');
      if (closeBtn) closeBtn.click();
    }
  }
  function initShortcuts() {
    document.addEventListener("keydown", (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) {
        if (e.key !== "Escape") return;
      }
      if ((e.ctrlKey || e.metaKey || e.altKey) && e.key !== "Escape") return;
      const handler = SHORTCUTS[e.key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    });
  }

  // content/main.js
  async function init() {
    console.log("[MoodleRedesign] Initializing...");
    const settings = await getSettings();
    if (!settings.enabled) {
      console.log("[MoodleRedesign] Extension disabled.");
      return;
    }
    const pageType = getPageType();
    console.log(`[MoodleRedesign] Page type: ${pageType}`);
    try {
      if (settings.sidebar) {
        await initSidebar();
      }
      if (settings.clutterRemoval) {
        initClutterRemoval();
      }
      if (settings.darkMode) {
      }
      if (pageType === "dashboard") {
        await initDashboard();
      }
      if (pageType === "course-view") {
        await initCoursePage();
      }
      if (settings.assignmentTracker) {
        initAssignmentTracker();
      }
      initShortcuts();
      console.log("[MoodleRedesign] Ready \u2713");
    } catch (e) {
      console.error("[MoodleRedesign] Init error:", e);
    }
    onSettingsChange((newSettings) => {
      console.log("[MoodleRedesign] Settings changed, reloading...");
      window.location.reload();
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
