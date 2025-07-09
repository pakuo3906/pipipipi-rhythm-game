#!/bin/bash

# Beat Slice: Pipipipi Edition - 簡単起動スクリプト
# Usage: ./start.sh [port]

set -e

# 色付きログ用の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# デフォルトポート
PORT=${1:-8000}

echo "🎮 Beat Slice: Pipipipi Edition - 起動スクリプト"
echo "================================================="

# 1. 環境チェック
log_info "環境チェック中..."

# 現在のディレクトリ確認
log_info "現在のディレクトリ: $(pwd)"

# 必要なファイルの存在確認
REQUIRED_FILES=(
    "index.html"
    "src/main.js"
    "src/engine/GameEngine.js"
    "src/engine/AudioSync.js"
    "src/engine/NoteManager.js"
    "src/engine/JudgmentSystem.js"
    "src/utils/ChartLoader.js"
    "src/utils/InputHandler.js"
    "pipipipi_shingou_chart.json"
)

MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    log_error "必要なファイルが見つかりません:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    exit 1
fi

log_success "必要なファイルが全て存在しています"

# 音楽ファイルの確認
if [ ! -f "ぴぴぴ… しんごう….mp3" ]; then
    log_warning "音楽ファイル 'ぴぴぴ… しんごう….mp3' が見つかりません"
    log_warning "ゲームは動作しますが、音楽は再生されません"
else
    log_success "音楽ファイルが見つかりました"
fi

# 2. Python環境チェック
log_info "Python環境をチェック中..."

PYTHON_CMD=""

if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    PYTHON_VERSION=$(python3 --version 2>&1)
    log_success "Python3が見つかりました: $PYTHON_VERSION"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    PYTHON_VERSION=$(python --version 2>&1)
    log_success "Pythonが見つかりました: $PYTHON_VERSION"
else
    log_error "Pythonが見つかりません"
    log_error "Python 3.x または Python 2.x をインストールしてください"
    exit 1
fi

# 3. ポート使用チェック
log_info "ポート $PORT の使用状況をチェック中..."

if command -v lsof &> /dev/null; then
    if lsof -i :$PORT &> /dev/null; then
        log_warning "ポート $PORT は既に使用されています"
        log_info "別のポートを使用します..."
        PORT=$((PORT + 1))
        while lsof -i :$PORT &> /dev/null; do
            PORT=$((PORT + 1))
        done
        log_info "ポート $PORT を使用します"
    fi
elif command -v netstat &> /dev/null; then
    if netstat -an | grep :$PORT &> /dev/null; then
        log_warning "ポート $PORT は既に使用されている可能性があります"
    fi
fi

# 4. ブラウザ自動起動の準備
BROWSER_CMD=""
if command -v google-chrome &> /dev/null; then
    BROWSER_CMD="google-chrome"
elif command -v firefox &> /dev/null; then
    BROWSER_CMD="firefox"
elif command -v safari &> /dev/null; then
    BROWSER_CMD="safari"
elif command -v microsoft-edge &> /dev/null; then
    BROWSER_CMD="microsoft-edge"
fi

# 5. サーバー起動
log_info "ローカルサーバーを起動中..."
echo ""
log_success "🚀 サーバーが起動しました!"
log_success "📱 ブラウザでアクセス: http://localhost:$PORT"
echo ""

# ブラウザを自動起動
if [ -n "$BROWSER_CMD" ]; then
    log_info "ブラウザを自動起動中..."
    sleep 2
    $BROWSER_CMD "http://localhost:$PORT" &> /dev/null &
fi

# 使用方法の表示
echo "🎮 操作方法:"
echo "  - マウスでノートをスライス"
echo "  - スペースキー: ポーズ/再開"
echo "  - Rキー: リトライ"
echo ""
echo "🛠️  デバッグ:"
echo "  - F12キーで開発者コンソールを開く"
echo "  - BeatSliceGame.gameEngine.getDebugInfo() でデバッグ情報表示"
echo ""
echo "⚠️  終了するには Ctrl+C を押してください"
echo ""

# サーバー起動（シンプルHTTPサーバー）
if [ "$PYTHON_CMD" = "python3" ]; then
    $PYTHON_CMD -m http.server $PORT
elif [ "$PYTHON_CMD" = "python" ]; then
    # Python 2.x の場合
    $PYTHON_CMD -m SimpleHTTPServer $PORT
fi