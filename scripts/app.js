const state = {
  allCars: [],
  filteredCars: [],
  favoritesOnly: false,
  favoritesSet: new Set(),
};

const elements = {
  grid: document.getElementById("grid"),
  resultsCount: document.getElementById("resultsCount"),
  yearSpan: document.getElementById("year"),
  searchInput: document.getElementById("searchInput"),
  makeSelect: document.getElementById("makeSelect"),
  typeSelect: document.getElementById("typeSelect"),
  yearMin: document.getElementById("yearMin"),
  yearMax: document.getElementById("yearMax"),
  priceMin: document.getElementById("priceMin"),
  priceMax: document.getElementById("priceMax"),
  sortSelect: document.getElementById("sortSelect"),
  resetButton: document.getElementById("resetButton"),
  favoritesButton: document.getElementById("favoritesButton"),
  favoritesCount: document.getElementById("favoritesCount"),
  modal: document.getElementById("detailModal"),
  modalContent: document.getElementById("modalContent"),
};

function loadFavoritesFromStorage() {
  const stored = localStorage.getItem("favorites");
  try {
    const parsed = stored ? JSON.parse(stored) : [];
    state.favoritesSet = new Set(parsed);
  } catch {
    state.favoritesSet = new Set();
  }
  updateFavoritesCount();
}

function saveFavoritesToStorage() {
  localStorage.setItem("favorites", JSON.stringify(Array.from(state.favoritesSet)));
  updateFavoritesCount();
}

function updateFavoritesCount() {
  elements.favoritesCount.textContent = String(state.favoritesSet.size);
}

function toggleFavorite(carId) {
  if (state.favoritesSet.has(carId)) {
    state.favoritesSet.delete(carId);
  } else {
    state.favoritesSet.add(carId);
  }
  saveFavoritesToStorage();
  render();
}

function buildMakeOptions() {
  const makes = Array.from(new Set(state.allCars.map(c => c.make))).sort();
  for (const make of makes) {
    const option = document.createElement("option");
    option.value = make;
    option.textContent = make;
    elements.makeSelect.appendChild(option);
  }
}

function attachEventListeners() {
  const filterInputs = [
    elements.searchInput,
    elements.makeSelect,
    elements.typeSelect,
    elements.yearMin,
    elements.yearMax,
    elements.priceMin,
    elements.priceMax,
    elements.sortSelect,
  ];
  for (const input of filterInputs) {
    input.addEventListener("input", render);
    input.addEventListener("change", render);
  }

  elements.resetButton.addEventListener("click", () => {
    elements.searchInput.value = "";
    elements.makeSelect.value = "";
    elements.typeSelect.value = "";
    elements.yearMin.value = "";
    elements.yearMax.value = "";
    elements.priceMin.value = "";
    elements.priceMax.value = "";
    elements.sortSelect.value = "relevance";
    state.favoritesOnly = false;
    elements.favoritesButton.setAttribute("aria-pressed", "false");
    elements.favoritesButton.classList.remove("active");
    render();
  });

  elements.favoritesButton.addEventListener("click", () => {
    state.favoritesOnly = !state.favoritesOnly;
    elements.favoritesButton.setAttribute("aria-pressed", String(state.favoritesOnly));
    elements.favoritesButton.classList.toggle("active", state.favoritesOnly);
    render();
  });

  // Modal close handlers
  elements.modal.addEventListener("click", (e) => {
    const target = e.target;
    if (target.closest("[data-close]")) {
      closeModal();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

function openModal(html) {
  elements.modalContent.innerHTML = html;
  elements.modal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  elements.modal.setAttribute("aria-hidden", "true");
}

function currency(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function matchesQuery(car, query) {
  if (!query) return true;
  const hay = `${car.make} ${car.model} ${car.type} ${car.fuel} ${car.transmission} ${car.drivetrain}`.toLowerCase();
  return hay.includes(query.toLowerCase());
}

function applyFilters() {
  const q = elements.searchInput.value.trim();
  const make = elements.makeSelect.value;
  const type = elements.typeSelect.value;
  const yearMin = Number(elements.yearMin.value) || -Infinity;
  const yearMax = Number(elements.yearMax.value) || Infinity;
  const priceMin = Number(elements.priceMin.value) || -Infinity;
  const priceMax = Number(elements.priceMax.value) || Infinity;

  let list = state.allCars.filter(car =>
    matchesQuery(car, q) &&
    (!make || car.make === make) &&
    (!type || car.type === type) &&
    car.year >= yearMin && car.year <= yearMax &&
    car.price >= priceMin && car.price <= priceMax
  );

  if (state.favoritesOnly) {
    list = list.filter(c => state.favoritesSet.has(c.id));
  }

  const sort = elements.sortSelect.value;
  switch (sort) {
    case "price-asc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list.sort((a, b) => b.price - a.price);
      break;
    case "year-desc":
      list.sort((a, b) => b.year - a.year);
      break;
    case "mileage-asc":
      list.sort((a, b) => a.mileage - b.mileage);
      break;
    default:
      // relevance: leave as-is (dataset order)
      break;
  }

  state.filteredCars = list;
}

function renderCard(car) {
  const isFav = state.favoritesSet.has(car.id);
  const imgSrc = car.image || "/assets/images/placeholder.svg";
  const html = `
    <article class="card" data-id="${car.id}">
      <div class="card-image">
        <img src="${imgSrc}" alt="${car.year} ${car.make} ${car.model}">
      </div>
      <div class="card-body">
        <h3 class="card-title">${car.year} ${car.make} ${car.model}</h3>
        <div class="price">${currency(car.price)}</div>
        <div class="meta">${car.mileage.toLocaleString()} mi • ${car.type} • ${car.transmission}</div>
        <div class="card-actions">
          <button class="favorite-btn ${isFav ? "active" : ""}" data-fav="${car.id}" aria-pressed="${isFav}">${isFav ? "★ Favorited" : "☆ Favorite"}</button>
          <span class="meta">${car.location || ""}</span>
        </div>
      </div>
    </article>
  `;
  return html;
}

function render() {
  applyFilters();
  elements.resultsCount.textContent = String(state.filteredCars.length);
  const cards = state.filteredCars.map(renderCard).join("");
  elements.grid.innerHTML = cards;

  // Bind dynamic events
  elements.grid.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const carId = btn.getAttribute("data-fav");
      toggleFavorite(carId);
    });
  });
  elements.grid.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const car = state.allCars.find(c => String(c.id) === String(id));
      if (!car) return;
      openModal(renderDetail(car));
    });
  });
}

function renderDetail(car) {
  const imgSrc = car.image || "/assets/images/placeholder.svg";
  const isFav = state.favoritesSet.has(car.id);
  return `
    <div style="display:grid; grid-template-columns: 1fr; gap: 14px;">
      <img src="${imgSrc}" alt="${car.year} ${car.make} ${car.model}" style="width:100%; border-radius:12px; border:1px solid var(--border); background:#0f141b;">
      <div style="display:grid; gap: 8px;">
        <h2 id="modalTitle" style="margin:0;">${car.year} ${car.make} ${car.model}</h2>
        <div class="price" style="font-size:20px;">${currency(car.price)}</div>
        <div class="meta">${car.mileage.toLocaleString()} mi • ${car.type} • ${car.transmission} • ${car.fuel}</div>
        <div class="meta">Color: ${car.color} • Drivetrain: ${car.drivetrain} • ${car.location || ""}</div>
        <div>
          <button class="favorite-btn ${isFav ? "active" : ""}" data-fav="${car.id}" aria-pressed="${isFav}">${isFav ? "★ Favorited" : "☆ Favorite"}</button>
        </div>
      </div>
    </div>
  `;
}

async function init() {
  elements.yearSpan.textContent = String(new Date().getFullYear());
  loadFavoritesFromStorage();
  attachEventListeners();

  try {
    const response = await fetch("/data/cars.json", { cache: "no-cache" });
    const data = await response.json();
    state.allCars = data;
    buildMakeOptions();
    render();
  } catch (err) {
    console.error("Failed to load car data", err);
    elements.grid.innerHTML = `<div class="meta">Failed to load data.</div>`;
  }
}

init();

