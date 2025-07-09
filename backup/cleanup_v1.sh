#!/bin/bash

# Beat Slice v1.0 実装のクリーンアップスクリプト
# 要件定義見直し前の実装を削除

echo "🗑️ Beat Slice v1.0 実装のクリーンアップを開始します"
echo "=============================================="

# 削除対象ファイル一覧
FILES_TO_DELETE=(
    "index.html"
    "test.html"
    "start.sh"
    "src/"
    "pipipipi_shingou_chart.json"
    "pipipipi_shingou.mp3"
    "REQUIREMENTS.md"
    "TECHNICAL_SPEC.md"
    "DEVELOPMENT_CHECKLIST.md"
    "DEBUG.md"
    "README.md"
)

echo "削除対象ファイル:"
for file in "${FILES_TO_DELETE[@]}"; do
    if [ -e "$file" ]; then
        echo "  ✅ $file (存在)"
    else
        echo "  ❌ $file (未発見)"
    fi
done

echo ""
read -p "これらのファイルを削除しますか? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️ ファイルを削除中..."
    
    for file in "${FILES_TO_DELETE[@]}"; do
        if [ -e "$file" ]; then
            rm -rf "$file"
            echo "  ✅ $file を削除しました"
        else
            echo "  ⚠️ $file は存在しません"
        fi
    done
    
    echo ""
    echo "✅ クリーンアップが完了しました"
    echo "バックアップは backup/v1_beat_slice_initial/ に保存されています"
else
    echo "❌ クリーンアップをキャンセルしました"
fi

echo ""
echo "📋 残存ファイル:"
ls -la | grep -E '\.(js|html|md|json|mp3|sh)$' || echo "  削除対象ファイルはありません"