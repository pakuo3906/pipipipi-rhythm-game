import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class NoteManager {
    constructor(scene, chartData, lanePositions) {
        this.scene = scene;
        this.chartData = chartData;
        this.lanePositions = lanePositions;
        
        this.activeNotes = [];
        this.notePool = [];
        this.holdNotes = [];
        
        // ノートの外観設定
        this.noteConfig = {
            tap: {
                geometry: new THREE.BoxGeometry(0.8, 0.3, 0.5),
                material: new THREE.MeshPhongMaterial({ color: 0x00ff00 })
            },
            hold: {
                geometry: new THREE.BoxGeometry(0.8, 0.3, 0.5),
                material: new THREE.MeshPhongMaterial({ color: 0xff0000 })
            }
        };
        
        // ノートの移動設定
        this.noteSpeed = 10; // units/second
        this.spawnDistance = 50; // Z軸上の生成距離
        this.judgePosition = 0; // Z=0が判定位置
        this.despawnDistance = -10; // この距離を過ぎたら削除
        
        // 先読み時間（秒）
        this.lookAheadTime = this.spawnDistance / this.noteSpeed;
        
        // 現在処理中のノートインデックス
        this.currentNoteIndex = 0;
        
        this.init();
    }

    init() {
        console.log('NoteManager initialized');
        console.log('Note config:', this.noteConfig);
        console.log('Look ahead time:', this.lookAheadTime);
        
        // オブジェクトプールの初期化
        this.initObjectPool();
    }

    initObjectPool() {
        // 効率的なメモリ使用のため、ノートオブジェクトを事前に作成
        const poolSize = 50;
        
        for (let i = 0; i < poolSize; i++) {
            const tapNote = this.createNoteObject('tap');
            const holdNote = this.createNoteObject('hold');
            
            tapNote.visible = false;
            holdNote.visible = false;
            
            this.notePool.push(tapNote, holdNote);
        }
    }

    createNoteObject(type) {
        const config = this.noteConfig[type];
        const geometry = config.geometry.clone();
        const material = config.material.clone();
        
        const note = new THREE.Mesh(geometry, material);
        note.noteType = type;
        note.castShadow = true;
        note.receiveShadow = true;
        
        this.scene.add(note);
        return note;
    }

    getPooledNote(type) {
        // プールから使用可能なノートを取得
        const note = this.notePool.find(n => !n.visible && n.noteType === type);
        
        if (note) {
            note.visible = true;
            return note;
        }
        
        // プールに空きがない場合は新規作成
        return this.createNoteObject(type);
    }

    returnToPool(note) {
        // プールに戻す
        note.visible = false;
        note.position.set(0, 0, 0);
        note.rotation.set(0, 0, 0);
        note.scale.set(1, 1, 1);
        note.noteData = null;
        
        // activeNotesから除去
        const index = this.activeNotes.indexOf(note);
        if (index > -1) {
            this.activeNotes.splice(index, 1);
        }
    }

    update(currentTime) {
        // 新しいノートの生成
        this.spawnNotes(currentTime);
        
        // アクティブノートの更新
        this.updateActiveNotes(currentTime);
        
        // 範囲外ノートの削除
        this.cleanupNotes();
    }

    spawnNotes(currentTime) {
        const chart = this.chartData.chart;
        
        // 現在時刻 + 先読み時間内のノートを生成
        const spawnTime = currentTime + this.lookAheadTime;
        
        while (this.currentNoteIndex < chart.length) {
            const noteData = chart[this.currentNoteIndex];
            
            if (noteData.time > spawnTime) {
                break; // まだ生成時刻ではない
            }
            
            this.spawnNote(noteData);
            this.currentNoteIndex++;
        }
    }

    spawnNote(noteData) {
        const note = this.getPooledNote(noteData.type);
        
        if (!note) {
            console.error('Failed to get pooled note');
            return;
        }
        
        // ノートデータを設定
        note.noteData = noteData;
        
        // 位置設定
        const lanePos = this.lanePositions[noteData.lane];
        note.position.set(
            lanePos.x,
            lanePos.y,
            this.spawnDistance
        );
        
        // レーンに応じた色の調整
        this.applyLaneColor(note, noteData.lane);
        
        // Holdノートの場合は長さを調整
        if (noteData.type === 'hold') {
            this.setupHoldNote(note, noteData);
        }
        
        this.activeNotes.push(note);
        
        if (this.debugMode) {
            console.log('Spawned note:', {
                type: noteData.type,
                lane: noteData.lane,
                time: noteData.time,
                position: note.position
            });
        }
    }

    applyLaneColor(note, lane) {
        const laneColors = {
            'A': 0x00ff00, // 緑
            'S': 0x0000ff, // 青  
            'D': 0xff0000  // 赤
        };
        
        note.material.color.setHex(laneColors[lane] || 0xffffff);
    }

    setupHoldNote(note, noteData) {
        // Holdノートは長さを持つ
        const holdLength = noteData.duration * this.noteSpeed;
        note.scale.z = holdLength;
        
        // 位置調整（中心が判定位置に来るように）
        note.position.z += holdLength / 2;
        
        // 半透明にして区別
        note.material.transparent = true;
        note.material.opacity = 0.7;
        
        this.holdNotes.push({
            note: note,
            startTime: noteData.time,
            endTime: noteData.time + noteData.duration,
            isHolding: false
        });
    }

    updateActiveNotes(currentTime) {
        this.activeNotes.forEach(note => {
            if (!note.noteData) return;
            
            // Z軸方向への移動
            const targetZ = this.noteSpeed * (currentTime - note.noteData.time);
            note.position.z = this.spawnDistance - targetZ;
            
            // 判定位置に近づいたときのエフェクト
            if (Math.abs(note.position.z - this.judgePosition) < 2) {
                this.applyJudgeEffect(note);
            }
        });
    }

    applyJudgeEffect(note) {
        // 判定位置付近での視覚効果
        const distance = Math.abs(note.position.z - this.judgePosition);
        const scale = 1 + (2 - distance) * 0.1;
        note.scale.set(scale, scale, note.scale.z);
        
        // 光る効果
        const intensity = Math.max(0, 1 - distance / 2);
        note.material.emissive.setRGB(intensity * 0.3, intensity * 0.3, intensity * 0.3);
    }

    cleanupNotes() {
        const notesToRemove = [];
        
        this.activeNotes.forEach(note => {
            if (note.position.z < this.despawnDistance) {
                notesToRemove.push(note);
            }
        });
        
        notesToRemove.forEach(note => {
            this.removeNote(note);
        });
    }

    removeNote(note) {
        // Holdノートの場合は配列からも除去
        if (note.noteData && note.noteData.type === 'hold') {
            const holdIndex = this.holdNotes.findIndex(h => h.note === note);
            if (holdIndex > -1) {
                this.holdNotes.splice(holdIndex, 1);
            }
        }
        
        this.returnToPool(note);
    }

    getActiveNotes() {
        return this.activeNotes.filter(note => note.visible);
    }

    getNotesInRange(minZ, maxZ) {
        return this.activeNotes.filter(note => 
            note.position.z >= minZ && note.position.z <= maxZ
        );
    }

    getNotesAtJudgePosition(tolerance = 1) {
        return this.getNotesInRange(
            this.judgePosition - tolerance,
            this.judgePosition + tolerance
        );
    }

    // Hold判定用メソッド
    startHold(note) {
        const holdNote = this.holdNotes.find(h => h.note === note);
        if (holdNote) {
            holdNote.isHolding = true;
            note.material.opacity = 1.0;
            console.log('Hold started:', holdNote);
        }
    }

    endHold(note) {
        const holdNote = this.holdNotes.find(h => h.note === note);
        if (holdNote) {
            holdNote.isHolding = false;
            note.material.opacity = 0.7;
            console.log('Hold ended:', holdNote);
        }
    }

    isHoldActive(note) {
        const holdNote = this.holdNotes.find(h => h.note === note);
        return holdNote ? holdNote.isHolding : false;
    }

    reset() {
        // 全てのアクティブノートを削除
        this.activeNotes.forEach(note => this.returnToPool(note));
        this.activeNotes = [];
        this.holdNotes = [];
        this.currentNoteIndex = 0;
        
        console.log('NoteManager reset');
    }

    // デバッグ用メソッド
    enableDebugMode() {
        this.debugMode = true;
        console.log('NoteManager debug mode enabled');
    }

    disableDebugMode() {
        this.debugMode = false;
        console.log('NoteManager debug mode disabled');
    }

    getDebugInfo() {
        return {
            activeNotes: this.activeNotes.length,
            poolSize: this.notePool.length,
            currentNoteIndex: this.currentNoteIndex,
            totalNotes: this.chartData.chart.length,
            holdNotes: this.holdNotes.length,
            noteSpeed: this.noteSpeed,
            lookAheadTime: this.lookAheadTime
        };
    }

    // 設定の調整
    setNoteSpeed(speed) {
        this.noteSpeed = speed;
        this.lookAheadTime = this.spawnDistance / this.noteSpeed;
        console.log('Note speed set to:', speed);
    }

    getNoteSpeed() {
        return this.noteSpeed;
    }
}