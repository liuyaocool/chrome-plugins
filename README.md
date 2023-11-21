# 插件列表

- chrome-m3u8: m3u8视频下载
- chrome-postman: 发送http请求
- chrome-proxy: 代理
- chrome-translate: 划词翻译
- chrome-work: 工作相关-仅供个人

# 安装说明

1. 打开chrome插件管理页: chrome://extensions/
2. 右上角 开启开发模式(Developer mode)
3. 加载已解压的扩展程序(Load unpacked)
4. 选择插件路径, 例chrome-proxy


# firefox插件安装说明

打包插件需在manifest.json中添加配置

```json
"browser_specific_settings": {
    "gecko": {
        "id": "pluginname:61linux.com",
        "strict_min_version": "54.0"
    }
},
```

步骤：

1. 进入插件目录(manifest.json 同级), 执行 `zip -r -FS work.zip *`
2. 非开发版firefox需要提交插件市场校验
3. 开发版firefox
    1. 浏览器打开 `about:config`
    2. 设置 `xpinstall.signatures.required=false`
    3. 安装本地插件 *.zip