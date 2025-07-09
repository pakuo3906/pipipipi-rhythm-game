import * as Tone from 'https://unpkg.com/tone@latest/build/Tone.js';

export class AudioSync {
    constructor(songInfo) {
        this.songInfo = songInfo;
        this.player = null;
        this.transport = null;
        this.isLoaded = false;
        this.isPlaying = false;
        this.startTime = 0;
        this.pausedTime = 0;
        this.audioOffset = 0.05; // 50ms デフォルト遅延補正
        
        // 音楽ファイルのパス
        this.audioPath = './pipipipi_shingou.mp3';
        
        this.init();
    }

    async init() {
        try {
            console.log('🎵 Initializing AudioSync...');
            
            // Tone.jsの初期化
            console.log('🎵 Starting Tone.js...');
            console.log('🔍 Tone object:', Tone);
            
            if (typeof Tone !== 'undefined' && Tone.start) {
                await Tone.start();
                console.log('✅ Tone.js started successfully');
            } else if (typeof Tone !== 'undefined' && Tone.context) {
                console.warn('⚠️ Tone.start not available, using context resume');
                if (Tone.context.state === 'suspended') {
                    await Tone.context.resume();
                }
            } else {
                console.error('❌ Tone.js not properly loaded');
                // 音楽なしで続行
                this.isLoaded = true;
                return;
            }
            
            // Transport設定
            this.transport = Tone.getTransport();
            this.transport.bpm.value = this.songInfo.bpm;
            this.transport.timeSignature = [4, 4];
            console.log('✅ Transport configured:', { bpm: this.songInfo.bpm });
            
            // 音楽ファイルの存在確認
            const audioExists = await this.checkAudioFileExists();
            if (!audioExists) {
                console.warn('⚠️ Audio file not found, continuing without audio');
                this.isLoaded = true; // 音楽なしでも動作継続
                return;
            }
            
            // Player作成
            console.log('🎵 Creating audio player...');
            this.player = new Tone.Player({
                url: this.audioPath,
                loop: false,
                autostart: false,
                onload: () => {
                    this.isLoaded = true;
                    console.log('✅ Audio loaded successfully');
                },
                onerror: (error) => {
                    console.error('❌ Audio loading error:', error);
                    this.handleAudioError(error);
                }
            }).toDestination();
            
            // Transport同期用のイベント
            this.transport.on('start', () => {
                console.log('▶️ Transport started');
            });
            
            this.transport.on('stop', () => {
                console.log('⏹️ Transport stopped');
            });
            
            this.transport.on('pause', () => {
                console.log('⏸️ Transport paused');
            });
            
            console.log('✅ AudioSync initialized');
            
        } catch (error) {
            console.error('❌ AudioSync initialization failed:', error);
            
            // エラーの詳細情報
            const errorInfo = {
                message: error.message,
                stack: error.stack,
                audioPath: this.audioPath,
                toneVersion: Tone.version,
                contextState: Tone.context.state,
                timestamp: new Date().toISOString()
            };
            
            console.group('🚨 AudioSync Error Details');
            console.error('Error Info:', errorInfo);
            console.groupEnd();
            
            throw error;
        }
    }

    async checkAudioFileExists() {
        try {
            const response = await fetch(this.audioPath, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            console.log('🔍 Audio file check failed:', error.message);
            return false;
        }
    }

    async enableAudioContext() {
        try {
            if (Tone.context.state === 'suspended') {
                await Tone.context.resume();
                console.log('🎵 Audio context resumed by user interaction');
            }
            
            if (Tone.start) {
                await Tone.start();
                console.log('🎵 Tone.js started by user interaction');
            }
        } catch (error) {
            console.error('❌ Failed to enable audio context:', error);
        }
    }

    async play() {
        if (!this.isLoaded) {
            console.warn('Audio not loaded yet');
            return;
        }
        
        if (this.isPlaying) {
            console.warn('Already playing');
            return;
        }
        
        try {
            // Transport開始
            if (this.transport) {
                this.transport.start();
            }
            
            // Player開始
            if (this.player) {
                this.player.start();
            }
            
            this.isPlaying = true;
            this.startTime = performance.now() / 1000; // Tone.now()の代替
            
            console.log('Audio playback started');
            
        } catch (error) {
            console.error('Audio playback error:', error);
            this.handleAudioError(error);
        }
    }

    pause() {
        if (!this.isPlaying) {
            console.warn('Not playing');
            return;
        }
        
        if (this.transport) {
            this.transport.pause();
        }
        if (this.player) {
            this.player.stop();
        }
        
        this.pausedTime = this.getCurrentTime();
        this.isPlaying = false;
        
        console.log('Audio paused at:', this.pausedTime);
    }

    resume() {
        if (this.isPlaying) {
            console.warn('Already playing');
            return;
        }
        
        if (!this.isLoaded) {
            console.warn('Audio not loaded');
            return;
        }
        
        // 一時停止した位置から再開
        if (this.transport) {
            this.transport.start();
        }
        if (this.player) {
            this.player.start(0, this.pausedTime);
        }
        
        this.isPlaying = true;
        this.startTime = (performance.now() / 1000) - this.pausedTime;
        
        console.log('Audio resumed from:', this.pausedTime);
    }

    stop() {
        if (this.transport) {
            this.transport.stop();
        }
        
        if (this.player) {
            this.player.stop();
        }
        
        this.isPlaying = false;
        this.startTime = 0;
        this.pausedTime = 0;
        
        console.log('Audio stopped');
    }

    getCurrentTime() {
        if (!this.isPlaying) {
            return this.pausedTime;
        }
        
        // Transport時間を使用（より正確な同期）
        if (this.transport && this.transport.seconds !== undefined) {
            const transportTime = this.transport.seconds;
            return transportTime + this.audioOffset;
        }
        
        // フォールバック: performance.now()を使用
        const elapsed = (performance.now() / 1000) - this.startTime;
        return elapsed + this.audioOffset;
    }

    setAudioOffset(offset) {
        this.audioOffset = offset;
        console.log('Audio offset set to:', offset);
    }

    getAudioOffset() {
        return this.audioOffset;
    }

    update(deltaTime) {
        // 必要に応じて同期チェック
        if (this.isPlaying) {
            this.checkSync();
        }
    }

    checkSync() {
        // Transport時間とPlayer時間の同期チェック
        if (this.player && this.transport) {
            const transportTime = this.transport.seconds;
            const playerTime = this.player.buffer ? this.player.buffer.duration : 0;
            
            // 同期がずれている場合の補正（将来実装）
            const syncDiff = Math.abs(transportTime - playerTime);
            if (syncDiff > 0.1) { // 100ms以上ずれている場合
                console.warn('Sync drift detected:', syncDiff);
            }
        }
    }

    handleAudioError(error) {
        console.error('Audio system error:', error);
        
        // エラーの種類に応じた処理
        if (error.name === 'NotAllowedError') {
            alert('Audio playback requires user interaction. Please click to enable audio.');
        } else if (error.name === 'NotFoundError') {
            alert('Audio file not found. Please check the file path.');
        } else {
            alert('Audio playback error occurred. Please refresh the page.');
        }
    }

    // 音量制御
    setVolume(volume) {
        if (this.player) {
            this.player.volume.value = Tone.gainToDb(volume);
        }
    }

    getVolume() {
        if (this.player) {
            return Tone.dbToGain(this.player.volume.value);
        }
        return 0;
    }

    // 状態取得
    getState() {
        return {
            isLoaded: this.isLoaded,
            isPlaying: this.isPlaying,
            currentTime: this.getCurrentTime(),
            duration: this.songInfo.duration,
            bpm: this.songInfo.bpm,
            audioOffset: this.audioOffset
        };
    }

    // リセット
    reset() {
        this.stop();
        this.pausedTime = 0;
        this.audioOffset = 0.05; // デフォルト値にリセット
        console.log('AudioSync reset');
    }

    // デバッグ用の詳細情報
    getDebugInfo() {
        return {
            transportTime: this.transport ? this.transport.seconds : 0,
            playerState: this.player ? this.player.state : 'disposed',
            audioContext: {
                state: Tone.context.state,
                sampleRate: Tone.context.sampleRate,
                currentTime: Tone.context.currentTime
            },
            timing: {
                startTime: this.startTime,
                pausedTime: this.pausedTime,
                currentTime: this.getCurrentTime(),
                audioOffset: this.audioOffset
            }
        };
    }
}