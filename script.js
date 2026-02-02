// ↓↓↓ 請在這裡貼上你最新的 GAS 網址 ↓↓↓
const apiUrl = "https://script.google.com/macros/s/AKfycbzbyQYGziyhu6kThVsFVgyhwG4TOljoPJ1hgK9IRaZlmTZKrkOoyh1IDeO0JkQO8dhZIw/exec";

// 預設圖片 (待更新)
const defaultImg = "https://placehold.co/200x300/e0e0e0/333333?text=待更新&font=roboto";

// 分頁設定
const itemsPerPage = 20;
let currentPage = 1;
let allAnimeData = [];
let currentFilteredData = [];

// DOM
const gridContainer = document.getElementById('anime-grid');
const filterSelect = document.getElementById('category-filter');
const typeSelect = document.getElementById('type-filter');
const sortSelect = document.getElementById('sort-select');
const searchInput = document.getElementById('search-input');
const btnAdd = document.getElementById('btn-add');
const btnLoadMoreContainer = document.getElementById('load-more-container');
const btnLoadMore = document.getElementById('btn-load-more');

const detailModal = document.getElementById('detail-modal');
const formModal = document.getElementById('form-modal');
const animeForm = document.getElementById('anime-form');

// --- 1. 抓取資料 ---
async function fetchAnimeData() {
    try {
        gridContainer.innerHTML = '<p class="loading-text">資料載入中，請稍候...</p>';
        btnLoadMoreContainer.style.display = 'none';
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (!Array.isArray(data)) throw new Error("資料格式錯誤");
        allAnimeData = data;
        applyFilterAndSort();
    } catch (error) {
        console.error("Error:", error);
        gridContainer.innerHTML = "<p>讀取失敗，請檢查網址或網路。</p>";
    }
}

// --- 2. 篩選與排序 ---
function applyFilterAndSort() {
    let result = [...allAnimeData];

    // Search
    const keyword = searchInput.value.toLowerCase().trim();
    if (keyword) {
        result = result.filter(item => String(item.title).toLowerCase().includes(keyword));
    }

    // Status Filter
    const category = filterSelect.value;
    if (category !== 'all') {
        result = result.filter(item => item.status === category);
    }

    // Type Filter
    const type = typeSelect.value;
    if (type !== 'all') {
        result = result.filter(item => item.type === type);
    }

    // Sort
    const sortType = sortSelect.value;
    result.sort((a, b) => {
        if (sortType === 'newest') return new Date(b.date) - new Date(a.date);
        if (sortType === 'oldest') return new Date(a.date) - new Date(b.date);
        if (sortType === 'id_asc') return String(a.id).localeCompare(String(b.id));
        if (sortType === 'id_desc') return String(b.id).localeCompare(String(a.id));
        if (sortType === 'rating_desc') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        if (sortType === 'rating_asc') return (Number(a.rating) || 0) - (Number(b.rating) || 0);
    });

    // Reset Pagination
    currentFilteredData = result;
    currentPage = 1;
    gridContainer.innerHTML = '';
    loadMoreAnime();
}

// --- 3. 分頁載入 ---
function loadMoreAnime() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = currentPage * itemsPerPage;
    const dataChunk = currentFilteredData.slice(start, end);

    if (currentPage === 1 && dataChunk.length === 0) {
        gridContainer.innerHTML = "<p style='grid-column:1/-1;text-align:center;'>沒有符合條件的動畫。</p>";
        btnLoadMoreContainer.style.display = 'none';
        return;
    }

    renderAnime(dataChunk);

    if (end >= currentFilteredData.length) {
        btnLoadMoreContainer.style.display = 'none';
    } else {
        btnLoadMoreContainer.style.display = 'block';
    }
}

// --- 4. 渲染卡片 ---
function renderAnime(data) {
    data.forEach(anime => {
        const starHTML = getStarString(anime.rating);
        const displayImg = anime.image ? anime.image : defaultImg;

        const card = document.createElement('div');
        card.className = 'anime-card';
        card.style.animation = "fadeIn 0.5s ease";
        card.innerHTML = `
            <img src="${displayImg}" onerror="this.src='${defaultImg}'" alt="${anime.title}">
            <div class="card-info">
                <h3>${anime.title}</h3>
                <div class="star-rating" style="font-size:1rem;">${starHTML}</div>
                <p>${anime.date}</p>
                <span class="status-badge ${anime.status}">${anime.statusText}</span>
            </div>
        `;
        card.addEventListener('click', () => openDetailModal(anime));
        gridContainer.appendChild(card);
    });
}

// --- 5. 詳細彈窗 ---
function openDetailModal(anime) {
    document.getElementById('modal-title').innerText = anime.title;
    
    const imgEl = document.getElementById('modal-img');
    imgEl.src = anime.image ? anime.image : defaultImg;
    imgEl.onerror = function() { this.src = defaultImg; };

    document.getElementById('modal-rating').innerHTML = getStarString(anime.rating);
    
    const statusSpan = document.getElementById('modal-status');
    statusSpan.innerText = anime.statusText;
    statusSpan.className = `status-badge ${anime.status}`;

    document.getElementById('modal-id').innerText = anime.id;
    document.getElementById('modal-eps').innerText = anime.episodes;
    document.getElementById('modal-date').innerText = anime.date;
    document.getElementById('modal-note').innerText = anime.note || "無";

    // 搜尋去括號
    let searchTitle = anime.title.replace(/[\(（].*$/, '').trim();
    const encoded = encodeURIComponent(searchTitle);
    document.getElementById('link-bahamut').href = `https://ani.gamer.com.tw/search.php?keyword=${encoded}`;
    document.getElementById('link-bilibili').href = `https://search.bilibili.com/all?keyword=${encoded}`;

    document.getElementById('btn-edit').onclick = () => openEditForm(anime);
    document.getElementById('btn-delete').onclick = () => deleteAnime(anime);

    // 同系列邏輯
    const relatedArea = document.getElementById('related-series-area');
    const relatedList = document.getElementById('related-list');
    relatedList.innerHTML = '';

    if (anime.id && String(anime.id).includes('-')) {
        const currentSeriesId = String(anime.id).split('-')[0];
        const siblings = allAnimeData.filter(item => {
            if (!item.id || !String(item.id).includes('-')) return false;
            return String(item.id).split('-')[0] === currentSeriesId;
        });

        if (siblings.length > 1) {
            siblings.sort((a, b) => String(a.id).localeCompare(String(b.id)));
            siblings.forEach(item => {
                const btn = document.createElement('div');
                const isCurrent = (item.id === anime.id);
                btn.className = isCurrent ? 'related-item current' : 'related-item';
                btn.innerText = item.title;
                if (!isCurrent) {
                    btn.onclick = () => openDetailModal(item);
                }
                relatedList.appendChild(btn);
            });
            relatedArea.style.display = 'block';
        } else { relatedArea.style.display = 'none'; }
    } else { relatedArea.style.display = 'none'; }

    detailModal.style.display = "block";
    document.body.style.overflow = "hidden";
}

// --- 6. 新增/修改表單 ---
function openEditForm(anime = null) {
    detailModal.style.display = "none";
    formModal.style.display = "block";
    const sheetSelect = document.getElementById('form-sheet-select');

    if (anime) {
        document.getElementById('form-header-title').innerText = "修改動畫資料";
        document.getElementById('form-action').value = "edit";
        document.getElementById('form-rowIndex').value = anime.rowIndex;
        document.getElementById('form-sheetName').value = anime.sheetName;
        sheetSelect.value = anime.sheetName;
        sheetSelect.disabled = true;

        document.getElementById('form-id').value = anime.id;
        document.getElementById('form-title-input').value = anime.title;
        document.getElementById('form-date').value = anime.date;
        document.getElementById('form-eps').value = anime.episodes;
        document.getElementById('form-rating').value = anime.rating;
        document.getElementById('form-img').value = anime.image;
        document.getElementById('form-note').value = anime.note;
    } else {
        document.getElementById('form-header-title').innerText = "新增動畫";
        document.getElementById('form-action').value = "add";
        document.getElementById('anime-form').reset();
        sheetSelect.disabled = false;
        sheetSelect.value = "單季";
    }
}

// 自動抓圖 (Jikan API)
document.getElementById('btn-auto-img').addEventListener('click', async () => {
    const titleInput = document.getElementById('form-title-input');
    const imgInput = document.getElementById('form-img');
    const btn = document.getElementById('btn-auto-img');
    const originalText = btn.innerText;
    const keyword = titleInput.value.trim();

    if (!keyword) { alert("請先輸入名稱！"); return; }
    btn.innerText = "搜尋中..."; btn.disabled = true;

    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(keyword)}&limit=1`);
        const data = await response.json();
        if (data.data && data.data.length > 0) {
            imgInput.value = data.data[0].images.jpg.large_image_url;
            imgInput.style.backgroundColor = "#d4edda";
            setTimeout(() => imgInput.style.backgroundColor = "white", 500);
        } else { alert("找不到圖片，請簡化名稱再試。"); }
    } catch (e) { alert("API 連線失敗，請稍後再試。"); } 
    finally { btn.innerText = originalText; btn.disabled = false; }
});

// 提交表單
animeForm.onsubmit = async (e) => {
    e.preventDefault();
    if(!confirm("確定要儲存變更嗎？")) return;

    const btn = document.querySelector('.submit-btn');
    const originalText = btn.innerText;
    btn.innerText = "處理中..."; btn.disabled = true;

    const formData = {
        action: document.getElementById('form-action').value,
        rowIndex: document.getElementById('form-rowIndex').value,
        sheetName: (document.getElementById('form-action').value === 'add') 
                   ? document.getElementById('form-sheet-select').value 
                   : document.getElementById('form-sheetName').value,
        id: document.getElementById('form-id').value,
        title: document.getElementById('form-title-input').value,
        date: document.getElementById('form-date').value,
        episodes: document.getElementById('form-eps').value,
        rating: document.getElementById('form-rating').value,
        image: document.getElementById('form-img').value,
        note: document.getElementById('form-note').value,
        status: "watched"
    };

    try {
        await fetch(apiUrl, { method: 'POST', body: JSON.stringify(formData) });
        alert("儲存成功！");
        closeModal('form-modal');
        fetchAnimeData();
    } catch (error) { alert("錯誤：" + error); } 
    finally { btn.innerText = originalText; btn.disabled = false; }
};

// 刪除
async function deleteAnime(anime) {
    if (!confirm(`確定要刪除「${anime.title}」嗎？`)) return;
    try {
        document.getElementById('modal-title').innerText = "刪除中...";
        await fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete', sheetName: anime.sheetName, rowIndex: anime.rowIndex, id: anime.id })
        });
        alert("已刪除！");
        closeModal('detail-modal');
        fetchAnimeData();
    } catch (error) { alert("刪除失敗"); document.getElementById('modal-title').innerText = anime.title; }
}

// 載入更多
btnLoadMore.addEventListener('click', () => {
    currentPage++;
    loadMoreAnime();
});

// 工具
function getStarString(rating) {
    if (!rating) return "";
    const score = Math.max(0, Math.min(5, parseInt(rating)));
    return "★".repeat(score) + "☆".repeat(5 - score);
}
function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
    document.body.style.overflow = "auto";
}
window.onclick = (event) => {
    if (event.target == detailModal) closeModal('detail-modal');
    if (event.target == formModal) closeModal('form-modal');
}

// 監聽
searchInput.addEventListener('input', applyFilterAndSort);
filterSelect.addEventListener('change', applyFilterAndSort);
typeSelect.addEventListener('change', applyFilterAndSort);
sortSelect.addEventListener('change', applyFilterAndSort);
btnAdd.addEventListener('click', () => openEditForm(null));

fetchAnimeData();