// 定义全局变量，用于存储单词数据、当前页面显示的单词等信息
let wordData = []; // 存储从数据文件中加载的单词数据
let currentWords = []; // 存储当前页面显示的单词
const wordsPerPage = 10; // 每页显示的单词数量
let currentPage = 1; // 当前显示的页码
let totalPages = 1; // 总页数
let knownWordsText = []; // 存储用户已知的单词

// 从 localStorage 移除保存的已知单词，并清空已知单词列表
function removeStoredWords() {
    currentWords = Array.from(new Set([...knownWordsText, ...currentWords]));
    localStorage.setItem('currentWords', JSON.stringify(currentWords));
    localStorage.removeItem('knownWordsText');
    knownWordsText = [];
    displayWords();
    updatePagination();
    showModal('单词已从浏览器中移除');
}

// 处理用户上传的单词文件
function processFile() {
    const fileInput = document.getElementById('worldFile'); // 获取文件输入框
    const file = fileInput.files[0]; // 获取用户选择的文件

    // 如果用户选择了文件，读取文件并处理
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            const content = event.target.result;

            // 使用正则表达式提取所有单词，单词长度至少为3个字母
            const words = content.match(/\b[a-zA-Z]{3,}\b/g);

            if (words) {
                // 去除重复的单词并转换为小写
                knownWordsText = [...new Set(words.map(word => word.toLowerCase()))];

                currentWords = currentWords.filter(word => !knownWordsText.includes(word));

                // 保存单词列表到 localStorage
                localStorage.setItem('knownWordsText', JSON.stringify(knownWordsText));
                localStorage.setItem('currentWords', JSON.stringify(currentWords));

                showModal('单词已成功保存到浏览器！');
                console.log('保存的单词列表:', knownWordsText);
            } else {
                showModal('没有在文件中找到符合条件的单词');
            }
        };

        reader.onerror = function () {
            showModal('文件读取出错');
        };

        reader.readAsText(file); // 以文本格式读取文件
    }
    // 如果用户没有选择文件，则尝试从 localStorage 中读取已知单词
    else {
        knownWordsText = localStorage.getItem('uniqueWords');

        if (knownWordsText) {
            const wordsArray = JSON.parse(knownWordsText); // 解析已保存的单词列表
            showModal('从浏览器中读取单词：' + wordsArray.join(', '));
            console.log('从浏览器读取的单词列表:', wordsArray);
        } else {
            showModal('浏览器中没有找到任何单词，请先上传文件进行处理。');
        }
    }
    displayWords();
    updatePagination();
}

// 显示加载中信息
function showLoading(message) {
    const overlay = document.getElementById('loadingOverlay');
    const messageElement = document.getElementById('loadingMessage');
    messageElement.textContent = message;
    overlay.style.display = 'flex'; // 显示加载覆盖层
}

// 隐藏加载中信息
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'none'; // 隐藏加载覆盖层
}


// IndexedDB 相关函数
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('WordDatabase', 1);
        request.onerror = (event) => reject('IndexedDB error: ' + event.target.error);
        request.onsuccess = (event) => resolve(event.target.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore('wordData', {keyPath: 'id'});
        };
    });
}

function saveToIndexedDB(data) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['wordData'], 'readwrite');
            const store = transaction.objectStore('wordData');
            const request = store.put({id: 'mainData', data: data});
            request.onerror = (event) => reject('Error saving to IndexedDB: ' + event.target.error);
            request.onsuccess = () => resolve();
        });
    });
}

function loadFromIndexedDB() {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['wordData'], 'readonly');
            const store = transaction.objectStore('wordData');
            const request = store.get('mainData');
            request.onerror = (event) => reject('Error loading from IndexedDB: ' + event.target.error);
            request.onsuccess = (event) => resolve(event.target.result ? event.target.result.data : null);
        });
    });
}

// 主要逻辑
window.addEventListener('load', function () {
    showLoading('正在加载资源，请稍候...');

    loadFromIndexedDB()
        .then(cachedData => {
            if (cachedData) {
                return cachedData;
            } else {
                return fetch('data.json')
                    .then(response => response.json())
                    .then(data => {
                        saveToIndexedDB(data);
                        return data;
                    });
            }
        })
        .then(data => {
            wordData = data; // 将加载的数据存储到 wordData 中

            // 尝试从 localStorage 加载 currentWords
            const storedCurrentWords = localStorage.getItem('currentWords');
            if (storedCurrentWords) {
                currentWords = JSON.parse(storedCurrentWords);
                currentPage = parseInt(localStorage.getItem('currentPage')) || 1;
                totalPages = Math.ceil(currentWords.length / wordsPerPage);
                displayWords();
                updatePagination();
            } else {
                fetch('word.json')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        currentWords = data;
                        localStorage.setItem('currentWords', JSON.stringify(currentWords));
                        currentPage = 1;
                        localStorage.setItem('currentPage', currentPage);
                        totalPages = Math.ceil(currentWords.length / wordsPerPage);
                        displayWords();
                        updatePagination();
                    })
                    .catch(error => {
                        console.error('Error loading word.json:', error);
                        // 可以在这里添加错误处理逻辑，比如显示错误消息给用户
                    });
            }

            hideLoading(); // 加载完成后隐藏加载覆盖层
        })
        .catch(error => {
            console.error('Error loading data:', error);
            showLoading('加载资源失败，请刷新页面重试。');
        });
});

// 处理用户上传的字幕文件
function processSubtitle() {
    const knownWords = new Set(knownWordsText.filter(word => word.length > 0)); // 过滤出有效单词
    const fileInput = document.getElementById('subtitleFile'); // 获取字幕文件输入框
    const file = fileInput.files[0]; // 获取字幕文件

    if (!file) {
        showModal('请选择一个字幕文件');
        return;
    }

    showLoading('正在处理字幕，请稍候...');

    // 使用 setTimeout 确保 showLoading 能有时间显示
    setTimeout(() => {
        // 读取文件
        const reader = new FileReader();
        reader.onload = function (e) {
            const content = e.target.result;
            const words = new Set(content.toLowerCase().match(/\b[a-z]{3,}\b/g)); // 提取字幕中的单词
            const newWords = Array.from(words).filter(word => !knownWords.has(word)); // 过滤掉已知的单词

            currentWords = newWords.sort((a, b) => {
                const aInData = wordData.some(item => item.word.toLowerCase() === a);
                const bInData = wordData.some(item => item.word.toLowerCase() === b);
                if (aInData && !bInData) return -1; // 已知单词优先显示
                if (!aInData && bInData) return 1;
                return 0;
            });

            // 将 currentWords 存储到 localStorage
            localStorage.setItem('currentWords', JSON.stringify(currentWords));

            currentPage = 1;
            totalPages = Math.ceil(currentWords.length / wordsPerPage); // 计算总页数
            displayWords(); // 显示单词
            updatePagination(); // 更新分页
            hideLoading(); // 隐藏加载覆盖层
        };
        reader.onerror = function () {
            showModal('文件读取失败，请重试。');
            hideLoading(); // 隐藏加载覆盖层
        };
        reader.readAsText(file); // 读取字幕文件
    }, 200); // 200 毫秒延迟确保 showLoading 有时间显示
}

// 显示当前页的单词列表
function displayWords() {
    setTimeout(() => {
        const wordList = document.getElementById('wordList');
        wordList.innerHTML = ''; // 清空单词列表

        const startIndex = (currentPage - 1) * wordsPerPage;
        const endIndex = startIndex + wordsPerPage;
        const pageWords = currentWords.slice(startIndex, endIndex); // 获取当前页的单词

        // 为每个单词创建 DOM 元素并添加到页面
        pageWords.forEach(word => {
            const wordElement = document.createElement('div');
            wordElement.className = 'word-item';
            const wordInData = wordData.some(item => item.word.toLowerCase() === word);
            wordElement.innerHTML = `
                    <h3 class="playable" onclick="rateLimitedPlayAudio('${word}')">${word}${wordInData ? ' ★' : ''}</h3>
                    <button onclick="hideDiv(event, this)" class="floatRight">展开</button>
                    <div class="word-content"></div>
                `;
            wordElement.addEventListener('click', function (event) {
                toggleWordContent(this, word); // 单击时切换单词详细信息
            }, true);
            wordList.appendChild(wordElement); // 将单词添加到列表
        });
    }, 200)
}

// 隐藏单词详细信息的 div
function hideDiv(event, span) {
    const parentDiv = span.parentNode; // 获取点击的按钮的父级 div
    const nextDiv = parentDiv.querySelector('.word-content'); // 查找要隐藏的详细信息 div
    if (nextDiv.style.display === 'block') {
        nextDiv.style.display = 'none'; // 隐藏详细信息 div
        span.textContent = '展开';
    } else {
        nextDiv.style.display = 'block'; // 隐藏详细信息 div
        span.textContent = '折叠';
    }
}

// 切换单词详细信息的显示与隐藏
function toggleWordContent(element, word) {
    const contentElement = element.querySelector('.word-content');
    if (contentElement.style.display === 'none' || contentElement.style.display === '') {
        const wordInfo = wordData.find(item => item.word.toLowerCase() === word);
        if (wordInfo) {
            const parsedContent = marked.parse(wordInfo.content); // 解析单词详细信息的 Markdown 内容
            contentElement.innerHTML = makeExamplesPlayable(parsedContent); // 使例子内容可播放
            contentElement.style.display = 'none';
        } else {
            contentElement.innerHTML = '没有找到该单词的详细信息。';
            contentElement.style.display = 'none';
        }
    }
}

// 为单词例句添加播放功能
function makeExamplesPlayable(content) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');

    // 为所有 <p> 标签添加可播放功能
    doc.querySelectorAll('p, li').forEach(item => {
        const text = item.textContent.trim();

        // 检查句子是否包含3个或更多单词，并且包含英文句号
        if (/(\b\w+\b\s+){2,}\b\w+\b.*\./.test(text)) {
            item.classList.add('playable');
            item.setAttribute('onclick', `rateLimitedPlayAudio('${text.replace(/[^a-zA-Z0-9\s.,!?]/g, '')}')`);
        }
    });

    return doc.body.innerHTML;
}

// 播放音频，调用在线字典的发音 API
function playAudio(text) {
    text = text.replace(/[^a-zA-Z0-9\s.,!?]/g, '');
    const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=1`);
    audio.play();
}

// 更新分页控件
function updatePagination() {
    setTimeout(() => {
        document.getElementById('currentPage').textContent = `${currentPage} / ${totalPages}`;
        document.getElementById('prevPage').disabled = currentPage === 1;
        document.getElementById('nextPage').disabled = currentPage === totalPages;
    }, 200)
}

// 切换页面
function changePage(delta) {
    currentPage += delta;
    displayWords(); // 切换页面后更新显示的单词
    updatePagination(); // 更新分页控件
    localStorage.setItem('currentPage', currentPage.toString());
}

// 创建限速函数，防止短时间内多次调用音频播放功能
function createRateLimitedFunction(fn, limit = 500) {
    let lastCall = 0;
    let timeoutId = null;

    return function (...args) {
        const now = Date.now();

        if (now - lastCall < limit) {
            clearTimeout(timeoutId); // 如果在限速时间内调用，取消之前的调用
        }

        lastCall = now;

        timeoutId = setTimeout(() => {
            fn(...args); // 延迟调用函数
        }, limit);
    };
}

// 跳转到指定页码
function goToPage() {
    const pageInput = document.getElementById('pageInput');
    const pageNumber = parseInt(pageInput.value);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
        currentPage = pageNumber; // 设置当前页码
        displayWords(); // 显示单词
        updatePagination(); // 更新分页
        localStorage.setItem('currentPage', currentPage.toString());
    } else {
        showModal('请输入有效的页码');
    }
}

let closeModalTimeoutId; // 用于保存定时器 ID

// 显示模态框，提示用户操作信息
function showModal(message) {
    const modal = document.getElementById('alertModal');
    const modalMessage = document.getElementById('modalMessage');
    modalMessage.textContent = message;
    modal.style.display = 'block'; // 显示模态框

    modal.addEventListener('click', function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });
}

// 关闭模态框
function closeModal() {
    closeModalTimeoutId = null;
    const modal = document.getElementById('alertModal');
    modal.style.display = 'none'; // 隐藏模态框
}

// 创建限速音频播放功能，防止短时间内频繁播放音频
const rateLimitedPlayAudio = createRateLimitedFunction(playAudio, 500);
