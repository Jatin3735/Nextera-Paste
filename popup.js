/**
 * PasteAnyway Popup Script
 *
 * Handles the popup UI for manually entering text to paste.
 */

document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    pasteText: document.getElementById('pasteText'),
    sendButton: document.getElementById('sendButton'),
    status: document.getElementById('status')
  };

  elements.pasteText.focus();

  const RESTRICTED_PATTERNS = [
    'chrome://', 'chrome-extension://', 'chrome.google.com/webstore',
    'about:', 'moz-extension://', 'addons.mozilla.org',
    'edge://', 'microsoftedge.microsoft.com/addons'
  ];

  const isRestrictedUrl = (url = '') =>
    url ? RESTRICTED_PATTERNS.some(p => url.includes(p)) : false;

  const updateStatus = (message) => {
    elements.status.textContent = message;
  };

  const sendTextToPage = async (text) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || isRestrictedUrl(tab.url)) {
      throw new Error('Cannot paste on browser internal pages.');
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['lib/content-script.js']
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (textToType) => window.__pasteAnyway.simulateTyping(textToType),
      args: [text]
    });
  };

  elements.sendButton.addEventListener('click', async () => {
    const text = elements.pasteText.value;

    if (!text) {
      updateStatus('Please enter some text first.');
      return;
    }

    elements.sendButton.disabled = true;

    let seconds = 2;
    updateStatus(`Click the input field on the page... typing in ${seconds}s`);

    const countdown = setInterval(() => {
      seconds--;
      if (seconds > 0) {
        updateStatus(`Click the input field on the page... typing in ${seconds}s`);
      } else {
        clearInterval(countdown);
        updateStatus('Typing...');
      }
    }, 1000);

    try {
      await sendTextToPage(text);
      setTimeout(() => {
        updateStatus('Text sent successfully!');
        elements.sendButton.disabled = false;
      }, 2000 + text.length * 10);
    } catch (error) {
      clearInterval(countdown);
      updateStatus('Error: ' + error.message);
      elements.sendButton.disabled = false;
    }
  });
});