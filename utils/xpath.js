const XPathUtils = {
  getXPath(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentNode;
      const textNodes = Array.from(parent.childNodes).filter(n => n.nodeType === Node.TEXT_NODE);
      const index = textNodes.indexOf(node) + 1;
      return `${this.getXPath(parent)}/text()[${index}]`;
    }
    if (node === document.body) return '/html/body';
    if (node === document.documentElement) return '/html';
    if (!node.parentNode) return '';
    const parent = node.parentNode;
    const siblings = Array.from(parent.children).filter(el => el.tagName === node.tagName);
    const index = siblings.indexOf(node) + 1;
    return `${this.getXPath(parent)}/${node.tagName.toLowerCase()}[${index}]`;
  },

  resolveXPath(xpath) {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue;
    } catch (e) {
      return null;
    }
  },

  getContext(range, direction, length) {
    const container = direction === 'before' ? range.startContainer : range.endContainer;
    const offset = direction === 'before' ? range.startOffset : range.endOffset;
    if (container.nodeType !== Node.TEXT_NODE) return '';
    const text = container.textContent;
    if (direction === 'before') {
      return text.substring(Math.max(0, offset - length), offset);
    } else {
      return text.substring(offset, Math.min(text.length, offset + length));
    }
  }
};

if (typeof window !== 'undefined') {
  window.XPathUtils = XPathUtils;
}
