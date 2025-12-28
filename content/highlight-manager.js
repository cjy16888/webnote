class HighlightManager {
  constructor() {
    this.highlights = new Map();
  }

  generateId() {
    return `hl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createHighlight(range, color, id) {
    const textNodes = this.getTextNodesInRange(range);
    if (!textNodes.length) return null;
    const wrappers = [];
    for (const { node, start, end } of textNodes) {
      const wrapper = document.createElement('mark');
      wrapper.className = `webnote-highlight webnote-${color}`;
      wrapper.dataset.highlightId = id;
      const nodeRange = document.createRange();
      nodeRange.setStart(node, start);
      nodeRange.setEnd(node, end);
      try {
        nodeRange.surroundContents(wrapper);
        wrappers.push(wrapper);
      } catch (e) {
        const fragment = nodeRange.extractContents();
        wrapper.appendChild(fragment);
        nodeRange.insertNode(wrapper);
        wrappers.push(wrapper);
      }
    }
    this.highlights.set(id, wrappers);
    return wrappers;
  }

  getTextNodesInRange(range) {
    const nodes = [];
    if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
      nodes.push({ node: range.startContainer, start: range.startOffset, end: range.endOffset });
      return nodes;
    }
    const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      let start = 0, end = node.textContent.length;
      if (node === range.startContainer) start = range.startOffset;
      if (node === range.endContainer) end = range.endOffset;
      if (end > start) nodes.push({ node, start, end });
    }
    return nodes;
  }

  serializePosition(range) {
    return {
      startXPath: XPathUtils.getXPath(range.startContainer),
      startOffset: range.startOffset,
      endXPath: XPathUtils.getXPath(range.endContainer),
      endOffset: range.endOffset,
      contextBefore: XPathUtils.getContext(range, 'before', 30),
      contextAfter: XPathUtils.getContext(range, 'after', 30)
    };
  }

  restoreHighlight(highlightData) {
    try {
      const range = this.rebuildRangeFromXPath(highlightData.position);
      if (range && this.normalizeText(range.toString()) === this.normalizeText(highlightData.text)) {
        return this.createHighlight(range, highlightData.color, highlightData.id);
      }
      return this.restoreByContext(highlightData);
    } catch (e) {
      console.warn('WebNote: Failed to restore highlight:', highlightData.id, e);
      return null;
    }
  }

  normalizeText(text) {
    return text.replace(/\s+/g, ' ').trim();
  }

  rebuildRangeFromXPath(position) {
    const startNode = XPathUtils.resolveXPath(position.startXPath);
    const endNode = XPathUtils.resolveXPath(position.endXPath);
    if (!startNode || !endNode) return null;
    const range = document.createRange();
    try {
      range.setStart(startNode, position.startOffset);
      range.setEnd(endNode, position.endOffset);
      return range;
    } catch (e) {
      return null;
    }
  }

  restoreByContext(highlightData) {
    const { text, position, color, id } = highlightData;
    const searchPattern = (position.contextBefore + text + position.contextAfter).toLowerCase();
    const normalizedText = text.toLowerCase();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let accumulated = '';
    const nodeInfo = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      nodeInfo.push({ node, startIndex: accumulated.length, text: node.textContent });
      accumulated += node.textContent;
    }
    const lowerAccumulated = accumulated.toLowerCase();
    let searchStart = 0;
    while (true) {
      const patternIndex = lowerAccumulated.indexOf(searchPattern, searchStart);
      if (patternIndex === -1) break;
      const targetStart = patternIndex + position.contextBefore.length;
      const targetEnd = targetStart + text.length;
      const range = this.buildRangeFromTextPosition(nodeInfo, targetStart, targetEnd, accumulated);
      if (range) return this.createHighlight(range, color, id);
      searchStart = patternIndex + 1;
    }
    const textIndex = lowerAccumulated.indexOf(normalizedText);
    if (textIndex !== -1) {
      const range = this.buildRangeFromTextPosition(nodeInfo, textIndex, textIndex + text.length, accumulated);
      if (range) return this.createHighlight(range, color, id);
    }
    return null;
  }

  buildRangeFromTextPosition(nodeInfo, start, end, fullText) {
    let startNode = null, startOffset = 0, endNode = null, endOffset = 0;
    for (const info of nodeInfo) {
      const nodeEnd = info.startIndex + info.text.length;
      if (!startNode && start >= info.startIndex && start < nodeEnd) {
        startNode = info.node;
        startOffset = start - info.startIndex;
      }
      if (end > info.startIndex && end <= nodeEnd) {
        endNode = info.node;
        endOffset = end - info.startIndex;
        break;
      }
    }
    if (!startNode || !endNode) return null;
    const range = document.createRange();
    try {
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      return range;
    } catch (e) {
      return null;
    }
  }

  removeHighlight(id) {
    const wrappers = this.highlights.get(id);
    if (!wrappers) return false;
    for (const wrapper of wrappers) {
      const parent = wrapper.parentNode;
      if (!parent) continue;
      while (wrapper.firstChild) {
        parent.insertBefore(wrapper.firstChild, wrapper);
      }
      parent.removeChild(wrapper);
      parent.normalize();
    }
    this.highlights.delete(id);
    return true;
  }

  changeColor(id, newColor) {
    const wrappers = this.highlights.get(id);
    if (!wrappers) return false;
    for (const wrapper of wrappers) {
      wrapper.className = `webnote-highlight webnote-${newColor}`;
    }
    return true;
  }
}

if (typeof window !== 'undefined') {
  window.HighlightManager = HighlightManager;
}
