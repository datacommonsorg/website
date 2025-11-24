// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'VERIFY_TEXT') {
        const iframe = document.getElementById('widgetFrame');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'VERIFY_TEXT',
                text: message.text
            }, '*');
        }
    }
});

// History Management
const MAX_HISTORY_ITEMS = 10;

async function saveHistory(claim, result) {
    if (!chrome.storage || !chrome.storage.local) {
        console.error("chrome.storage.local is not available. Please ensure the extension has the 'storage' permission and is reloaded.");
        return;
    }

    try {
        const { history = [] } = await chrome.storage.local.get('history');

        // Create new item
        const newItem = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            claim: claim,
            result: result
        };

        // Add to beginning, remove duplicates (by claim), limit size
        const newHistory = [newItem, ...history.filter(h => h.claim !== claim)].slice(0, MAX_HISTORY_ITEMS);

        await chrome.storage.local.set({ history: newHistory });
        renderHistory();
    } catch (e) {
        console.error("Failed to save history:", e);
    }
}

async function loadHistory() {
    if (!chrome.storage || !chrome.storage.local) {
        console.error("chrome.storage.local is not available.");
        return [];
    }
    try {
        const { history = [] } = await chrome.storage.local.get('history');
        return history;
    } catch (e) {
        console.error("Failed to load history:", e);
        return [];
    }
}

async function renderHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    const history = await loadHistory();
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-history">No history yet. Verify some claims!</div>';
        return;
    }

    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';

        // Determine verdict for badge
        let verdict = "UNKNOWN";
        let badgeClass = "v-other";

        // Extract verdict from result
        if (item.result) {
            if (item.result.verification_verdict) {
                // Handle array or single object
                const v = Array.isArray(item.result.verification_verdict)
                    ? item.result.verification_verdict[0]?.verdict
                    : item.result.verification_verdict.verdict;
                if (v) verdict = v;
            } else if (item.result.verdict) {
                verdict = item.result.verdict;
            }
        }

        const vLower = verdict.toLowerCase();
        if (vLower.includes('support') || vLower.includes('true')) badgeClass = 'v-supported';
        else if (vLower.includes('refute') || vLower.includes('false') || vLower.includes('disputed')) badgeClass = 'v-refuted';

        div.innerHTML = `
            <div class="history-claim">${item.claim}</div>
            <div class="history-meta">
                <span class="verdict-badge-small ${badgeClass}">${verdict}</span>
                <span>${new Date(item.timestamp).toLocaleDateString()}</span>
            </div>
        `;

        div.addEventListener('click', () => {
            // Restore state
            const iframe = document.getElementById('widgetFrame');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: 'VERIFY_TEXT',
                    text: item.claim
                }, '*');
            }
            // Close panel
            document.getElementById('historyPanel').classList.remove('open');
        });

        historyList.appendChild(div);
    });
}

// UI Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const historyBtn = document.getElementById('historyBtn');
    const closeHistory = document.getElementById('closeHistory');
    const historyPanel = document.getElementById('historyPanel');

    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            historyPanel.classList.add('open');
            renderHistory();
        });
    }

    if (closeHistory) {
        closeHistory.addEventListener('click', () => {
            historyPanel.classList.remove('open');
        });
    }
});

// Listen for messages from the iframe (widget)
window.addEventListener('message', async (event) => {
    if (event.data.type === 'SCAN_PAGE') {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;

            // Check for restricted URLs
            if (!tab.url ||
                tab.url.startsWith('chrome://') ||
                tab.url.startsWith('chrome-extension://') ||
                tab.url.startsWith('edge://') ||
                tab.url.startsWith('about:') ||
                tab.url.startsWith('view-source:') ||
                tab.url.startsWith('https://chrome.google.com/webstore') ||
                tab.url.startsWith('https://chromewebstore.google.com')) {

                const iframe = document.getElementById('widgetFrame');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'VERIFY_ERROR',
                        error: 'Cannot scan this page type (system page). Please try a normal website.'
                    }, '*');
                }
                return;
            }

            // Check for file:// URLs
            if (tab.url.startsWith('file://')) {
                const isAllowed = await chrome.extension.isAllowedFileSchemeAccess();
                if (!isAllowed) {
                    const iframe = document.getElementById('widgetFrame');
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.postMessage({
                            type: 'VERIFY_ERROR',
                            error: 'To scan local files, you must enable "Allow access to file URLs" in the extension settings.'
                        }, '*');
                    }
                    return;
                }
            }

            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    // Smart extraction logic
                    function extractContent() {
                        // 1. Try to find the main content container
                        const selectors = ['article', 'main', '[role="main"]', '#content', '.content', '#main', '.main'];
                        let container = document.body;

                        for (const selector of selectors) {
                            const el = document.querySelector(selector);
                            if (el && el.innerText.length > 200) { // Ensure it has substantial content
                                container = el;
                                break;
                            }
                        }

                        // 2. Extract text from meaningful elements within the container
                        // We prioritize paragraphs and lists to avoid navigation/footer noise
                        const textNodes = [];
                        const meaningfulTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'TD'];

                        // Helper to traverse and collect text
                        function traverse(node) {
                            if (node.nodeType === Node.TEXT_NODE) {
                                const text = node.textContent.trim();
                                if (text.length > 0) textNodes.push(text);
                            } else if (node.nodeType === Node.ELEMENT_NODE) {
                                const tag = node.tagName;
                                // Skip hidden or irrelevant elements
                                if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'NAV', 'FOOTER', 'HEADER'].includes(tag)) return;
                                if (node.style.display === 'none' || node.style.visibility === 'hidden') return;

                                traverse(node.firstChild); // Recurse

                                // Add a newline after block elements to preserve structure
                                if (meaningfulTags.includes(tag) || window.getComputedStyle(node).display === 'block') {
                                    textNodes.push('\n');
                                }
                            }
                            if (node.nextSibling) traverse(node.nextSibling);
                        }

                        // If we found a specific container, use its innerText as it's likely cleaner
                        // Otherwise, try to be smart about body content
                        if (container !== document.body) {
                            return container.innerText;
                        }

                        // Fallback: collect paragraphs from body if no container found
                        const paragraphs = document.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
                        if (paragraphs.length > 0) {
                            return Array.from(paragraphs).map(p => p.innerText).join('\n\n');
                        }

                        return document.body.innerText;
                    }

                    return extractContent();
                }
            });

            if (results && results[0] && results[0].result) {
                const text = results[0].result;
                // Truncate if too long to avoid overwhelming the LLM
                const truncatedText = text.substring(0, 15000);

                const iframe = document.getElementById('widgetFrame');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'VERIFY_TEXT',
                        text: truncatedText
                    }, '*');
                }
            }
        } catch (err) {
            console.error('Failed to scan page:', err);

            let errorMessage = 'Failed to scan page. Please try again.';
            if (err.message.includes('ExtensionsSettings policy')) {
                errorMessage = 'This page cannot be scanned due to browser security policies (e.g., Web Store, Settings, or Enterprise blocked pages).';
            } else if (err.message.includes('Missing host permission')) {
                errorMessage = 'Permission denied. Please reload the extension and ensure permissions are granted.';
            }

            const iframe = document.getElementById('widgetFrame');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: 'VERIFY_ERROR',
                    error: errorMessage
                }, '*');
            }
        }
    } else if (event.data.type === 'VERIFICATION_COMPLETE') {
        // Save to history
        saveHistory(event.data.claim, event.data.result);
    }
});
