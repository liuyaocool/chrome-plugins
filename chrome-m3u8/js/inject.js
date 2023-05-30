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

const M3U8_MAP = {};

function m3u8Refresh() {
    window.performance.getEntries().forEach(item => addM3u8(item));
    let tmp = '', i = 0;
    for (const url in M3U8_MAP) {
        tmp += `<button id="${url}">${i++}:${M3U8_MAP[url].type}</button>`;
    }
    document.getElementById('m3u8_down_list').innerHTML = tmp;
    tmp = document.getElementById('m3u8_down_list').children;
    for (i = 0; i < tmp.length; i++) {
        tmp[i].onclick = e => {
            M3U8_MAP[e.target.id].showInfo();
        }
    }
}

function addM3u8(performance) {
    let url = performance.name, id = url, name;
    if (M3U8_MAP[id] || !url.startsWith('http')) return;
    try { name = window.top.document.title; } catch (e) { console.warn(e); }
    name = name || 'video';
    if (url.indexOf('m3u8') > 0) {
        M3U8_MAP[id] = new M3u8Handler(url, name);
    } else if (url.indexOf('mp4') > 0) {
        M3U8_MAP[id] = new Mp4Handler(url, name);
    }
}

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

class M3u8Handler {
    constructor(url, name) {
        this.url = url;
        this.name = name + '.ts';
        this.type = 'm3u8';
        this.m3u8RespHtml = '';
        this.tsUrls = []; // 分段链接地址
        this.tsFiles = []; // 分段链接地址
        this.downloadCount = 0; // 下载个数
        this.downloadIndex = 0; // 下一个需要下载的下标
        this.saveIndex = 0; // 下一个需要保存的下标
        this.fileWriter = null;
        this.aesMethod = null;
        this.aesKey = null;
        this.aesIv = null;
        this.decryptor = new Decryptor(url);
        this.init();
    }

    init() {
        let that = this;
        ajax({
            url: that.url,
            success: m3u8Str => {
                if (!m3u8Str) return;
                let m3u8URL = new URL(that.url), i = 1, tdHtm, tsUrls = [], respHtm = '<table>';
                // 提取 ts 视频片段地址
                m3u8Str.split('\n').forEach(line => {
                    if (line.startsWith('#EXT-X-KEY')) {
                        that.decryptor.init(line);
                        return;
                    }
                    if (!(line = line.trim())) return;
                    if ('#' !== line[0]) {
                        tsUrls.push(tdHtm = genPartUrl(line, m3u8URL));
                        respHtm += `<tr><td>${i++}:</td><td><a href="${tdHtm}">${line}</a></td></tr>`
                    } else {
                        respHtm += `<tr><td>-:</td><td><note>${line}</note></td></tr>`
                    }
                });
                that.m3u8RespHtml = respHtm + '</table>';
                that.tsUrls = tsUrls;
            }
        });
        // that.fileWriter = streamSaver.createWriteStream(m3u8Map[id].name, {
        //     size: undefined, // (optional filesize) Will show progress
        //     writableStrategy: undefined, // (optional)
        //     readableStrategy: undefined  // (optional)
        // }).getWriter();
    }

    nextIndex() {
        let idx = this.downloadIndex++;
        return (idx < this.tsUrls.length) ? idx : -1;
    }

    showInfo() {
        document.getElementById('m3u8_link').value = this.url;
        document.getElementById('m3u8_response').innerHTML = this.m3u8RespHtml;
        let segsHtm = '';
        for (let j = 0; j < this.tsUrls.length; j++) {
            segsHtm += `<span class="${this.tsFiles[j] ? 'downloaded' : ''}">${j + 1}</span>`;
        }
        document.getElementById('m3u8_segments').innerHTML = segsHtm;
    }

    startDownload(isStream) {
        for (let i = 0; i < 5; i++) {
            this.downloadPart(isStream);
        }
    }

    downloadPart(isStream, index, retryNum) {
        let that = this;
        index = (index && index >= 0) ? index : that.nextIndex();
        if (index == -1) return;
        that.partStart(index);
        ajax({
            url: that.tsUrls[index],
            type: "file",
            progress(ev) {
                that.partProgress(index, ev.loaded / ev.total);
            },
            success(file) {
                file = that.decryptor.decode(index, file);
                // 异步并发
                that.downloadPart(isStream);
                // 串行
                that.setFile(index, file);
                that.partEnd(index);
                if (true === isStream) {
                    that.streamSave(index);
                } else {
                    that.serializeSave();
                }
            },
            fail() {
                if ((retryNum = retryNum || 0) < 5) {
                    that.downloadPart(isStream, index, retryNum + 1);
                }
            }
        });
    }

    partStream(idx) {
        let classList = document.getElementById('m3u8_segments').children[idx].classList;
        classList.remove('downloaded');
        classList.add('stream');
    }

    partStart(idx) {
        document.getElementById('m3u8_segments').children[idx].classList.add('downloading');
    }

    partProgress(idx, progress) {
        // document.getElementById('m3u8_segments').children[idx].style.background =
        //     `linear-gradient(to right, #1c5e4e 0%, #1c5e4e ${(progress*100).toFixed()}%, #2c4b44 0%)`;
    }

    partEnd(idx) {
        let seg = document.getElementById('m3u8_segments').children[idx];
        seg.style.background = '';
        seg.classList.remove('downloading');
        seg.classList.add('downloaded');
    }

    setFile(index, file) {
        // todo: decrypt

        this.tsFiles[index] = file;
        this.downloadCount++;
    }

    streamSave(index) {
        let file;
        if (index != this.saveIndex) return;
        for (; index < this.tsFiles.length && (file = this.tsFiles[index]); index++) {
            // todo: stream save
            // m3u8Map[id].fileWriter.write(file);
            this.partStream(index);
            this.tsFiles[index] = null;
        }
        this.saveIndex = index;
        if (this.saveIndex == this.tsUrls.length) {
            // todo finish download
        }
    }

    serializeSave() {
        if (this.downloadCount < this.tsUrls.length) return;
        let blob = new Blob(this.tsFiles, {type: 'video/MP2T'});
        let a = document.createElement('a');
        a.download = this.name;
        a.href = URL.createObjectURL(blob);
        a.click();
    }
}

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

class Mp4Handler {
    constructor(url, name) {
        this.url = url;
        this.name = name + '.mp4';
        this.type = 'mp4';
    }

    showInfo() {
        document.getElementById('m3u8_link').value = this.url;
        document.getElementById('m3u8_response').innerHTML = '';
        document.getElementById('m3u8_segments').innerHTML =
            `<iframe src="${this.url}"></iframe>`;
    }

    startDownload(retryNum) {
        let that = this;
        ajax({
            url: that.url,
            type: "file",
            progress(ev) {
                document.getElementById('m3u8_response').innerHTML =
                    `<span>${(ev.loaded / ev.total * 100).toFixed(2)}%</span>`;
            },
            success(file) {
                let blob = new Blob([file], {type: 'video/MP2T'});
                let a = document.createElement('a');
                a.download = that.name;
                a.href = URL.createObjectURL(blob);
                a.click();
            },
            fail() {
                retryNum = retryNum || 0;
                that.startDownload(retryNum + 1);
            }
        })
    }
}

class Decryptor {

    constructor(m3u8Url) {
        this.m3u8Url = m3u8Url;
        this.decode = (idx, file) => file;
        this.keyMap = {};
    }

    init(keyLine) {
        let keyMap = this.keyMap;
        keyLine.substr('#EXT-X-KEY'.length + 1).split(',').forEach(attr => {
            var sps = attr.split('=');
            keyMap[sps[0]] = ('"' == sps[1][0] ? sps[1].substr(1, sps[1].length - 2) : sps[1]) || '';
        });

        switch (keyMap.METHOD) {
            case 'AES-128': this.aes128Init(); break;
        }
    }

    aes128Init() {
        this.aesIv = this.keyMap.IV ? new TextEncoder().encode(this.keyMap.IV).buffer : null;
        let that = this;
        ajax({
            url: genPartUrl(that.keyMap.URI, new URL(that.m3u8Url)),
            type: "file",
            success(file) {
                that.decryptor = new AESDecrypt();
                that.decryptor.expandKey(file);
                that.decode = that.aes128Decode;
            }
        })
    }

    aes128Decode(idx, file) {
        let iv = this.aesIv ||
            new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, idx]).buffer;
        return this.decryptor.decryptsi(iv, file);
    }
}
