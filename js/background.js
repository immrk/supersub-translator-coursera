// 页面加载时,执行来自content.js的响应，从chrome缓存获取数据并反馈
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.method === "autosubstyle") {
    // 从插件缓存中获取数据
    chrome.storage.sync.get(["zoompercent", "opacity"], function (data) {
      var zoompercent = data.zoompercent;
      var opacity = data.opacity;
      // 将缓存数据作为响应发送回content script
      sendResponse({ zoompercent: zoompercent, opacity: opacity });
    });
    return true;
  }
});