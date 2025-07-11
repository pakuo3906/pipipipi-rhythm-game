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
        this.currentSong = 'pipipipi_soda'; // デフォルト楽曲
        
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
        
        // キー設定 (D=左, F=左中, K=右中, L=右)
        this.defaultKeys = ['D', 'F', 'K', 'L'];
        this.keys = this.loadKeybinds();
        
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
            laneGlow: [0, 0, 0, 0],
            goodDots: []
        };
        
        this.songs = {
            'pipipipi_soda': {
                title: 'ぴぴぴソーダ',
                artist: 'pa9wo',
                duration: 211.944,
                bpm: 150,
                audioFile: './pipipipi_soda.mp3',
                chartData: null
            },
            'antithesis': {
                title: 'Antithesis',
                artist: 'pa9wo',
                duration: 129.96,
                bpm: 130,
                audioFile: './Antithesis.mp3',
                chartData: null
            }
        };
        
        this.init();
    }
    
    getLaneFromChart(laneLetter) {
        const laneMap = { 'D': 0, 'F': 1, 'K': 2, 'L': 3, 'S': 0, 'A': 1 };
        const lane = laneMap[laneLetter];
        if (lane === undefined) {
            console.warn('Unknown lane letter:', laneLetter, 'defaulting to lane 0');
            return 0;
        }
        return lane;
    }

    loadKeybinds() {
        try {
            const saved = localStorage.getItem('pipipipi_keybinds');
            if (saved) {
                const keybinds = JSON.parse(saved);
                const keys = {};
                for (let i = 0; i < 4; i++) {
                    keys[`Key${keybinds[i].toUpperCase()}`] = i;
                }
                return keys;
            }
        } catch (error) {
            console.warn('Failed to load keybinds:', error);
        }
        // デフォルトのキーバインド
        return { 'KeyD': 0, 'KeyF': 1, 'KeyK': 2, 'KeyL': 3 };
    }

    saveKeybinds(keybinds) {
        try {
            localStorage.setItem('pipipipi_keybinds', JSON.stringify(keybinds));
            const keys = {};
            for (let i = 0; i < 4; i++) {
                keys[`Key${keybinds[i].toUpperCase()}`] = i;
            }
            this.keys = keys;
        } catch (error) {
            console.error('Failed to save keybinds:', error);
        }
    }

    async init() {
        this.setupCanvas();
        this.setupEventListeners();
        // 初期化時は音声を読み込まない（楽曲選択時に読み込む）
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
        
        // ゲーム領域の計算（4レーン）
        this.settings.judgeLineY = this.canvas.height * 0.8;
        this.settings.laneWidth = this.canvas.width / 4;
        this.settings.lanePositions = [
            this.settings.laneWidth * 0.5,
            this.settings.laneWidth * 1.5,
            this.settings.laneWidth * 2.5,
            this.settings.laneWidth * 3.5
        ];
    }

    setupEventListeners() {
        // キーボード入力
        document.addEventListener('keydown', (e) => {
            // ポーズ処理
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.gameState === 'playing' || this.gameState === 'paused') {
                    this.togglePause();
                }
                return;
            }
            
            if (this.gameState !== 'playing') return;
            
            const lane = this.keys[e.code];
            if (lane !== undefined) {
                this.handleInput(lane);
            }
        });

        // マウス/タッチ入力
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState !== 'playing') return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const lane = Math.floor(x / this.settings.laneWidth);
            
            if (lane >= 0 && lane < 4) {
                this.handleInput(lane);
            }
        });

        // UI controls
        document.getElementById('songSelectBtn').addEventListener('click', () => this.showSongSelect());
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        document.getElementById('backToMenuBtn').addEventListener('click', () => this.backToMenu());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('retryBtn').addEventListener('click', () => this.retryGame());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        
        // 音量調整
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });

        // 設定関連
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('resetKeysBtn').addEventListener('click', () => this.resetKeys());
        document.getElementById('closeSettingsBtn').addEventListener('click', () => this.closeSettings());

        // キー入力フィールドのイベント
        for (let i = 0; i < 4; i++) {
            const input = document.getElementById(`key${i}`);
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase().slice(-1);
            });
            input.addEventListener('keydown', (e) => {
                e.preventDefault();
                const key = e.key.toUpperCase();
                if (key.match(/^[A-Z]$/)) {
                    e.target.value = key;
                }
            });
        }
        
        // 楽曲選択のイベント
        document.addEventListener('click', (e) => {
            if (e.target.closest('.song-item')) {
                const songItem = e.target.closest('.song-item');
                const songId = songItem.dataset.song;
                console.log('Song item clicked:', songId);
                this.selectSong(songId);
            }
        });
    }

    async loadChart() {
        // 選択された楽曲のチャートデータを読み込み
        await this.loadSongData();
        console.log('Chart loaded:', this.chartData);
    }
    
    async loadSongData() {
        const song = this.songs[this.currentSong];
        if (!song) {
            throw new Error(`Song not found: ${this.currentSong}`);
        }
        
        console.log('Loading chart data for:', this.currentSong);
        
        if (this.currentSong === 'pipipipi_soda') {
            // 既存の生成されたチャートデータを使用
            this.chartData = {
                "songInfo": {"title": "ぴぴぴソーダ", "artist": "pa9wo", "duration": 211.944, "bpm": 150},
                "chart": this.generatePipipiSodaChart()
            };
            console.log('Generated pipipipi_soda chart with', this.chartData.chart.length, 'notes');
        } else if (this.currentSong === 'antithesis') {
            // JSONファイルは3レーンシステムなので、代わりに生成された4レーンチャートを使用
            console.log('Using generated 4-lane chart for better gameplay');
            this.chartData = {
                "songInfo": {"title": "Antithesis", "artist": "pa9wo", "duration": 129.96, "bpm": 130},
                "chart": this.generateAntithesisChart()
            };
        }
    }
    
    generatePipipiSodaChart() {
        const notes = [];
        const lanes = ['D', 'F', 'K', 'L'];
        
        // BPM 150に基づく拍間隔 (60/150 = 0.4秒) - 難易度を下げるため間隔を長めに
        const beatInterval = 0.5;  // 0.4 → 0.5に変更
        const halfBeat = beatInterval / 2;
        
        // イントロ（0-8秒）- シンプルなメロディ
        this.addEasyMelodyPattern(notes, 0, 8, lanes, [
            [0.5, ['F']], [1.0, ['K']], [1.5, ['F']], [2.0, ['D']],
            [2.5, ['K']], [3.0, ['L']], [3.5, ['K']], [4.0, ['F']],
            [4.5, ['D']], [5.0, ['F']], [5.5, ['K']], [6.0, ['D']],
            [6.5, ['F']], [7.0, ['K']], [7.5, ['L']]
        ]);
        
        // メインセクション1（8-40秒）- 基本的なメロディ
        this.addSimplePattern(notes, 8, 40, lanes, beatInterval);
        
        // 間奏（40-55秒）- 交互パターン
        this.addAlternatePattern(notes, 40, 55, lanes, halfBeat);
        
        // メインセクション2（55-100秒）- 少し密度を上げる
        this.addMediumPattern(notes, 55, 100, lanes, beatInterval);
        
        // 中間部（100-140秒）- たまに同時押し
        this.addMildSyncPattern(notes, 100, 140, lanes, beatInterval);
        
        // クライマックス（140-180秒）- 適度な難易度
        this.addModerateClimaxPattern(notes, 140, 180, lanes, halfBeat);
        
        // アウトロ（180-211秒）- 余韻とフィニッシュ
        this.addEasyOutroPattern(notes, 180, 211, lanes, beatInterval);
        
        // 時間順にソート
        return notes.sort((a, b) => a.time - b.time);
    }
    
    addEasyMelodyPattern(notes, startTime, endTime, lanes, pattern) {
        for (const [time, laneList] of pattern) {
            if (startTime + time < endTime) {
                for (const lane of laneList) {
                    notes.push({ time: startTime + time, type: "tap", lane });
                }
            }
        }
    }
    
    addSimplePattern(notes, startTime, endTime, lanes, interval) {
        for (let t = startTime; t < endTime; t += interval) {
            // シンプルなメロディライン
            const melodyLane = lanes[Math.floor((t - startTime) / (interval * 2)) % 4];
            notes.push({ time: t, type: "tap", lane: melodyLane });
            
            // たまにサブメロディ（30%の確率）
            if (Math.random() < 0.3 && t + interval / 2 < endTime) {
                const subLane = lanes[(lanes.indexOf(melodyLane) + 1) % 4];
                notes.push({ time: t + interval / 2, type: "tap", lane: subLane });
            }
        }
    }
    
    addAlternatePattern(notes, startTime, endTime, lanes, interval) {
        for (let t = startTime; t < endTime; t += interval) {
            // 交互パターン（左右交互）
            const isLeft = Math.floor((t - startTime) / interval) % 2 === 0;
            const lane = isLeft ? lanes[0] : lanes[3];
            notes.push({ time: t, type: "tap", lane });
            
            // 時々中央にノート（40%の確率）
            if (Math.random() < 0.4 && t + interval / 2 < endTime) {
                const centerLane = Math.random() < 0.5 ? lanes[1] : lanes[2];
                notes.push({ time: t + interval / 2, type: "tap", lane: centerLane });
            }
        }
    }
    
    addMediumPattern(notes, startTime, endTime, lanes, interval) {
        for (let t = startTime; t < endTime; t += interval) {
            // 中程度のパターン
            const patternType = Math.floor((t - startTime) / 4) % 3;
            
            switch(patternType) {
                case 0: // 左から右へ（ゆっくり）
                    for (let i = 0; i < lanes.length; i++) {
                        if (t + i * interval / 2 < endTime) {
                            notes.push({ time: t + i * interval / 2, type: "tap", lane: lanes[i] });
                        }
                    }
                    break;
                case 1: // 中央交互
                    notes.push({ time: t, type: "tap", lane: lanes[1] });
                    if (t + interval / 2 < endTime) {
                        notes.push({ time: t + interval / 2, type: "tap", lane: lanes[2] });
                    }
                    break;
                case 2: // ランダム単発
                    const randomLane = lanes[Math.floor(Math.random() * 4)];
                    notes.push({ time: t, type: "tap", lane: randomLane });
                    break;
            }
        }
    }
    
    addMildSyncPattern(notes, startTime, endTime, lanes, interval) {
        for (let t = startTime; t < endTime; t += interval) {
            // 控えめな同時押しパターン
            if ((t - startTime) % (interval * 4) < interval) {
                // たまに2レーン同時（25%の頻度）
                const lane1 = Math.floor(Math.random() * 4);
                let lane2 = Math.floor(Math.random() * 4);
                while (lane2 === lane1) lane2 = Math.floor(Math.random() * 4);
                
                notes.push({ time: t, type: "tap", lane: lanes[lane1] });
                notes.push({ time: t, type: "tap", lane: lanes[lane2] });
            } else {
                // 普通の単発ノート
                const randomLane = lanes[Math.floor(Math.random() * 4)];
                notes.push({ time: t, type: "tap", lane: randomLane });
            }
        }
    }
    
    addModerateClimaxPattern(notes, startTime, endTime, lanes, interval) {
        for (let t = startTime; t < endTime; t += interval) {
            // 適度なクライマックスパターン
            const pattern = Math.floor((t - startTime) / interval) % 4;
            
            switch(pattern) {
                case 0: // 左右同時押し
                    notes.push({ time: t, type: "tap", lane: lanes[0] });
                    notes.push({ time: t, type: "tap", lane: lanes[3] });
                    break;
                case 1: // 中央同時押し
                    notes.push({ time: t, type: "tap", lane: lanes[1] });
                    notes.push({ time: t, type: "tap", lane: lanes[2] });
                    break;
                case 2: // 簡単な連打
                    for (let i = 0; i < 3; i++) {
                        if (t + i * interval / 4 < endTime) {
                            notes.push({ time: t + i * interval / 4, type: "tap", lane: lanes[i] });
                        }
                    }
                    break;
                case 3: // ランダム単発
                    const randomLane = lanes[Math.floor(Math.random() * 4)];
                    notes.push({ time: t, type: "tap", lane: randomLane });
                    if (t + interval / 2 < endTime) {
                        const secondLane = lanes[Math.floor(Math.random() * 4)];
                        notes.push({ time: t + interval / 2, type: "tap", lane: secondLane });
                    }
                    break;
            }
        }
    }
    
    addEasyOutroPattern(notes, startTime, endTime, lanes, interval) {
        for (let t = startTime; t < endTime; t += interval) {
            // 簡単な余韻パターン
            if (t < endTime - 5) {
                // 通常パターン
                const lane = Math.floor(Math.random() * 4);
                notes.push({ time: t, type: "tap", lane: lanes[lane] });
            } else {
                // シンプルなフィニッシュ（最後の5秒）
                if ((t - (endTime - 5)) % (interval * 2) === 0) {
                    // 左右交互
                    const isLeft = Math.floor((t - (endTime - 5)) / (interval * 2)) % 2 === 0;
                    notes.push({ time: t, type: "tap", lane: isLeft ? lanes[0] : lanes[3] });
                }
            }
        }
    }
    

    async setupAudio() {
        try {
            // AudioContextを初期化（まだ作成されていない場合）
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Suspendedの場合はresume
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const song = this.songs[this.currentSong];
            console.log('Loading audio file:', song.audioFile);
            
            const response = await fetch(song.audioFile);
            if (!response.ok) {
                throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
            }
            
            const audioData = await response.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(audioData);
            
            // アナライザーセットアップ
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            
            // 音量ノードセットアップ
            this.audioSettings.volumeNode = this.audioContext.createGain();
            this.audioSettings.volumeNode.gain.value = this.audioSettings.masterVolume;
            
            console.log('Audio loaded successfully:', song.title);
        } catch (error) {
            console.error('Failed to load audio:', error);
            throw error;
        }
    }

    async startGame() {
        try {
            console.log('Starting game with song:', this.currentSong);
            
            // 楽曲データを読み込み
            await this.changeSong(this.currentSong);
            
            if (!this.audioBuffer) {
                console.error('Audio buffer is null after loading');
                alert('Audio not loaded yet. Please try again.');
                return;
            }

            document.getElementById('songSelectScreen').style.display = 'none';
            this.gameState = 'playing';
            this.score = 0;
            this.combo = 0;
            this.noteIndex = 0;
            this.notes = [];
            this.particles = [];
            this.startTime = Date.now();
            this.pausedTime = 0;
            this.animationId = null;
            
            console.log('Starting audio playback...');
            // オーディオ再生
            await this.playAudio();
            
            this.updateUI();
            this.gameLoop();
            console.log('Game started successfully');
        } catch (error) {
            console.error('Error starting game:', error);
            console.error('Error stack:', error.stack);
            alert(`Failed to start game: ${error.message}\nPlease check console for details.`);
        }
    }

    async playAudio() {
        try {
            if (this.audioContext.state === 'suspended') {
                console.log('Resuming audio context...');
                await this.audioContext.resume();
            }
            
            console.log('Creating audio source...');
            this.audioSource = this.audioContext.createBufferSource();
            this.audioSource.buffer = this.audioBuffer;
            
            // オーディオグラフを接続
            this.audioSource.connect(this.audioSettings.volumeNode);
            this.audioSettings.volumeNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            console.log('Starting audio playback...');
            this.audioSource.start();
            
            // オーディオ終了時の処理
            this.audioSource.onended = () => {
                console.log('Audio playback ended');
                this.gameState = 'finished';
            };
        } catch (error) {
            console.error('Error in playAudio:', error);
            throw error;
        }
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
        document.getElementById('songSelectScreen').style.display = 'flex';
    }
    
    showSongSelect() {
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('songSelectScreen').style.display = 'flex';
        this.updateSongList();
        
        // デフォルトで最初の楽曲を選択状態にする
        if (!document.querySelector('.song-item.selected')) {
            this.selectSong(this.currentSong);
        }
    }
    
    backToMenu() {
        document.getElementById('songSelectScreen').style.display = 'none';
        document.getElementById('startScreen').style.display = 'flex';
    }
    
    selectSong(songId) {
        console.log('Selecting song:', songId);
        
        // 既存の選択を解除
        document.querySelectorAll('.song-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // 新しい選択を追加
        const selectedItem = document.querySelector(`[data-song="${songId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
            this.currentSong = songId;
            console.log('Song selected:', songId);
        } else {
            console.error('Song item not found:', songId);
        }
    }
    
    updateSongList() {
        // 現在選択されている楽曲をハイライト
        document.querySelectorAll('.song-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        const currentItem = document.querySelector(`[data-song="${this.currentSong}"]`);
        if (currentItem) {
            currentItem.classList.add('selected');
        }
    }
    
    async changeSong(songId) {
        try {
            this.currentSong = songId;
            console.log('Loading song:', songId);
            
            // 古いオーディオソースを停止
            if (this.audioSource) {
                this.audioSource.stop();
                this.audioSource = null;
            }
            
            // チャートデータを読み込み
            await this.loadChart();
            
            // 音声データを読み込み
            await this.setupAudio();
            
            console.log('Song loaded successfully:', songId);
        } catch (error) {
            console.error('Error loading song:', error);
            throw error;
        }
    }

    setVolume(volume) {
        this.audioSettings.masterVolume = volume;
        if (this.audioSettings.volumeNode) {
            this.audioSettings.volumeNode.gain.value = volume;
        }
    }

    showSettings() {
        document.getElementById('settingsScreen').style.display = 'flex';
        this.loadCurrentKeysToUI();
    }

    closeSettings() {
        document.getElementById('settingsScreen').style.display = 'none';
    }

    loadCurrentKeysToUI() {
        try {
            const saved = localStorage.getItem('pipipipi_keybinds');
            const keybinds = saved ? JSON.parse(saved) : this.defaultKeys;
            for (let i = 0; i < 4; i++) {
                document.getElementById(`key${i}`).value = keybinds[i];
            }
        } catch (error) {
            this.resetKeys();
        }
    }

    saveSettings() {
        const keybinds = [];
        for (let i = 0; i < 4; i++) {
            const key = document.getElementById(`key${i}`).value.toUpperCase();
            if (!key.match(/^[A-Z]$/)) {
                alert(`無効なキーです: ${key || '空'}`);
                return;
            }
            keybinds.push(key);
        }
        
        // 重複チェック
        const unique = new Set(keybinds);
        if (unique.size !== keybinds.length) {
            alert('同じキーを複数のレーンに設定することはできません');
            return;
        }
        
        this.saveKeybinds(keybinds);
        this.closeSettings();
        alert('キーバインドを保存しました！');
    }

    resetKeys() {
        for (let i = 0; i < 4; i++) {
            document.getElementById(`key${i}`).value = this.defaultKeys[i];
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
            
            // 曲開始前（currentTime < 0）にはノートを表示しない
            if (this.currentTime >= Math.max(0, spawnTime)) {
                this.notes.push({
                    time: chartNote.time,
                    lane: this.getLaneFromChart(chartNote.lane), // チャートのレーン文字を数値に変換
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
        for (let i = 0; i < 4; i++) {
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
        for (let i = 0; i < 4; i++) {
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
            if (i < 3) {
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
    
    generateAntithesisChart() {
    console.log('Generating varied pattern Antithesis chart...');
    const notes = [];
    const lanes = ['D', 'F', 'K', 'L'];
    const duration = 129.96;
    const beatInterval = 60 / 130; // BPM 130
    const sixteenthNote = beatInterval / 4;
    const eighthNote = beatInterval / 2;
    
    // バリエーション豊富なパターン関数
    const addVariedPattern = (startTime, endTime) => {
        for (let t = startTime; t < endTime; t += beatInterval) {
            const patternType = Math.floor((t - startTime) / (beatInterval * 4)) % 12; // 12種類のパターン
            const beat = Math.floor((t - startTime) / beatInterval) % 4;
            
            switch(patternType) {
                case 0: // メロディックライン
                    const melody1 = [0, 1, 2, 1, 3, 2, 1, 0];
                    const melodyIndex = Math.floor((t - startTime) / beatInterval) % melody1.length;
                    if (beat % 2 === 0) {
                        notes.push({ time: t, type: "tap", lane: lanes[melody1[melodyIndex]] });
                    }
                    break;
                case 1: // アルペジオパターン
                    if (beat === 0) {
                        notes.push({ time: t, type: "tap", lane: lanes[0] });
                        notes.push({ time: t + eighthNote, type: "tap", lane: lanes[2] });
                    } else if (beat === 2) {
                        notes.push({ time: t, type: "tap", lane: lanes[1] });
                        notes.push({ time: t + eighthNote, type: "tap", lane: lanes[3] });
                    }
                    break;
                case 2: // 階段パターン
                    for (let i = 0; i < 4; i++) {
                        if (t + i * eighthNote < endTime) {
                            notes.push({ time: t + i * eighthNote, type: "tap", lane: lanes[i] });
                        }
                    }
                    break;
                case 3: // 逆階段パターン
                    for (let i = 0; i < 4; i++) {
                        if (t + i * eighthNote < endTime) {
                            notes.push({ time: t + i * eighthNote, type: "tap", lane: lanes[3-i] });
                        }
                    }
                    break;
                case 4: // 交互パターン
                    if (beat % 2 === 0) {
                        notes.push({ time: t, type: "tap", lane: lanes[0] });
                        notes.push({ time: t + eighthNote, type: "tap", lane: lanes[3] });
                    } else {
                        notes.push({ time: t, type: "tap", lane: lanes[1] });
                        notes.push({ time: t + eighthNote, type: "tap", lane: lanes[2] });
                    }
                    break;
                case 5: // ブラケットパターン
                    if (beat === 0 || beat === 3) {
                        notes.push({ time: t, type: "tap", lane: lanes[0] });
                        notes.push({ time: t, type: "tap", lane: lanes[3] });
                    } else {
                        notes.push({ time: t, type: "tap", lane: lanes[beat] });
                    }
                    break;
                case 6: // ホールドコンビネーション
                    if (beat === 0) {
                        notes.push({ time: t, type: "hold", lane: lanes[1], duration: beatInterval * 2 });
                        notes.push({ time: t + eighthNote, type: "tap", lane: lanes[0] });
                        notes.push({ time: t + beatInterval, type: "tap", lane: lanes[3] });
                        notes.push({ time: t + beatInterval + eighthNote, type: "tap", lane: lanes[2] });
                    }
                    break;
                case 7: // ジグザグパターン
                    const zigzag = [0, 2, 1, 3];
                    for (let i = 0; i < 4; i++) {
                        if (t + i * eighthNote < endTime) {
                            notes.push({ time: t + i * eighthNote, type: "tap", lane: lanes[zigzag[i]] });
                        }
                    }
                    break;
                case 8: // リズミカルパターン
                    if (beat === 0) {
                        notes.push({ time: t, type: "tap", lane: lanes[1] });
                        notes.push({ time: t + sixteenthNote, type: "tap", lane: lanes[2] });
                        notes.push({ time: t + eighthNote, type: "tap", lane: lanes[1] });
                    } else if (beat === 2) {
                        notes.push({ time: t, type: "tap", lane: lanes[0] });
                        notes.push({ time: t + eighthNote, type: "tap", lane: lanes[3] });
                    }
                    break;
                case 9: // ウェーブパターン
                    const wave = [1, 2, 1, 0, 1, 2, 3, 2];
                    const waveIndex = Math.floor((t - startTime) / (eighthNote)) % wave.length;
                    if (beat % 2 === 0) {
                        notes.push({ time: t, type: "tap", lane: lanes[wave[waveIndex]] });
                    }
                    break;
                case 10: // トリプルタップ
                    if (beat === 0) {
                        notes.push({ time: t, type: "tap", lane: lanes[0] });
                        notes.push({ time: t + sixteenthNote, type: "tap", lane: lanes[1] });
                        notes.push({ time: t + sixteenthNote * 2, type: "tap", lane: lanes[2] });
                    } else if (beat === 2) {
                        notes.push({ time: t, type: "tap", lane: lanes[3] });
                    }
                    break;
                case 11: // スパース（まばら）パターン
                    if (beat === 1) {
                        notes.push({ time: t, type: "tap", lane: lanes[Math.floor((t - startTime) / beatInterval) % 4] });
                    }
                    break;
            }
        }
    };
    
    // イントロ（0-30秒）- バリエーション豊富
    addVariedPattern(0.8, 30);
    
    // 中間部（30-85秒）- さらに多様なパターン
    addVariedPattern(30, 85);
    
    // クライマックス（85-110秒）- 同じ難易度だが少しだけ密度を上げる
    for (let t = 85; t < 110; t += beatInterval) {
        const pattern = Math.floor((t - 85) / (beatInterval * 2)) % 8;
        const beat = Math.floor((t - 85) / beatInterval) % 4;
        
        switch(pattern) {
            case 0: // 強化メロディ
                const melody = [0, 1, 3, 2, 1, 0, 2, 3];
                const melodyIndex = Math.floor((t - 85) / beatInterval) % melody.length;
                notes.push({ time: t, type: "tap", lane: lanes[melody[melodyIndex]] });
                if (beat % 2 === 1) {
                    notes.push({ time: t + eighthNote, type: "tap", lane: lanes[(melodyIndex + 2) % 4] });
                }
                break;
            case 1: // 階段＋同時押し
                for (let i = 0; i < 4; i++) {
                    if (t + i * eighthNote < 110) {
                        notes.push({ time: t + i * eighthNote, type: "tap", lane: lanes[i] });
                    }
                }
                if (beat === 3) {
                    notes.push({ time: t + beatInterval, type: "tap", lane: lanes[0] });
                    notes.push({ time: t + beatInterval, type: "tap", lane: lanes[3] });
                }
                break;
            case 2: // ホールド＋タップ
                if (beat === 0) {
                    notes.push({ time: t, type: "hold", lane: lanes[0], duration: beatInterval * 1.5 });
                    notes.push({ time: t + eighthNote, type: "tap", lane: lanes[2] });
                    notes.push({ time: t + beatInterval, type: "tap", lane: lanes[1] });
                } else if (beat === 2) {
                    notes.push({ time: t, type: "tap", lane: lanes[3] });
                }
                break;
            case 3: // リズミカル強化
                const rhythm = [[1], [2, 3], [], [0, 1]];
                for (const lane of rhythm[beat]) {
                    notes.push({ time: t, type: "tap", lane: lanes[lane] });
                }
                break;
            case 4: // ジグザグ強化
                const zigzagPattern = [0, 2, 1, 3, 0, 2];
                for (let i = 0; i < 6; i++) {
                    if (t + i * sixteenthNote < 110) {
                        notes.push({ time: t + i * sixteenthNote, type: "tap", lane: lanes[zigzagPattern[i]] });
                    }
                }
                break;
            case 5: // ブラケット強化
                if (beat === 0) {
                    notes.push({ time: t, type: "tap", lane: lanes[0] });
                    notes.push({ time: t, type: "tap", lane: lanes[3] });
                    notes.push({ time: t + eighthNote, type: "tap", lane: lanes[1] });
                    notes.push({ time: t + eighthNote, type: "tap", lane: lanes[2] });
                } else {
                    notes.push({ time: t, type: "tap", lane: lanes[beat % 4] });
                }
                break;
            case 6: // ウェーブ強化
                const wavePattern = [1, 0, 2, 3, 2, 1];
                for (let i = 0; i < wavePattern.length; i++) {
                    if (t + i * sixteenthNote < 110) {
                        notes.push({ time: t + i * sixteenthNote, type: "tap", lane: lanes[wavePattern[i]] });
                    }
                }
                break;
            case 7: // ランダムコンビネーション
                const randomPattern = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
                for (let i = 0; i < 4; i++) {
                    if (t + i * eighthNote < 110) {
                        notes.push({ time: t + i * eighthNote, type: "tap", lane: lanes[randomPattern[i]] });
                    }
                }
                break;
        }
    }
    
    // フィナーレ（110秒-終了）- 壮大で挑戦的な結末
    for (let t = 110; t < duration - 5; t += beatInterval) {
        const finaleProgress = (t - 110) / (duration - 5 - 110); // 0から1への進行度
        const pattern = Math.floor((t - 110) / (beatInterval * 2)) % 8;
        
        switch(pattern) {
            case 0: // 全レーン同時押し + フォロー
                for (let i = 0; i < 4; i++) {
                    notes.push({ time: t, type: "tap", lane: lanes[i] });
                }
                notes.push({ time: t + eighthNote, type: "tap", lane: lanes[1] });
                notes.push({ time: t + beatInterval - eighthNote, type: "tap", lane: lanes[2] });
                break;
            case 1: // 高速スケール
                for (let i = 0; i < 8; i++) {
                    if (t + i * sixteenthNote < duration - 5) {
                        notes.push({ time: t + i * sixteenthNote, type: "tap", lane: lanes[i % 4] });
                    }
                }
                break;
            case 2: // デュアルホールド + タップ
                notes.push({ time: t, type: "hold", lane: lanes[0], duration: beatInterval * 2 });
                notes.push({ time: t, type: "hold", lane: lanes[3], duration: beatInterval * 2 });
                for (let i = 0; i < 8; i++) {
                    if (t + i * sixteenthNote < duration - 5) {
                        notes.push({ time: t + i * sixteenthNote, type: "tap", lane: lanes[1 + (i % 2)] });
                    }
                }
                break;
            case 3: // ジグザグ高速
                const zigzagFast = [0, 2, 1, 3, 0, 2, 1, 3, 0, 2];
                for (let i = 0; i < zigzagFast.length; i++) {
                    if (t + i * (sixteenthNote/2) < duration - 5) {
                        notes.push({ time: t + i * (sixteenthNote/2), type: "tap", lane: lanes[zigzagFast[i]] });
                    }
                }
                break;
            case 4: // カオスストーム（制御版）
                for (let i = 0; i < 10; i++) {
                    if (t + i * (sixteenthNote) < duration - 5) {
                        const laneIndex = (i * 3 + 1) % 4; // ランダムより予測可能
                        notes.push({ time: t + i * sixteenthNote, type: "tap", lane: lanes[laneIndex] });
                    }
                }
                break;
            case 5: // トリプレット + 同時押し
                for (let i = 0; i < 3; i++) {
                    if (t + i * (beatInterval/3) < duration - 5) {
                        notes.push({ time: t + i * (beatInterval/3), type: "tap", lane: lanes[i] });
                    }
                }
                notes.push({ time: t + beatInterval, type: "tap", lane: lanes[0] });
                notes.push({ time: t + beatInterval, type: "tap", lane: lanes[3] });
                break;
            case 6: // スパイラル + ホールド
                notes.push({ time: t, type: "hold", lane: lanes[1], duration: beatInterval * 1.5 });
                const spiral = [0, 3, 2, 0, 3, 2];
                for (let i = 0; i < spiral.length; i++) {
                    if (t + (i + 2) * sixteenthNote < duration - 5) {
                        notes.push({ time: t + (i + 2) * sixteenthNote, type: "tap", lane: lanes[spiral[i]] });
                    }
                }
                break;
            case 7: // グランドフィナーレ階段
                const stairPattern = [0, 1, 2, 3, 2, 1, 0, 3];
                for (let i = 0; i < stairPattern.length; i++) {
                    if (t + i * eighthNote < duration - 5) {
                        notes.push({ time: t + i * eighthNote, type: "tap", lane: lanes[stairPattern[i]] });
                    }
                }
                break;
        }
    }
    
    // 最終5秒 - 壮大なフィナーレ
    const finalStart = duration - 5;
    
    // 段階的に全レーン攻撃
    for (let t = finalStart; t < finalStart + 2; t += beatInterval/2) {
        for (let i = 0; i < 4; i++) {
            notes.push({ time: t, type: "tap", lane: lanes[i] });
        }
    }
    
    // 最終スケール
    for (let t = finalStart + 2; t < finalStart + 4; t += eighthNote) {
        const laneIndex = Math.floor((t - (finalStart + 2)) * 8) % 4;
        notes.push({ time: t, type: "tap", lane: lanes[laneIndex] });
        if ((t - (finalStart + 2)) > 1) { // 最後の1秒は同時押し追加
            notes.push({ time: t, type: "tap", lane: lanes[3 - laneIndex] });
        }
    }
    
    // 究極の終焉（同時押し）
    notes.push({ time: duration - 0.5, type: "tap", lane: lanes[0] });
    notes.push({ time: duration - 0.5, type: "tap", lane: lanes[3] });
    notes.push({ time: duration - 0.1, type: "tap", lane: lanes[1] });
    notes.push({ time: duration - 0.1, type: "tap", lane: lanes[2] });
    
    console.log('Generated', notes.length, 'notes for complex Antithesis');
    return notes.sort((a, b) => a.time - b.time);
    }
}

// ゲーム初期化
const game = new PipipiRhythmGame();