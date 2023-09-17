document.onselectionchange = function () {
    enToCh(document.getSelection().toString());
}

let div = document.createElement('div');
div.id = 'ly_translate_en2ch';

div.innerHTML = `
<div id="aa" class="ly_translate_en2ch_show">
    <div class="ly_translate_en2ch_show_text">this is page</div>
    <hr>
    <div class="ly_translate_en2ch_show_result">这是一个页面</div>
</div>
`;


document.body.append(div);

function enToCh(str) {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
                console.log(xhr.response);
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