/**
 * utils/transitions.js
 * Helper to trigger a smooth exit overlay before navigating away.
 * Usage:  await exitAndNavigate(navigate, '/login')
 */

export const exitAndNavigate = (navigateFn, to, options = {}) => {
  return new Promise((resolve) => {
    // Create overlay div
    const overlay = document.createElement('div');
    overlay.className = 'app-exit-overlay';
    document.body.appendChild(overlay);

    // After the overlay fades in (550ms), navigate
    setTimeout(() => {
      navigateFn(to, options);
      // Remove overlay after the new page has entered
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve();
      }, 750);
    }, 380);
  });
};