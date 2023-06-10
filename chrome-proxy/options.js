
document.getElementById('ly_proxy_config').onblur = e => {
    if (!e.target.value) return;
    try {
        e.target.value = JSON.stringify(JSON.parse(e.target.value), null, 4);
        showMsg('I', "格式化完成");
    } catch (e) {
        showMsg('E', "格式化失败: " + e);
    }
};

let cacheIds = ['ly_proxy_config', 'ly_proxy_remote_url'];
window.onbeforeunload = ev => {
    sessionStorage.sign = 1;
    cacheIds.forEach(id => sessionStorage[id] = document.getElementById(id).value) || '';
}
if (sessionStorage.sign) {
    cacheIds.forEach(id => document.getElementById(id).value = sessionStorage[id]);
    showMsg('I', "配置已从 session 加载");
} else {
    chrome.storage.local.get(cacheIds).then(res => {
        if (!res) return;
        for (let id in res) document.getElementById(id).value = res[id];
        showMsg('I', "配置已从 storage 加载");
    });
}

document.getElementById('ly_proxy_save').onclick = e => {
    try {
        saveProxy(e);
        showMsg('I',"保存完成");
    } catch (e) {
        showMsg('E', "保存失败: " + e);
    }
}
function saveProxy(e) {
    let toJson = obj => {return JSON.stringify(obj).replaceAll('"', "'");};
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
    chrome.storage.local.set({"ly_proxy_config": text});
}

document.getElementById('ly_proxy_temp').onclick = e => {
    getConfig(chrome.runtime.getURL('config.json'), resp => {
        document.getElementById('ly_proxy_config').value = resp;
        showMsg('I', '已加载本地配置模板, 请点击保存');
    });
}

document.getElementById('ly_proxy_remote_url').onblur = e => {
    chrome.storage.local.set({'ly_proxy_remote_url': e.target.value});
};

document.getElementById('ly_proxy_remote').onclick = e => {
    let url = document.getElementById('ly_proxy_remote_url').value;
    if (!url) {
        showMsg('E', '远程配置url 为空');
        return;
    }
    getConfig(url, resp => {
        document.getElementById('ly_proxy_config').value = resp;
        showMsg('I', '已加载远程配置, 请点击保存');
    }, failResp => {
        showMsg('E', failResp);
    });
}

document.getElementById('ly_proxy_check_proxy').oninput = e => {
    if (!e.target.value) {
        showMsg('I', '');
        return;
    }
    showMsg('I', `使用代理：${FindProxyForURL('', e.target.value)}`);
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

function getConfig(url, success, fail) {
    if (!url) return;
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
                success && success(xhr.response);
            } else {
                fail && fail(xhr.response);
            }
        }
    };
    xhr.open("GET", url, true);
    xhr.send(null);
}

function showMsg(type, str) {
    var msg = document.getElementById('ly_proxy_msg');
    msg.innerHTML = str;
    switch (type) {
        case "I": msg.style.color = "#00ffd0fa"; break;
        case "E": msg.style.color = "#ff3333fa"; break;
    }
}