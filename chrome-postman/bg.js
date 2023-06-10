chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        // func: openConfig,
        files: ["inject.js"]
    });
});