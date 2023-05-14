# chrome

## 开发文档

https://developer.chrome.com/docs/extensions/mv3/manifest/

## 配置文件

```json
{
  "manifest_version": 3,
  "name": "插件demo",
  "version": "1.0",
  "description": "入门学习用",
  // "default_locale": "zh_CN",
  "icons": {
    "16": "img/icon16.png",
    "32": "img/icon32.png",
    "48": "img/icon48.png",
    "128": "img/icon128.png"
  },

  //key，发布插件后会给一个key，把那个key的值放这里
  // "key": "xxx",

  // 插件右键 点击options 弹出的页面
  "options_page": "options.html",

  /*
    background script
    常驻在浏览器后台Service Workers运行, 没有实际页面.
    扩展程序管理界面插件的那个“背景页”变成“Service Worker”，
    一般把全局的、需要一直运行的代码放在这里. 
    重要的是, background script 的权限非常高, 除了可以调用几乎所有Chrome Extension API外, 还可以发起跨域请求
    
    改动之后background.js将和浏览器完全分离，即无法调用window和ducoment对象
   */
   "background": {
    // "type": "module",
    "service_worker": "background.js"
  },

  /*
    动作API
    配置上action:{}，可以是空对象，但是action这个配置得有，不然的话扩展程序管理界面的“Service Worker”将显示无效，
    且无法点开“Service Worker”的开发者工具控制台以及点击插件图标时触发的这个方法会报错：chrome.action.onClicked.addListener，
    
    default_popup: 弹出的页面
    default_icon: 浏览器插件按钮的图标
    default_title: 浏览器插件按钮hover显示文字
   */
   "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "img/icon16.png",
      "32": "img/icon32.png",
      "48": "img/icon48.png",
      "128": "img/icon128.png"
    },
    "default_title": "popup page"
  },

  /*
    content_script: js隔离, css不隔离
    注入到目标页面中执行的js脚本, 可以获取目标页面的Dom并进行修改

    matches: 
      ["http://foo.com/bar/*", "https://foobar.com/bar/*"]
      "<all_urls>": 匹配所有
    run_at:
      "document_start": 使用到了onload
      "document_end"
      "document_idle": 默认，不对原页面的加载速度产生影响    
    exclude_matches: 不允许注入js脚本文件的指定页面
   */
   "content_scripts": [
    {
      "css": [],
      "run_at": "document_end",
      "js":["content_scripts.js"],
      // "exclude_matches": ["https://*.xxx.com/*"],
      "matches":["<all_urls>"]
    }
  ],
  
  //API权限，需要使用某些API时需要设置该API权限才行
  "permissions": [
    "activeTab",
    "declarativeContent",
    "contextMenus", //自定义创建右键菜单API
    "tabs", //tab选项卡API
    "storage", //缓存API
    "webRequest" //监听浏览器请求API
    // ...
  ],

  // 内容安全政策
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'",
    "sandbox": "sandbox allow-scripts; script-src 'self'; object-src 'self'"
  },

  /**
    如果向目标页面插入图片或者js，需要在这里授权插件本地资源    
    resources: 允许访问的资源路径，数组传多个参数
    matches: 允许访问资源的页面
      "<all_urls>": 匹配所有
   */
  "web_accessible_resources": [
    {
      "resources": ["*/img/xxx.png", "*/img/xxx2.png"],
      "matches": [ "https://*.csdn.net/*", "https://*.xxx.com/*"]
    }
  ],

  //主机权限，在背景页backgroud.js里面或者popup页面走请求时, 请求域名的白名单权限，如果没添加的则请求会失败
  "host_permissions": [
    "https://*.csdn.net/*",
    "https://*.xxx.com/*"
  ]
} 
```

# firefox

## 开发文档
https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension

## 文件说明

### manifest.json

```json
{
    "manifest_version": 2,
    "name": "插件名称",
    "version": "1.0",
    "description": "插件描述",
    "icons": {
        "48": "img/icon48.png",
        "96": "img/icon96.png"
    },
    "browser_action": {
        "browser_style": true,
        "default_area": "navbar",
        "default_icon": {
            "16": "img/logo16.png",
            "32": "img/logo32.png"
        },
        "default_title": "鼠标hover提示",
        "default_popup": "popup.html"
    },
    // 注入页面的脚本
    "content_scripts": [
        {
            // 同时注入所有子页面中(<iframe></iframe>)
            "all_frames": true,
            // document_start document_end
            "run_at": "document_idle",
            "matches": ["<all_urls>", "*://*.mozilla.org/*"],
            "js": ["js/inject.js"],
            "css": ["css/inject.css"]
        }
    ],
    "background": {
        "page" : "background.html",
        "scripts": ["js/background.js"]
    },
    // 权限
    "permissions": [
        "activeTab",
        "declarativeContent",
        "scripting",
        "contextMenus", //自定义创建右键菜单API
        "tabs", //tab选项卡API
        "storage", //缓存API
        "webRequest" //监听浏览器请求API
        // ...
    ]
}
```

## 方法

