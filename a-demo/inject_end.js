
(() => {
    var div = document.createElement('textarea');
    div.id = divId;
    document.body.append(div);
    for (let i = 0; i < urls.length; i++) {
        addUrl(urls[i]);
    }
})();