/**
 * LauxUp — Popup Script
 * Manages the master toggle state using Chrome storage.
 */


const DEFAULT_SETTINGS = {
  enabled: true,
  darkMode: true,
  sidebar: true,
  clutterRemoval: true,
  assignmentTracker: true,
  sidebarCollapsed: false,
  domain: 'ugvle.ucsc.cmb.ac.lk',
};

async function init() {
  const result = await chrome.storage.sync.get('moodleRedesign');
  const settings = { ...DEFAULT_SETTINGS, ...(result.moodleRedesign || {}) };

  const masterToggle = document.getElementById('toggle-enabled');
  const statusText = document.getElementById('status-text');

  if (masterToggle) {
    masterToggle.checked = settings.enabled !== false;
    if (statusText) statusText.textContent = masterToggle.checked ? 'ON' : 'OFF';

    masterToggle.addEventListener('change', async () => {
      const current = await chrome.storage.sync.get('moodleRedesign');
      const currentSettings = { ...DEFAULT_SETTINGS, ...(current.moodleRedesign || {}) };
      
      currentSettings.enabled = masterToggle.checked;
      if (statusText) statusText.textContent = masterToggle.checked ? 'ON' : 'OFF';

      await chrome.storage.sync.set({ moodleRedesign: currentSettings });
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
