/**
 * Keyboard Shortcuts Module
 */

const SHORTCUTS = {
  'd': () => navigateTo('/my/'),
  'c': () => navigateTo('/my/courses.php'),
  'a': () => toggleAssignmentTracker(),
  '[': () => toggleSidebar(),
  '/': () => focusSearch(),
  'Escape': () => closeOverlays(),
};

function navigateTo(path) {
  // Build full URL from current origin + moodle base path
  const base = getMoodleBase();
  window.location.href = base + path;
}

function getMoodleBase() {
  // Extract the Moodle base path from current URL
  const match = window.location.pathname.match(/^(\/[^/]+\/)/);
  return match ? match[1].replace(/\/$/, '') : '';
}

function toggleAssignmentTracker() {
  const overlay = document.querySelector('.mr-assignments-overlay');
  if (overlay) {
    overlay.classList.toggle('active');
  }
}

function toggleSidebar() {
  const sidebar = document.querySelector('.mr-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('collapsed');
    const body = document.body;
    if (sidebar.classList.contains('collapsed')) {
      body.classList.remove('mr-sidebar-active');
      body.classList.add('mr-sidebar-collapsed');
    } else {
      body.classList.remove('mr-sidebar-collapsed');
      body.classList.add('mr-sidebar-active');
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
  // Close assignment tracker
  const overlay = document.querySelector('.mr-assignments-overlay.active');
  if (overlay) {
    overlay.classList.remove('active');
    return;
  }
  // Close any open Moodle modals
  const modal = document.querySelector('.modal.show');
  if (modal) {
    const closeBtn = modal.querySelector('[data-dismiss="modal"], .btn-close');
    if (closeBtn) closeBtn.click();
  }
}

/**
 * Initialize keyboard shortcuts.
 */
export function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger if user is typing in an input
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
      // Only allow Escape in inputs
      if (e.key !== 'Escape') return;
    }

    // Don't trigger with modifier keys (except Escape)
    if ((e.ctrlKey || e.metaKey || e.altKey) && e.key !== 'Escape') return;

    const handler = SHORTCUTS[e.key];
    if (handler) {
      e.preventDefault();
      handler();
    }
  });
}
