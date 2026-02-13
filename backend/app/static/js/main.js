const grid = document.getElementById("breedGrid");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const sortSelect = document.getElementById("sortSelect");
const scrollTopBtn = document.getElementById("scrollTopBtn");
const scrollBottomBtn = document.getElementById("scrollBottomBtn");
const breedScrollArea = document.getElementById("breedScrollArea");

const breedModal = document.getElementById("breedModal");
const closeBreedModalBtn = document.getElementById("closeBreedModal");
const modalBreedTitle = document.getElementById("modalBreedTitle");
const modalPreviewGrid = document.getElementById("modalPreviewGrid");
const modalOpenBtn = document.getElementById("modalOpenBtn");
const modalShareBtn = document.getElementById("modalShareBtn");
const modalCopyBtn = document.getElementById("modalCopyBtn");
const toastContainer = document.getElementById("toastContainer");

let allBreeds = [];
let loadingBreeds = false;
let activeBreed = "";

function showToast(message, type = "info") {
    if (!toastContainer) return;

    const styles = {
        info: "bg-slate-900 text-white",
        success: "bg-emerald-600 text-white",
        error: "bg-rose-600 text-white"
    };

    const toast = document.createElement("div");
    toast.className = `translate-y-2 rounded-xl px-4 py-3 text-sm font-medium opacity-0 shadow-lg transition ${styles[type] || styles.info}`;
    toast.innerText = message;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove("translate-y-2", "opacity-0");
    });

    setTimeout(() => {
        toast.classList.add("translate-y-2", "opacity-0");
        setTimeout(() => toast.remove(), 250);
    }, 2200);
}

function createState(type, message, retryHandler) {
    const wrapper = document.createElement("div");
    wrapper.className = "col-span-full rounded-2xl border p-4 dark:border-slate-700";
    wrapper.classList.add(type === "error" ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40");

    const msg = document.createElement("p");
    msg.className = "text-sm text-slate-700 dark:text-slate-300";
    msg.innerText = message;
    wrapper.appendChild(msg);

    if (retryHandler) {
        const retryBtn = document.createElement("button");
        retryBtn.className = "mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300";
        retryBtn.innerText = "Retry";
        retryBtn.onclick = retryHandler;
        wrapper.appendChild(retryBtn);
    }

    return wrapper;
}

function renderBreedSkeleton(count = 8) {
    grid.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement("div");
        skeleton.className = "h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800";
        grid.appendChild(skeleton);
    }
}

function renderRecentSkeleton(count = 5) {
    const container = document.getElementById("recentContainer");
    if (!container) return;

    container.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement("div");
        skeleton.className = "h-10 min-w-[110px] animate-pulse rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800";
        container.appendChild(skeleton);
    }
}

function renderModalPreviewSkeleton() {
    if (!modalPreviewGrid) return;
    modalPreviewGrid.innerHTML = "";
    for (let i = 0; i < 4; i++) {
        const skeleton = document.createElement("div");
        skeleton.className = "h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800";
        modalPreviewGrid.appendChild(skeleton);
    }
}

async function fetchJSON(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`${url} failed with ${response.status}`);
    return response.json();
}

async function fetchAllBreeds() {
    const limit = 100;
    let page = 1;
    let all = [];
    let total = null;

    while (total === null || all.length < total) {
        const data = await fetchJSON(`/breeds?page=${page}&limit=${limit}`);
        const chunk = Array.isArray(data.breeds) ? data.breeds : [];
        total = typeof data.total === "number" ? data.total : chunk.length;
        all = all.concat(chunk);

        if (!chunk.length) break;
        if (chunk.length < limit) break;

        page++;
    }

    return all;
}

function getBreedUrl(breed) {
    return `/page/breed/${encodeURIComponent(breed)}`;
}

async function openBreedModal(breed) {
    activeBreed = breed;
    if (!breedModal) return;

    modalBreedTitle.innerText = breed;
    breedModal.classList.remove("hidden");
    breedModal.classList.add("flex");
    renderModalPreviewSkeleton();

    try {
        const data = await fetchJSON(`/breed/${encodeURIComponent(breed)}?page=1&limit=4`);
        const images = Array.isArray(data.images) ? data.images : [];

        modalPreviewGrid.innerHTML = "";
        if (!images.length) {
            modalPreviewGrid.appendChild(createState("empty", "No preview images available."));
            return;
        }

        images.forEach((url) => {
            const img = document.createElement("img");
            img.src = url;
            img.alt = `${breed} preview`;
            img.className = "h-24 w-full rounded-xl object-cover";
            modalPreviewGrid.appendChild(img);
        });
    } catch (error) {
        modalPreviewGrid.innerHTML = "";
        modalPreviewGrid.appendChild(
            createState("error", "Could not load breed preview.", () => openBreedModal(breed))
        );
        console.error("Modal preview failed:", error);
    }
}

function closeBreedModal() {
    if (!breedModal) return;
    breedModal.classList.add("hidden");
    breedModal.classList.remove("flex");
}

async function loadRecent() {
    const container = document.getElementById("recentContainer");
    if (!container) return;

    renderRecentSkeleton();

    try {
        const data = await fetchJSON("/viewed");
        container.innerHTML = "";

        if (!data.length) {
            container.appendChild(createState("empty", "No recently viewed breeds yet."));
            return;
        }

        data.slice(0, 5).forEach((breed) => {
            const div = document.createElement("button");
            div.className = "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium capitalize transition hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800";
            div.innerText = breed;
            div.onclick = () => openBreedModal(breed);
            container.appendChild(div);
        });
    } catch (error) {
        container.innerHTML = "";
        container.appendChild(
            createState("error", "Could not load recently viewed breeds.", loadRecent)
        );
        console.error("Failed to load recent breeds:", error);
    }
}

async function loadBreeds() {
    if (loadingBreeds) return;
    loadingBreeds = true;
    renderBreedSkeleton();
    if (loadMoreBtn) loadMoreBtn.disabled = true;

    try {
        let breeds = [];

        if (filterSelect.value === "liked") {
            breeds = await fetchJSON("/breeds/liked");
        } else if (filterSelect.value === "viewed") {
            breeds = await fetchJSON("/breeds/viewed");
        } else {
            breeds = await fetchAllBreeds();
        }

        if (sortSelect.value === "mostliked") {
            const data = await fetchJSON("/breeds/most-liked");
            breeds = data.map((x) => x.breed);
        }

        if (sortSelect.value === "az") breeds.sort();
        if (sortSelect.value === "za") breeds.sort().reverse();

        allBreeds = breeds;
        renderBreeds();
    } catch (error) {
        grid.innerHTML = "";
        grid.appendChild(
            createState("error", "Could not load breed list.", loadBreeds)
        );
        console.error("Failed to load breeds:", error);
    } finally {
        loadingBreeds = false;
        if (loadMoreBtn) loadMoreBtn.disabled = false;
    }
}

function renderBreeds() {
    const search = searchInput.value.toLowerCase();
    const filtered = allBreeds.filter((b) => b.toLowerCase().includes(search));

    grid.innerHTML = "";

    if (!filtered.length) {
        grid.appendChild(createState("empty", "No breeds found for the current filter/search."));
        return;
    }

    filtered.forEach((breed) => {
        const card = document.createElement("button");
        card.className = "group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600";
        card.onclick = () => openBreedModal(breed);

        const title = document.createElement("p");
        title.className = "text-sm font-semibold capitalize";
        title.innerText = breed;

        const hint = document.createElement("p");
        hint.className = "mt-1 text-xs text-slate-500 transition group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-300";
        hint.innerText = "Tap for details";

        card.appendChild(title);
        card.appendChild(hint);
        grid.appendChild(card);
    });
}

if (searchInput) searchInput.addEventListener("input", renderBreeds);
if (filterSelect) filterSelect.addEventListener("change", loadBreeds);
if (sortSelect) sortSelect.addEventListener("change", loadBreeds);

if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", async () => {
        await Promise.all([loadBreeds(), loadRecent()]);
        showToast("Gallery refreshed.", "success");
    });
}

if (scrollTopBtn && breedScrollArea) {
    scrollTopBtn.addEventListener("click", () => {
        breedScrollArea.scrollTo({ top: 0, behavior: "smooth" });
    });
}

if (scrollBottomBtn && breedScrollArea) {
    scrollBottomBtn.addEventListener("click", () => {
        breedScrollArea.scrollTo({ top: breedScrollArea.scrollHeight, behavior: "smooth" });
    });
}

if (closeBreedModalBtn) closeBreedModalBtn.addEventListener("click", closeBreedModal);

if (breedModal) {
    breedModal.addEventListener("click", (event) => {
        if (event.target === breedModal) closeBreedModal();
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeBreedModal();
});

if (modalOpenBtn) {
    modalOpenBtn.addEventListener("click", () => {
        if (!activeBreed) return;
        window.location.href = getBreedUrl(activeBreed);
    });
}

if (modalShareBtn) {
    modalShareBtn.addEventListener("click", async () => {
        if (!activeBreed) return;
        const shareUrl = `${window.location.origin}${getBreedUrl(activeBreed)}`;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `Dog Breed: ${activeBreed}`,
                    url: shareUrl
                });
                showToast("Share sheet opened.", "success");
            } else {
                await navigator.clipboard.writeText(shareUrl);
                showToast("Link copied to clipboard.", "success");
            }
        } catch (error) {
            console.error("Share failed:", error);
            showToast("Could not share this breed.", "error");
        }
    });
}

if (modalCopyBtn) {
    modalCopyBtn.addEventListener("click", async () => {
        if (!activeBreed) return;
        try {
            await navigator.clipboard.writeText(`${window.location.origin}${getBreedUrl(activeBreed)}`);
            showToast("Breed link copied.", "success");
        } catch (error) {
            console.error("Copy failed:", error);
            showToast("Copy failed. Try again.", "error");
        }
    });
}

loadBreeds();
loadRecent();
