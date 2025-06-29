// background.js (Manifest V3 service‑worker)
chrome.runtime.onInstalled.addListener(async (details) => {
  /* ---------- 1️⃣  Seed the IndexedDB (runs on every install/update) ---------- */
  try {
    const res     = await fetch(chrome.runtime.getURL('data/replacements.json'));
    const entries = await res.json();

    const db = await openDatabase();
    const tx = db.transaction('replacements', 'readwrite');
    const store = tx.objectStore('replacements');
    entries.forEach((entry) => store.put(entry));
    await tx.complete;
  } catch (err) {
    console.error('Failed to seed database:', err);
  }

  /* ---------- 2️⃣  Open options.html the very first time only ---------- */
  if (details.reason === 'install') {
    // Works in all modern Chromium‑based browsers
    chrome.runtime.openOptionsPage()
      .catch(err => console.error('Could not open options page:', err));
  }
});

// Define openDatabase function
function openDatabase() {
  return new Promise((resolve, reject) => {
    //console.debug("Opening IndexedDB...");
    const request = indexedDB.open("ReplacementsDB", 1);

    request.onupgradeneeded = (event) => {
      //console.debug("onupgradeneeded: Creating object store 'replacements'");
      const db = event.target.result;
      // Create an object store (table) called 'replacements'
      const store = db.createObjectStore("replacements", { keyPath: "id" });
      // Create an index on the 'genre' column (optional)
      store.createIndex("genre", "genre", { unique: false });
    };

    request.onsuccess = (event) => {
      //console.debug("Database opened successfully.");
      resolve(event.target.result);  // Resolve with the database object
    };

    request.onerror = (event) => {
      console.error("Error opening the database:", event.target.error);
      reject(event.target.error);  // Reject with an error if something goes wrong
    };
  });
}

// Initialize the database on extension installation
chrome.runtime.onInstalled.addListener(() => {
  // Example of preloading data from a JSON file or another source
  fetch(chrome.runtime.getURL('data/replacements.json'))
    .then(response => response.json())
    .then(entries => {
      //console.debug("Received message to get replacement options.");
      openDatabase().then(db => {
        const tx = db.transaction("replacements", "readwrite");
        const store = tx.objectStore("replacements");

        // Add or update the entries in the 'replacements' object store
        entries.forEach(entry => store.put(entry));

        return tx.complete;
      }).catch(error => {
        console.error("Failed to open the database:", error);
      });
    }).catch(error => {
      console.error("Failed to load replacements.json:", error);
    });
});

// Handle requests from content scripts or other parts of your extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getReplacementOptions") {
      //console.debug("Received message to get replacement options.");

      openDatabase().then(db => {
          //console.debug("Database opened. Retrieving replacement options...");
          const tx = db.transaction("replacements", "readonly");
          const store = tx.objectStore("replacements");

          const allReplacements = store.getAll();  // Get all records from the store

          allReplacements.onsuccess = () => {
              //console.debug("All replacements retrieved:", allReplacements.result);

              // Check if we have results before processing
              if (allReplacements.result && allReplacements.result.length > 0) {
                  const sorted = allReplacements.result.sort((a, b) => {
                    const genreCompare = a.genre.localeCompare(b.genre);
                    return genreCompare !== 0
                        ? genreCompare
                        : a.fullName.localeCompare(b.fullName);
                  });

                  const options = sorted.map(entry => 
                    ({fullName: entry.fullName, genre: entry.genre, id: entry.id}) 
                  );
                  //console.log("Replacement options mapped:", options);
                  sendResponse(options);  // Send the long names (full names) back to the options page
              } else {
                  console.log("No replacements found in the database.");
                  sendResponse([]);  // Send an empty array if no replacements are found
              }
          };

          allReplacements.onerror = (error) => {
              console.error("Failed to retrieve replacement options:", error.target.error);
              sendResponse([]);  // Send an empty array if an error occurs
          };

      }).catch(error => {
          console.error("Error opening the database:", error);
          sendResponse([]);  // Send an empty array if the database could not be opened
      });

      return true;  // Keep the message channel open for asynchronous response
  } else if (request.action === "getById") {
    const id = request.id;

    openDatabase().then((db) => {
      const tx = db.transaction("replacements", "readonly");
      const store = tx.objectStore("replacements");
      const requestEntry = store.get(id);
      //console.log('looking up ${id}, got ',id,  requestEntry);

      requestEntry.onsuccess = () => {
        const result = requestEntry.result;
        if (result) {
          sendResponse({
            id: result.id,
            fullName: result.fullName,
            shortName: result.shortName,
            genre: result.genre
          });
        } else {
          console.warn('No entry found for id: ${id}');
          sendResponse(null);
        }
      };

      requestEntry.onerror = () => {
        console.error('Failed to retrieve entry for id: ${id}', request.error);
        sendResponse(null);
      };
    }).catch((error) => {
      console.error("Database error:", error);
      sendResponse(null);
    });

    return true;
  } else if (request.action === "getRandom") {
    //select a random entry from the database
    openDatabase().then(db => {
      const tx = db.transaction("replacements", "readonly");
      const store = tx.objectStore("replacements");

      const getAll = store.getAll();
      getAll.onsuccess = () => {
        const all = getAll.result;
        if (all.length > 0) {
          const randomIndex = Math.floor(Math.random() * all.length);
          sendResponse({ replacement: all[randomIndex] });
        } else {
          sendResponse({ replacement: null });
        }
      };

      getAll.onerror = () => {
        reject("error");  // ❌ reject is not defined!
      };
    }).catch(err => {
      console.error("getRandomReplacement failed:", err);
      sendResponse({ replacement: null });
    });

    return true; // keep the message channel open

  }
});
