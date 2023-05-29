
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
        };
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
        this.decryptor = null;
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
                        that.decryptor = new Decryptor(that.url, line);
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
                    `<span>${(ev.loaded/ev.total*100).toFixed(2)}%</span>`;
            },
            success(file) {
                let blob = new Blob([file], { type: 'video/MP2T' });
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

    constructor(m3u8Url, keyLine) {
        this.m3u8Url = m3u8Url;
        this.decode = (idx, file) => file;
        let keyMap = this.keyMap = {};
        keyLine.substr('#EXT-X-KEY'.length+1).split(',').forEach(attr => {
            var sps = attr.split('=');
            keyMap[sps[0]] = ('"' == sps[1][0] ? sps[1].substr(1, sps[1].length-2) : sps[1]) || '';
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

class AESDecrypt {
    constructor() {
        this.rcon = [0x0, 0x1, 0x2, 0x4, 0x8, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];
        this.subMix = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
        this.invSubMix = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
        this.sBox = new Uint32Array(256);
        this.invSBox = new Uint32Array(256);

        // Changes during runtime
        this.key = new Uint32Array(0);

        this.initTable();
    }

    // Using view.getUint32() also swaps the byte order.
    uint8ArrayToUint32Array_(arrayBuffer) {
        let view = new DataView(arrayBuffer);
        let newArray = new Uint32Array(4);
        for (let i = 0; i < 4; i++) {
            newArray[i] = view.getUint32(i * 4);
        }
        return newArray;
    }

    initTable() {
        let sBox = this.sBox;
        let invSBox = this.invSBox;
        let subMix = this.subMix;
        let subMix0 = subMix[0];
        let subMix1 = subMix[1];
        let subMix2 = subMix[2];
        let subMix3 = subMix[3];
        let invSubMix = this.invSubMix;
        let invSubMix0 = invSubMix[0];
        let invSubMix1 = invSubMix[1];
        let invSubMix2 = invSubMix[2];
        let invSubMix3 = invSubMix[3];

        let d = new Uint32Array(256);
        let x = 0;
        let xi = 0;
        let i = 0;
        for (i = 0; i < 256; i++) {
            if (i < 128) {
                d[i] = i << 1;
            } else {
                d[i] = (i << 1) ^ 0x11b;
            }
        }

        for (i = 0; i < 256; i++) {
            let sx = xi ^ (xi << 1) ^ (xi << 2) ^ (xi << 3) ^ (xi << 4);
            sx = (sx >>> 8) ^ (sx & 0xff) ^ 0x63;
            sBox[x] = sx;
            invSBox[sx] = x;

            // Compute multiplication
            let x2 = d[x];
            let x4 = d[x2];
            let x8 = d[x4];

            // Compute sub/invSub bytes, mix columns tables
            let t = (d[sx] * 0x101) ^ (sx * 0x1010100);
            subMix0[x] = (t << 24) | (t >>> 8);
            subMix1[x] = (t << 16) | (t >>> 16);
            subMix2[x] = (t << 8) | (t >>> 24);
            subMix3[x] = t;

            // Compute inv sub bytes, inv mix columns tables
            t = (x8 * 0x1010101) ^ (x4 * 0x10001) ^ (x2 * 0x101) ^ (x * 0x1010100);
            invSubMix0[sx] = (t << 24) | (t >>> 8);
            invSubMix1[sx] = (t << 16) | (t >>> 16);
            invSubMix2[sx] = (t << 8) | (t >>> 24);
            invSubMix3[sx] = t;

            // Compute next counter
            if (!x) {
                x = xi = 1;
            } else {
                x = x2 ^ d[d[d[x8 ^ x2]]];
                xi ^= d[d[xi]];
            }
        }
    }

    expandKey(keyBuffer) {
        // convert keyBuffer to Uint32Array
        let key = this.uint8ArrayToUint32Array_(keyBuffer);
        let sameKey = true;
        let offset = 0;

        while (offset < key.length && sameKey) {
            sameKey = (key[offset] === this.key[offset]);
            offset++;
        }

        if (sameKey) {
            return;
        }

        this.key = key;
        let keySize = this.keySize = key.length;

        if (keySize !== 4 && keySize !== 6 && keySize !== 8) {
            throw new Error('Invalid aes key size=' + keySize);
        }

        let ksRows = this.ksRows = (keySize + 6 + 1) * 4;
        let ksRow;
        let invKsRow;

        let keySchedule = this.keySchedule = new Uint32Array(ksRows);
        let invKeySchedule = this.invKeySchedule = new Uint32Array(ksRows);
        let sbox = this.sBox;
        let rcon = this.rcon;

        let invSubMix = this.invSubMix;
        let invSubMix0 = invSubMix[0];
        let invSubMix1 = invSubMix[1];
        let invSubMix2 = invSubMix[2];
        let invSubMix3 = invSubMix[3];

        let prev;
        let t;

        for (ksRow = 0; ksRow < ksRows; ksRow++) {
            if (ksRow < keySize) {
                prev = keySchedule[ksRow] = key[ksRow];
                continue;
            }
            t = prev;

            if (ksRow % keySize === 0) {
                // Rot word
                t = (t << 8) | (t >>> 24);

                // Sub word
                t = (sbox[t >>> 24] << 24) | (sbox[(t >>> 16) & 0xff] << 16) | (sbox[(t >>> 8) & 0xff] << 8) | sbox[t & 0xff];

                // Mix Rcon
                t ^= rcon[(ksRow / keySize) | 0] << 24;
            } else if (keySize > 6 && ksRow % keySize === 4) {
                // Sub word
                t = (sbox[t >>> 24] << 24) | (sbox[(t >>> 16) & 0xff] << 16) | (sbox[(t >>> 8) & 0xff] << 8) | sbox[t & 0xff];
            }

            keySchedule[ksRow] = prev = (keySchedule[ksRow - keySize] ^ t) >>> 0;
        }

        for (invKsRow = 0; invKsRow < ksRows; invKsRow++) {
            ksRow = ksRows - invKsRow;
            if (invKsRow & 3) {
                t = keySchedule[ksRow];
            } else {
                t = keySchedule[ksRow - 4];
            }

            if (invKsRow < 4 || ksRow <= 4) {
                invKeySchedule[invKsRow] = t;
            } else {
                invKeySchedule[invKsRow] = invSubMix0[sbox[t >>> 24]] ^ invSubMix1[sbox[(t >>> 16) & 0xff]] ^ invSubMix2[sbox[(t >>> 8) & 0xff]] ^ invSubMix3[sbox[t & 0xff]];
            }

            invKeySchedule[invKsRow] = invKeySchedule[invKsRow] >>> 0;
        }
    }

    // Adding this as a method greatly improves performance.
    networkToHostOrderSwap(word) {
        return (word << 24) | ((word & 0xff00) << 8) | ((word & 0xff0000) >> 8) | (word >>> 24);
    }

    decrypt(inputArrayBuffer, offset, aesIV, removePKCS7Padding) {
        let nRounds = this.keySize + 6;
        let invKeySchedule = this.invKeySchedule;
        let invSBOX = this.invSBox;

        let invSubMix = this.invSubMix;
        let invSubMix0 = invSubMix[0];
        let invSubMix1 = invSubMix[1];
        let invSubMix2 = invSubMix[2];
        let invSubMix3 = invSubMix[3];

        let initVector = this.uint8ArrayToUint32Array_(aesIV);
        let initVector0 = initVector[0];
        let initVector1 = initVector[1];
        let initVector2 = initVector[2];
        let initVector3 = initVector[3];

        let inputInt32 = new Int32Array(inputArrayBuffer);
        let outputInt32 = new Int32Array(inputInt32.length);

        let t0, t1, t2, t3;
        let s0, s1, s2, s3;
        let inputWords0, inputWords1, inputWords2, inputWords3;

        let ksRow, i;
        let swapWord = this.networkToHostOrderSwap;

        while (offset < inputInt32.length) {
            inputWords0 = swapWord(inputInt32[offset]);
            inputWords1 = swapWord(inputInt32[offset + 1]);
            inputWords2 = swapWord(inputInt32[offset + 2]);
            inputWords3 = swapWord(inputInt32[offset + 3]);

            s0 = inputWords0 ^ invKeySchedule[0];
            s1 = inputWords3 ^ invKeySchedule[1];
            s2 = inputWords2 ^ invKeySchedule[2];
            s3 = inputWords1 ^ invKeySchedule[3];

            ksRow = 4;

            // Iterate through the rounds of decryption
            for (i = 1; i < nRounds; i++) {
                t0 = invSubMix0[s0 >>> 24] ^ invSubMix1[(s1 >> 16) & 0xff] ^ invSubMix2[(s2 >> 8) & 0xff] ^ invSubMix3[s3 & 0xff] ^ invKeySchedule[ksRow];
                t1 = invSubMix0[s1 >>> 24] ^ invSubMix1[(s2 >> 16) & 0xff] ^ invSubMix2[(s3 >> 8) & 0xff] ^ invSubMix3[s0 & 0xff] ^ invKeySchedule[ksRow + 1];
                t2 = invSubMix0[s2 >>> 24] ^ invSubMix1[(s3 >> 16) & 0xff] ^ invSubMix2[(s0 >> 8) & 0xff] ^ invSubMix3[s1 & 0xff] ^ invKeySchedule[ksRow + 2];
                t3 = invSubMix0[s3 >>> 24] ^ invSubMix1[(s0 >> 16) & 0xff] ^ invSubMix2[(s1 >> 8) & 0xff] ^ invSubMix3[s2 & 0xff] ^ invKeySchedule[ksRow + 3];
                // Update state
                s0 = t0;
                s1 = t1;
                s2 = t2;
                s3 = t3;

                ksRow = ksRow + 4;
            }

            // Shift rows, sub bytes, add round key
            t0 = ((invSBOX[s0 >>> 24] << 24) ^ (invSBOX[(s1 >> 16) & 0xff] << 16) ^ (invSBOX[(s2 >> 8) & 0xff] << 8) ^ invSBOX[s3 & 0xff]) ^ invKeySchedule[ksRow];
            t1 = ((invSBOX[s1 >>> 24] << 24) ^ (invSBOX[(s2 >> 16) & 0xff] << 16) ^ (invSBOX[(s3 >> 8) & 0xff] << 8) ^ invSBOX[s0 & 0xff]) ^ invKeySchedule[ksRow + 1];
            t2 = ((invSBOX[s2 >>> 24] << 24) ^ (invSBOX[(s3 >> 16) & 0xff] << 16) ^ (invSBOX[(s0 >> 8) & 0xff] << 8) ^ invSBOX[s1 & 0xff]) ^ invKeySchedule[ksRow + 2];
            t3 = ((invSBOX[s3 >>> 24] << 24) ^ (invSBOX[(s0 >> 16) & 0xff] << 16) ^ (invSBOX[(s1 >> 8) & 0xff] << 8) ^ invSBOX[s2 & 0xff]) ^ invKeySchedule[ksRow + 3];
            ksRow = ksRow + 3;

            // Write
            outputInt32[offset] = swapWord(t0 ^ initVector0);
            outputInt32[offset + 1] = swapWord(t3 ^ initVector1);
            outputInt32[offset + 2] = swapWord(t2 ^ initVector2);
            outputInt32[offset + 3] = swapWord(t1 ^ initVector3);

            // reset initVector to last 4 unsigned int
            initVector0 = inputWords0;
            initVector1 = inputWords1;
            initVector2 = inputWords2;
            initVector3 = inputWords3;

            offset = offset + 4;
        }

        return removePKCS7Padding ? this.removePadding(outputInt32.buffer) : outputInt32.buffer;
    }

    decryptsi(iv, inputArrayBuffer) {
        return this.decrypt(inputArrayBuffer, 0, iv, true);
    }

    removePadding(buffer) {
        const outputBytes = buffer.byteLength;
        const paddingBytes = outputBytes && (new DataView(buffer)).getUint8(outputBytes - 1);
        if (paddingBytes) {
            return buffer.slice(0, outputBytes - paddingBytes);
        } else {
            return buffer;
        }
    }

    destroy() {
        this.key = undefined;
        this.keySize = undefined;
        this.ksRows = undefined;

        this.sBox = undefined;
        this.invSBox = undefined;
        this.subMix = undefined;
        this.invSubMix = undefined;
        this.keySchedule = undefined;
        this.invKeySchedule = undefined;

        this.rcon = undefined;
    }
}