chrome.action.onClicked.addListener((tab) => {
    chrome.runtime.openOptionsPage();
});

var config = {
    mode: "fixed_servers",
    rules: {
        proxyForHttp: {
            scheme: "http",
            host: "127.0.0.1",
            port: 9092
        },
        proxyForHttps: {
            scheme: "http",
            host: "127.0.0.1",
            port: 9092
        },
        bypassList: ["liuyao.link"]
    }
};

chrome.proxy.settings.get(
    {'incognito': false},
    function(config) {
        console.log(JSON.stringify(config));
    }
);
