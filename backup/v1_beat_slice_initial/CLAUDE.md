# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a rhythm game chart repository containing:
- Song: "ぴぴぴ… しんごう…" by pa9wo
- Duration: 217.87 seconds
- BPM: 150
- Chart format: JSON with timed note events

## File Structure

- `pipipipi_shingou_chart.json` - Main chart file containing note timing and lane data
- `ぴぴぴ… しんごう….mp3` - Audio file for the song
- `.mcp.json` - Configuration file for MCP servers (Playwright and Context7)

## Chart Format

The chart uses a JSON structure with:
- `songInfo`: Basic song metadata (title, artist, duration, bpm)
- `chart`: Array of note events with properties:
  - `time`: Timing in seconds
  - `type`: Note type ("tap" or "hold")
  - `lane`: Lane identifier ("S", "A", "D")
  - `duration`: Hold duration in seconds (for hold notes only)

## Note Types and Lanes

- **Lanes**: S, A, D (likely corresponding to keyboard keys)
- **Note Types**:
  - `tap`: Single hit notes
  - `hold`: Notes that must be held for a specified duration

## MCP Configuration

The repository includes MCP server configuration for:
- Playwright (web automation)
- Context7 (documentation lookup)

## Working with Charts

When modifying chart data:
1. Ensure timing values are in ascending order
2. Maintain consistent lane naming (S, A, D)
3. Hold notes require both `time` and `duration` properties
4. Verify timing doesn't exceed song duration (217.87 seconds)

## Context7 完全自動化設定

システムはプロンプトを自動分析し、開発関連の内容を検出した場合にContext7の使用を推奨します。Context7は最新のライブラリ・フレームワークドキュメントを提供し、AIの幻覚を防ぎます。

### 自動化機能
- **プロンプト解析**: 各ツール使用前に自動的にプロンプトを分析
- **ライブラリ検出**: React、Next.js、Vue、Node.js等の技術キーワードを自動判定
- **推奨表示**: 関連ライブラリが検出された場合、Context7の使用を推奨

### 対応技術
- **Webフレームワーク**: React, Next.js, Vue, Svelte, Angular
- **バックエンド**: Express, Fastify, NestJS, Django, Flask, FastAPI
- **データベース**: Prisma, MongoDB, Supabase, Firebase
- **CSS**: Tailwind CSS, styled-components, Chakra UI
- **状態管理**: Redux, Zustand, Jotai
- **テスト**: Jest, Vitest, Cypress, Playwright
- **ビルドツール**: Vite, Webpack, Rollup

### 設定ファイル
- `~/.claude/settings.json`: フック設定
- `~/.claude/prompt_analyzer.py`: プロンプト解析スクリプト
- `~/.claude/auto_context7.sh`: 自動実行スクリプト

### 使用例
```
# 入力プロンプト
"React でユーザー認証コンポーネントを作成して"

# 自動検出結果
🔍 Context7: 開発関連のプロンプトを検出しました
📚 関連ライブラリ: /facebook/react
💡 最新のドキュメントを参照するため、プロンプトに 'use context7' を追加することを推奨します
```

### 利点
- 手動入力不要でContext7使用を推奨
- 最新ドキュメントへの自動アクセス
- 技術的な幻覚の防止
- 一貫したコード例とセットアップ手順

## 音声通知機能

Claude Code の処理状況を音声で通知する機能が設定されています。

### 通知タイミング
- **PostToolUse**: 各ツール実行完了時にビープ音
- **Stop**: 全体の処理完了時にビープ音
- **Notification**: 承認要求やエラー通知時にビープ音

### 設定ファイル
- `~/.claude/audio_notification.sh`: 音声通知スクリプト
- `~/.claude/sounds/`: 音声ファイル格納ディレクトリ（オプション）

### 音声ファイル
システムにnumpyがインストールされている場合、以下のカスタム音声ファイルが作成されます：
- `tool_complete.wav`: ツール完了音（軽やかなピコン音）
- `process_complete.wav`: 処理完了音（上昇する3音）
- `notification.wav`: 通知音（柔らかい2音）
- `error.wav`: エラー音（低めの警告音）

### 音声再生の仕組み
1. 音声ファイルが存在する場合：WAVファイルを再生
2. 音声ファイルが存在しない場合：システムビープ音を使用
3. 音声再生コマンド優先順位：`paplay` > `aplay` > `mpg123` > `ffplay` > ビープ音

### カスタマイズ
独自の音声ファイルを使用する場合は、`~/.claude/sounds/` ディレクトリに以下のファイルを配置してください：
- `tool_complete.wav`
- `process_complete.wav`
- `notification.wav`
- `error.wav`