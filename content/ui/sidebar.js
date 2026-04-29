/**
 * Sidebar Navigation Module
 * Notion-inspired fixed left sidebar replacing the Moodle top navbar.
 */
import { getIcon } from '../utils/icons.js';
import { getSettings, saveSettings } from '../utils/storage.js';
import { getPageType, createElement } from '../utils/dom.js';

const COURSE_COLORS = [
  'var(--accent-blue)',
  'var(--accent-purple)',
  'var(--accent-cyan)',
  'var(--accent-green)',
  'var(--accent-amber)',
  'var(--accent-pink)',
];

const BRAND_NAME = 'Lauxup';
const BRAND_SUBTITLE = 'UCSC';
const BRAND_LOGO_PATH = 'icons/ucsc_logo.jpg';

/**
 * Initialize the sidebar.
 */
export async function initSidebar() {
  const settings = await getSettings();
  const userName = extractUserName();
  const courses = extractCourses();
  const currentPage = getPageType();
  const moodleBase = getMoodleBase();

  const sidebar = createElement('nav', {
    className: `mr-sidebar mr-animate-slideInLeft ${settings.sidebarCollapsed ? 'collapsed' : ''}`,
    'aria-label': 'Main navigation',
  });

  sidebar.innerHTML = buildSidebarHTML(userName, courses, currentPage, moodleBase, settings);
  document.body.prepend(sidebar);

  if (settings.sidebarCollapsed) {
    document.body.classList.add('mr-sidebar-collapsed');
  } else {
    document.body.classList.add('mr-sidebar-active');
  }

  const scrim = createElement('div', { className: 'mr-sidebar-scrim' });
  scrim.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    scrim.classList.remove('active');
  });
  document.body.prepend(scrim);

  setupSidebarEvents(sidebar, scrim);
  updateSidebarToggle(sidebar);
}

function buildSidebarHTML(userName, courses, currentPage, base, settings) {
  const brandLogoUrl = chrome.runtime.getURL(BRAND_LOGO_PATH);
  const navItems = [
    { icon: 'home', label: 'Dashboard', path: '/my/', page: 'dashboard' },
    { icon: 'book-open', label: 'My Courses', path: '/my/courses.php', page: 'courses', key: 'courses' },
    { icon: 'clipboard-list', label: 'Assignments', action: 'assignments', page: null },
    { icon: 'calendar', label: 'Calendar', path: '/calendar/view.php?view=month', page: 'calendar' },
  ];

  const initials = userName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const orderedCourses = orderCourses(courses, settings.pinnedCourses || []);
  const isCourseContext = currentPage === 'courses' || orderedCourses.some((course) => isCurrentCourse(course.url));

  let html = `
    <div class="mr-sidebar__brand">
      <a href="https://ugvle.ucsc.cmb.ac.lk/" class="mr-sidebar__brand-link">
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

    <div class="mr-sidebar__nav">
      <div class="mr-sidebar__section-title">Navigation</div>
  `;

  for (const item of navItems) {
    const isActive = item.key === 'courses' ? isCourseContext : item.page === currentPage;
    html += buildNavItem(item, base, isActive);

    if (item.key === 'courses' && orderedCourses.length > 0) {
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
    const logoutUrl = nativeLogoutLink ? nativeLogoutLink.href : `${getMoodleBase()}/login/logout.php`;

    html += `
      <div class="mr-sidebar__user">
        <div class="mr-avatar">${initials}</div>
        <div class="mr-sidebar__user-info">
          <a href="${getMoodleBase()}/user/profile.php" class="mr-sidebar__user-name" style="text-decoration:none;">${userName}</a>
          <a href="${logoutUrl}" class="mr-sidebar__user-role" style="text-decoration:none; color: var(--danger);">Log Out</a>
        </div>
        <span class="mr-sidebar__nav-icon" style="cursor:pointer" data-action="settings" title="Preferences">
          ${getIcon('settings', 16)}
        </span>
      </div>
    `;
  }

  return html;
}

function buildNavItem(item, base, isActive) {
  const href = item.path ? `${base}${item.path}` : '#';
  const actionAttr = item.action ? `data-action="${item.action}"` : '';

  return `
    <a class="mr-sidebar__nav-item ${isActive ? 'active' : ''}" href="${href}" ${actionAttr}>
      <span class="mr-sidebar__nav-icon">${getIcon(item.icon, 18)}</span>
      <span class="mr-sidebar__label">${item.label}</span>
    </a>
  `;
}

function buildCourseItem(course, index, pinnedUrls) {
  const color = COURSE_COLORS[index % COURSE_COLORS.length];
  const pinned = pinnedUrls.includes(course.url);

  return `
    <a class="mr-sidebar__nav-item mr-sidebar__course-item ${isCurrentCourse(course.url) ? 'active' : ''}" href="${course.url}">
      <span class="mr-sidebar__course-dot" style="background:${color}"></span>
      <span class="mr-sidebar__label mr-sidebar__course-label">${course.shortName}</span>
      <span class="mr-sidebar__pin-btn ${pinned ? 'pinned' : ''}" data-action="toggle-pin" data-url="${course.url}" title="${pinned ? 'Unpin' : 'Pin'}">
        ${getIcon('star', 14)}
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
  return getIcon(isCollapsed ? 'chevron-right' : 'chevron-left', 16);
}

function updateSidebarToggle(sidebar) {
  const toggle = sidebar.querySelector('.mr-sidebar__toggle');
  if (!toggle) return;

  const isCollapsed = sidebar.classList.contains('collapsed');
  toggle.innerHTML = getSidebarToggleIcon(isCollapsed);
  toggle.title = isCollapsed ? 'Expand sidebar ([)' : 'Collapse sidebar ([)';
  toggle.setAttribute('aria-label', toggle.title);
}

function getLoginUrl() {
  const loginLink = document.querySelector('.logininfo a[href*="login/"]');
  if (loginLink && loginLink.textContent.toLowerCase().includes('log in')) {
    return loginLink.href;
  }

  const userMenu = document.querySelector('.usermenu, #user-menu-toggle, .userbutton');
  if (!userMenu) {
    return `${getMoodleBase()}/login/index.php`;
  }

  return null;
}

function setupSidebarEvents(sidebar, scrim) {
  sidebar.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;

    if (action === 'toggle-pin') {
      event.preventDefault();
      event.stopPropagation();

      const url = target.dataset.url;
      const settings = await getSettings();
      let pinned = settings.pinnedCourses || [];

      if (pinned.includes(url)) {
        pinned = pinned.filter((item) => item !== url);
      } else {
        pinned.push(url);
      }

      await saveSettings({ pinnedCourses: pinned });
      return;
    }

    if (action === 'toggle-sidebar') {
      event.preventDefault();
      sidebar.classList.toggle('collapsed');
      const isCollapsed = sidebar.classList.contains('collapsed');

      document.body.classList.toggle('mr-sidebar-active', !isCollapsed);
      document.body.classList.toggle('mr-sidebar-collapsed', isCollapsed);

      updateSidebarToggle(sidebar);
      await saveSettings({ sidebarCollapsed: isCollapsed });
      return;
    }

    if (action === 'assignments') {
      event.preventDefault();
      const overlay = document.querySelector('.mr-assignments-overlay');
      if (overlay) {
        overlay.classList.add('active');
      }
      return;
    }

    if (action === 'settings') {
      window.location.href = `${getMoodleBase()}/user/preferences.php`;
    }
  });

  if (window.innerWidth <= 768) {
    const hamburger = createElement('button', {
      className: 'mr-btn--icon',
      style: {
        position: 'fixed',
        top: '12px',
        left: '12px',
        zIndex: '1048',
        background: 'var(--bg-surface-2)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: '8px',
        color: 'var(--text-primary)',
      },
      onClick: () => {
        sidebar.classList.toggle('mobile-open');
        scrim.classList.toggle('active');
      },
    });

    hamburger.innerHTML = getIcon('menu', 20);
    document.body.prepend(hamburger);
  }
}

function extractUserName() {
  const userMenu = document.querySelector('#user-menu-toggle .usertext, .usermenu .usertext, .userbutton .usertext');
  if (userMenu) return userMenu.textContent.trim();

  const userLink = document.querySelector('.usermenu a[title], .userbutton');
  if (userLink) return userLink.title || userLink.textContent.trim();

  return 'Student';
}

function extractCourses() {
  const courses = [];
  const seen = new Set();

  const cards = document.querySelectorAll('.card.dashboard-card, .coursebox, [data-region="course-content"] .coursename a');
  cards.forEach((card) => {
    const link = card.querySelector('a.aalink, a.coursename, .coursename a') || card;
    if (!link.href) return;

    const name = link.textContent?.trim() || card.querySelector('.coursename')?.textContent?.trim();
    if (!name || seen.has(link.href)) return;

    seen.add(link.href);
    courses.push({
      name,
      shortName: shortenCourseName(name),
      url: link.href,
    });
  });

  if (courses.length === 0) {
    const navCourses = document.querySelectorAll('#nav-drawer .list-group-item[data-key^="course"], .courselistitem a');
    navCourses.forEach((item) => {
      const href = item.href || item.querySelector('a')?.href;
      const name = item.textContent?.trim();
      if (!href || !name || seen.has(href)) return;

      seen.add(href);
      courses.push({
        name,
        shortName: shortenCourseName(name),
        url: href,
      });
    });
  }

  if (courses.length === 0) {
    const overviewItems = document.querySelectorAll('[data-region="paged-content-page"] [data-region="course-content"]');
    overviewItems.forEach((item) => {
      const link = item.querySelector('a');
      const name = item.querySelector('.coursename')?.textContent?.trim() || link?.textContent?.trim();
      if (!link?.href || !name || seen.has(link.href)) return;

      seen.add(link.href);
      courses.push({
        name,
        shortName: shortenCourseName(name),
        url: link.href,
      });
    });
  }

  return courses.slice(0, 15);
}

function shortenCourseName(name) {
  const codeMatch = name.match(/[A-Z]{2,4}\s?\d{3,4}/);
  if (codeMatch) return codeMatch[0];

  if (name.length > 25) return `${name.substring(0, 25)}...`;
  return name;
}

function isCurrentCourse(url) {
  return window.location.href.includes(url);
}

function getMoodleBase() {
  const firstSegment = window.location.pathname.split('/').filter(Boolean)[0] || '';
  const rootRoutes = new Set([
    'admin', 'badges', 'blocks', 'calendar', 'course', 'grade', 'login',
    'message', 'mod', 'my', 'pluginfile.php', 'report', 'theme', 'user',
  ]);

  return firstSegment && !rootRoutes.has(firstSegment) ? `/${firstSegment}` : '';
}
