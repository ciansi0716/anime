// === 1. 引入 Firebase SDK ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// === 2. 你的 Firebase 專案金鑰配置 ===
const firebaseConfig = {
    apiKey: "AIzaSyA1DkzpRd12yNx7beXALPRa6UtgA2AS10k",
    authDomain: "anime-tracker-1ecb9.firebaseapp.com",
    projectId: "anime-tracker-1ecb9",
    storageBucket: "anime-tracker-1ecb9.firebasestorage.app",
    messagingSenderId: "951060497354",
    appId: "1:951060497354:web:68f52626b13cc051870533"
};

// 👇 ⚠️請在這裡貼上你從 Apps Script 部署拿到的「網頁應用程式網址」⚠️ 👇
const gasApiUrl = "https://script.google.com/macros/s/AKfycbxAfbSRgD7KgFQG-mcETEbXJcgCLp7qXPmDLztzITOImCvs3opA8ZwaemR9N07PAf9a1g/exec"; 

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const defaultImg = "https://placehold.co/200x300/e0e0e0/333333?text=待更新&font=roboto";

let allAnimeData = [];
let currentFilteredData = [];

// DOM 元素
const gridContainer = document.getElementById('anime-grid');
const filterSelect = document.getElementById('category-filter');
const typeSelect = document.getElementById('type-filter');
const sortSelect = document.getElementById('sort-select');
const searchInput = document.getElementById('search-input');
const btnAdd = document.getElementById('btn-add');
const detailModal = document.getElementById('detail-modal');
const formModal = document.getElementById('form-modal');
const animeForm = document.getElementById('anime-form');

// --- 3. 抓取資料 ---
async function fetchAnimeData() {
    try {
        gridContainer.innerHTML = '<p class="loading-text">資料載入中，請稍候...</p>';
        const querySnapshot = await getDocs(collection(db, "animes"));
        allAnimeData = [];
        querySnapshot.forEach((docSnap) => {
            const d = docSnap.data();
            const isWatched = String(d.watchStatus).toUpperCase() === 'TRUE' || d.watchStatus === 'watched' || d.watchStatus === 'TRUE';
            allAnimeData.push({
                id: docSnap.id,
                title: d.title || "",
                date: d.date || "",
                episodes: d.episodes || "",
                rating: d.rating || "",
                image: d.imageUrl || "",
                note: d.notes || "",
                status: isWatched ? 'watched' : 'unwatched',
                statusText: isWatched ? '已觀看' : '未觀看',
                type: d.animeType || 'single',
            });
        });
        applyFilterAndSort(); 
    } catch (error) {
        console.error("Firebase 讀取錯誤:", error);
        gridContainer.innerHTML = "<p>讀取失敗，請檢查網路或金鑰設定。</p>";
    }
}

// --- 4. 篩選與排序 ---
function applyFilterAndSort() {
    let result = [...allAnimeData];
    const keyword = searchInput.value.toLowerCase().trim();
    if (keyword) result = result.filter(item => String(item.title).toLowerCase().includes(keyword));
    const category = filterSelect.value;
    if (category !== 'all') result = result.filter(item => item.status === category);
    const type = typeSelect.value;
    if (type !== 'all') result = result.filter(item => item.type === type);
    const sortType = sortSelect.value;
    result.sort((a, b) => {
        if (sortType === 'newest' || sortType === 'oldest') {
            const timeA = a.date ? new Date(a.date).getTime() : 0;
            const timeB = b.date ? new Date(b.date).getTime() : 0;
            const safeA = isNaN(timeA) ? 0 : timeA;
            const safeB = isNaN(timeB) ? 0 : timeB;
            if (sortType === 'newest') return safeB - safeA; 
            if (sortType === 'oldest') return safeA - safeB; 
        }
        if (sortType === 'id_asc') return String(a.id).localeCompare(String(b.id));
        if (sortType === 'id_desc') return String(b.id).localeCompare(String(a.id));
        if (sortType === 'rating_desc') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        if (sortType === 'rating_asc') return (Number(a.rating) || 0) - (Number(b.rating) || 0);
    });
    currentFilteredData = result;
    renderAnime(currentFilteredData);
}

// --- 5. 渲染卡片 ---
function renderAnime(data) {
    gridContainer.innerHTML = ''; 
    if (data.length === 0) {
        gridContainer.innerHTML = "<p style='grid-column:1/-1;text-align:center;'>沒有符合條件的動畫。</p>";
        return;
    }
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

// --- 6. 詳細彈窗 ---
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

    let searchTitle = anime.title.replace(/[\(（].*$/, '').trim();
    const encoded = encodeURIComponent(searchTitle);
    document.getElementById('link-bahamut').href = `https://ani.gamer.com.tw/search.php?keyword=${encoded}`;
    document.getElementById('link-bilibili').href = `https://search.bilibili.com/all?keyword=${encoded}`;

    document.getElementById('btn-edit').onclick = () => openEditForm(anime);
    document.getElementById('btn-delete').onclick = () => deleteAnime(anime);

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
                if (!isCurrent) btn.onclick = () => openDetailModal(item);
                relatedList.appendChild(btn);
            });
            relatedArea.style.display = 'block';
        } else { relatedArea.style.display = 'none'; }
    } else { relatedArea.style.display = 'none'; }

    detailModal.style.display = "block";
    document.body.style.overflow = "hidden";
}

// --- 7. 新增/修改表單 ---
function openEditForm(anime = null) {
    detailModal.style.display = "none";
    formModal.style.display = "block";
    const sheetSelect = document.getElementById('form-sheet-select');
    const statusSelect = document.getElementById('form-status-select');

    if (anime) {
        document.getElementById('form-header-title').innerText = "修改動畫資料";
        document.getElementById('form-action').value = "edit";
        document.getElementById('form-id').value = anime.id;
        document.getElementById('form-id').readOnly = true; 
        document.getElementById('form-id').style.backgroundColor = "#e9ecef";
        sheetSelect.value = (anime.type === 'multi') ? "多季" : "單季";
        statusSelect.value = (anime.status === 'watched') ? 'watched' : 'unwatched';
        document.getElementById('form-title-input').value = anime.title;
        if (anime.date) {
            let d = new Date(anime.date.replace(/\//g, '-')); 
            if (!isNaN(d.getTime())) {
                let year = d.getFullYear();
                let month = ('0' + (d.getMonth() + 1)).slice(-2);
                let day = ('0' + d.getDate()).slice(-2);
                document.getElementById('form-date').value = `${year}-${month}-${day}`;
            } else { document.getElementById('form-date').value = ""; }
        } else { document.getElementById('form-date').value = ""; }
        document.getElementById('form-eps').value = anime.episodes;
        document.getElementById('form-rating').value = anime.rating;
        document.getElementById('form-img').value = anime.image;
        document.getElementById('form-note').value = anime.note;
    } else {
        document.getElementById('form-header-title').innerText = "新增動畫";
        document.getElementById('form-action').value = "add";
        document.getElementById('anime-form').reset();
        document.getElementById('form-id').readOnly = false;
        document.getElementById('form-id').style.backgroundColor = "white";
        sheetSelect.value = "單季";
        statusSelect.value = "watched";
    }
}

// --- 8. 提交寫入 Firebase 與 同步試算表 ---
animeForm.onsubmit = async (e) => {
    e.preventDefault();
    if(!confirm("確定要儲存變更嗎？")) return;

    const btn = document.querySelector('.submit-btn');
    const originalText = btn.innerText;
    btn.innerText = "處理中..."; btn.disabled = true;

    const newId = document.getElementById('form-id').value;
    const firestoreData = {
        id: newId,
        title: document.getElementById('form-title-input').value,
        date: document.getElementById('form-date').value,
        episodes: document.getElementById('form-eps').value,
        rating: document.getElementById('form-rating').value,
        imageUrl: document.getElementById('form-img').value,
        notes: document.getElementById('form-note').value,
        watchStatus: document.getElementById('form-status-select').value === 'watched' ? 'TRUE' : 'FALSE',
        animeType: document.getElementById('form-sheet-select').value === '多季' ? 'multi' : 'single'
    };

    try {
        // 寫入 Firebase
        await setDoc(doc(db, "animes", newId), firestoreData);
        
        // 背景同步到 Google 試算表
        if (gasApiUrl && gasApiUrl !== "你的_GAS_網頁應用程式_網址") {
            const syncData = { ...firestoreData, action: document.getElementById('form-action').value };
            fetch(gasApiUrl, {
                method: 'POST',
                body: JSON.stringify(syncData),
                mode: 'no-cors' 
            }).catch(err => console.log("備份至試算表失敗", err));
        }

        alert("儲存成功！");
        closeModal('form-modal');
        fetchAnimeData();
    } catch (error) { 
        alert("錯誤：" + error.message); 
    } 
    finally { btn.innerText = originalText; btn.disabled = false; }
};

// --- 9. 刪除資料與同步試算表 ---
async function deleteAnime(anime) {
    if (!confirm(`確定要刪除「${anime.title}」嗎？`)) return;
    try {
        document.getElementById('modal-title').innerText = "刪除中...";
        
        await deleteDoc(doc(db, "animes", anime.id));
        
        if (gasApiUrl && gasApiUrl !== "你的_GAS_網頁應用程式_網址") {
            fetch(gasApiUrl, {
                method: 'POST',
                body: JSON.stringify({ action: 'delete', id: anime.id }),
                mode: 'no-cors'
            }).catch(err => console.log("試算表刪除失敗", err));
        }

        alert("已刪除！");
        closeModal('detail-modal');
        fetchAnimeData();
    } catch (error) { 
        alert("刪除失敗：" + error.message); 
    }
}

// 工具函式
function getStarString(rating) {
    if (!rating) return "";
    const s = Math.max(0, Math.min(5, parseInt(rating)));
    return "★".repeat(s) + "☆".repeat(5 - s);
}

function closeModal(id) {
    document.getElementById(id).style.display = "none";
    document.body.style.overflow = "auto";
}
window.closeModal = closeModal; 
window.onclick = (e) => {
    if (e.target == detailModal) closeModal('detail-modal');
    if (e.target == formModal) closeModal('form-modal');
}
searchInput.addEventListener('input', applyFilterAndSort);
filterSelect.addEventListener('change', applyFilterAndSort);
typeSelect.addEventListener('change', applyFilterAndSort);
sortSelect.addEventListener('change', applyFilterAndSort);
btnAdd.addEventListener('click', () => openEditForm(null));

fetchAnimeData();