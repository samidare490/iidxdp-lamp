// Firebase SDK のインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// TODO: ご自身のFirebase設定に置き換えてください
const firebaseConfig = {
  apiKey: "AIzaSyAiFZuSFftUNWD57s8mmqrRo53yRv2MFYA",
  authDomain: "iidxdp-lamp.firebaseapp.com",
  databaseURL: "https://iidxdp-lamp-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iidxdp-lamp",
  storageBucket: "iidxdp-lamp.firebasestorage.app",
  messagingSenderId: "1070802681747",
  appId: "1:1070802681747:web:be1683bad55dadb966f266"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// CSVデータを読み込んでパースする関数
async function loadCSV() {
    const response = await fetch('songs.csv');
    const csvText = await response.text();
    
    // 行ごとに分割し、ヘッダー（1行目）を除外
    const lines = csvText.trim().split('\n').slice(1);
    
    return lines.map(line => {
        const [title, difficulty] = line.split(',');
        // FirebaseのドキュメントIDとして使えるように一意のIDを生成 (例: StarrySky_NORMAL)
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
