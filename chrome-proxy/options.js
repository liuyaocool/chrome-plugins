
document.getElementById('ly_proxy_config').onblur = e => {
    if (!e.target.value) return;
    try {
        e.target.value = JSON.stringify(JSON.parse(e.target.value), null, 4);
        showMsg("info", "格式化完成");
    } catch (e) {
        showMsg("error", "格式化失败: " + e);
    }
};

window.onbeforeunload = ev => {
    sessionStorage.config = document.getElementById('ly_proxy_config').value || '';
}

if (sessionStorage.config) {
    document.getElementById('ly_proxy_config').value = sessionStorage.config;
    showMsg("info", "配置已从 session 加载");
} else {
    chrome.storage.local.get(["lyproxy_options"]).then(res => {
        if (!res['lyproxy_options']) return;
        document.getElementById('ly_proxy_config').value = res['lyproxy_options'];
        showMsg("info", "配置已从 storage 加载")
    });
}

document.getElementById('ly_proxy_save').onclick = e => {
    try {
        saveProxy(e);
        showMsg("info","保存完成");
    } catch (e) {
        showMsg("error", "保存失败: " + e);
    }
}
function saveProxy(e) {
    let text = document.getElementById('ly_proxy_config').value;
    let cfg = handleConfig(text);
    let pac_script = `
        function FindProxyForURL(url, host) {
            return matchProxy(host, '${cfg.global_proxy}', ${toJson(cfg.prefix)}, ${toJson(cfg.suffix)});
        }
        ${matchProxy.toString()}
        `;
    chrome.proxy.settings.set(
        {
            value: {
                mode: "pac_script",
                pacScript: {
                    // url: "https://liuyao.link/pac.js",
                    mandatory: false,
                    data: pac_script
                }
            },
            scope: 'regular'
        },
        function() {}
    );
    chrome.storage.local.set({"lyproxy_options": text});
}

document.getElementById('ly_proxy_temp').onclick = e => {
    document.getElementById('ly_proxy_config').value =
        `{
    "global_proxy": "127.0.0.1:9092",
    "special_proxy": {
        "127.0.0.1:9091": [
            "openai.com"
        ]
    },
    "exclude_prefix": [
        "10", 
        "127", 
        "172", 
        "192"    
    ],
    "exclude_suffix": [
        "liuyao.link",
        "liuyao.ink",
        "baidu.com",
        "bilibili.com",
        "21tb.com",
        "tapd.cn",
        "aliyun.com",
        "csdn.net",
        "qq.com",
        "zhihu.com",
        "gitee.com",
        "mashibing.com",
        "iqiyi.com",
        "youku.com",
        "huawei.com",
        "sohu.com"
    ]
}`;
}

document.getElementById('ly_proxy_check_proxy').oninput = e => {
    if (!e.target.value) {
        showMsg('info', '');
        return;
    }
    showMsg('info', `使用代理：${FindProxyForURL('', e.target.value)}`);
}

function handleConfig(text) {
    let config = JSON.parse(text), suffix = {}, prefix = {};
    let convert = (proxy, host) => {
        let tmp = suffix, hs = host.split('.'), i = hs.length-1;
        while(i >= 0) {
            if (!tmp[hs[i]]) tmp[hs[i]] = 0 == i ? proxy : {};
            tmp = tmp[hs[i--]];
        }
    }
    config['exclude_prefix'].forEach(h => {
        let tmp = prefix, hs = h.split('.');
        for (let i = 0; i < hs.length; i++) {
            if (!tmp[hs[i]]) tmp[hs[i]] = i == (hs.length-1) ? "DIRECT" : {};
            tmp = tmp[hs[i]];
        }
    });
    for (const proxy in config['special_proxy'])
        config['special_proxy'][proxy].forEach(h => convert(`PROXY ${proxy}`, h));
    config['exclude_suffix'].forEach(h => convert('DIRECT', h));
    return {
        "global_proxy": config['global_proxy'],
        "prefix": prefix,
        "suffix": suffix
    }
}
/**
 *
 * @param url
 * @param host
 * @param suffix
 *      {
 *         "com": {
 *             "baidu": "DIRECT",
 *             "bilibili": "DIRECT",
 *             "21tb": "DIRECT",
 *             "openai": "PROXY 127.0.0.1:9091"
 *         },
 *         "link": {
 *             "liuyao": "DIRECT",
 *         }
 *     };
 * @param prefix
 *      {
 *         "127": {
 *             "1": "DIRECT",
 *         },
 *         "172": {
 *             "21": "DIRECT",
 *         }
 *     };
 * @returns {string}
 * @constructor
 */
function FindProxyForURL(url, host) {
    let cfg = handleConfig(document.getElementById('ly_proxy_config').value);
    return matchProxy(host, cfg.global_proxy, cfg.prefix, cfg.suffix);
}

function matchProxy(host, globalProxy, prefix, suffix) {
    let hs = host.split('.'), i = hs.length-1;
    while((suffix = suffix[hs[i]]) && i-- >= 0) if(typeof suffix == 'string') return suffix;
    i = 0;
    while((prefix = prefix[hs[i]]) && i++ < hs.length) if(typeof prefix == 'string') return prefix;
    return "PROXY " + globalProxy;
}

function showMsg(type, str) {
    var msg = document.getElementById('ly_proxy_msg');
    msg.innerHTML = str;
    switch (type) {
        case "info": msg.style.color = "#00ffd0fa"; break;
        case "error": msg.style.color = "#ff3333fa"; break;
    }
}

function toJson(obj) {
    return JSON.stringify(obj).replaceAll('"', "'")
}