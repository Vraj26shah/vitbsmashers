/* ================================================================
   interactive.js — Scholars Stack Interactive Enhancement Layer
   Pure vanilla JS, zero dependencies
   ================================================================ */

(function () {
    'use strict';

    const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const IS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Inject once shared CSS keyframes ─────────────────────── */
    const sharedCSS = document.createElement('style');
    sharedCSS.id = 'ss-interactive-css';
    sharedCSS.textContent = `
        @keyframes ssRipple   { to { transform:scale(3.8); opacity:0; } }
        @keyframes ssTwBlink  { 50% { opacity:0; } }
        @keyframes ssChevron  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(7px)} }
        @keyframes ssConfetti { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
        @keyframes ssFabPop   { 0%{transform:translateY(90px);opacity:0} 100%{transform:translateY(0);opacity:1} }

        .tw-target { color: var(--accent-teal, #2ecc71); }
        .tw-target::after {
            content: '';
            display: inline-block;
            width: 2px;
            height: 0.85em;
            background: var(--accent-teal, #2ecc71);
            vertical-align: middle;
            margin-left: 3px;
            border-radius: 1px;
            animation: ssTwBlink 0.75s step-end infinite;
        }

        #ss-glow-cursor {
            position: fixed;
            width: 32px; height: 32px;
            border-radius: 50%;
            pointer-events: none;
            z-index: 99998;
            mix-blend-mode: screen;
            background: radial-gradient(circle, rgba(46,204,113,.55) 0%, rgba(52,152,219,.12) 60%, transparent 80%);
            transform: translate(-50%,-50%);
            transition: width .22s ease, height .22s ease, background .22s ease;
        }

        #ss-fab {
            position: fixed; bottom: 22px; right: 22px; z-index: 1002;
            background: linear-gradient(135deg, #2ecc71, #1a9c52);
            color: #fff; border-radius: 50px;
            padding: 11px 20px 11px 15px;
            display: flex; align-items: center; gap: 8px;
            font-family: Poppins, sans-serif; font-weight: 700; font-size: .85rem;
            text-decoration: none;
            box-shadow: 0 8px 28px rgba(46,204,113,.45);
            transition: transform .4s cubic-bezier(.34,1.56,.64,1), box-shadow .3s, opacity .3s;
            transform: translateY(90px); opacity: 0; pointer-events: none;
        }
        #ss-fab.visible { transform: translateY(0); opacity: 1; pointer-events: auto; }
        #ss-fab:hover   { transform: translateY(-4px) scale(1.04) !important; box-shadow: 0 18px 44px rgba(46,204,113,.65); }

        #ss-progress {
            position: fixed; top: 0; left: 0; height: 3px; width: 0;
            background: linear-gradient(90deg, #2ecc71, #3498db, #9b59b6);
            z-index: 10001; pointer-events: none;
            box-shadow: 0 0 8px rgba(46,204,113,.7);
        }

        .ss-scroll-hint {
            text-align: center; margin-top: 8px; cursor: pointer; opacity: .7;
        }
        .ss-scroll-hint i {
            font-size: 1.1rem; color: var(--accent-teal, #2ecc71);
            animation: ssChevron 1.9s ease infinite;
            display: inline-block;
        }

        /* Scroll reveal utility */
        .ss-reveal {
            opacity: 0;
            transform: translateY(26px);
            transition: opacity .65s ease, transform .65s cubic-bezier(.4,0,.2,1);
        }
        .ss-reveal.in { opacity: 1; transform: translateY(0); }
    `;
    document.head.appendChild(sharedCSS);

    /* ══════════════════════════════════════════════════
       1. SCROLL PROGRESS BAR
    ══════════════════════════════════════════════════ */
    function initScrollProgress() {
        const bar = document.createElement('div');
        bar.id = 'ss-progress';
        document.body.appendChild(bar);

        window.addEventListener('scroll', () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.width = max > 0 ? (window.scrollY / max * 100) + '%' : '0';
        }, { passive: true });
    }

    /* ══════════════════════════════════════════════════
       2. HERO TYPEWRITER
    ══════════════════════════════════════════════════ */
    function initTypewriter() {
        if (IS_REDUCED) return;
        const h1 = document.querySelector('.hero-text h1');
        if (!h1) return;

        const words = ['Academic Performance', 'GPA Score', 'Study Game', 'Career Path'];
        let wi = 0, ci = 0, deleting = false;

        h1.innerHTML = 'Transform Your <span id="tw-span" class="tw-target"></span>';
        const span = document.getElementById('tw-span');
        if (!span) return;

        function tick() {
            const word = words[wi];
            if (!deleting) {
                span.textContent = word.slice(0, ++ci);
                if (ci >= word.length) { deleting = true; return setTimeout(tick, 1900); }
                setTimeout(tick, 78);
            } else {
                span.textContent = word.slice(0, --ci);
                if (ci <= 0) { deleting = false; wi = (wi + 1) % words.length; }
                setTimeout(tick, 44);
            }
        }
        setTimeout(tick, 1200);
    }

    /* ══════════════════════════════════════════════════
       3. 3D TILT ON CARDS (desktop only)
    ══════════════════════════════════════════════════ */
    function initCardTilt() {
        if (IS_TOUCH || IS_REDUCED) return;

        function attachTilt(el, maxDeg) {
            el.style.willChange = 'transform';
            el.addEventListener('mouseenter', () => {
                el.style.transition = 'transform .1s ease, box-shadow .3s ease';
            });
            el.addEventListener('mousemove', e => {
                const r = el.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - 0.5;
                const y = (e.clientY - r.top)  / r.height - 0.5;
                el.style.transform = `perspective(900px) rotateY(${x * maxDeg}deg) rotateX(${-y * maxDeg}deg) translateZ(8px)`;
            });
            el.addEventListener('mouseleave', () => {
                el.style.transition = 'transform .45s ease, box-shadow .3s ease';
                el.style.transform = '';
            });
        }

        document.querySelectorAll('.benefit-card').forEach(c => attachTilt(c, 10));
        document.querySelectorAll('.testimonial-card').forEach(c => attachTilt(c, 8));
        document.querySelectorAll('.showcase-card').forEach(c => attachTilt(c, 6));
    }

    /* ══════════════════════════════════════════════════
       4. RIPPLE EFFECT
    ══════════════════════════════════════════════════ */
    function initRipple() {
        function attach(el) {
            if (el.dataset.ssRipple) return;
            el.dataset.ssRipple = '1';
            const old = el.style.position;
            if (!old || old === 'static') el.style.position = 'relative';
            el.style.overflow = 'hidden';

            el.addEventListener('pointerdown', e => {
                const r = el.getBoundingClientRect();
                const size = Math.max(r.width, r.height) * 2.2;
                const x = e.clientX - r.left - size / 2;
                const y = e.clientY - r.top  - size / 2;
                const rip = document.createElement('span');
                rip.style.cssText = `
                    position:absolute;left:${x}px;top:${y}px;
                    width:${size}px;height:${size}px;border-radius:50%;
                    background:rgba(255,255,255,0.2);transform:scale(0);
                    animation:ssRipple .55s ease-out forwards;
                    pointer-events:none;z-index:0;
                `;
                el.appendChild(rip);
                setTimeout(() => rip.remove(), 620);
            });
        }

        const sel = '.btn, .nav-btn, .custom-google-btn, .access-now, .btn-primary1, .showcase-card-cta, .showcase-all-link';
        document.querySelectorAll(sel).forEach(attach);

        // Watch for new elements (e.g., after AJAX)
        new MutationObserver(() => document.querySelectorAll(sel).forEach(attach))
            .observe(document.body, { childList: true, subtree: true });
    }

    /* ══════════════════════════════════════════════════
       5. GLOW CURSOR (desktop only)
    ══════════════════════════════════════════════════ */
    function initGlowCursor() {
        if (IS_TOUCH || window.innerWidth < 900) return;

        const glow = document.createElement('div');
        glow.id = 'ss-glow-cursor';
        document.body.appendChild(glow);

        let mx = -400, my = -400, cx = -400, cy = -400;

        document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });

        const hoverSel = 'a, button, .feature-card, .benefit-card, .showcase-card, .testimonial-card, .nav-btn';
        document.querySelectorAll(hoverSel).forEach(el => {
            el.addEventListener('mouseenter', () => {
                glow.style.width = glow.style.height = '58px';
                glow.style.background = 'radial-gradient(circle,rgba(52,152,219,.45) 0%,rgba(46,204,113,.12) 65%,transparent 80%)';
            });
            el.addEventListener('mouseleave', () => {
                glow.style.width = glow.style.height = '32px';
                glow.style.background = 'radial-gradient(circle,rgba(46,204,113,.55) 0%,rgba(52,152,219,.12) 60%,transparent 80%)';
            });
        });

        (function loop() {
            cx += (mx - cx) * 0.13;
            cy += (my - cy) * 0.13;
            glow.style.left = cx + 'px';
            glow.style.top  = cy + 'px';
            requestAnimationFrame(loop);
        })();
    }

    /* ══════════════════════════════════════════════════
       6. BACKGROUND PARTICLE PARALLAX
    ══════════════════════════════════════════════════ */
    function initParallax() {
        if (IS_TOUCH || IS_REDUCED) return;
        const bg = document.querySelector('.bg-particles');
        if (!bg) return;

        let tx = 0, ty = 0, cx = 0, cy = 0;
        document.addEventListener('mousemove', e => {
            tx = (e.clientX / window.innerWidth  - 0.5) * 18;
            ty = (e.clientY / window.innerHeight - 0.5) * 18;
        }, { passive: true });

        (function loop() {
            cx += (tx - cx) * 0.035;
            cy += (ty - cy) * 0.035;
            bg.style.transform = `translate(${cx}px,${cy}px)`;
            requestAnimationFrame(loop);
        })();
    }

    /* ══════════════════════════════════════════════════
       7. FLOATING ACTION BUTTON
    ══════════════════════════════════════════════════ */
    function initFAB() {
        const fab = document.createElement('a');
        fab.id = 'ss-fab';
        fab.href = 'features/marketplace/market.html?sidebar=active';
        fab.setAttribute('aria-label', 'Explore Notes Marketplace');
        fab.innerHTML = '<i class="fas fa-bolt"></i><span>Explore Notes</span>';
        document.body.appendChild(fab);

        window.addEventListener('scroll', () => {
            fab.classList.toggle('visible', window.scrollY > 300);
        }, { passive: true });
    }

    /* ══════════════════════════════════════════════════
       9. CONFETTI ON CTA CLICKS
    ══════════════════════════════════════════════════ */
    function initConfetti() {
        const COLORS = ['#2ecc71','#3498db','#f39c12','#9b59b6','#e74c3c','#1abc9c','#f1c40f'];

        function burst(btn) {
            const r = btn.getBoundingClientRect();
            const ox = r.left + r.width / 2;
            for (let i = 0; i < 90; i++) {
                setTimeout(() => {
                    const el = document.createElement('div');
                    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
                    const size  = 5 + Math.random() * 7;
                    const startX = ox + (Math.random() - 0.5) * 240;
                    el.style.cssText = `
                        position:fixed;left:${startX}px;top:${r.top}px;
                        width:${size}px;height:${size}px;background:${color};
                        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
                        pointer-events:none;z-index:99999;
                        animation:ssConfetti ${1.3 + Math.random() * 1.7}s ease-in-out forwards;
                    `;
                    document.body.appendChild(el);
                    setTimeout(() => el.remove(), 3200);
                }, i * 16);
            }
        }

        document.querySelectorAll('.btn-primary1, .cta .btn-primary, .cta .btn-light').forEach(btn => {
            btn.addEventListener('click', () => burst(btn));
        });
    }

    /* ══════════════════════════════════════════════════
       10. MAGNETIC BUTTONS (desktop only)
    ══════════════════════════════════════════════════ */
    function initMagnetic() {
        if (IS_TOUCH || window.innerWidth < 900) return;

        document.querySelectorAll('.nav-btn, .cta .btn-primary, .cta .btn-light, #ssFAB').forEach(btn => {
            btn.addEventListener('mouseenter', () => { btn.style.transition = 'transform .1s ease'; });
            btn.addEventListener('mousemove', e => {
                const r = btn.getBoundingClientRect();
                const x = (e.clientX - r.left - r.width  / 2) * 0.28;
                const y = (e.clientY - r.top  - r.height / 2) * 0.28;
                btn.style.transform = `translate(${x}px,${y}px)`;
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transition = 'transform .45s cubic-bezier(.34,1.56,.64,1)';
                btn.style.transform = '';
            });
        });
    }

    /* ══════════════════════════════════════════════════
       11. SCROLL REVEAL (supplements script.js)
    ══════════════════════════════════════════════════ */
    function initScrollReveal() {
        if (IS_REDUCED) return;
        const groups = [
            { sel: '.benefit-card',    delay: 85  },
            { sel: '.footer-column',   delay: 70  },
            { sel: '.cta-content',     delay: 0   },
            { sel: '.notes-showcase',  delay: 0   },
            { sel: '.section-title',   delay: 0   },
            { sel: '.quick-start-strip', delay: 0 },
        ];

        const io = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
            });
        }, { threshold: 0.1 });

        groups.forEach(({ sel, delay }) => {
            document.querySelectorAll(sel).forEach((el, i) => {
                el.classList.add('ss-reveal');
                el.style.transitionDelay = (i * delay) + 'ms';
                io.observe(el);
            });
        });
    }

    /* ══════════════════════════════════════════════════
       12. TESTIMONIAL SPOTLIGHT CYCLE
    ══════════════════════════════════════════════════ */
    function initTestimonialSpotlight() {
        if (IS_REDUCED) return;
        const cards = document.querySelectorAll('.testimonial-card');
        if (cards.length < 2) return;
        let idx = 0;

        // Only activate once the section is in view
        const io = new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting) return;
            io.disconnect();

            function cycle() {
                cards.forEach((c, i) => {
                    const on = i === idx;
                    c.style.transition = 'transform .5s ease, box-shadow .5s ease, opacity .5s ease';
                    c.style.transform  = on ? 'translateY(-10px) scale(1.025)' : 'scale(0.975)';
                    c.style.boxShadow  = on ? '0 22px 55px rgba(46,204,113,.2), 0 0 0 1px rgba(46,204,113,.28)' : '';
                    c.style.opacity    = on ? '1' : '0.72';
                });
                idx = (idx + 1) % cards.length;
            }
            cycle();
            setInterval(cycle, 3400);
        }, { threshold: 0.2 });

        const section = document.getElementById('testimonials');
        if (section) io.observe(section);
    }

    /* ══════════════════════════════════════════════════
       13. SCROLL-TO-EXPLORE HINT
    ══════════════════════════════════════════════════ */
    function initScrollHint() {
        const hero = document.querySelector('.hero');
        if (!hero) return;

        const hint = document.createElement('div');
        hint.className = 'ss-scroll-hint';
        hint.setAttribute('role', 'button');
        hint.setAttribute('aria-label', 'Scroll down to explore');
        hint.innerHTML = '<i class="fas fa-chevron-down"></i>';
        hint.addEventListener('click', () => {
            document.getElementById('why-join')?.scrollIntoView({ behavior: 'smooth' });
        });
        hero.appendChild(hint);

        const hideHint = () => {
            if (window.scrollY > 120) { hint.style.opacity = '0'; hint.style.pointerEvents = 'none'; }
        };
        window.addEventListener('scroll', hideHint, { passive: true });
    }

    /* ══════════════════════════════════════════════════
       14. STAT NUMBER GLOW ON REVEAL
    ══════════════════════════════════════════════════ */
    function initStatGlow() {
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                e.target.style.transition = 'text-shadow .5s ease';
                e.target.style.textShadow = '0 0 22px rgba(46,204,113,.65), 0 0 40px rgba(52,152,219,.3)';
                io.unobserve(e.target);
            });
        }, { threshold: 0.6 });

        document.querySelectorAll('.stat-number').forEach(n => io.observe(n));
    }

    /* ══════════════════════════════════════════════════
       15. FEATURE CARD HOVER GLOW RING
    ══════════════════════════════════════════════════ */
    function initFeatureGlow() {
        if (IS_TOUCH) return;
        document.querySelectorAll('.feature-card:not(.feature-card--disabled)').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transition = 'box-shadow .3s ease, border-color .3s ease, transform .3s ease';
                card.style.boxShadow = '0 0 0 2px rgba(46,204,113,.55), 0 16px 40px rgba(0,0,0,.35)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.boxShadow = '';
            });
        });
    }

    /* ══════════════════════════════════════════════════
       16. BENEFIT-SECTION ICON BOUNCE ON HOVER
    ══════════════════════════════════════════════════ */
    function initIconBounce() {
        document.querySelectorAll('.benefit-card').forEach(card => {
            const icon = card.querySelector('.benefit-icon');
            if (!icon) return;
            card.addEventListener('mouseenter', () => {
                icon.style.transition = 'transform .35s cubic-bezier(.34,1.56,.64,1)';
                icon.style.transform = 'scale(1.18) rotate(-6deg)';
            });
            card.addEventListener('mouseleave', () => {
                icon.style.transition = 'transform .3s ease';
                icon.style.transform = '';
            });
        });
    }

    /* ══════════════════════════════════════════════════
       INIT ALL
    ══════════════════════════════════════════════════ */
    function init() {
        initScrollProgress();
        initTypewriter();
        initCardTilt();
        initRipple();
        initGlowCursor();
        initParallax();
        initFAB();
        initConfetti();
        initMagnetic();
        initScrollReveal();
        initTestimonialSpotlight();
        initScrollHint();
        initStatGlow();
        initFeatureGlow();
        initIconBounce();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
