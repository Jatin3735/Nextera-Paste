/**
 * PasteAnyway Content Script
 *
 * This script is injected into pages to simulate typing and bypass paste restrictions.
 * It's self-contained (IIFE) to avoid polluting the global scope.
 *
 * FORMATTING-PRESERVING MODE:
 * - Text is inserted line-by-line using execCommand('insertText'), which preserves
 *   exact spaces and indentation without triggering code editor auto-formatting.
 * - Newlines are simulated as Enter key presses so code editors create real line breaks.
 * - Tabs are simulated as Tab key presses so indentation is preserved.
 */
(function() {
  'use strict';

  // === KEYBOARD EVENT HELPERS ===

  const SPECIAL_CHAR_CODES = {
    ' ': 'Space',
    '\n': 'Enter',
    '\r': 'Enter',
    '\t': 'Tab'
  };

  const SPECIAL_CHAR_KEYS = {
    '\n': 'Enter',
    '\r': 'Enter',
    '\t': 'Tab'
  };

  const SPECIAL_CHAR_KEYCODES = {
    '\n': 13,
    '\r': 13,
    '\t': 9
  };

  const getKeyCode = (char) => {
    if (SPECIAL_CHAR_CODES[char]) return SPECIAL_CHAR_CODES[char];
    if (/[0-9]/.test(char)) return `Digit${char}`;
    if (/[a-zA-Z]/.test(char)) return `Key${char.toUpperCase()}`;
    if (char === '.') return 'Period';
    if (char === ',') return 'Comma';
    return 'Unidentified';
  };

  const createKeyboardEventOptions = (char) => {
    const charCode = SPECIAL_CHAR_KEYCODES[char] ?? char.charCodeAt(0);
    const key = SPECIAL_CHAR_KEYS[char] ?? char;
    return {
      key,
      code: getKeyCode(char),
      charCode,
      keyCode: charCode,
      which: charCode,
      bubbles: true,
      cancelable: true
    };
  };

  // === DOM HELPERS ===

  const isInputElement = (element) =>
    element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA');

  const isContentEditable = (element) =>
    element && element.isContentEditable;

  /**
   * Insert a full string into an <input> or <textarea> at cursor position.
   * Preserves exact spaces, tabs, and newlines.
   */
  const insertStringIntoInput = (element, str) => {
    let start, end;
    try {
      start = element.selectionStart ?? 0;
      end = element.selectionEnd ?? 0;
    } catch {
      // Some input types (number, date) don't support selection
      element.value = (element.value || '') + str;
      return;
    }
    const value = element.value || '';
    element.value = value.substring(0, start) + str + value.substring(end);

    try {
      element.selectionStart = element.selectionEnd = start + str.length;
    } catch {
      // Ignore
    }
  };

  /**
   * Dispatch a proper InputEvent with inputType for framework compatibility.
   */
  const dispatchInputEvent = (element, data) => {
    try {
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: false,
        inputType: 'insertText',
        data
      }));
    } catch (e) {
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  /**
   * Insert a string into a contentEditable element (including code editors)
   * using execCommand. This preserves exact formatting because code editors
   * treat execCommand('insertText') as a single atomic insertion.
   *
   * Returns true if execCommand succeeded.
   */
  const tryExecCommandInsert = (str) => {
    try {
      return document.execCommand('insertText', false, str);
    } catch (e) {
      return false;
    }
  };

  /**
   * Manually insert a string into contentEditable (fallback).
   * Uses a text node so newlines are preserved as-is (no auto-format).
   */
  const insertStringIntoContentEditable = (str) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = document.createTextNode(str);

    range.deleteContents();
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  // === EVENT INTERCEPTOR HELPERS ===

  const hasInterceptor = () => {
    return window.__pasteAnywayInterceptor && window.__pasteAnywayInterceptor.isActive;
  };

  const disablePasteBlockers = (element) => {
    if (!hasInterceptor()) {
      console.log('[PasteAnyway] Event interceptor not available');
      return 0;
    }
    const count = window.__pasteAnywayInterceptor.disableHandlersForElement(element);
    if (count > 0) {
      console.log(`[PasteAnyway] Disabled ${count} paste-blocking handler(s)`);
    }
    return count;
  };

  const getHandlerInfo = () => {
    if (!hasInterceptor()) return { available: false };
    return {
      available: true,
      ...window.__pasteAnywayInterceptor.getTrackedHandlers()
    };
  };

  // === TYPING SIMULATION ===

  let pendingTimeouts = [];

  /**
   * Insert a whole chunk of text (one line, or a special char) into the
   * active element in a formatting-preserving way.
   *
   * Strategy per element type:
   * - <input>/<textarea>: insert whole string at cursor (preserves exact text).
   * - contentEditable (incl. code editors): execCommand('insertText') whole
   *   string at once (preserves exact text, avoids auto-format per char).
   * - Newline in contentEditable: simulate Enter key so editor creates a
   *   real line break (execCommand('\n') often does nothing in code editors).
   */
  const insertChunk = (chunk, isNewline) => {
    const element = document.activeElement;
    if (!element) return;

    // === Case 1: Plain input/textarea ===
    if (isInputElement(element)) {
      insertStringIntoInput(element, chunk);
      dispatchInputEvent(element, chunk);
      return;
    }

    // === Case 2: contentEditable ===
    if (isContentEditable(element)) {
      // For newline: dispatch Enter key events (code editors handle this)
      if (isNewline) {
        const enterOptions = createKeyboardEventOptions('\n');

        const down = new KeyboardEvent('keydown', enterOptions);
        const notCancelled = element.dispatchEvent(down);

        // If the editor didn't cancel, try execCommand('insertParagraph')
        if (notCancelled) {
          try {
            document.execCommand('insertParagraph', false, null);
          } catch (e) {
            // Fallback: insert literal newline
            tryExecCommandInsert('\n');
          }
        }

        element.dispatchEvent(new KeyboardEvent('keyup', enterOptions));
        return;
      }

      // For regular text: insert the WHOLE line at once via execCommand.
      // This preserves exact spaces and indentation.
      const worked = tryExecCommandInsert(chunk);
      if (!worked) {
        insertStringIntoContentEditable(chunk);
        dispatchInputEvent(element, chunk);
      }
      return;
    }

    // === Case 3: Unknown element ===
    // Just insert text directly
    if (element.value !== undefined) {
      element.value += chunk;
    }
  };

  /**
   * Split text into chunks suitable for atomic insertion while preserving
   * exact formatting:
   * - Each line (including its leading whitespace and inline content) is
   *   inserted as ONE chunk.
   * - Newlines are handled separately as Enter presses.
   *
   * Example: "  a\n  b\n" → chunks:
   *   [{ text: "  a", newline: false },
   *    { newline: true },
   *    { text: "  b", newline: false },
   *    { newline: true }]
   */
  const splitIntoChunks = (text) => {
    const chunks = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.length > 0) {
        chunks.push({ text: line, newline: false });
      }

      // Add newline between lines (but not after the last line)
      if (i < lines.length - 1) {
        chunks.push({ newline: true });
      }
    }

    return chunks;
  };

  /**
   * Types the given text preserving exact formatting (spaces, tabs, newlines).
   * Waits 2 seconds before starting so user can click the input field.
   */
  const simulateTyping = (text, delay = 10) => {
    // Cancel any in-progress typing
    pendingTimeouts.forEach(id => clearTimeout(id));
    pendingTimeouts = [];

    if (!text) return;

    // Normalize CRLF and bare CR to LF
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const chunks = splitIntoChunks(text);

    const START_DELAY = 2000;
    console.log(`[PasteAnyway] Waiting ${START_DELAY}ms for you to click the input field...`);

    const startTimeout = setTimeout(() => {
      const element = document.activeElement;

      if (!element || element === document.body ||
          (!isInputElement(element) && !isContentEditable(element))) {
        console.warn('[PasteAnyway] No input field focused after 2s, aborting typing');
        return;
      }

      disablePasteBlockers(element);

      // Schedule each chunk with a small delay
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const id = setTimeout(() => {
          insertChunk(chunk.text ?? '\n', chunk.newline);
        }, i * delay);
        pendingTimeouts.push(id);
      }

      console.log(`[PasteAnyway] Typing ${text.length} chars in ${chunks.length} chunks`);
    }, START_DELAY);

    pendingTimeouts.push(startTimeout);
  };

  /**
   * Reads from clipboard and simulates typing the content.
   */
  const pasteFromClipboard = () => {
    return navigator.clipboard.readText()
      .then(text => {
        if (text) {
          simulateTyping(text);
          return text.length;
        }
        return 0;
      })
      .catch(error => {
        console.error('[PasteAnyway] Clipboard access error:', error);
        alert('Unable to access clipboard. Make sure you\'ve granted clipboard permission.');
        return 0;
      });
  };

  // === EXPOSE API ===

  window.__pasteAnyway = {
    simulateTyping,
    pasteFromClipboard,
    disablePasteBlockers,
    getHandlerInfo
  };

  console.log('[PasteAnyway] Content script loaded (formatting-preserving mode)');
})();