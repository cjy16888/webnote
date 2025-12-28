(function() {
  'use strict';
  if (window.__WEBNOTE_INITIALIZED__) return;
  window.__WEBNOTE_INITIALIZED__ = true;

  const COLORS = ['yellow', 'green', 'blue', 'pink', 'purple'];

  class WebNoteController {
    constructor() {
      this.toolbar = null;
      this.tooltip = null;
      this.highlightManager = new HighlightManager();
      this.currentSelection = null;
      this.currentUrl = this.getStorageKey();
      this.annotations = { highlights: [] };
    }

    getStorageKey() {
      const url = new URL(window.location.href);
      return `annotations_${url.origin}${url.pathname}`;
    }

    init() {
      this.createToolbar();
      this.createTooltip();
      this.bindEvents();
      this.restoreHighlights();
    }

    createToolbar() {
      this.toolbar = document.createElement('div');
      this.toolbar.className = 'webnote-toolbar';
      this.toolbar.innerHTML = COLORS.map(color =>
        `<button class="webnote-toolbar-btn ${color}" data-color="${color}" title="${color}"></button>`
      ).join('');
      document.body.appendChild(this.toolbar);
    }

    createTooltip() {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'webnote-tooltip';
      document.body.appendChild(this.tooltip);
    }

    bindEvents() {
      document.addEventListener('mouseup', (e) => this.onMouseUp(e));
      document.addEventListener('mousedown', (e) => this.onMouseDown(e));
      this.toolbar.addEventListener('click', (e) => this.onToolbarClick(e));
      document.addEventListener('click', (e) => this.onHighlightClick(e));
      document.addEventListener('mouseover', (e) => this.onHighlightHover(e));
      document.addEventListener('mouseout', (e) => this.onHighlightLeave(e));
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === 'SCROLL_TO_HIGHLIGHT') {
          this.scrollToHighlight(msg.highlightId);
        } else if (msg.type === 'DELETE_HIGHLIGHT') {
          this.deleteHighlight(msg.highlightId);
          sendResponse({ success: true });
        } else if (msg.type === 'GET_PAGE_INFO') {
          sendResponse({ url: window.location.href, title: document.title });
        } else if (msg.type === 'REFRESH_ANNOTATIONS') {
          this.refreshAnnotations();
        }
      });
    }

    onHighlightHover(e) {
      const highlightEl = e.target.closest('.webnote-highlight');
      if (!highlightEl) return;
      const highlightId = highlightEl.dataset.highlightId;
      const highlight = this.annotations.highlights.find(h => h.id === highlightId);
      if (!highlight || !highlight.note) return;
      this.showTooltip(highlightEl, highlight.note);
    }

    onHighlightLeave(e) {
      const highlightEl = e.target.closest('.webnote-highlight');
      if (!highlightEl) return;
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && relatedTarget.closest && relatedTarget.closest('.webnote-highlight') === highlightEl) return;
      this.hideTooltip();
    }

    showTooltip(element, text) {
      const rect = element.getBoundingClientRect();
      const tooltip = this.tooltip;
      tooltip.textContent = text;
      tooltip.style.display = 'block';
      tooltip.style.visibility = 'hidden';
      tooltip.classList.remove('above', 'below');

      const tooltipHeight = tooltip.offsetHeight;
      const tooltipWidth = tooltip.offsetWidth;
      const margin = 8;

      let top, posClass;
      if (rect.top > tooltipHeight + margin) {
        top = rect.top - tooltipHeight - margin;
        posClass = 'above';
      } else {
        top = rect.bottom + margin;
        posClass = 'below';
      }

      let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));

      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
      tooltip.style.visibility = 'visible';
      tooltip.classList.add(posClass, 'visible');
    }

    hideTooltip() {
      this.tooltip.classList.remove('visible', 'above', 'below');
      this.tooltip.style.display = 'none';
    }

    onMouseUp(e) {
      if (e.target.closest('.webnote-toolbar')) return;

      // 延迟检测选择，确保选择完成
      setTimeout(() => {
        const selection = window.getSelection();

        // 检查是否有有效选择
        if (!selection || selection.rangeCount === 0) {
          this.hideToolbar();
          return;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText || selection.isCollapsed) {
          this.hideToolbar();
          return;
        }

        // 检查是否在可编辑元素中
        if (this.isInEditableElement(selection.anchorNode)) {
          return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // 确保rect有效
        if (rect.width === 0 && rect.height === 0) {
          return;
        }

        this.currentSelection = { text: selectedText, range: range.cloneRange() };
        this.showToolbar(rect);
      }, 50);
    }

    onMouseDown(e) {
      // 只有点击非工具栏区域且不是开始新选择时才隐藏
      if (!e.target.closest('.webnote-toolbar') && !e.target.closest('.webnote-highlight')) {
        const selection = window.getSelection();
        // 如果当前没有选择，或者点击位置不在选择范围内，隐藏工具栏
        if (!selection || selection.isCollapsed) {
          this.hideToolbar();
        }
      }
    }

    isInEditableElement(node) {
      const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      if (!el) return false;
      return el.closest('input, textarea, [contenteditable="true"]') !== null;
    }

    showToolbar(rect) {
      const toolbar = this.toolbar;
      const toolbarHeight = 40;
      const margin = 10;

      // 使用视口坐标（fixed定位直接使用getBoundingClientRect的值）
      let top = rect.top - toolbarHeight - margin;
      let left = rect.left + (rect.width / 2);

      // 先显示以获取实际宽度
      toolbar.style.display = 'flex';
      toolbar.style.visibility = 'hidden';
      const toolbarWidth = toolbar.offsetWidth || 140;

      // 水平居中并限制在视口内
      left = left - toolbarWidth / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - toolbarWidth - margin));

      // 如果上方空间不足，显示在下方
      if (top < margin) {
        top = rect.bottom + margin;
      }

      // 确保不超出视口底部
      if (top + toolbarHeight > window.innerHeight - margin) {
        top = window.innerHeight - toolbarHeight - margin;
      }

      toolbar.style.top = `${top}px`;
      toolbar.style.left = `${left}px`;
      toolbar.style.visibility = 'visible';
      toolbar.classList.add('visible');
    }

    hideToolbar() {
      this.toolbar.classList.remove('visible');
      setTimeout(() => {
        if (!this.toolbar.classList.contains('visible')) {
          this.toolbar.style.display = 'none';
        }
      }, 150);
    }

    async onToolbarClick(e) {
      const btn = e.target.closest('.webnote-toolbar-btn');
      if (!btn || !this.currentSelection) return;
      const color = btn.dataset.color;
      const { text, range } = this.currentSelection;
      const id = this.highlightManager.generateId();
      const position = this.highlightManager.serializePosition(range);
      this.highlightManager.createHighlight(range, color, id);
      window.getSelection().removeAllRanges();
      this.hideToolbar();
      const highlight = { id, text, color, note: '', createdAt: Date.now(), updatedAt: Date.now(), position };
      await this.saveHighlight(highlight);
      this.currentSelection = null;

      // 自动打开侧边栏并弹出批注编辑框
      const settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (settings.autoOpenPanel) {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL_FOR_NEW', highlightId: id });
      }
    }

    async saveHighlight(highlight) {
      await chrome.runtime.sendMessage({
        type: 'SAVE_ANNOTATION',
        data: { url: window.location.href, title: document.title, highlight }
      });
      this.annotations.highlights.push(highlight);
      chrome.runtime.sendMessage({ type: 'ANNOTATION_UPDATED' });
    }

    async refreshAnnotations() {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ANNOTATIONS', url: window.location.href });
      this.annotations = response || { highlights: [] };
    }

    onHighlightClick(e) {
      const highlightEl = e.target.closest('.webnote-highlight');
      if (!highlightEl) return;
      const highlightId = highlightEl.dataset.highlightId;
      chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL', highlightId });
    }

    scrollToHighlight(highlightId) {
      const el = document.querySelector(`[data-highlight-id="${highlightId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('webnote-highlight-flash');
        setTimeout(() => el.classList.remove('webnote-highlight-flash'), 1500);
      }
    }

    async deleteHighlight(highlightId) {
      this.highlightManager.removeHighlight(highlightId);
      await chrome.runtime.sendMessage({ type: 'DELETE_ANNOTATION', highlightId, url: window.location.href });
      chrome.runtime.sendMessage({ type: 'ANNOTATION_UPDATED' });
    }

    async restoreHighlights() {
      await this.waitForDOMStable();
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_ANNOTATIONS', url: window.location.href });
        if (!response || !response.highlights) {
          this.annotations = { highlights: [] };
          return;
        }
        this.annotations = response;
        if (!response.highlights.length) return;
        let restored = 0, failed = 0;
        for (const highlight of response.highlights) {
          const result = this.highlightManager.restoreHighlight(highlight);
          if (result) restored++; else failed++;
        }
        if (failed > 0) console.warn(`WebNote: Failed to restore ${failed}/${response.highlights.length} highlights`);
      } catch (e) {
        console.error('WebNote: Error restoring highlights:', e);
      }
    }

    waitForDOMStable(timeout = 2000) {
      return new Promise(resolve => {
        if (document.readyState === 'complete') {
          setTimeout(resolve, 100);
          return;
        }
        let timer;
        const observer = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(() => { observer.disconnect(); resolve(); }, 300);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { observer.disconnect(); resolve(); }, timeout);
      });
    }
  }

  const controller = new WebNoteController();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => controller.init());
  } else {
    controller.init();
  }
})();
