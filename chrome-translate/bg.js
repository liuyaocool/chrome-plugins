chrome.action.onClicked.addListener((tab) => {
    chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((req, sender, resp) => {
    switch (req.type) {
        case 'src': forwardToActiveTab(req); break;
        default: break;
    }
})

async function forwardToActiveTab(message) {
    /**
     * Content script can only use chrome.i18n, chrome.dom, chrome.storage, and a subset of chrome.runtime/chrome.extension.
     * Most chrome APIs such as chrome.tabs are only available the background script (service worker in MV3), popup script, etc.
     * see: https://stackoverflow.com/questions/15034859/cannot-read-property-of-undefined-when-using-chrome-tabs-or-other-chrome-api-i
     */
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, message);
    // TODO: Do something with the response.
}
