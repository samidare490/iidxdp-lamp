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
    
    // 読み込んだデータがHTMLだった場合（404ページなどを読み込んだ場合）
    if (csvText.includes('<html') || csvText.includes('<!DOCTYPE')) {
        alert("CSVではなくHTMLが読み込まれています。ファイルのパスや配置を確認してください。");
        return [];
    }
    
    // 行ごとに分割し、ヘッダー（1行目）を除外
    const lines = csvText.trim().split('\n').slice(1);
    
    return lines.map(line => {
        const [title, difficulty] = line.split(',');
        const id = `${title}_${difficulty}`.replace(/\s+/g, '');
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
}

// アプリの起動
initApp();
