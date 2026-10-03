// Every page is a complete HTML document with its own URL, so crawlers and visitors without
// JavaScript get the full content. With JavaScript, internal links swap only #content-area
// (like the previous tab UI) and update the URL with history.pushState.
(function () {
    "use strict";

    const pageCache = new Map();
    const analytics = createAnalyticsTracker();

    // Directory-style URLs ("/", "/apps/manarizu/") are site pages. Root-level .html files
    // (privacy policies, app-contact.html) are standalone and use normal navigation.
    function isSitePage(url) {
        return url.origin === window.location.origin && url.pathname.endsWith("/");
    }

    function createAnalyticsTracker() {
        const measurementIdMeta = document.querySelector('meta[name="ga4-measurement-id"]');
        const measurementId = measurementIdMeta ? measurementIdMeta.content.trim() : "";
        if (!measurementId) {
            return { trackPageView: function () {} };
        }

        let previousLocation = "";
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () {
            window.dataLayer.push(arguments);
        };

        const analyticsScript = document.createElement("script");
        analyticsScript.async = true;
        analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
        document.head.appendChild(analyticsScript);

        window.gtag("js", new Date());
        window.gtag("config", measurementId, { send_page_view: false });

        return {
            trackPageView: function () {
                const pageLocation = window.location.href;
                window.gtag("event", "page_view", {
                    page_title: document.title,
                    page_location: pageLocation,
                    page_referrer: previousLocation || document.referrer
                });
                previousLocation = pageLocation;
            }
        };
    }

    function setActiveNav(pathname) {
        document.querySelectorAll(".tab-wrap .tab-btn").forEach(function (link) {
            const linkPath = new URL(link.href, window.location.href).pathname;
            const active = linkPath === "/" ? pathname === "/" : pathname.startsWith(linkPath);
            link.classList.toggle("active", active);
            if (active) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    function parsePage(html) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const main = doc.getElementById("content-area");
        if (!main) {
            return null;
        }
        const description = doc.querySelector('meta[name="description"]');
        const canonical = doc.querySelector('link[rel="canonical"]');
        const jsonLd = doc.querySelector('script[type="application/ld+json"]');
        return {
            content: main.innerHTML,
            title: doc.title,
            description: description ? description.content : "",
            canonical: canonical ? canonical.href : "",
            jsonLd: jsonLd ? jsonLd.textContent : ""
        };
    }

    function fetchPage(pathname) {
        if (!pageCache.has(pathname)) {
            const request = fetch(pathname, { credentials: "same-origin" })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    return response.text();
                })
                .then(function (html) {
                    const page = parsePage(html);
                    if (!page) {
                        throw new Error("content-area not found");
                    }
                    return page;
                });
            // A failed request must not stay cached; the next click retries or falls back.
            request.catch(function () {
                pageCache.delete(pathname);
            });
            pageCache.set(pathname, request);
        }
        return pageCache.get(pathname);
    }

    function applyPage(page) {
        const content = document.getElementById("content-area");
        content.innerHTML = page.content;
        document.title = page.title;
        const description = document.querySelector('meta[name="description"]');
        if (description) {
            description.content = page.description;
        }
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical && page.canonical) {
            canonical.href = page.canonical;
        }
        const jsonLd = document.querySelector('script[type="application/ld+json"]');
        if (jsonLd && page.jsonLd) {
            jsonLd.textContent = page.jsonLd;
        }
        initPage(content);
    }

    let navigationId = 0;

    function navigate(url, push) {
        const currentId = ++navigationId;
        const content = document.getElementById("content-area");
        content.classList.add("is-loading");
        fetchPage(url.pathname).then(function (page) {
            if (currentId !== navigationId) {
                return;
            }
            if (push) {
                history.pushState({}, "", url.pathname + url.search + url.hash);
            }
            applyPage(page);
            setActiveNav(url.pathname);
            content.classList.remove("is-loading");
            const target = url.hash ? document.getElementById(url.hash.slice(1)) : null;
            if (target) {
                target.scrollIntoView();
            } else if (push) {
                document.getElementById("main").scrollIntoView();
            }
            analytics.trackPageView();
        }).catch(function () {
            // Fall back to a normal page load so the visitor still reaches the page.
            window.location.href = url.href;
        });
    }

    document.addEventListener("click", function (event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }
        const link = event.target.closest("a[href]");
        if (!link || link.target || link.hasAttribute("download")) {
            return;
        }
        const url = new URL(link.href, window.location.href);
        if (!isSitePage(url)) {
            return;
        }
        if (url.pathname === window.location.pathname && url.hash) {
            return; // In-page anchor such as #contactFlow.
        }
        event.preventDefault();
        if (url.pathname === window.location.pathname) {
            document.getElementById("main").scrollIntoView();
            return;
        }
        navigate(url, true);
    });

    window.addEventListener("popstate", function () {
        navigate(new URL(window.location.href), false);
    });

    function prefetchNavPages() {
        document.querySelectorAll(".tab-wrap .tab-btn").forEach(function (link) {
            const url = new URL(link.href, window.location.href);
            if (isSitePage(url) && url.pathname !== window.location.pathname) {
                fetchPage(url.pathname).catch(function () {});
            }
        });
    }

    // ----- Page-specific behaviour (re-run after each content swap) -----

    function initPage(root) {
        initContactForm(root);
    }

    function initContactForm(root) {
        const flow = root.querySelector("#contactFlow");
        const status = root.querySelector("#contactFlowStatus");
        const formWrapper = root.querySelector("#contact-form-wrapper");
        const form = root.querySelector("#inquiryForm");
        if (!flow || !status || !formWrapper || !form) {
            return;
        }

        function getSelected(name) {
            return flow.querySelector(`input[name="${name}"]:checked`);
        }

        function getSelectedValue(name) {
            const checked = getSelected(name);
            return checked ? checked.value : "";
        }

        function getSelectedLabel(name) {
            const checked = getSelected(name);
            return checked ? checked.dataset.label : "";
        }

        function isEligible() {
            const type = getSelectedValue("inquiry_type");
            const sales = getSelectedValue("sales_intent");
            return Boolean(type && sales) && sales !== "yes" && type !== "other";
        }

        function setFormEnabled(enabled) {
            formWrapper.hidden = !enabled;
            form.querySelectorAll("input:not([type='hidden']), textarea, button").forEach(function (field) {
                field.disabled = !enabled;
            });
        }

        function updateFlow() {
            const type = getSelectedValue("inquiry_type");
            const sales = getSelectedValue("sales_intent");
            if (!type || !sales) {
                status.setAttribute("data-state", "neutral");
                setFormEnabled(false);
                return;
            }
            if (!isEligible()) {
                status.setAttribute("data-state", "ng");
                setFormEnabled(false);
                return;
            }
            status.setAttribute("data-state", "ok");
            setFormEnabled(true);
        }

        flow.addEventListener("change", updateFlow);
        updateFlow();

        form.addEventListener("submit", function (e) {
            const field = function (id) {
                return form.querySelector(`#${id}`);
            };
            if (!isEligible()) {
                e.preventDefault();
                alert("営業・提携のご提案は受け付けておりません。");
                return;
            }
            if (field("address").value) {
                e.preventDefault();
                alert("送信エラーが発生しました。再試行してください。");
                return;
            }
            const subject = field("subject");
            const description = field("description");
            const originalSubject = subject.dataset.originalValue || subject.value.trim();
            const originalDescription = description.dataset.originalValue || description.value.trim();
            const combinedText = `${originalSubject}\n${originalDescription}`;
            if (["スマートセールス", "M&A", "リトライブ"].some(function (word) { return combinedText.indexOf(word) !== -1; })) {
                e.preventDefault();
                alert("問い合わせを受け付けすることができません。");
                return;
            }

            const email = field("email").value;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                e.preventDefault();
                alert("正しいメールアドレスを入力してください。");
                field("email").focus();
                return;
            }

            const phone = field("phone").value;
            if (!/^[0-9\-]+$/.test(phone)) {
                e.preventDefault();
                alert("正しい電話番号を入力してください。（半角数字とハイフンのみ）");
                field("phone").focus();
                return;
            }

            for (const id of ["company", "name", "subject", "description"]) {
                if (!field(id).value.trim()) {
                    e.preventDefault();
                    alert("必須項目をすべて入力してください。");
                    field(id).focus();
                    return;
                }
            }

            // Step 1〜3 の選択はフォームの項目ではないため、本文に含めて送る
            subject.dataset.originalValue = originalSubject;
            description.dataset.originalValue = originalDescription;
            subject.value = `【法人】${originalSubject}`.slice(0, 80);
            description.value = [
                "法人のお客さまからのお問い合わせ",
                "",
                `ご相談区分: ${getSelectedLabel("inquiry_type")}`,
                `Salesforceのご利用状況: ${getSelectedLabel("project_stage") || "未選択"}`,
                `会社名: ${field("company").value.trim()}`,
                `ご担当者名: ${field("name").value.trim()}`,
                `メールアドレス: ${email}`,
                `電話番号: ${phone}`,
                `件名: ${originalSubject}`,
                "",
                "お問い合わせ内容:",
                originalDescription
            ].join("\n");
        });
    }

    function start() {
        const content = document.getElementById("content-area");
        if (!content) {
            return;
        }
        history.replaceState({}, "", window.location.href);
        setActiveNav(window.location.pathname);
        initPage(content);
        analytics.trackPageView();
        const idle = window.requestIdleCallback || function (callback) {
            setTimeout(callback, 400);
        };
        idle(prefetchNavPages);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
