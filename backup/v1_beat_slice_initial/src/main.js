import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { GameEngine } from './engine/GameEngine.js';
import { ChartLoader } from './utils/ChartLoader.js';

class BeatSliceGame {
    constructor() {
        this.gameEngine = null;
        this.chartData = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            // UI要素を取得
            this.canvas = document.getElementById('gameCanvas');
            this.loadingElement = document.getElementById('loading');
            this.corsWarningElement = document.getElementById('corsWarning');
            
            // CORS エラーチェック
            if (this.checkCORSIssue()) {
                this.showCORSWarning();
                return;
            }
            
            // 診断情報の出力
            this.outputDiagnostics();
            
            // 譜面データの読み込み
            this.loadingElement.textContent = 'Loading chart data...';
            console.log('🎵 Loading chart data...');
            this.chartData = await ChartLoader.load('./pipipipi_shingou_chart.json');
            
            // ゲームエンジンの初期化
            this.loadingElement.textContent = 'Initializing game engine...';
            console.log('🎮 Initializing game engine...');
            this.gameEngine = new GameEngine(this.canvas, this.chartData);
            await this.gameEngine.init();
            
            // ローディング画面を非表示
            this.loadingElement.style.display = 'none';
            
            this.isInitialized = true;
            console.log('✅ Beat Slice Game initialized successfully');
            
            // 開発用: 自動的にゲームを開始
            this.startGame();
            
        } catch (error) {
            console.error('❌ Failed to initialize Beat Slice Game:', error);
            this.handleInitializationError(error);
        }
    }

    checkCORSIssue() {
        // file:// プロトコルでアクセスしているかチェック
        return window.location.protocol === 'file:';
    }

    showCORSWarning() {
        this.loadingElement.style.display = 'none';
        this.corsWarningElement.style.display = 'block';
        console.error('🚨 CORS Issue: Please use a local server to run this application');
        console.log('💡 Solution: Run "python3 -m http.server 8000" and access http://localhost:8000');
    }

    outputDiagnostics() {
        console.log('🔍 Beat Slice Game Diagnostics:');
        console.log('- Protocol:', window.location.protocol);
        console.log('- Origin:', window.location.origin);
        console.log('- User Agent:', navigator.userAgent);
        console.log('- WebGL Support:', this.checkWebGLSupport());
        console.log('- Audio Context Support:', 'AudioContext' in window || 'webkitAudioContext' in window);
    }

    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }

    handleInitializationError(error) {
        let errorMessage = 'Failed to load game. ';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage += 'Chart data could not be loaded. Please check the file path.';
        } else if (error.message.includes('WebGL')) {
            errorMessage += 'WebGL is not supported or enabled.';
        } else if (error.message.includes('AudioContext')) {
            errorMessage += 'Audio system initialization failed.';
        } else {
            errorMessage += 'Please check the console for details.';
        }
        
        this.loadingElement.textContent = errorMessage;
        this.loadingElement.style.color = '#ff4444';
        
        // 詳細なエラー情報をコンソールに出力
        console.group('🚨 Initialization Error Details');
        console.error('Error:', error);
        console.error('Stack:', error.stack);
        console.error('Message:', error.message);
        console.groupEnd();
    }

    startGame() {
        if (!this.isInitialized) {
            console.error('Game not initialized');
            return;
        }
        
        this.gameEngine.startGame();
    }

    // ウィンドウリサイズ処理
    handleResize() {
        if (this.gameEngine) {
            this.gameEngine.handleResize();
        }
    }
}

// ゲーム初期化
const game = new BeatSliceGame();

// ウィンドウイベント
window.addEventListener('resize', () => game.handleResize());

// DOMContentLoaded後にゲームを開始
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => game.init());
} else {
    game.init();
}

// グローバルに公開（デバッグ用）
window.BeatSliceGame = game;