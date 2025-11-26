// Data Commons Fact Checker Content Script

// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_TEXT') {
    const text = extractContent();
    console.log("Extracted text length:", text.length);
    sendResponse({ text: text });
  } else if (request.type === 'HIGHLIGHT_CLAIMS') {
    highlightClaims(request.claims);
    sendResponse({ success: true });
  } else if (request.type === 'CLEAR_HIGHLIGHTS') {
    clearHighlights();
    sendResponse({ success: true });
  }
  return true; // Keep channel open for async response
});

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
  const textNodes = [];
  const meaningfulTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'TD'];

  // Helper to traverse and collect text (not used in final logic below but kept for reference if needed)
  // The original logic used innerText which is simpler.

  // If we found a specific container, use its innerText as it's likely cleaner
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

function clearHighlights() {
  const highlights = document.querySelectorAll('.dc-highlight');
  highlights.forEach(span => {
    const parent = span.parentNode;
    parent.replaceChild(document.createTextNode(span.textContent), span);
    parent.normalize(); // Merge text nodes
  });
}

function highlightClaims(claims) {
  clearHighlights(); // Clear existing first

  if (!claims || claims.length === 0) return;

  // Sort claims by length (longest first) to avoid partial matches inside longer ones
  // claims.sort((a, b) => b.length - a.length);

  // We need to be careful about performance.
  // Searching the whole DOM for every claim is expensive.
  // But typically we have < 20 claims.

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    // Skip hidden or script/style
    if (node.parentNode.nodeName === 'SCRIPT' ||
      node.parentNode.nodeName === 'STYLE' ||
      node.parentNode.nodeName === 'NOSCRIPT' ||
      node.parentNode.isContentEditable) {
      continue;
    }
    textNodes.push(node);
  }

  // For each claim, find it in text nodes
  // This is a naive implementation that only matches if the claim is fully within a single text node.
  // If a claim spans multiple nodes (e.g. bold text in middle), it won't match.
  // Given the extraction logic uses innerText, it might span nodes.
  // But for now, let's try single node matching as it covers most cases.

  claims.forEach(claim => {
    if (!claim || claim.length < 5) return; // Skip very short claims

    for (const node of textNodes) {
      const text = node.nodeValue;
      const index = text.indexOf(claim);

      if (index >= 0) {
        // Found a match!
        // We need to split the node
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + claim.length);

        const span = document.createElement('span');
        span.className = 'dc-highlight';
        span.style.backgroundColor = '#fce8e6'; // Light red/pink
        span.style.borderBottom = '2px solid #c5221f';
        span.style.cursor = 'pointer';
        span.title = 'Click to verify with Data Commons';
        span.dataset.claim = claim;

        span.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();

          // Get context (surrounding paragraph/block)
          let context = "";
          try {
            // 1. Get immediate parent text (Surrounding Text)
            const parentEl = span.parentNode;
            let surroundingText = parentEl.innerText || parentEl.textContent;

            // Truncate surrounding text if too long (keep around 300 chars)
            if (surroundingText.length > 300) {
              surroundingText = surroundingText.substring(0, 300) + "...";
            }

            // 2. Find nearest preceding header (Section)
            let current = parentEl;
            let sectionHeader = "";
            while (current && current !== document.body) {
              let sibling = current.previousElementSibling;
              while (sibling) {
                if (/^H[1-6]$/.test(sibling.tagName)) {
                  sectionHeader = sibling.innerText || sibling.textContent;
                  break;
                }
                sibling = sibling.previousElementSibling;
              }
              if (sectionHeader) break;
              current = current.parentNode;
            }

            // 3. Get Page Title / H1
            const pageTitle = document.title;
            let mainHeader = "";
            const h1 = document.querySelector('h1');
            if (h1) mainHeader = h1.innerText || h1.textContent;

            // Construct concise context
            const parts = [];
            if (pageTitle) parts.push(`Page: ${pageTitle}`);
            if (sectionHeader) parts.push(`Section: ${sectionHeader}`);
            else if (mainHeader && mainHeader !== pageTitle) parts.push(`Title: ${mainHeader}`);

            if (surroundingText && surroundingText !== claim) {
              parts.push(`Surrounding Text: "${surroundingText}"`);
            }

            context = parts.join(' | ');

          } catch (err) {
            console.warn("Could not get context:", err);
          }

          // Send message to sidepanel
          chrome.runtime.sendMessage({
            type: 'VERIFY_CLAIM_FROM_PAGE',
            claim: claim,
            context: context
          });
        };

        try {
          range.surroundContents(span);
          // Update textNodes list? 
          // The 'node' is now split. The part after is a new node.
          // We should stop searching in this node for this claim to avoid infinite loop if we were looping inside node.
          // But we are looping over pre-fetched textNodes.
          // The 'node' variable still points to the first part (or the whole thing if it was replaced?).
          // Actually surroundContents puts the content into the span.
          // The original 'node' might be empty or removed?
          // Let's break to next claim to avoid issues with this node.
          // (Assuming one highlight per claim instance for now, or at least one per node)
          break;
        } catch (e) {
          console.error("Failed to highlight:", e);
        }
      }
    }
  });
}
