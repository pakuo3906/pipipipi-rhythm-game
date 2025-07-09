export class InputHandler {
    constructor(canvas) {
        this.canvas = canvas;
        this.isMouseDown = false;
        this.mousePosition = { x: 0, y: 0 };
        this.lastMousePosition = { x: 0, y: 0 };
        this.mouseVelocity = { x: 0, y: 0 };
        this.velocityHistory = [];
        this.minSliceSpeed = 300; // px/s - 要件定義に基づく
        
        // イベントコールバック
        this.onSlice = null;
        this.onMouseMove = null;
        
        // デバッグ用
        this.debugMode = false;
        this.sliceTrail = [];
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // マウスイベント
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        
        // コンテキストメニュー無効化
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // タッチイベント（将来的な対応用）
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }

    handleMouseDown(event) {
        this.isMouseDown = true;
        this.updateMousePosition(event);
        this.lastMousePosition = { ...this.mousePosition };
        this.velocityHistory = [];
        
        if (this.debugMode) {
            this.sliceTrail = [{ ...this.mousePosition }];
        }
    }

    handleMouseMove(event) {
        this.updateMousePosition(event);
        
        if (this.isMouseDown) {
            this.calculateVelocity();
            
            // スライス判定
            const speed = this.getSpeed();
            if (speed >= this.minSliceSpeed) {
                this.triggerSlice(speed);
            }
            
            // デバッグ用軌跡記録
            if (this.debugMode) {
                this.sliceTrail.push({ ...this.mousePosition });
                if (this.sliceTrail.length > 50) {
                    this.sliceTrail.shift();
                }
            }
        }
        
        if (this.onMouseMove) {
            this.onMouseMove(this.mousePosition, this.mouseVelocity, this.isMouseDown);
        }
    }

    handleMouseUp(event) {
        this.isMouseDown = false;
        this.velocityHistory = [];
        
        if (this.debugMode) {
            this.sliceTrail = [];
        }
    }

    handleMouseLeave(event) {
        this.isMouseDown = false;
        this.velocityHistory = [];
    }

    // タッチイベント（基本的な対応）
    handleTouchStart(event) {
        event.preventDefault();
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            this.handleMouseDown({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            this.handleMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
        this.handleMouseUp({});
    }

    updateMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.lastMousePosition = { ...this.mousePosition };
        
        this.mousePosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    calculateVelocity() {
        const now = performance.now();
        const deltaX = this.mousePosition.x - this.lastMousePosition.x;
        const deltaY = this.mousePosition.y - this.lastMousePosition.y;
        
        // 速度履歴に追加
        this.velocityHistory.push({
            deltaX,
            deltaY,
            timestamp: now
        });
        
        // 古いデータを削除（100ms以上前）
        this.velocityHistory = this.velocityHistory.filter(v => now - v.timestamp < 100);
        
        if (this.velocityHistory.length > 1) {
            // 平均速度を計算
            const totalDeltaX = this.velocityHistory.reduce((sum, v) => sum + v.deltaX, 0);
            const totalDeltaY = this.velocityHistory.reduce((sum, v) => sum + v.deltaY, 0);
            const totalTime = (now - this.velocityHistory[0].timestamp) / 1000; // 秒に変換
            
            if (totalTime > 0) {
                this.mouseVelocity = {
                    x: totalDeltaX / totalTime,
                    y: totalDeltaY / totalTime
                };
            }
        }
    }

    getSpeed() {
        return Math.sqrt(this.mouseVelocity.x ** 2 + this.mouseVelocity.y ** 2);
    }

    triggerSlice(speed) {
        if (this.onSlice) {
            this.onSlice(this.mousePosition.x, this.mousePosition.y, speed);
        }
        
        if (this.debugMode) {
            console.log('Slice triggered:', {
                position: this.mousePosition,
                velocity: this.mouseVelocity,
                speed: speed
            });
        }
    }

    update(deltaTime) {
        // 必要に応じて定期的な更新処理
        if (this.velocityHistory.length > 0) {
            const now = performance.now();
            this.velocityHistory = this.velocityHistory.filter(v => now - v.timestamp < 100);
        }
    }

    // デバッグ用メソッド
    enableDebugMode() {
        this.debugMode = true;
        console.log('InputHandler debug mode enabled');
    }

    disableDebugMode() {
        this.debugMode = false;
        console.log('InputHandler debug mode disabled');
    }

    getDebugInfo() {
        return {
            isMouseDown: this.isMouseDown,
            mousePosition: this.mousePosition,
            mouseVelocity: this.mouseVelocity,
            speed: this.getSpeed(),
            minSliceSpeed: this.minSliceSpeed,
            velocityHistoryLength: this.velocityHistory.length,
            sliceTrailLength: this.sliceTrail.length
        };
    }

    // 設定の調整
    setMinSliceSpeed(speed) {
        this.minSliceSpeed = speed;
        console.log('Min slice speed set to:', speed);
    }

    getMinSliceSpeed() {
        return this.minSliceSpeed;
    }

    // 3D空間での座標変換用ヘルパー
    getNormalizedPosition() {
        return {
            x: (this.mousePosition.x / this.canvas.width) * 2 - 1,
            y: -(this.mousePosition.y / this.canvas.height) * 2 + 1
        };
    }

    // イベントリスナーの削除
    destroy() {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
        this.canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    }
}