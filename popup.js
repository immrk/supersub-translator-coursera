// 监听与点击事件函数
document.addEventListener(
  "DOMContentLoaded",
  function () {
    // 获取上次使用数据
    setStorage();
    // 获取页面字幕存在语言类型
    getlanginfo();
    // 翻译点击事件函数
    var translatecheckButton = document.getElementById("translateBtn");
    translatecheckButton.addEventListener(
      "click",
      function () {
        // 获取原始字幕语言
        var sublang = document.getElementById("sublang").value;
        // 获取翻译目标语言
        var lang = document.getElementById("lang").value;
        // 将目标语言存入插件缓存
        localStorage.setItem('lang', lang);
        // 获取翻译服务选项
        var service = document.getElementById("service").value;
        // 选择框信息存入浏览器缓存(非插件缓存)
        chrome.storage.sync.set({ sublang: sublang, lang: lang, service: service }, function () {
          console.log(sublang + " is set to " + lang);
        });
        // 向content发送翻译请求
        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              { method: "translate" },
              function (response) {
                if (response.method == "translate") {
                }
              }
            );
          }
        );
      },
      false
    );
    // 字幕调整点击函数
    var subtitlesetcheckButton = document.getElementById("subtitleBtn");
    subtitlesetcheckButton.addEventListener(
      "click",
      function () {
        // 获取字幕缩放比例
        var zoompercent = document.getElementById("zoompercent").value;
        // 获取字幕透明度
        var opacity = document.getElementById("opacity").value;
        // 将数据存入插件缓存用于下次调用
        localStorage.setItem('zoompercent', zoompercent);
        localStorage.setItem('opacity', opacity);
        // 将数据存入浏览器缓存，用于background.js调用
        chrome.storage.sync.set({ zoompercent: zoompercent, opacity: opacity });
        subtitlerequest(zoompercent, opacity)
      },
      false
    );

  },
  false
);

// 缓存信息获取、显示 函数
function setStorage() {
  // 字幕目标语言获取
  var lang = localStorage.getItem("lang");
  // 字幕缩放比例获取
  var zoompercent = localStorage.getItem("zoompercent");
  // 字幕透明度比例获取
  var opacity = localStorage.getItem("opacity");
  // 无缓存默认值
  if (!lang) {
    var lang = "zh-CN";
  };
  if (!zoompercent) {
    var zoompercent = "100%";
  };
  if (!opacity) {
    var opacity = "100%";
  }
  // 缓存数据显示
  const langselectBox = document.getElementById('lang');
  const zoompercentselectBox = document.getElementById('zoompercent');
  const opacityselectBox = document.getElementById('opacity');
  langselectBox.value = lang;
  zoompercentselectBox.value = zoompercent;
  opacityselectBox.value = opacity;

}

// 页面字幕语言类型获取 函数
function getlanginfo() {
  // 获取页面字幕语言类型
  chrome.tabs.query(
    { active: true, currentWindow: true },
    function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { method: "getSubtitleLanguages" },
        function (response) {
          if (response) {
            // 处理字幕语言数据
            console.log('字幕语言类型:', response.languages);
            // 获取选择器元素
            var sublangSelect = document.getElementById("sublang");
            // 获取到的语言种类信息
            var languageOptions = response.languages;
            // 对语言类型进行排序，若存在英语字幕则默认选择英语
            var englishIndex = languageOptions.findIndex(function (option) {
              return option.label === 'English';
            });
            if (englishIndex !== -1) {
              var englishOption = languageOptions.splice(englishIndex, 1)[0];
              languageOptions.unshift(englishOption);
            }
            // 清空选择器中的现有选项
            sublangSelect.innerHTML = "";
            // 添加新的选项
            languageOptions.forEach(function (language) {
              var option = document.createElement("option");
              option.value = language.srclang; // 设置选项的值
              option.text = language.label; // 设置选项的显示文本
              sublangSelect.appendChild(option); // 将选项添加到选择器中
            });
          }
        }
      );
    }
  );
}

// 字幕样式修改请求 函数
function subtitlerequest(zoompercent, opacity) {
  // 自动修改视频字幕比例
  chrome.tabs.query(
    { active: true, currentWindow: true },
    function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { method: "adjustSubtitle", zoompercent: zoompercent, opacity: opacity },
        function (response) {
          if (response) { }
        }
      );
    }
  );
}
