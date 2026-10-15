// E6, the scanner's side. Reads "where we met" from the URL once, keeps it for this tab only,
// and builds the vCard at click time. Nothing here touches the network or localStorage.
import { cleanMeet, hasMeetParams, parseMeet, stripMeetParams, type Known, type Meet } from '../lib/meet';
import { buildNote, buildVCard, formatSavedDate } from '../lib/vcard';
import { changedLetters, morphTiming } from '../lib/morph-timing';
import { createMorph } from './morph';
import { decode, emailOf, phoneOf } from './obf';

// E9: after the download, "Save contact" morphs to "Saved." (the hero's shared-letter morph) and shows the saved state.
const SAVE = 'Save contact';
const SAVED = 'Saved.';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Called only once the download has been triggered. Once per page load: a repeat click downloads again, quietly. */
function markSaved(a: HTMLAnchorElement) {
  if (a.classList.contains('is-saved')) return;
  a.classList.add('is-saved');
  const status = a.closest('.cta')?.querySelector('[data-save-status]');
  if (status) status.textContent = 'Contact saved';
  const slot = a.querySelector<HTMLElement>('.save-label');
  if (!slot) return;
  if (reducedMotion) { slot.textContent = SAVED; return; }
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#F2B544';
  const morph = createMorph(slot, getComputedStyle(slot).color, accent);
  morph.build([[SAVE, false]]); // the current label as letters, then morph it to the saved one
  morph.transition([[SAVED, false]], true, morphTiming(changedLetters(SAVE, SAVED)));
}

const KEY = 'meet-context';

const known = (): Known => {
  try { return JSON.parse(document.getElementById('meet-topics')?.textContent ?? '{}') as Known; } catch { return {}; }
};

function capture() {
  // Read the URL the page was loaded with: other scripts (the work pop-up) may already have rewritten location.
  const loaded = new URL(performance.getEntriesByType('navigation')[0]?.name || location.href);
  const u = new URL(location.href);
  const search = hasMeetParams(loaded.search) ? loaded.search : u.search;
  if (!hasMeetParams(search)) return;
  const m = parseMeet(search, known());
  try { if (m) sessionStorage.setItem(KEY, JSON.stringify(m)); } catch { /* storage blocked: the card is simply plain */ }
  history.replaceState(history.state, '', stripMeetParams(u));
}

function stored(): Meet | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const m = cleanMeet(JSON.parse(raw) as Record<string, unknown>, known());
    return m.met || m.note || m.about.length ? m : null;
  } catch { return null; }
}

function vcardFor(a: HTMLAnchorElement): string | null {
  const box = a.closest('.cta');
  const mail = box?.querySelector<HTMLAnchorElement>('a[data-obf="mail"][data-v]');
  const tel = box?.querySelector<HTMLAnchorElement>('a[data-obf="tel"][data-v]');
  if (!mail || !tel) return null;
  const names = known();
  const ctx = stored();
  return buildVCard({
    given: a.dataset.given ?? '',
    family: a.dataset.family ?? '',
    email: emailOf(decode(mail).parts),
    phone: phoneOf(decode(tel).parts),
    url: a.dataset.url ?? '',
    note: buildNote({
      met: ctx?.met ?? '',
      topics: (ctx?.about ?? []).map((s) => names[s]).filter(Boolean),
      note: ctx?.note ?? '',
      date: formatSavedDate(new Date()),
    }),
  });
}

function download(url: string, filename: string) {
  const dl = document.createElement('a');
  dl.href = url;
  dl.download = filename;
  dl.hidden = true;
  document.body.append(dl);
  dl.click();
  dl.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Bare pages (/qr) never read the URL for context and never write storage; Save contact still works there (plain, dated).
{
  if (!document.body.hasAttribute('data-bare')) capture();
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || !(e.target instanceof Element)) return;
    const a = e.target.closest<HTMLAnchorElement>('a[data-vcard]');
    if (!a) return;
    let url: string;
    try {
      const text = vcardFor(a);
      if (!text) return; // anything missing: leave the click alone (the link goes to LinkedIn)
      url = URL.createObjectURL(new Blob([text], { type: 'text/vcard;charset=utf-8' }));
    } catch { return; } // same: leave the click alone
    e.preventDefault(); // only now: the card and its URL exist
    download(url, a.dataset.filename || 'contact.vcf');
    markSaved(a); // E9: only after the download has been triggered
  });
}
