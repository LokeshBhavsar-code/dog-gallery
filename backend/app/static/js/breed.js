const breed = decodeURIComponent(window.location.pathname.split("/").pop() || "");

const grid = document.getElementById("imageGrid");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const title = document.getElementById("breedTitle");
const toastContainer = document.getElementById("toastContainer");

if (title) title.innerText = breed;

fetch("/viewed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ breed })
}).catch((error) => {
    console.error("Failed to track viewed breed:", error);
});

let currentPage = 1;
const limit = 10;
let isLoading = false;
let zoomModal = null;
let zoomImage = null;

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

function renderImageSkeleton(count = 6) {
    grid.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement("div");
        skeleton.className = "h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800";
        grid.appendChild(skeleton);
    }
}

function setLoadMoreState(disabled, label = "Load More Images") {
    if (!loadMoreBtn) return;
    loadMoreBtn.disabled = disabled;
    loadMoreBtn.innerText = label;
}

function ensureZoomModal() {
    if (zoomModal) return;

    zoomModal = document.createElement("div");
    zoomModal.className = "fixed inset-0 z-50 hidden items-center justify-center bg-black/80 p-4";

    const wrapper = document.createElement("div");
    wrapper.className = "relative w-full max-w-6xl";

    const closeBtn = document.createElement("button");
    closeBtn.className = "absolute -top-12 right-0 rounded-lg bg-white/90 px-3 py-1 text-sm font-semibold text-slate-900 transition hover:bg-white";
    closeBtn.innerText = "Close";
    closeBtn.onclick = () => closeZoomModal();

    zoomImage = document.createElement("img");
    zoomImage.className = "max-h-[88vh] w-full rounded-xl object-contain";

    wrapper.appendChild(closeBtn);
    wrapper.appendChild(zoomImage);
    zoomModal.appendChild(wrapper);
    document.body.appendChild(zoomModal);

    zoomModal.addEventListener("click", (event) => {
        if (event.target === zoomModal) closeZoomModal();
    });
}

function openZoomModal(src, alt = "Zoomed image") {
    ensureZoomModal();
    zoomImage.src = src;
    zoomImage.alt = alt;
    zoomModal.classList.remove("hidden");
    zoomModal.classList.add("flex");
    document.body.style.overflow = "hidden";
}

function closeZoomModal() {
    if (!zoomModal) return;
    zoomModal.classList.add("hidden");
    zoomModal.classList.remove("flex");
    document.body.style.overflow = "";
}

async function fetchJSON(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`${url} failed with ${response.status}`);
    }
    return response.json();
}

function createImageCard(imgUrl, likes) {
    const card = document.createElement("article");
    card.className = "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900";

    const img = document.createElement("img");
    img.src = imgUrl;
    img.alt = `${breed} dog image`;
    img.className = "h-56 w-full cursor-zoom-in rounded-xl object-cover";
    img.onclick = () => openZoomModal(imgUrl, `${breed} zoomed image`);

    let liked = likes.some((l) => l.image_url === imgUrl);

    const actionRow = document.createElement("div");
    actionRow.className = "mt-3 flex flex-wrap gap-2";

    const likeBtn = document.createElement("button");
    likeBtn.className = "rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700";
    likeBtn.innerText = liked ? "Liked" : "Like";

    likeBtn.onclick = async () => {
        try {
            if (!liked) {
                await fetchJSON("/like", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        image_url: imgUrl,
                        breed: breed
                    })
                });
                liked = true;
                likeBtn.innerText = "Liked";
                showToast("Image added to likes.", "success");
            } else {
                await fetchJSON(`/like?image_url=${encodeURIComponent(imgUrl)}`, {
                    method: "DELETE"
                });
                liked = false;
                likeBtn.innerText = "Like";
                showToast("Image removed from likes.", "info");
            }
        } catch (error) {
            console.error("Failed to toggle like:", error);
            showToast("Could not update like.", "error");
        }
    };

    const shareBtn = document.createElement("button");
    shareBtn.className = "rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800";
    shareBtn.innerText = "Share";

    shareBtn.onclick = async () => {
        const shareUrl = `${window.location.origin}/page/breed/${encodeURIComponent(breed)}?img=${encodeURIComponent(imgUrl)}`;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `Dog Breed: ${breed}`,
                    url: shareUrl
                });
                showToast("Share sheet opened.", "success");
            } else {
                await navigator.clipboard.writeText(shareUrl);
                showToast("Image link copied.", "success");
            }
        } catch (error) {
            console.error("Share failed:", error);
            showToast("Could not share image.", "error");
        }
    };

    const copyBtn = document.createElement("button");
    copyBtn.className = "rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800";
    copyBtn.innerText = "Copy URL";

    copyBtn.onclick = async () => {
        try {
            await navigator.clipboard.writeText(imgUrl);
            showToast("Image URL copied.", "success");
        } catch (error) {
            console.error("Copy failed:", error);
            showToast("Could not copy URL.", "error");
        }
    };

    actionRow.appendChild(likeBtn);
    actionRow.appendChild(shareBtn);
    actionRow.appendChild(copyBtn);
    card.appendChild(img);
    card.appendChild(actionRow);

    return card;
}

async function fetchImages({ reset = false } = {}) {
    if (isLoading) return;
    isLoading = true;

    if (reset) {
        currentPage = 1;
        renderImageSkeleton();
    }
    setLoadMoreState(true, "Loading...");

    try {
        const data = await fetchJSON(`/breed/${encodeURIComponent(breed)}?page=${currentPage}&limit=${limit}`);

        let likes = [];
        try {
            likes = await fetchJSON("/likes");
        } catch (likeError) {
            console.error("Likes endpoint failed:", likeError);
        }

        const images = Array.isArray(data.images) ? data.images : [];
        if (reset) grid.innerHTML = "";

        if (!images.length) {
            if (currentPage === 1) {
                grid.innerHTML = "";
                grid.appendChild(createState("empty", "No images found for this breed."));
            }
            setLoadMoreState(true, "No More Images");
            return;
        }

        images.forEach((imgUrl) => {
            grid.appendChild(createImageCard(imgUrl, likes));
        });

        if (images.length < limit) {
            setLoadMoreState(true, "No More Images");
        } else {
            setLoadMoreState(false, "Load More Images");
        }
    } catch (error) {
        if (currentPage > 1) currentPage--;
        grid.innerHTML = "";
        grid.appendChild(
            createState("error", "Could not load images.", () => fetchImages({ reset: true }))
        );
        setLoadMoreState(false, "Retry Loading");
        console.error("Failed to fetch images:", error);
    } finally {
        isLoading = false;
    }
}

if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
        if (isLoading) return;
        currentPage++;
        fetchImages();
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeZoomModal();
});

fetchImages({ reset: true });
