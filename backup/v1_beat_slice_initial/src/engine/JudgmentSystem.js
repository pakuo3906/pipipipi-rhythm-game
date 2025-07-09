export class JudgmentSystem {
    constructor(ui) {
        this.ui = ui;
        
        // 判定設定（要件定義に基づく）
        this.judgmentConfig = {
            perfect: {
                window: 0.05, // ±50ms
                score: 1000,
                combo: true
            },
            good: {
                window: 0.1, // ±100ms
                score: 500,
                combo: true
            },
            miss: {
                window: Infinity,
                score: 0,
                combo: false
            }
        };
        
        // スコア・統計情報
        this.stats = {
            score: 0,
            combo: 0,
            maxCombo: 0,
            perfect: 0,
            good: 0,
            miss: 0,
            totalNotes: 0
        };
        
        // Hold判定用
        this.activeHolds = new Map();
        this.holdJudgmentTolerance = 0.1; // 100ms
        
        // 判定調整
        this.judgmentOffset = 0.0; // 判定タイミング調整
        this.minSliceSpeed = 300; // マウススライス最小速度
        
        // エフェクト設定
        this.effectDuration = 500; // ms
        
        console.log('JudgmentSystem initialized');
    }

    judge(noteTime, currentTime, sliceSpeed = 0) {
        // スライス速度チェック
        if (sliceSpeed < this.minSliceSpeed) {
            return 'MISS';
        }
        
        // タイミング差の計算
        const timeDifference = Math.abs(noteTime - currentTime + this.judgmentOffset);
        
        // 判定決定
        let judgment;
        if (timeDifference <= this.judgmentConfig.perfect.window) {
            judgment = 'PERFECT';
        } else if (timeDifference <= this.judgmentConfig.good.window) {
            judgment = 'GOOD';
        } else {
            judgment = 'MISS';
        }
        
        // 統計更新
        this.updateStats(judgment);
        
        // UI更新
        this.updateUI(judgment);
        
        console.log('Judgment:', {
            judgment,
            timeDifference: timeDifference.toFixed(3),
            noteTime: noteTime.toFixed(3),
            currentTime: currentTime.toFixed(3),
            sliceSpeed: sliceSpeed.toFixed(1)
        });
        
        return judgment;
    }

    judgeHold(noteData, currentTime, isHolding) {
        const holdId = noteData.id;
        const startTime = noteData.time;
        const endTime = noteData.time + noteData.duration;
        
        // Hold開始判定
        if (!this.activeHolds.has(holdId)) {
            if (currentTime >= startTime - this.judgmentConfig.perfect.window &&
                currentTime <= startTime + this.judgmentConfig.perfect.window) {
                
                if (isHolding) {
                    this.activeHolds.set(holdId, {
                        startTime: startTime,
                        endTime: endTime,
                        isSuccess: true,
                        lastCheckTime: currentTime
                    });
                    
                    return 'HOLD_START';
                }
            }
            
            // 開始を逃した場合
            if (currentTime > startTime + this.judgmentConfig.good.window) {
                return 'MISS';
            }
            
            return 'HOLD_WAIT';
        }
        
        // Hold継続判定
        const holdState = this.activeHolds.get(holdId);
        
        if (currentTime >= endTime) {
            // Hold終了判定
            this.activeHolds.delete(holdId);
            
            if (holdState.isSuccess && isHolding) {
                this.updateStats('PERFECT');
                this.updateUI('PERFECT');
                return 'HOLD_SUCCESS';
            } else {
                this.updateStats('MISS');
                this.updateUI('MISS');
                return 'HOLD_FAIL';
            }
        }
        
        // Hold中の判定
        if (!isHolding) {
            holdState.isSuccess = false;
            return 'HOLD_BROKEN';
        }
        
        holdState.lastCheckTime = currentTime;
        return 'HOLD_CONTINUE';
    }

    updateStats(judgment) {
        this.stats.totalNotes++;
        
        const config = this.judgmentConfig[judgment.toLowerCase()];
        if (config) {
            this.stats.score += config.score;
            
            if (config.combo) {
                this.stats.combo++;
                this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);
            } else {
                this.stats.combo = 0;
            }
            
            // 判定別カウント
            this.stats[judgment.toLowerCase()]++;
        }
    }

    updateUI(judgment) {
        // スコア表示更新
        this.ui.score.textContent = `Score: ${this.stats.score.toLocaleString()}`;
        
        // コンボ表示更新
        if (this.stats.combo > 0) {
            this.ui.combo.textContent = `${this.stats.combo} combo`;
            this.ui.combo.style.opacity = '1';
            this.animateCombo();
        } else {
            this.ui.combo.style.opacity = '0';
        }
        
        // 判定結果表示
        this.displayJudgment(judgment);
    }

    displayJudgment(judgment) {
        const judgmentElement = this.ui.judgment;
        judgmentElement.textContent = judgment;
        judgmentElement.className = this.getJudgmentClass(judgment);
        judgmentElement.style.opacity = '1';
        
        // アニメーション
        this.animateJudgment(judgmentElement);
        
        // フェードアウト
        setTimeout(() => {
            judgmentElement.style.opacity = '0';
        }, this.effectDuration);
    }

    getJudgmentClass(judgment) {
        switch (judgment) {
            case 'PERFECT':
                return 'perfect';
            case 'GOOD':
                return 'good';
            case 'MISS':
            case 'HOLD_FAIL':
                return 'miss';
            default:
                return '';
        }
    }

    animateJudgment(element) {
        // スケールアニメーション
        element.style.transform = 'translate(-50%, -50%) scale(1.2)';
        element.style.transition = 'transform 0.1s ease-out';
        
        setTimeout(() => {
            element.style.transform = 'translate(-50%, -50%) scale(1.0)';
        }, 100);
    }

    animateCombo() {
        const comboElement = this.ui.combo;
        
        // コンボエフェクト
        if (this.stats.combo % 10 === 0 && this.stats.combo > 0) {
            comboElement.style.transform = 'translate(-50%, -50%) scale(1.3)';
            comboElement.style.transition = 'transform 0.2s ease-out';
            
            setTimeout(() => {
                comboElement.style.transform = 'translate(-50%, -50%) scale(1.0)';
            }, 200);
        }
    }

    // 設定の調整
    setJudgmentOffset(offset) {
        this.judgmentOffset = offset;
        console.log('Judgment offset set to:', offset);
    }

    getJudgmentOffset() {
        return this.judgmentOffset;
    }

    setMinSliceSpeed(speed) {
        this.minSliceSpeed = speed;
        console.log('Min slice speed set to:', speed);
    }

    getMinSliceSpeed() {
        return this.minSliceSpeed;
    }

    adjustJudgmentWindow(type, window) {
        if (this.judgmentConfig[type]) {
            this.judgmentConfig[type].window = window;
            console.log(`${type} judgment window set to:`, window);
        }
    }

    // 統計情報取得
    getScore() {
        return this.stats.score;
    }

    getCombo() {
        return this.stats.combo;
    }

    getMaxCombo() {
        return this.stats.maxCombo;
    }

    getStats() {
        return { ...this.stats };
    }

    getAccuracy() {
        if (this.stats.totalNotes === 0) return 0;
        
        const totalHits = this.stats.perfect + this.stats.good;
        return (totalHits / this.stats.totalNotes) * 100;
    }

    getGrade() {
        const accuracy = this.getAccuracy();
        
        if (accuracy >= 95) return 'S';
        if (accuracy >= 90) return 'A';
        if (accuracy >= 80) return 'B';
        if (accuracy >= 70) return 'C';
        return 'D';
    }

    // リセット
    reset() {
        this.stats = {
            score: 0,
            combo: 0,
            maxCombo: 0,
            perfect: 0,
            good: 0,
            miss: 0,
            totalNotes: 0
        };
        
        this.activeHolds.clear();
        
        // UI初期化
        this.ui.score.textContent = 'Score: 0';
        this.ui.combo.style.opacity = '0';
        this.ui.judgment.style.opacity = '0';
        
        console.log('JudgmentSystem reset');
    }

    // デバッグ用メソッド
    getDebugInfo() {
        return {
            stats: this.stats,
            judgmentConfig: this.judgmentConfig,
            judgmentOffset: this.judgmentOffset,
            minSliceSpeed: this.minSliceSpeed,
            activeHolds: this.activeHolds.size,
            accuracy: this.getAccuracy(),
            grade: this.getGrade()
        };
    }

    // 判定結果の詳細分析
    getDetailedResults() {
        const accuracy = this.getAccuracy();
        const grade = this.getGrade();
        
        return {
            finalScore: this.stats.score,
            maxCombo: this.stats.maxCombo,
            accuracy: accuracy,
            grade: grade,
            breakdown: {
                perfect: this.stats.perfect,
                good: this.stats.good,
                miss: this.stats.miss,
                total: this.stats.totalNotes
            },
            performance: {
                isFullCombo: this.stats.miss === 0,
                isPerfect: this.stats.good === 0 && this.stats.miss === 0,
                comboRate: this.stats.maxCombo / this.stats.totalNotes
            }
        };
    }
}