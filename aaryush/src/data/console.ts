/** Approved copy (copy-review section 14, approved by Aaryush 2026-10-14). Never put contact details here. */
export const consoleNote = {
  text: [
    'Hello, fellow inspector.',
    '',
    'This site was built by talking.',
    'No tickets. An idea, a conversation, and Claude, which asked',
    'questions, drew options, built them, reviewed its own work,',
    'and tried again until it felt right.',
    'Most of the best parts came out of the back-and-forth.',
    '',
    'Press ? for the keyboard map.',
    '— ag.',
  ],
  art: [
    '   an idea',
    '      |',
    '      v',
    '   a conversation <--------------+',
    '      |                          |',
    '      v                          |',
    '   spec --> build <==> review    |',
    '                 |               |',
    '                 v               |',
    '           "not quite." ---------+',
    '                 |',
    '                 v',
    '              shipped',
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
  time: { keys: 't', action: 'Step the time of day' },
} as const;

/** Draft copy for the 404 page (copy review sections 12 and 14). */
export const notFound = {
  strip: 'Sheet not in set',
  heading: 'Sheet not in set.',
  missing: 'Not issued',
  sheets: [
    { n: '01', label: 'Hero', href: '/#hero' },
    { n: '02', label: 'How AI fits', href: '/#levels' },
    { n: '03', label: 'Work', href: '/#work' },
    { n: '04', label: 'Writing', href: '/writing' },
    { n: '05', label: 'Contact', href: '/#contact' },
  ],
} as const;
