// Firebase SDK のインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// TODO: ご自身のFirebase設定に置き換えてください
const firebaseConfig = {
  apiKey: "AIzaSyAiFZuSFftUNWD57s8mmqrRo53yRv2MFYA",
  authDomain: "iidxdp-lamp.firebaseapp.com",
  projectId: "iidxdp-lamp",
  storageBucket: "iidxdp-lamp.firebasestorage.app",
  messagingSenderId: "1070802681747",
  appId: "1:1070802681747:web:be1683bad55dadb966f266"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const statusClasses = {
    "NOPLAY": "status-notplayed",
    "FAILED": "status-failed",
    "EASY": "status-easy",
    "HARD": "status-hard"
};

// CSVデータを読み込んでパースする関数
async function loadCSV() {
    const response = await fetch('11.csv');
    
    // ファイルが存在しない（404エラーなど）場合は処理を止める
    if (!response.ok) {
        alert(`CSVの読み込みに失敗しました: ${response.status}`);
        return [];
    }

    const csvText = await response.text();
    const lines = csvText.trim().split('\n').slice(1);

    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                // 現在ダブルクォーテーションで囲まれている最中で、かつ次の文字もダブルクォーテーションの場合
                if (inQuotes && line[i + 1] === '"') {
                    current += '"'; // 文字として1つだけ追加する
                    i++;            // 次の文字(2つ目の")は処理済みなのでスキップ
                } else {
                    // それ以外の場合は、囲みの開始・終了の切り替え
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // ダブルクォーテーションの外にあるカンマなら区切る
                result.push(current);
                current = '';
            } else {
                // それ以外の文字
                current += char;
            }
        }
        result.push(current);
        return result;
    }
    
    return lines.map(line => {
        // 単純な split(',') ではなく、作成した関数で分割する
        const [title, difficulty] = parseCSVLine(line);
        
        // idを生成する際、空白に加えてダブルクォーテーションも除去しておく
        const id = `${title}_${difficulty}`.replace(/[\s"]/g, '');
        
        return { id, title, difficulty };
    });
}

// Firestoreから現在のクリア状況を全取得する関数
async function loadClearData() {
    const querySnapshot = await getDocs(collection(db, "clear_status"));
    const statusData = {};
    querySnapshot.forEach((doc) => {
        statusData[doc.id] = doc.data().status;
    });
    return statusData; // { 'StarrySky_NORMAL': 'クリア', ... }
}

function updateCardColor(cardElement, status) {
    // 既存のすべてのステータスクラスを削除
    Object.values(statusClasses).forEach(className => {
        cardElement.classList.remove(className);
    });

    // 新しいステータスに対応するクラスを追加
    if (statusClasses[status]) {
        cardElement.classList.add(statusClasses[status]);
    }
}

// 画面を構築する関数
async function initApp() {
    const container = document.getElementById('game-data-container');
    
    // CSVとFirebaseの両方からデータを取得
    const [songs, savedStatus] = await Promise.all([loadCSV(), loadClearData()]);

    songs.forEach(song => {
        // 保存されたステータスがあるか確認。なければ「未プレイ」
        const currentStatus = savedStatus[song.id] || "NOPLAY";

        // カード要素の作成
        const card = document.createElement('div');
        card.className = 'card';
        updateCardColor(card, currentStatus);
      
        card.innerHTML = `
            <div class="song-title">${song.title}</div>
            <div class="song-diff">${song.difficulty}</div>
            <select data-id="${song.id}">
                <option value="NOPLAY" ${currentStatus === "NOPLAY" ? "selected" : ""}>NOPLAY</option>
                <option value="FAILED" ${currentStatus === "FAILED" ? "selected" : ""}>FAILED</option>
                <option value="EASY" ${currentStatus === "EASY" ? "selected" : ""}>EASY</option>
                <option value="HARD" ${currentStatus === "HARD" ? "selected" : ""}>HARD</option>
            </select>
        `;
        container.appendChild(card);
    });

    // プルダウン変更時にFirebaseに保存するイベントリスナー
    container.addEventListener('change', async (e) => {
        if (e.target.tagName === 'SELECT') {
            const songId = e.target.getAttribute('data-id');
            const newStatus = e.target.value;

          // 【追加】プルダウン変更時に、即座にカードの色を変更する
            const cardElement = e.target.closest('.card');
            updateCardColor(cardElement, newStatus);

            try {
                // Firestoreにデータを保存 (上書き)
                await setDoc(doc(db, "clear_status", songId), {
                    status: newStatus
                });
                console.log(`${songId} の状態を「${newStatus}」に保存しました。`);
            } catch (error) {
                console.error("保存エラー:", error);
                alert("データの保存に失敗しました。");
            }
        }
    });

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        // 入力された文字を取得（大文字・小文字を区別しないように小文字に変換）
        const keyword = e.target.value.toLowerCase();
        
        // すべてのカード要素を取得
        const cards = container.querySelectorAll('.card');
        
        cards.forEach(card => {
            // カード内の曲名を取得
            const title = card.querySelector('.song-title').textContent.toLowerCase();
            
            // 曲名に入力したキーワードが含まれていれば表示、なければ非表示
            if (title.includes(keyword)) {
                card.style.display = 'flex'; // .card は元々 display: flex
            } else {
                card.style.display = 'none';
            }
        });
    });

    const modal = document.getElementById('stats-modal');
    const openModalBtn = document.getElementById('open-modal-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    let chartInstance = null;

    // 難易度ごとのクリア状況を集計してグラフを描画する関数
    function renderStatsChart() {
        const cards = container.querySelectorAll('.card');
        const difficulties = [];
        const stats = {};
        const statuses = ["NOPLAY", "FAILED", "EASY", "HARD"];

        // 1. 各カードから難易度と選択中のステータスを集計
        cards.forEach(card => {
            const diff = card.querySelector('.song-diff').textContent.trim();
            const status = card.querySelector('select').value;

            if (!stats[diff]) {
                stats[diff] = { "NOPLAY": 0, "FAILED": 0, "EASY": 0, "HARD": 0 };
                difficulties.push(diff);
            }
            stats[diff][status]++;
        });

        // 2. 100%比率に変換したデータセットを作成
        const colorPalette = {
            "NOPLAY": "#ffffff",
            "FAILED": "#8b8b8b",
            "EASY": "#73ff45",
            "HARD": "#ff5959"
        };

        const datasets = statuses.map(status => {
            const data = difficulties.map(diff => {
                const total = statuses.reduce((sum, s) => sum + stats[diff][s], 0);
                return total > 0 ? ((stats[diff][status] / total) * 100).toFixed(1) : 0;
            });

            return {
                label: status,
                data: data,
                backgroundColor: colorPalette[status]
            };
        });

        // 3. 既存のグラフがあれば破棄して再作成
        if (chartInstance) {
            chartInstance.destroy();
        }

        const ctx = document.getElementById('statsChart').getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: difficulties,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        stacked: true // X軸で積み上げ
                    },
                    y: {
                        stacked: true, // Y軸で積み上げ
                        max: 100,      // 100%積み上げ
                        ticks: {
                            display: false
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: context => `${context.dataset.label}: ${context.raw}%`
                        }
                    }
                }
            }
        });
    }

    // モーダルを開く
    openModalBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        renderStatsChart();
    });

    // 閉じるボタンで閉じる
    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // 背景クリックで閉じる
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// アプリの起動
initApp();
