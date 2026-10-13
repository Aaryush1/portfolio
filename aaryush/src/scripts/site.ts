const top = document.getElementById('top');
const onScroll = () => top?.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Assemble obfuscated contact links at runtime (scraper protection: never in HTML).
// The scheme is derived from data-obf so the literal protocol strings never ship in the bundle either.
document.querySelectorAll<HTMLAnchorElement>('a[data-obf][data-v]').forEach((a) => {
  const kind = a.dataset.obf ?? '';
  const parts = (a.dataset.v ?? '').split('|').reverse();
  const scheme = kind === 'mail' ? kind + 'to' : kind;
  a.href = scheme + ':' + (kind === 'mail' ? parts[0] + '@' + parts[1] : parts.join(''));
});
