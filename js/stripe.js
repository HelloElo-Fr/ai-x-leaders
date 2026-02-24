// ========== STRIPE CHECKOUT ==========
// Replace 'pk_live_XXXXX' with your actual Stripe publishable key
// Replace 'price_monthly_ID' and 'price_yearly_ID' with your actual Stripe price IDs

(function() {
  // Only initialize if Stripe is loaded and we're on the masterclass page
  const btnSingle = document.getElementById('btn-single');
  const btnMonthly = document.getElementById('btn-monthly');
  const btnYearly = document.getElementById('btn-yearly');

  if (!btnMonthly && !btnYearly && !btnSingle) return;

  // Check if Stripe.js is loaded
  if (typeof Stripe === 'undefined') {
    console.warn('Stripe.js not loaded. Payment buttons will not work.');
    return;
  }

  const stripe = Stripe('pk_live_XXXXX'); // Replace with your live key

  // Single masterclass purchase (one-time payment)
  if (btnSingle) {
    btnSingle.addEventListener('click', function() {
      stripe.redirectToCheckout({
        lineItems: [{ price: 'price_single_masterclass_ID', quantity: 1 }],
        mode: 'payment',
        successUrl: window.location.origin + '/merci.html',
        cancelUrl: window.location.origin + '/programmes/masterclass.html',
      }).then(function(result) {
        if (result.error) {
          alert(result.error.message);
        }
      });
    });
  }

  if (btnMonthly) {
    btnMonthly.addEventListener('click', function() {
      stripe.redirectToCheckout({
        lineItems: [{ price: 'price_monthly_ID', quantity: 1 }],
        mode: 'subscription',
        successUrl: window.location.origin + '/merci.html',
        cancelUrl: window.location.origin + '/programmes/masterclass.html',
      }).then(function(result) {
        if (result.error) {
          alert(result.error.message);
        }
      });
    });
  }

  if (btnYearly) {
    btnYearly.addEventListener('click', function() {
      stripe.redirectToCheckout({
        lineItems: [{ price: 'price_yearly_ID', quantity: 1 }],
        mode: 'subscription',
        successUrl: window.location.origin + '/merci.html',
        cancelUrl: window.location.origin + '/programmes/masterclass.html',
      }).then(function(result) {
        if (result.error) {
          alert(result.error.message);
        }
      });
    });
  }
})();
