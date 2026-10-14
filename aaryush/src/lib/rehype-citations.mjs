/**
 * Rehype plugin: gives each item of a `.references` list an id (ref-1, ref-2, ...) and turns the `[n]` markers in
 * `<sup>` into links to those ids. Without JavaScript they are ordinary in-page links; src/scripts/citations.ts
 * upgrades them to buttons that open a preview sheet. Reference text stays in one place (the list).
 */
const isEl = (n, tag) => n && n.type === 'element' && n.tagName === tag;
const hasClass = (n, c) => {
  const v = n.properties?.className;
  return Array.isArray(v) ? v.includes(c) : typeof v === 'string' && v.split(/\s+/).includes(c);
};
function walk(node, fn) {
  fn(node);
  if (node.children) for (const c of node.children) walk(c, fn);
}
const text = (n) => (n.type === 'text' ? n.value : (n.children ?? []).map(text).join(''));

export default function rehypeCitations() {
  return (tree) => {
    const ids = new Set();
    walk(tree, (n) => {
      if (isEl(n, 'div') && hasClass(n, 'references')) {
        walk(n, (m) => {
          if (isEl(m, 'ol')) {
            let i = 0;
            for (const li of m.children) if (isEl(li, 'li')) { i += 1; li.properties = { ...li.properties, id: `ref-${i}` }; ids.add(i); }
          }
        });
      }
    });
    if (!ids.size) return;
    walk(tree, (n) => {
      if (!isEl(n, 'sup')) return;
      const t = text(n).trim();
      if (!/^(\[\d+\])+$/.test(t)) return;
      const nums = [...t.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
      if (!nums.every((k) => ids.has(k))) return;
      n.children = nums.map((k) => ({
        type: 'element', tagName: 'a',
        properties: { href: `#ref-${k}`, className: ['cite'], dataRef: `ref-${k}` },
        children: [{ type: 'text', value: `[${k}]` }],
      }));
    });
  };
}
