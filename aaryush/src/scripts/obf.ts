// Decoding of the obfuscated contact anchors (scraper protection). The literal scheme strings never appear here.
export const decode = (a: HTMLAnchorElement) => ({ kind: a.dataset.obf ?? '', parts: (a.dataset.v ?? '').split('|').reverse() });

/** The address and the number, assembled from an anchor's parts at the moment they are needed. */
export const emailOf = (parts: string[]) => parts[0] + '@' + parts[1];
export const phoneOf = (parts: string[]) => parts.join(' ');
