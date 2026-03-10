// ========== FORM VALIDATION & HANDLING ==========

document.addEventListener('DOMContentLoaded', () => {

  // Newsletter form — opens Substack with pre-filled email
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

      // Open Substack subscription page with pre-filled email
      window.open('https://aixleaders.substack.com/subscribe?utm_source=menu&simple=true&next=https%3A%2F%2Faixleaders.substack.com%2F&email=' + encodeURIComponent(email), '_blank');
      showMessage(message, 'Finalisez votre inscription sur la page qui vient de s\u0027ouvrir.', 'success');
      emailInput.value = '';
    });
  }

  // Contact form — mailto
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

      // Build mailto link
      var name = (document.getElementById('contact-name') || {}).value || '';
      var email = (document.getElementById('contact-email') || {}).value || '';
      var phone = (document.getElementById('contact-phone') || {}).value || '';
      var company = (document.getElementById('contact-company') || {}).value || '';
      var subject = (document.getElementById('contact-subject') || {}).value || '';
      var msg = (document.getElementById('contact-message') || {}).value || '';

      var body = 'Nom : ' + name + '\n'
        + 'Email : ' + email + '\n'
        + (phone ? 'T\u00e9l\u00e9phone : ' + phone + '\n' : '')
        + (company ? 'Entreprise : ' + company + '\n' : '')
        + '\n' + msg;

      window.location.href = 'mailto:elodie@ai-x-leaders.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
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
