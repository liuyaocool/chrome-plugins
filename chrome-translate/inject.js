document.onmouseup = function (e) {
    translate();
}

let divId = 'ly_translate_en2ch';
(() => {
    var div = document.createElement('div');
    div.id = divId;
    document.body.append(div);
})()

for (let i = 0; i < 0; i++) {
    document.getElementById(divId).innerHTML += `
<div id="1695101791448479">
        <div class="ly_trnslate_src">样式</div>
        <div class="ly_trnslate_ret">
        <p>style</p>
        <p>noun:<span>style</span><span>pattern</span><span>form</span><span>type</span></p>
        <p></p>
        </div>
        <span class="ly_trnslate_close">
            关闭(<span id="1695101791448479_tim">1</span>s)
        </span>
    </div>
        <div id="aaaa_${i}">
            <div class="ly_trnslate_src">this is page</div>
            <div class="ly_trnslate_ret"><p>result</p><p>noun:<span>result</span><span>outcome</span><span>consequence</span><span>effect</span><span>consequent</span><span>upshot</span><span>payoff</span><span>sequel</span><span>educt</span><span>bottom line</span><span>event</span></p><p>verb:<span>slay</span><span>finish off</span><span>kill</span></p><p><span>Results</span></p></div>
            <span class="ly_trnslate_close">关闭(5s)</span>
        </div>
        <div id="bbbb_${i}">
            <div class="ly_trnslate_src">this is page</div>
            <div class="ly_trnslate_ret"><p>车轮</p><p>noun:<span>轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮轮</span><span>车轮</span><span>轮子</span><span>毂</span><span>轱</span></p><p>verb:<span>盘旋</span><span>翔</span></p><p><span>推</span></p></div>
            <span class="ly_trnslate_close">关闭(5s)</span>
        </div>
`;
}

// <need, {tim:,id:,}>
const ING = {};

function addBox(src) {
    ING[src] = { id: uuid(), tim: 5, leave: false }
    let addDiv = document.createElement('div');
    addDiv.id = ING[src].id;
    addDiv.innerHTML = `
        <div class="ly_trnslate_src">${src}</div>
        <div class="ly_trnslate_ret"></div>
        <span class="ly_trnslate_close">
            关闭(<span id="${ING[src].id}_tim">${ING[src].tim}</span>s)
        </span>
    `;
    addDiv.querySelector('span').onclick = e => rmv(src);
    addDiv.onmouseover = e => ING[src].leave = true;
    addDiv.onmouseleave = e => ING[src].leave = false;
    let divDom = document.getElementById(divId);
    divDom.insertBefore(addDiv, divDom.firstChild);
}

function fillBox(src, transHtml) {
    let addDiv = document.getElementById(ING[src].id);
    if (!addDiv) return;
    addDiv.children[1].innerHTML = transHtml;
    addDiv.style.height = addDiv.clientHeight + 'px';
    if (!ING[src].intv) ING[src].intv = setInterval(() => {
        if (ING[src].leave) return;
        if (ING[src].tim == 1) {
            rmv(src);
        } else {
            let a = document.getElementById(ING[src].id+'_tim');
            if (a) a.innerText = --ING[src].tim;
        }
    }, 1000);
}

function rmv(src) {
    if (!ING[src]) return ;
    clearInterval(ING[src].intv);
    let resDiv = document.getElementById(ING[src].id);
    delete ING[src];
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

function translate(e) {
    let src = document.getSelection().toString();
    if (!src || !src.trim()) return;
    src = src.trim();
    if (ING[src]) {
        buling(ING[src].id);
        ING[src].tim = 6;
        return;
    }

    addBox(src);
    enToChGoogle(src);
}

function enToChGoogle(str) {
    let lan = getLanguage(str);
    switch (lan) {
        case 'en': lan = 'en'; break;
        case 'ch': lan = 'zh-CN'; break;
        default: fillBox(str, '未选中 中文或英文'); return;
    }
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            let trans;
            if (xhr.status >= 200 && xhr.status < 300) {
                let res = JSON.parse(xhr.response);
                let word = res.sentences[0].trans, a = [word];
                trans = `<p>${word}</p>`;
                let list = res.dict;
                if (list && list.length > 0) {
                    for (let i = 0; i < list.length; i++) {
                        trans += `<p>${list[i].pos}:`;
                        for (let j = 0; j < list[i].entry.length; j++) {
                            trans += `<span>${word = list[i].entry[j].word}</span>`;
                            a.push(word);
                        }
                        trans += '</p>';
                    }
                }
                if ((list = res.alternative_translations) && list.length > 0) {
                    for (let i = 0; i < list.length; i++) {
                        trans += `<p>`;
                        for (let j = 0; j < list[i].alternative.length; j++) {
                            word = list[i].alternative[j].word_postproc;
                            if (a.indexOf(word) >= 0) continue;
                            trans += `<span>${word}</span>`
                            a.push(word);
                        }
                        trans += '</p>';
                    }
                }
            } else {
                trans = xhr.response;
            }
            fillBox(str, trans);
        }
    };
    // `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lan}&dj=1&dt=t&dt=bd&dt=qc&dt=rm&dt=ex&dt=at&dt=ss&dt=rw&dt=ld&q=${str}&tk=702621.702621`
    xhr.open("GET",
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lan}&dj=1&dt=t&dt=bd&dt=qc&dt=rm&dt=ex&dt=at&dt=ss&dt=rw&dt=ld&q=${str}&tk=389519.389519`,
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

function getLanguage(str) {
    const lanPat = {
        en: [/^[a-zA-Z]+$/, 'ch'],
        ch: [/[\u4e00-\u9fa5]/, 'en']
    };
    for (let i = 0; i < str.length; i++)
        for (let lan in lanPat)
            if (lanPat[lan][0].test(str.charAt(i)))
                return lanPat[lan][1];
    return '';
}