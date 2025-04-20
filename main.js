let analogValue = 512;
const valueDisplay = document.getElementById('value-display');

// Arduino 連接設置
document.getElementById("connect").addEventListener("click", async () => {
    try {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });

        const reader = port.readable.getReader();
        const decoder = new TextDecoder();

        async function readSerial() {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const line = decoder.decode(value).trim();
                const num = parseInt(line);
                if (!isNaN(num)) {
                    analogValue = num;
                    valueDisplay.textContent = `電阻值: ${num}`;
                }
            }
        }

        readSerial();
    } catch (error) {
        console.error('連接錯誤:', error);
        alert('連接 Arduino 時發生錯誤');
    }
});

// 波浪動畫設置
document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('waveCanvas');
    const ctx = canvas.getContext('2d');

    // 基本參數設置
    let time = 0;
    let horizontalOffset = 0;
    const verticalCenter = window.innerHeight * 0.5;
    let previousWavePoints = [];
    const extensionFactor = 0.3;

    // 波浪參數
    const waveParams = {
        baseFrequency: 0.003,
        phase: 0,
        baseSpeed: 0.02,
        horizontalSpeed: 1,
        floatSpeed: 0.001,
        floatAmplitude: 20
    };

    // 子波浪設置
    const subWaves = [
        {
            frequency: waveParams.baseFrequency * 0.5,
            amplitude: 0.3,
            speed: waveParams.baseSpeed * 0.7,
            phase: Math.random() * Math.PI * 2
        },
        {
            frequency: waveParams.baseFrequency * 1.5,
            amplitude: 0.2,
            speed: waveParams.baseSpeed * 1.3,
            phase: Math.random() * Math.PI * 2
        }
    ];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        previousWavePoints = Array(Math.ceil(canvas.width * (1 + extensionFactor * 2))).fill(verticalCenter);
    }

    function getWaveParameters() {
        // 根據電阻值動態調整波浪參數
        const normalizedValue = analogValue / 1023;
        
        return {
            baseAmplitude: 30 + normalizedValue * 150,  // 振幅範圍更大
            speed: 0.01 + normalizedValue * 0.08,       // 速度變化更明顯
            frequency: waveParams.baseFrequency * (0.5 + normalizedValue * 2), // 頻率隨值變化
            color: getColorFromValue(analogValue)
        };
    }

    function getColorFromValue(val) {
        const normalizedValue = val / 1023;
        // 使用 HSL 顏色空間實現更平滑的顏色過渡
        const hue = normalizedValue * 360;
        return `hsl(${hue}, 80%, 50%)`;
    }

    function generateWavePoint(x, time, offset) {
        const params = getWaveParameters();
        const adjustedX = x + offset;

        // 主波浪
        let value = Math.sin(adjustedX * params.frequency + time * params.speed) * params.baseAmplitude;

        // 子波浪疊加
        for (const wave of subWaves) {
            const subAmplitude = params.baseAmplitude * wave.amplitude;
            value += Math.sin(adjustedX * wave.frequency + time * (wave.speed * params.speed) + wave.phase) * subAmplitude;
        }

        return value;
    }

    function drawSmoothWave(points) {
        if (points.length < 2) return;
        const startX = -canvas.width * extensionFactor;

        ctx.beginPath();
        ctx.moveTo(startX, points[0]);

        // 使用貝茲曲線使波浪更平滑
        for (let i = 0; i < points.length - 1; i++) {
            const x1 = startX + i;
            const x2 = startX + i + 1;
            const y1 = points[i];
            const y2 = points[i + 1];
            const xc = (x1 + x2) / 2;
            const yc = (y1 + y2) / 2;
            
            if (i === 0) {
                ctx.lineTo(x1, y1);
            } else {
                ctx.quadraticCurveTo(x1, y1, xc, yc);
            }
        }

        ctx.stroke();
    }

    function drawWave() {
        time += 0.016; // 固定時間步進
        horizontalOffset += waveParams.horizontalSpeed;

        const params = getWaveParameters();
        const verticalShift = Math.sin(time * waveParams.floatSpeed) * waveParams.floatAmplitude;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const totalWidth = Math.ceil(canvas.width * (1 + extensionFactor * 2));
        const currentWavePoints = [];

        // 生成波浪點
        for (let i = 0; i < totalWidth; i++) {
            const waveValue = generateWavePoint(i, time, horizontalOffset);
            let y = verticalCenter + waveValue + verticalShift;

            // 平滑過渡
            if (previousWavePoints[i]) {
                y = previousWavePoints[i] * 0.7 + y * 0.3;
            }

            currentWavePoints[i] = y;
        }

        // 設置波浪樣式
        ctx.strokeStyle = params.color;
        ctx.lineWidth = 2 + (analogValue / 1023) * 3; // 線條寬度也隨電阻值變化
        ctx.shadowColor = params.color;
        ctx.shadowBlur = 10;
        
        drawSmoothWave(currentWavePoints);
        previousWavePoints = [...currentWavePoints];
        
        requestAnimationFrame(drawWave);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    requestAnimationFrame(drawWave);
});