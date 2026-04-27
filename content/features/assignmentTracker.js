/**
 * Assignment Tracker Module
 * Unified assignment view with filtering and status tracking.
 */
import { getIcon } from '../utils/icons.js';
import { createElement } from '../utils/dom.js';

let assignmentsData = [];
let currentFilter = 'all';

/**
 * Initialize the assignment tracker.
 */
export function initAssignmentTracker() {
  // Extract assignments from the page
  assignmentsData = extractAssignments();

  // Build the overlay
  const overlay = buildOverlay();
  document.body.appendChild(overlay);

  // Populate the list
  renderAssignments();
}

function buildOverlay() {
  const overlay = createElement('div', { className: 'mr-assignments-overlay' });

  overlay.innerHTML = `
    <div class="mr-assignments-scrim" data-action="close-assignments"></div>
    <div class="mr-assignments-panel">
      <div class="mr-assignments__header">
        <div class="mr-assignments__title">
          ${getIcon('clipboard-list', 20)} Assignments
        </div>
        <button class="mr-assignments__close" data-action="close-assignments">
          ${getIcon('x', 18)}
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

  // Event delegation
  overlay.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (action?.dataset.action === 'close-assignments') {
      overlay.classList.remove('active');
    }

    const filterBtn = e.target.closest('[data-filter]');
    if (filterBtn) {
      currentFilter = filterBtn.dataset.filter;
      overlay.querySelectorAll('.mr-filter-pill').forEach(p => p.classList.remove('active'));
      filterBtn.classList.add('active');
      renderAssignments();
    }
  });

  return overlay;
}

function renderAssignments() {
  const list = document.getElementById('mr-assignments-list');
  const stats = document.getElementById('mr-assignments-stats');
  if (!list) return;

  // Filter
  let filtered = assignmentsData;
  if (currentFilter !== 'all') {
    filtered = assignmentsData.filter(a => getStatus(a) === currentFilter);
  }

  // Sort by due date (soonest first, null at end)
  filtered.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="mr-empty">
        <div class="mr-empty__icon mr-animate-float">${getIcon('sparkles', 40)}</div>
        <div class="mr-empty__title">${currentFilter === 'all' ? 'No assignments found' : 'All clear!'}</div>
        <div class="mr-empty__desc">
          ${currentFilter === 'all'
            ? 'Navigate to your course pages to populate this tracker.'
            : `No ${currentFilter} assignments right now.`
          }
        </div>
      </div>
    `;
  } else {
    list.innerHTML = filtered.map((a, i) => buildAssignmentItem(a, i)).join('');
  }

  // Stats
  if (stats) {
    const overdue = assignmentsData.filter(a => getStatus(a) === 'overdue').length;
    const soon = assignmentsData.filter(a => getStatus(a) === 'soon').length;
    const upcoming = assignmentsData.filter(a => getStatus(a) === 'upcoming').length;
    const done = assignmentsData.filter(a => getStatus(a) === 'done').length;

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
  const statusClass = status === 'overdue' ? 'mr-assignment-item--overdue'
    : status === 'soon' ? 'mr-assignment-item--soon' : '';

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
          ${assignment.course
            ? `<span class="mr-badge mr-badge--gray">${assignment.course}</span>`
            : ''
          }
          ${assignment.dueDate
            ? `<span class="mr-assignment-item__due">
                 ${getIcon('clock', 12)} ${formatDueDate(assignment.dueDate)}
               </span>`
            : ''
          }
        </div>
      </div>
    </div>
  `;
}

// === Data Extraction ===

function extractAssignments() {
  const assignments = [];
  const seen = new Set();

  // Source 1: Timeline block
  const timelineItems = document.querySelectorAll(
    '[data-region="timeline"] .list-group-item, ' +
    '[data-region="timeline"] [data-region="event-list-item"], ' +
    '[data-region="event-list-content-container"] [data-region="event-list-item"]'
  );

  timelineItems.forEach((item) => {
    const link = item.querySelector('a');
    const name = link?.textContent?.trim() || item.querySelector('.event-name-container')?.textContent?.trim();
    if (!name || seen.has(name)) return;
    seen.add(name);

    const courseEl = item.querySelector('.course-name, .text-muted small');
    const dateEl = item.querySelector('time, [datetime], .date');

    let dueDate = null;
    if (dateEl) {
      const dt = dateEl.getAttribute('datetime') || dateEl.textContent?.trim();
      try {
        dueDate = new Date(dt);
        if (isNaN(dueDate.getTime())) dueDate = null;
      } catch { dueDate = null; }
    }

    assignments.push({
      name,
      url: link?.href || '#',
      course: courseEl?.textContent?.trim() || '',
      dueDate,
      completed: false,
      type: 'timeline',
    });
  });

  // Source 2: Course activities (assignments on course pages)
  const courseAssignments = document.querySelectorAll('.activity.modtype_assign');
  courseAssignments.forEach((act) => {
    const link = act.querySelector('.activityinstance a, .aalink, .activity-name-area a');
    const name = link?.textContent?.trim();
    if (!name || seen.has(name)) return;
    seen.add(name);

    const isCompleted = !!act.querySelector('.completion-info .badge-success, .complete');

    assignments.push({
      name,
      url: link?.href || '#',
      course: document.querySelector('#page-header h1, .page-context-header h1')?.textContent?.trim() || '',
      dueDate: null,
      completed: isCompleted,
      type: 'course',
    });
  });

  return assignments;
}

// === Helpers ===

function getStatus(assignment) {
  if (assignment.completed) return 'done';
  if (!assignment.dueDate) return 'upcoming';

  const now = new Date();
  const due = new Date(assignment.dueDate);
  const hoursLeft = (due - now) / (1000 * 60 * 60);

  if (hoursLeft < 0) return 'overdue';
  if (hoursLeft < 48) return 'soon';
  return 'upcoming';
}

function formatDueDate(date) {
  if (!date) return '';
  const now = new Date();
  const due = new Date(date);
  const diff = due - now;
  const hours = Math.abs(diff) / (1000 * 60 * 60);
  const days = Math.floor(hours / 24);

  if (diff < 0) {
    if (hours < 1) return 'Just overdue';
    if (hours < 24) return `${Math.floor(hours)}h overdue`;
    return `${days}d overdue`;
  } else {
    if (hours < 1) return 'Due very soon';
    if (hours < 24) return `Due in ${Math.floor(hours)}h`;
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  }
}
