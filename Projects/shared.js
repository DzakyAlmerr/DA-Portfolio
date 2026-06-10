/* ============================================
   PROJECT SHOWCASE SHARED JAVASCRIPT
   Production-ready, modular, reusable
   ============================================ */

// ---- Global State ----
const ProjectApp = {
    lenis: null,
    gallery: null,
    modal: null,
    isReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    isTouch: window.matchMedia('(pointer: coarse)').matches
};

// ============================================
// LOADING SCREEN
// ============================================
function initLoadingScreen() {
    const loading = document.querySelector('.project-loading');
    if (!loading) return;

    const bar = loading.querySelector('.project-loading-fill');
    let progress = 0;

    function update() {
        progress += Math.random() * 20 + 5;
        if (progress >= 100) {
            progress = 100;
            bar.style.width = '100%';
            setTimeout(() => {
                loading.classList.add('hidden');
                setTimeout(() => {
                    loading.style.display = 'none';

                    // Fade in hamburger button on mobile
                    const mobileBtn = document.getElementById('mobile-menu-btn');
                    if (mobileBtn && window.innerWidth <= 768) {
                        gsap.fromTo(mobileBtn, 
                            { opacity: 0, y: -12, scale: 0.85 },
                            { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', delay: 0.1 }
                        );
                    }

                      setTimeout(() => {
                        if (window.ScrollTrigger) {
                            ScrollTrigger.getAll().forEach(t => t.kill());
                            initScrollReveals();
                            initHeroParallax();
                            initCounters();
                            ScrollTrigger.refresh();
                        }
                    }, 100);
                }, 800);
            }, 400);
        } else {
            bar.style.width = progress + '%';
            setTimeout(update, 100 + Math.random() * 150);
        }
    }

    if (document.readyState === 'complete') {
        update();
    } else {
        window.addEventListener('load', update);
    }
}

// ============================================
// SMOOTH SCROLL (Lenis)
// ============================================
function initSmoothScroll() {
    if (typeof Lenis === 'undefined') return;

    ProjectApp.lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        smoothTouch: false,
        touchMultiplier: 2,
    });

    function raf(time) {
        ProjectApp.lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // GSAP ScrollTrigger integration
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        ProjectApp.lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => {
            ProjectApp.lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
    }
}

// ============================================
// CUSTOM CURSOR
// ============================================
function initCustomCursor() {
    if (ProjectApp.isTouch) return;

    const cursor = document.getElementById('cursor');
    const dot = document.getElementById('cursor-dot');
    if (!cursor || !dot) return;

    let mx = 0, my = 0, cx = 0, cy = 0, dx = 0, dy = 0;

    document.addEventListener('mousemove', (e) => {
        mx = e.clientX;
        my = e.clientY;
    });

    function animate() {
        cx += (mx - cx) * 0.15;
        cy += (my - cy) * 0.15;
        dx += (mx - dx) * 0.5;
        dy += (my - dy) * 0.5;

        cursor.style.left = cx + 'px';
        cursor.style.top = cy + 'px';
        dot.style.left = dx + 'px';
        dot.style.top = dy + 'px';

        requestAnimationFrame(animate);
    }
    animate();

    // Hover states
    const hoverTargets = document.querySelectorAll('.magnetic-hover, a, button, .gallery-item, .gallery-nav-btn, .tech-card, .stat-card, .screenshot-modal-close, .screenshot-modal-nav');
    hoverTargets.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
}

// ============================================
// SCROLL PROGRESS
// ============================================
function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollTop / docHeight;
        bar.style.transform = `scaleX(${progress})`;
    }, { passive: true });
}

// ============================================
// MAGNETIC BUTTONS
// ============================================
function initMagneticButtons() {
    if (ProjectApp.isTouch) return;

    document.querySelectorAll('.magnetic-hover').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
        });
    });
}

// ============================================
// INFINITE GALLERY CAROUSEL
// ============================================
class InfiniteGallery {
    constructor(container) {
        this.container = container;
        this.track = container.querySelector('.gallery-track');
        if (!this.track) return;

        this.originalItems = Array.from(this.track.children);
        this.totalItems = this.originalItems.length;
        if (this.totalItems === 0) return;

        // Build infinite track: [clones-end] + [original] + [clones-start]
        // Actually for bidirectional infinite: prepend clones, append clones
        this.buildInfiniteTrack();

        this.itemWidth = 0;
        this.gap = 32; // 2rem
        this.position = 0;
        this.isDragging = false;
        this.startX = 0;
        this.scrollStart = 0;
        this.velocity = 0;
        this.lastX = 0;
        this.lastTime = 0;
        this.rafId = null;
        this.autoScrollSpeed = 0;
        this.isAutoScrolling = false;

        this.init();
    }

    buildInfiniteTrack() {
        // Prepend clones (from end of original)
        const prependClones = this.originalItems.slice().reverse().map(item => {
            const clone = item.cloneNode(true);
            clone.classList.add('clone');
            clone.setAttribute('aria-hidden', 'true');
            return clone;
        });
        prependClones.reverse().forEach(clone => this.track.prepend(clone));

        // Append clones (from start of original)
        this.originalItems.forEach(item => {
            const clone = item.cloneNode(true);
            clone.classList.add('clone');
            clone.setAttribute('aria-hidden', 'true');
            this.track.appendChild(clone);
        });

        this.allItems = Array.from(this.track.children);
    }

    init() {
        // Wait for layout
        requestAnimationFrame(() => {
            this.calculateDimensions();
            this.position = -this.originalWidth; // Start at original set
            this.updateTransform();
            this.bindEvents();
        });
    }

    calculateDimensions() {
        if (this.allItems[0]) {
            const style = getComputedStyle(this.track);
            this.gap = parseFloat(style.gap) || 32;
            this.itemWidth = this.allItems[0].offsetWidth + this.gap;
            this.originalWidth = this.itemWidth * this.totalItems;
        }
    }

    bindEvents() {
        // Pointer events (mouse + touch)
        this.container.addEventListener('pointerdown', this.onPointerDown.bind(this));
        window.addEventListener('pointermove', this.onPointerMove.bind(this));
        window.addEventListener('pointerup', this.onPointerUp.bind(this));

        // Wheel
        this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

        // Nav buttons
        const prevBtn = this.container.parentElement.querySelector('.gallery-nav-btn.prev');
        const nextBtn = this.container.parentElement.querySelector('.gallery-nav-btn.next');
        if (prevBtn) prevBtn.addEventListener('click', () => this.scrollBy(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.scrollBy(1));

        // Progress dots
        const dots = this.container.parentElement.querySelectorAll('.gallery-progress-dot');
        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => this.goToSlide(i));
        });

        // Click on items -> open modal
        this.allItems.forEach((item, i) => {
            if (item.classList.contains('clone')) return;
            item.style.cursor = 'pointer';
            item.addEventListener('click', (e) => {
                if (Math.abs(this.velocity) < 0.05 && !this.isDragging) {
                    const img = item.querySelector('img, video');
                    if (img && window.ProjectModal) {
                        window.ProjectModal.open(img.src || img.currentSrc, i % this.totalItems);
                    }
                }
            });
        });

        // Resize
        window.addEventListener('resize', () => {
            this.calculateDimensions();
            this.checkInfinite();
            this.updateTransform();
        });
    }

    onPointerDown(e) {
        if (e.button !== 0) return;
        this.isDragging = true;
        this.startX = e.clientX;
        this.scrollStart = this.position;
        this.velocity = 0;
        this.lastX = e.clientX;
        this.lastTime = performance.now();
        this.container.style.cursor = 'grabbing';
        this.track.style.cursor = 'grabbing';
        cancelAnimationFrame(this.rafId);

        // Stop auto scroll
        this.isAutoScrolling = false;
    }

    onPointerMove(e) {
        if (!this.isDragging) return;
        const x = e.clientX;
        const delta = x - this.startX;
        this.position = this.scrollStart + delta;

        const now = performance.now();
        const dt = now - this.lastTime;
        if (dt > 0) {
            this.velocity = (x - this.lastX) / dt;
        }
        this.lastX = x;
        this.lastTime = now;

        this.checkInfinite();
        this.updateTransform();
    }

    onPointerUp() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.container.style.cursor = 'grab';
        this.track.style.cursor = 'grab';

        // Inertia
        if (Math.abs(this.velocity) > 0.5) {
            this.applyInertia();
        } else {
            this.snapToNearest();
        }
    }

    onWheel(e) {
        e.preventDefault();
        this.position -= e.deltaY * 1.5;
        this.checkInfinite();
        this.updateTransform();

        // Debounce snap
        clearTimeout(this.wheelTimeout);
        this.wheelTimeout = setTimeout(() => this.snapToNearest(), 150);
    }

    applyInertia() {
        const decay = 0.92;
        const minVel = 0.01;

        const step = () => {
            if (Math.abs(this.velocity) < minVel || this.isDragging) {
                this.snapToNearest();
                return;
            }
            this.position += this.velocity * 16;
            this.velocity *= decay;
            this.checkInfinite();
            this.updateTransform();
            this.rafId = requestAnimationFrame(step);
        };
        step();
    }

    snapToNearest() {
        if (!this.itemWidth) return;
        const target = Math.round(this.position / this.itemWidth) * this.itemWidth;

        gsap.to(this, {
            _position: target,
            duration: 0.7,
            ease: 'power3.out',
            onUpdate: () => {
                this.checkInfinite();
                this.updateTransform();
            }
        });
    }

    scrollBy(direction) {
        const target = this.position - (direction * this.itemWidth);
        gsap.to(this, {
            _position: target,
            duration: 0.8,
            ease: 'power3.out',
            onUpdate: () => {
                this.checkInfinite();
                this.updateTransform();
            }
        });
    }

    goToSlide(index) {
        const target = -this.originalWidth - (index * this.itemWidth);
        gsap.to(this, {
            _position: target,
            duration: 0.8,
            ease: 'power3.out',
            onUpdate: () => {
                this.checkInfinite();
                this.updateTransform();
            }
        });
    }

    checkInfinite() {
        // When scrolling past original set boundaries, wrap around
        if (this.position > -this.originalWidth + this.itemWidth * 2) {
            this.position -= this.originalWidth;
        } else if (this.position < -this.originalWidth * 2 + this.itemWidth) {
            this.position += this.originalWidth;
        }
    }

    updateTransform() {
        this.track.style.transform = `translateX(${this.position}px)`;

        // Update progress dots
        const dots = this.container.parentElement.querySelectorAll('.gallery-progress-dot');
        if (dots.length) {
            let activeIndex = Math.round((-this.position - this.originalWidth) / this.itemWidth);
            activeIndex = ((activeIndex % this.totalItems) + this.totalItems) % this.totalItems;
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === activeIndex);
            });
        }
    }

    // GSAP proxy property
    get _position() { return this.position; }
    set _position(v) { this.position = v; }
}

// ============================================
// SCREENSHOT MODAL
// ============================================
class ScreenshotModal {
    constructor() {
        this.modal = document.getElementById('screenshot-modal');
        if (!this.modal) return;

        this.content = this.modal.querySelector('.screenshot-modal-content');
        this.imgEl = this.content.querySelector('img');
        this.videoEl = this.content.querySelector('video');
        this.counter = this.modal.querySelector('.screenshot-modal-counter');
        this.closeBtn = this.modal.querySelector('.screenshot-modal-close');
        this.prevBtn = this.modal.querySelector('.screenshot-modal-nav.prev');
        this.nextBtn = this.modal.querySelector('.screenshot-modal-nav.next');

        this.items = [];
        this.currentIndex = 0;
        this.isOpen = false;
        this.touchStartX = 0;

        this.bindEvents();
    }

    setItems(items) {
        this.items = items;
    }

    bindEvents() {
        this.closeBtn?.addEventListener('click', () => this.close());
        this.prevBtn?.addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });
        this.nextBtn?.addEventListener('click', (e) => { e.stopPropagation(); this.next(); });

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            if (e.key === 'Escape') this.close();
            if (e.key === 'ArrowLeft') this.prev();
            if (e.key === 'ArrowRight') this.next();
        });

        // Touch swipe
        this.modal.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
        }, { passive: true });

        this.modal.addEventListener('touchend', (e) => {
            const diff = e.changedTouches[0].clientX - this.touchStartX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) this.prev();
                else this.next();
            }
        }, { passive: true });
    }

    open(src, index) {
        if (!this.modal) return;
        this.currentIndex = index;
        this.isOpen = true;
        this.updateContent();

        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        gsap.fromTo(this.content, 
            { scale: 0.85, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.5, ease: 'power3.out' }
        );
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        gsap.to(this.content, {
            scale: 0.9,
            opacity: 0,
            duration: 0.3,
            ease: 'power3.in',
            onComplete: () => {
                this.modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    prev() {
        if (this.items.length) {
            this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
        }
        this.animateSwitch('left');
    }

    next() {
        if (this.items.length) {
            this.currentIndex = (this.currentIndex + 1) % this.items.length;
        }
        this.animateSwitch('right');
    }

    animateSwitch(direction) {
        const xOffset = direction === 'left' ? 50 : -50;
        gsap.to(this.content, {
            x: xOffset,
            opacity: 0,
            duration: 0.2,
            ease: 'power2.in',
            onComplete: () => {
                this.updateContent();
                gsap.fromTo(this.content,
                    { x: -xOffset, opacity: 0 },
                    { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
                );
            }
        });
    }

    updateContent() {
        if (!this.items[this.currentIndex]) return;
        const item = this.items[this.currentIndex];

        if (item.type === 'video') {
            this.imgEl.style.display = 'none';
            this.videoEl.style.display = 'block';
            this.videoEl.src = item.src;
            this.videoEl.load();
        } else {
            this.videoEl.style.display = 'none';
            this.imgEl.style.display = 'block';
            this.imgEl.src = item.src;
        }

        if (this.counter) {
            this.counter.textContent = `${this.currentIndex + 1} / ${this.items.length}`;
        }
    }
}

// ============================================
// ANIMATED COUNTERS
// ============================================
function initCounters() {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(el) {
    const target = parseInt(el.dataset.target);
    const duration = 2000;
    const start = performance.now();

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
        el.textContent = Math.floor(eased * target);
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

// ============================================
// SCROLL REVEAL ANIMATIONS
// ============================================
function initScrollReveals() {
    if (!window.gsap || !window.ScrollTrigger) return;

    const reveals = [
        { selector: '.reveal-up', from: { y: 40, opacity: 0 }, to: { y: 0, opacity: 1 } },
        { selector: '.reveal-left', from: { x: -40, opacity: 0 }, to: { x: 0, opacity: 1 } },
        { selector: '.reveal-right', from: { x: 40, opacity: 0 }, to: { x: 0, opacity: 1 } },
        { selector: '.reveal-scale', from: { scale: 0.9, opacity: 0 }, to: { scale: 1, opacity: 1 } },
        { selector: '.reveal-blur', from: { y: 20, opacity: 0, filter: 'blur(10px)' }, to: { y: 0, opacity: 1, filter: 'blur(0px)' } },
    ];

    reveals.forEach(({ selector, from, to }) => {
        gsap.utils.toArray(selector).forEach(el => {
            const delay = parseFloat(el.dataset.revealDelay) || 0;
            gsap.fromTo(el, from, {
                ...to,
                duration: 0.8,
                ease: 'power3.out',
                delay: delay * 0.1,
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    once: true
                }
            });
        });
    });

    // Stagger groups
    gsap.utils.toArray('.stagger-group').forEach(group => {
        const children = group.children;
        gsap.fromTo(children, 
            { y: 30, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 0.6,
                stagger: 0.1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: group,
                    start: 'top 85%',
                    once: true
                }
            }
        );
    });
}

function initPageTransition() {
    const oldOverlay = document.querySelector('.page-transition-overlay');
    if (oldOverlay) oldOverlay.style.display = 'none';

    const main = document.querySelector('.main-content');
    const sidebar = document.getElementById('sidebar');
    const scrollBar = document.getElementById('scroll-progress');
    const loading = document.getElementById('loading');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    if (!main) return;

    function runEntrance() {
        const isDesktop = window.innerWidth > 768;

        if (sessionStorage.getItem('pageTransition') === 'to-project') {
            sessionStorage.removeItem('pageTransition');
            if (scrollBar) scrollBar.style.opacity = '0';

            if (isDesktop && sidebar) gsap.set(sidebar, { x: '-100vw', opacity: 0 });
            gsap.set(main, { x: '100vw', opacity: 0 });

            const tl = gsap.timeline({
                onComplete: () => {
                    if (scrollBar) scrollBar.style.opacity = '';
                    if (isDesktop && sidebar) gsap.set(sidebar, { clearProps: 'transform,opacity' });
                    gsap.set(main, { clearProps: 'transform,opacity' });
                }
            });

            if (isDesktop && sidebar) {
                tl.to(sidebar, { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, 0.1);
            }
            tl.to(main, { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, 0.15);
        }
    }

    // Tunggu loading screen hilang baru jalankan entrance
    if (loading && !loading.classList.contains('hidden')) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((m) => {
                if (m.target.classList.contains('hidden')) {
                    runEntrance();
                    observer.disconnect();
                }
            });
        });
        observer.observe(loading, { attributes: true, attributeFilter: ['class'] });
    } else {
        runEntrance();
    }

    // EXIT: kembali ke portfolio (sidebar ke kiri, main ke kanan)
    document.querySelectorAll('a[href^="../"], a[href^="/"], a[href^="./index"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href.includes('index') || href === '../') {
                e.preventDefault();
                sessionStorage.setItem('pageTransition', 'to-index');
                if (scrollBar) scrollBar.style.opacity = '0';

                const tl = gsap.timeline({
                    onComplete: () => { window.location.assign(href); }
                });

                // Fade out hamburger button on mobile
                if (mobileBtn && window.innerWidth <= 768) {
                    tl.to(mobileBtn, {
                        opacity: 0,
                        y: -12,
                        scale: 0.85,
                        duration: 0.3,
                        ease: 'power3.in'
                    }, 0);
                }

                if (window.innerWidth > 768 && sidebar) {
                    tl.fromTo(sidebar,
                        { x: 0, opacity: 1 },
                        { x: '-100vw', opacity: 0, duration: 0.5, ease: 'power3.in' },
                        0.1
                    );
                }
                tl.fromTo(main,
                    { x: 0, opacity: 1 },
                    { x: '100vw', opacity: 0, duration: 0.5, ease: 'power3.in' },
                    0.15
                );
            }
        });
    });
}

function triggerPageEntrance() {
    // Hero entrance animations
    if (!window.gsap) return;

    gsap.fromTo('.project-hero-text > *',
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: 'power3.out', delay: 0.2 }
    );

    gsap.fromTo('.project-hero-thumb',
        { x: 60, opacity: 0, scale: 0.95 },
        { x: 0, opacity: 1, scale: 1, duration: 1, ease: 'power3.out', delay: 0.4 }
    );

    gsap.fromTo('.project-hero-bg .orb',
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 0.15, duration: 1.5, stagger: 0.2, ease: 'power2.out' }
    );
}

// ============================================
// SIDEBAR NAVIGATION (Project Pages)
// ============================================
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (!sidebar) return;

    // Desktop toggle
    if (toggle) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth > 768) {
                sidebar.classList.toggle('collapsed');
            }
        });
    }

    // Mobile toggle
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.add('mobile-open');
            backdrop?.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    // Close mobile
    function closeMobile() {
        sidebar.classList.remove('mobile-open');
        backdrop?.classList.remove('active');
        document.body.style.overflow = '';
    }

    backdrop?.addEventListener('click', closeMobile);

    // Nav links
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) return; // On-page anchors

            // External links to main portfolio
            document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            if (window.innerWidth <= 768) closeMobile();
        });
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeMobile();
    });
}

// ============================================
// LUCIDE ICONS
// ============================================
function initIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ============================================
// HERO PARALLAX
// ============================================
function initHeroParallax() {
    if (!window.gsap || !window.ScrollTrigger) return;

    gsap.to('.project-hero-thumb', {
        y: -80,
        scrollTrigger: {
            trigger: '.project-hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 1
        }
    });

    gsap.to('.project-hero-text', {
        y: -40,
        opacity: 0.3,
        scrollTrigger: {
            trigger: '.project-hero',
            start: 'top top',
            end: '50% top',
            scrub: 1
        }
    });
}

// ============================================
// SCROLL TO TOP
// ============================================
function initScrollToTop() {
    const btn = document.getElementById('scroll-to-top');
    if (!btn) return;
    let isVisible = false;
    let isAnimating = false;

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const shouldShow = docHeight > 0 && (scrollTop / docHeight) > 0.6;

        if (shouldShow && !isVisible) {
            isVisible = true;
            btn.style.pointerEvents = 'all';
            gsap.to(btn, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.5,
                ease: 'back.out(1.7)',
                onStart: () => { isAnimating = true; },
                onComplete: () => { isAnimating = false; }
            });
        } else if (!shouldShow && isVisible) {
            isVisible = false;
            btn.style.pointerEvents = 'none';
            gsap.to(btn, {
                opacity: 0,
                y: 20,
                scale: 0.8,
                duration: 0.35,
                ease: 'power3.in',
                onStart: () => { isAnimating = true; },
                onComplete: () => { isAnimating = false; }
            });
        }
    }, { passive: true });

    btn.addEventListener('click', () => {
        if (ProjectApp.lenis) {
            ProjectApp.lenis.scrollTo(0, { duration: 1.5 });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Hover effect dengan GSAP (desktop only)
    if (!window.matchMedia('(pointer: coarse)').matches) {
        btn.addEventListener('mouseenter', () => {
            if (!isAnimating && isVisible) {
                gsap.to(btn, {
                    y: -4,
                    scale: 1.1,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            }
        });
        btn.addEventListener('mouseleave', () => {
            if (!isAnimating && isVisible) {
                gsap.to(btn, {
                    y: 0,
                    scale: 1,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            }
        });
    }
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initLoadingScreen();
    initSmoothScroll();
    initCustomCursor();
    initScrollProgress();
    initMagneticButtons();
    initCounters();
    initScrollReveals();
    initPageTransition();
    initSidebar();
    initIcons();
    initHeroParallax();
    initThemeToggle();
    initScrollToTop();

    // Initialize gallery if present
    const galleryContainer = document.querySelector('.gallery-wrapper');
    if (galleryContainer) {
        ProjectApp.gallery = new InfiniteGallery(galleryContainer);
    }

    // Initialize modal
    ProjectApp.modal = new ScreenshotModal();
    window.ProjectModal = ProjectApp.modal;

    // Collect gallery items for modal
    const galleryItems = [];
    document.querySelectorAll('.gallery-item:not(.clone)').forEach(item => {
        const img = item.querySelector('img');
        const video = item.querySelector('video');
        if (img) galleryItems.push({ src: img.src, type: 'image' });
        else if (video) galleryItems.push({ src: video.src || video.querySelector('source')?.src, type: 'video' });
    });
    ProjectApp.modal.setItems(galleryItems);

    // Re-init icons after dynamic content
    setTimeout(() => initIcons(), 100);
});

// Re-init icons on window load (for any lazy-loaded content)
window.addEventListener('load', () => {
    initIcons();
});

// ============================================
// THEME TOGGLE
// ============================================
function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  const overlay = document.getElementById('theme-transition');
  if (!toggle || !overlay) return;

  const root = document.documentElement;
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (prefersDark ? 'dark' : 'light');
  root.setAttribute('data-theme', initial);
  updateToggleLabel(initial);

  let isTransitioning = false;

  toggle.addEventListener('click', () => {
    if (isTransitioning) return;
    isTransitioning = true;

    const current = root.getAttribute('data-theme') || 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    const rect = toggle.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // Safety: reset overlay state before starting new transition
    overlay.style.transition = 'none';
    overlay.style.pointerEvents = 'all';
    overlay.style.setProperty('--ox', x + 'px');
    overlay.style.setProperty('--oy', y + 'px');
    overlay.style.background = next === 'light' ? '#f8fafc' : '#050508';
    overlay.style.clipPath = `circle(0% at ${x}px ${y}px)`;

    requestAnimationFrame(() => {
      overlay.style.transition = 'clip-path 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
      overlay.style.clipPath = `circle(150% at ${x}px ${y}px)`;

      setTimeout(() => {
        root.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateToggleLabel(next);

        overlay.style.clipPath = `circle(0% at ${x}px ${y}px)`;

        setTimeout(() => {
          overlay.style.pointerEvents = 'none';
          overlay.style.transition = 'none';
          isTransitioning = false;
        }, 800);
      }, 800);
    });
  });
}

function updateToggleLabel(theme) {
  const label = document.querySelector('.theme-toggle-label');
  if (label) label.textContent = theme === 'light' ? 'Light' : 'Dark';
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            if (window.lenis) {
                window.lenis.scrollTo(target, { offset: -40 });
            } else {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });
});
