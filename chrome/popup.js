document.getElementById("optionsButton").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});

document.addEventListener("DOMContentLoaded", () => {
  const toggleButton = document.getElementById("toggleSwitch");

  // Load the saved state from Chrome storage to initialize the toggle
  chrome.storage.sync.get(["textReplacementEnabled"], (result) => {
    toggleButton.checked = result.textReplacementEnabled !== false; // Default to true if not set
    // Update the UI based on the state
    toggleUIState(toggleButton.checked);
  });

  // Listen for changes to the toggle button and save the state
  toggleButton.addEventListener("change", function () {
    const isChecked = this.checked;
    // Save the state to chrome storage
    chrome.storage.sync.set({ textReplacementEnabled: isChecked });

    // Update the UI based on the new state
    toggleUIState(isChecked);
  });
	
  // Function to update the UI based on toggle state
  function toggleUIState(isChecked) {
    document.getElementById("disableSkipping").style.display = isChecked ? "inline" : "none";
    document.getElementById("enableSkipping").style.display = isChecked ? "none" : "inline";
  }
});
