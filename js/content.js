// 定义字幕信息获取函数-获取该页面视频具有几种语言字幕(用于插件 字幕语言 选择)
async function getSubtitleLanguages(sendResponse) {
    let tracks = document.getElementsByTagName("track"); // 获取字幕信息
    let langnamelist = []; // 设置字幕语言名称列表
    if (tracks.length) {
        for (let i = 0; i < tracks.length; i++) {
            // 将语言名称增添到名称列表内
            langnamelist.push({ srclang: tracks[i].srclang, label: tracks[i].label });
        }
    }
    sendResponse({ languages: langnamelist });
}

// 定义 双语字幕 打开函数(字幕翻译主函数)
async function openBilingual() {
    const result = await getStorageData(["sublang", "lang"]);
    console.log("Translate ", result.sublang, " to ", result.lang);
    // 从网页获取所包含字幕信息
    let tracks = document.getElementsByTagName("track"); // 获取字幕信息
    // 赋值翻译后的文本列
    let googletranslatedList = [];
    // 将对应语言字幕数据赋值为 sub
    let sub // 原始字幕信息
    if (tracks.length) {
        for (let i = 0; i < tracks.length; i++) {
            if (tracks[i].srclang === result.sublang) {
                sub = tracks[i];
                // 显示该字幕信息(提取打开对应字幕，否则无法获取字幕信息)
                sub.track.mode = "showing";
            } else {
                // 关闭其余语言字幕
                tracks[i].track.mode = "disabled"
            }
        }
    };
    if (sub) {
        let cues = sub.track.cues;
        // 通过循环保证字幕数据已完全读取
        while (cues.length <= 0) {
            await sleep(500) // 休眠500ms
            cues = sub.track.cues;
        }
        console.log("cueslength:", cues.length)
        // 调用字幕文本句子划分函数
        var [sentencelist, endSentence] = getTexts(cues);
        for (let i = 0; i < sentencelist.length; i++) {
            // 该函数为异步函数，故需要增加promise，以保证异步操作执行完成，使googletranslatedList正确获得值；
            await new Promise((resolve) => {
                getTranslation_google(sentencelist[i], result.sublang, result.lang, (translatedText) => {
                    var translatedList = translatedText.split("/n/n");
                    translatedList.splice(-1, 1);
                    for (let i = 0; i < translatedList.length; i++) {
                        googletranslatedList.push(translatedList[i]);
                    }
                    resolve();
                });
            });
        };
        console.log(googletranslatedList);
        console.log(googletranslatedList.length);
        // 将翻译结果注入字幕中
        for (let i = 0; i < googletranslatedList.length; i++) {
            if (i != 0) {
                for (let j = endSentence[i - 1] + 1; j <= endSentence[i]; j++) {
                    // 获取原始英文字幕的与译文拼接并加入换行符,去除标识符
                    let originalText = cues[j].text;
                    cues[j].text = originalText.replace('/n/n', '') + '\n' + googletranslatedList[i];
                }
            } else {
                for (let j = 0; j <= endSentence[i]; j++) {
                    // 获取原始英文字幕的与译文拼接并加入换行符，去除标识符
                    let originalText = cues[j].text;
                    cues[j].text = originalText.replace('/n/n', '') + '\n' + googletranslatedList[i];
                }
            }
        }
    }
}

// 定义字符替换函数
String.prototype.replaceAt = function (index, replacement) {
    return (
        this.substr(0, index) +
        replacement +
        this.substr(index + replacement.length)
    );
};

// 从浏览器存储中提取所存储的 原始字幕语言 与 翻译目标语言 函数
async function getStorageData(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(keys, function (result) {
            resolve(result);
        });
    });
}

// 获取原始字幕(并划分句子，打赏标签)
function getTexts(cues) {
    // 各句尾打上标签并记录序号
    let cuesText = '';
    // 整句判断,通过字符.!?判断句子最后一位，来划分句子
    let endSentence = [];
    let cuesTextList = [];
    let sentencelist = [];
    for (let i = 0; i < cues.length; i++) {
        // console.log(cues[i].text)
        // 通过字符].!?判断句子最后一位，来划分句子
        if (cues[i].text[cues[i].text.length - 1] == ".") {
            cues[i].text = cues[i].text.replaceAt(cues[i].text.length - 1, "./n/n");
            endSentence.push(i);
        } else if (cues[i].text[cues[i].text.length - 1] == "?") {
            cues[i].text = cues[i].text.replaceAt(cues[i].text.length - 1, "?/n/n");
            endSentence.push(i);
        } else if (cues[i].text[cues[i].text.length - 1] == "!") {
            cues[i].text = cues[i].text.replaceAt(cues[i].text.length - 1, "!/n/n");
            endSentence.push(i);
        }
        // 去除换行符
        // cuesTextList += cues[i].text.replace(/\n/g, " ") + " ";
        cuesText += cues[i].text.replace(/(?<!\n)\n(?!\n)/g, ""); // 匹配除了两个连续换行符之外的所有单个换行符
    }
    // google翻译api单词翻译最多支持5000字符，故调用分割函数进行划分
    // 将文本划分成整句，并保留标识符
    cuesTextList = cuesText.split("/n/n");
    for (let i = 0; i < cuesTextList.length - 1; i++) {
        cuesTextList[i] = cuesTextList[i] + "/n/n"
    }
    cuesTextList.splice(-1, 1); // 移除数组的最后一个元素(因为最后一句末也有一个标识符)
    // 将每5000个字符的整句划分为一串文本用于翻译
    for (let i = 0; i < cuesTextList.length; i++) {
        if (sentencelist.length > 0 && sentencelist[sentencelist.length - 1].length + cuesTextList[i].length < 5000) {
            sentencelist[sentencelist.length - 1] += cuesTextList[i];
        } else {
            sentencelist.push(cuesTextList[i])
        }
    }
    // console.log(cuesText)
    console.log(cuesTextList)
    console.log(sentencelist)
    console.log(endSentence)
    return [sentencelist, endSentence];
}

// 谷歌翻译API调用函数
function getTranslation_google(words, sublang, lang, callback) {
    const xhr = new XMLHttpRequest();
    let url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sublang}&tl=${lang}&dt=t&q=${encodeURI(
        words
    )}`;
    xhr.open("GET", url, true);
    xhr.responseType = "text";
    xhr.onload = function () {
        if (xhr.readyState === xhr.DONE) {
            if (xhr.status === 200 || xhr.status === 304) {
                const translatedList = JSON.parse(xhr.responseText)[0];
                let translatedText = "";
                for (let i = 0; i < translatedList.length; i++) {
                    translatedText += translatedList[i][0];
                }
                callback(translatedText);
            }
        }
    };
    xhr.send();
}

// 有道翻译API调用函数
function getTranslation_youdao(words, sublang, lang, callback) {

}

// 暂停函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 字幕修改函数
function adjustSubtitle(zoompercent, opacity) {
    console.log("subtitle zoom%:", zoompercent)
    // 创建一个 <style> 元素并设置样式规则
    var styleElement = document.createElement("style");
    styleElement.innerHTML = `video::-webkit-media-text-track-display { font-size: ${zoompercent}; opacity: ${opacity};}`;
    console.log("new style:", styleElement)
    // 将 <style> 元素插入到 <head> 中
    document.head.appendChild(styleElement);
}


// 设置监听，监听来自popup.js的请求并返回值，如果接收到请求，判断请求执行不同函数
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // 如果请求函数为翻译，则执行双语翻译函数
    if (request.method == "translate") {
        openBilingual();
    };
    // 如果请求函数为获取字幕语言类型，则发送字幕语言类型给插件页面
    if (request.method == "getSubtitleLanguages") {
        getSubtitleLanguages(sendResponse);
        return true;
    };
    if (request.method === "adjustSubtitle") {
        adjustSubtitle(request.zoompercent, request.opacity);
    }
}
);
