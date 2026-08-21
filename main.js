/**
 * YORI v4 — main.js
 * 60fps rAF loop, Emotion State Machine, Smart Cursor, Waking Demo
 */

document.addEventListener('DOMContentLoaded', () => {

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasCoarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const allowMotion = !prefersReducedMotion && !hasCoarsePointer;

  /* ==========================================
     1. CUSTOM SMART CURSOR & HOVER
     ========================================== */
  const cursor = document.getElementById('custom-cursor');
  const cursorEnabled = Boolean(cursor && allowMotion);
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let cursorTx = mouseX;
  let cursorTy = mouseY;

  if (cursor && !cursorEnabled) cursor.style.display = 'none';

  if (cursorEnabled) {
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
    document.addEventListener('mouseup', () => cursor.classList.remove('clicking'));
  }

  // Handle dark mode cursor and hover states
  if (cursorEnabled) {
    document.addEventListener('mouseover', (e) => {
      const isDark = e.target.closest('[data-theme="dark"]');
      if (isDark) cursor.classList.add('light-mode');
      else cursor.classList.remove('light-mode');

      const isHoverable = e.target.closest('a, button, [role="button"], .card, .feature-card, .speech-bubble');
      if (isHoverable) cursor.classList.add('hovered');
      else cursor.classList.remove('hovered');
    });
  }

  /* ==========================================
     2. YORI EMOTIONS SYSTEM
     ========================================== */
  // We manage the "Hero" and "Personality" phones as always awake but idling.
  // The Demo phone is sleeping until woken.

  // Elements
  const heroLeft = document.getElementById('left-eye-hero');
  const heroRight = document.getElementById('right-eye-hero');
  const demoLeft = document.getElementById('demo-left-eye');
  const demoRight = document.getElementById('demo-right-eye');
  const persLeft = document.getElementById('pers-left');
  const persRight = document.getElementById('pers-right');
  const hasAnimatedFaces = [heroLeft, heroRight, demoLeft, demoRight, persLeft, persRight].some(Boolean);

  // Eye movement boundaries
  const maxTx = 14;
  const maxTy = 14;

  let demoAwake = false;

  // Waking the Demo Phone
  const wakeBtn = document.getElementById('wake-btn-demo');
  const demoStatusText = document.getElementById('status-text');
  const demoStatusDot = document.getElementById('status-dot');
  const demoFace = document.getElementById('demo-face');
  const demoSleeping = document.getElementById('demo-sleeping');
  const demoGlow = document.getElementById('demo-glow');

  if (wakeBtn) {
    wakeBtn.addEventListener('click', wakeYori);
  }

  function wakeYori() {
    if (demoAwake) {
      // Put to sleep
      demoAwake = false;
      demoFace.classList.remove('visible');
      demoSleeping.style.display = 'flex';
      wakeBtn.textContent = 'Wake Yori';
      demoStatusText.textContent = 'Sleeping';
      demoStatusDot.className = 'status-dot';
      demoGlow.classList.remove('active');
    } else {
      // Wake up
      wakeBtn.disabled = true;
      demoStatusText.textContent = 'Waking...';
      demoStatusDot.className = 'status-dot waking';

      // 1. Initial wake squint
      demoLeft.style.transform   = 'scaleY(0.04)';
      demoRight.style.transform  = 'scaleY(0.04)';
      demoSleeping.style.display = 'none';
      demoFace.classList.add('visible');

      // 2. Open eyes slowly
      setTimeout(() => {
        demoLeft.style.transform   = 'scaleY(0.4)';
        demoRight.style.transform  = 'scaleY(0.4)';
      }, 700);

      // 3. Fully awake
      setTimeout(() => {
        demoLeft.style.transform   = 'scaleY(1)';
        demoRight.style.transform  = 'scaleY(1)';
        demoAwake = true;
        wakeBtn.textContent = 'Put to Sleep';
        wakeBtn.disabled = false;
        demoStatusText.textContent = 'Awake — move your cursor';
        demoStatusDot.className = 'status-dot awake';
        demoGlow.classList.add('active');
      }, 1400);
    }
  }

  /* --- Emotion State Machine Variables --- */
  let currentEmotion = 'idle';
  let emotionTimer = 0;
  let emotionTargetTx = 0;
  let emotionTargetTy = 0;
  let emotionScale = 1;
  
  function triggerEmotion(emotion) {
    currentEmotion = emotion;
    emotionTimer = performance.now();
    
    switch (emotion) {
      case 'thinking':
        // Look up
        emotionTargetTx = 0;
        emotionTargetTy = -12;
        emotionScale = 1;
        break;
      case 'happy':
        // Gentle widen
        emotionTargetTx = 0;
        emotionTargetTy = 0;
        emotionScale = 1.15;
        break;
      case 'confused':
        // Look to the side
        emotionTargetTx = 8;
        emotionTargetTy = -4;
        emotionScale = 0.9;
        break;
      case 'idle':
      default:
        emotionScale = 1;
        break;
    }
    
    // Auto-return to idle after 1.5s
    setTimeout(() => {
      if (currentEmotion === emotion) {
        currentEmotion = 'idle';
        emotionScale = 1;
      }
    }, 1500 + Math.random() * 1000);
  }

  // Randomly trigger idle emotions only on pages that contain animated faces.
  if (allowMotion && hasAnimatedFaces) {
    setInterval(() => {
      if (currentEmotion === 'idle' && Math.random() > 0.4) {
        const emotions = ['thinking', 'happy', 'confused'];
        triggerEmotion(emotions[Math.floor(Math.random() * emotions.length)]);
      }
    }, 5000);
  }

  // Random blinking (independent of state)
  if (allowMotion && hasAnimatedFaces) {
    setInterval(() => {
      const eyes = [heroLeft, heroRight, persLeft, persRight];
      if (demoAwake) eyes.push(demoLeft, demoRight);

      eyes.forEach(eye => {
        if (!eye) return;
        // Use CSS animation for blink, then remove
        eye.classList.add('blink-anim');
        setTimeout(() => eye.classList.remove('blink-anim'), 200);
      });
    }, 4500);
  }

  /* ==========================================
     3. 60FPS LERP LOOP
     ========================================== */
  // We use separate lerped variables for smooth catching up
  let heroTx = 0, heroTy = 0;
  let demoTx = 0, demoTy = 0;
  let persTx = 0, persTy = 0;

  function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  let animationFrameId = null;

  function render() {
    if (document.hidden) {
      animationFrameId = null;
      return;
    }

    // 1. Lerp cursor when the desktop custom cursor is enabled.
    if (cursorEnabled) {
      cursorTx = lerp(cursorTx, mouseX, 0.25);
      cursorTy = lerp(cursorTy, mouseY, 0.25);
      cursor.style.transform = `translate(${cursorTx}px, ${cursorTy}px)`;
    }

    // 2. Calculate normalized mouse tracking (-1 to 1)
    let normX = (mouseX / window.innerWidth) * 2 - 1;
    let normY = (mouseY / window.innerHeight) * 2 - 1;

    let targetTx = normX * maxTx;
    let targetTy = normY * maxTy;

    // Apply emotion overrides if active
    if (currentEmotion !== 'idle') {
      targetTx = emotionTargetTx;
      targetTy = emotionTargetTy;
    }

    // --- Hero Lerp ---
    heroTx = lerp(heroTx, targetTx, 0.08);
    heroTy = lerp(heroTy, targetTy, 0.08);
    const hTransform = `translate(${heroTx}px, ${heroTy}px) scale(${emotionScale})`;
    if (heroLeft) heroLeft.style.transform = hTransform;
    if (heroRight) heroRight.style.transform = hTransform;

    // --- Demo Lerp ---
    if (demoAwake) {
      demoTx = lerp(demoTx, targetTx, 0.08);
      demoTy = lerp(demoTy, targetTy, 0.08);
      const dTransform = `translate(${demoTx}px, ${demoTy}px) scale(${emotionScale})`;
      if (demoLeft) demoLeft.style.transform = dTransform;
      if (demoRight) demoRight.style.transform = dTransform;
    }

    // --- Pers Lerp ---
    // Personality phone eyes move a bit less
    persTx = lerp(persTx, targetTx * 0.5, 0.08);
    persTy = lerp(persTy, targetTy * 0.5, 0.08);
    const pTransform = `translate(${persTx}px, ${persTy}px) scale(${emotionScale})`;
    if (persLeft) persLeft.style.transform = pTransform;
    if (persRight) persRight.style.transform = pTransform;

    animationFrameId = requestAnimationFrame(render);
  }

  function startAnimationLoop() {
    if (!allowMotion || animationFrameId !== null || document.hidden || (!cursorEnabled && !hasAnimatedFaces)) return;
    animationFrameId = requestAnimationFrame(render);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    } else {
      startAnimationLoop();
    }
  });

  startAnimationLoop();

  /* ==========================================
     4. DEMO ORIENTATION TOGGLE
     ========================================== */
  const btnPortrait = document.getElementById('btn-portrait');
  const btnLandscape = document.getElementById('btn-landscape');
  const demoPhone = document.getElementById('demo-phone');

  if (btnPortrait && btnLandscape) {
    btnPortrait.addEventListener('click', () => {
      demoPhone.classList.remove('landscape');
      btnPortrait.classList.add('active');
      btnLandscape.classList.remove('active');
    });
    btnLandscape.addEventListener('click', () => {
      demoPhone.classList.add('landscape');
      btnLandscape.classList.add('active');
      btnPortrait.classList.remove('active');
    });
  }

  /* ==========================================
     5. SCROLL REVEAL & NAV BLUR
     ========================================== */
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    if (!nav) return;
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }, { passive: true });

  const reveals = document.querySelectorAll('.reveal, .pipeline-step, .pipeline-arrow, .feature-card, .speech-bubble, .story-text');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

  reveals.forEach(r => observer.observe(r));

  /* ==========================================
     6. EASTER EGG (SLEEPING YORI)
     ========================================== */
  const egg = document.getElementById('sleeping-egg');
  const zzz = document.getElementById('egg-zzz');
  
  if (egg) {
    egg.addEventListener('click', () => {
      egg.classList.add('waking');
      setTimeout(() => {
        if (zzz) zzz.style.display = 'none';
        
        // Blink sequence
        const svgPath1 = egg.querySelector('path:nth-child(1)');
        const svgPath2 = egg.querySelector('path:nth-child(2)');
        
        if (svgPath1 && svgPath2) {
          // Open
          svgPath1.setAttribute('d', 'M5 13 Q11 1 17 13');
          svgPath2.setAttribute('d', 'M35 13 Q41 1 47 13');
          
          setTimeout(() => {
            // Blink
            svgPath1.setAttribute('d', 'M5 13 Q11 13 17 13');
            svgPath2.setAttribute('d', 'M35 13 Q41 13 47 13');
            setTimeout(() => {
              // Re-open
              svgPath1.setAttribute('d', 'M5 13 Q11 1 17 13');
              svgPath2.setAttribute('d', 'M35 13 Q41 1 47 13');
            }, 100);
          }, 800);
        }
      }, 250);
    });
  }

  /* ==========================================
     7. SUPPORT US ADSENSE LOGIC
     ========================================== */
  const supportBtns = document.querySelectorAll('.support-ad-btn');
  const thankYouToast = document.getElementById('thank-you-toast');
  const adblockModal = document.getElementById('adblock-modal');
  const adblockClose = document.getElementById('adblock-close');

  if (adblockClose) {
    adblockClose.addEventListener('click', () => {
      adblockModal.classList.remove('show');
    });
  }

  supportBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();

      const supportSpinner = btn.querySelector('.support-spinner');
      const btnText = btn.querySelector('.btn-text');
      
      // Show spinner, hide text
      if (supportSpinner) supportSpinner.style.display = 'block';
      if (btnText) btnText.style.display = 'none';
      btn.disabled = true;

      // Open the Adsterra Smartlink ad in a new tab immediately
      const adUrl = "https://www.effectivecpmnetwork.com/pzzjt2dzf?key=d107a5bc4a1adae77496ce6684196d6a";
      const adWindow = window.open(adUrl, '_blank');

      // Mobile browsers may block a new tab. Fall back to the current tab so the support action still works.
      if (!adWindow) window.location.assign(adUrl);

      // Keep the button "loading" for a short time to simulate processing
      // and then show the thank you toast.
      setTimeout(() => {
        // Hide spinner, show text
        if (supportSpinner) supportSpinner.style.display = 'none';
        if (btnText) btnText.style.display = 'flex'; // Use flex to maintain icon alignment
        btn.disabled = false;

        // Show Thank You toast
        if (thankYouToast) {
          thankYouToast.classList.add('show');
          setTimeout(() => {
            thankYouToast.classList.remove('show');
          }, 4000);
        }
      }, 2500);
    });
  });
});
