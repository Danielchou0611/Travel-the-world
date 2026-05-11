const DEFAULT_API_BASE = "http://127.0.0.1:8000/api";
const API_BASE_STORAGE_KEY = "travel-world-api-base";
const ROUTE_HISTORY_KEY = "japan-spot-route-history";
const AUTOCOMPLETE_LIMIT = 8;
const ALL_POI_PAGE_SIZE = 5000;
const INTEREST_PRESETS = [
  ["歷史", "歷史古蹟"],
  ["藝術", "藝術展覽"],
  ["自然", "自然風景"],
  ["打卡", "熱門打卡"],
  ["戶外", "戶外活動"],
  ["室內", "室內景點"],
  ["親子", "親子友善"],
  ["科學", "科學知識"],
  ["購物", "購物逛街"],
  ["溫泉", "溫泉放鬆"],
  ["宗教", "宗教文化"],
];

const state = {
  apiBase: readApiBase(),
  allRows: [],
  browseRows: [],
  recommendationRows: [],
  displayedRows: [],
  poiById: new Map(),
  poiDetailById: new Map(),
  metadata: { regions: [], categories: [], poi_count: 0 },
  regions: [],
  categories: [],
  interestOptions: [],
  selectedRegion: "ALL",
  selectedCategory: "",
  searchTerm: "",
  sortKey: "-static_score",
  selectedSpotId: null,
  expandedSpotIds: new Set(),
  selectedRecommendationId: null,
  map: null,
  markerLayer: null,
  markersById: new Map(),
  routeHistory: [],
  locationSuggestions: [],
  activeView: "browse",
  loading: false,
  preferenceForm: {
    userId: "1",
    travelRegion: "",
    preferredCategory: "",
    topK: 5,
    interestPreferences: {},
  },
  savedProfile: null,
  lastRecommendationMode: null,
};

const elements = {
  apiBaseInput: document.querySelector("#apiBaseInput"),
  applyApiBaseButton: document.querySelector("#applyApiBaseButton"),
  refreshDataButton: document.querySelector("#refreshDataButton"),
  dataStatus: document.querySelector("#dataStatus"),
  totalRegions: document.querySelector("#totalRegions"),
  totalSpots: document.querySelector("#totalSpots"),
  visibleSpots: document.querySelector("#visibleSpots"),
  recommendationCount: document.querySelector("#recommendationCount"),
  currentRegionCount: document.querySelector("#currentRegionCount"),
  regionList: document.querySelector("#regionList"),
  searchInput: document.querySelector("#searchInput"),
  categorySelect: document.querySelector("#categorySelect"),
  sortSelect: document.querySelector("#sortSelect"),
  resetBrowseButton: document.querySelector("#resetBrowseButton"),
  browseModeButton: document.querySelector("#browseModeButton"),
  recommendationModeButton: document.querySelector("#recommendationModeButton"),
  recommendationPanel: document.querySelector("#recommendationPanel"),
  recommendationSummary: document.querySelector("#recommendationSummary"),
  recommendationStatus: document.querySelector("#recommendationStatus"),
  userIdInput: document.querySelector("#userIdInput"),
  preferenceRegionSelect: document.querySelector("#preferenceRegionSelect"),
  preferenceCategorySelect: document.querySelector("#preferenceCategorySelect"),
  topKSelect: document.querySelector("#topKSelect"),
  interestControls: document.querySelector("#interestControls"),
  loadPreferenceButton: document.querySelector("#loadPreferenceButton"),
  savePreferenceButton: document.querySelector("#savePreferenceButton"),
  recommendDirectButton: document.querySelector("#recommendDirectButton"),
  recommendStoredButton: document.querySelector("#recommendStoredButton"),
  preferenceStatus: document.querySelector("#preferenceStatus"),
  savedProfilePreview: document.querySelector("#savedProfilePreview"),
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

bootstrap().catch((error) => {
  console.error(error);
  setDataStatus(`資料載入失敗：${error.message}`);
  elements.cardGrid.innerHTML = `
    <div class="empty-state">
      <h3>資料載入失敗</h3>
      <p>請確認 backend API 已啟動，且 API Base 設定正確。</p>
    </div>
  `;
});

async function bootstrap() {
  elements.apiBaseInput.value = state.apiBase;
  state.routeHistory = readRouteHistory();

  bindEvents();
  renderInterestControls();
  initializeMap();
  renderRouteHistory();

  await reloadAllData();
}

function bindEvents() {
  const refreshBrowseDebounced = debounce(() => {
    refreshBrowseRows().catch(handleAsyncError);
  }, 250);

  elements.applyApiBaseButton.addEventListener("click", wrapAsync(async () => {
    state.apiBase = normalizeApiBase(elements.apiBaseInput.value);
    persistApiBase(state.apiBase);
    await reloadAllData();
  }));

  elements.refreshDataButton.addEventListener("click", wrapAsync(async () => {
    await reloadAllData();
  }));

  elements.searchInput.addEventListener("input", (event) => {
    state.searchTerm = event.target.value.trim();
    refreshBrowseDebounced();
  });

  elements.categorySelect.addEventListener("change", wrapAsync(async (event) => {
    state.selectedCategory = event.target.value;
    await refreshBrowseRows();
  }));

  elements.sortSelect.addEventListener("change", wrapAsync(async (event) => {
    state.sortKey = event.target.value;
    await refreshBrowseRows();
  }));

  elements.resetBrowseButton.addEventListener("click", wrapAsync(async () => {
    state.selectedRegion = "ALL";
    state.selectedCategory = "";
    state.searchTerm = "";
    state.sortKey = "-static_score";
    elements.searchInput.value = "";
    elements.categorySelect.value = "";
    elements.sortSelect.value = "-static_score";
    renderRegionList();
    await refreshBrowseRows();
  }));

  elements.browseModeButton.addEventListener("click", () => {
    state.activeView = "browse";
    renderDashboard();
  });

  elements.recommendationModeButton.addEventListener("click", () => {
    if (!state.recommendationRows.length) {
      setRecommendationStatus("目前還沒有推薦結果，先送出推薦查詢。");
      return;
    }
    state.activeView = "recommendation";
    renderDashboard();
  });

  elements.userIdInput.addEventListener("input", (event) => {
    state.preferenceForm.userId = event.target.value.trim();
  });

  elements.preferenceRegionSelect.addEventListener("change", (event) => {
    state.preferenceForm.travelRegion = event.target.value;
    maybeRefreshRecommendations();
  });

  elements.preferenceCategorySelect.addEventListener("change", (event) => {
    state.preferenceForm.preferredCategory = event.target.value;
    maybeRefreshRecommendations();
  });

  elements.topKSelect.addEventListener("change", (event) => {
    state.preferenceForm.topK = Number(event.target.value) || 5;
    maybeRefreshRecommendations();
  });

  elements.loadPreferenceButton.addEventListener("click", wrapAsync(async () => {
    await loadUserPreference();
  }));

  elements.savePreferenceButton.addEventListener("click", wrapAsync(async () => {
    await saveUserPreference();
  }));

  elements.recommendDirectButton.addEventListener("click", wrapAsync(async () => {
    await requestRecommendations({ useStoredProfile: false });
  }));

  elements.recommendStoredButton.addEventListener("click", wrapAsync(async () => {
    await requestRecommendations({ useStoredProfile: true });
  }));

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

async function reloadAllData() {
  setDataStatus("正在同步 metadata 與景點資料...");
  state.loading = true;
  state.recommendationRows = [];
  state.activeView = "browse";
  state.lastRecommendationMode = null;

  const metadata = await apiGet("/metadata/");
  state.metadata = metadata;
  state.categories = Array.isArray(metadata.categories) ? metadata.categories : [];
  state.regions = buildRegionSummaryFromMetadata(metadata.regions || []);

  syncPreferenceFormWithMetadata();
  renderCategoryOptions();
  renderPreferenceSelectOptions();
  renderRegionList();

  await refreshBrowseRows();

  setDataStatus(`已同步 metadata，景點總數 ${numberFormatter.format(metadata.poi_count || 0)}。`);
  state.loading = false;
}

async function refreshBrowseRows() {
  setDataStatus("正在從 API 更新景點列表...");

  const params = {
    ordering: state.sortKey,
    page_size: ALL_POI_PAGE_SIZE,
  };

  if (state.selectedRegion !== "ALL") {
    params.region = state.selectedRegion;
  }
  if (state.selectedCategory) {
    params.category = state.selectedCategory;
  }
  if (state.searchTerm) {
    params.search = state.searchTerm;
  }

  const rows = await fetchPoiPage(params);
  state.browseRows = rows;

  if (!state.allRows.length || state.selectedRegion === "ALL") {
    state.allRows = rows;
  }

  for (const row of rows) {
    state.poiById.set(row.id, { ...(state.poiById.get(row.id) || {}), ...row });
  }

  state.locationSuggestions = buildLocationSuggestions(state.browseRows);
  state.interestOptions = buildInterestOptions([
    ...state.browseRows,
    ...state.recommendationRows,
  ]);
  renderInterestControls();

  if (state.activeView === "browse" || !state.recommendationRows.length) {
    state.activeView = "browse";
  }

  renderDashboard();
  setDataStatus(`景點列表已更新，目前瀏覽 ${numberFormatter.format(rows.length)} 筆資料。`);
}

async function fetchAllPois(params = {}) {
  const rows = [];
  let url = buildApiUrl("/pois/", params);

  while (url) {
    const response = await fetchJson(url);
    const pageRows = Array.isArray(response.results) ? response.results : Array.isArray(response) ? response : [];
    rows.push(...pageRows.map(normalizePoiRow));
    url = response.next ? resolveNextUrl(response.next) : null;
  }

  return rows;
}

async function fetchPoiPage(params = {}) {
  const response = await fetchJson(buildApiUrl("/pois/", params));
  const pageRows = Array.isArray(response.results) ? response.results : Array.isArray(response) ? response : [];
  return pageRows.map(normalizePoiRow);
}

function resolveNextUrl(next) {
  try {
    return new URL(next, state.apiBase.endsWith("/") ? state.apiBase : `${state.apiBase}/`).toString();
  } catch (error) {
    console.warn("Failed to resolve next page url", error);
    return null;
  }
}

function syncPreferenceFormWithMetadata() {
  if (!state.preferenceForm.travelRegion && state.metadata.regions?.length) {
    state.preferenceForm.travelRegion = state.metadata.regions[0];
  }
}

function renderCategoryOptions() {
  elements.categorySelect.innerHTML = `
    <option value="">全部類別</option>
    ${state.categories
      .map((category) => `<option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>`)
      .join("")}
  `;
  elements.categorySelect.value = state.selectedCategory;
}

function renderPreferenceSelectOptions() {
  const regionOptions = state.metadata.regions
    .map((region) => `<option value="${escapeAttribute(region)}">${escapeHtml(region)}</option>`)
    .join("");
  const categoryOptions = state.categories
    .map((category) => `<option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>`)
    .join("");

  elements.preferenceRegionSelect.innerHTML = regionOptions;
  elements.preferenceCategorySelect.innerHTML = `
    <option value="">不限類別</option>
    ${categoryOptions}
  `;

  if (state.preferenceForm.travelRegion) {
    elements.preferenceRegionSelect.value = state.preferenceForm.travelRegion;
  }
  elements.preferenceCategorySelect.value = state.preferenceForm.preferredCategory;
}

function renderInterestControls() {
  const markup = state.interestOptions
    .map(
      ({ key, label }) => `
        <label class="interest-control">
          <span>${escapeHtml(label)}</span>
          <div class="interest-input-row">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value="${escapeAttribute(String(state.preferenceForm.interestPreferences[key] ?? 0))}"
              data-interest-key="${escapeAttribute(key)}"
            />
            <output>${formatDecimal(state.preferenceForm.interestPreferences[key] ?? 0, 1)}</output>
          </div>
        </label>
      `
    )
    .join("");

  elements.interestControls.innerHTML = markup;

  for (const input of elements.interestControls.querySelectorAll("input[type='range']")) {
    input.addEventListener("input", (event) => {
      const slider = event.currentTarget;
      const key = slider.dataset.interestKey;
      const value = Number(slider.value) || 0;
      state.preferenceForm.interestPreferences[key] = value;
      slider.nextElementSibling.textContent = formatDecimal(value, 1);
      maybeRefreshRecommendations();
    });
  }
}

function renderRegionList() {
  const totalCount = state.metadata.poi_count || state.allRows.length || 0;
  const allButton = `
    <button class="region-button ${state.selectedRegion === "ALL" ? "active" : ""}" data-region="ALL">
      <strong>全部地區</strong>
      <span>${numberFormatter.format(totalCount)} 筆景點</span>
    </button>
  `;

  const regionButtons = state.regions
    .map(
      ({ region, count }) => `
        <button class="region-button ${state.selectedRegion === region ? "active" : ""}" data-region="${escapeAttribute(region)}">
          <strong>${escapeHtml(region)}</strong>
          <span>${count === null ? "用 API 篩選" : `${numberFormatter.format(count)} 筆景點`}</span>
        </button>
      `
    )
    .join("");

  elements.regionList.innerHTML = allButton + regionButtons;

  for (const button of elements.regionList.querySelectorAll(".region-button")) {
    button.addEventListener("click", wrapAsync(async () => {
      state.selectedRegion = button.dataset.region;
      renderRegionList();
      await refreshBrowseRows();
    }));
  }
}

function renderDashboard() {
  const rows = state.activeView === "recommendation" ? state.recommendationRows : state.browseRows;
  state.displayedRows = rows;

  if (!rows.some((row) => row.id === state.selectedSpotId)) {
    state.selectedSpotId = rows[0]?.id ?? null;
  }

  elements.totalRegions.textContent = numberFormatter.format(state.regions.length);
  elements.totalSpots.textContent = numberFormatter.format(state.metadata.poi_count || state.allRows.length || 0);
  elements.visibleSpots.textContent = numberFormatter.format(state.browseRows.length);
  elements.recommendationCount.textContent = numberFormatter.format(state.recommendationRows.length);
  elements.currentRegionCount.textContent =
    state.selectedRegion === "ALL"
      ? `${numberFormatter.format(state.metadata.poi_count || state.allRows.length || 0)} 筆`
      : `${numberFormatter.format(countRegionRows(state.selectedRegion))} 筆`;

  elements.contentTitle.textContent =
    state.activeView === "recommendation"
      ? "推薦結果"
      : state.selectedRegion === "ALL"
        ? "全部地區"
        : state.selectedRegion;
  elements.contentSubtitle.textContent = buildSubtitle();
  elements.resultsMeta.textContent = buildResultsMeta();

  elements.browseModeButton.classList.toggle("active", state.activeView === "browse");
  elements.recommendationModeButton.classList.toggle("active", state.activeView === "recommendation");
  elements.recommendationPanel.hidden = state.recommendationRows.length === 0;

  renderRecommendationSummary();
  renderCards(rows);
  renderMap(rows);
}

function renderRecommendationSummary() {
  if (!state.recommendationRows.length) {
    elements.recommendationSummary.innerHTML = `
      <p class="empty-inline">尚未送出推薦查詢。</p>
    `;
    return;
  }

  const topRow = state.recommendationRows[0];
  const summaryItems = [
    `查詢結果 ${numberFormatter.format(state.recommendationRows.length)} 筆`,
    `Top 1：${topRow.name}`,
    `分數 ${formatDecimal(topRow.final_score ?? 0, 4)}`,
  ];

  elements.recommendationSummary.innerHTML = summaryItems
    .map((item) => `<span class="summary-chip">${escapeHtml(item)}</span>`)
    .join("");
}

function renderCards(rows) {
  if (!rows.length) {
    elements.cardGrid.innerHTML = `
      <div class="empty-state">
        <h3>沒有符合條件的資料</h3>
        <p>可以試著調整地區、類別、搜尋字詞，或重新送出推薦查詢。</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const row of rows) {
    const poiDetail = state.poiDetailById.get(row.id) || {};
    const poiBase = state.poiById.get(row.id) || {};
    const detailRow = {
      ...poiBase,
      ...poiDetail,
      ...row,
      final_score: row.final_score ?? poiDetail.final_score ?? poiBase.final_score,
      interest_match: row.interest_match ?? poiDetail.interest_match ?? poiBase.interest_match,
    };
    const card = elements.cardTemplate.content.firstElementChild.cloneNode(true);
    const image = card.querySelector(".spot-image");
    const detailToggle = card.querySelector(".detail-toggle");
    const details = card.querySelector(".spot-details");
    const isExpanded = state.expandedSpotIds.has(row.id);
    const isSelected = state.selectedSpotId === row.id;

    image.src = detailRow.image_url || fallbackImage(detailRow.name);
    image.alt = detailRow.name;
    image.addEventListener("error", () => {
      image.src = fallbackImage(detailRow.name);
    });

    card.querySelector(".spot-region").textContent = detailRow.region;
    card.querySelector(".spot-name").textContent = detailRow.name;
    card.querySelector(".spot-category").textContent = detailRow.category || "未分類";
    card.querySelector(".metric-score-label").textContent =
      state.activeView === "recommendation" ? "Final Score" : "Static Score";
    card.querySelector(".metric-score").textContent = formatDecimal(
      state.activeView === "recommendation"
        ? (detailRow.final_score ?? detailRow.static_score)
        : detailRow.static_score,
      4
    );
    card.querySelector(".metric-rating").textContent = formatDecimal(detailRow.google_rating, 1);
    card.querySelector(".metric-reviews").textContent = numberFormatter.format(detailRow.review_count || 0);
    card.querySelector(".metric-station").textContent = detailRow.station_anchor || "未提供";
    card.querySelector(".metric-distance").textContent =
      detailRow.distance_to_station_km !== null
        ? `${formatDecimal(detailRow.distance_to_station_km, 1)} km`
        : "未提供";
    card.querySelector(".detail-interest-tags").textContent = detailRow.interest_tags || "未提供";
    card.querySelector(".detail-interest-match").textContent = formatDecimal(detailRow.interest_match, 4);
    card.querySelector(".detail-final-score").textContent = formatDecimal(
      detailRow.final_score ?? detailRow.static_score,
      4
    );
    card.querySelector(".detail-rating-norm").textContent = formatDecimal(detailRow.rating_norm, 4);
    card.querySelector(".detail-review-norm").textContent = formatDecimal(detailRow.review_norm, 4);
    card.querySelector(".detail-station-efficiency").textContent = formatDecimal(
      detailRow.station_distance_efficiency,
      4
    );
    card.querySelector(".detail-coordinates").textContent =
      detailRow.lat !== null && detailRow.lng !== null
        ? `${formatDecimal(detailRow.lat, 4)}, ${formatDecimal(detailRow.lng, 4)}`
        : "未提供";
    card.querySelector(".detail-source-id").textContent = detailRow.id || "未提供";
    card.querySelector(".detail-google-name").textContent = detailRow.google_name_matched || "未提供";
    card.querySelector(".detail-all-fields").innerHTML = buildAllFieldsMarkup(detailRow);

    card.dataset.spotId = row.id;
    card.classList.toggle("is-selected", isSelected);
    details.hidden = !isExpanded;
    detailToggle.textContent = isExpanded ? "收合詳細資訊" : "展開更多資訊";

    card.addEventListener("click", wrapAsync(async (event) => {
      if (event.target === detailToggle) {
        return;
      }
      await focusSpot(row.id, { openPopup: true, expand: false, fetchDetail: true });
      autofillDestination(detailRow);
    }));

    card.addEventListener("keydown", wrapAsync(async (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        await focusSpot(row.id, { openPopup: true, expand: false, fetchDetail: true });
        autofillDestination(detailRow);
      }
    }));

    detailToggle.addEventListener("click", wrapAsync(async (event) => {
      event.stopPropagation();
      await toggleDetails(row.id);
    }));

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
  elements.mapMeta.textContent = "同步顯示目前結果";
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
    : "目前結果沒有可用座標，因此地圖上沒有 marker。";

  if (!rowsWithCoords.length) {
    return;
  }

  const latLngs = [];

  for (const row of rowsWithCoords) {
    const marker = window.L.circleMarker([row.lat, row.lng], {
      radius: state.selectedSpotId === row.id ? 9 : 6,
      weight: 2,
      color: state.selectedSpotId === row.id ? "#6f2618" : "#ffffff",
      fillColor: state.selectedSpotId === row.id ? "#b44f2d" : "#d57a49",
      fillOpacity: 0.92,
    });

    marker.bindPopup(buildPopupHtml(row), { className: "map-popup" });
    marker.on("click", wrapAsync(async () => {
      await focusSpot(row.id, { openPopup: false, expand: true, fetchDetail: true });
    }));

    marker.addTo(state.markerLayer);
    state.markersById.set(row.id, marker);
    latLngs.push([row.lat, row.lng]);
  }

  const selectedMarker = state.markersById.get(state.selectedSpotId);
  if (selectedMarker) {
    selectedMarker.openPopup();
  }

  const bounds = window.L.latLngBounds(latLngs);
  state.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
}

async function focusSpot(spotId, options = {}) {
  state.selectedSpotId = spotId;

  if (options.expand) {
    state.expandedSpotIds.add(spotId);
  }
  if (options.fetchDetail) {
    await ensurePoiDetail(spotId);
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

async function toggleDetails(spotId) {
  if (state.expandedSpotIds.has(spotId)) {
    state.expandedSpotIds.delete(spotId);
  } else {
    state.expandedSpotIds.add(spotId);
    await ensurePoiDetail(spotId);
  }

  state.selectedSpotId = spotId;
  renderDashboard();
}

async function ensurePoiDetail(spotId) {
  if (state.poiDetailById.has(spotId)) {
    return state.poiDetailById.get(spotId);
  }

  const detail = normalizePoiRow(await apiGet(`/pois/${encodeURIComponent(spotId)}/`));
  const currentRecommendation = state.recommendationRows.find((item) => item.id === spotId) || {};
  const merged = {
    ...(state.poiById.get(spotId) || {}),
    ...detail,
    final_score: currentRecommendation.final_score ?? detail.final_score,
    interest_match: currentRecommendation.interest_match ?? detail.interest_match,
  };
  state.poiDetailById.set(spotId, merged);
  state.poiById.set(spotId, merged);
  return merged;
}

async function loadUserPreference() {
  const userId = state.preferenceForm.userId;
  if (!userId) {
    setPreferenceStatus("請先輸入 user id。");
    return;
  }

  try {
    setPreferenceStatus("正在讀取已儲存的使用者偏好...");
    const profile = await apiGet(`/users/${encodeURIComponent(userId)}/preferences/`);
    applyProfileToForm(profile);
    state.savedProfile = profile;
    renderSavedProfile();
    setPreferenceStatus(`已載入 user ${userId} 的偏好設定。`);
  } catch (error) {
    state.savedProfile = null;
    renderSavedProfile();
    throw error;
  }
}

async function saveUserPreference() {
  const userId = state.preferenceForm.userId;
  if (!userId) {
    setPreferenceStatus("請先輸入 user id，才能儲存偏好。");
    return;
  }

  const payload = {
    travel_region: state.preferenceForm.travelRegion,
    preference_profile: buildPreferencePayload(),
  };

  setPreferenceStatus("正在儲存使用者偏好...");
  const profile = await apiRequest(`/users/${encodeURIComponent(userId)}/preferences/`, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
    body: JSON.stringify(payload),
  });
  state.savedProfile = profile;
  renderSavedProfile();
  setPreferenceStatus(`已儲存 user ${userId} 的偏好設定。`);
}

async function requestRecommendations({ useStoredProfile }) {
  const payload = {
    region: state.preferenceForm.travelRegion || "",
    category: state.preferenceForm.preferredCategory || "",
    top_k: state.preferenceForm.topK,
  };

  if (useStoredProfile) {
    if (!state.preferenceForm.userId) {
      setRecommendationStatus("請先輸入 user id，才能用已儲存偏好查推薦。");
      return;
    }
    payload.user_id = Number(state.preferenceForm.userId);
  } else {
    payload.preferences = buildPreferencePayload();
    if (!Object.keys(payload.preferences).length) {
      setRecommendationStatus("請至少設定一個興趣權重，再用表單偏好查推薦。");
      return;
    }
  }

  setRecommendationStatus("正在向 recommendation API 查詢...");
  const response = await apiRequest("/recommendations/", {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(payload),
  });

  state.recommendationRows = response.results.map(normalizeRecommendationRow);
  state.activeView = "recommendation";
  state.lastRecommendationMode = useStoredProfile ? "stored" : "direct";
  renderDashboard();

  const preferenceSummary = Object.keys(response.preferences || {}).length
    ? Object.entries(response.preferences)
        .map(([key, value]) => `${key}:${formatDecimal(value, 1)}`)
        .join(" / ")
    : "未提供偏好";

  setRecommendationStatus(
    `推薦完成，共 ${numberFormatter.format(response.count || state.recommendationRows.length)} 筆。偏好：${preferenceSummary}`
  );
}

function normalizeRecommendationRow(item) {
  const baseRow = state.poiById.get(item.id) || {};
  const scoreBreakdown = item.score_breakdown || {};

  return normalizePoiRow({
    ...baseRow,
    ...item,
    static_score: scoreBreakdown.static_score ?? baseRow.static_score,
    interest_match: scoreBreakdown.interest_match ?? baseRow.interest_match,
    final_score: item.final_score,
  });
}

function applyProfileToForm(profile) {
  state.preferenceForm.travelRegion = profile.travel_region || state.preferenceForm.travelRegion;
  state.preferenceForm.interestPreferences = {
    ...Object.fromEntries(state.interestOptions.map(({ key }) => [key, 0])),
    ...(profile.preference_profile || {}),
  };

  elements.preferenceRegionSelect.value = state.preferenceForm.travelRegion;
  renderInterestControls();
  maybeRefreshRecommendations();
}

function renderSavedProfile() {
  if (!state.savedProfile) {
    elements.savedProfilePreview.innerHTML = `<p class="empty-inline">尚未載入或儲存任何 profile。</p>`;
    return;
  }

  const tags = Object.entries(state.savedProfile.preference_profile || {})
    .map(([key, value]) => `${key}:${formatDecimal(value, 1)}`)
    .join(" / ");

  elements.savedProfilePreview.innerHTML = `
    <p><strong>User ID：</strong>${escapeHtml(String(state.savedProfile.user_id))}</p>
    <p><strong>旅遊地區：</strong>${escapeHtml(state.savedProfile.travel_region || "未設定")}</p>
    <p><strong>偏好：</strong>${escapeHtml(tags || "未設定")}</p>
  `;
}

function buildPreferencePayload() {
  return Object.fromEntries(
    Object.entries(state.preferenceForm.interestPreferences)
      .filter(([, value]) => Number(value) > 0)
      .map(([key, value]) => [key, Number(value)])
  );
}

function maybeRefreshRecommendations() {
  if (state.activeView !== "recommendation" || !state.lastRecommendationMode) {
    return;
  }

  debouncedRecommendationRefresh();
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

function countRegionRows(region) {
  if (state.selectedRegion === region) {
    return state.browseRows.length;
  }

  const summary = state.regions.find((item) => item.region === region);
  return summary?.count ?? 0;
}

function buildRegionSummaryFromMetadata(metadataRegions) {
  return metadataRegions
    .map((region) => ({ region, count: null }))
    .sort((left, right) => left.region.localeCompare(right.region, "zh-Hant"));
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

function buildInterestOptions(rows) {
  const options = [...INTEREST_PRESETS.map(([key, label]) => ({ key, label }))];
  const existing = new Set(options.map((item) => item.key));

  for (const row of rows) {
    for (const interest of row.interests) {
      if (!existing.has(interest)) {
        options.push({ key: interest, label: interest });
        existing.add(interest);
      }
    }
  }

  return options;
}

function buildSubtitle() {
  if (state.activeView === "recommendation") {
    return `地區：${state.preferenceForm.travelRegion || "未設定"}，類別：${state.preferenceForm.preferredCategory || "不限"}，Top ${state.preferenceForm.topK}`;
  }

  const sortLabel =
    {
      "-static_score": "靜態推薦分數",
      "-google_rating": "Google 評分",
      "-review_count": "評論數",
      "static_score": "靜態推薦分數（低到高）",
      "google_rating": "Google 評分（低到高）",
      "review_count": "評論數（低到高）",
    }[state.sortKey] || state.sortKey;

  const categoryText = state.selectedCategory || "全部類別";
  const searchText = state.searchTerm ? `，搜尋「${state.searchTerm}」` : "";
  return `類別：${categoryText}，排序：${sortLabel}${searchText}`;
}

function buildResultsMeta() {
  if (state.activeView === "recommendation") {
    return `推薦模式顯示 ${numberFormatter.format(state.recommendationRows.length)} 筆景點，可切回「全部景點」查看 API 篩選結果。`;
  }

  const selectedLabel = state.selectedRegion === "ALL" ? "全部地區" : state.selectedRegion;
  return `${selectedLabel} 目前透過 API 載入 ${numberFormatter.format(state.browseRows.length)} 筆資料。`;
}

function normalizePoiRow(row) {
  const interests = Array.isArray(row.interests)
    ? row.interests.filter(Boolean)
    : typeof row.interests === "string"
      ? row.interests
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  return {
    ...row,
    id: String(row.id ?? row.poi_id ?? ""),
    name: row.name || "",
    region: row.region || "",
    category: row.category || "",
    interests,
    interest_tags: interests.join("、"),
    google_rating: toNumber(row.google_rating),
    review_count: toNumber(row.review_count) ?? 0,
    interest_match: toNumber(row.interest_match) ?? 0,
    rating_norm: toNumber(row.rating_norm),
    review_norm: toNumber(row.review_norm),
    station_distance_efficiency: toNumber(row.station_distance_efficiency),
    static_score: toNumber(row.static_score),
    final_score: toNumber(row.final_score),
    distance_to_station_km: toNumber(row.distance_to_station_km),
    lat: toNumber(row.lat),
    lng: toNumber(row.lng),
    station_anchor: row.station_anchor || "",
    image_url: row.image_url || "",
    google_name_matched: row.google_name_matched || "",
  };
}

function buildAllFieldsMarkup(row) {
  return Object.keys(row)
    .filter((key) => !["interest_tags"].includes(key))
    .sort((left, right) => left.localeCompare(right))
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
      <p>Static score ${escapeHtml(formatDecimal(row.static_score, 4))}</p>
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

function setDataStatus(message) {
  elements.dataStatus.textContent = message;
}

function setPreferenceStatus(message) {
  elements.preferenceStatus.textContent = message;
}

function setRecommendationStatus(message) {
  elements.recommendationStatus.textContent = message;
}

async function apiGet(path) {
  return fetchJson(buildApiUrl(path), {
    headers: {
      Accept: "application/json",
    },
    method: "GET",
  });
}

async function apiRequest(path, options = {}) {
  const response = await fetchJson(buildApiUrl(path), {
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  return response;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json();
      message = payload.detail || JSON.stringify(payload);
    } catch (error) {
      console.warn("Failed to parse error response", error);
    }
    throw new Error(message);
  }
  return response.json();
}

function buildApiUrl(path, params = {}) {
  const normalizedBase = state.apiBase.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== "" && value !== null && value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

function normalizeApiBase(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_API_BASE;
  }
  return trimmed.replace(/\/+$/, "");
}

function readApiBase() {
  const queryApiBase = new URLSearchParams(window.location.search).get("apiBase");
  return normalizeApiBase(
    queryApiBase || window.localStorage.getItem(API_BASE_STORAGE_KEY) || DEFAULT_API_BASE
  );
}

function persistApiBase(apiBase) {
  window.localStorage.setItem(API_BASE_STORAGE_KEY, apiBase);
}

function escapeHtml(value) {
  return String(value)
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

function debounce(callback, waitMs) {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), waitMs);
  };
}

const debouncedRecommendationRefresh = debounce(() => {
  if (state.lastRecommendationMode === "stored") {
    requestRecommendations({ useStoredProfile: true }).catch(handleAsyncError);
    return;
  }

  if (state.lastRecommendationMode === "direct") {
    requestRecommendations({ useStoredProfile: false }).catch(handleAsyncError);
  }
}, 300);

function wrapAsync(callback) {
  return (...args) => {
    Promise.resolve(callback(...args)).catch(handleAsyncError);
  };
}

function handleAsyncError(error) {
  console.error(error);
  setDataStatus(`操作失敗：${error.message}`);
  setPreferenceStatus(`操作失敗：${error.message}`);
  setRecommendationStatus(`操作失敗：${error.message}`);
}
