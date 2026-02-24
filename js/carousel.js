// ========== TESTIMONIAL CAROUSEL ==========

class Carousel {
  constructor(container) {
    this.container = container;
    this.track = container.querySelector('.carousel-track');
    this.dots = container.querySelectorAll('.carousel-dot');
    this.prevBtn = container.querySelector('.carousel-btn--prev');
    this.nextBtn = container.querySelector('.carousel-btn--next');
    this.cards = container.querySelectorAll('.testimonial-card');

    if (!this.track || this.cards.length === 0) return;

    this.currentIndex = 0;
    this.autoplayInterval = null;
    this.autoplayDelay = 5000;

    this.init();
  }

  init() {
    // Navigation buttons
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.prev());
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.next());
    }

    // Dots
    this.dots.forEach((dot, index) => {
      dot.addEventListener('click', () => this.goTo(index));
    });

    // Pause on hover
    this.container.addEventListener('mouseenter', () => this.stopAutoplay());
    this.container.addEventListener('mouseleave', () => this.startAutoplay());

    // Touch / swipe support
    let startX = 0;
    let diffX = 0;

    this.track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      this.stopAutoplay();
    }, { passive: true });

    this.track.addEventListener('touchmove', (e) => {
      diffX = e.touches[0].clientX - startX;
    }, { passive: true });

    this.track.addEventListener('touchend', () => {
      if (Math.abs(diffX) > 50) {
        if (diffX > 0) {
          this.prev();
        } else {
          this.next();
        }
      }
      diffX = 0;
      this.startAutoplay();
    });

    // Start autoplay
    this.startAutoplay();
    this.updateDots();
  }

  getVisibleCards() {
    const containerWidth = this.container.offsetWidth;
    if (containerWidth < 768) return 1;
    if (containerWidth < 1024) return 2;
    return 3;
  }

  getMaxIndex() {
    const visible = this.getVisibleCards();
    return Math.max(0, this.cards.length - visible);
  }

  next() {
    const maxIndex = this.getMaxIndex();
    this.currentIndex = this.currentIndex >= maxIndex ? 0 : this.currentIndex + 1;
    this.updatePosition();
    this.updateDots();
  }

  prev() {
    const maxIndex = this.getMaxIndex();
    this.currentIndex = this.currentIndex <= 0 ? maxIndex : this.currentIndex - 1;
    this.updatePosition();
    this.updateDots();
  }

  goTo(index) {
    this.currentIndex = Math.min(index, this.getMaxIndex());
    this.updatePosition();
    this.updateDots();
  }

  updatePosition() {
    if (this.cards.length === 0) return;
    const cardWidth = this.cards[0].offsetWidth;
    const gap = 24;
    const offset = this.currentIndex * (cardWidth + gap);
    this.track.style.transform = `translateX(-${offset}px)`;
  }

  updateDots() {
    this.dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === this.currentIndex);
    });
  }

  startAutoplay() {
    this.stopAutoplay();
    this.autoplayInterval = setInterval(() => this.next(), this.autoplayDelay);
  }

  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }
}

// Initialize all carousels on the page
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.carousel').forEach(el => {
    new Carousel(el);
  });
});
