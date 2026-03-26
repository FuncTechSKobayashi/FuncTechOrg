$(document).ready(function () {
    const tabCache = new Map();
    const prefetchCache = new Map();
    const initialTab = "home.html";
    const analyticsTracker = createAnalyticsTracker();
    let currentTab = null;

    function normalizeTabFile(tabFile) {
        return typeof tabFile === "string" ? tabFile.trim() : "";
    }

    function getTabSlug(tabFile) {
        return normalizeTabFile(tabFile).replace(/\.html$/i, "");
    }

    function getTabLabel(tabFile) {
        const normalizedTabFile = normalizeTabFile(tabFile);
        const $tabButton = $(`.tab-btn[data-tab='${normalizedTabFile}']`).first();
        const buttonLabel = $tabButton.text().trim();
        if (buttonLabel) {
            return buttonLabel;
        }

        const $fallbackLink = $(`[data-tab='${normalizedTabFile}']`).filter(function () {
            return $(this).text().trim();
        }).first();
        const fallbackLabel = $fallbackLink.text().trim();

        return fallbackLabel || getTabSlug(normalizedTabFile) || "page";
    }

    function createAnalyticsTracker() {
        const measurementIdMeta = document.querySelector('meta[name="ga4-measurement-id"]');
        const measurementId = measurementIdMeta ? measurementIdMeta.content.trim() : "";

        if (!measurementId) {
            return {
                trackPageView: function () {}
            };
        }

        const canonicalLink = document.querySelector("link[rel='canonical']");
        const canonicalUrl = new URL(
            canonicalLink ? canonicalLink.getAttribute("href") : "/",
            window.location.origin
        );
        const rootPath = canonicalUrl.pathname === "/" ? "" : canonicalUrl.pathname.replace(/\/$/, "");
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
        window.gtag("config", measurementId, {
            send_page_view: false
        });

        function buildVirtualLocation(tabFile) {
            const slug = getTabSlug(tabFile);
            const pathname = slug === "home" ? canonicalUrl.pathname : `${rootPath}/${slug}`;
            return `${canonicalUrl.origin}${pathname}${window.location.search}`;
        }

        return {
            trackPageView: function (tabFile) {
                const pageLocation = buildVirtualLocation(tabFile);
                window.gtag("event", "page_view", {
                    page_title: `FuncTech | ${getTabLabel(tabFile)}`,
                    page_location: pageLocation,
                    page_referrer: previousLocation || document.referrer
                });
                previousLocation = pageLocation;
            }
        };
    }

    function setActiveTab(tabFile) {
        $(".tab-btn").removeClass("active").attr("aria-selected", "false");
        const $target = $(`.tab-btn[data-tab='${tabFile}']`);
        if ($target.length) {
            $target.addClass("active").attr("aria-selected", "true");
        }
    }

    function loadTab(tabFile) {
        const normalizedTabFile = normalizeTabFile(tabFile);
        const $content = $("#content-area");
        if (!$content.length) {
            return;
        }
        if (!normalizedTabFile) {
            return;
        }
        if (currentTab === normalizedTabFile) {
            return;
        }
        setActiveTab(normalizedTabFile);
        if (currentTab) {
            tabCache.set(currentTab, $content.children().detach());
        }
        if (tabCache.has(normalizedTabFile)) {
            $content.append(tabCache.get(normalizedTabFile));
            currentTab = normalizedTabFile;
            analyticsTracker.trackPageView(normalizedTabFile);
            return;
        }
        if (prefetchCache.has(normalizedTabFile)) {
            $content.html(prefetchCache.get(normalizedTabFile));
            currentTab = normalizedTabFile;
            analyticsTracker.trackPageView(normalizedTabFile);
            return;
        }
        $content.addClass("is-loading").load(`./tabs/${normalizedTabFile}`, function (_response, status) {
            $content.removeClass("is-loading");
            if (status !== "success") {
                const fallback = tabCache.get(currentTab);
                if (fallback) {
                    $content.append(fallback);
                    setActiveTab(currentTab);
                }
                return;
            }
            currentTab = normalizedTabFile;
            analyticsTracker.trackPageView(normalizedTabFile);
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

    loadTab(initialTab);
    const idle = window.requestIdleCallback || function (callback) {
        setTimeout(callback, 400);
    };
    idle(prefetchTabs);
});
