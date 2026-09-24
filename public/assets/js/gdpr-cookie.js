/*
 * Privacy-first Google Analytics consent manager for CMNA.
 *
 * Public API:
 *   cookieStart(gaId, cookieName, durationDays, policyVersion)
 *   cookieDisplay()
 *   cookieStatus()
 */
(function (window, document) {
    "use strict";

    const ACCEPTED = "accepted";
    const REJECTED = "rejected";
    const BANNER_SELECTOR = "#gdpr-cookie";
    const ACCEPT_SELECTOR = "[data-cookie-accept]";
    const REJECT_SELECTOR = "[data-cookie-reject]";
    const PREFERENCES_SELECTOR = "[data-cookie-preferences]";
    const GA_SCRIPT_ATTRIBUTE = "data-gdpr-cookie-ga";
    const TRANSITION_MILLISECONDS = 200;

    let options = null;
    let banner = null;
    let analyticsLoaded = false;
    let initialized = false;
    let returnFocusTo = null;

    function cookieStart(
        gaId,
        cookieName,
        durationDays,
        policyVersion
    ) {
        const candidate = {
            gaId: gaId,
            cookieName: cookieName,
            durationDays: durationDays,
            policyVersion: String(policyVersion)
        };

        validateOptions(candidate);

        if (initialized) {
            if (!sameOptions(options, candidate)) {
                throw new Error(
                    "cookieStart has already been called with different settings."
                );
            }

            return;
        }

        options = Object.freeze(candidate);
        disableAnalytics();

        onDocumentReady(initialize);
    }

    function initialize() {
        if (initialized) {
            return;
        }

        banner = document.querySelector(BANNER_SELECTOR);

        if (!banner) {
            throw new Error(
                `Cookie consent markup ${BANNER_SELECTOR} was not found.`
            );
        }

        const acceptButton = banner.querySelector(ACCEPT_SELECTOR);
        const rejectButton = banner.querySelector(REJECT_SELECTOR);

        if (!acceptButton || !rejectButton) {
            throw new Error(
                "Cookie consent accept and reject buttons were not found."
            );
        }

        acceptButton.addEventListener("click", acceptAnalytics);
        rejectButton.addEventListener("click", rejectAnalytics);
        document.addEventListener("click", handlePreferencesClick);

        initialized = true;

        const consent = readConsent();

        if (globalPrivacyControlEnabled()) {
            rejectAnalytics(false, "global-privacy-control");
        } else if (
            consent.decision === ACCEPTED &&
            consent.version === options.policyVersion
        ) {
            enableAnalytics();
        } else if (
            consent.decision === REJECTED &&
            consent.version === options.policyVersion
        ) {
            hideBanner(false);
        } else {
            showBanner(false);
        }
    }

    function acceptAnalytics() {
        if (globalPrivacyControlEnabled()) {
            rejectAnalytics(true, "global-privacy-control");
            return;
        }

        writeConsent(ACCEPTED);
        hideBanner(true);
        enableAnalytics();
        dispatchDecisionEvent(ACCEPTED, "visitor");
    }

    function rejectAnalytics(
        restoreFocus,
        source
    ) {
        const shouldRestoreFocus =
            typeof restoreFocus === "boolean" ? restoreFocus : true;
        const decisionSource = source || "visitor";

        writeConsent(REJECTED);
        disableAnalytics();
        deleteAnalyticsCookies();
        hideBanner(shouldRestoreFocus);
        dispatchDecisionEvent(REJECTED, decisionSource);
    }

    function cookieDisplay() {
        requireInitialization("cookieDisplay");
        returnFocusTo = document.activeElement;
        showBanner(true);
    }

    function cookieStatus() {
        requireInitialization("cookieStatus");

        const consent = readConsent();

        return Object.freeze({
            decision: consent.decision,
            version: consent.version,
            currentVersion: options.policyVersion,
            analyticsLoaded: analyticsLoaded,
            globalPrivacyControl: globalPrivacyControlEnabled()
        });
    }

    function enableAnalytics() {
        if (analyticsLoaded) {
            return;
        }

        window[`ga-disable-${options.gaId}`] = false;
        window.dataLayer = window.dataLayer || [];

        window.gtag = window.gtag || function () {
            window.dataLayer.push(arguments);
        };

        window.gtag("consent", "default", {
            analytics_storage: "granted",
            ad_storage: "denied",
            ad_user_data: "denied",
            ad_personalization: "denied"
        });
        window.gtag("js", new Date());
        window.gtag("config", options.gaId, {
            allow_google_signals: false,
            allow_ad_personalization_signals: false
        });

        const existingScript = document.querySelector(
            `script[${GA_SCRIPT_ATTRIBUTE}="${cssEscape(options.gaId)}"]`
        );

        if (!existingScript) {
            const script = document.createElement("script");

            script.async = true;
            script.src =
                "https://www.googletagmanager.com/gtag/js?id=" +
                encodeURIComponent(options.gaId);
            script.setAttribute(GA_SCRIPT_ATTRIBUTE, options.gaId);
            document.head.appendChild(script);
        }

        analyticsLoaded = true;
    }

    function disableAnalytics() {
        if (!options) {
            return;
        }

        window[`ga-disable-${options.gaId}`] = true;

        if (typeof window.gtag === "function") {
            window.gtag("consent", "update", {
                analytics_storage: "denied",
                ad_storage: "denied",
                ad_user_data: "denied",
                ad_personalization: "denied"
            });
        }
    }

    function deleteAnalyticsCookies() {
        const hostParts = window.location.hostname
            .split(".")
            .filter(Boolean);
        const domains = [""];

        for (let index = 0; index < hostParts.length - 1; index += 1) {
            domains.push("." + hostParts.slice(index).join("."));
        }

        document.cookie.split(";").forEach(function (entry) {
            const separator = entry.indexOf("=");
            const rawName =
                separator === -1 ? entry : entry.slice(0, separator);
            const name = rawName.trim();

            if (name === "_ga" || name.startsWith("_ga_")) {
                domains.forEach(function (domain) {
                    expireCookie(name, domain);
                });
            }
        });
    }

    function expireCookie(name, domain) {
        let cookie =
            `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/` +
            "; SameSite=Lax";

        if (domain) {
            cookie += `; Domain=${domain}`;
        }

        if (window.location.protocol === "https:") {
            cookie += "; Secure";
        }

        document.cookie = cookie;
    }

    function showBanner(moveFocus) {
        banner.hidden = false;
        banner.setAttribute("aria-hidden", "false");

        window.requestAnimationFrame(function () {
            banner.classList.add("is-visible");
        });

        if (moveFocus) {
            const rejectButton = banner.querySelector(REJECT_SELECTOR);

            if (rejectButton) {
                rejectButton.focus();
            }
        }
    }

    function hideBanner(restoreFocus) {
        if (!banner) {
            return;
        }

        banner.classList.remove("is-visible");
        banner.setAttribute("aria-hidden", "true");

        window.setTimeout(function () {
            if (!banner.classList.contains("is-visible")) {
                banner.hidden = true;
            }
        }, TRANSITION_MILLISECONDS);

        if (
            restoreFocus &&
            returnFocusTo &&
            typeof returnFocusTo.focus === "function"
        ) {
            returnFocusTo.focus();
        }

        returnFocusTo = null;
    }

    function handlePreferencesClick(event) {
        const control = event.target.closest(PREFERENCES_SELECTOR);

        if (!control) {
            return;
        }

        event.preventDefault();
        cookieDisplay();
    }

    function writeConsent(decision) {
        const value = encodeConsent(decision, options.policyVersion);
        const expires = new Date(
            Date.now() +
            options.durationDays * 24 * 60 * 60 * 1000
        );
        const attributes = [
            `${encodeURIComponent(options.cookieName)}=` +
                encodeURIComponent(value),
            `Expires=${expires.toUTCString()}`,
            "Path=/",
            "SameSite=Lax"
        ];

        if (window.location.protocol === "https:") {
            attributes.push("Secure");
        }

        document.cookie = attributes.join("; ");
    }

    function readConsent() {
        const rawValue = getCookie(options.cookieName);

        if (!rawValue) {
            return { decision: null, version: null };
        }

        const separator = rawValue.indexOf(":");

        if (separator === -1) {
            return { decision: null, version: null };
        }

        const decision = rawValue.slice(0, separator);
        const version = rawValue.slice(separator + 1);

        if (decision !== ACCEPTED && decision !== REJECTED) {
            return { decision: null, version: null };
        }

        return { decision: decision, version: version };
    }

    function getCookie(name) {
        const prefix = `${encodeURIComponent(name)}=`;
        const entries = document.cookie ? document.cookie.split(";") : [];

        for (const entry of entries) {
            const cookie = entry.trim();

            if (cookie.startsWith(prefix)) {
                return decodeURIComponent(cookie.slice(prefix.length));
            }
        }

        return null;
    }

    function encodeConsent(decision, version) {
        return `${decision}:${version}`;
    }

    function dispatchDecisionEvent(decision, source) {
        window.dispatchEvent(
            new CustomEvent("cookieConsentChanged", {
                detail: Object.freeze({
                    decision: decision,
                    version: options.policyVersion,
                    source: source
                })
            })
        );
    }

    function globalPrivacyControlEnabled() {
        return window.navigator.globalPrivacyControl === true;
    }

    function validateOptions(candidate) {
        if (
            typeof candidate.gaId !== "string" ||
            !/^G-[A-Z0-9]+$/i.test(candidate.gaId)
        ) {
            throw new TypeError(
                "gaId must be a Google Analytics 4 ID such as G-ABC123."
            );
        }

        if (
            typeof candidate.cookieName !== "string" ||
            !/^[A-Za-z0-9_-]+$/.test(candidate.cookieName)
        ) {
            throw new TypeError(
                "cookieName may contain letters, numbers, underscores, and hyphens."
            );
        }

        if (
            !Number.isFinite(candidate.durationDays) ||
            candidate.durationDays <= 0
        ) {
            throw new TypeError(
                "durationDays must be a positive number."
            );
        }

        if (
            !candidate.policyVersion ||
            candidate.policyVersion.length > 40
        ) {
            throw new TypeError(
                "policyVersion must be between 1 and 40 characters."
            );
        }
    }

    function sameOptions(left, right) {
        return (
            left.gaId === right.gaId &&
            left.cookieName === right.cookieName &&
            left.durationDays === right.durationDays &&
            left.policyVersion === right.policyVersion
        );
    }

    function onDocumentReady(callback) {
        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                callback,
                { once: true }
            );
        } else {
            callback();
        }
    }

    function requireInitialization(functionName) {
        if (!initialized) {
            throw new Error(
                `${functionName} cannot be called before cookieStart finishes.`
            );
        }
    }

    function cssEscape(value) {
        if (window.CSS && typeof window.CSS.escape === "function") {
            return window.CSS.escape(value);
        }

        return value.replace(/["\\]/g, "\\$&");
    }

    window.cookieStart = cookieStart;
    window.cookieDisplay = cookieDisplay;
    window.cookieStatus = cookieStatus;
})(window, document);
