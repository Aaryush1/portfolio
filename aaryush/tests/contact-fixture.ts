// The contact details as the site assembles them, derived from the same parts the page uses (src/data/site.ts), so no test
// repeats the real address or number as a literal. Leak tests use these (and fragments of them) as the "must never appear" set.
import { site } from '../src/data/site';

const { emailParts, phoneParts } = site.contact;

/** local part and host of the address */
export const [USER, HOST] = emailParts;
export const EMAIL = `${USER}@${HOST}`;
/** "+1 NNN NNN NNNN", as written into the vCard */
export const PHONE_FULL = phoneParts.join(' ');
/** "NNN NNN NNNN", as written into the print sheet */
export const PHONE = phoneParts.slice(1).join(' ');
export const PHONE_DIGITS = phoneParts.slice(1).join('');
export const PHONE_E164 = phoneParts.join('');
export const HOST_NAME = HOST.split('.')[0];
export const EMAIL_FORMAT = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
export const PHONE_FORMAT = /^\+\d [\d ]+$/;
