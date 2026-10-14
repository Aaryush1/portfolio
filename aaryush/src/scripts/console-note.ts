// Loaded lazily so the note's copy ships as its own chunk, not inside the served HTML.
import('../lib/console-note').then((m) => m.logNote(globalThis.console, window as unknown as Record<string, unknown>)).catch(() => {});
