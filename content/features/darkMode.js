/**
 * Dark Mode — Pre-paint Injection
 * Runs at document_start to prevent white flash.
 */

(function () {
  // Immediately apply dark background before anything renders
  const html = document.documentElement;
  html.style.backgroundColor = '#09090b';
  html.style.color = '#fafafa';

  // Also set body as soon as it exists
  const applyToBody = () => {
    if (document.body) {
      document.body.style.backgroundColor = '#09090b';
      document.body.style.color = '#fafafa';
    }
  };

  // Try immediately
  applyToBody();

  // Also try on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyToBody, { once: true });
  }

  // MutationObserver to catch dynamically injected elements with inline white backgrounds
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        // Fix any element that has an inline white/light background
        const bg = node.style?.backgroundColor;
        if (bg && (bg === 'white' || bg === '#ffffff' || bg === '#fff' || bg === 'rgb(255, 255, 255)')) {
          node.style.backgroundColor = '';
        }
      }
    }
  });

  // Start observing as soon as body is available
  const startObserving = () => {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      requestAnimationFrame(startObserving);
    }
  };
  startObserving();
})();
