/* ============================================================
   ArthaGrid — Shared Navigation & Utility JS v1.0
   2026-06-05
   ============================================================ */

'use strict';

/* ─── INR FORMATTING ────────────────────────────────────────── */

/**
 * Formats a paise value (integer) to an INR display string.
 * All monetary values in ArthaGrid are stored and passed as paise.
 *
 * @param {number} paise - Amount in paise (integer). e.g., 12350000 = ₹1,23,500
 * @param {Object} [opts]
 * @param {boolean} [opts.showPaise=false] - Show decimal paise values
 * @param {boolean} [opts.compact=false]   - Use compact notation (₹1.24L, ₹2.5Cr)
 * @returns {string}
 *
 * @example
 * formatINR(10000000)               // → "₹1,00,000"
 * formatINR(1235000000, {compact:true}) // → "₹12.35Cr"
 */
function formatINR(paise, opts = {}) {
  const rupees = paise / 100;

  if (opts.compact) {
    if (rupees >= 1_00_00_000) return `₹${(rupees / 1_00_00_000).toFixed(2)}Cr`;
    if (rupees >= 1_00_000)    return `₹${(rupees / 1_00_000).toFixed(2)}L`;
    if (rupees >= 1_000)       return `₹${(rupees / 1_000).toFixed(1)}K`;
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: opts.showPaise ? 2 : 0,
    maximumFractionDigits: opts.showPaise ? 2 : 0,
  }).format(rupees);
}

/**
 * Formats a percentage value.
 * @param {number} value - The percentage (e.g. 12.5 for 12.5%)
 * @param {number} [decimals=2]
 * @returns {string}
 */
function formatPercent(value, decimals = 2) {
  return `${value.toFixed(decimals)}%`;
}

/* ─── PASSWORD STRENGTH ─────────────────────────────────────── */

const STRENGTH_LEVELS = [
  { level: 0, text: '',           bars: 0 },
  { level: 1, text: 'Weak',       bars: 1 },
  { level: 2, text: 'Fair',       bars: 2 },
  { level: 3, text: 'Moderate',   bars: 3 },
  { level: 4, text: 'Strong',     bars: 4 },
  { level: 5, text: 'Very Strong', bars: 5 },
];

/**
 * Evaluates password strength per ArthaGrid spec.
 * @param {string} password
 * @returns {{ level: number, text: string, bars: number }}
 */
function getPasswordStrength(password) {
  if (!password) return STRENGTH_LEVELS[0];

  const len       = password.length;
  const hasUpper  = /[A-Z]/.test(password);
  const hasLower  = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (len < 6 || (!hasUpper && !hasNumber && !hasSymbol)) return STRENGTH_LEVELS[1]; // Weak
  if (len <= 7)                                            return STRENGTH_LEVELS[2]; // Fair
  if (len >= 8 && !hasNumber && !hasSymbol)               return STRENGTH_LEVELS[3]; // Moderate
  if (len >= 12 && hasSymbol)                             return STRENGTH_LEVELS[5]; // Very Strong
  if (len >= 8 && hasUpper && hasLower && hasNumber)      return STRENGTH_LEVELS[4]; // Strong
  return STRENGTH_LEVELS[3];                                                          // Moderate
}

/**
 * Binds a live password strength meter to an input.
 * @param {HTMLInputElement} input
 * @param {HTMLElement} meterEl - Element with class `strength-meter`
 */
function bindStrengthMeter(input, meterEl) {
  const labelEl = meterEl.querySelector('.strength-label-text');
  if (!input || !meterEl || !labelEl) return;

  input.addEventListener('input', () => {
    const result = getPasswordStrength(input.value);
    meterEl.dataset.level = result.level;
    labelEl.textContent = result.text;
  });
}

/* ─── OTP / PIN DIGIT BOXES ─────────────────────────────────── */

/**
 * Wires up OTP/PIN digit boxes for auto-advance, backspace, paste.
 * @param {HTMLElement} container - Parent element containing .digit-box inputs
 * @param {Function} [onComplete] - Called with the full digit string when all filled
 */
function initDigitBoxes(container, onComplete) {
  const boxes = Array.from(container.querySelectorAll('.digit-box'));
  if (!boxes.length) return;

  boxes.forEach((box, idx) => {
    box.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '').slice(-1);
      e.target.value = val;

      if (val) {
        box.classList.add('filled');
        box.classList.remove('error');
        if (idx < boxes.length - 1) boxes[idx + 1].focus();
        else if (onComplete) {
          const full = boxes.map(b => b.value).join('');
          if (full.length === boxes.length) onComplete(full);
        }
      } else {
        box.classList.remove('filled');
      }
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        boxes[idx - 1].focus();
        boxes[idx - 1].value = '';
        boxes[idx - 1].classList.remove('filled');
      }
      // Allow Tab, arrow keys
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      text.split('').forEach((char, i) => {
        if (boxes[i]) {
          boxes[i].value = char;
          boxes[i].classList.add('filled');
        }
      });
      const next = boxes[Math.min(text.length, boxes.length - 1)];
      if (next) next.focus();
      if (text.length >= boxes.length && onComplete) {
        const full = boxes.map(b => b.value).join('');
        onComplete(full);
      }
    });
  });
}

/**
 * Shakes all digit boxes to indicate an error, then clears them.
 * @param {HTMLElement} container
 */
function shakeDigitBoxes(container) {
  const boxes = container.querySelectorAll('.digit-box');
  boxes.forEach(b => {
    b.classList.add('error');
    b.value = '';
    setTimeout(() => { b.classList.remove('error', 'filled'); }, 600);
  });
  if (boxes[0]) boxes[0].focus();
}

/* ─── COUNTDOWN TIMER ───────────────────────────────────────── */

/**
 * Starts a MM:SS countdown.
 * @param {HTMLElement} el - Element to write the time into
 * @param {number} seconds - Total seconds to count down from
 * @param {Function} [onExpire] - Called when timer reaches 0
 * @returns {{ stop: Function }} — call stop() to cancel
 */
function startCountdown(el, seconds, onExpire) {
  let remaining = seconds;

  function tick() {
    const m = String(Math.floor(remaining / 60)).padStart(2, '0');
    const s = String(remaining % 60).padStart(2, '0');
    el.textContent = `${m}:${s}`;
    el.classList.toggle('urgent', remaining <= 120);
    if (remaining <= 0) {
      if (onExpire) onExpire();
      return;
    }
    remaining--;
  }

  tick();
  const timer = setInterval(() => {
    remaining--;
    tick();
    if (remaining < 0) clearInterval(timer);
  }, 1000);

  return { stop: () => clearInterval(timer) };
}

/* ─── IDLE TIMER (Session Lock) ─────────────────────────────── */

/**
 * Starts the idle session lock timer.
 * @param {number} timeoutMs - Idle timeout in milliseconds (default 15 min)
 * @param {Function} onLock - Called when idle timeout fires
 * @returns {{ reset: Function, stop: Function }}
 */
function initIdleTimer(timeoutMs = 15 * 60 * 1000, onLock) {
  let timer = null;

  function reset() {
    clearTimeout(timer);
    timer = setTimeout(onLock, timeoutMs);
  }

  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
  events.forEach(ev => document.addEventListener(ev, reset, { passive: true }));

  reset(); // start immediately

  return {
    reset,
    stop() {
      clearTimeout(timer);
      events.forEach(ev => document.removeEventListener(ev, reset));
    }
  };
}

/* ─── BOTTOM NAV ACTIVE STATE ───────────────────────────────── */

/**
 * Marks the correct bottom-nav item active based on the current pathname.
 */
function initBottomNav() {
  const items = document.querySelectorAll('.bottom-nav__item[data-route]');
  const path = window.location.pathname;
  items.forEach(item => {
    item.classList.toggle('active', path.includes(item.dataset.route));
  });
}

/* ─── EXPOSE GLOBALS ────────────────────────────────────────── */
window.AG = {
  formatINR,
  formatPercent,
  getPasswordStrength,
  bindStrengthMeter,
  initDigitBoxes,
  shakeDigitBoxes,
  startCountdown,
  initIdleTimer,
  initBottomNav,
};
