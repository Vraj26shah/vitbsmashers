// ============================================================
// Interactive Tutorial System for FFCS Timetable Maker
// Keybr-style: spotlight highlight, scroll-then-show, animated cursor
// ============================================================

class TimetableTutorial {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.overlay = null;
        this.spotlight = null;
        this.tooltip = null;
        this.cursor = null;
        this.keyHandler = null;
        this.resizeHandler = null;
        this._clickHandlerRef = null; // active click interceptor
        this._spotlightTarget = null; // current highlighted element

        // ─── Tutorial Steps ───────────────────────────────────────────
        this.steps = [
            // 0 – Welcome (centred, no target)
            {
                title: "Welcome to FFCS Timetable Maker! 🎓",
                description: "This quick 1-minute interactive guide will walk you through every feature with live examples. Click <strong>Next</strong> to begin!",
                target: null,
                position: "center",
                action: null
            },

            // 1 – Point to the timetable grid
            {
                title: "Step 1: Your Timetable Grid",
                description: "This is the <strong>FFCS timetable grid</strong>. Each cell represents a unique time-slot code for VIT Bhopal. Scroll down to see the full table.",
                target: ".timetable-content table",
                position: "top",
                action: null
            },

            // 2 – Click a slot (auto-demo)
            {
                title: "Step 2: Click a Slot to Select It",
                description: "Click any slot cell to <strong>select</strong> it (turns blue). I'll select <strong>A11</strong> (Monday, Slot-1) for you right now — watch!",
                target: "td[data-slot='A11']",
                position: "right",
                action: () => {
                    setTimeout(() => {
                        const slot = document.querySelector("td[data-slot='A11']");
                        if (slot && !slot.classList.contains('occupied') && !slot.classList.contains('selected')) {
                            slot.click();
                        }
                        // re-highlight after state change
                        setTimeout(() => this._refreshSpotlight(), 350);
                    }, 600);
                }
            },

            // 3 – Show search box
            {
                title: "Step 3: Search Multiple Slots at Once",
                description: "Use the <strong>Search Box</strong> to type multiple slot codes separated by <code>+</code>. I'll type <strong>D11+E11+F11</strong> for you right now!",
                target: ".search-container",
                position: "bottom",
                action: () => {
                    // Clear previous selection first
                    if (typeof clearSelection === 'function') clearSelection();
                    setTimeout(() => {
                        const box = document.getElementById('searchBox');
                        if (box) {
                            box.value = '';
                            box.focus();
                            // Typewriter effect
                            const text = 'D11+E11+F11';
                            let i = 0;
                            const type = () => {
                                if (i < text.length) {
                                    box.value += text[i++];
                                    setTimeout(type, 80);
                                }
                            };
                            setTimeout(type, 400);
                        }
                    }, 400);
                }
            },

            // 4 – Click Search button (user must click)
            {
                title: "Step 4: Click \"Search & Select Slots\"",
                description: "Now <strong>click the Search &amp; Select Slots button</strong> — it will instantly select all three Tuesday slots (D11, E11, F11) at once!",
                target: ".btn-search",
                position: "bottom",
                waitForClick: true,
                clickTarget: ".btn-search",
                pulseTarget: true
            },

            // 5 – After search, point to selected slots in grid
            {
                title: "Step 5: Slots Are Now Selected!",
                description: "The 3 Tuesday slots are highlighted in <strong>blue</strong> in the grid. The <em>Selected</em> counter also updated. Now click <strong>Save Course</strong> to lock them in.",
                target: ".actions-section .btn-primary",
                position: "top",
                waitForClick: true,
                clickTarget: "button.btn-primary[onclick='saveSelection()']",
                pulseTarget: true
            },

            // 6 – Modal opens – fill details
            {
                title: "Step 6: Fill In Course Details",
                description: "A form opened! Enter your <strong>course name</strong>, <strong>code</strong>, and <strong>teacher</strong>. Pick a colour too! I've pre-filled an example. When ready, click <strong>Save Course</strong> inside the modal.",
                target: "#courseModal .modal-content",
                position: "right",
                waitForClick: true,
                clickTarget: "#saveCourseBtn",
                pulseTarget: true,
                action: () => {
                    // Wait for modal to open then fill 
                    const fill = () => {
                        const modal = document.getElementById('courseModal');
                        if (modal && modal.style.display !== 'none') {
                            const name = document.getElementById('courseName');
                            const code = document.getElementById('courseCode');
                            const teacher = document.getElementById('teacherName');
                            if (name && !name.value) name.value = 'Data Structures';
                            if (code && !code.value) code.value = 'CSE2001';
                            if (teacher && !teacher.value) teacher.value = 'Dr. A. Kumar';
                            this._refreshSpotlight();
                        } else {
                            setTimeout(fill, 200);
                        }
                    };
                    setTimeout(fill, 300);
                }
            },

            // 7 – Show saved courses list
            {
                title: "Step 7: Course Saved! 🎉",
                description: "Your course now appears in the <strong>Your Courses</strong> list below the timetable. The slots are permanently coloured. Click the <strong>✕</strong> on a card to remove it.",
                target: ".selected-slots-container",
                position: "top",
                action: null
            },

            // 8 – Tentative feature
            {
                title: "Step 8: Tentative Slots",
                description: "Not sure yet? Use <strong>Mark Tentative</strong> to reserve slots without committing. Tentative slots appear striped in the grid and are listed separately.",
                target: ".btn-tentative",
                position: "right",
                action: null
            },

            // 9 – Download
            {
                title: "Step 9: Download Your Timetable",
                description: "When you're done, click <strong>Download</strong> to save as <strong>PDF</strong> or <strong>PNG</strong>. Share it or print it!",
                target: "#downloadDropdown",
                position: "left",
                action: null
            },

            // 10 – Done
            {
                title: "Tutorial Complete! 🚀",
                description: "You've mastered the timetable maker!\n\n✓ Click or search for slots\n✓ Save courses with details & colours\n✓ Mark tentative slots\n✓ Download when done\n\nI'll clean up the demo now. Go build your perfect timetable!",
                target: null,
                position: "center",
                action: () => {
                    setTimeout(() => {
                        if (typeof resetTable === 'function') resetTable();
                    }, 1800);
                }
            }
        ];
    }

    // ─────────────────────────────────────────────────────────────────
    //  PUBLIC – start / end
    // ─────────────────────────────────────────────────────────────────
    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.currentStep = 0;
        this._buildDOM();
        this._addKeyboardListeners();
        this._addResizeListener();
        this.showStep(0);
    }

    end() {
        if (!this.isActive) return;
        this.isActive = false;
        this._removeKeyboardListeners();
        this._removeResizeListener();
        this._removeClickInterceptor();
        ['overlay','spotlight','tooltip','cursor'].forEach(k => {
            if (this[k]) { this[k].remove(); this[k] = null; }
        });
        this._spotlightTarget = null;
        localStorage.setItem('ttmaker_tutorial_seen', 'true');
        if (this.currentStep === this.steps.length - 1) {
            this._showCompletionMessage();
        }
    }

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.end();
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    //  CORE – showStep
    // ─────────────────────────────────────────────────────────────────
    showStep(index) {
        if (!this.isActive) return;
        if (index >= this.steps.length) { this.end(); return; }

        this.currentStep = index;
        const step = this.steps[index];

        this._removeClickInterceptor();

        // Handle modal step: if modal is closed, try opening it
        if (step.target === '#courseModal .modal-content') {
            const modal = document.getElementById('courseModal');
            if (modal && modal.style.display === 'none') {
                // modal not open, advance or wait
            }
        }

        // Render tooltip immediately (hidden) so getBoundingClientRect works
        this._renderTooltip(step, index);

        if (!step.target) {
            // Centred step – hide spotlight
            this._hideSpotlight();
            this._centreTooltip();
            if (step.action) setTimeout(() => step.action(), 100);
            return;
        }

        // Find the element
        const el = document.querySelector(step.target);
        if (!el) {
            console.warn('[Tutorial] Element not found:', step.target, '– skipping');
            setTimeout(() => this.nextStep(), 1500);
            return;
        }

        // 1. Scroll element into view FIRST, then position everything
        this._scrollAndHighlight(el, step, index);
    }

    // ─────────────────────────────────────────────────────────────────
    //  SCROLL THEN HIGHLIGHT
    // ─────────────────────────────────────────────────────────────────
    _scrollAndHighlight(el, step, index) {
        // Scroll element into the vertical centre of the viewport
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

        // Wait for scroll to settle, THEN position highlight + tooltip
        setTimeout(() => {
            if (!this.isActive || this.currentStep !== index) return;

            const rect = el.getBoundingClientRect();

            // Show spotlight cutout
            this._showSpotlight(rect, el);

            // Move cursor pointer to element
            this._animateCursor(rect);

            // Position tooltip relative to spotlight
            this._positionTooltip(rect, step.position);

            // Run step action
            if (step.action) setTimeout(() => step.action(), 200);

            // Wire click-to-continue if needed
            if (step.waitForClick && step.clickTarget) {
                this._setupClickInterceptor(step.clickTarget, index);
            }

            // Pulse the target element
            if (step.pulseTarget) {
                el.classList.add('tutorial-pulse');
                setTimeout(() => el.classList.remove('tutorial-pulse'), 3000);
            }
        }, 600); // 600ms gives smooth scroll enough time to finish
    }

    // ─────────────────────────────────────────────────────────────────
    //  DOM BUILDERS
    // ─────────────────────────────────────────────────────────────────
    _buildDOM() {
        // Inject essential CSS once
        if (!document.getElementById('tutorial-style')) {
            const s = document.createElement('style');
            s.id = 'tutorial-style';
            s.textContent = `
                @keyframes spotlight-pulse {
                    0%,100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.82), 0 0 0 4px #f39c12, 0 0 30px rgba(243,156,18,0.6); }
                    50%      { box-shadow: 0 0 0 9999px rgba(0,0,0,0.82), 0 0 0 6px #f39c12, 0 0 50px rgba(243,156,18,0.9); }
                }
                @keyframes cursor-bounce {
                    0%,100% { transform: translate(-50%,-50%) scale(1) rotate(-20deg); }
                    50%     { transform: translate(-50%,-60%) scale(1.15) rotate(-20deg); }
                }
                @keyframes tooltip-in {
                    from { opacity:0; transform: translateY(10px) scale(0.96); }
                    to   { opacity:1; transform: translateY(0)   scale(1); }
                }
                @keyframes tut-bounce-in {
                    0%  { transform: translate(-50%,-50%) scale(0.3); opacity:0; }
                    55% { transform: translate(-50%,-50%) scale(1.05); }
                    75% { transform: translate(-50%,-50%) scale(0.95); }
                    100%{ transform: translate(-50%,-50%) scale(1); opacity:1; }
                }
                @keyframes tut-fade-out {
                    to { opacity:0; transform: translate(-50%,-50%) scale(0.9); }
                }
                @keyframes tutorial-pulse {
                    0%,100% { outline: 3px solid transparent; }
                    50%     { outline: 3px solid #f39c12; }
                }
                .tutorial-pulse {
                    animation: tutorial-pulse 0.6s ease 3;
                    outline-offset: 3px;
                }
                #tutorial-spotlight {
                    position: fixed;
                    border-radius: 8px;
                    z-index: 9999;
                    pointer-events: none;
                    transition: top 0.45s cubic-bezier(.4,0,.2,1),
                                left 0.45s cubic-bezier(.4,0,.2,1),
                                width 0.45s cubic-bezier(.4,0,.2,1),
                                height 0.45s cubic-bezier(.4,0,.2,1);
                    box-shadow: 0 0 0 9999px rgba(0,0,0,0.82), 0 0 0 4px #f39c12, 0 0 30px rgba(243,156,18,0.6);
                    animation: spotlight-pulse 2s ease-in-out infinite;
                }
                #tutorial-cursor {
                    position: fixed;
                    width: 32px;
                    height: 32px;
                    pointer-events: none;
                    z-index: 10002;
                    font-size: 28px;
                    line-height: 1;
                    transform: translate(-50%,-50%) rotate(-20deg);
                    transition: top 0.45s cubic-bezier(.4,0,.2,1),
                                left 0.45s cubic-bezier(.4,0,.2,1);
                    animation: cursor-bounce 1s ease-in-out infinite;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
                }
                #tutorial-tooltip {
                    position: fixed;
                    z-index: 10001;
                    background: linear-gradient(135deg,#1a252f 0%,#0f1a2a 100%);
                    color: #ecf0f1;
                    border: 2px solid #3498db;
                    border-radius: 16px;
                    padding: 22px 24px 18px;
                    max-width: min(420px, 92vw);
                    width: max-content;
                    box-shadow: 0 24px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(52,152,219,0.2);
                    font-family: 'Poppins', sans-serif;
                    animation: tooltip-in 0.3s ease;
                    transition: top 0.45s cubic-bezier(.4,0,.2,1),
                                left 0.45s cubic-bezier(.4,0,.2,1);
                }
                #tutorial-tooltip h3 {
                    margin: 0 0 10px 0;
                    color: #f39c12;
                    font-size: 17px;
                    font-weight: 700;
                    line-height: 1.3;
                }
                #tutorial-tooltip p {
                    margin: 0 0 18px 0;
                    line-height: 1.7;
                    color: #bdc3c7;
                    font-size: 14px;
                    white-space: pre-line;
                }
                #tutorial-tooltip code {
                    background: rgba(52,152,219,0.2);
                    padding: 1px 5px;
                    border-radius: 4px;
                    color: #3498db;
                    font-size: 13px;
                }
                .tut-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .tut-step-info {
                    color: #7f8c8d;
                    font-size: 12px;
                    flex: 1;
                }
                .tut-progress {
                    width: 100%;
                    height: 3px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 2px;
                    margin-bottom: 14px;
                    overflow: hidden;
                }
                .tut-progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg,#3498db,#f39c12);
                    border-radius: 2px;
                    transition: width 0.4s ease;
                }
                .tut-btn {
                    border: none;
                    padding: 9px 18px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 13px;
                    font-family: 'Poppins', sans-serif;
                    transition: transform 0.15s, box-shadow 0.15s;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .tut-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
                .tut-btn:active { transform: translateY(0); }
                .tut-btn-next  { background: linear-gradient(135deg,#3498db,#2980b9); color:#fff; }
                .tut-btn-back  { background: #2c3e50; color:#bdc3c7; }
                .tut-btn-skip  { background: transparent; color:#e74c3c; border: 1px solid rgba(231,76,60,0.35); padding: 9px 12px; }
                .tut-btn-wait  { background: #27ae60; color:#fff; opacity:0.65; cursor:not-allowed; }
                #tutorial-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 9998;
                    /* transparent – spotlight box-shadow does the darkening */
                    pointer-events: none;
                }
            `;
            document.head.appendChild(s);
        }

        // Overlay (transparent – just to intercept pointer events except on target)
        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorial-overlay';
        document.body.appendChild(this.overlay);

        // Spotlight box
        this.spotlight = document.createElement('div');
        this.spotlight.id = 'tutorial-spotlight';
        this.spotlight.style.display = 'none';
        document.body.appendChild(this.spotlight);

        // Cursor emoji
        this.cursor = document.createElement('div');
        this.cursor.id = 'tutorial-cursor';
        this.cursor.textContent = '👆';
        this.cursor.style.display = 'none';
        document.body.appendChild(this.cursor);

        // Tooltip panel
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'tutorial-tooltip';
        document.body.appendChild(this.tooltip);
    }

    // ─────────────────────────────────────────────────────────────────
    //  SPOTLIGHT CONTROL
    // ─────────────────────────────────────────────────────────────────
    _showSpotlight(rect, el) {
        const PAD = 8;
        this._spotlightTarget = el;
        const s = this.spotlight;
        s.style.display = 'block';
        s.style.top    = `${rect.top    - PAD}px`;
        s.style.left   = `${rect.left   - PAD}px`;
        s.style.width  = `${rect.width  + PAD * 2}px`;
        s.style.height = `${rect.height + PAD * 2}px`;
    }

    _hideSpotlight() {
        if (this.spotlight) this.spotlight.style.display = 'none';
        if (this.cursor) this.cursor.style.display = 'none';
        this._spotlightTarget = null;
    }

    /** Re-read element rect and reposition spotlight (call after DOM changes) */
    _refreshSpotlight() {
        if (!this._spotlightTarget || !this.spotlight) return;
        const PAD = 8;
        const rect = this._spotlightTarget.getBoundingClientRect();
        const s = this.spotlight;
        s.style.top    = `${rect.top    - PAD}px`;
        s.style.left   = `${rect.left   - PAD}px`;
        s.style.width  = `${rect.width  + PAD * 2}px`;
        s.style.height = `${rect.height + PAD * 2}px`;
    }

    // ─────────────────────────────────────────────────────────────────
    //  CURSOR POINTER
    // ─────────────────────────────────────────────────────────────────
    _animateCursor(targetRect) {
        const c = this.cursor;
        if (!c) return;
        // Start off-screen to the right
        c.style.display  = 'block';
        c.style.top  = `${targetRect.top + targetRect.height / 2}px`;
        c.style.left = `${Math.min(window.innerWidth - 60, targetRect.right + 80)}px`;
        // Animate to centre of target
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                c.style.top  = `${targetRect.top + targetRect.height / 2}px`;
                c.style.left = `${targetRect.left + targetRect.width / 2}px`;
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────
    //  TOOLTIP RENDERING & POSITIONING
    // ─────────────────────────────────────────────────────────────────
    _renderTooltip(step, index) {
        const total     = this.steps.length;
        const isLast    = index === total - 1;
        const waiting   = step.waitForClick || step.waitForInput;
        const pct       = Math.round(((index + 1) / total) * 100);

        const backBtn = index > 0
            ? `<button class="tut-btn tut-btn-back" onclick="tutorial.previousStep()">
                   <i class="fas fa-arrow-left"></i> Back
               </button>`
            : '';

        const actionBtn = waiting
            ? `<button class="tut-btn tut-btn-wait">
                   <i class="fas fa-hand-pointer"></i> Click to Continue
               </button>`
            : `<button class="tut-btn tut-btn-next" onclick="tutorial.nextStep()">
                   ${isLast ? 'Finish' : 'Next'} <i class="fas fa-arrow-right"></i>
               </button>`;

        this.tooltip.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;">
                <h3>${step.title}</h3>
                <button onclick="tutorial.end()" class="tut-btn tut-btn-skip" title="Exit tutorial" style="flex-shrink:0;margin-left:10px;padding:4px 8px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="tut-progress"><div class="tut-progress-bar" style="width:${pct}%"></div></div>
            <p>${step.description}</p>
            <div class="tut-footer">
                <div class="tut-step-info">
                    Step ${index + 1} / ${total}
                    ${!waiting ? '<br><span style="opacity:.6;font-size:11px;"><i class="fas fa-keyboard"></i> ← → to navigate · ESC to exit</span>' : ''}
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    ${backBtn}
                    ${actionBtn}
                </div>
            </div>
        `;
    }

    _centreTooltip() {
        const t = this.tooltip;
        t.style.top       = '50%';
        t.style.left      = '50%';
        t.style.transform = 'translateY(-50%) translateX(-50%)';
        t.style.maxHeight = '';
    }

    _positionTooltip(targetRect, preferredSide) {
        const t         = this.tooltip;
        t.style.transform = 'none';
        const vw        = window.innerWidth;
        const vh        = window.innerHeight;
        const PAD       = 16;
        const GAP       = 18; // gap between spotlight border and tooltip edge
        const tW        = Math.min(420, vw - PAD * 2);

        // Force layout so getBoundingClientRect is accurate
        t.style.maxWidth = `${tW}px`;
        t.style.width    = 'max-content';

        // We don't know height before render — estimate or read
        const tH = t.getBoundingClientRect().height || 200;

        const sides = {
            top:    { top: targetRect.top - tH - GAP,                         left: targetRect.left + targetRect.width / 2 - tW / 2 },
            bottom: { top: targetRect.bottom + GAP,                            left: targetRect.left + targetRect.width / 2 - tW / 2 },
            left:   { top: targetRect.top + targetRect.height / 2 - tH / 2,   left: targetRect.left - tW - GAP },
            right:  { top: targetRect.top + targetRect.height / 2 - tH / 2,   left: targetRect.right + GAP }
        };

        // Order of trial sides
        const order = [preferredSide, 'bottom', 'top', 'right', 'left'].filter(Boolean);

        let chosen = null;
        for (const side of order) {
            const pos = sides[side];
            if (!pos) continue;
            const fitsV = pos.top >= PAD && pos.top + tH <= vh - PAD;
            const fitsH = pos.left >= PAD && pos.left + tW <= vw - PAD;
            if (fitsV && fitsH) { chosen = pos; break; }
        }

        // Fallback: clamp into viewport
        if (!chosen) {
            const p = sides[preferredSide] || sides.bottom;
            chosen = {
                top:  Math.max(PAD, Math.min(p.top,  vh - tH - PAD)),
                left: Math.max(PAD, Math.min(p.left, vw - tW - PAD))
            };
        }

        t.style.top  = `${chosen.top}px`;
        t.style.left = `${chosen.left}px`;
        t.style.maxHeight = `${vh - PAD * 2}px`;
        t.style.overflowY = 'auto';
    }

    // ─────────────────────────────────────────────────────────────────
    //  CLICK INTERCEPTOR (for waitForClick steps)
    // ─────────────────────────────────────────────────────────────────
    _setupClickInterceptor(selectorOrEl, stepIndex) {
        const el = typeof selectorOrEl === 'string'
            ? document.querySelector(selectorOrEl)
            : selectorOrEl;

        if (!el) {
            console.warn('[Tutorial] clickTarget not found:', selectorOrEl);
            return;
        }

        // Bring element above the overlay so user can actually click it
        const prevZ   = el.style.zIndex;
        const prevPos = el.style.position;
        el.style.zIndex   = '10003';
        el.style.position = el.style.position || 'relative';

        const handler = () => {
            this._removeClickInterceptor();
            // Restore element styles
            el.style.zIndex   = prevZ;
            el.style.position = prevPos;
            setTimeout(() => {
                if (this.isActive && this.currentStep === stepIndex) {
                    this.nextStep();
                }
            }, 700);
        };

        el.addEventListener('click', handler, { once: true });
        this._clickHandlerRef = { el, handler };
    }

    _removeClickInterceptor() {
        if (this._clickHandlerRef) {
            const { el, handler } = this._clickHandlerRef;
            el.removeEventListener('click', handler);
            // Restore z-index only if we know we should (already done in handler usually)
            this._clickHandlerRef = null;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    //  KEYBOARD & RESIZE
    // ─────────────────────────────────────────────────────────────────
    _addKeyboardListeners() {
        this.keyHandler = (e) => {
            if (!this.isActive) return;
            const step = this.steps[this.currentStep];
            if (step.waitForClick || step.waitForInput) return;
            if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); this.nextStep(); }
            else if (e.key === 'ArrowLeft')                  { e.preventDefault(); this.previousStep(); }
            else if (e.key === 'Escape')                     { e.preventDefault(); this.end(); }
        };
        document.addEventListener('keydown', this.keyHandler);
    }

    _removeKeyboardListeners() {
        if (this.keyHandler) { document.removeEventListener('keydown', this.keyHandler); this.keyHandler = null; }
    }

    _addResizeListener() {
        this.resizeHandler = () => {
            if (!this.isActive || !this._spotlightTarget) return;
            this._refreshSpotlight();
            const rect = this._spotlightTarget.getBoundingClientRect();
            const step = this.steps[this.currentStep];
            this._positionTooltip(rect, step.position || 'bottom');
        };
        window.addEventListener('resize', this.resizeHandler);
    }

    _removeResizeListener() {
        if (this.resizeHandler) { window.removeEventListener('resize', this.resizeHandler); this.resizeHandler = null; }
    }

    // ─────────────────────────────────────────────────────────────────
    //  COMPLETION MESSAGE
    // ─────────────────────────────────────────────────────────────────
    _showCompletionMessage() {
        const msg = document.createElement('div');
        msg.style.cssText = `
            position:fixed; top:50%; left:50%;
            transform:translate(-50%,-50%) scale(0.3);
            background:linear-gradient(135deg,#27ae60,#229954);
            color:#fff; padding:36px 48px; border-radius:24px;
            box-shadow:0 24px 70px rgba(0,0,0,0.45);
            z-index:20000; text-align:center;
            font-family:'Poppins',sans-serif;
            animation:tut-bounce-in 0.6s cubic-bezier(.4,0,.2,1) forwards;
        `;
        msg.innerHTML = `
            <div style="font-size:64px;margin-bottom:12px;">🎓</div>
            <h2 style="margin:0 0 8px;font-size:26px;font-weight:800;">Tutorial Complete!</h2>
            <p  style="margin:0;font-size:15px;opacity:.9;">You're all set to create amazing timetables!</p>
        `;
        document.body.appendChild(msg);
        setTimeout(() => {
            msg.style.animation = 'tut-fade-out 0.45s ease forwards';
            setTimeout(() => msg.remove(), 460);
        }, 3200);
    }
}

// ─────────────────────────────────────────────────────────────────────
//  GLOBAL INIT
// ─────────────────────────────────────────────────────────────────────
const tutorial = new TimetableTutorial();

function startTutorial() {
    // Reset to make demo clean
    localStorage.removeItem('ttmaker_tutorial_seen');
    if (tutorial.isActive) tutorial.end();
    tutorial.start();
}

// ─────────────────────────────────────────────────────────────────────
//  AUTO-SHOW WELCOME BANNER (first visit only)
// ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    if (localStorage.getItem('ttmaker_tutorial_seen')) return;

    setTimeout(() => {
        const banner = document.createElement('div');
        banner.id = 'tut-welcome-banner';
        banner.style.cssText = `
            position:fixed; top:80px; right:20px;
            background:linear-gradient(135deg,#3498db,#2980b9);
            color:#fff; padding:20px 22px; border-radius:16px;
            box-shadow:0 12px 36px rgba(0,0,0,0.35);
            z-index:9999; max-width:370px; width:calc(100vw - 40px);
            font-family:'Poppins',sans-serif;
            transform:translateX(calc(100% + 30px));
            transition:transform 0.5s cubic-bezier(.4,0,.2,1);
        `;
        banner.innerHTML = `
            <div style="display:flex;align-items:flex-start;gap:14px;">
                <span style="font-size:34px;line-height:1;flex-shrink:0;">🎓</span>
                <div style="flex:1;">
                    <h3 style="margin:0 0 6px;font-size:17px;font-weight:700;">First Time Here?</h3>
                    <p  style="margin:0 0 14px;font-size:13px;line-height:1.6;opacity:.93;">
                        Take a quick <strong>1-minute tour</strong> and master the timetable maker in just a few steps!
                    </p>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button onclick="startTutorial();document.getElementById('tut-welcome-banner').remove();"
                            style="background:#f39c12;color:#fff;border:none;padding:9px 18px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px;font-family:'Poppins',sans-serif;">
                            ▶ Start Tour
                        </button>
                        <button onclick="localStorage.setItem('ttmaker_tutorial_seen','true');document.getElementById('tut-welcome-banner').remove();"
                            style="background:rgba(255,255,255,0.18);color:#fff;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-weight:500;font-size:13px;font-family:'Poppins',sans-serif;">
                            Skip
                        </button>
                    </div>
                </div>
                <button onclick="localStorage.setItem('ttmaker_tutorial_seen','true');document.getElementById('tut-welcome-banner').remove();"
                    style="background:transparent;border:none;color:rgba(255,255,255,0.7);font-size:20px;cursor:pointer;flex-shrink:0;padding:0;line-height:1;">
                    ✕
                </button>
            </div>
        `;
        document.body.appendChild(banner);

        // Slide in
        requestAnimationFrame(() => requestAnimationFrame(() => {
            banner.style.transform = 'translateX(0)';
        }));

        // Auto-dismiss after 12 s
        setTimeout(() => {
            if (banner.parentElement) {
                banner.style.transform = 'translateX(calc(100% + 30px))';
                setTimeout(() => banner.remove(), 520);
            }
        }, 12000);
    }, 1800);
});
