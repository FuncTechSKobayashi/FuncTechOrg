$(document).ready(function () {
    const tabCache = new Map();
    const prefetchCache = new Map();
    const initialTab = "home.html";
    let currentTab = null;

    function setActiveTab(tabFile) {
        $(".tab-btn").removeClass("active").attr("aria-selected", "false");
        const $target = $(`.tab-btn[data-tab='${tabFile}']`);
        if ($target.length) {
            $target.addClass("active").attr("aria-selected", "true");
        }
    }

    function loadTab(tabFile) {
        const $content = $("#content-area");
        if (!$content.length) {
            return;
        }
        if (!tabFile) {
            return;
        }
        if (currentTab === tabFile) {
            return;
        }
        setActiveTab(tabFile);
        if (currentTab) {
            tabCache.set(currentTab, $content.children().detach());
        }
        if (tabCache.has(tabFile)) {
            $content.append(tabCache.get(tabFile));
            currentTab = tabFile;
            return;
        }
        if (prefetchCache.has(tabFile)) {
            $content.html(prefetchCache.get(tabFile));
            currentTab = tabFile;
            return;
        }
        $content.addClass("is-loading").load(`./tabs/${tabFile}`, function (_response, status) {
            $content.removeClass("is-loading");
            if (status !== "success") {
                const fallback = tabCache.get(currentTab);
                if (fallback) {
                    $content.append(fallback);
                    setActiveTab(currentTab);
                }
                return;
            }
            currentTab = tabFile;
        });
    }

    $(document).on("click", "[data-tab]", function () {
        const tabFile = $(this).data("tab");
        loadTab(tabFile);
    });

    function prefetchTabs() {
        $(".tab-btn").each(function () {
            const tabFile = $(this).data("tab");
            if (!tabFile || tabFile === initialTab || tabFile === "contact.html") {
                return;
            }
            if (tabCache.has(tabFile) || prefetchCache.has(tabFile)) {
                return;
            }
            $.get(`./tabs/${tabFile}`).done(function (html) {
                prefetchCache.set(tabFile, html);
            });
        });
    }

    // 初回ロード時の表示
    loadTab(initialTab);
    const idle = window.requestIdleCallback || function (callback) {
        setTimeout(callback, 400);
    };
    idle(prefetchTabs);
});

function checkRequied(){
    if(document.getElementById("name").value == ""){
        alert("会社名を入力してください。");
        return false;
    }
    if(document.getElementById("email").value == ""){
        alert("メールアドレスを入力してください。");
        return false;
    }
    if(document.getElementById("phone").value == ""){
        alert("電話番号を入力してください。");
        return false;
    }
    if(document.getElementById("subject").value == ""){
        alert("件名を入力してください。");
        return false;
    }
    if(document.getElementById("description").value == ""){
        alert("お問い合わせ内容を入力してください。");
        return false;
    }
    return true;
}
