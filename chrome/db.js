function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("ReplacementsDB", 1);
  
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const store = db.createObjectStore("replacements", { keyPath: "shortName" });
        store.createIndex("genre", "genre", { unique: false });
      };
  
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  