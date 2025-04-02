$(document).ready(function () {
    $(".tab-btn").on("click", function () {
        const tabFile = $(this).data("tab");
        $(".tab-btn").removeClass("active");
        $(this).addClass("active");
        $("#content-area").load(`./tabs/${tabFile}`);
    });
  
    
    $(".footerLink").on("click", function () {
        const tabFile = $(this).data("tab");
        $(".tab-btn").removeClass("active");
        $(this).addClass("active");
        $("#content-area").load(`./tabs/${tabFile}`);
    });
    
    // 初回ロード時の表示
    $("#content-area").load("./tabs/company_info.html");
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