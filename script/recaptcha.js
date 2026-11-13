// Google reCAPTCHA v2 (checkbox) for the Salesforce Web-to-Case forms.
// Salesforce verifies the token itself, using the key pair named in the form's hidden
// "captcha_settings" field. Its "ts" value must hold the time the check was completed,
// which replaces the timestamp() polling script in the Salesforce-generated form code.
(function () {
    "use strict";

    const SITE_KEY = "6Lflox0uAAAAABSZUqVwVMWsD3V8vXFN4Gxvq0A9";
    const API_URL = "https://www.google.com/recaptcha/api.js?onload=funcTechRecaptchaReady&render=explicit";

    let apiPromise = null;

    function loadApi() {
        if (!apiPromise) {
            apiPromise = new Promise(function (resolve, reject) {
                window.funcTechRecaptchaReady = function () {
                    resolve(window.grecaptcha);
                };
                const script = document.createElement("script");
                script.src = API_URL;
                script.async = true;
                script.defer = true;
                script.onerror = function () {
                    apiPromise = null; // Allow a retry on the next form.
                    reject(new Error("reCAPTCHA failed to load"));
                };
                document.head.appendChild(script);
            });
        }
        return apiPromise;
    }

    function setTimestamp(form) {
        const settings = form.querySelector("input[name='captcha_settings']");
        if (!settings) {
            return;
        }
        const value = JSON.parse(settings.value);
        value.ts = JSON.stringify(new Date().getTime());
        settings.value = JSON.stringify(value);
    }

    // Renders the checkbox into form's [data-recaptcha] element.
    // Returns { check() } where check() gives "" when ready to submit, or a message to show.
    function attach(form) {
        const container = form.querySelector("[data-recaptcha]");
        let state = "loading";
        let widgetId = null;
        let grecaptcha = null;

        if (!container) {
            return { check: function () { return ""; } };
        }

        setTimestamp(form);
        loadApi().then(function (api) {
            grecaptcha = api;
            widgetId = grecaptcha.render(container, {
                sitekey: SITE_KEY,
                callback: function () {
                    setTimestamp(form);
                },
                "expired-callback": function () {
                    setTimestamp(form);
                }
            });
            state = "ready";
        }).catch(function () {
            state = "error";
        });

        window.addEventListener("pageshow", function (event) {
            // Back from Salesforce via the browser cache: the used token is no longer valid.
            if (event.persisted && state === "ready" && form.isConnected) {
                grecaptcha.reset(widgetId);
                setTimestamp(form);
            }
        });

        return {
            check: function () {
                if (state === "loading") {
                    return "確認用のチェックボックスを読み込んでいます。少し待ってから、もう一度送信してください。";
                }
                if (state === "error") {
                    return "確認用のチェックボックスを読み込めませんでした。ページを再読み込みしてから、もう一度送信してください。";
                }
                if (!grecaptcha.getResponse(widgetId)) {
                    return "「私はロボットではありません」にチェックを入れてください。";
                }
                return "";
            }
        };
    }

    window.FuncTechRecaptcha = { attach: attach };
})();
