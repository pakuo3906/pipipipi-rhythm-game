class PipipiRhythmGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = null;
        this.audioBuffer = null;
        this.audioSource = null;
        this.analyser = null;
        this.frequencyData = null;
        
        // ゲーム状態
        this.gameState = 'start'; // start, playing, paused
        this.score = 0;
        this.combo = 0;
        this.startTime = 0;
        this.currentTime = 0;
        this.pausedTime = 0;
        this.animationId = null;
        
        // Chart data
        this.chartData = null;
        this.noteIndex = 0;
        this.notes = [];
        this.particles = [];
        
        // ゲーム設定
        this.settings = {
            noteSpeed: 300, // pixels per second
            judgeLineY: 0,
            laneWidth: 0,
            lanePositions: [],
            judgeWindow: {
                perfect: 0.1, // seconds
                good: 0.2,
                miss: 0.3
            }
        };
        
        // キー設定 (A=左, S=中央, D=右)
        this.keys = {
            'KeyA': 0,
            'KeyS': 1,
            'KeyD': 2
        };
        
        // 音量設定
        this.audioSettings = {
            masterVolume: 0.7, // ベース音量を下げる
            volumeNode: null
        };
        
        // エフェクト設定
        this.effects = {
            ripples: [],
            beatLines: [],
            backgroundPulse: 0,
            laneGlow: [0, 0, 0],
            goodDots: []
        };
        
        this.init();
    }

    async init() {
        this.setupCanvas();
        this.setupEventListeners();
        await this.loadChart();
        this.setupAudio();
        this.resizeCanvas();
        this.render();
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // ゲーム領域の計算
        this.settings.judgeLineY = this.canvas.height * 0.8;
        this.settings.laneWidth = this.canvas.width / 3;
        this.settings.lanePositions = [
            this.settings.laneWidth * 0.5,
            this.settings.laneWidth * 1.5,
            this.settings.laneWidth * 2.5
        ];
    }

    setupEventListeners() {
        // キーボード入力
        document.addEventListener('keydown', (e) => {
            if (this.gameState !== 'playing') return;
            
            const lane = this.keys[e.code];
            if (lane !== undefined) {
                this.handleInput(lane);
            }
            
            // ポーズ
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePause();
            }
        });

        // マウス/タッチ入力
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState !== 'playing') return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const lane = Math.floor(x / this.settings.laneWidth);
            
            if (lane >= 0 && lane < 3) {
                this.handleInput(lane);
            }
        });

        // UI controls
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('retryBtn').addEventListener('click', () => this.retryGame());
        
        // 音量調整
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });
    }

    async loadChart() {
        try {
            const response = await fetch('./backup/v1_beat_slice_initial/pipipipi_shingou_chart.json');
            this.chartData = await response.json();
            console.log('Chart loaded:', this.chartData);
        } catch (error) {
            console.error('Failed to load chart:', error);
        }
    }

    async setupAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            const response = await fetch('./pipipipi_shingou.mp3');
            const audioData = await response.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(audioData);
            
            // アナライザーセットアップ
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            
            // 音量ノードセットアップ
            this.audioSettings.volumeNode = this.audioContext.createGain();
            this.audioSettings.volumeNode.gain.value = this.audioSettings.masterVolume;
            
            console.log('Audio loaded successfully');
        } catch (error) {
            console.error('Failed to load audio:', error);
        }
    }

    async startGame() {
        if (!this.audioBuffer) {
            alert('Audio not loaded yet. Please try again.');
            return;
        }

        document.getElementById('startScreen').style.display = 'none';
        this.gameState = 'playing';
        this.score = 0;
        this.combo = 0;
        this.noteIndex = 0;
        this.notes = [];
        this.particles = [];
        this.startTime = Date.now();
        this.pausedTime = 0;
        this.animationId = null;
        
        // オーディオ再生
        await this.playAudio();
        
        this.updateUI();
        this.gameLoop();
    }

    async playAudio() {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        this.audioSource = this.audioContext.createBufferSource();
        this.audioSource.buffer = this.audioBuffer;
        this.audioSource.connect(this.audioSettings.volumeNode);
        this.audioSettings.volumeNode.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        
        this.audioSource.start();
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.pausedTime = Date.now();
            if (this.audioSource) {
                this.audioContext.suspend();
            }
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            // ポーズ時間を考慮してstartTimeを調整
            const pauseDuration = Date.now() - this.pausedTime;
            this.startTime += pauseDuration;
            
            if (this.audioSource) {
                this.audioContext.resume();
            }
            this.gameLoop();
        }
    }

    retryGame() {
        this.gameState = 'start';
        if (this.audioSource) {
            this.audioSource.stop();
            this.audioSource = null;
        }
        if (this.audioContext) {
            this.audioContext.resume();
        }
        document.getElementById('startScreen').style.display = 'flex';
    }

    setVolume(volume) {
        this.audioSettings.masterVolume = volume;
        if (this.audioSettings.volumeNode) {
            this.audioSettings.volumeNode.gain.value = volume;
        }
    }

    handleInput(lane) {
        const currentTime = (Date.now() - this.startTime) / 1000;
        let bestNote = null;
        let bestDistance = Infinity;

        // 最も近いノートを探す
        for (let i = 0; i < this.notes.length; i++) {
            const note = this.notes[i];
            if (note.lane === lane && !note.hit) {
                const distance = Math.abs(note.time - currentTime);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestNote = note;
                }
            }
        }

        if (bestNote) {
            this.judgeNote(bestNote, bestDistance);
        }
    }

    judgeNote(note, distance) {
        let judgment = 'miss';
        let points = 0;
        
        if (distance <= this.settings.judgeWindow.perfect) {
            judgment = 'perfect';
            points = 300;
            this.combo++;
        } else if (distance <= this.settings.judgeWindow.good) {
            judgment = 'good';
            points = 100;
            this.combo++;
        } else {
            judgment = 'miss';
            points = 0;
            this.combo = 0;
        }

        note.hit = true;
        this.score += points * (1 + this.combo * 0.1);
        
        // エフェクト (missの場合は何もしない)
        if (judgment !== 'miss') {
            this.addParticles(note.lane, judgment);
        }
        this.effects.laneGlow[note.lane] = 1.0;
        
        this.showJudgment(judgment);
        this.updateUI();
    }


    addParticles(lane, judgment) {
        // missは何もエフェクトを表示しない
        if (judgment === 'miss') {
            return;
        }
        
        // perfectはリップルエフェクト、goodはシンプルな光るエフェクト
        if (judgment === 'perfect') {
            this.addRippleEffect(lane, judgment);
        } else if (judgment === 'good') {
            this.addGoodEffect(lane);
        }
    }

    addRippleEffect(lane, judgment) {
        const x = this.settings.lanePositions[lane];
        const y = this.settings.judgeLineY;
        
        this.effects.ripples.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: 120,
            color: '#ffeb3b',
            life: 1.0,
            judgment: judgment
        });
    }
    
    addGoodEffect(lane) {
        const x = this.settings.lanePositions[lane];
        const y = this.settings.judgeLineY;
        
        // シンプルな光るドット
        this.effects.goodDots = this.effects.goodDots || [];
        this.effects.goodDots.push({
            x: x,
            y: y,
            size: 20,
            life: 1.0
        });
    }
    

    showJudgment(judgment) {
        const display = document.getElementById('judgmentDisplay');
        display.textContent = judgment.toUpperCase();
        display.className = `judgment-display judgment-${judgment}`;
        display.style.opacity = '1';
        
        setTimeout(() => {
            display.style.opacity = '0';
        }, 500);
    }

    updateUI() {
        document.getElementById('scoreValue').textContent = Math.floor(this.score);
        document.getElementById('comboValue').textContent = this.combo;
    }

    gameLoop() {
        if (this.gameState !== 'playing') return;
        
        this.currentTime = (Date.now() - this.startTime) / 1000;
        this.updateNotes();
        this.updateEffects();
        this.render();
        
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    updateNotes() {
        // 新しいノートを追加（画面上部からスタート）
        while (this.noteIndex < this.chartData.chart.length) {
            const chartNote = this.chartData.chart[this.noteIndex];
            // ノートが画面上部から出現するように調整（落下距離を長くする）
            const fallDistance = this.canvas.height + 100; // 画面上部から判定ラインまで + 余裕
            const spawnTime = chartNote.time - fallDistance / this.settings.noteSpeed;
            
            if (this.currentTime >= spawnTime) {
                this.notes.push({
                    time: chartNote.time,
                    lane: chartNote.lane === 'S' ? 1 : chartNote.lane === 'A' ? 0 : 2, // A=0(左), S=1(中央), D=2(右)
                    type: chartNote.type,
                    duration: chartNote.duration || 0,
                    y: -100, // 画面上部から開始
                    hit: false
                });
                this.noteIndex++;
            } else {
                break;
            }
        }

        // ノートの位置を更新
        for (let i = this.notes.length - 1; i >= 0; i--) {
            const note = this.notes[i];
            const timeDistance = note.time - this.currentTime;
            note.y = this.settings.judgeLineY - (timeDistance * this.settings.noteSpeed);
            
            // 画面外のノートを削除
            if (note.y > this.canvas.height + 50) {
                if (!note.hit) {
                    this.combo = 0; // Miss
                }
                this.notes.splice(i, 1);
            }
            
            // 判定ラインを過ぎたノートの自動Miss判定
            if (note.y > this.settings.judgeLineY + 50 && !note.hit) {
                note.hit = true;
                this.combo = 0;
                this.showJudgment('miss');
                this.updateUI();
            }
        }
    }

    updateEffects() {
        // リップル効果
        for (let i = this.effects.ripples.length - 1; i >= 0; i--) {
            const ripple = this.effects.ripples[i];
            ripple.radius += 200 * (1/60); // 60fps想定
            ripple.life -= 1/60;
            
            if (ripple.life <= 0) {
                this.effects.ripples.splice(i, 1);
            }
        }
        
        // goodドットエフェクト
        for (let i = this.effects.goodDots.length - 1; i >= 0; i--) {
            const dot = this.effects.goodDots[i];
            dot.size *= 0.95; // 縮小
            dot.life -= 2/60; // 速く消える
            
            if (dot.life <= 0) {
                this.effects.goodDots.splice(i, 1);
            }
        }


        // レーングロー
        for (let i = 0; i < 3; i++) {
            this.effects.laneGlow[i] *= 0.9;
        }

        // 音楽解析による背景パルス
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.frequencyData);
            let average = 0;
            for (let i = 0; i < this.frequencyData.length; i++) {
                average += this.frequencyData[i];
            }
            average /= this.frequencyData.length;
            this.effects.backgroundPulse = average / 255;
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 背景グラデーション with pulse - ダークテーマ
        const pulse = this.effects.backgroundPulse * 0.2;
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, `rgba(15, 15, 15, ${0.9 + pulse})`);
        gradient.addColorStop(0.5, `rgba(25, 25, 25, ${0.95 + pulse})`);
        gradient.addColorStop(1, `rgba(10, 10, 10, ${0.98 + pulse})`);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 微細な粒子効果
        this.ctx.fillStyle = `rgba(64, 224, 208, ${0.03 + pulse * 0.05})`;
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            this.ctx.beginPath();
            this.ctx.arc(x, y, Math.random() * 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // 音楽スペクトラム表示
        this.drawSpectrum();
        
        // レーン
        this.drawLanes();
        
        // 判定ライン
        this.drawJudgeLine();
        
        // ノート
        this.drawNotes();
        
        // エフェクト
        this.drawEffects();
    }

    drawSpectrum() {
        if (!this.frequencyData) return;
        
        this.ctx.globalAlpha = 0.2;
        const barWidth = this.canvas.width / this.frequencyData.length;
        
        for (let i = 0; i < this.frequencyData.length; i++) {
            const height = (this.frequencyData[i] / 255) * this.canvas.height * 0.25;
            const intensity = this.frequencyData[i] / 255;
            
            // サイバー系カラーパレット
            const gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, this.canvas.height - height);
            gradient.addColorStop(0, `rgba(64, 224, 208, ${intensity * 0.8})`);
            gradient.addColorStop(0.5, `rgba(0, 206, 209, ${intensity * 0.6})`);
            gradient.addColorStop(1, `rgba(30, 144, 255, ${intensity * 0.4})`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(i * barWidth, this.canvas.height - height, barWidth, height);
        }
        
        this.ctx.globalAlpha = 1;
    }

    drawLanes() {
        for (let i = 0; i < 3; i++) {
            const x = i * this.settings.laneWidth;
            const glow = this.effects.laneGlow[i];
            
            // レーン背景 - ダークテーマ
            const gradient = this.ctx.createLinearGradient(x, 0, x + this.settings.laneWidth, 0);
            gradient.addColorStop(0, `rgba(64, 224, 208, ${0.02 + glow * 0.15})`);
            gradient.addColorStop(0.5, `rgba(30, 30, 30, ${0.1 + glow * 0.2})`);
            gradient.addColorStop(1, `rgba(64, 224, 208, ${0.02 + glow * 0.15})`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, 0, this.settings.laneWidth, this.canvas.height);
            
            // レーン境界線 - ネオンスタイル
            if (i < 2) {
                this.ctx.strokeStyle = `rgba(64, 224, 208, ${0.4 + glow * 0.6})`;
                this.ctx.lineWidth = 1;
                this.ctx.shadowColor = 'rgba(64, 224, 208, 0.5)';
                this.ctx.shadowBlur = 5;
                this.ctx.beginPath();
                this.ctx.moveTo(x + this.settings.laneWidth, 0);
                this.ctx.lineTo(x + this.settings.laneWidth, this.canvas.height);
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
            }
        }
    }

    drawJudgeLine() {
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
        gradient.addColorStop(0, 'rgba(64, 224, 208, 0)');
        gradient.addColorStop(0.5, 'rgba(64, 224, 208, 0.9)');
        gradient.addColorStop(1, 'rgba(64, 224, 208, 0)');
        
        // メインライン
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, this.settings.judgeLineY - 2, this.canvas.width, 4);
        
        // グロー効果
        this.ctx.shadowColor = 'rgba(64, 224, 208, 0.6)';
        this.ctx.shadowBlur = 10;
        this.ctx.fillRect(0, this.settings.judgeLineY - 1, this.canvas.width, 2);
        this.ctx.shadowBlur = 0;
    }

    drawNotes() {
        for (const note of this.notes) {
            if (note.hit) continue;
            
            const x = this.settings.lanePositions[note.lane];
            const y = note.y;
            const radius = 22;
            
            // ノートの影 - より強い影
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            this.ctx.beginPath();
            this.ctx.arc(x + 3, y + 3, radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // ノート本体 - サイバー系グラデーション
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.3, '#40e0d0');
            gradient.addColorStop(0.7, '#00ced1');
            gradient.addColorStop(1, '#1e90ff');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // ノート輪郭 - グロー効果
            this.ctx.strokeStyle = '#40e0d0';
            this.ctx.lineWidth = 2;
            this.ctx.shadowColor = 'rgba(64, 224, 208, 0.8)';
            this.ctx.shadowBlur = 8;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
            
            // 内側のハイライト
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.beginPath();
            this.ctx.arc(x - 5, y - 5, radius * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawEffects() {
        // perfectリップル効果
        for (const ripple of this.effects.ripples) {
            this.ctx.globalAlpha = ripple.life * 0.9;
            this.ctx.strokeStyle = ripple.color;
            this.ctx.lineWidth = 4;
            this.ctx.shadowColor = ripple.color;
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // 二重リップル効果
            this.ctx.globalAlpha = ripple.life * 0.36;
            this.ctx.lineWidth = 2;
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            this.ctx.arc(ripple.x, ripple.y, ripple.radius * 0.7, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }
        
        // goodドットエフェクト
        for (const dot of this.effects.goodDots) {
            this.ctx.globalAlpha = dot.life * 0.8;
            this.ctx.fillStyle = '#4caf50';
            this.ctx.shadowColor = '#4caf50';
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
        
        this.ctx.globalAlpha = 1;
    }
}

// ゲーム初期化
const game = new PipipiRhythmGame();