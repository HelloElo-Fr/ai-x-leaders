// ========== HEADER SCROLL ==========
const header = document.querySelector('.header');

function handleScroll() {
  if (window.scrollY > 10) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}

window.addEventListener('scroll', handleScroll, { passive: true });

// ========== MOBILE MENU ==========
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');
const mobileOverlay = document.querySelector('.mobile-overlay');

function toggleMenu() {
  hamburger.classList.toggle('active');
  mobileMenu.classList.toggle('active');
  mobileOverlay.classList.toggle('active');
  document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
}

function closeMenu() {
  hamburger.classList.remove('active');
  mobileMenu.classList.remove('active');
  mobileOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

if (hamburger) {
  hamburger.addEventListener('click', toggleMenu);
}

if (mobileOverlay) {
  mobileOverlay.addEventListener('click', closeMenu);
}

// Close mobile menu on link click
document.querySelectorAll('.mobile-menu a').forEach(link => {
  link.addEventListener('click', closeMenu);
});

// ========== SCROLL ANIMATIONS (IntersectionObserver) ==========
const animateObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.animate-on-scroll').forEach(el => {
  animateObserver.observe(el);
});

// ========== SMOOTH SCROLL for anchor links ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;

    const target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      const headerHeight = header ? header.offsetHeight : 0;
      const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;
      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    }
  });
});

// ========== ECOSYSTEM STEPS (home page) ==========
const ecosystemSteps = document.querySelectorAll('.ecosystem-step');
const ecosystemDetail = document.querySelector('.ecosystem-detail');

const stepDetails = [
  {
    title: '1. Visibilit\u00e9',
    desc: 'LinkedIn (35K), BFM, conf\u00e9rences, YouTube, Human with AI, IA R\u00e9cr\u00e9. Elodie partage sa vision de l\u2019IA pour les dirigeants sur toutes les sc\u00e8nes.'
  },
  {
    title: '2. Engagement',
    desc: 'Newsletter AI x Leaders Weekly, The Ugly Truth (Nash, 13K abonn\u00e9s), communaut\u00e9 Ask & Solve (400 membres).'
  },
  {
    title: '3. D\u00e9couverte',
    desc: 'Masterclass mindset gratuites (PPC, Weber, Pelab\u00e8re). Invitation aux masterclass IA. Pour r\u00e9fl\u00e9chir \u00e0 l\u2019impact de l\u2019IA au-del\u00e0 des outils.'
  },
  {
    title: '4. Premier achat',
    desc: 'Masterclass IA \u00e0 l\u2019unit\u00e9 (50-100\u20ac) ou abonnement masterclass (50\u20ac/mois, 500\u20ac/an). Le premier pas transactionnel.'
  },
  {
    title: '5. Approfondissement',
    desc: 'Sprint 4 semaines (800-1\u202f500\u20ac). Le cha\u00eenon manquant : testez la m\u00e9thode AI x Leaders sur un sujet pr\u00e9cis avant le bootcamp.'
  },
  {
    title: '6. Transformation',
    desc: 'The AI Leadership Program \u2014 bootcamp de 3 mois (2\u202f000\u20ac individuel / 4\u202f000\u20ac entreprise Qualiopi). Par intelligence collective, pour les dirigeants C-level.'
  },
  {
    title: '7. D\u00e9ploiement',
    desc: 'Prestations Lightmeup sur-mesure : formation d\u2019\u00e9quipe, coaching, agents IA, films IA, \u00e9v\u00e9nements.'
  }
];

ecosystemSteps.forEach((step, index) => {
  step.addEventListener('click', () => {
    ecosystemSteps.forEach(s => s.classList.remove('active'));
    step.classList.add('active');

    if (ecosystemDetail) {
      const titleEl = ecosystemDetail.querySelector('.ecosystem-detail-title');
      const descEl = ecosystemDetail.querySelector('.ecosystem-detail-desc');
      if (titleEl && descEl && stepDetails[index]) {
        titleEl.textContent = stepDetails[index].title;
        descEl.textContent = stepDetails[index].desc;
      }
    }
  });
});

// ========== ACTIVE NAV LINK ==========
const currentPath = window.location.pathname;
document.querySelectorAll('.header-nav a, .mobile-menu a:not(.btn-primary)').forEach(link => {
  const href = link.getAttribute('href');
  if (href && currentPath.endsWith(href.replace('./', '').replace('../', ''))) {
    link.style.color = 'var(--navy)';
    link.style.fontWeight = '600';
  }
});
