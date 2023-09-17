document.onmouseup = function () {
    translate(document.getSelection().toString());
}

let divId = 'ly_translate_en2ch';
(() => {
    var div = document.createElement('div');
    div.id = divId;
    document.body.append(div);
})()

document.getElementById(divId).innerHTML += `
<div id="aa" class="ly_translate_en2ch_show">
    <div>this is page</div>
    <div>这是一个页面</div>
    <span>关闭(5s)</span>
</div>
<div class="ly_translate_en2ch_show">
    <div>this is page</div>
    <div>这是一个页面</div>
    <span>关闭(5s)</span>
</div>`;

function appendResult(src, trans) {
    let id = uuid(), tim = 5;
    let addDiv = document.createElement('div');
    addDiv.id = id;
    addDiv.classList.add('ly_translate_en2ch_show');
    addDiv.innerHTML = `
        <div>${src}</div>
        <div>${trans}</div>
        <span>关闭(<span id="${id}_tim">${tim}</span>s)</span>
    `;
    addDiv.querySelector('span').onclick = e => document.getElementById(id).remove();
    let divDom = document.getElementById(divId);
    divDom.insertBefore(addDiv, divDom.firstChild);
    addDiv.style.height = addDiv.clientHeight + 'px';
    const intv = setInterval(() => {
        if (tim == 1) {
            clearInterval(intv);
            rmv(id);
        } else {
            let a = document.getElementById(id+'_tim');
            if (a) a.innerText = --tim;
        }
    }, 1000);
}

function rmv(id) {
    let resDiv = document.getElementById(id);
    if (!resDiv) return;
    let timout = 500, bzr = '0.09, -0.41, 0.98, -0.01';
    if (resDiv.nextElementSibling) {
        // 非最后一个
        resDiv.style.transition = `all ${timout}ms cubic-bezier(${bzr})`;
        // resDiv.style.transform = 'scale(0)';
        resDiv.style['margin-bottom'] = 0;
        resDiv.style.height = 0;
        resDiv.style.opacity = 0;
    } else {
        // 最后一个
        resDiv.style.transition = `all ${timout}ms cubic-bezier(0.47, 0, 0.745, 0.715)`;
        resDiv.style.opacity = 0;
    }
    setTimeout(() => resDiv.remove(), timout*1.5);
}

function translate(str) {
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
                let trans = res.sentences[0].trans;
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

// 生成一个随机ID，使用时间戳和随机数
function uuid() {
    return `${new Date().getTime()}${Math.floor(Math.random() * 10000)}`;
}