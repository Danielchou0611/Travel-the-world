let googleMapsPromise = null;
const SCRIPT_LOAD_TIMEOUT_MS = 15000;
const CALLBACK_NAME = "__googleMapsInitCallback";

function isMapsReady() {
  return Boolean(
    window.google?.maps &&
      (typeof window.google.maps.importLibrary === "function" ||
        typeof window.google.maps.Map === "function")
  );
}

function waitForMapsReady(maxWaitMs = 5000, intervalMs = 50) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (isMapsReady()) {
        clearInterval(timer);
        resolve(window.google.maps);
        return;
      }

      if (Date.now() - start > maxWaitMs) {
        clearInterval(timer);
        reject(new Error("Google Maps API 未完整就緒。"));
      }
    }, intervalMs);
  });
}

export function loadGoogleMapsApi(apiKey) {
  if (!apiKey) {
    return Promise.reject(new Error("Missing Google Maps API key."));
  }

  if (isMapsReady()) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    let timerId = null;
    const clearTimer = () => {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    timerId = setTimeout(() => {
      reject(
        new Error(
          "Google Maps 載入逾時。請檢查瀏覽器外掛（AdBlock/隱私防護）是否攔截 maps.googleapis.com。"
        )
      );
    }, SCRIPT_LOAD_TIMEOUT_MS);

    const existingScript = document.querySelector("script[data-google-maps-api='true']");
    if (existingScript) {
      if (isMapsReady()) {
        clearTimer();
        resolve(window.google.maps);
        return;
      }

      existingScript.addEventListener(
        "load",
        () => {
          waitForMapsReady(3000)
            .then((maps) => {
              clearTimer();
              resolve(maps);
            })
            .catch((error) => {
              clearTimer();
              reject(error);
            });
        },
        { once: true }
      );
      existingScript.addEventListener(
        "error",
        () => {
          clearTimer();
          reject(new Error("Google Maps script failed to load."));
        },
        {
          once: true,
        }
      );
      return;
    }

    window[CALLBACK_NAME] = () => {
      waitForMapsReady(3000)
        .then((maps) => {
          clearTimer();
          resolve(maps);
        })
        .catch((error) => {
          clearTimer();
          reject(error);
        })
        .finally(() => {
          delete window[CALLBACK_NAME];
        });
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=zh-TW&region=TW&loading=async&v=weekly&callback=${CALLBACK_NAME}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsApi = "true";
    script.onload = () => {
      // callback handles resolve when API is truly ready
    };
    script.onerror = () => {
      clearTimer();
      reject(new Error("Google Maps script failed to load."));
      delete window[CALLBACK_NAME];
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
