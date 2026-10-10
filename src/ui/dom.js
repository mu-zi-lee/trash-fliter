// Templates are parsed at build time; runtime uses no HTML sinks or parser tables.
export function setTemplate(parent, nodes) {
  const build = node => {
    if (typeof node === 'string') return document.createTextNode(node);
    const el = document.createElement(node.tag);
    for (const [name, value] of Object.entries(node.attributes)) el.setAttribute(name, value);
    for (const child of node.children) el.append(build(child));
    return el;
  };
  parent.replaceChildren(...nodes.map(build));
}
