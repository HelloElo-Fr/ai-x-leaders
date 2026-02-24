// ========== FORM VALIDATION & HANDLING ==========

document.addEventListener('DOMContentLoaded', () => {

  // Newsletter form
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const emailInput = this.querySelector('input[type="email"]');
      const message = this.querySelector('.form-message');
      const email = emailInput.value.trim();

      if (!isValidEmail(email)) {
        showMessage(message, 'Veuillez entrer une adresse email valide.', 'error');
        return;
      }

      // Simulate success (replace with actual Substack/webhook integration)
      showMessage(message, 'Bienvenue ! V\u00e9rifiez votre bo\u00eete mail.', 'success');
      emailInput.value = '';
    });
  }

  // Contact form
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const message = this.querySelector('.form-message');
      const fields = this.querySelectorAll('[required]');
      let valid = true;

      fields.forEach(field => {
        if (!field.value.trim()) {
          valid = false;
          field.style.borderColor = 'var(--error)';
        } else {
          field.style.borderColor = '';
        }
      });

      const emailField = this.querySelector('input[type="email"]');
      if (emailField && !isValidEmail(emailField.value)) {
        valid = false;
        emailField.style.borderColor = 'var(--error)';
      }

      if (!valid) {
        showMessage(message, 'Veuillez remplir tous les champs obligatoires.', 'error');
        return;
      }

      // Simulate success (replace with actual form handling)
      showMessage(message, 'Message envoy\u00e9 ! Nous vous r\u00e9pondrons sous 48h.', 'success');
      this.reset();
    });
  }

  // Reset field border on input
  document.querySelectorAll('.form-input, .form-textarea, .form-select').forEach(field => {
    field.addEventListener('input', function() {
      this.style.borderColor = '';
    });
  });
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showMessage(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = 'form-message ' + type;
}
