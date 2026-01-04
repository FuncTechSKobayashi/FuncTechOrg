$(document).ready(function () {
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
        setActiveTab(tabFile);
        $content.addClass("is-loading").load(`./tabs/${tabFile}`, function () {
            $content.removeClass("is-loading");
        });
    }

    $(document).on("click", "[data-tab]", function () {
        const tabFile = $(this).data("tab");
        loadTab(tabFile);
    });

    // 初回ロード時の表示
    loadTab("home.html");
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
