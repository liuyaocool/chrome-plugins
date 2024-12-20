let urls = [];
chrome.runtime.onMessage.addListener((request, sender, response) => {
    switch(request.type) {
        case 'add_m3u8': 
            urls.push(request.url); 
            addUrl(request.url);
        break;
    }
});
console.log("test插件已监听消息");

let divId = 'ly_test_div';
function addUrl(url) {
    document.getElementById(divId).value = `${url}\n` + document.getElementById(divId).value;
}