# Beat Slice: Pipipipi Edition - 技術仕様書

## アーキテクチャ概要
```
┌─────────────────────────────────────────────────────────────┐
│                    Beat Slice Game Engine                   │
├─────────────────────────────────────────────────────────────┤
│ UI Layer (HTML/CSS/React)                                   │
│ ├─ HUD Components (Score, Combo, Timer)                     │
│ ├─ Menu System (Title, Settings, Results)                   │
│ └─ Input Handler (Mouse Events)                             │
├─────────────────────────────────────────────────────────────┤
│ Game Logic Layer (JavaScript)                               │
│ ├─ Game State Manager                                       │
│ ├─ Note Manager (Spawning, Lifecycle)                       │
│ ├─ Judgment System (Timing, Scoring)                        │
│ └─ Audio Sync Engine                                        │
├─────────────────────────────────────────────────────────────┤
│ 3D Rendering Layer (Three.js)                               │
│ ├─ Scene Management                                         │
│ ├─ Note Rendering (Geometry, Materials)                     │
│ ├─ Effect System (Particles, Animations)                    │
│ └─ Camera Controller                                        │
├─────────────────────────────────────────────────────────────┤
│ Audio Layer (Tone.js/Howler.js)                             │
│ ├─ Music Playback                                           │
│ ├─ Sound Effects                                            │
│ └─ Timing Synchronization                                   │
└─────────────────────────────────────────────────────────────┘
```

## コア技術スタック

### 必須ライブラリ
```javascript
{
  "three": "^0.160.0",           // 3D描画エンジン
  "tone": "^14.7.77",            // 音楽再生・同期
  "react": "^18.2.0",            // UI構築
  "tailwindcss": "^3.4.0",       // CSS framework
  "gsap": "^3.12.2"              // アニメーション
}
```

### 補助ライブラリ
```javascript
{
  "three-stdlib": "^2.28.0",     // Three.js 拡張
  "react-three-fiber": "^8.15.0", // React + Three.js
  "zustand": "^4.4.7",           // 状態管理
  "howler": "^2.2.3"             // 音声再生（代替）
}
```

## ファイル構成
```
project/
├── src/
│   ├── components/           # React Components
│   │   ├── ui/              # UI コンポーネント
│   │   ├── game/            # ゲーム関連コンポーネント
│   │   └── effects/         # エフェクト
│   ├── engine/              # ゲームエンジン
│   │   ├── GameEngine.js    # メインエンジン
│   │   ├── NoteManager.js   # ノート管理
│   │   ├── JudgmentSystem.js # 判定システム
│   │   └── AudioSync.js     # 音声同期
│   ├── three/               # Three.js関連
│   │   ├── Scene.js         # シーン管理
│   │   ├── NoteRenderer.js  # ノート描画
│   │   └── EffectManager.js # エフェクト管理
│   ├── utils/               # ユーティリティ
│   │   ├── ChartLoader.js   # 譜面読み込み
│   │   ├── InputHandler.js  # 入力処理
│   │   └── MathUtils.js     # 数学関数
│   └── styles/              # スタイル
├── public/
│   ├── assets/
│   │   ├── audio/           # 音楽ファイル
│   │   ├── textures/        # テクスチャ
│   │   └── models/          # 3Dモデル
│   └── charts/              # 譜面データ
└── docs/                    # ドキュメント
```

## 3D描画システム

### シーン構成
```javascript
// Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Camera Position
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
```

### ノート描画仕様
```javascript
// Note Geometry
const noteGeometry = new THREE.BoxGeometry(1, 0.2, 0.5);
const tapMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
const holdMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });

// Lane Positions
const lanes = {
  'A': { x: -2, y: 0 },
  'S': { x: 0, y: 0 },
  'D': { x: 2, y: 0 }
};

// Note Movement
note.position.z = noteSpeed * (currentTime - note.time) + spawnDistance;
```

## 音声同期システム

### Tone.js設定
```javascript
// Audio Context Setup
await Tone.start();
const player = new Tone.Player('path/to/song.mp3').toDestination();
const transport = Tone.Transport;

// Sync Configuration
transport.bpm.value = 150;
transport.timeSignature = [4, 4];

// Timing Calculation
const currentTime = transport.seconds + audioOffset;
const noteHitTime = note.time - lookAheadTime;
```

### 遅延補正
```javascript
// Audio Calibration
const audioOffset = 0.05; // 50ms補正
const visualOffset = 0.02; // 20ms補正

// Adaptive Sync
const syncError = detectedBeat - expectedBeat;
if (Math.abs(syncError) > 0.01) {
  audioOffset += syncError * 0.1;
}
```

## 判定システム

### マウス判定
```javascript
class MouseJudgment {
  constructor() {
    this.velocity = { x: 0, y: 0 };
    this.position = { x: 0, y: 0 };
    this.lastPosition = { x: 0, y: 0 };
    this.minSliceSpeed = 300; // px/s
  }

  update(deltaTime) {
    // 速度計算
    this.velocity.x = (this.position.x - this.lastPosition.x) / deltaTime;
    this.velocity.y = (this.position.y - this.lastPosition.y) / deltaTime;
    
    // 判定
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    return speed > this.minSliceSpeed;
  }
}
```

### タイミング判定
```javascript
class TimingJudgment {
  judge(noteTime, currentTime) {
    const diff = Math.abs(noteTime - currentTime);
    
    if (diff <= 0.05) return 'PERFECT';
    if (diff <= 0.1) return 'GOOD';
    return 'MISS';
  }
}
```

## 状態管理

### Zustand Store
```javascript
const useGameStore = create((set, get) => ({
  // Game State
  gameState: 'title', // title, playing, paused, result
  score: 0,
  combo: 0,
  maxCombo: 0,
  perfectCount: 0,
  goodCount: 0,
  missCount: 0,
  
  // Audio State
  isPlaying: false,
  currentTime: 0,
  duration: 217.87,
  
  // Settings
  volume: 0.8,
  audioOffset: 0.05,
  judgmentOffset: 0.0,
  
  // Actions
  updateScore: (judgment) => set((state) => ({
    score: state.score + getScore(judgment),
    combo: judgment === 'MISS' ? 0 : state.combo + 1
  }))
}));
```

## パフォーマンス最適化

### レンダリング最適化
```javascript
// Object Pooling
class NotePool {
  constructor(size = 100) {
    this.pool = [];
    this.active = [];
    for (let i = 0; i < size; i++) {
      this.pool.push(new Note());
    }
  }
  
  acquire() {
    return this.pool.pop() || new Note();
  }
  
  release(note) {
    note.reset();
    this.pool.push(note);
  }
}

// Frustum Culling
const frustum = new THREE.Frustum();
frustum.setFromProjectionMatrix(camera.projectionMatrix);
notes.forEach(note => {
  if (frustum.containsPoint(note.position)) {
    note.visible = true;
  } else {
    note.visible = false;
  }
});
```

### メモリ管理
```javascript
// Garbage Collection
const cleanup = () => {
  // Remove finished notes
  notes = notes.filter(note => note.position.z > -10);
  
  // Dispose unused geometries
  unusedGeometries.forEach(geometry => {
    geometry.dispose();
  });
  
  // Clear texture cache
  THREE.Cache.clear();
};
```

## エラーハンドリング

### 音声エラー
```javascript
player.onerror = (error) => {
  console.error('Audio error:', error);
  // フォールバック処理
  showError('音楽ファイルの読み込みに失敗しました');
};
```

### WebGL エラー
```javascript
const handleWebGLError = (error) => {
  console.error('WebGL error:', error);
  // Canvas 2D フォールバック
  switchToCanvas2D();
};
```

## デバッグ機能

### デバッグUI
```javascript
if (process.env.NODE_ENV === 'development') {
  const gui = new dat.GUI();
  gui.add(settings, 'audioOffset', -0.2, 0.2);
  gui.add(settings, 'noteSpeed', 0.5, 2.0);
  gui.add(settings, 'judgmentWindow', 0.05, 0.2);
}
```

### パフォーマンス監視
```javascript
const stats = new Stats();
document.body.appendChild(stats.dom);

// フレームレート監視
const monitorFPS = () => {
  stats.begin();
  render();
  stats.end();
  requestAnimationFrame(monitorFPS);
};
```

## ビルド・デプロイ

### Webpack設定
```javascript
module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  }
};
```

### Service Worker
```javascript
// キャッシュ戦略
const CACHE_NAME = 'beat-slice-v1.2';
const urlsToCache = [
  '/',
  '/bundle.js',
  '/styles.css',
  '/assets/audio/pipipipi_shingou.mp3',
  '/charts/pipipipi_shingou_chart.json'
];
```

---
*更新日: 2025-07-09*
*バージョン: 1.2*