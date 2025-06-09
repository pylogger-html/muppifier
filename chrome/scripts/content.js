// Get stored replacements and check if enabled
chrome.storage.sync.get(["replacements", "textReplacementEnabled"], (result) => {
    let replacements = result.replacements || {};
    const textReplacementEnabled = result.textReplacementEnabled !== false;
    
    //Replacements has all the name/id's that are configured in the options page
    //but only the "id" is available here. Resolve looks up the full information
    //for each entry. "id-1" -> {id: 'id-1', fullName: 'Kermit the Frog' ...
    resolveAllReplacements(replacements).then(resolvedReplacements => {
        console.log("Resolved replacements:", resolvedReplacements);
        applyReplacements(resolvedReplacements, textReplacementEnabled);
    });
    
});

// Function to apply replacements in the webpage
function applyReplacements(replacements, textReplacementEnabled) {
    function replaceText(node) {
        if (!textReplacementEnabled) return;

        if (shouldSkipNodeDueToCursor(node)) {
            //console.log("Skipping node due to active cursor:", node);
            return;
        }

        if (node.nodeType === 3) { 
            let text = node.nodeValue;
            for (let [key, replacement] of Object.entries(replacements)) {
                let [firstName, lastName] = key.split(" ");
                
                const replacementFull = replacement.fullName || "";
                const replacementFirst = replacement.shortName || replacementFull;

                let fullNameRegex = new RegExp(`\\b${firstName} ${lastName}\\b`, "gi");
                let firstOrLastRegex = new RegExp(`\\b(${firstName}|${lastName})\\b`, "gi");

                if (fullNameRegex.test(text)) {
                    text = text.replace(fullNameRegex, (match) => preserveCase(match, replacementFull));
                } else if (firstOrLastRegex.test(text)) {
                    text = text.replace(firstOrLastRegex, (match) => preserveCase(match, replacementFirst));
                }
            }
            node.nodeValue = text;
        } else if (node.nodeType === 1 && node.childNodes && node.tagName !== "SCRIPT") {
            for (let child of node.childNodes) {
                replaceText(child);
            }
        }
    }

    if (textReplacementEnabled) {
        requestIdleCallback(() => replaceText(document.body));

        const observer = new MutationObserver(mutations => {
            for (let mutation of mutations) {
                for (let node of mutation.addedNodes) {
                    replaceText(node);
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }
}


function getSelectionAnchorContainer() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        return sel.getRangeAt(0).startContainer;
    }
    return null;
}

function shouldSkipNodeDueToCursor(node) {
    const selectionNode = getSelectionAnchorContainer();
    if (!selectionNode) return false;
    return node === selectionNode || node.contains(selectionNode) || selectionNode.contains(node);
}


function preserveCase(source, replacement) {
    if (source.toUpperCase() === source) {
      return replacement.toUpperCase(); // ALL CAPS
    } else if (source.toLowerCase() === source) {
      return replacement.toLowerCase(); // all lowercase
    } else if (source[0].toUpperCase() === source[0]) {
      return replacement[0].toUpperCase() + replacement.slice(1); // Capitalized
    } else {
      return replacement; // default
    }
  }

function getByIdFromDatabase(id) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "getById", id: id }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("getById error:", chrome.runtime.lastError.message);
          reject(chrome.runtime.lastError);
        } else if (response === null) {
          // ID not found in DB
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  async function resolveAllReplacements(replacements) {
    const resolved = {};
  
    for (const [name, id] of Object.entries(replacements)) {
      try {
        let entry;
        
        if (id === "Random") {
            entry = await getRandomEntryFromDatabase();
            if (!entry) {
                console.warn("No random entry found for: ", id, " removing");
                continue;
            }
        } else {
            entry = await getByIdFromDatabase(id);

            if (!entry) {
            console.warn(`No entry found for ID "${id}", removing "${name}"`);
            continue;
            }
        }

        resolved[name] = entry;  // Replace ID with full entry
      } catch (err) {
        console.error(`Error resolving ID "${id}":`, err);
      }
    }
  
    return resolved;
  }

function getRandomEntryFromDatabase() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "getRandom" }, response => {
        if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
        } else {
            resolve(response?.replacement || null);
        }
        });
    });
}
