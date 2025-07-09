export class ChartLoader {
    static async load(chartPath) {
        try {
            console.log('📊 Loading chart from:', chartPath);
            
            // fetch の詳細なエラーハンドリング
            let response;
            try {
                response = await fetch(chartPath);
            } catch (fetchError) {
                console.error('🚨 Fetch failed:', fetchError);
                throw new Error(`Network error: ${fetchError.message}. Please check if you're using a local server.`);
            }
            
            if (!response.ok) {
                const errorDetail = {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url,
                    headers: Object.fromEntries(response.headers.entries())
                };
                console.error('🚨 HTTP Error:', errorDetail);
                
                if (response.status === 404) {
                    throw new Error(`Chart file not found: ${chartPath}. Please check the file path.`);
                } else if (response.status === 0) {
                    throw new Error('CORS error: Please use a local server to access the chart file.');
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            let chartData;
            try {
                chartData = await response.json();
            } catch (jsonError) {
                console.error('🚨 JSON Parse Error:', jsonError);
                throw new Error(`Invalid JSON format in chart file: ${jsonError.message}`);
            }
            
            // 譜面データの検証
            console.log('🔍 Validating chart data...');
            const validation = ChartLoader.validateChart(chartData);
            if (!validation.isValid) {
                console.error('🚨 Chart validation failed:', validation.errors);
                throw new Error(`Invalid chart data: ${validation.errors.join(', ')}`);
            }
            
            // 譜面データの前処理
            console.log('⚙️ Processing chart data...');
            const processedChart = ChartLoader.preprocessChart(chartData);
            
            console.log('✅ Chart loaded successfully:', {
                title: processedChart.songInfo.title,
                artist: processedChart.songInfo.artist,
                duration: processedChart.songInfo.duration,
                bpm: processedChart.songInfo.bpm,
                noteCount: processedChart.chart.length
            });
            
            return processedChart;
            
        } catch (error) {
            console.error('❌ Chart loading error:', error);
            
            // エラーの詳細情報を追加
            const errorInfo = {
                message: error.message,
                stack: error.stack,
                chartPath: chartPath,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                location: window.location.href
            };
            
            console.group('🚨 Chart Loading Error Details');
            console.error('Error Info:', errorInfo);
            console.groupEnd();
            
            throw error;
        }
    }

    static validateChart(chartData) {
        const errors = [];
        
        // 基本構造チェック
        if (!chartData.songInfo) {
            errors.push('Missing songInfo');
        } else {
            if (!chartData.songInfo.title) errors.push('Missing song title');
            if (!chartData.songInfo.artist) errors.push('Missing artist');
            if (!chartData.songInfo.duration || chartData.songInfo.duration <= 0) {
                errors.push('Invalid duration');
            }
            if (!chartData.songInfo.bpm || chartData.songInfo.bpm <= 0) {
                errors.push('Invalid BPM');
            }
        }
        
        if (!chartData.chart || !Array.isArray(chartData.chart)) {
            errors.push('Missing or invalid chart array');
        } else {
            // ノートデータの検証
            chartData.chart.forEach((note, index) => {
                if (typeof note.time !== 'number' || note.time < 0) {
                    errors.push(`Invalid time at note ${index}: ${note.time}`);
                }
                
                if (!['tap', 'hold'].includes(note.type)) {
                    errors.push(`Invalid note type at note ${index}: ${note.type}`);
                }
                
                if (!['A', 'S', 'D'].includes(note.lane)) {
                    errors.push(`Invalid lane at note ${index}: ${note.lane}`);
                }
                
                if (note.type === 'hold') {
                    if (typeof note.duration !== 'number' || note.duration <= 0) {
                        errors.push(`Invalid hold duration at note ${index}: ${note.duration}`);
                    }
                }
                
                // 時間範囲チェック
                if (chartData.songInfo && note.time > chartData.songInfo.duration) {
                    errors.push(`Note ${index} time exceeds song duration: ${note.time}`);
                }
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    static preprocessChart(chartData) {
        const processedChart = JSON.parse(JSON.stringify(chartData)); // Deep copy
        
        // ノートを時間順にソート
        processedChart.chart.sort((a, b) => a.time - b.time);
        
        // 各ノートにユニークIDを追加
        processedChart.chart.forEach((note, index) => {
            note.id = `note_${index}`;
            note.index = index;
        });
        
        // 統計情報の追加
        processedChart.stats = ChartLoader.calculateStats(processedChart.chart);
        
        return processedChart;
    }

    static calculateStats(chart) {
        const stats = {
            totalNotes: chart.length,
            tapNotes: 0,
            holdNotes: 0,
            laneDistribution: { A: 0, S: 0, D: 0 },
            density: {
                averageInterval: 0,
                maxInterval: 0,
                minInterval: Infinity
            },
            timing: {
                firstNote: chart[0]?.time || 0,
                lastNote: chart[chart.length - 1]?.time || 0
            }
        };
        
        // ノートタイプ別集計
        chart.forEach(note => {
            if (note.type === 'tap') {
                stats.tapNotes++;
            } else if (note.type === 'hold') {
                stats.holdNotes++;
            }
            
            stats.laneDistribution[note.lane]++;
        });
        
        // 間隔統計
        if (chart.length > 1) {
            const intervals = [];
            for (let i = 1; i < chart.length; i++) {
                const interval = chart[i].time - chart[i - 1].time;
                intervals.push(interval);
                stats.density.maxInterval = Math.max(stats.density.maxInterval, interval);
                stats.density.minInterval = Math.min(stats.density.minInterval, interval);
            }
            
            stats.density.averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        }
        
        return stats;
    }

    // 特定時間範囲のノートを取得
    static getNotesInRange(chart, startTime, endTime) {
        return chart.filter(note => note.time >= startTime && note.time <= endTime);
    }

    // 特定レーンのノートを取得
    static getNotesByLane(chart, lane) {
        return chart.filter(note => note.lane === lane);
    }

    // 特定タイプのノートを取得
    static getNotesByType(chart, type) {
        return chart.filter(note => note.type === type);
    }

    // 譜面の難易度分析
    static analyzeDifficulty(chart) {
        const stats = ChartLoader.calculateStats(chart);
        
        // 難易度指標の計算
        const noteDensity = stats.totalNotes / (stats.timing.lastNote - stats.timing.firstNote);
        const holdRatio = stats.holdNotes / stats.totalNotes;
        const laneVariation = Object.values(stats.laneDistribution).reduce((acc, val) => acc + (val > 0 ? 1 : 0), 0);
        
        return {
            density: noteDensity,
            holdRatio: holdRatio,
            laneVariation: laneVariation,
            averageInterval: stats.density.averageInterval,
            score: {
                beginner: noteDensity < 0.5 && holdRatio < 0.3,
                intermediate: noteDensity < 1.0 && holdRatio < 0.5,
                advanced: noteDensity >= 1.0 || holdRatio >= 0.5
            }
        };
    }

    // デバッグ用の譜面情報表示
    static debugChart(chartData) {
        console.group('Chart Debug Information');
        console.log('Song Info:', chartData.songInfo);
        console.log('Chart Stats:', chartData.stats);
        console.log('Difficulty Analysis:', ChartLoader.analyzeDifficulty(chartData.chart));
        
        // 最初と最後の5ノートを表示
        console.log('First 5 notes:', chartData.chart.slice(0, 5));
        console.log('Last 5 notes:', chartData.chart.slice(-5));
        
        // レーン別ノート数
        const laneStats = ChartLoader.calculateStats(chartData.chart).laneDistribution;
        console.log('Lane distribution:', laneStats);
        
        console.groupEnd();
    }
}