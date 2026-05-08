const state = {
  rows: [],
  fieldKeys: [],
  regions: [],
  categories: [],
  selectedRegion: "ALL",
  searchTerm: "",
  selectedCategory: "",
  sortKey: "xai_score",
  selectedSpotId: null,
  expandedSpotIds: new Set(),
  map: null,
  markerLayer: null,
  markersById: new Map(),
  routeHistory: [],
};

const elements = {
  totalRegions: document.querySelector("#totalRegions"),
  totalSpots: document.querySelector("#totalSpots"),
  visibleSpots: document.querySelector("#visibleSpots"),
  currentRegionCount: document.querySelector("#currentRegionCount"),
  regionList: document.querySelector("#regionList"),
  categorySelect: document.querySelector("#categorySelect"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  originInput: document.querySelector("#originInput"),
  destinationInput: document.querySelector("#destinationInput"),
  originSuggestions: document.querySelector("#originSuggestions"),
  destinationSuggestions: document.querySelector("#destinationSuggestions"),
  openTransitButton: document.querySelector("#openTransitButton"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  routeHistory: document.querySelector("#routeHistory"),
  routeHint: document.querySelector("#routeHint"),
  contentTitle: document.querySelector("#contentTitle"),
  contentSubtitle: document.querySelector("#contentSubtitle"),
  mapMeta: document.querySelector("#mapMeta"),
  mapStatus: document.querySelector("#mapStatus"),
  spotMap: document.querySelector("#spotMap"),
  resultsMeta: document.querySelector("#resultsMeta"),
  cardGrid: document.querySelector("#cardGrid"),
  cardTemplate: document.querySelector("#cardTemplate"),
};

const numberFormatter = new Intl.NumberFormat("zh-TW");
const mapReady = typeof window.L !== "undefined";
const ROUTE_HISTORY_KEY = "japan-spot-route-history";
const AUTOCOMPLETE_LIMIT = 8;

bootstrap().catch((error) => {
  console.error(error);
  elements.cardGrid.innerHTML = `
    <div class="empty-state">
      <h3>資料載入失敗</h3>
      <p>請確認目前是透過本機 server 開啟頁面，且 JSON 檔案存在。</p>
    </div>
  `;
});

async function bootstrap() {
  const rawRows = await fetch("./japan_with_rating_interest.json").then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load JSON: ${response.status}`);
    }

    return response.json();
  });

  if (!Array.isArray(rawRows)) {
    throw new Error("JSON dataset must be an array.");
  }

  state.rows = rawRows.map(normalizeRow).filter((row) => row.name && row.region);
  state.fieldKeys = collectFieldKeys(state.rows);
  state.regions = buildRegionSummary(state.rows);
  state.categories = Array.from(
    new Set(state.rows.map((row) => row.category).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right, "zh-Hant"));
  state.routeHistory = readRouteHistory();
  state.locationSuggestions = buildLocationSuggestions(state.rows);

  initializeMap();
  bindEvents();
  renderCategoryOptions();
  renderRegionList();
  renderDashboard();
  renderRouteHistory();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.searchTerm = event.target.value.trim().toLowerCase();
    renderDashboard();
  });

  elements.categorySelect.addEventListener("change", (event) => {
    state.selectedCategory = event.target.value;
    renderDashboard();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    state.sortKey = event.target.value;
    renderDashboard();
  });

  elements.openTransitButton.addEventListener("click", () => {
    openTransitRoute();
  });

  setupAutocomplete(elements.originInput, elements.originSuggestions);
  setupAutocomplete(elements.destinationInput, elements.destinationSuggestions);

  elements.clearHistoryButton.addEventListener("click", () => {
    state.routeHistory = [];
    persistRouteHistory();
    renderRouteHistory();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".autocomplete-shell")) {
      closeAutocomplete(elements.originSuggestions);
      closeAutocomplete(elements.destinationSuggestions);
    }
  });
}

function renderCategoryOptions() {
  const options = state.categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");

  elements.categorySelect.insertAdjacentHTML("beforeend", options);
}

function renderRegionList() {
  const totalCount = state.rows.length;
  const allButton = `
    <button class="region-button ${state.selectedRegion === "ALL" ? "active" : ""}" data-region="ALL">
      <strong>全部地區</strong>
      <span>${numberFormatter.format(totalCount)} 筆景點</span>
    </button>
  `;

  const regionButtons = state.regions
    .map(
      ({ region, count }) => `
        <button class="region-button ${state.selectedRegion === region ? "active" : ""}" data-region="${escapeHtml(region)}">
          <strong>${escapeHtml(region)}</strong>
          <span>${numberFormatter.format(count)} 筆景點</span>
        </button>
      `
    )
    .join("");

  elements.regionList.innerHTML = allButton + regionButtons;

  for (const button of elements.regionList.querySelectorAll(".region-button")) {
    button.addEventListener("click", () => {
      state.selectedRegion = button.dataset.region;
      renderRegionList();
      renderDashboard();
    });
  }
}

function renderDashboard() {
  const regionRows = getRegionRows();
  const filteredRows = getFilteredRows(regionRows);
  const sortedRows = sortRows(filteredRows, state.sortKey);
  const selectedLabel = state.selectedRegion === "ALL" ? "全部地區" : state.selectedRegion;

  if (!sortedRows.some((row) => row.spotKey === state.selectedSpotId)) {
    state.selectedSpotId = sortedRows[0]?.spotKey ?? null;
  }

  elements.totalRegions.textContent = numberFormatter.format(state.regions.length);
  elements.totalSpots.textContent = numberFormatter.format(state.rows.length);
  elements.visibleSpots.textContent = numberFormatter.format(sortedRows.length);
  elements.currentRegionCount.textContent = `${numberFormatter.format(regionRows.length)} 筆`;
  elements.contentTitle.textContent = selectedLabel;
  elements.contentSubtitle.textContent = buildSubtitle();
  elements.resultsMeta.textContent =
    `${selectedLabel}共有 ${numberFormatter.format(regionRows.length)} 筆資料，目前篩出 ${numberFormatter.format(sortedRows.length)} 筆。`;

  renderCards(sortedRows);
  renderMap(sortedRows);
}

function renderCards(rows) {
  if (!rows.length) {
    elements.cardGrid.innerHTML = `
      <div class="empty-state">
        <h3>沒有符合條件的資料</h3>
        <p>可以試著清空搜尋字詞，或調整類別與地區篩選。</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const row of rows) {
    const card = elements.cardTemplate.content.firstElementChild.cloneNode(true);
    const image = card.querySelector(".spot-image");
    const detailToggle = card.querySelector(".detail-toggle");
    const details = card.querySelector(".spot-details");
    const isExpanded = state.expandedSpotIds.has(row.spotKey);
    const isSelected = state.selectedSpotId === row.spotKey;

    image.src = row.image_url || fallbackImage(row.name);
    image.alt = row.name;
    image.addEventListener("error", () => {
      image.src = fallbackImage(row.name);
    });

    card.querySelector(".spot-region").textContent = row.region;
    card.querySelector(".spot-name").textContent = row.name;
    card.querySelector(".spot-category").textContent = row.category || "未分類";
    card.querySelector(".metric-xai").textContent = formatDecimal(row.xai_score, 4);
    card.querySelector(".metric-rating").textContent = formatDecimal(row.google_rating, 1);
    card.querySelector(".metric-reviews").textContent = numberFormatter.format(row.review_count || 0);
    card.querySelector(".metric-station").textContent = row.station_anchor || "未提供";
    card.querySelector(".metric-distance").textContent =
      row.distance_to_station_km !== null ? `${formatDecimal(row.distance_to_station_km, 1)} km` : "未提供";
    card.querySelector(".detail-interest-tags").textContent = row.interest_tags || "未提供";
    card.querySelector(".detail-interest-match").textContent = formatDecimal(row.interest_match, 2);
    card.querySelector(".detail-rating-norm").textContent = formatDecimal(row.rating_norm, 4);
    card.querySelector(".detail-review-norm").textContent = formatDecimal(row.review_norm, 4);
    card.querySelector(".detail-station-efficiency").textContent = formatDecimal(
      row.station_distance_efficiency,
      4
    );
    card.querySelector(".detail-coordinates").textContent =
      row.lat !== null && row.lng !== null ? `${formatDecimal(row.lat, 4)}, ${formatDecimal(row.lng, 4)}` : "未提供";
    card.querySelector(".detail-source-id").textContent = row.source_id || "未提供";
    card.querySelector(".detail-google-name").textContent = row.google_name_matched || "未提供";
    card.querySelector(".detail-all-fields").innerHTML = buildAllFieldsMarkup(row);

    card.dataset.spotId = row.spotKey;
    card.classList.toggle("is-selected", isSelected);
    details.hidden = !isExpanded;
    detailToggle.textContent = isExpanded ? "收合詳細資訊" : "展開更多資訊";

    card.addEventListener("click", (event) => {
      if (event.target === detailToggle) {
        return;
      }
      focusSpot(row.spotKey, { openPopup: true, expand: false });
      autofillDestination(row);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        focusSpot(row.spotKey, { openPopup: true, expand: false });
        autofillDestination(row);
      }
    });

    detailToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleDetails(row.spotKey);
    });

    fragment.appendChild(card);
  }

  elements.cardGrid.replaceChildren(fragment);
}

function initializeMap() {
  if (!mapReady) {
    elements.mapStatus.textContent = "Leaflet 地圖載入失敗，目前只顯示卡片資料。";
    elements.mapMeta.textContent = "地圖不可用";
    return;
  }

  state.map = window.L.map(elements.spotMap, {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView([36.2048, 138.2529], 5);

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(state.map);

  state.markerLayer = window.L.layerGroup().addTo(state.map);
  elements.mapStatus.hidden = true;
  elements.mapMeta.textContent = "同步顯示目前篩選結果";
}

function renderMap(rows) {
  if (!state.map || !state.markerLayer) {
    return;
  }

  state.markerLayer.clearLayers();
  state.markersById.clear();

  const rowsWithCoords = rows.filter((row) => row.lat !== null && row.lng !== null);
  elements.mapMeta.textContent = `地圖標記 ${numberFormatter.format(rowsWithCoords.length)} 筆`;
  elements.mapStatus.hidden = rowsWithCoords.length > 0;
  elements.mapStatus.textContent = rowsWithCoords.length
    ? ""
    : "目前篩選結果沒有可用座標，因此地圖上沒有 marker。";

  if (!rowsWithCoords.length) {
    return;
  }

  const latLngs = [];

  for (const row of rowsWithCoords) {
    const marker = window.L.circleMarker([row.lat, row.lng], {
      radius: state.selectedSpotId === row.spotKey ? 9 : 6,
      weight: 2,
      color: state.selectedSpotId === row.spotKey ? "#6f2618" : "#ffffff",
      fillColor: state.selectedSpotId === row.spotKey ? "#b44f2d" : "#d57a49",
      fillOpacity: 0.92,
    });

    marker.bindPopup(buildPopupHtml(row), { className: "map-popup" });
    marker.on("click", () => {
      focusSpot(row.spotKey, { openPopup: false, expand: true });
    });

    marker.addTo(state.markerLayer);
    state.markersById.set(row.spotKey, marker);
    latLngs.push([row.lat, row.lng]);
  }

  const selectedMarker = state.markersById.get(state.selectedSpotId);
  if (selectedMarker) {
    selectedMarker.openPopup();
  }

  const bounds = window.L.latLngBounds(latLngs);
  state.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
}

function focusSpot(spotId, options = {}) {
  state.selectedSpotId = spotId;

  if (options.expand) {
    state.expandedSpotIds.add(spotId);
  }

  renderDashboard();

  const targetCard = elements.cardGrid.querySelector(`[data-spot-id="${CSS.escape(spotId)}"]`);
  if (targetCard) {
    targetCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const marker = state.markersById.get(spotId);
  if (marker) {
    state.map.panTo(marker.getLatLng(), { animate: true, duration: 0.4 });
    if (options.openPopup !== false) {
      marker.openPopup();
    }
  }
}

function toggleDetails(spotId) {
  if (state.expandedSpotIds.has(spotId)) {
    state.expandedSpotIds.delete(spotId);
  } else {
    state.expandedSpotIds.add(spotId);
  }

  state.selectedSpotId = spotId;
  renderDashboard();
}

function renderRouteHistory() {
  if (!state.routeHistory.length) {
    elements.routeHistory.innerHTML = `
      <div class="empty-state">
        <h3>目前還沒有查詢紀錄</h3>
        <p>輸入起點與終點後開啟 Google Maps，這裡就會留下可回查的連結。</p>
      </div>
    `;
    return;
  }

  const historyMarkup = state.routeHistory
    .map(
      (item) => `
        <article class="history-item">
          <p class="history-route">${escapeHtml(item.origin)} → ${escapeHtml(item.destination)}</p>
          <p class="history-meta">${escapeHtml(item.timestampLabel)}</p>
          <a class="history-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">
            重新開啟這條 Google Maps 路線
          </a>
        </article>
      `
    )
    .join("");

  elements.routeHistory.innerHTML = historyMarkup;
}

function openTransitRoute() {
  const origin = elements.originInput.value.trim();
  const destination = elements.destinationInput.value.trim();

  if (!origin || !destination) {
    elements.routeHint.textContent = "請先填入起點與終點，再開啟 Google Maps 路線。";
    return;
  }

  const url = buildTransitUrl(origin, destination);
  const timestamp = new Date();

  state.routeHistory.unshift({
    origin,
    destination,
    url,
    timestampIso: timestamp.toISOString(),
    timestampLabel: formatTimestamp(timestamp),
  });

  state.routeHistory = state.routeHistory.slice(0, 12);
  persistRouteHistory();
  renderRouteHistory();
  elements.routeHint.textContent = "已建立路線並記錄在下方，可反覆重開。";

  window.open(url, "_blank", "noopener,noreferrer");
}

function buildTransitUrl(origin, destination) {
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "transit",
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function autofillDestination(row) {
  if (!elements.destinationInput.value.trim()) {
    elements.destinationInput.value = row.name;
  }
  closeAutocomplete(elements.destinationSuggestions);
}

function readRouteHistory() {
  try {
    const raw = window.localStorage.getItem(ROUTE_HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        item &&
        typeof item.origin === "string" &&
        typeof item.destination === "string" &&
        typeof item.url === "string" &&
        typeof item.timestampLabel === "string"
    );
  } catch (error) {
    console.warn("Failed to read route history", error);
    return [];
  }
}

function persistRouteHistory() {
  try {
    window.localStorage.setItem(ROUTE_HISTORY_KEY, JSON.stringify(state.routeHistory));
  } catch (error) {
    console.warn("Failed to persist route history", error);
  }
}

function getRegionRows() {
  if (state.selectedRegion === "ALL") {
    return state.rows;
  }

  return state.rows.filter((row) => row.region === state.selectedRegion);
}

function getFilteredRows(rows) {
  return rows.filter((row) => {
    const matchesSearch =
      !state.searchTerm ||
      row.name.toLowerCase().includes(state.searchTerm) ||
      (row.google_name_matched || "").toLowerCase().includes(state.searchTerm);
    const matchesCategory = !state.selectedCategory || row.category === state.selectedCategory;

    return matchesSearch && matchesCategory;
  });
}

function sortRows(rows, sortKey) {
  const direction = sortKey === "distance_to_station_km" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const leftValue = left[sortKey] ?? (direction === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
    const rightValue = right[sortKey] ?? (direction === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);

    if (leftValue === rightValue) {
      return left.name.localeCompare(right.name, "zh-Hant");
    }

    return (leftValue - rightValue) * direction;
  });
}

function buildRegionSummary(rows) {
  const counts = rows.reduce((accumulator, row) => {
    accumulator.set(row.region, (accumulator.get(row.region) || 0) + 1);
    return accumulator;
  }, new Map());

  return Array.from(counts.entries())
    .map(([region, count]) => ({ region, count }))
    .sort((left, right) => right.count - left.count || left.region.localeCompare(right.region, "zh-Hant"));
}

function buildLocationSuggestions(rows) {
  const suggestionMap = new Map();

  for (const row of rows) {
    if (row.name) {
      suggestionMap.set(`spot:${row.name}`, {
        value: row.name,
        type: "景點",
        secondary: row.region || row.category || "",
      });
    }
    if (row.region) {
      suggestionMap.set(`region:${row.region}`, {
        value: row.region,
        type: "地區",
        secondary: "日本行政區",
      });
    }
    if (row.station_anchor) {
      suggestionMap.set(`station:${row.station_anchor}`, {
        value: row.station_anchor,
        type: "車站",
        secondary: row.region || "",
      });
    }
  }

  return Array.from(suggestionMap.values()).sort((left, right) =>
    left.value.localeCompare(right.value, "zh-Hant")
  );
}

function buildSubtitle() {
  const sortLabel = {
    xai_score: "推薦分數",
    google_rating: "Google 評分",
    review_count: "評論數",
    distance_to_station_km: "距離車站",
  }[state.sortKey];

  const categoryText = state.selectedCategory || "全部類別";
  const searchText = state.searchTerm ? `，搜尋「${state.searchTerm}」` : "";

  return `類別：${categoryText}，排序：${sortLabel}${searchText}`;
}

function normalizeRow(row) {
  const interests = Array.isArray(row.interests)
    ? row.interests.filter(Boolean)
    : typeof row.interests === "string"
      ? row.interests
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  const sourceId = row.source_id ?? row.id ?? "";

  return {
    ...row,
    id: row.id ?? sourceId,
    source_id: String(sourceId || ""),
    interests,
    interest_tags: interests.join("、"),
    spotKey: String(row.id || row.source_id || `${row.name}-${row.region}`),
    google_rating: toNumber(row.google_rating),
    review_count: toNumber(row.review_count),
    interest_match: toNumber(row.interest_match),
    rating_norm: toNumber(row.rating_norm),
    review_norm: toNumber(row.review_norm),
    station_distance_efficiency: toNumber(row.station_distance_efficiency),
    distance_to_station_km: toNumber(row.distance_to_station_km),
    xai_score: toNumber(row.xai_score),
    lat: toNumber(row.lat),
    lng: toNumber(row.lng),
    google_name_matched: row.google_name_matched || "",
  };
}

function collectFieldKeys(rows) {
  const keySet = new Set();

  for (const row of rows) {
    Object.keys(row).forEach((key) => {
      if (key !== "spotKey") {
        keySet.add(key);
      }
    });
  }

  return Array.from(keySet);
}

function buildAllFieldsMarkup(row) {
  return state.fieldKeys
    .map((key) => {
      const value = formatFieldValue(row[key]);
      return `
        <div>
          <dt>${escapeHtml(key)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `;
    })
    .join("");
}

function formatFieldValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join("、") : "未提供";
  }

  if (value === null || value === undefined || value === "") {
    return "未提供";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDecimal(value, digits) {
  if (value === null || value === undefined) {
    return "未提供";
  }

  return Number(value).toFixed(digits);
}

function fallbackImage(name) {
  const label = encodeURIComponent(name || "Japan Spot");
  return `https://placehold.co/800x500/e6dcc8/6f2618?text=${label}`;
}

function buildPopupHtml(row) {
  return `
    <div class="map-popup">
      <h3>${escapeHtml(row.name)}</h3>
      <p>${escapeHtml(row.region)} ・ ${escapeHtml(row.category || "未分類")}</p>
      <p>推薦分數 ${escapeHtml(formatDecimal(row.xai_score, 4))}</p>
      <p>${escapeHtml(row.station_anchor || "未提供")} / ${escapeHtml(
    row.distance_to_station_km !== null ? `${formatDecimal(row.distance_to_station_km, 1)} km` : "未提供"
  )}</p>
    </div>
  `;
}

function formatTimestamp(date) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function setupAutocomplete(inputElement, menuElement) {
  inputElement.addEventListener("input", () => {
    renderAutocompleteMenu(inputElement, menuElement);
  });

  inputElement.addEventListener("focus", () => {
    renderAutocompleteMenu(inputElement, menuElement);
  });

  inputElement.addEventListener("keydown", (event) => {
    const items = Array.from(menuElement.querySelectorAll(".autocomplete-item"));
    if (!items.length) {
      return;
    }

    const activeIndex = items.findIndex((item) => item.classList.contains("is-active"));

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
      setActiveAutocompleteItem(items, nextIndex);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
      setActiveAutocompleteItem(items, nextIndex);
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectAutocompleteSuggestion(inputElement, menuElement, items[activeIndex].dataset.value);
      return;
    }

    if (event.key === "Escape") {
      closeAutocomplete(menuElement);
    }
  });
}

function renderAutocompleteMenu(inputElement, menuElement) {
  const query = inputElement.value.trim().toLowerCase();
  const matches = query ? getAutocompleteMatches(query) : [];

  if (!matches.length) {
    closeAutocomplete(menuElement);
    return;
  }

  menuElement.innerHTML = matches
    .map(
      (match, index) => `
        <button
          class="autocomplete-item ${index === 0 ? "is-active" : ""}"
          type="button"
          data-value="${escapeAttribute(match.value)}"
        >
          <span class="autocomplete-value">${escapeHtml(match.value)}</span>
          <span class="autocomplete-meta">${escapeHtml(match.type)}${match.secondary ? ` ・ ${match.secondary}` : ""}</span>
        </button>
      `
    )
    .join("");

  menuElement.hidden = false;

  for (const item of menuElement.querySelectorAll(".autocomplete-item")) {
    item.addEventListener("mouseenter", () => {
      const items = Array.from(menuElement.querySelectorAll(".autocomplete-item"));
      setActiveAutocompleteItem(items, items.indexOf(item));
    });

    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      selectAutocompleteSuggestion(inputElement, menuElement, item.dataset.value);
    });
  }
}

function getAutocompleteMatches(query) {
  return state.locationSuggestions
    .map((suggestion) => {
      const valueLower = suggestion.value.toLowerCase();
      const secondaryLower = suggestion.secondary.toLowerCase();
      const startsWith = valueLower.startsWith(query);
      const includes = valueLower.includes(query);
      const secondaryIncludes = secondaryLower.includes(query);

      if (!startsWith && !includes && !secondaryIncludes) {
        return null;
      }

      return {
        ...suggestion,
        score: startsWith ? 0 : includes ? 1 : 2,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      return left.value.localeCompare(right.value, "zh-Hant");
    })
    .slice(0, AUTOCOMPLETE_LIMIT);
}

function setActiveAutocompleteItem(items, activeIndex) {
  items.forEach((item, index) => {
    item.classList.toggle("is-active", index === activeIndex);
  });
}

function selectAutocompleteSuggestion(inputElement, menuElement, value) {
  inputElement.value = value;
  closeAutocomplete(menuElement);
  inputElement.focus();
}

function closeAutocomplete(menuElement) {
  menuElement.hidden = true;
  menuElement.innerHTML = "";
}
