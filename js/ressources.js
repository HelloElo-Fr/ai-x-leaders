/**
 * ressources.js
 * Charge dynamiquement les derniers articles Substack
 * via le proxy Worker /api/rss
 * Fallback : garde le contenu statique HTML si le fetch echoue.
 */

(function () {
  'use strict';

  var FEEDS = [
    { key: 'aixleaders', containerId: 'preview-aixleaders' },
    { key: 'uglytruth', containerId: 'preview-uglytruth' },
  ];

  function formatDate(dateStr) {
    try {
      var d = new Date(dateStr);
      var months = [
        'janvier', 'f\u00e9vrier', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'ao\u00fbt', 'septembre', 'octobre', 'novembre', 'd\u00e9cembre'
      ];
      return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    } catch (e) {
      return dateStr;
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function cleanTitle(title) {
    // Retire le prefixe "AI X Leaders : " ou "The Ugly Truth… : « " etc.
    return title
      .replace(/^AI X Leaders\s*:\s*/i, '')
      .replace(/^The Ugly Truth.*?[:\u00ab]\s*/i, '')
      .replace(/[\u00bb]\s*$/, '')
      .replace(/^[«"]\s*/, '')
      .replace(/\s*[»"]\s*$/, '')
      .trim();
  }

  function renderArticles(containerId, items) {
    var container = document.getElementById(containerId);
    if (!container || !items || items.length === 0) return;

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<a href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener" class="preview-article">';
      html += '<span class="preview-date">' + escapeHtml(formatDate(item.pubDate)) + '</span>';
      html += '<span class="preview-title">' + escapeHtml(cleanTitle(item.title)) + '</span>';
      html += '</a>';
    }
    container.innerHTML = html;
  }

  function loadFeed(feed) {
    fetch('/api/rss?feed=' + feed.key)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data.items && data.items.length > 0) {
          renderArticles(feed.containerId, data.items);
        }
      })
      .catch(function () {
        // Silencieux : garde le contenu statique en fallback
      });
  }

  // Charger au DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    for (var i = 0; i < FEEDS.length; i++) {
      loadFeed(FEEDS[i]);
    }
  }
})();
