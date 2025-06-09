document.addEventListener("DOMContentLoaded", function () {
    const defaultReplacements = {
        "Elon Musk": "id-1", //Kermit
        "Donald Trump": "id-4" //Gonzo
    };

    const antidefaultReplacements = {
        "Joe Biden": "id-1", //Kermit
        "Hilary Clinton": "id-2" //Ms Piggy
    };

    // Function to retrieve replacement options (long names) from background script
    function getReplacementOptions() {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { action: "getReplacementOptions" },
                (response) => {
                    //console.log("Message sent to background, received response:", response);
                    if (Array.isArray(response)) {
                        resolve(response);  // Resolve with the replacement options
                    } else {
                        reject("Failed to retrieve replacement options.");
                    }
                }
            );
        });
    }

    // Function to populate the table with replacement data
    function populateTable() {
        chrome.storage.sync.get(["replacements"], (result) => {
            let replacements = result.replacements || defaultReplacements;

            const tableBody = document.getElementById("replacementsTableBody");
            tableBody.innerHTML = "";  // Clear any existing rows

            // Fetch replacement options from the background script (IndexedDB)
            getReplacementOptions().then(options => {
                Object.entries(replacements).forEach(([name, storedId]) => {
                    const row = document.createElement("tr");

                    //---------------------------------------------------------
                    // Name Input Field
                    const nameCell = document.createElement("td");
                    const nameInput = document.createElement("input");
                    nameInput.value = name;
                    nameInput.type = "text";
                    nameInput.placeholder = "Enter name";
                    nameInput.addEventListener("input", () => {
                        // Update key in the replacements object
                        const newName = nameInput.value;
                        const oldReplacement = replacements[name]; // Old key
                        delete replacements[name];
                        replacements[newName] = oldReplacement;
                        saveTableState(replacements);
                    });
                    nameCell.appendChild(nameInput);
                    
                    //---------------------------------------------------------
                    // Replacement Dropdown
                    const replacementCell = document.createElement("td");
                    const replacementSelect = document.createElement("select");
                    
                    // Add "Random" option first
                    const randomOption = document.createElement("option");
                    randomOption.value = "Random";
                    randomOption.textContent = "Random";
                    replacementSelect.appendChild(randomOption);
                    

                    // Add options to the dropdown from the database
                    options.forEach(option => {
                        const optionElement = document.createElement("option");
                        optionElement.value = option.id;
                        //console.log(JSON.stringify(option));
                        optionElement.textContent = `(${option.genre}) ${option.fullName}`;
                        replacementSelect.appendChild(optionElement);
                    });

                    replacementSelect.value = storedId || "Random";

                    replacementSelect.addEventListener("change", () => {
                        // Get the updated name and selected ID
                        const updatedName = nameInput.value;
                        const newId = replacementSelect.value;
                        console.log(`Saving: ${updatedName} => ${newId}`);
                        replacements[updatedName] = newId;
                        saveTableState(replacements);
                    });

                    replacementCell.appendChild(replacementSelect);
                    row.appendChild(nameCell);
                    row.appendChild(replacementCell);
                    
                    //---------------------------------------------------------
                    //remove button
                    const removeCell = document.createElement("td");
                    removeCell.style.textAlign = "center";

                    const removeButton = document.createElement("button");
                    removeButton.textContent = "❌";
                    removeButton.className = "remove-btn"; // optional styling
                    removeButton.style.cursor = "pointer";

                    removeButton.addEventListener("click", () => {
                        const currentName = nameInput.value;
                        delete replacements[currentName];
                        row.remove();
                        saveTableState(replacements);
                    });
                    removeCell.appendChild(removeButton);
                    row.appendChild(removeCell);
                    

                    tableBody.appendChild(row);
                });
            }).catch(error => {
                console.error(error);
                // Handle any error when fetching replacement options (e.g., fall back to a default)
            });
        });
    }

    // Save the current state of the replacements table
    function saveTableState(replacements) {
        console.log("Saving replacements to storage:", replacements);
        chrome.storage.sync.set({ replacements }, populateTable);
    }

    //-------------------------------------------------------------------------
    // populate the defaults button behavior
    function appendReplacements(newEntries, callback) {
        //only add in new entries and don't alter the existing entries
        chrome.storage.sync.get(["replacements"], (result) => {
            const existing = result.replacements || {};
            const updated = { ...existing, ...newEntries };

            //prevent overwriting of existing keys
            for (const key in newEntries) {
                if (!(key in updated)) {
                    updated[key] = newEntries[key].id;
                }
            }

            chrome.storage.sync.set({ replacements: updated }, () => {
                if (callback) callback();
            });
        });
    }

    document.getElementById("defaultsButton").addEventListener("click", () => {
        appendReplacements(defaultReplacements, populateTable);
    });
    
    document.getElementById("antidefaultsButton").addEventListener("click", () => {
        appendReplacements(antidefaultReplacements, populateTable);
    });
    //-------------------------------------------------------------------------

    populateTable();  // Initial population of the table
});
