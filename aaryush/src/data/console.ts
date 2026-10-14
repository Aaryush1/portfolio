/** Draft copy (see docs/redesign/copy-review.md section 14). Never put contact details here. */
export const consoleNote = {
  text: [
    'Hello, fellow inspector.',
    'This site is built the way I build most things: a ticket, a spec, a loop of build and review, and a person at both ends.',
    'The loop is below. Nothing on this page phones home.',
    'Press ? for the keyboard map.',
    '— ag.',
  ],
  art: [
    '  +--> Ticket',
    '  |      |',
    '  |      v',
    '  |    Spec & decisions',
    '  |      |',
    '  |      v',
    '  |    Implement <==> Review',
    '  |      |',
    '  |      v',
    '  |    Docs --> PR --> Browser QA',
    '  |                       |',
    '  +---- a person <--------+',
  ],
} as const;

/** Draft copy for the hidden keyboard map (section 14 of the copy review). */
export const keyMap = {
  title: 'Keyboard map',
  hint: 'Esc to close',
  rows: [
    { keys: '?', action: 'This map' },
    { keys: 'g h', action: 'Go to the hero' },
    { keys: 'g l', action: 'Go to how AI fits' },
    { keys: 'g w', action: 'Go to work' },
    { keys: 'g r', action: 'Go to writing' },
    { keys: 'g c', action: 'Go to contact' },
  ],
  time: { keys: 't', action: 'Step the field through the day' },
} as const;

/** Draft copy for the 404 page (copy review sections 12 and 14). */
export const notFound = {
  strip: 'Sheet not in set',
  heading: 'Sheet not in set.',
  missing: 'Not issued',
  sheets: [
    { n: '01', label: 'Hero', href: '/#hero' },
    { n: '02', label: 'About', href: '/#about' },
    { n: '03', label: 'How AI fits', href: '/#levels' },
    { n: '04', label: 'Work', href: '/#work' },
    { n: '05', label: 'Writing', href: '/writing' },
    { n: '06', label: 'Contact', href: '/#contact' },
  ],
} as const;
