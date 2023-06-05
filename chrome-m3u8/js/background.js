chrome.action.onClicked.addListener((tab) => {
    chrome.runtime.openOptionsPage();
});
// chrome.webRequest.onBeforeSendHeaders.addListener(
//     details=> {
//         console.log(details);
//         return {requestHeaders: details.requestHeaders};
//     },
//     {urls: ['<all_urls>'],  types: ["xmlhttprequest"]},
//     ["requestHeaders"]
// );

/**
 * 文档: https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/
 */
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((e) => {
    // chrome.runtime.sendMessage({type: type, data: data})
    //     .then(isFunc(callback) ? callback : defaultCallback, onerror);
    chrome.tabs.sendMessage(e.request.tabId, {type: 'add_m3u8', data: e.request.url})
});
