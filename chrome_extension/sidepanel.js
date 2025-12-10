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

// API Key Management
async function checkApiKey() {
    const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
    const settingsPanel = document.getElementById('settingsPanel');
    const mainContent = document.getElementById('mainContent');
    const iframe = document.getElementById('widgetFrame');

    if (geminiApiKey) {
        settingsPanel.style.display = 'none';
        mainContent.style.display = 'block';
        // Pass key to iframe
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'SET_API_KEY',
                key: geminiApiKey
            }, '*');
        }
    } else {
        settingsPanel.style.display = 'flex';
        mainContent.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkApiKey();

    const saveKeyBtn = document.getElementById('saveKeyBtn');
    if (saveKeyBtn) {
        saveKeyBtn.addEventListener('click', async () => {
            const input = document.getElementById('apiKeyInput');
            const key = input.value.trim();
            if (key) {
                await chrome.storage.local.set({ geminiApiKey: key });
                checkApiKey();
            }
        });
    }

    // Also listen for iframe load to send key
    const iframe = document.getElementById('widgetFrame');
    if (iframe) {
        iframe.addEventListener('load', async () => {
            const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
            if (geminiApiKey && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: 'SET_API_KEY',
                    key: geminiApiKey
                }, '*');
            }
        });
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
        let explanation = "";
        let sv = "";
        let places = [];

        // Extract verdict from result
        if (item.result) {
            let resultObj = null;
            if (item.result.verification_verdict) {
                // Handle array or single object
                resultObj = Array.isArray(item.result.verification_verdict)
                    ? item.result.verification_verdict[0]
                    : item.result.verification_verdict;
            } else if (item.result.verdict) {
                resultObj = item.result;
            }

            if (resultObj) {
                if (resultObj.verdict) verdict = resultObj.verdict;
                if (resultObj.explanation) explanation = resultObj.explanation;
                if (resultObj.stat_var_dcid) sv = resultObj.stat_var_dcid;
                if (resultObj.place_dcid) places.push(resultObj.place_dcid);
            }
        }

        const vLower = verdict.toLowerCase();
        if (vLower.includes('support') || vLower.includes('true')) badgeClass = 'v-supported';
        else if (vLower.includes('refute') || vLower.includes('false') || vLower.includes('disputed')) badgeClass = 'v-refuted';

        // Explore URL
        let exploreUrl = "";
        if (sv && places.length > 0) {
            exploreUrl = `https://datacommons.org/tools/statvar#sv=${sv}&p=${places[0]}`;
        } else if (places.length > 0) {
            exploreUrl = `https://datacommons.org/place/${places[0]}`;
        } else if (sv) {
            exploreUrl = `https://datacommons.org/tools/statvar#sv=${sv}`;
        }


        div.innerHTML = `
            <div class="history-header-row">
                <span class="verdict-badge-small ${badgeClass}">${verdict}</span>
                <span class="history-date">${new Date(item.timestamp).toLocaleDateString()}</span>
            </div>
            <div class="history-claim">${item.claim}</div>
            
            <div class="history-details" style="display:none; margin-top: 8px; font-size: 13px; color: #3c4043;">
                ${explanation ? `<div style="margin-bottom:8px;">${explanation}</div>` : ''}
                ${exploreUrl ? `
                    <a href="${exploreUrl}" target="_blank" class="explore-btn">
                        Explore in Data Commons
                        <span class="material-icons" style="font-size:12px; vertical-align:middle;">open_in_new</span>
                    </a>
                ` : ''}
            </div>
            <div class="expand-btn" style="text-align:center; margin-top:4px; cursor:pointer; color:#1a73e8; font-size:12px;">
                Show Details
            </div>
        `;

        // Expand/Collapse logic
        const detailsDiv = div.querySelector('.history-details');
        const expandBtn = div.querySelector('.expand-btn');

        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (detailsDiv.style.display === 'none') {
                detailsDiv.style.display = 'block';
                expandBtn.textContent = 'Hide Details';
            } else {
                detailsDiv.style.display = 'none';
                expandBtn.textContent = 'Show Details';
            }
        });

        // Click on card to restore
        div.querySelector('.history-claim').addEventListener('click', () => {
            const iframe = document.getElementById('widgetFrame');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: 'RESTORE_RESULT',
                    claim: item.claim,
                    result: item.result
                }, '*');
            }
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

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', async () => {
            const settingsPanel = document.getElementById('settingsPanel');
            const mainContent = document.getElementById('mainContent');
            const apiKeyInput = document.getElementById('apiKeyInput');

            // Pre-fill with current key (optional, maybe masked?)
            const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
            if (geminiApiKey) {
                apiKeyInput.value = geminiApiKey;
            }

            settingsPanel.style.display = 'flex';
            mainContent.style.display = 'none';
        });
    }

    const clearHistoryBtn = document.getElementById('clearHistory');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to clear your history?')) {
                if (!chrome.storage || !chrome.storage.local) return;
                await chrome.storage.local.remove('history');
                renderHistory();
            }
        });
    }
});

// Listen for messages from the iframe (widget)
window.addEventListener('message', async (event) => {
    if (event.data.type === 'AUTH_ERROR') {
        // Show settings panel if auth fails
        const settingsPanel = document.getElementById('settingsPanel');
        const mainContent = document.getElementById('mainContent');
        if (settingsPanel && mainContent) {
            settingsPanel.style.display = 'flex';
            mainContent.style.display = 'none';
            alert("Authentication failed. Please check your API Key.");
        }
    } else if (event.data.type === 'SCAN_PAGE') {
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

            // Send message to content script to extract text
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_TEXT' });

                if (response && response.text) {
                    const text = response.text;
                    // Truncate if too long
                    const truncatedText = text.substring(0, 15000);

                    const iframe = document.getElementById('widgetFrame');
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.postMessage({
                            type: 'PAGE_TEXT',
                            text: truncatedText
                        }, '*');
                    }
                } else {
                    throw new Error('No text returned from content script.');
                }
            } catch (err) {
                console.error('Failed to scan page:', err);
                const iframe = document.getElementById('widgetFrame');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'VERIFY_ERROR',
                        error: 'Failed to scan page. Please ensure the extension is reloaded and you are on a valid web page.'
                    }, '*');
                }
            }
        } catch (err) {
            console.error('Error in SCAN_PAGE handler:', err);
        }
    } else if (event.data.type === 'HIGHLIGHT_CLAIMS') {
        // Forward highlight request to content script
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'HIGHLIGHT_CLAIMS',
                    claims: event.data.claims
                });
            }
        } catch (e) {
            console.error('Failed to highlight claims:', e);
        }
    } else if (event.data.type === 'UPDATE_CLAIM_STATUS') {
        // Forward to content script
        console.log("Forwarding UPDATE_CLAIM_STATUS:", event.data.claim, event.data.verdict);
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'UPDATE_CLAIM_STATUS',
                    claim: event.data.claim,
                    verdict: event.data.verdict
                });
            }
        } catch (e) {
            console.error('Failed to update claim status:', e);
        }
    } else if (event.data.type === 'VERIFICATION_COMPLETE') {
        // Save to history
        saveHistory(event.data.claim, event.data.result);
    }
});

// Listen for messages from content script (e.g. verify claim click)
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === 'VERIFY_CLAIM_FROM_PAGE') {
        const iframe = document.getElementById('widgetFrame');
        if (iframe && iframe.contentWindow) {
            // Check history first
            const history = await loadHistory();
            const cachedItem = history.find(h => h.claim === message.claim);

            if (cachedItem) {
                iframe.contentWindow.postMessage({
                    type: 'RESTORE_RESULT',
                    claim: cachedItem.claim,
                    result: cachedItem.result
                }, '*');
            } else {
                iframe.contentWindow.postMessage({
                    type: 'VERIFY_TEXT',
                    text: message.claim,
                    context: message.context
                }, '*');
            }
        }
    } else if (message.type === 'VERIFY_TEXT') {
        // Existing handler for context menu or other sources
        const iframe = document.getElementById('widgetFrame');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'VERIFY_TEXT',
                text: message.text
            }, '*');
        }
    }
});
