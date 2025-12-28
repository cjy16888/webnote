# WebNote - Chrome Extension

A Chrome browser extension for highlighting text and taking notes on any webpage.

## Features

- **5 Color Highlighting**: Yellow, Green, Blue, Pink, Purple with semi-transparent backgrounds
- **Floating Toolbar**: Select text and a color picker toolbar appears instantly
- **Side Panel Notes**: Add, edit, and manage notes for each highlight
- **Hover Tooltips**: Hover over highlights to preview notes
- **Auto Panel Open**: Automatically opens side panel after highlighting (configurable)
- **Click to Locate**: Click any highlight in the side panel to scroll and flash the location on page
- **Persistent Storage**: All highlights and notes are saved locally in your browser
- **Cross-session Restoration**: Highlights are automatically restored when revisiting pages

## Installation

### Load as Unpacked Extension (Developer Mode)

1. Download or clone this repository
   ```bash
   git clone https://github.com/pumpkiiinnn/webNote.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in the top-right corner)

4. Click **Load unpacked**

5. Select the `webNote` folder

6. The WebNote icon will appear in your Chrome toolbar

## Usage

### Highlighting Text

1. Select any text on a webpage
2. A floating toolbar with 5 color buttons will appear
3. Click a color to highlight the selected text

### Managing Notes

1. Click the WebNote icon in the toolbar to open the side panel
2. Or click any highlight on the page to open the panel
3. Click a highlight item in the panel to scroll to its location
4. Click the edit button (✏️) to add or modify notes
5. Press `Ctrl+Enter` to save, or `Escape` to cancel

### Settings

- **Auto-open Panel**: Toggle this option in the side panel to control whether the panel opens automatically after highlighting

## Project Structure

```
webNote/
├── manifest.json              # Extension configuration (Manifest V3)
├── background/
│   └── service-worker.js      # Background service worker
├── content/
│   ├── content.js             # Main content script
│   ├── content.css            # Highlight and toolbar styles
│   └── highlight-manager.js   # Highlight creation/restoration
├── sidepanel/
│   ├── sidepanel.html         # Side panel UI
│   ├── sidepanel.js           # Side panel logic
│   └── sidepanel.css          # Side panel styles
├── utils/
│   └── xpath.js               # XPath utilities for position storage
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Technical Details

- **Manifest Version**: V3
- **Storage**: `chrome.storage.local` (data stored per-device)
- **Position Tracking**: XPath + text context for reliable highlight restoration
- **Permissions**: `storage`, `activeTab`, `sidePanel`

## License

MIT License
