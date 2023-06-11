checkIfExclude(location.host, () => {
    chrome.runtime.onMessage.addListener((request, sender, response) => {
        switch(request.type) {
            case 'add_m3u8': addM3u8(request.data); break;
        }
    });
    console.log("m3u8插件已监听消息");
});

const M3U8_NOT = ['js', 'css', 'ts', 'png', 'jpg', 'gif', 'ico', 'woff2', 'ts', 'svg', 'json', 'html'];
// { "url不带?后的参数": 'm3u8' || 'mp4' || 'loading' || false(非任何视频api) }
const M3U8_TYPE = {};
const M3U8_MAP = {};

// 此方法会在多个iframe中被执行,可能会出现多个iframe请求同一个url导致多访问题
function addM3u8(url) {
    let name, m3u8URL, xhr;
    if (M3U8_MAP[url] || !url.startsWith('http')) return;
    m3u8URL = new URL(url);
    name = m3u8URL.pathname.split('.');
    m3u8URL = `${m3u8URL.origin}${m3u8URL.pathname}`;
    if (M3U8_NOT.indexOf(name[name.length-1]) >= 0 || false === M3U8_TYPE[m3u8URL]) return;
    try { name = window.top.document.title;} catch (e) {name = 'video';}
    switch (M3U8_TYPE[m3u8URL] || 'aaqq') {
        case 'm3u8': M3U8_MAP[url] = new M3u8Handler(url, name).init(); return;
        case 'mp4': M3U8_MAP[url] = new Mp4Handler(url, name); return;
    }
    M3U8_TYPE[m3u8URL] = false;
    xhr = new XMLHttpRequest();
    xhr.open("HEAD", url, false);
    xhr.send();
    switch (xhr.getResponseHeader('Content-Type')) {
        case 'application/vnd.apple.mpegurl':
            M3U8_TYPE[m3u8URL] = 'm3u8';
            M3U8_MAP[url] = new M3u8Handler(url, name).init();
            break;
        case 'video/mp4':
        case 'video/webm':
            M3U8_TYPE[m3u8URL] = 'mp4';
            M3U8_MAP[url] = new Mp4Handler(url, name);
            break;
    }
}