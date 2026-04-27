/**
 * Clutter Removal Module
 * Removes/hides Moodle bloat elements for a clean UI.
 */

const CLUTTER_SELECTORS = [
  // Sidebar blocks we replace
  '.block_calendar_month',
  '.block_online_users',
  '.block_badges',
  '.block_tags',
  '.block_blog_menu',
  '.block_blog_recent',
  '.block_login',
  '.block_rss_client',
  // Footer
  '#page-footer .logininfo',
  '#page-footer .tool_usertours-resettourcontainer',
  '#page-footer .sitelink',
  // Edit mode (students don't need this)
  '.editmode-switch-form',
  // Misc clutter
  '.usermenu .divider:last-child',
  '#page-navbar',
];

const DECLUTTER_CLASS = 'mr-decluttered';

/**
 * Initialize clutter removal.
 */
export function initClutterRemoval() {
  // Add a style rule to hide decluttered elements
  const style = document.createElement('style');
  style.textContent = `.${DECLUTTER_CLASS} { display: none !important; }`;
  document.head.appendChild(style);

  // Apply to existing elements
  applyClutter();

  // Watch for dynamically loaded elements
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
      // Invalid selector, skip
    }
  }
}

/**
 * Restore all decluttered elements.
 */
export function restoreClutter() {
  document.querySelectorAll(`.${DECLUTTER_CLASS}`).forEach((el) => {
    el.classList.remove(DECLUTTER_CLASS);
  });
}
