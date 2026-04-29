/**
 * Course Page Redesign Module
 * Enhances Moodle course pages with collapsible sections, activity icons, and progress.
 */
import { getIcon } from '../utils/icons.js';
import { getPageType, waitForElement, createElement } from '../utils/dom.js';

/**
 * Initialize course page redesign.
 */
export async function initCoursePage() {
  if (getPageType() !== 'course-view') return;

  try {
    await waitForElement('.course-content', 5000);
    enhanceSections();
  } catch (e) {
    console.warn('[MoodleRedesign] Course page init failed:', e.message);
  }
}

function enhanceSections() {
  const courseContent = document.querySelector('.course-content');
  if (!courseContent) return;

  const sections = courseContent.querySelectorAll('.section.main, li.section');
  if (sections.length === 0) return;

  const mainRegion = document.querySelector('#region-main');
  if (!mainRegion) return;

  let header = document.querySelector('.mr-course-header');
  if (!header) {
    header = createElement('div', { className: 'mr-course-header mr-animate-fadeInDown' });
    header.innerHTML = buildHeaderHTML();
  }

  let wrapper = document.querySelector('.mr-course-sections');
  if (!wrapper) {
    wrapper = createElement('div', { className: 'mr-course-sections mr-animate-fadeIn' });
  }

  const originalContent = mainRegion.querySelector('.course-content');
  if (originalContent) {
    originalContent.style.position = 'absolute';
    originalContent.style.left = '-9999px';
    originalContent.style.visibility = 'hidden';
    originalContent.style.height = '0';
    originalContent.style.overflow = 'hidden';
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
    '#page-header .page-header-headings h1, .page-context-header .page-header-headings h1'
  );
  const title = courseTitle?.textContent?.trim() || 'Course';

  return `
    <h1 class="mr-course-header__title">${title}</h1>
    <div class="mr-course-header__breadcrumb">
      <a href="${getMoodleBase()}/my/">${getIcon('home', 14)} Dashboard</a>
      <span>&gt;</span>
      <span>${title}</span>
    </div>
  `;
}

function renderSections(courseContent, wrapper) {
  const sections = Array.from(courseContent.querySelectorAll('.section.main, li.section'));
  if (sections.length === 0) return;

  const expandedSections = new Set(
    Array.from(wrapper.querySelectorAll('.mr-section.expanded')).map((section) => section.dataset.sectionKey)
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

function buildSectionCard(section, index, isExpanded = false, sectionKey = '') {
  const titleEl = section.querySelector('.sectionname, .section-title h3, .course-section-header h3, .sectionname a');
  let title = titleEl?.textContent?.trim();
  if (!title) {
    title = index === 0 ? 'General' : `Topic ${index}`;
  }

  const activities = Array.from(section.querySelectorAll('.activity'));
  if (activities.length === 0 && index > 0) return null;

  const sectionProgress = getSectionProgress(activities);
  const card = createElement('div', {
    className: `mr-section ${isExpanded || index <= 1 ? 'expanded' : ''}`,
    dataset: { sectionKey },
  });

  let headerHTML = `
    <div class="mr-section__header" data-action="toggle-section">
      <div class="mr-section__header-left">
        <span class="mr-section__chevron">${getIcon('chevron-right', 16)}</span>
        <span class="mr-section__title">${title}</span>
        <span class="mr-section__count">${activities.length}</span>
      </div>
      ${sectionProgress.trackableCount > 0
        ? `<div class="mr-section__progress" title="${sectionProgress.completedCount} of ${sectionProgress.trackableCount} tracked activities completed">
             <div class="mr-section__progress-bar">
               <div class="mr-section__progress-fill" style="width: ${sectionProgress.percentage}%"></div>
             </div>
             <span class="mr-section__progress-text">${sectionProgress.percentage}%</span>
           </div>`
        : ''}
    </div>
  `;

  let contentHTML = '<div class="mr-section__content"><div class="mr-section__activity-list">';
  activities.forEach((activity, actIndex) => {
    contentHTML += buildActivityItem(activity, `${index}-${actIndex}`);
  });
  contentHTML += '</div></div>';

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

  const link = activity.querySelector('.activityinstance a, .aalink, .activity-name-area a');
  const name = link?.textContent?.trim() || activity.querySelector('.instancename')?.textContent?.trim() || 'Activity';
  const url = link?.href || '#';
  const desc = activity.querySelector('.contentafterlink, .activity-description, .text-muted')?.textContent?.trim() || '';
  const toggleLabel = completion.completed ? 'Mark as not done' : 'Mark as done';

  return `
    <div class="mr-activity">
      <div class="mr-activity__icon ${iconClass}">
        ${getIcon(icon, 18)}
      </div>
      <div class="mr-activity__info">
        <div class="mr-activity__name">
          <a href="${url}">${cleanName(name)}</a>
        </div>
        ${desc ? `<div class="mr-activity__desc">${truncate(desc, 60)}</div>` : ''}
      </div>
      ${completion.trackable
        ? `<div class="mr-activity__status">
             ${completion.toggleable
               ? `<button
                    type="button"
                    class="mr-activity__completion mr-activity__completion--${completion.completed ? 'done' : 'pending'}"
                    data-action="toggle-completion"
                    data-activity-id="${actId}"
                    aria-pressed="${completion.completed ? 'true' : 'false'}"
                    aria-label="${toggleLabel}"
                    title="${toggleLabel}"
                  >
                    ${getIcon('check', 12)}
                  </button>`
               : `<span class="mr-activity__completion mr-activity__completion--${completion.completed ? 'done' : 'pending'}" title="${completion.completed ? 'Completed automatically' : 'Not completed yet'}">
                    ${getIcon('check', 12)}
                  </span>`}
           </div>`
        : ''}
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
    percentage: summary.trackableCount > 0
      ? Math.round((summary.completedCount / summary.trackableCount) * 100)
      : 0,
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
    toggleable: !!toggleControl,
  };
}

function hasCompletedCompletionState(completionRoot, toggleControl) {
  if (toggleControl?.matches('input[type="checkbox"]')) {
    return toggleControl.checked;
  }

  if (toggleControl?.getAttribute('aria-pressed') === 'true' || toggleControl?.getAttribute('aria-checked') === 'true') {
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

  if (toggleControl?.getAttribute('aria-pressed') === 'false' || toggleControl?.getAttribute('aria-checked') === 'false') {
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
    completionRoot?.getAttribute('title'),
    completionRoot?.getAttribute('aria-label'),
    toggleControl?.textContent,
    toggleControl?.getAttribute('title'),
    toggleControl?.getAttribute('aria-label'),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getSectionKey(section, index) {
  return section.id || section.getAttribute('data-sectionid') || `section-${index}`;
}

function setupCourseInteractions(wrapper, courseContent) {
  if (wrapper.dataset.bound === 'true') return;
  wrapper.dataset.bound = 'true';

  wrapper.addEventListener('click', (event) => {
    const completionButton = event.target.closest('[data-action="toggle-completion"]');
    if (completionButton) {
      event.preventDefault();
      event.stopPropagation();
      toggleActivityCompletion(completionButton, courseContent, wrapper);
      return;
    }

    const sectionHeader = event.target.closest('[data-action="toggle-section"]');
    if (sectionHeader) {
      sectionHeader.closest('.mr-section')?.classList.toggle('expanded');
    }
  });
}

function observeCourseContent(courseContent, wrapper) {
  if (courseContent.dataset.mrObserved === 'true') return;
  courseContent.dataset.mrObserved = 'true';

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
    attributeFilter: ['class', 'aria-pressed', 'aria-checked', 'title', 'data-value'],
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
  button.classList.add('is-loading');
  button.setAttribute('aria-busy', 'true');

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

  if (
    control.matches(
      '[data-action="toggle-manual-completion"], .manual-completion button, .manual-completion [role="button"], .manualcompletion button, .manualcompletion [role="button"], .completion-container button, .completion-container input[type="checkbox"], [data-region="completionrequirements"] button'
    )
  ) {
    return true;
  }

  if (control.matches('[aria-pressed], [aria-checked]')) {
    return !!control.closest(
      '.completion-info, .completion-container, .activity-completion, [data-region="completionrequirements"], .manual-completion, .manualcompletion'
    );
  }

  if (control.matches('.completion-container a')) {
    const text = [
      control.textContent,
      control.getAttribute('title'),
      control.getAttribute('aria-label'),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return /mark as (?:done|complete)|completed|not completed/.test(text);
  }

  return false;
}

function getActivityType(activity) {
  const classes = activity.className || '';
  if (classes.includes('modtype_assign')) return 'assign';
  if (classes.includes('modtype_quiz')) return 'quiz';
  if (classes.includes('modtype_resource') || classes.includes('modtype_folder')) return 'resource';
  if (classes.includes('modtype_url')) return 'url';
  if (classes.includes('modtype_forum')) return 'forum';
  if (classes.includes('modtype_page')) return 'resource';
  if (classes.includes('modtype_label')) return 'resource';
  return 'resource';
}

function getActivityIcon(type) {
  const icons = {
    assign: 'pen-tool',
    quiz: 'help-circle',
    resource: 'file-text',
    url: 'link',
    forum: 'clipboard-list',
  };
  return icons[type] || 'file-text';
}

function cleanName(name) {
  return name.replace(/^\s+|\s+$/g, '').replace(/\s{2,}/g, ' ');
}

function truncate(str, len) {
  if (str.length <= len) return str;
  return str.substring(0, len) + '...';
}

function getMoodleBase() {
  const firstSegment = window.location.pathname.split('/').filter(Boolean)[0] || '';
  const rootRoutes = new Set([
    'admin', 'badges', 'blocks', 'calendar', 'course', 'grade', 'login',
    'message', 'mod', 'my', 'pluginfile.php', 'report', 'theme', 'user',
  ]);

  return firstSegment && !rootRoutes.has(firstSegment) ? `/${firstSegment}` : '';
}
