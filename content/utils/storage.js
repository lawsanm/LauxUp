/**
 * Chrome Storage Wrapper
 * Manages extension settings with sensible defaults.
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  darkMode: true,
  sidebar: true,
  clutterRemoval: true,
  assignmentTracker: true,
  sidebarCollapsed: false,
  domain: 'ugvle.ucsc.cmb.ac.lk',
  pinnedCourses: [],
};

/**
 * Get all settings, merged with defaults.
 * @returns {Promise<Object>}
 */
export async function getSettings() {
  try {
    const result = await chrome.storage.sync.get('moodleRedesign');
    return { ...DEFAULT_SETTINGS, ...(result.moodleRedesign || {}) };
  } catch (e) {
    // Fallback for when chrome.storage is unavailable
    console.warn('[MoodleRedesign] Storage unavailable, using defaults:', e.message);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save settings (partial update).
 * @param {Object} updates - Partial settings object
 * @returns {Promise<void>}
 */
export async function saveSettings(updates) {
  try {
    const current = await getSettings();
    const merged = { ...current, ...updates };
    await chrome.storage.sync.set({ moodleRedesign: merged });
    return merged;
  } catch (e) {
    console.warn('[MoodleRedesign] Storage save failed:', e.message);
  }
}

/**
 * Listen for settings changes.
 * @param {Function} callback - Called with (newSettings, oldSettings)
 */
export function onSettingsChange(callback) {
  try {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.moodleRedesign) {
        const newVal = { ...DEFAULT_SETTINGS, ...(changes.moodleRedesign.newValue || {}) };
        const oldVal = { ...DEFAULT_SETTINGS, ...(changes.moodleRedesign.oldValue || {}) };
        callback(newVal, oldVal);
      }
    });
  } catch (e) {
    console.warn('[MoodleRedesign] Storage listener failed:', e.message);
  }
}
