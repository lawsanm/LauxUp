/**
 * Moodle Redesign — Main Orchestrator
 * Entry point that loads all modules based on page type and user settings.
 */
import { getSettings, onSettingsChange } from './utils/storage.js';
import { getPageType } from './utils/dom.js';
import { initSidebar } from './ui/sidebar.js';
import { initDashboard } from './ui/dashboard.js';
import { initCoursePage } from './ui/coursePage.js';
import { initClutterRemoval } from './ui/clutter.js';
import { initAssignmentTracker } from './features/assignmentTracker.js';
import { initShortcuts } from './features/shortcuts.js';

async function init() {
  console.log('[MoodleRedesign] Initializing...');

  const settings = await getSettings();
  if (!settings.enabled) {
    console.log('[MoodleRedesign] Extension disabled.');
    return;
  }

  const pageType = getPageType();
  console.log(`[MoodleRedesign] Page type: ${pageType}`);

  try {
    // Sidebar (all pages)
    if (settings.sidebar) {
      await initSidebar();
    }

    // Clutter removal (all pages)
    if (settings.clutterRemoval) {
      initClutterRemoval();
    }

    // Page-specific modules
    if (settings.darkMode) {
      // darkMode.js runs at document_start separately
      // This is just a placeholder for settings-aware toggling
    }

    if (pageType === 'dashboard') {
      await initDashboard();
    }

    if (pageType === 'course-view') {
      await initCoursePage();
    }

    // Assignment tracker (all pages)
    if (settings.assignmentTracker) {
      initAssignmentTracker();
    }

    // Keyboard shortcuts (always)
    initShortcuts();

    console.log('[MoodleRedesign] Ready ✓');
  } catch (e) {
    console.error('[MoodleRedesign] Init error:', e);
  }

  // Listen for settings changes
  onSettingsChange((newSettings) => {
    console.log('[MoodleRedesign] Settings changed, reloading...');
    window.location.reload();
  });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
