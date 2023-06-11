checkIfExclude(location.host, () => {
    let httpUtil = document.createElement('div');
    httpUtil.id = 'm3u8-main';
    httpUtil.style.display = 'none';
    httpUtil.innerHTML = `
        <div id="m3u8_down_list"></div>
        <textarea id="m3u8_link" readonly placeholder="这里显示链接"></textarea>
        <div id="m3u8_btns">
            <button id="m3u8_down_btn">下载</button>
            <button id="m3u8_stream_down_btn">下载(流)</button>
            <button id="m3u8_refresh_btn">刷新</button>
        </div>
        <div id="m3u8_response"></div>
        <div id="m3u8_segments"></div>
    `;
    document.body.appendChild(httpUtil);

    document.getElementById('m3u8_refresh_btn').onclick = e => {
        m3u8Refresh();
    }

    document.getElementById('m3u8_down_btn').onclick = e => {
        downClick(false);
    }

    document.getElementById('m3u8_stream_down_btn').onclick = e => {
        downClick(true);
    }

    httpUtil = document.createElement('div');
    httpUtil.id = 'ly_m3u8_top_btns'
    httpUtil.innerHTML = `
        <button id="ly-m3u8-btn-open">m3u8下载</button>
        <button id="ly-m3u8-btn-exclude">排除本域名</button>
    `;
    document.body.appendChild(httpUtil);
    document.getElementById('ly-m3u8-btn-open').onclick = e => {
        var aa = document.getElementById('m3u8-main').style;
        if (aa.display == 'none') {
            aa.display = '';
            m3u8Refresh();
        } else {
            aa.display = 'none';
        }
    }
    document.getElementById('ly-m3u8-btn-exclude').onclick = e => {
        chrome.storage.local.get(["ly_m3u8_options"]).then(res => {
            let config = res['ly_m3u8_options'] || '';
            config += `\n${location.host}`;
            chrome.storage.local.set({"ly_m3u8_options": config});
        });
    }

    chrome.runtime.onMessage.addListener((request, sender, response) => {
        switch(request.type) {
            case 'add_m3u8': addM3u8(request.data); break;
        }
    });

    // new PerformanceObserver((entryList, observer) => {
    //     entryList.getEntries().forEach(item => {
    //         console.log(item.name);
    //     });
    // }).observe({entryTypes: ['resource']});
});

/**
 * 校验是否被排除
 * @param configStr 配置字符串
 * @param host 域名
 * @return {boolean} true:已排除 false:未排除
 */
function checkIfExclude(host, success) {
    chrome.storage.local.get(["ly_m3u8_options"]).then(res => {
        if (!res['ly_m3u8_options']) {
            success();
            return;
        }
        let line = res['ly_m3u8_options'].split('\n'), hosts;
        for (let i = 0; i < line.length; i++) {
            hosts = line[i].split(',');
            for (let j = 0; j < hosts.length; j++) {
                if (hosts[j].trim() == host) {
                    return;
                }
            }
        }
        success();
    });
}

function downClick(isStream) {
    let link = document.getElementById('m3u8_link').value;
    link && M3U8_MAP[link] && M3U8_MAP[link].startDownload(isStream);
}

const M3U8_NOT = ['js', 'css', 'ts', 'png', 'jpg', 'gif', 'ico', 'woff2', 'ts', 'svg', 'json', 'html'];
// { "url不带?后的参数": 'm3u8' || 'mp4' || 'loading' || false(非任何视频api) }
const M3U8_TYPE = {};
const M3U8_MAP = {};

function m3u8Refresh() {
    let tmp = '', i = 0;
    for (const url in M3U8_MAP) {
        if ('demo' == M3U8_MAP[url].type) continue;
        tmp += `<button id="${url}" class="${M3U8_MAP[url].class}">${i++}:${M3U8_MAP[url].type}</button>`;
    }
    document.getElementById('m3u8_down_list').innerHTML = tmp;
    tmp = document.getElementById('m3u8_down_list').children;
    for (i = 0; i < tmp.length; i++) {
        tmp[i].onclick = e => {
            M3U8_MAP[e.target.id].showInfo();
        }
    }
}

const logUrls = [
    'https://cn.pornhub.com/svvt/add',
    'https://cn.pornhub.com/front/menu_livesex'
];
function log(m3u8URL, url, split) {
    let idx = logUrls.indexOf(m3u8URL);
    if (idx >= 0) {
        let date = new Date();
        console.log(`${idx} ${split} ${date.getSeconds()}.${date.getMilliseconds()} ${split} ${M3U8_TYPE[m3u8URL]} 
        ${split} ${url}
        ${split} ${JSON.stringify(M3U8_TYPE)}`);
    }
}

function addM3u8(url) {
    let name, m3u8URL, xhr;
    // console.log(`-----\n- ${url}\n- ${m3u8URL}`);
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
    // console.log(url);
    // log(m3u8URL, url, '::');
    M3U8_TYPE[m3u8URL] = false;
    // log(m3u8URL, url, '--');
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
    // log(m3u8URL, url, '>>');
}