/* DOM references */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const clearSelectionsBtn = document.getElementById("clearSelections");
const rtlToggle = document.getElementById("rtlToggle");
const quickGenerateBtn = document.getElementById("quickGenerate");

/* State */
let allProducts = [];
let selectedProducts = [];
let chatHistory = [];
let currentCategory = "";
let currentSearchTerm = "";

/* LocalStorage */
const STORAGE_KEY = "lorealSelectedProducts";

function loadSavedSelections() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveSelections() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProducts));
}

/* Initial placeholder */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category or search to view products
  </div>
`;

/* Load product data */
async function loadProducts() {
  if (allProducts.length) return allProducts;
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return allProducts;
}

/* Helpers */
function isSelected(id) {
  return selectedProducts.some((p) => p.id === id);
}

function renderSelectedProducts() {
  if (!selectedProducts.length) {
    selectedProductsList.innerHTML = `<p>No products selected yet.</p>`;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-pill" data-id="${product.id}">
        <span>${product.name}</span>
        <button class="remove-selected" aria-label="Remove ${product.name}">
          &times;
        </button>
      </div>
    `
    )
    .join("");
}

/* Display product cards */
function displayProducts(products) {
  if (!products.length) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products match your filters. Try a different category or search term.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card ${
      isSelected(product.id) ? "selected" : ""
    }" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="toggle-description" type="button">Details</button>
        <div class="product-description">
          <p>${product.description}</p>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  attachCardEvents();
}

/* Attach events to cards */
function attachCardEvents() {
  productsContainer.querySelectorAll(".product-card").forEach((card) => {
    const id = Number(card.dataset.id);

    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("toggle-description")) return;

      const product = allProducts.find((p) => p.id === id);
      if (!product) return;

      if (isSelected(id)) {
        selectedProducts = selectedProducts.filter((p) => p.id !== id);
        card.classList.remove("selected");
      } else {
        selectedProducts.push(product);
        card.classList.add("selected");
      }

      saveSelections();
      renderSelectedProducts();
    });

    const toggleBtn = card.querySelector(".toggle-description");
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      card.classList.toggle("show-description");
    });
  });
}

/* Apply filters */
function applyFilters() {
  let products = allProducts.slice();

  if (currentCategory) {
    products = products.filter((product) => product.category === currentCategory);
  }

  if (currentSearchTerm) {
    const term = currentSearchTerm.toLowerCase();
    products = products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.brand.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term)
    );
  }

  displayProducts(products);
}

/* Category filter */
categoryFilter.addEventListener("change", async (e) => {
  await loadProducts();
  currentCategory = e.target.value;
  applyFilters();
});

/* Search filter */
productSearch.addEventListener("input", async (e) => {
  await loadProducts();
  currentSearchTerm = e.target.value.trim();
  applyFilters();
});

/* Remove selected product */
selectedProductsList.addEventListener("click", (e) => {
  if (!e.target.classList.contains("remove-selected")) return;

  const pill = e.target.closest(".selected-pill");
  const id = Number(pill.dataset.id);

  selectedProducts = selectedProducts.filter((p) => p.id !== id);
  saveSelections();
  renderSelectedProducts();

  const card = productsContainer.querySelector(`.product-card[data-id="${id}"]`);
  if (card) card.classList.remove("selected");
});

/* Clear selections */
clearSelectionsBtn.addEventListener("click", () => {
  selectedProducts = [];
  saveSelections();
  renderSelectedProducts();

  productsContainer
    .querySelectorAll(".product-card.selected")
    .forEach((card) => card.classList.remove("selected"));
});

/* Worker endpoint */
const WORKER_URL = "https://loreal-routine-worker.saquicpablom1.workers.dev/";

/* Auto-scroll helper */
function scrollChatToBottom() {
  setTimeout(() => {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }, 120);
}

/* ⭐ Generate routine */
generateRoutineBtn.addEventListener("click", async () => {
  if (!selectedProducts.length) {
    chatWindow.innerHTML = `
      <div class="chat-message assistant">
        <p>Please select at least one product before generating a routine.</p>
      </div>
    `;
    scrollChatToBottom();
    return;
  }

  /* ⭐ GENERATE ROUTINE LOADING DOTS */
  chatWindow.innerHTML = `
    <div class="generate-loading">
      <span></span><span></span><span></span>
    </div>
  `;
  scrollChatToBottom();

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "generate_routine",
        products: selectedProducts,
        history: chatHistory,
      }),
    });

    const result = await response.json();
    const routineText = result.routine || "Sorry, I couldn’t generate a routine.";

    chatHistory.push({ role: "assistant", content: routineText });

    chatWindow.querySelector(".generate-loading")?.remove();

    chatWindow.innerHTML = `
      <div class="chat-message assistant">
        <h3>Your Personalized Routine</h3>
        <p>${routineText}</p>
      </div>
    `;
    scrollChatToBottom();
  } catch {
    chatWindow.querySelector(".generate-loading")?.remove();

    chatWindow.innerHTML = `
      <div class="chat-message assistant">
        <p>There was an error generating your routine. Please try again.</p>
      </div>
    `;
    scrollChatToBottom();
  }
});

/* ⭐ Chat follow-up */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("userInput");
  const userMessage = input.value.trim();
  if (!userMessage) return;

  chatHistory.push({ role: "user", content: userMessage });

  /* ⭐ AI TYPING DOTS */
  chatWindow.innerHTML += `
    <div class="chat-message user"><p>${userMessage}</p></div>
    <div class="typing-indicator">
      <span></span><span></span><span></span>
    </div>
  `;
  scrollChatToBottom();

  input.value = "";

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "follow_up",
        history: chatHistory,
        selectedProducts,
      }),
    });

    const result = await response.json();
    const answer =
      result.answer ||
      "I’m not sure, but I can help you think through your routine.";

    chatHistory.push({ role: "assistant", content: answer });

    chatWindow.querySelector(".typing-indicator")?.remove();

    chatWindow.innerHTML += `
      <div class="chat-message assistant"><p>${answer}</p></div>
    `;
    scrollChatToBottom();
  } catch {
    chatWindow.querySelector(".typing-indicator")?.remove();

    chatWindow.innerHTML += `
      <div class="chat-message assistant">
        <p>There was an error answering your question. Please try again.</p>
      </div>
    `;
    scrollChatToBottom();
  }
});

/* RTL toggle */
rtlToggle.addEventListener("click", () => {
  const html = document.documentElement;
  html.dir = html.dir === "rtl" ? "ltr" : "rtl";
});

/* ⭐ Floating Quick Generate Routine Button */
if (quickGenerateBtn) {
  quickGenerateBtn.classList.add("pulse");

  quickGenerateBtn.addEventListener("click", () => {
    generateRoutineBtn.click();

    const chatSection = document.querySelector(".chatbox");
    if (chatSection) {
      chatSection.scrollIntoView({ behavior: "smooth" });
    }

    quickGenerateBtn.classList.add("clicked");
    setTimeout(() => quickGenerateBtn.classList.remove("clicked"), 600);
  });
}

/* Init */
(async function init() {
  await loadProducts();
  selectedProducts = loadSavedSelections();
  renderSelectedProducts();
  applyFilters();
})();
