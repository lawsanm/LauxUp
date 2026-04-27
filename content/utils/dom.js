/**
 * DOM Utility Helpers
 * Provides safe DOM manipulation, element waiting, and MutationObserver wrappers.
 */

/**
 * Wait for an element to appear in the DOM.
 * @param {string} selector - CSS selector
 * @param {number} timeout - Max wait time in ms (default 10000)
 * @returns {Promise<Element>}
 */
export function waitForElement(selector, timeout = 10000) {
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
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`waitForElement: "${selector}" not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Observe DOM changes on a target element.
 * @param {Element|string} target - Element or selector
 * @param {Function} callback - Called with (mutations, observer)
 * @param {MutationObserverInit} options
 * @returns {MutationObserver}
 */
export function observeDOM(target, callback, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return null;

  const config = {
    childList: true,
    subtree: true,
    ...options,
  };

  let debounceTimer = null;
  const observer = new MutationObserver((mutations, obs) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => callback(mutations, obs), 50);
  });

  observer.observe(el, config);
  return observer;
}

/**
 * Safely inject HTML into a container.
 * @param {Element} container
 * @param {string} html
 * @param {'replace'|'prepend'|'append'} mode
 */
export function injectHTML(container, html, mode = 'replace') {
  if (!container) return;
  switch (mode) {
    case 'replace':
      container.innerHTML = html;
      break;
    case 'prepend':
      container.insertAdjacentHTML('afterbegin', html);
      break;
    case 'append':
      container.insertAdjacentHTML('beforeend', html);
      break;
  }
}

/**
 * Detect current Moodle page type from body classes.
 * @returns {'dashboard'|'courses'|'course-view'|'assignment'|'grades'|'calendar'|'unknown'}
 */
export function getPageType() {
  const body = document.body;
  if (!body) return 'unknown';

  const classes = body.className;

  if (classes.includes('path-site') || classes.includes('path-frontpage'))
    return 'dashboard';
  if (classes.includes('path-my') && !classes.includes('path-my-courses'))
    return 'dashboard';
  if (classes.includes('path-my-courses'))
    return 'courses';
  if (classes.includes('path-my'))
    return 'dashboard';
  if (classes.includes('path-course-view'))
    return 'course-view';
  if (classes.includes('path-mod-assign'))
    return 'assignment';
  if (classes.includes('path-grade'))
    return 'grades';
  if (classes.includes('path-calendar'))
    return 'calendar';

  return 'unknown';
}

/**
 * Get trimmed text content from an element.
 * @param {string|Element} selectorOrEl
 * @returns {string}
 */
export function extractText(selectorOrEl) {
  const el = typeof selectorOrEl === 'string'
    ? document.querySelector(selectorOrEl)
    : selectorOrEl;
  
  if (!el) return '';
  
  // Clone to avoid modifying the actual DOM
  const clone = el.cloneNode(true);
  
  // Remove accessibility-only text spans that cause messy strings
  const hidden = clone.querySelectorAll('.sr-only, .accesshide');
  hidden.forEach(h => h.remove());
  
  return clone.textContent.trim().replace(/\s{2,}/g, ' ');
}

/**
 * Create an element with attributes and children.
 * @param {string} tag
 * @param {Object} attrs
 * @param {...(string|Element)} children
 * @returns {Element}
 */
export function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(el.dataset, value);
    } else {
      el.setAttribute(key, value);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Element) {
      el.appendChild(child);
    }
  }
  return el;
}
