class M3u8Handler {
    constructor(url, name) {
        this.url = url;
        this.name = name + '.ts';
        this.type = 'm3u8';
        this.class = 'ly-m3u8-m3u8';
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
    }

    init() {
        let that = this;
        ajax({
            url: that.url,
            success: m3u8Str => {
                if (!m3u8Str) return;
                that.handler(m3u8Str);
            }
        });
        // that.fileWriter = streamSaver.createWriteStream(m3u8Map[id].name, {
        //     size: undefined, // (optional filesize) Will show progress
        //     writableStrategy: undefined, // (optional)
        //     readableStrategy: undefined  // (optional)
        // }).getWriter();
        return that;
    }

    handler(m3u8Str) {
        let m3u8URL = new URL(this.url), i = 1, tdHtm, tsUrls = [], respHtm = '<table>';
        // 提取 ts 视频片段地址
        m3u8Str.split('\n').forEach(line => {
            if (line.startsWith('#EXT-X-KEY')) {
                this.decryptor.init(line);
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
        this.m3u8RespHtml = respHtm + '</table>';
        this.tsUrls = tsUrls;
        return this;
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

class Mp4Handler {
    constructor(url, name) {
        this.url = url;
        this.name = name + '.mp4';
        this.type = 'mp4';
        this.class = 'ly-m3u8-mp4';
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


class DemoHandler {
    constructor(url, name) {
        this.type = 'demo';
    }
    showInfo() {}
    startDownload(retryNum) {}
}
