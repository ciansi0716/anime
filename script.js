// ↓↓↓ 請在這裡貼上你最新的 GAS 網址 ↓↓↓
const apiUrl = "https://script.google.com/macros/s/AKfycbzbyQYGziyhu6kThVsFVgyhwG4TOljoPJ1hgK9IRaZlmTZKrkOoyh1IDeO0JkQO8dhZIw/exec";

// --- 設定預設圖片 (當連結空白或破圖時顯示) ---
// 使用 placehold.co 產生一張灰底黑字，寫著「待更新」的圖片
const defaultImg = "https://placehold.co/200x300/e0e0e0/333333?text=待更新&font=roboto";

// DOM 元素選取
const gridContainer = document.getElementById('anime-grid');
const filterSelect = document.getElementById('category-filter');
const sortSelect = document.getElementById('sort-select');
const searchInput = document.getElementById('search-input');
const btnAdd = document.getElementById('btn-add');

const detailModal = document.getElementById('detail-modal');
const formModal = document.getElementById('form-modal');
const animeForm = document.getElementById('anime-form');

let allAnimeData = [];

// --- 1. 抓取資料 ---
async function fetchAnimeData() {
    try {
        gridContainer.innerHTML = '<p class="loading-text">資料載入中，請稍候...</p>';
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            throw new Error("資料格式錯誤");
        }
        
        allAnimeData = data;
        applyFilterAndSort(); // 載入完成，顯示畫面
    } catch (error) {
        console.error("Error:", error);
        gridContainer.innerHTML = "<p>讀取失敗，請檢查網址或網路。</p>";
    }
}

// --- 2. 篩選、排序與搜尋 ---
function applyFilterAndSort() {
    let result = [...allAnimeData];

    // A. 搜尋
    const keyword = searchInput.value.toLowerCase().trim();
    if (keyword) {
        result = result.filter(item => 
            String(item.title).toLowerCase().includes(keyword)
        );
    }

    // B. 分類篩選
    const category = filterSelect.value;
    if (category === 'multi') {
        result = result.filter(item => item.type === 'multi');
    } else if (category !== 'all') {
        result = result.filter(item => item.status === category);
    }

    // C. 排序
    const sortType = sortSelect.value;
    result.sort((a, b) => {
        if (sortType === 'newest') return new Date(b.date) - new Date(a.date);
        if (sortType === 'oldest') return new Date(a.date) - new Date(b.date);
        if (sortType === 'id_asc') return String(a.id).localeCompare(String(b.id));
        if (sortType === 'id_desc') return String(b.id).localeCompare(String(a.id));
    });

    renderAnime(result);
}

// --- 3. 渲染卡片 ---
function renderAnime(data) {
    gridContainer.innerHTML = '';
    
    if (data.length === 0) {
        gridContainer.innerHTML = "<p style='grid-column:1/-1;text-align:center;'>沒有符合條件的動畫。</p>";
        return;
    }

    data.forEach(anime => {
        const starHTML = getStarString(anime.rating);
        
        // 判斷：如果有圖片連結就用，沒有就用「待更新」圖
        // 即使有連結，如果載入失敗 (onerror)，也會切換成「待更新」圖
        const displayImg = anime.image ? anime.image : defaultImg;

        const card = document.createElement('div');
        card.className = 'anime-card';
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

// --- 4. 開啟詳細彈窗 ---
function openDetailModal(anime) {
    document.getElementById('modal-title').innerText = anime.title;
    
    // 圖片處理邏輯同上
    const imgEl = document.getElementById('modal-img');
    imgEl.src = anime.image ? anime.image : defaultImg;
    imgEl.onerror = function() { this.src = defaultImg; }; // 綁定錯誤處理

    document.getElementById('modal-rating').innerHTML = getStarString(anime.rating);
    
    const statusSpan = document.getElementById('modal-status');
    statusSpan.innerText = anime.statusText;
    statusSpan.className = `status-badge ${anime.status}`;

    document.getElementById('modal-id').innerText = anime.id;
    document.getElementById('modal-eps').innerText = anime.episodes;
    document.getElementById('modal-date').innerText = anime.date;
    document.getElementById('modal-note').innerText = anime.note || "無";

    // 設定外部連結
    // 1. 先把標題拿出來處理
    let searchTitle = anime.title;
    
    // 2. 使用正規表達式：遇到 "半形(" 或 "全形（" 就把後面全部刪除，並去除前後空白
    // 例如："我推的孩子 (第二季)" -> "我推的孩子"
    searchTitle = searchTitle.replace(/[\(（].*$/, '').trim();

    // 3. 編碼並設定網址
    const encoded = encodeURIComponent(searchTitle);
    
    document.getElementById('link-bahamut').href = `https://ani.gamer.com.tw/search.php?keyword=${encoded}`;
    document.getElementById('link-bilibili').href = `https://search.bilibili.com/all?keyword=${encoded}`;

    // 按鈕事件
    document.getElementById('btn-edit').onclick = () => openEditForm(anime);
    document.getElementById('btn-delete').onclick = () => deleteAnime(anime);

    // 同系列判斷
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

// --- 5. 新增 / 修改 表單邏輯 ---
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

// 提交表單
animeForm.onsubmit = async (e) => {
    e.preventDefault();
    if(!confirm("確定要儲存變更嗎？")) return;

    const btn = document.querySelector('.submit-btn');
    const originalText = btn.innerText;
    btn.innerText = "處理中...";
    btn.disabled = true;

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
        await fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        alert("儲存成功！");
        closeModal('form-modal');
        fetchAnimeData(); 
    } catch (error) {
        alert("錯誤：" + error);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

// --- 6. 刪除資料 ---
async function deleteAnime(anime) {
    if (!confirm(`確定要刪除「${anime.title}」嗎？此動作無法復原！`)) return;

    try {
        document.getElementById('modal-title').innerText = "刪除中...";
        await fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify({
                action: 'delete',
                sheetName: anime.sheetName,
                rowIndex: anime.rowIndex,
                id: anime.id
            })
        });
        alert("已刪除！");
        closeModal('detail-modal');
        fetchAnimeData();
    } catch (error) {
        alert("刪除失敗：" + error);
        document.getElementById('modal-title').innerText = anime.title;
    }
}

// --- 工具函式 ---
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

// 監聽器
searchInput.addEventListener('input', applyFilterAndSort);
filterSelect.addEventListener('change', applyFilterAndSort);
sortSelect.addEventListener('change', applyFilterAndSort);
btnAdd.addEventListener('click', () => openEditForm(null));

// 啟動
fetchAnimeData();