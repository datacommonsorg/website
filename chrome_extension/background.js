// Setup context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "verify-claim",
    title: "Verify with Data Commons",
    contexts: ["selection"]
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "verify-claim" && info.selectionText) {
    // Open side panel
    chrome.sidePanel.open({ windowId: tab.windowId });
    
    // Send text to side panel (wait a bit for it to open if needed)
    setTimeout(() => {
        chrome.runtime.sendMessage({
            type: 'VERIFY_TEXT',
            text: info.selectionText
        }).catch(() => {
            // If side panel wasn't open, it might not be ready to receive messages yet.
            // In a real app, we'd want a more robust handshake.
            console.log("Side panel might not be ready.");
        });
    }, 500);
  }
});

// Open side panel on action click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});
