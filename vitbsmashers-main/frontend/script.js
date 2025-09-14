document.addEventListener('DOMContentLoaded', function() {
    const mobileToggle = document.getElementById('mobileToggle');
    const mainNav = document.getElementById('mainNav');
    const navOverlay = document.getElementById('navOverlay');
    const menuIcon = document.getElementById('menuIcon');
    const mainHeader = document.getElementById('mainHeader');
    const mainLogo = document.getElementById('mainLogo');
    
    // Toggle mobile menu
    function toggleMobileMenu() {
        const isOpen = mainNav.classList.contains('active');
        
        if (isOpen) {
            mainNav.classList.remove('active');
            navOverlay.classList.remove('active');
            mobileToggle.classList.remove('active');
            menuIcon.className = 'fas fa-bars';
            document.body.style.overflow = '';
        } else {
            mainNav.classList.add('active');
            navOverlay.classList.add('active');
            mobileToggle.classList.add('active');
            menuIcon.className = 'fas fa-times';
            document.body.style.overflow = 'hidden';
        }
    }
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', toggleMobileMenu);
    }

    if (navOverlay) {
        navOverlay.addEventListener('click', toggleMobileMenu);
    }
    
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mainNav.classList.contains('active')) {
                toggleMobileMenu();
            }
        });
    });
    
    function handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 50) {
            mainHeader.classList.add('scrolled');
            mainLogo.classList.add('scrolled');
        } else {
            mainHeader.classList.remove('scrolled');
            mainLogo.classList.remove('scrolled');
        }
    }
    
    function smoothScrollTo(target) {
        const element = document.querySelector(target);
        if (element) {
            const headerHeight = mainHeader.offsetHeight;
            const elementPosition = element.offsetTop - headerHeight - 20;
            
            window.scrollTo({
                top: elementPosition,
                behavior: 'smooth'
            });
        }
    }
    
    // Add smooth scrolling to nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                smoothScrollTo(href);
            }
        });
    });
    
    window.addEventListener('scroll', handleScroll);
    
    handleScroll();
    
    const featureCards = document.querySelectorAll('.feature-card');
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
                entry.target.classList.add('animated');
            }
        });
    }, { 
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    featureCards.forEach(card => {
        card.style.opacity = "0";
        card.style.transform = "translateY(30px)";
        card.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
        animationObserver.observe(card);
    });
    
    testimonialCards.forEach(card => {
        card.style.opacity = "0";
        card.style.transform = "translateY(30px)";
        card.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
        animationObserver.observe(card);
    });

    featureCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Add active class for visual feedback
            this.classList.add('active');
            
            // Remove active class after animation completes
            setTimeout(() => {
                this.classList.remove('active');
            }, 300);
        });
        
        card.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
        });
        
        card.addEventListener('touchend', function() {
            this.style.transform = '';
        });
    });
    
    const statNumbers = document.querySelectorAll('.stat-number');
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalValue = parseInt(target.textContent);
                const duration = 2000;
                const increment = finalValue / (duration / 16);
                let currentValue = 0;
                
                const timer = setInterval(() => {
                    currentValue += increment;
                    if (currentValue >= finalValue) {
                        target.textContent = finalValue + (target.textContent.includes('+') ? '+' : '');
                        clearInterval(timer);
                    } else {
                        target.textContent = Math.floor(currentValue) + (target.textContent.includes('+') ? '+' : '');
                    }
                }, 16);
                
                statsObserver.unobserve(target);
            }
        });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(stat => {
        statsObserver.observe(stat);
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mainNav.classList.contains('active')) {
            toggleMobileMenu();
        }
    });
    
    // Resize handler for responsive behavior
    function handleResize() {
        if (window.innerWidth > 768 && mainNav.classList.contains('active')) {
            toggleMobileMenu();
        }
    }
    
    window.addEventListener('resize', handleResize);
    
    let ticking = false;
    function updateScroll() {
        handleScroll();
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateScroll);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
    
    window.addEventListener('load', function() {
        document.body.style.opacity = '1';
        document.body.style.transition = 'opacity 0.5s ease';
    });
    
    document.body.style.opacity = '0';
});
