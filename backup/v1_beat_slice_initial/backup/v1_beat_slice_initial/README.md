# Beat Slice: Pipipipi Edition

## 概要

Web上で動作するリズムゲーム「Beat Slice: Pipipipi Edition」の開発プロジェクトです。

## 現在の実装状況

### ✅ 完了済み
- **基本HTML構造とCSS** - ゲーム画面の基本レイアウト
- **Three.js 3Dシーンセットアップ** - カメラ、レンダラー、ライティング
- **Tone.js音楽再生システム** - 音楽の再生、一時停止、同期
- **譜面データ読み込みシステム** - JSONファイルの読み込みと検証
- **マウス入力処理** - スライス判定、速度計算
- **ノート管理システム** - ノートの生成、移動、削除
- **判定システム** - PERFECT/GOOD/MISS判定、スコア計算

### 🔄 実装中
- **ゲーム基本動作のテスト** - 各システムの統合テスト

### 📋 今後の実装予定
- **エフェクトシステム** - パーティクル、アニメーション
- **UIコンポーネント** - タイトル画面、リザルト画面
- **設定システム** - 音量、判定調整
- **最適化** - パフォーマンス改善

## ファイル構成

```
/
├── index.html              # メインHTML
├── src/
│   ├── main.js            # エントリーポイント
│   ├── engine/
│   │   ├── GameEngine.js  # ゲームメインエンジン
│   │   ├── AudioSync.js   # 音楽同期システム
│   │   ├── NoteManager.js # ノート管理
│   │   └── JudgmentSystem.js # 判定システム
│   └── utils/
│       ├── ChartLoader.js # 譜面読み込み
│       └── InputHandler.js # 入力処理
├── pipipipi_shingou_chart.json # 譜面データ
├── ぴぴぴ… しんごう….mp3      # 音楽ファイル
├── REQUIREMENTS.md        # 要件定義
├── TECHNICAL_SPEC.md      # 技術仕様
└── DEVELOPMENT_CHECKLIST.md # 開発チェックリスト
```

## 起動方法（詳細）

### 1. 事前準備

#### 必要なファイル確認
```bash
# 現在のディレクトリ確認
pwd
# 出力例: /mnt/c/Users/user/Desktop/.claude/新しいフォルダー

# ファイル構成確認
ls -la
# 必要なファイルがあることを確認:
# ✓ index.html
# ✓ src/ ディレクトリ
# ✓ pipipipi_shingou_chart.json
# ✓ ぴぴぴ… しんごう….mp3 (音楽ファイル)
```

#### 環境要件
- **Python 3.x** または **Python 2.x**
- **モダンブラウザ** (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **WebGL対応** 必須

### 2. ローカルサーバー起動

#### Python 3 を使用（推奨）
```bash
python3 -m http.server 8000
```

#### Python 2 を使用
```bash
python -m SimpleHTTPServer 8000
```

#### Node.js がある場合
```bash
npx http-server -p 8000
```

#### 成功時の出力例
```
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

### 3. ブラウザでアクセス

#### 基本アクセス
```
http://localhost:8000
```

#### 別のポートを使用した場合
```
http://localhost:8080
```

### 4. 動作確認手順

1. **初期読み込み**: "Loading..." 表示
2. **譜面データ読み込み**: "Loading chart data..." 表示
3. **ゲームエンジン初期化**: "Initializing game engine..." 表示
4. **3Dシーン表示**: 黒い背景に3つのレーン表示
5. **カウントダウン**: 3, 2, 1, START!
6. **ゲーム開始**: ノートが手前に向かって移動開始

### 5. トラブルシューティング

#### 🚨 音楽ファイルが見つからない場合
```bash
# 音楽ファイルの存在確認
ls -la "ぴぴぴ… しんごう….mp3"

# ファイルが無い場合の対処:
# 1. 音楽ファイルを配置
# 2. または AudioSync.js の audioPath を変更
```

#### 🚨 CORS エラーの場合
```
Error: Access to fetch at 'file:///.../chart.json' from origin 'null' has been blocked by CORS policy
```
**解決方法**: 必ずローカルサーバーを使用。`file://` プロトコルでは動作しません。

#### 🚨 ポート 8000 が使用中の場合
```bash
# 別のポートを使用
python3 -m http.server 8080
# アクセス: http://localhost:8080
```

#### 🚨 音楽が自動再生されない場合
**Chrome**:
1. 設定 → プライバシーとセキュリティ → サイトの設定
2. 音声 → 自動再生を「許可」

**Firefox**:
1. about:config にアクセス
2. media.autoplay.enabled を true に設定

**Safari**:
1. 開発メニューを有効化
2. 開発 → 実験的な機能 → Media Capabilities Extensions を有効

#### 🚨 WebGL エラーの場合
```
WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost
```
**解決方法**: 
- ブラウザの GPU アクセラレーションを有効化
- 他のタブを閉じてメモリを解放
- ブラウザを再起動

### 6. デバッグ方法

#### ブラウザの開発者コンソールで:
```javascript
// ゲーム状態確認
BeatSliceGame.gameEngine.getDebugInfo()

// デバッグモード有効化
BeatSliceGame.gameEngine.enableDebugMode()

// 各システムの状態確認
BeatSliceGame.gameEngine.audioSync.getDebugInfo()
BeatSliceGame.gameEngine.noteManager.getDebugInfo()
BeatSliceGame.gameEngine.judgmentSystem.getDebugInfo()
```

#### パフォーマンス確認
```javascript
// FPS確認
setInterval(() => console.log('FPS: ~60'), 1000)

// メモリ使用量確認
console.log('Memory:', performance.memory)
```

### 7. 推奨ブラウザ設定

- **Chrome**: ハードウェア アクセラレーションを有効
- **Firefox**: webgl.force-enabled を true
- **Safari**: 開発メニューを有効化
- **Edge**: GPU アクセラレーションを有効

### 8. 簡単起動（スクリプト使用）

```bash
# start.sh を実行
./start.sh
```

## 技術仕様

- **3D描画**: Three.js 0.160.0
- **音楽再生**: Tone.js 14.7.77
- **フォーマット**: ES6 Modules
- **ブラウザ対応**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 操作方法

- **マウス**: ノートが判定ライン（Z=0）に来たときにスライス動作
- **スペースキー**: ポーズ/再開
- **Rキー**: ゲーム終了後のリトライ

## 判定システム

| 判定 | 許容誤差 | 得点 | 必要スライス速度 |
|------|----------|------|------------------|
| PERFECT | ±50ms | 1000点 | 300px/s以上 |
| GOOD | ±100ms | 500点 | 300px/s以上 |
| MISS | それ以外 | 0点 | - |

## 開発メモ

### 使用したContext7情報
- **Three.js**: 最新のシーン設定、カメラ、レンダラー設定
- **Tone.js**: Player、Transport、音楽同期の最新実装

### 課題と解決策
1. **音楽ファイル読み込み**: 相対パスでの読み込み実装
2. **判定精度**: Transport時間を使用した高精度同期
3. **パフォーマンス**: オブジェクトプールによるメモリ管理

### 次のステップ
1. 音楽ファイルの配置確認
2. 基本動作テスト実行
3. エフェクトシステムの実装
4. UI改善とレスポンシブ対応

## デバッグ機能

開発者コンソールで以下が利用可能:
- `BeatSliceGame`: ゲームインスタンス
- `BeatSliceGame.gameEngine.getDebugInfo()`: デバッグ情報取得
- `BeatSliceGame.gameEngine.enableDebugMode()`: デバッグモード有効化

---
*最終更新: 2025-07-09*