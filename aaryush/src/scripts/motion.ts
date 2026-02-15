const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function heroEntrance() {
    const hero = document.querySelector<HTMLElement>('.hero');
    if (hero) hero.classList.add('is-entered');
}

function revealOnScroll() {
    if (prefersReduced) return;
    const revealEls = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                const el = entry.target as HTMLElement;
                const delay = Number(el.getAttribute('data-delay') || '0');
                el.style.transition = `transform 520ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, opacity 520ms ${delay}ms`;
                el.style.transform = 'translateY(0)';
                el.style.opacity = '1';
                observer.unobserve(el);
            }
        }
    }, { threshold: 0.15 });

    revealEls.forEach((el, i) => {
        el.setAttribute('data-delay', String((i % 6) * 60));
        observer.observe(el);
    });
}

function scrollProgress() {
    const bar = document.querySelector<HTMLElement>('.scroll-progress');
    if (!bar) return;
    const update = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = `${pct}%`;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
}

function stickyNav() {
    const nav = document.querySelector<HTMLElement>('.sticky-nav');
    const hero = document.querySelector<HTMLElement>('.hero');
    if (!nav || !hero) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            nav.classList.toggle('is-visible', !entry.isIntersecting);
        });
    }, { threshold: 0 });
    observer.observe(hero);
}

function decodeContactLinks() {
    document.querySelectorAll<HTMLAnchorElement>('[data-u][data-d]').forEach((el) => {
        el.href = 'mailto:' + el.dataset.u + '@' + el.dataset.d;
    });
    document.querySelectorAll<HTMLAnchorElement>('[data-p]').forEach((el) => {
        el.href = 'tel:+1' + el.dataset.p;
    });
}

window.addEventListener('DOMContentLoaded', () => {
    heroEntrance();
    revealOnScroll();
    scrollProgress();
    stickyNav();
    decodeContactLinks();
});
