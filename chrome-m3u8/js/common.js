
function genPartUrl(partUri, m3u8URL) {
    if (partUri.indexOf('http') === 0) {
        return partUri;
    }
    let domain = (m3u8URL.origin + m3u8URL.pathname).split('/');
    if (partUri[0] === '/') {
        return domain[0] + '//' + domain[2] + partUri;
    } else {
        domain.pop();
        domain.push(partUri);
        return domain.join('/');
    }
}

/**
 * ajax
 * @param options
 *  {
 *      url: '',
 *      type: type || 'file',
 *      timeout: 2000 || null;
 *      progress(e) {},
 *      success(response) {},
 *      fail(status){};
 *  }
 * @return {Promise<unknown>}
 */
function ajax(options) {
    if (!options) return;
    let xhr = new XMLHttpRequest();
    if (options.type === 'file') {
        xhr.responseType = 'arraybuffer';
    }
    xhr.onprogress = ev =>
        typeof options.progress === 'function' && options.progress(ev);
    xhr.onreadystatechange = function () {
        // console.log(`${xhr.readyState}/${xhr.status}`)
        if (xhr.readyState === 4) {
            let status = xhr.status;
            if (status >= 200 && status < 300) {
                options.success && options.success(xhr.response);
            } else {
                options.fail && options.fail(status);
            }
        }
    };
    xhr.open("GET", options.url, true);
    xhr.send(null);
}

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