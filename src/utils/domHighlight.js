/**
 * Highlights a modular UI element inside the running WebViewer iframe by its
 * `data-element` attribute without interfering with document interaction.
 */

let highlightTimer = null;
let lastHighlightedEl = null;

const HIGHLIGHT_STYLE_ID = 'wv-studio-highlight-style';

function ensureHighlightStyle(doc) {
  if (!doc || doc.getElementById(HIGHLIGHT_STYLE_ID)) return;
  try {
    const style = doc.createElement('style');
    style.id = HIGHLIGHT_STYLE_ID;
    style.textContent = `
      @keyframes wvStudioPulse {
        0% { outline: 2px solid #2563eb; outline-offset: 2px; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.28); }
        70% { outline: 2px solid #2563eb; outline-offset: 2px; box-shadow: 0 0 0 6px rgba(37, 99, 235, 0); }
        100% { outline: 2px solid transparent; outline-offset: 2px; box-shadow: none; }
      }
      .wv-studio-highlight-ring {
        outline: 2px solid #2563eb !important;
        outline-offset: 2px !important;
        border-radius: 4px;
        animation: wvStudioPulse 1.6s ease-out forwards;
        z-index: 9999;
      }
    `;
    doc.head?.appendChild(style);
  } catch {
    // Ignore cross-origin or unmounted iframe errors
  }
}

export function highlightElementInViewer(dataElement) {
  if (!dataElement || typeof window === 'undefined') return;
  const iframeDoc = window.viewerInstance?.UI?.iframeWindow?.document;
  if (!iframeDoc) return;

  try {
    ensureHighlightStyle(iframeDoc);

    if (lastHighlightedEl) {
      lastHighlightedEl.classList.remove('wv-studio-highlight-ring');
      lastHighlightedEl = null;
    }
    if (highlightTimer) {
      clearTimeout(highlightTimer);
      highlightTimer = null;
    }

    const safeSelector = `[data-element="${CSS.escape ? CSS.escape(dataElement) : dataElement}"]`;
    const targetEl = iframeDoc.querySelector(safeSelector);
    if (!targetEl) return;

    targetEl.classList.add('wv-studio-highlight-ring');
    lastHighlightedEl = targetEl;

    highlightTimer = setTimeout(() => {
      if (lastHighlightedEl) {
        lastHighlightedEl.classList.remove('wv-studio-highlight-ring');
        lastHighlightedEl = null;
      }
    }, 1600);
  } catch {
    // Ignore selector or DOM access errors
  }
}
