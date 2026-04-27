/**
 * Dashboard Redesign Module
 * Replaces the default Moodle dashboard with a modern card-based layout.
 */
import { getIcon } from '../utils/icons.js';
import { getPageType, createElement, waitForElement, extractText } from '../utils/dom.js';

/**
 * Initialize dashboard redesign.
 */
export async function initDashboard() {
  if (getPageType() !== 'dashboard') return;

  try {
    const mainRegion = await waitForElement('#region-main', 5000);
    
    // Create our dashboard container
    const dashboard = createElement('div', { className: 'mr-dashboard mr-animate-fadeIn' });
    mainRegion.prepend(dashboard);
    let updateTimer = null;

    const updateDashboard = () => {
      const userName = extractUserName();
      const courses = extractCourseCards();
      const timeline = extractTimelineItems();
      
      dashboard.innerHTML = buildDashboardHTML(userName, courses, timeline);
      
      requestAnimationFrame(() => {
        animateProgressRings();
      });

      // Hide native content (but keep it in DOM so Moodle AJAX still works)
      Array.from(mainRegion.children).forEach(child => {
        if (child !== dashboard) {
          child.style.display = 'none';
        }
      });
    };

    // Initial render
    updateDashboard();

    // Observe DOM for Moodle's AJAX injecting courses
    const observer = new MutationObserver((mutations) => {
      const isNativeChange = mutations.some(m => !dashboard.contains(m.target));
      if (isNativeChange) {
        // Debounce slightly
        clearTimeout(updateTimer);
        updateTimer = setTimeout(() => {
          updateDashboard();
        }, 100);
      }
    });

    observer.observe(mainRegion, { childList: true, subtree: true });

  } catch (e) {
    console.warn('[MoodleRedesign] Dashboard init failed:', e.message);
  }
}

function buildDashboardHTML(userName, courses, timeline) {
  const greeting = getGreeting();
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const todayItems = timeline.filter((item) => {
    if (!item.dueDate) return false;
    const now = new Date();
    const due = new Date(item.dueDate);
    const diff = (due - now) / (1000 * 60 * 60);
    return diff <= 24 && diff > -48; // Due within 24h or overdue by up to 48h
  });

  const pendingCount = timeline.filter(i => !i.completed).length;
  const totalCourses = courses.length;
  const avgProgress = courses.length > 0
    ? Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / courses.length)
    : 0;

  let html = '';

  // Greeting
  html += `
    <div class="mr-greeting">
      <h1 class="mr-greeting__title">${greeting}, ${firstName(userName)}</h1>
      <p class="mr-greeting__subtitle">${today}</p>
    </div>
  `;

  // Quick stats
  html += `
    <div class="mr-stats mr-stagger">
      <div class="mr-stat-card">
        <div class="mr-stat-card__icon">${getIcon('book-open', 20)}</div>
        <div class="mr-stat-card__value">${totalCourses}</div>
        <div class="mr-stat-card__label">Courses</div>
      </div>
      <div class="mr-stat-card">
        <div class="mr-stat-card__icon">${getIcon('clipboard-list', 20)}</div>
        <div class="mr-stat-card__value">${pendingCount}</div>
        <div class="mr-stat-card__label">Pending</div>
      </div>
      <div class="mr-stat-card">
        <div class="mr-stat-card__icon">${getIcon('bar-chart', 20)}</div>
        <div class="mr-stat-card__value">${avgProgress}%</div>
        <div class="mr-stat-card__label">Progress</div>
      </div>
      <div class="mr-stat-card">
        <div class="mr-stat-card__icon">${getIcon('zap', 20)}</div>
        <div class="mr-stat-card__value">${todayItems.length}</div>
        <div class="mr-stat-card__label">Due Today</div>
      </div>
    </div>
  `;

  // Today panel
  html += buildTodayPanel(todayItems);

  // Course cards
  if (courses.length > 0) {
    html += `<div class="mr-section-header">${getIcon('book-open', 18)} My Courses</div>`;
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
          ${getIcon('clock', 16)} Due Today
        </div>
        <span class="mr-today__count">${items.length} item${items.length !== 1 ? 's' : ''}</span>
      </div>
  `;

  if (items.length === 0) {
    html += `
      <div class="mr-empty" style="padding: var(--space-lg);">
        <div class="mr-empty__icon mr-animate-float">${getIcon('sparkles', 32)}</div>
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
            <a href="${item.url || '#'}">${item.name}</a>
            ${item.course ? `<div class="mr-today__item-course">${item.course}</div>` : ''}
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
  const offset = circumference - (progress / 100) * circumference;
  const gradientId = createProgressGradientId(course);

  return `
    <a class="mr-course-card" href="${course.url}">
      <div class="mr-course-card__header">
        <div class="mr-course-card__info">
          <h3 class="mr-course-card__name">${course.name}</h3>
          <div class="mr-course-card__meta">
            ${course.category ? `<span>${course.category}</span>` : ''}
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
        ${course.nextDeadline
          ? `<div class="mr-course-card__deadline">
               ${getIcon('clock', 14)}
               <span>${course.nextDeadline}</span>
             </div>`
          : `<div class="mr-course-card__deadline" style="color: var(--text-muted)">No upcoming deadlines</div>`
        }
      </div>
    </a>
  `;
}

function animateProgressRings() {
  const rings = document.querySelectorAll('.mr-progress-ring__fill');
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
  const seed = course.url || course.name || 'course';
  return `mr-progress-gradient-${seed.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'course'}`;
}

function extractProgressValue(container) {
  const sources = container.querySelectorAll(
    '.progress-bar, [role="progressbar"], [data-progress], .progress-percent, .progress-percentage, .percentage, .progress-text'
  );

  for (const source of sources) {
    const rawValues = [
      source.getAttribute('aria-valuenow'),
      source.getAttribute('data-progress'),
      source.style?.width,
      source.textContent,
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
  if (rawValue === null || rawValue === undefined) return null;
  const match = String(rawValue).match(/(\d{1,3})(?:\.\d+)?\s*%?/);
  if (!match) return null;
  return normalizeProgress(match[1]);
}

// === Data Extraction ===

function extractUserName() {
  const candidates = [
    document.querySelector('#user-menu-toggle .usertext, .usermenu .usertext, .userbutton .usertext')?.textContent,
    document.querySelector('.usermenu a[title], .userbutton[title], #user-menu-toggle[title]')?.getAttribute('title'),
    document.querySelector('.mr-sidebar__user-name')?.textContent,
    document.querySelector(
      'a[href*="/user/profile.php"] .media-body, a[href*="/user/profile.php"] .usertext, a[href*="/user/profile.php"][title]'
    )?.getAttribute('title'),
    document.querySelector(
      'a[href*="/user/profile.php"] .media-body, a[href*="/user/profile.php"] .usertext, a[href*="/user/profile.php"][title]'
    )?.textContent,
    document.querySelector('.userpicture[alt], .avatar img[alt]')?.getAttribute('alt'),
  ];

  const normalizedCandidates = candidates
    .map(normalizeUserNameCandidate)
    .filter(Boolean);

  return normalizedCandidates.sort((left, right) => scoreUserNameCandidate(right) - scoreUserNameCandidate(left))[0] || 'Student';
}

function normalizeUserNameCandidate(value) {
  if (!value) return '';

  let candidate = String(value)
    .split('\n')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');

  candidate = candidate.replace(/\s+/g, ' ').trim();
  candidate = candidate.replace(/^(?:user\s+picture|picture)\s+of\s+/i, '');
  candidate = candidate.replace(/^(?:view|edit)\s+(?:full\s+)?profile\s+(?:of\s+)?/i, '');
  candidate = candidate.replace(/^(?:view|edit)\s+(?:my\s+)?profile\s*/i, '');
  candidate = candidate.replace(/^profile\s+(?:of\s+)?/i, '');
  candidate = candidate.replace(/^logged in as\s+/i, '');
  candidate = candidate.replace(/^user:\s*/i, '');

  return isLikelyUserName(candidate) ? candidate : '';
}

function isLikelyUserName(candidate) {
  if (!candidate || candidate.length < 2) return false;
  if (/[<>@/\\]/.test(candidate)) return false;

  return !/^(?:view|profile|preferences|dashboard|log(?:ged)?\s*in|log(?:ged)?\s*out|edit|user\s*menu)$/i.test(candidate);
}

function scoreUserNameCandidate(candidate) {
  let score = candidate.length;

  if (candidate.includes(' ')) score += 20;
  if (/^[A-Z]{2,4}$/.test(candidate)) score += 8;
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(candidate)) score += 30;

  return score;
}

function extractCourseCards() {
  const courses = [];
  const seen = new Set();

  // Dashboard course cards
  const cards = document.querySelectorAll('.card.dashboard-card');
  cards.forEach((card) => {
    const link = card.querySelector('a.aalink, a.coursename, .coursename a, a[href*="course/view"]');
    if (!link?.href || seen.has(link.href)) return;
    seen.add(link.href);

    const nameNode = card.querySelector('.coursename') 
      || card.querySelector('.multiline .aalink') 
      || link;
    const name = extractText(nameNode);

    const progress = extractProgressValue(card);

    const category = card.querySelector('.categoryname, .text-muted')?.textContent?.trim() || '';

    courses.push({ name, url: link.href, progress, category, nextDeadline: null });
  });

  // Course overview (block_myoverview)
  if (courses.length === 0) {
    const overviewCards = document.querySelectorAll('[data-region="paged-content-page"] [data-region="course-content"]');
    overviewCards.forEach((card) => {
      const link = card.querySelector('a[href*="course/view"]');
      if (!link?.href || seen.has(link.href)) return;
      seen.add(link.href);

      const nameNode = card.querySelector('.coursename') || link;
      const name = extractText(nameNode);
      const progress = extractProgressValue(card);

      courses.push({ name, url: link.href, progress, category: '', nextDeadline: null });
    });
  }

  // Frontpage course boxes
  if (courses.length === 0) {
    const courseBoxes = document.querySelectorAll('.coursebox');
    courseBoxes.forEach((box) => {
      const link = box.querySelector('.coursename a');
      if (!link?.href || seen.has(link.href)) return;
      seen.add(link.href);

      const name = link.textContent.trim();
      courses.push({ name, url: link.href, progress: 0, category: '', nextDeadline: null });
    });
  }

  return courses;
}

function extractTimelineItems() {
  const items = [];

  // From timeline block
  const timelineItems = document.querySelectorAll('[data-region="timeline"] .list-group-item, [data-region="timeline"] [data-region="event-list-item"]');
  timelineItems.forEach((item) => {
    const link = item.querySelector('a');
    const name = link?.textContent?.trim() || item.querySelector('.event-name')?.textContent?.trim();
    if (!name) return;

    const courseEl = item.querySelector('.course-name, .text-muted');
    const dateEl = item.querySelector('.date, time, [data-region="event-date"]');

    let dueDate = null;
    if (dateEl) {
      const datetime = dateEl.getAttribute('datetime') || dateEl.textContent?.trim();
      try {
        dueDate = new Date(datetime);
        if (isNaN(dueDate.getTime())) dueDate = null;
      } catch {
        dueDate = null;
      }
    }

    items.push({
      name,
      url: link?.href || '#',
      course: courseEl?.textContent?.trim() || '',
      dueDate,
      completed: false,
    });
  });

  return items;
}

// === Helpers ===

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstName(fullName) {
  return fullName.split(' ')[0] || fullName;
}

function getItemStatus(item) {
  if (!item.dueDate) return 'upcoming';
  const now = new Date();
  const due = new Date(item.dueDate);
  const hoursLeft = (due - now) / (1000 * 60 * 60);

  if (hoursLeft < 0) return 'overdue';
  if (hoursLeft < 48) return 'soon';
  return 'upcoming';
}

function formatRelativeTime(date) {
  if (!date) return '';
  const now = new Date();
  const diff = date - now;
  const hours = Math.abs(diff) / (1000 * 60 * 60);
  const days = Math.floor(hours / 24);

  if (diff < 0) {
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    return `${days}d ago`;
  } else {
    if (hours < 1) return 'Due soon';
    if (hours < 24) return `in ${Math.floor(hours)}h`;
    return `in ${days}d`;
  }
}
