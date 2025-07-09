# Beat Slice: Pipipipi Edition - デバッグガイド

## 概要

このドキュメントは開発者向けのデバッグ情報とトラブルシューティングガイドです。

## デバッグ機能の有効化

### 1. コンソールでのデバッグ

#### 基本的なデバッグ情報
```javascript
// ゲーム全体の状態確認
BeatSliceGame.gameEngine.getDebugInfo()

// 各システムの詳細情報
BeatSliceGame.gameEngine.audioSync.getDebugInfo()
BeatSliceGame.gameEngine.noteManager.getDebugInfo()
BeatSliceGame.gameEngine.judgmentSystem.getDebugInfo()
BeatSliceGame.gameEngine.inputHandler.getDebugInfo()
```

#### デバッグモードの有効化
```javascript
// ゲームエンジンのデバッグモード
BeatSliceGame.gameEngine.enableDebugMode()

// 各システムのデバッグモード
BeatSliceGame.gameEngine.noteManager.enableDebugMode()
BeatSliceGame.gameEngine.inputHandler.enableDebugMode()
```

### 2. パフォーマンス監視

#### フレームレート監視
```javascript
// FPS計測
let lastTime = performance.now()
let frameCount = 0
setInterval(() => {
  const now = performance.now()
  const fps = frameCount / ((now - lastTime) / 1000)
  console.log(`FPS: ${fps.toFixed(1)}`)
  frameCount = 0
  lastTime = now
}, 1000)

// フレームカウンター
function countFrames() {
  frameCount++
  requestAnimationFrame(countFrames)
}
countFrames()
```

#### メモリ使用量監視
```javascript
// メモリ使用量チェック
function checkMemory() {
  if (performance.memory) {
    const memory = performance.memory
    console.log('Memory Usage:', {
      used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
      total: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
      limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
    })
  }
}
setInterval(checkMemory, 5000)
```

## よくある問題と解決策

### 🚨 音楽関連の問題

#### 音楽ファイルが読み込めない
**症状**: "Audio loading error" または "Audio file not found"
**原因**: 音楽ファイルのパスが間違っている、またはファイルが存在しない

**解決方法**:
```javascript
// 音楽ファイルの存在確認
fetch('./ぴぴぴ… しんごう….mp3')
  .then(response => console.log('音楽ファイル:', response.status))
  .catch(error => console.error('音楽ファイルエラー:', error))

// AudioSync の状態確認
BeatSliceGame.gameEngine.audioSync.getState()
```

#### 音楽の同期がずれる
**症状**: ノートのタイミングと音楽がずれる
**原因**: オーディオ遅延、システムの処理遅延

**解決方法**:
```javascript
// オーディオオフセット調整
BeatSliceGame.gameEngine.audioSync.setAudioOffset(0.1) // 100ms遅延

// Transport時間と現在時間の確認
const audioSync = BeatSliceGame.gameEngine.audioSync
console.log('Transport時間:', audioSync.transport.seconds)
console.log('現在時間:', audioSync.getCurrentTime())
```

### 🚨 判定システムの問題

#### 判定が厳しすぎる/甘すぎる
**症状**: PERFECT/GOODが出にくい、または出すぎる
**原因**: 判定ウィンドウの設定が適切でない

**解決方法**:
```javascript
// 判定ウィンドウの調整
const judgment = BeatSliceGame.gameEngine.judgmentSystem
judgment.adjustJudgmentWindow('perfect', 0.08) // 80ms
judgment.adjustJudgmentWindow('good', 0.15) // 150ms

// 判定オフセット調整
judgment.setJudgmentOffset(0.05) // 50ms早める
```

#### マウススライスが認識されない
**症状**: スライスしてもMISSになる
**原因**: スライス速度が足りない、または判定範囲外

**解決方法**:
```javascript
// スライス速度の調整
BeatSliceGame.gameEngine.inputHandler.setMinSliceSpeed(200) // 200px/s

// 入力状態の確認
BeatSliceGame.gameEngine.inputHandler.getDebugInfo()
```

### 🚨 Three.js関連の問題

#### ノートが表示されない
**症状**: 3Dシーンは表示されるがノートが見えない
**原因**: カメラの位置、ノートの生成位置、またはマテリアルの問題

**解決方法**:
```javascript
// カメラ位置の確認
const camera = BeatSliceGame.gameEngine.camera
console.log('カメラ位置:', camera.position)

// アクティブノートの確認
const notes = BeatSliceGame.gameEngine.noteManager.getActiveNotes()
console.log('アクティブノート数:', notes.length)

// シーン内オブジェクトの確認
BeatSliceGame.gameEngine.scene.traverse((object) => {
  if (object.isMesh) {
    console.log('オブジェクト:', object.name, object.position)
  }
})
```

#### WebGLエラー
**症状**: WebGL context lost エラー
**原因**: GPU メモリ不足、またはブラウザの制限

**解決方法**:
```javascript
// WebGLコンテキストの確認
const renderer = BeatSliceGame.gameEngine.renderer
console.log('WebGL情報:', renderer.info)

// コンテキストロストの監視
renderer.domElement.addEventListener('webglcontextlost', (event) => {
  console.error('WebGL context lost:', event)
  event.preventDefault()
})
```

### 🚨 パフォーマンスの問題

#### フレームレートが低い
**症状**: カクつき、60fps未満
**原因**: GPU負荷、メモリリーク、または不適切な描画

**解決方法**:
```javascript
// 描画統計の確認
const renderer = BeatSliceGame.gameEngine.renderer
console.log('描画統計:', renderer.info.render)

// オブジェクトプールの状態確認
const noteManager = BeatSliceGame.gameEngine.noteManager
console.log('ノートプール:', noteManager.getDebugInfo())

// 不要なオブジェクトの削除
BeatSliceGame.gameEngine.scene.traverse((object) => {
  if (object.isMesh && !object.visible) {
    console.log('非表示オブジェクト:', object.name)
  }
})
```

## 高度なデバッグ機能

### 1. カスタムデバッグUI

```javascript
// デバッグ情報をHTML要素に表示
function createDebugUI() {
  const debugDiv = document.createElement('div')
  debugDiv.id = 'debugUI'
  debugDiv.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px;
    font-family: monospace;
    font-size: 12px;
    z-index: 1000;
    max-width: 300px;
  `
  document.body.appendChild(debugDiv)
  
  setInterval(() => {
    const engine = BeatSliceGame.gameEngine
    debugDiv.innerHTML = `
      <div>FPS: ${(1000/engine.clock.getDelta()).toFixed(1)}</div>
      <div>時間: ${engine.currentTime.toFixed(2)}s</div>
      <div>ノート: ${engine.noteManager.activeNotes.length}</div>
      <div>スコア: ${engine.judgmentSystem.getScore()}</div>
      <div>コンボ: ${engine.judgmentSystem.getCombo()}</div>
    `
  }, 100)
}

// 実行
createDebugUI()
```

### 2. ログ出力の制御

```javascript
// ログレベルの設定
window.DEBUG_LEVEL = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

window.CURRENT_LOG_LEVEL = window.DEBUG_LEVEL.INFO

// カスタムログ関数
function debugLog(level, message, ...args) {
  if (level <= window.CURRENT_LOG_LEVEL) {
    const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG']
    console.log(`[${levels[level]}] ${message}`, ...args)
  }
}

// 使用例
debugLog(window.DEBUG_LEVEL.DEBUG, 'ノート生成:', noteData)
```

### 3. パフォーマンス測定

```javascript
// 関数実行時間の測定
function measurePerformance(name, fn) {
  const start = performance.now()
  const result = fn()
  const end = performance.now()
  console.log(`${name}: ${(end - start).toFixed(2)}ms`)
  return result
}

// 使用例
measurePerformance('ノート更新', () => {
  BeatSliceGame.gameEngine.noteManager.update(currentTime)
})
```

## トラブルシューティング チェックリスト

### 起動時の問題
- [ ] 必要なファイルが全て存在する
- [ ] ローカルサーバーが起動している
- [ ] ブラウザでCORS エラーが発生していない
- [ ] WebGL が有効になっている

### 音楽再生の問題
- [ ] 音楽ファイルが存在する
- [ ] ブラウザの自動再生ポリシーが適切に設定されている
- [ ] Tone.js が正しく初期化されている
- [ ] Audio Context が開始されている

### 判定システムの問題
- [ ] マウス入力が検出されている
- [ ] スライス速度が適切な閾値を超えている
- [ ] 判定ウィンドウが適切に設定されている
- [ ] ノートが判定位置に到達している

### パフォーマンスの問題
- [ ] フレームレートが60fps を維持している
- [ ] メモリ使用量が適切な範囲内
- [ ] GPU使用率が過度に高くない
- [ ] 不要なオブジェクトが削除されている

## 開発者向けのヒント

1. **定期的にデバッグ情報を確認**する
2. **パフォーマンス測定を習慣化**する
3. **エラーログを常に監視**する
4. **ブラウザの開発者ツールを活用**する
5. **段階的にデバッグ**を行う

---
*最終更新: 2025-07-09*