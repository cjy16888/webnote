chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

const SETTINGS_KEY = 'webnote_settings';
const DEFAULT_SETTINGS = { autoOpenPanel: true };

async function getSettings() {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] };
}

async function saveSettings(settings) {
  const current = await getSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...current, ...settings } });
}

function getStorageKey(url) {
  const urlObj = new URL(url);
  return `annotations_${urlObj.origin}${urlObj.pathname}`;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'OPEN_SIDE_PANEL':
      if (sender.tab) {
        chrome.sidePanel.open({ tabId: sender.tab.id });
        if (message.highlightId) {
          setTimeout(() => {
            chrome.runtime.sendMessage({ type: 'FOCUS_HIGHLIGHT', highlightId: message.highlightId });
          }, 300);
        }
      }
      break;

    case 'OPEN_SIDE_PANEL_FOR_NEW':
      if (sender.tab) {
        chrome.sidePanel.open({ tabId: sender.tab.id });
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: 'EDIT_NEW_HIGHLIGHT', highlightId: message.highlightId });
        }, 300);
      }
      break;

    case 'GET_SETTINGS':
      getSettings().then(sendResponse);
      return true;

    case 'SAVE_SETTINGS':
      saveSettings(message.settings).then(() => sendResponse({ success: true }));
      return true;

    case 'GET_ANNOTATIONS':
      getAnnotations(message.url || (sender.tab && sender.tab.url)).then(sendResponse);
      return true;

    case 'SAVE_ANNOTATION':
      saveAnnotation(message.data).then(sendResponse);
      return true;

    case 'UPDATE_NOTE':
      updateNote(message.url, message.highlightId, message.note).then(sendResponse);
      return true;

    case 'DELETE_ANNOTATION':
      deleteAnnotation(message.highlightId, message.url).then(sendResponse);
      return true;

    case 'ANNOTATION_UPDATED':
      chrome.runtime.sendMessage({ type: 'REFRESH_PANEL' });
      break;
  }
});

async function getAnnotations(url) {
  if (!url) return { highlights: [] };
  const key = getStorageKey(url);
  const result = await chrome.storage.local.get(key);
  return result[key] || { url, highlights: [] };
}

async function saveAnnotation(data) {
  const key = getStorageKey(data.url);
  const result = await chrome.storage.local.get(key);
  const pageData = result[key] || { url: data.url, title: data.title, highlights: [] };
  const existingIndex = pageData.highlights.findIndex(h => h.id === data.highlight.id);
  if (existingIndex >= 0) {
    pageData.highlights[existingIndex] = { ...pageData.highlights[existingIndex], ...data.highlight, updatedAt: Date.now() };
  } else {
    pageData.highlights.push(data.highlight);
  }
  pageData.title = data.title;
  pageData.lastModified = Date.now();
  await chrome.storage.local.set({ [key]: pageData });
  return { success: true };
}

async function updateNote(url, highlightId, note) {
  const key = getStorageKey(url);
  const result = await chrome.storage.local.get(key);
  const pageData = result[key];
  if (!pageData) return { success: false };
  const highlight = pageData.highlights.find(h => h.id === highlightId);
  if (!highlight) return { success: false };
  highlight.note = note;
  highlight.updatedAt = Date.now();
  pageData.lastModified = Date.now();
  await chrome.storage.local.set({ [key]: pageData });
  return { success: true };
}

async function deleteAnnotation(highlightId, url) {
  const key = getStorageKey(url);
  const result = await chrome.storage.local.get(key);
  const pageData = result[key];
  if (!pageData) return { success: false };
  pageData.highlights = pageData.highlights.filter(h => h.id !== highlightId);
  pageData.lastModified = Date.now();
  await chrome.storage.local.set({ [key]: pageData });
  return { success: true };
}
