/**
 * ArthaGrid prototype utilities — window.AG
 * Mirrors the Dart core/utils/ functions used in the Flutter app.
 */

(function () {
  'use strict';

  const THEME_KEY = 'ag-theme';

  /* ───────────────────────────────────────────
     INR formatter  (mirrors formatINR(paise))
  ─────────────────────────────────────────── */
  function formatINR(paise, opts = {}) {
    const { compact = false, showPaise = false, showSign = false } = opts;
    const abs   = Math.abs(paise);
    const sign  = paise < 0 ? '−' : (showSign && paise > 0 ? '+' : '');
    const rupees = abs / 100;

    if (compact) {
      if (rupees >= 1e7) return `${sign}₹${(rupees / 1e7).toFixed(2)}Cr`;
      if (rupees >= 1e5) return `${sign}₹${(rupees / 1e5).toFixed(2)}L`;
      if (rupees >= 1e3) return `${sign}₹${(rupees / 1e3).toFixed(1)}K`;
    }
    // Indian number system: ##,##,###
    const intPart = Math.floor(rupees);
    const decPart = Math.round((rupees - intPart) * 100);
    const intStr  = String(intPart);
    let formatted = '';
    if (intStr.length <= 3) {
      formatted = intStr;
    } else {
      const last3  = intStr.slice(-3);
      const rest   = intStr.slice(0, -3);
      const groups = [];
      for (let i = rest.length; i > 0; i -= 2) {
        groups.unshift(rest.slice(Math.max(0, i - 2), i));
      }
      formatted = groups.join(',') + ',' + last3;
    }
    const paiseStr = showPaise ? `.${String(decPart).padStart(2,'0')}` : '';
    return `${sign}₹${formatted}${paiseStr}`;
  }

  /* ───────────────────────────────────────────
     Theme management
  ─────────────────────────────────────────── */
  function getTheme() {
    return localStorage.getItem(THEME_KEY) ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    // Update all toggle icons on the page
    document.querySelectorAll('[data-theme-icon]').forEach(el => {
      el.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
  }

  function toggleTheme() {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.add('theme-switching');
    applyTheme(next);
    setTimeout(() => document.documentElement.classList.remove('theme-switching'), 400);
  }

  function initTheme() {
    // Apply immediately (before paint) to prevent flash
    applyTheme(getTheme());
    // Wire any element with [data-theme-toggle] attribute
    document.querySelectorAll('[data-theme-toggle]').forEach(el => {
      el.addEventListener('click', toggleTheme);
    });
  }

  /* ───────────────────────────────────────────
     Bottom nav tab highlighting
  ─────────────────────────────────────────── */
  function initBottomNav(activeTab) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      if (tab.dataset.tab === activeTab) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  /* ───────────────────────────────────────────
     Toast notifications
  ─────────────────────────────────────────── */
  function showToast(message, type = 'success', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `<span style="font-size:16px">${icons[type]||'ℹ'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px) scale(.96)';
      toast.style.transition = 'opacity .2s, transform .2s';
      setTimeout(() => toast.remove(), 220);
    }, duration);
  }

  /* ───────────────────────────────────────────
     Count-up animation
  ─────────────────────────────────────────── */
  function countUp(el, targetPaise, duration = 900, opts = {}) {
    const start      = performance.now();
    const startValue = 0;
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (targetPaise - startValue) * eased);
      el.textContent = formatINR(current, opts);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = formatINR(targetPaise, opts);
    }
    requestAnimationFrame(step);
  }

  /* ───────────────────────────────────────────
     Progress ring helper
  ─────────────────────────────────────────── */
  function animateRing(svgEl, percent, radius = 44) {
    const circumference = 2 * Math.PI * radius;
    const fill = svgEl.querySelector('.progress-ring__fill');
    const track = svgEl.querySelector('.progress-ring__track');
    if (track) {
      track.setAttribute('r', radius);
      track.setAttribute('cx', radius + 8);
      track.setAttribute('cy', radius + 8);
      track.setAttribute('stroke-width', '8');
      track.setAttribute('stroke-dasharray', circumference);
      track.setAttribute('stroke-dashoffset', '0');
    }
    if (fill) {
      fill.setAttribute('r', radius);
      fill.setAttribute('cx', radius + 8);
      fill.setAttribute('cy', radius + 8);
      fill.setAttribute('stroke-width', '8');
      fill.setAttribute('stroke-dasharray', circumference);
      fill.setAttribute('stroke-dashoffset', circumference);
      // Animate
      requestAnimationFrame(() => {
        fill.style.transition = 'stroke-dashoffset .6s cubic-bezier(0.22,1,0.36,1)';
        fill.setAttribute('stroke-dashoffset', circumference * (1 - percent / 100));
      });
    }
  }

  /* ───────────────────────────────────────────
     PIN digit boxes
  ─────────────────────────────────────────── */
  function initDigitBoxes() {
    const boxes = document.querySelectorAll('.pin-box');
    boxes.forEach((box, i) => {
      box.addEventListener('input', () => {
        box.classList.toggle('filled', box.value.length > 0);
        if (box.value.length >= 1 && boxes[i + 1]) boxes[i + 1].focus();
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && boxes[i - 1]) {
          boxes[i - 1].focus();
          boxes[i - 1].value = '';
          boxes[i - 1].classList.remove('filled');
        }
      });
    });
  }

  /* ───────────────────────────────────────────
     Demo state switcher (for demo-bar buttons)
  ─────────────────────────────────────────── */
  function initDemoBar(stateMap) {
    /**
     * stateMap: { 'state-name': () => { /* update DOM *\/ } }
     * Buttons must be:  <button class="demo-btn" data-state="state-name">Label</button>
     */
    const btns = document.querySelectorAll('.demo-btn[data-state]');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const fn = stateMap[btn.dataset.state];
        if (fn) fn();
      });
    });
    // Activate first button
    if (btns.length) btns[0].click();
  }

  /* ───────────────────────────────────────────
     Sheet helpers
  ─────────────────────────────────────────── */
  function openSheet(id) {
    const backdrop = document.getElementById(id + '-backdrop');
    const sheet    = document.getElementById(id);
    if (backdrop) backdrop.classList.add('open');
    if (sheet)    sheet.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet(id) {
    const backdrop = document.getElementById(id + '-backdrop');
    const sheet    = document.getElementById(id);
    if (backdrop) backdrop.classList.remove('open');
    if (sheet)    sheet.classList.remove('open');
    document.body.style.overflow = '';
  }

  function openDialog(id) {
    const backdrop = document.getElementById(id + '-backdrop');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDialog(id) {
    const backdrop = document.getElementById(id + '-backdrop');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ───────────────────────────────────────────
     Auto-init on DOM ready
  ─────────────────────────────────────────── */
  function init() {
    initTheme();
    initDigitBoxes();
    // Wire sheet close via backdrop click
    document.querySelectorAll('.sheet-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          const sheetId = backdrop.id.replace('-backdrop', '');
          closeSheet(sheetId);
        }
      });
    });
    document.querySelectorAll('.dialog-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeDialog(backdrop.id.replace('-backdrop',''));
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ───────────────────────────────────────────
     Public API
  ─────────────────────────────────────────── */
  window.AG = {
    formatINR,
    getTheme,
    applyTheme,
    toggleTheme,
    initBottomNav,
    showToast,
    countUp,
    animateRing,
    initDigitBoxes,
    initDemoBar,
    openSheet,
    closeSheet,
    openDialog,
    closeDialog,
  };

})();
