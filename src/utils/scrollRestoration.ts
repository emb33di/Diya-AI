/**
 * Scroll restoration utility to ensure pages load at the top
 */

/**
 * Scroll to top of the page
 */
export const scrollToTop = () => {
  // Use requestAnimationFrame to ensure it runs after other scroll operations
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
  });
};

/**
 * Scroll to top with smooth behavior
 */
export const scrollToTopSmooth = () => {
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
};

/**
 * Reset scroll position for a specific element
 */
export const resetElementScroll = (element: HTMLElement | null) => {
  if (element) {
    element.scrollTop = 0;
  }
};

/**
 * Hook to scroll to top on route change
 */
export const useScrollToTop = () => {
  const scrollToTop = () => {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
  };

  return { scrollToTop };
};
