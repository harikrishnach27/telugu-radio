/* Telugu Radio PWA install + update manager. Load with defer. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const installButton = $("installApp");
  const installHelp = $("installHelp");
  const updateBar = $("pwaUpdateBar");
  const updateButton = $("pwaUpdateNow");
  const updateLater = $("pwaUpdateLater");
  const installDialog = $("pwaInstallDialog");
  const closeInstall = $("pwaInstallClose");
  const iosSteps = $("iosInstallSteps");
  const genericSteps = $("genericInstallSteps");

  let deferredPrompt = null;
  let registration = null;
  let refreshing = false;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  function showInstallHelp() {
    if (!installDialog) return;
    if (iosSteps) iosSteps.hidden = !isIOS;
    if (genericSteps) genericSteps.hidden = isIOS;
    if (typeof installDialog.showModal === "function") {
      installDialog.showModal();
    } else {
      installDialog.hidden = false;
    }
  }

  if (installButton) {
    installButton.hidden = isStandalone;
    installButton.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        installButton.hidden = true;
      } else {
        showInstallHelp();
      }
    });
  }

  if (installHelp) installHelp.addEventListener("click", showInstallHelp);
  if (closeInstall) closeInstall.addEventListener("click", () => {
    if (installDialog && installDialog.close) installDialog.close();
    else if (installDialog) installDialog.hidden = true;
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installButton && !isStandalone) installButton.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    if (installButton) installButton.hidden = true;
    deferredPrompt = null;
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", async () => {
      try {
        registration = await navigator.serviceWorker.register("./service-worker.js", {
          scope: "./",
          updateViaCache: "none"
        });

        const offerUpdate = () => {
          if (updateBar) updateBar.hidden = false;
        };

        if (registration.waiting && navigator.serviceWorker.controller) {
          offerUpdate();
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" &&
                navigator.serviceWorker.controller) {
              offerUpdate();
            }
          });
        });

        // Check on startup and whenever the app becomes visible.
        registration.update().catch(() => {});
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            registration.update().catch(() => {});
          }
        });

        // A periodic check while this page remains open.
        window.setInterval(() => {
          if (document.visibilityState === "visible") {
            registration.update().catch(() => {});
          }
        }, 60 * 60 * 1000);

      } catch (error) {
        console.warn("PWA service worker registration failed:", error);
      }
    });

    if (updateButton) {
      updateButton.addEventListener("click", () => {
        const waiting = registration && registration.waiting;
        if (waiting) waiting.postMessage({ type: "SKIP_WAITING" });
      });
    }

    if (updateLater) updateLater.addEventListener("click", () => {
      if (updateBar) updateBar.hidden = true;
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
})();
