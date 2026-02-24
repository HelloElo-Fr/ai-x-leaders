// ========== COUNTER ANIMATION ==========

function animateCounter(element, target, duration) {
  duration = duration || 2000;
  const suffix = element.dataset.suffix || '';
  const prefix = element.dataset.prefix || '';
  let start = 0;
  const increment = target / (duration / 16);
  const isDecimal = target % 1 !== 0;

  function update() {
    start += increment;
    if (start >= target) {
      element.textContent = prefix + (isDecimal ? target.toFixed(1) : target) + suffix;
      return;
    }
    element.textContent = prefix + (isDecimal ? start.toFixed(1) : Math.floor(start)) + suffix;
    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// Observe counter elements
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.animated) {
      const target = parseFloat(entry.target.dataset.target);
      if (!isNaN(target)) {
        entry.target.dataset.animated = 'true';
        animateCounter(entry.target, target);
      }
    }
  });
}, { threshold: 0.5 });

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-counter]').forEach(el => {
    counterObserver.observe(el);
  });
});
