class SidePanelController {
  constructor() {
    this.currentHighlightId = null;
    this.currentUrl = null;
    this.annotations = { highlights: [] };
  }

  async init() {
    await this.loadSettings();
    await this.loadAnnotations();
    this.render();
    this.bindEvents();
    this.listenForUpdates();
  }

  async loadSettings() {
    const settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    document.getElementById('autoOpenToggle').checked = settings.autoOpenPanel;
  }

  async loadAnnotations() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
        this.annotations = { highlights: [] };
        this.currentUrl = null;
        return;
      }
      this.currentUrl = tab.url;
      document.querySelector('.page-title').textContent = tab.title || 'Current Page';
      const response = await chrome.runtime.sendMessage({ type: 'GET_ANNOTATIONS', url: tab.url });
      this.annotations = response || { highlights: [] };
    } catch (e) {
      console.error('Failed to load annotations:', e);
      this.annotations = { highlights: [] };
    }
  }

  render() {
    const list = document.getElementById('highlightList');
    const emptyState = document.getElementById('emptyState');
    const count = this.annotations.highlights.length;
    document.querySelector('.highlight-count').textContent = `${count} annotation${count !== 1 ? 's' : ''}`;
    if (count === 0) {
      list.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');
    const sorted = [...this.annotations.highlights].sort((a, b) => b.createdAt - a.createdAt);
    list.innerHTML = sorted.map(h => `
      <div class="highlight-item" data-id="${h.id}">
        <div class="color-indicator ${h.color}"></div>
        <div class="highlight-content">
          <p class="highlight-text">"${this.escapeHtml(this.truncate(h.text, 100))}"</p>
          ${h.note ? `<p class="highlight-note">${this.escapeHtml(h.note)}</p>` : ''}
          <span class="highlight-date">${this.formatDate(h.createdAt)}</span>
        </div>
        <button class="edit-btn" title="Edit note">✏️</button>
      </div>
    `).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  bindEvents() {
    document.getElementById('highlightList').addEventListener('click', (e) => {
      const item = e.target.closest('.highlight-item');
      if (!item) return;
      const id = item.dataset.id;
      if (e.target.closest('.edit-btn')) {
        this.openEditor(id);
      } else {
        this.scrollToHighlight(id);
      }
    });
    document.getElementById('closeEditor').addEventListener('click', () => this.closeEditor());
    document.getElementById('saveBtn').addEventListener('click', () => this.saveNote());
    document.getElementById('deleteBtn').addEventListener('click', () => this.deleteHighlight());
    document.getElementById('noteInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) this.saveNote();
      if (e.key === 'Escape') this.closeEditor();
    });
    document.getElementById('autoOpenToggle').addEventListener('change', (e) => {
      chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: { autoOpenPanel: e.target.checked } });
    });
  }

  listenForUpdates() {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'REFRESH_PANEL') {
        this.loadAnnotations().then(() => this.render());
      } else if (msg.type === 'FOCUS_HIGHLIGHT') {
        this.openEditor(msg.highlightId);
      } else if (msg.type === 'EDIT_NEW_HIGHLIGHT') {
        this.loadAnnotations().then(() => {
          this.render();
          this.openEditor(msg.highlightId);
        });
      }
    });
    chrome.tabs.onActivated.addListener(() => {
      this.closeEditor();
      this.loadAnnotations().then(() => this.render());
    });
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.status === 'complete') {
        this.closeEditor();
        this.loadAnnotations().then(() => this.render());
      }
    });
  }

  openEditor(highlightId) {
    const highlight = this.annotations.highlights.find(h => h.id === highlightId);
    if (!highlight) return;
    this.currentHighlightId = highlightId;
    document.getElementById('selectedText').textContent = `"${this.truncate(highlight.text, 50)}"`;
    document.getElementById('noteInput').value = highlight.note || '';
    document.getElementById('noteEditor').classList.remove('hidden');
    document.getElementById('noteInput').focus();
  }

  closeEditor() {
    document.getElementById('noteEditor').classList.add('hidden');
    this.currentHighlightId = null;
  }

  async saveNote() {
    if (!this.currentHighlightId || !this.currentUrl) return;
    const note = document.getElementById('noteInput').value.trim();
    await chrome.runtime.sendMessage({
      type: 'UPDATE_NOTE',
      url: this.currentUrl,
      highlightId: this.currentHighlightId,
      note
    });
    this.closeEditor();
    await this.loadAnnotations();
    this.render();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { type: 'REFRESH_ANNOTATIONS' });
    }
  }

  async deleteHighlight() {
    if (!this.currentHighlightId || !this.currentUrl) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await chrome.tabs.sendMessage(tab.id, { type: 'DELETE_HIGHLIGHT', highlightId: this.currentHighlightId });
    }
    this.closeEditor();
    await this.loadAnnotations();
    this.render();
  }

  async scrollToHighlight(highlightId) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { type: 'SCROLL_TO_HIGHLIGHT', highlightId });
    }
  }
}

new SidePanelController().init();
