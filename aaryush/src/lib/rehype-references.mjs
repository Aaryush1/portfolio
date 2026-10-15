/**
 * Rehype plugin: lifts a piece's `.references` wrapper out of the body and hands its HTML to the page as the
 * `referencesHtml` frontmatter value. The page then renders the body, the closing signature, and the references in
 * that order, so every piece ends with the signature and a paper's signature sits after its last section and before
 * its references (see src/layouts/EssayLayout.astro). Runs after rehype-citations, so the ids and links are in place.
 */
import { toHtml } from 'hast-util-to-html';

const isEl = (n, tag) => n && n.type === 'element' && n.tagName === tag;
const hasClass = (n, c) => {
  const v = n.properties?.className;
  return Array.isArray(v) ? v.includes(c) : typeof v === 'string' && v.split(/\s+/).includes(c);
};
const isReferences = (n) => isEl(n, 'div') && hasClass(n, 'references');

export default function rehypeReferences() {
  return (tree, file) => {
    const find = (node) => {
      if (!node.children) return null;
      const i = node.children.findIndex(isReferences);
      if (i >= 0) return { parent: node, index: i };
      for (const c of node.children) {
        const hit = find(c);
        if (hit) return hit;
      }
      return null;
    };
    const at = find(tree);
    file.data.astro ??= {};
    file.data.astro.frontmatter ??= {};
    file.data.astro.frontmatter.referencesHtml = at ? toHtml(at.parent.children.splice(at.index, 1)[0]) : '';
  };
}
