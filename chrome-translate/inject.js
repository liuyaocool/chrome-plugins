document.onmouseup = function (e) {
    translate(document.getSelection().toString());
}

let divId = 'ly_translate_en2ch';
(() => {
    var div = document.createElement('div');
    div.id = divId;
    document.body.append(div);
})()

for (let i = 0; i < 0; i++) {
    document.getElementById(divId).innerHTML += `
        <div class="ly_translate_en2ch_show">
            <div>this is page</div>
            <div>
                <p>这是一个页面</p>
                <p>sss: 这是一个页面</p>
                <p>这是一个页面</p>
            </div>
            <span>关闭(5s)</span>
        </div>`;
}

// <need, {tim:,id:,}>
const ING = {};

function appendResult(src, trans) {
    if (ING[src]) {
        buling(ING[src].id);
        ING[src].tim = 6;
        return;
    }
    ING[src] = { id: uuid(), tim: 5, leave: false }
    let addDiv = document.createElement('div');
    addDiv.id = ING[src].id;
    addDiv.classList.add('ly_translate_en2ch_show');
    addDiv.innerHTML = `
        <div>${src}</div>
        <div>${trans}</div>
        <span>关闭(<span id="${ING[src].id}_tim">${ING[src].tim}</span>s)</span>
    `;
    addDiv.querySelector('span').onclick = e => rmv(src);
    addDiv.onmouseover = e => ING[src].leave = true;
    addDiv.onmouseleave = e => ING[src].leave = false;
    let divDom = document.getElementById(divId);
    divDom.insertBefore(addDiv, divDom.firstChild);
    addDiv.style.height = addDiv.clientHeight + 'px';
    const intv = setInterval(() => {
        if (ING[src].leave) return;
        if (ING[src].tim == 1) {
            clearInterval(intv);
            rmv(src);
        } else {
            let a = document.getElementById(ING[src].id+'_tim');
            if (a) a.innerText = --ING[src].tim;
        }
    }, 1000);
}

function rmv(src) {
    let resDiv = document.getElementById(ING[src].id);
    ING[src] = null;
    if (!resDiv) return;
    let timout = 500;
    if (resDiv.nextElementSibling) {
        // 非最后一个
        resDiv.style.transition = `all ${timout}ms cubic-bezier(0.19, 1, 0.22, 1)`;
        resDiv.style['margin-bottom'] = 0;
        resDiv.style.height = 0;
        resDiv.style.opacity = 0;
    } else {
        // 最后一个
        resDiv.style.transition = `all ${timout}ms cubic-bezier(0.6, 0.04, 0.98, 0.335)`;
        resDiv.style.opacity = 0;
    }
    setTimeout(() => resDiv.remove(), timout*1.5);
}

function translate(str) {
    // todo str anaylize
    enToChGoogle(str);
}

function enToChGoogle(str) {
    if (!str || !str.trim()) return;
    str = str.trim();
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
                let res = JSON.parse(xhr.response);
                let trans = `<p>${res.sentences[0].trans}</p>`;
                let list = res.dict;
                if (list && list.length > 0) {
                    for (let i = 0; i < list.length; i++) {
                        trans += `<p>${list[i].pos}:`;
                        for (let j = 0; j < list[i].entry.length; j++) {
                            trans += `${list[i].entry[j].word}, `;
                        }
                        trans += '</p>';
                    }
                }
                if ((list = res.alternative_translations) && list.length > 0) {
                    for (let i = 0; i < list.length; i++) {
                        trans += `<p>`;
                        for (let j = 0; j < list[i].alternative.length; j++) {
                            trans += `${list[i].alternative[j].word_postproc}, `
                        }
                    }
                }
                appendResult(str, trans);
            } else {
                alert("err");
            }
        }
    };
    xhr.open("GET",
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dj=1&dt=t&dt=bd&dt=qc&dt=rm&dt=ex&dt=at&dt=ss&dt=rw&dt=ld&q=${str}&tk=389519.389519`,
        true);
    xhr.send(null);
}

function buling(id) {
    let classList = document.getElementById(id).classList;
    classList.add('buling');
    setTimeout(() => classList.remove('buling'), 500);
}

// 生成一个随机ID，使用时间戳和随机数
function uuid() {
    return `${new Date().getTime()}${Math.floor(Math.random() * 10000)}`;
}