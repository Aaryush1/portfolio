// E6, the scanner's side. Reads "where we met" from the URL once, keeps it for this tab only,
// and builds the vCard at click time. Nothing here touches the network or localStorage.
import { cleanMeet, hasMeetParams, parseMeet, stripMeetParams, type Known, type Meet } from '../lib/meet';
import { buildNote, buildVCard, formatSavedDate } from '../lib/vcard';
import { decode, emailOf, phoneOf } from './obf';

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

function download(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/vcard;charset=utf-8' }));
  const dl = document.createElement('a');
  dl.href = url;
  dl.download = filename;
  dl.hidden = true;
  document.body.append(dl);
  dl.click();
  dl.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

capture();
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || !(e.target instanceof Element)) return;
  const a = e.target.closest<HTMLAnchorElement>('a[data-vcard]');
  if (!a) return;
  try {
    const text = vcardFor(a);
    if (!text) return; // anything missing: let the link fall back to the static .vcf
    e.preventDefault();
    download(text, a.getAttribute('download') || 'contact.vcf');
  } catch { /* fall back to the static .vcf */ }
});
