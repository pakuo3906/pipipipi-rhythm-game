import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { NoteManager } from './NoteManager.js';
import { AudioSync } from './AudioSync.js';
import { JudgmentSystem } from './JudgmentSystem.js';
import { InputHandler } from '../utils/InputHandler.js';

export class GameEngine {
    constructor(canvas, chartData) {
        this.canvas = canvas;
        this.chartData = chartData;
        
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Game systems
        this.noteManager = null;
        this.audioSync = null;
        this.judgmentSystem = null;
        this.inputHandler = null;
        
        // Game state
        this.gameState = 'loading'; // loading, ready, playing, paused, finished
        this.currentTime = 0;
        this.isPlaying = false;
        
        // UI elements
        this.ui = {
            score: document.getElementById('score'),
            combo: document.getElementById('combo'),
            judgment: document.getElementById('judgment'),
            timer: document.getElementById('timer')
        };
        
        // Performance tracking
        this.clock = new THREE.Clock();
    }

    async init() {
        // Three.js基本設定
        this.setupThreeJS();
        
        // ゲームシステムの初期化
        this.setupGameSystems();
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // アニメーションループ開始
        this.startAnimationLoop();
        
        this.gameState = 'ready';
        console.log('GameEngine initialized');
    }

    setupThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);
        
        // Camera - 要件定義に基づいたZ軸方向の視点
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Lighting
        this.setupLighting();
        
        // Lane setup
        this.setupLanes();
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Point light for better visibility
        const pointLight = new THREE.PointLight(0x00ffff, 0.3, 100);
        pointLight.position.set(0, 5, 5);
        this.scene.add(pointLight);
    }

    setupLanes() {
        // レーン構成: A(左), S(中央), D(右)
        const lanePositions = {
            'A': { x: -2, y: 0, z: 0 },
            'S': { x: 0, y: 0, z: 0 },
            'D': { x: 2, y: 0, z: 0 }
        };
        
        // レーンの視覚的ガイド
        const laneGeometry = new THREE.BoxGeometry(0.8, 0.1, 20);
        const laneMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333, 
            transparent: true, 
            opacity: 0.5 
        });
        
        Object.entries(lanePositions).forEach(([lane, position]) => {
            const laneMesh = new THREE.Mesh(laneGeometry, laneMaterial);
            laneMesh.position.set(position.x, position.y - 0.5, position.z);
            laneMesh.name = `lane_${lane}`;
            this.scene.add(laneMesh);
        });
        
        // 判定ライン
        const judgeLineGeometry = new THREE.BoxGeometry(6, 0.2, 0.1);
        const judgeLineMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        const judgeLine = new THREE.Mesh(judgeLineGeometry, judgeLineMaterial);
        judgeLine.position.set(0, 0, 0);
        judgeLine.name = 'judgeLine';
        this.scene.add(judgeLine);
        
        this.lanePositions = lanePositions;
    }

    setupGameSystems() {
        // Note Manager
        this.noteManager = new NoteManager(this.scene, this.chartData, this.lanePositions);
        
        // Audio Sync
        this.audioSync = new AudioSync(this.chartData.songInfo);
        
        // Judgment System
        this.judgmentSystem = new JudgmentSystem(this.ui);
        
        // Input Handler
        this.inputHandler = new InputHandler(this.canvas);
        
        // Connect systems
        this.inputHandler.onSlice = (x, y, velocity) => {
            this.handleSlice(x, y, velocity);
        };
    }

    setupEventListeners() {
        // キーボードイベント
        window.addEventListener('keydown', (event) => {
            switch(event.code) {
                case 'Space':
                    event.preventDefault();
                    this.togglePause();
                    break;
                case 'KeyR':
                    if (this.gameState === 'finished') {
                        this.restartGame();
                    }
                    break;
            }
        });

        // ユーザーインタラクションで音楽開始
        window.addEventListener('click', async () => {
            if (this.audioSync && !this.audioSync.isPlaying) {
                try {
                    await this.audioSync.enableAudioContext();
                } catch (error) {
                    console.warn('Audio context enable failed:', error);
                }
            }
        }, { once: true });
    }

    startAnimationLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            
            const deltaTime = this.clock.getDelta();
            this.update(deltaTime);
            this.render();
        };
        
        animate();
    }

    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // 音楽時間の更新
        if (this.audioSync && this.audioSync.isLoaded) {
            this.currentTime = this.audioSync.getCurrentTime();
        } else {
            // 音楽がない場合は手動で時間を進める
            this.currentTime += deltaTime;
        }
        
        // システムの更新
        this.noteManager.update(this.currentTime);
        if (this.audioSync) {
            this.audioSync.update(deltaTime);
        }
        this.inputHandler.update(deltaTime);
        
        // UI更新
        this.updateUI();
        
        // ゲーム終了判定
        if (this.currentTime >= this.chartData.songInfo.duration) {
            this.endGame();
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    updateUI() {
        // タイマー更新
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = Math.floor(this.currentTime % 60);
        this.ui.timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // スコア更新
        this.ui.score.textContent = `Score: ${this.judgmentSystem.getScore()}`;
        
        // コンボ更新
        const combo = this.judgmentSystem.getCombo();
        if (combo > 0) {
            this.ui.combo.textContent = `${combo} combo`;
            this.ui.combo.style.opacity = Math.min(combo / 10, 1);
        } else {
            this.ui.combo.style.opacity = 0;
        }
    }

    handleSlice(x, y, velocity) {
        if (this.gameState !== 'playing') return;
        
        // 3D空間の座標に変換
        const mouse = new THREE.Vector2(
            (x / window.innerWidth) * 2 - 1,
            -(y / window.innerHeight) * 2 + 1
        );
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        // ノートとの当たり判定
        const activeNotes = this.noteManager.getActiveNotes();
        const intersects = raycaster.intersectObjects(activeNotes);
        
        if (intersects.length > 0) {
            const note = intersects[0].object;
            const timing = this.currentTime;
            
            // 判定処理
            const judgment = this.judgmentSystem.judge(note.noteData.time, timing, velocity);
            this.handleJudgment(judgment, note);
        }
    }

    handleJudgment(judgment, note) {
        // ノートを削除
        this.noteManager.removeNote(note);
        
        // 判定結果をUIに表示
        this.showJudgment(judgment);
        
        // パーティクルエフェクト（将来実装）
        this.createJudgmentEffect(note.position, judgment);
    }

    showJudgment(judgment) {
        const judgmentElement = this.ui.judgment;
        judgmentElement.textContent = judgment;
        judgmentElement.className = judgment.toLowerCase();
        judgmentElement.style.opacity = 1;
        
        // フェードアウト
        setTimeout(() => {
            judgmentElement.style.opacity = 0;
        }, 500);
    }

    createJudgmentEffect(position, judgment) {
        // TODO: パーティクルエフェクトの実装
        console.log(`${judgment} effect at position:`, position);
    }

    startGame() {
        if (this.gameState !== 'ready') return;
        
        this.gameState = 'playing';
        this.isPlaying = true;
        
        // 音楽開始（音楽がない場合はスキップ）
        if (this.audioSync && this.audioSync.isLoaded) {
            this.audioSync.play();
        } else {
            console.warn('⚠️ Audio not loaded, starting without music');
            // 音楽なしでも時間を開始
            this.currentTime = 0;
        }
        
        // カウントダウン表示
        this.showCountdown();
        
        console.log('Game started');
    }

    showCountdown() {
        const judgmentElement = this.ui.judgment;
        const countdown = ['3', '2', '1', 'START!'];
        let index = 0;
        
        const showNext = () => {
            if (index < countdown.length) {
                judgmentElement.textContent = countdown[index];
                judgmentElement.style.opacity = 1;
                
                setTimeout(() => {
                    judgmentElement.style.opacity = 0;
                    index++;
                    if (index < countdown.length) {
                        setTimeout(showNext, 300);
                    }
                }, 700);
            }
        };
        
        showNext();
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.pauseGame();
        } else if (this.gameState === 'paused') {
            this.resumeGame();
        }
    }

    pauseGame() {
        this.gameState = 'paused';
        this.audioSync.pause();
        this.ui.judgment.textContent = 'PAUSED';
        this.ui.judgment.style.opacity = 1;
        console.log('Game paused');
    }

    resumeGame() {
        this.gameState = 'playing';
        this.audioSync.resume();
        this.ui.judgment.style.opacity = 0;
        console.log('Game resumed');
    }

    endGame() {
        this.gameState = 'finished';
        this.isPlaying = false;
        this.audioSync.stop();
        
        // 結果表示
        this.showResults();
        
        console.log('Game ended');
    }

    showResults() {
        const stats = this.judgmentSystem.getStats();
        const resultText = `
            Final Score: ${stats.score}
            Perfect: ${stats.perfect}
            Good: ${stats.good}
            Miss: ${stats.miss}
            Max Combo: ${stats.maxCombo}
        `;
        
        this.ui.judgment.innerHTML = resultText.replace(/\n/g, '<br>');
        this.ui.judgment.style.opacity = 1;
        
        // リトライ表示
        setTimeout(() => {
            this.ui.judgment.innerHTML += '<br>Press R to retry';
        }, 2000);
    }

    restartGame() {
        // システムリセット
        this.noteManager.reset();
        this.audioSync.reset();
        this.judgmentSystem.reset();
        
        // UI リセット
        this.ui.judgment.style.opacity = 0;
        this.ui.combo.style.opacity = 0;
        
        // 状態リセット
        this.gameState = 'ready';
        this.currentTime = 0;
        
        console.log('Game restarted');
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
}