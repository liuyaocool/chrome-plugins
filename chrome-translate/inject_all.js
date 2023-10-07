document.onmouseup = function (e) {
    sendToBackground('src', document.getSelection().toString());
}

function sendToBackground(type, data) {
    /**
     * chrome.runtime.id: get extension id
     * 文档： https://developer.chrome.com/docs/extensions/reference/runtime/#method-sendMessage
     */
    chrome.runtime.sendMessage({type: type, data: data}, {})
        .then(e => console.log(e))
        .catch(e => console.log(e))
    ;
}
