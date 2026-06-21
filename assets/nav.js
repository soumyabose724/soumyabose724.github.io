/* ============================================================
   ArthaGrid Prototype Utilities — nav.js
   window.AG — shared utilities for all prototype-v2 screens
   ============================================================ */

window.AG = (function () {

  /* ── formatINR ─────────────────────────────────────────────
     Format integer paise as Indian Rupee string.
     opts.compact  → ₹1.24L / ₹12.35Cr / ₹1.2K
     opts.showPaise → include decimal paise
     opts.sign     → prefix '+' for positive
  ────────────────────────────────────────────────────────── */
  function formatINR(paise, opts) {
    opts = opts || {};
    var rupees = paise / 100;
    var abs = Math.abs(rupees);
    var negative = rupees < 0;
    var prefix = negative ? '−₹' : '₹';  // −₹ or ₹
    if (opts.sign && !negative && rupees > 0) prefix = '+₹';

    if (opts.compact) {
      if (abs >= 1e7) return (negative ? '−' : (opts.sign && rupees > 0 ? '+' : '')) + '₹' + (abs / 1e7).toFixed(2) + 'Cr';
      if (abs >= 1e5) return (negative ? '−' : (opts.sign && rupees > 0 ? '+' : '')) + '₹' + (abs / 1e5).toFixed(2) + 'L';
      if (abs >= 1e3) return (negative ? '−' : (opts.sign && rupees > 0 ? '+' : '')) + '₹' + (abs / 1e3).toFixed(1) + 'K';
    }

    /* Indian number grouping: ##,##,### */
    var decimalPlaces = opts.showPaise ? 2 : 0;
    var formatted;
    try {
      formatted = abs.toLocaleString('en-IN', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
      });
    } catch (e) {
      /* Fallback for environments where en-IN isn't supported */
      formatted = _indianFormat(abs, decimalPlaces);
    }
    return prefix + formatted;
  }

  /* Indian grouping fallback */
  function _indianFormat(n, decimals) {
    var fixed = n.toFixed(decimals);
    var parts = fixed.split('.');
    var intPart = parts[0];
    var decPart = parts[1] ? '.' + parts[1] : '';
    if (intPart.length <= 3) return intPart + decPart;
    var last3 = intPart.slice(-3);
    var rest = intPart.slice(0, -3);
    var grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return grouped + ',' + last3 + decPart;
  }

  /* ── formatPercent ─────────────────────────────────────────
     Format a percentage value.
     opts.decimals → decimal places (default 2)
     opts.showSign → prefix '+' for positive
     opts.suffix   → suffix string (default '%')
  ────────────────────────────────────────────────────────── */
  function formatPercent(value, opts) {
    opts = opts || {};
    var decimals = opts.decimals !== undefined ? opts.decimals : 2;
    var suffix = opts.suffix !== undefined ? opts.suffix : '%';
    var sign = (opts.showSign && value > 0) ? '+' : '';
    return sign + parseFloat(value).toFixed(decimals) + suffix;
  }

  /* ── formatDate ────────────────────────────────────────────
     Format a date as "DD MMM YYYY" (Indian convention).
  ────────────────────────────────────────────────────────── */
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function formatDate(date, opts) {
    opts = opts || {};
    if (typeof date === 'string') date = new Date(date);
    var d = date.getDate().toString().padStart(2, '0');
    var m = MONTHS[date.getMonth()];
    var y = date.getFullYear();
    if (opts.short) return d + ' ' + m;
    return d + ' ' + m + ' ' + y;
  }

  /* ── initDigitBoxes ────────────────────────────────────────
     Wire up 6-digit OTP / PIN boxes.
     containerSelector: CSS selector for the parent .digit-boxes
     onComplete(value): called when all 6 digits are entered
  ────────────────────────────────────────────────────────── */
  function initDigitBoxes(containerSelector, onComplete) {
    var container = document.querySelector(containerSelector);
    if (!container) return;
    var boxes = Array.from(container.querySelectorAll('input.digit-box'));

    boxes.forEach(function (box, i) {
      box.setAttribute('inputmode', 'numeric');
      box.setAttribute('pattern', '[0-9]*');
      box.setAttribute('maxlength', '1');

      box.addEventListener('input', function (e) {
        var val = e.target.value.replace(/[^0-9]/g, '').slice(-1);
        e.target.value = val;
        if (val && i < boxes.length - 1) {
          boxes[i + 1].focus();
        }
        var all = boxes.map(function (b) { return b.value; }).join('');
        if (all.length === boxes.length && onComplete) {
          onComplete(all);
        }
      });

      box.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !box.value && i > 0) {
          boxes[i - 1].focus();
          boxes[i - 1].value = '';
        }
        if (e.key === 'ArrowLeft'  && i > 0) boxes[i - 1].focus();
        if (e.key === 'ArrowRight' && i < boxes.length - 1) boxes[i + 1].focus();
      });

      box.addEventListener('paste', function (e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData('text');
        var digits = text.replace(/[^0-9]/g, '').slice(0, boxes.length);
        digits.split('').forEach(function (d, j) {
          if (boxes[i + j]) boxes[i + j].value = d;
        });
        var last = Math.min(i + digits.length, boxes.length - 1);
        boxes[last].focus();
        var all = boxes.map(function (b) { return b.value; }).join('');
        if (all.length === boxes.length && onComplete) onComplete(all);
      });
    });
  }

  /* ── startCountdown ────────────────────────────────────────
     Display a MM:SS countdown inside displayEl.
     onExpire(): called when timer reaches 0
     returns { stop } function to cancel
  ────────────────────────────────────────────────────────── */
  function startCountdown(seconds, displayEl, onExpire) {
    var remaining = seconds;
    var timer;
    function tick() {
      var m = Math.floor(remaining / 60);
      var s = remaining % 60;
      displayEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      if (remaining <= 120) {
        displayEl.classList.add('urgent');
      }
      if (remaining <= 0) {
        if (onExpire) onExpire();
        return;
      }
      remaining--;
      timer = setTimeout(tick, 1000);
    }
    tick();
    return {
      stop: function () { clearTimeout(timer); }
    };
  }

  /* ── initBottomNav ─────────────────────────────────────────
     Highlight the correct tab in .bottom-nav.
     activeTab: value of data-tab attribute on the active item
  ────────────────────────────────────────────────────────── */
  function initBottomNav(activeTab) {
    var items = document.querySelectorAll('.bottom-nav__item');
    items.forEach(function (item) {
      item.classList.toggle('active', item.dataset.tab === activeTab);
    });
  }

  /* ── initTopNav ────────────────────────────────────────────
     Highlight the correct link in .top-nav.
     activeHref: href string matching the active link
  ────────────────────────────────────────────────────────── */
  function initTopNav(activeHref) {
    var links = document.querySelectorAll('.top-nav__link');
    links.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('href') === activeHref);
    });
  }

  /* ── initSlideOver ─────────────────────────────────────────
     Wire open/close behaviour for a slide-over + backdrop.
     openBtnSel:  selector(s) for open trigger buttons
     slideOverSel: selector for .slideover element
     backdropSel:  selector for .slideover-backdrop element
  ────────────────────────────────────────────────────────── */
  function initSlideOver(openBtnSel, slideOverSel, backdropSel) {
    var panel    = document.querySelector(slideOverSel);
    var backdrop = document.querySelector(backdropSel);
    if (!panel || !backdrop) return;

    function open()  { panel.classList.add('open'); backdrop.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function close() { panel.classList.remove('open'); backdrop.classList.remove('open'); document.body.style.overflow = ''; }

    document.querySelectorAll(openBtnSel).forEach(function (btn) {
      btn.addEventListener('click', open);
    });
    backdrop.addEventListener('click', close);
    var closeBtn = panel.querySelector('.slideover__close');
    if (closeBtn) closeBtn.addEventListener('click', close);
    var cancelBtns = panel.querySelectorAll('[data-action="cancel"]');
    cancelBtns.forEach(function (b) { b.addEventListener('click', close); });

    return { open: open, close: close };
  }

  /* ── initModal ─────────────────────────────────────────────
     Wire open/close for a modal + backdrop.
  ────────────────────────────────────────────────────────── */
  function initModal(openBtnSel, modalBackdropSel) {
    var backdrop = document.querySelector(modalBackdropSel);
    if (!backdrop) return;
    var modal = backdrop.querySelector('.modal');

    function open()  { backdrop.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function close() { backdrop.classList.remove('open'); document.body.style.overflow = ''; }

    document.querySelectorAll(openBtnSel).forEach(function (btn) {
      btn.addEventListener('click', open);
    });
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    if (modal) {
      var closeBtn = modal.querySelector('.modal__close');
      if (closeBtn) closeBtn.addEventListener('click', close);
      var cancelBtns = modal.querySelectorAll('[data-action="cancel"]');
      cancelBtns.forEach(function (b) { b.addEventListener('click', close); });
    }

    return { open: open, close: close };
  }

  /* ── initDemoBar ───────────────────────────────────────────
     Wire demo-bar state buttons.
     states: array of { label, active, fn }
     Activates the first state on init.
  ────────────────────────────────────────────────────────── */
  function initDemoBar(states) {
    var bar = document.querySelector('.demo-bar');
    if (!bar) return;

    var btns = bar.querySelectorAll('.demo-bar__btn');
    btns.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        if (states[i] && states[i].fn) states[i].fn();
      });
    });

    /* Activate first */
    if (btns.length > 0) btns[0].classList.add('active');
    if (states[0] && states[0].fn) states[0].fn();
  }

  /* ── showToast ─────────────────────────────────────────────
     Display a transient toast message.
     type: 'success' | 'error' | 'warning' | 'info'
  ────────────────────────────────────────────────────────── */
  var _toastContainer;
  function showToast(message, type, duration) {
    type = type || 'success';
    duration = duration || 4000;

    if (!_toastContainer) {
      _toastContainer = document.createElement('div');
      _toastContainer.className = 'toast-container';
      document.body.appendChild(_toastContainer);
    }

    var icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
      error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    var toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.innerHTML = icons[type] + '<span class="toast-body">' + message + '</span><button class="toast-close btn-icon btn-icon-sm" aria-label="Close">×</button>';
    _toastContainer.appendChild(toast);

    toast.querySelector('.toast-close').addEventListener('click', function () { _removeToast(toast); });
    setTimeout(function () { _removeToast(toast); }, duration);
  }
  function _removeToast(toast) {
    toast.style.opacity = '0'; toast.style.transform = 'translateY(-8px)'; toast.style.transition = 'all 200ms';
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 200);
  }

  /* ── passwordStrength ──────────────────────────────────────
     Returns { level, label, bars, color } for a given password.
  ────────────────────────────────────────────────────────── */
  function passwordStrength(pwd) {
    if (!pwd || pwd.length === 0) return { level: 0, label: '', bars: 0, color: '' };
    var len = pwd.length;
    var hasUpper  = /[A-Z]/.test(pwd);
    var hasLower  = /[a-z]/.test(pwd);
    var hasNumber = /[0-9]/.test(pwd);
    var hasSymbol = /[^A-Za-z0-9]/.test(pwd);

    if (len >= 12 && hasSymbol && hasUpper && hasNumber) return { level: 5, label: 'Very Strong', bars: 5, color: 'primary' };
    if (len >= 8  && hasUpper && hasLower && hasNumber)  return { level: 4, label: 'Strong',      bars: 4, color: 'primary' };
    if (len >= 8  && (hasUpper || hasNumber))             return { level: 3, label: 'Moderate',    bars: 3, color: 'warning' };
    if (len >= 6)                                         return { level: 2, label: 'Fair',        bars: 2, color: 'warning' };
    return { level: 1, label: 'Weak', bars: 1, color: 'danger' };
  }

  /* ── updateStrengthMeter ───────────────────────────────────
     Update .strength-bars + .strength-label inside meterEl.
  ────────────────────────────────────────────────────────── */
  function updateStrengthMeter(meterEl, password) {
    var s = passwordStrength(password);
    var bars = meterEl.querySelectorAll('.strength-bar');
    bars.forEach(function (bar, i) {
      bar.className = 'strength-bar';
      if (i < s.bars && s.color) bar.classList.add('filled-' + s.color);
    });
    var label = meterEl.querySelector('.strength-label');
    if (label) {
      label.textContent = s.label;
      label.style.color = s.color ? 'var(--' + s.color + ')' : 'var(--text-muted)';
    }
  }

  /* ── THEME (light / dark) ──────────────────────────────────
     Persists to localStorage, falls back to system preference.
     Toggle any element with [data-theme-toggle] or call AG.toggleTheme().
     Mirrors the Flutter Riverpod themeProvider + ThemeData.dark().
  ────────────────────────────────────────────────────────── */
  var THEME_KEY = 'ag-theme';

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function applyTheme(theme, animate) {
    var root = document.documentElement;
    if (animate) {
      root.classList.add('theme-switching');
      setTimeout(function () { root.classList.remove('theme-switching'); }, 320);
    }
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* private mode */ }
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    });
  }

  function toggleTheme() {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark', true);
  }

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
    var prefersDark = window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'), false);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', toggleTheme);
    });
  }

  /* Apply theme attribute ASAP (reduces flash), wire toggles on DOM ready */
  (function () {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }());
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }

  /* Public API */
  return {
    formatINR:          formatINR,
    formatPercent:      formatPercent,
    formatDate:         formatDate,
    initDigitBoxes:     initDigitBoxes,
    startCountdown:     startCountdown,
    initBottomNav:      initBottomNav,
    initTopNav:         initTopNav,
    initSlideOver:      initSlideOver,
    initModal:          initModal,
    initDemoBar:        initDemoBar,
    showToast:          showToast,
    passwordStrength:   passwordStrength,
    updateStrengthMeter: updateStrengthMeter,
    getTheme:           getTheme,
    applyTheme:         applyTheme,
    toggleTheme:        toggleTheme,
    initTheme:          initTheme
  };
}());
