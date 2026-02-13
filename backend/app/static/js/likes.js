const likesGrid = document.getElementById("likesGrid");
const toastContainer = document.getElementById("toastContainer");
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

function renderSkeleton(count = 6) {
    likesGrid.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement("div");
        skeleton.className = "h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800";
        likesGrid.appendChild(skeleton);
    }
}

async function fetchJSON(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`${url} failed with ${response.status}`);
    }
    return response.json();
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

function createLikeCard(item) {
    const card = document.createElement("article");
    card.className = "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900";

    const img = document.createElement("img");
    img.src = item.image_url;
    img.alt = `${item.breed} liked`;
    img.className = "h-56 w-full cursor-zoom-in rounded-xl object-cover";
    img.onclick = () => openZoomModal(item.image_url, `${item.breed} zoomed image`);

    const title = document.createElement("p");
    title.className = "mt-2 text-sm font-semibold capitalize";
    title.innerText = item.breed;

    const row = document.createElement("div");
    row.className = "mt-3 flex flex-wrap gap-2";

    const openBtn = document.createElement("button");
    openBtn.className = "rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700";
    openBtn.innerText = "Open Breed";
    openBtn.onclick = () => {
        window.location.href = `/page/breed/${encodeURIComponent(item.breed)}`;
    };

    const shareBtn = document.createElement("button");
    shareBtn.className = "rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800";
    shareBtn.innerText = "Share";
    shareBtn.onclick = async () => {
        const shareUrl = `${window.location.origin}/page/breed/${encodeURIComponent(item.breed)}?img=${encodeURIComponent(item.image_url)}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: `Dog Breed: ${item.breed}`, url: shareUrl });
                showToast("Share sheet opened.", "success");
            } else {
                await navigator.clipboard.writeText(shareUrl);
                showToast("Link copied to clipboard.", "success");
            }
        } catch (error) {
            console.error("Share failed:", error);
            showToast("Could not share image.", "error");
        }
    };

    const removeBtn = document.createElement("button");
    removeBtn.className = "rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50";
    removeBtn.innerText = "Remove";
    removeBtn.onclick = async () => {
        try {
            await fetchJSON(`/like?image_url=${encodeURIComponent(item.image_url)}`, { method: "DELETE" });
            card.remove();
            if (!likesGrid.children.length) {
                likesGrid.appendChild(createState("empty", "You have no liked images yet."));
            }
            showToast("Removed from likes.", "info");
        } catch (error) {
            console.error("Remove failed:", error);
            showToast("Could not remove image.", "error");
        }
    };

    row.appendChild(openBtn);
    row.appendChild(shareBtn);
    row.appendChild(removeBtn);

    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(row);

    return card;
}

async function loadLikes() {
    if (!likesGrid) return;
    renderSkeleton();

    try {
        const likes = await fetchJSON("/likes");
        likesGrid.innerHTML = "";

        if (!likes.length) {
            likesGrid.appendChild(createState("empty", "You have no liked images yet."));
            return;
        }

        likes.forEach((item) => {
            likesGrid.appendChild(createLikeCard(item));
        });
    } catch (error) {
        likesGrid.innerHTML = "";
        likesGrid.appendChild(
            createState("error", "Could not load liked images.", loadLikes)
        );
        console.error("Failed to load likes:", error);
    }
}

loadLikes();

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeZoomModal();
});
