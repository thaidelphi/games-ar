const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const loadingElement = document.getElementById('loading');
const scoreElement = document.getElementById('score');

// ตัวแปรในเกม
let score = 0;
let fruits = [];
const FRUIT_EMOJIS = ['🍎', '🍌', '🍊', '🍇', '🍓', '🍉', '🍍', '🥭', '🍋', '🍑'];
const CATCH_RADIUS = 60; // รัศมีรอบๆ มือที่ใช้วัดว่ารับผลไม้ได้ไหม

// ฟังก์ชันสร้างผลไม้ให้ตกลงมา
function spawnFruit() {
    // สุ่มตำแหน่งแกน X ให้อยู่ภายในจอ (เว้นขอบไว้ 50px)
    const x = Math.random() * (canvasElement.width - 100) + 50;
    const emoji = FRUIT_EMOJIS[Math.floor(Math.random() * FRUIT_EMOJIS.length)];
    
    fruits.push({
        x: x,
        y: -30, // เริ่มต้นตกลงมาจากนอกจอด้านบน
        speed: 3 + Math.random() * 5, // สุ่มความเร็ว (ยิ่งค่าเยอะยิ่งตกเร็ว)
        emoji: emoji,
        active: true
    });
}

// สร้างผลไม้ใหม่ทุกๆ 1.0 วินาที
setInterval(spawnFruit, 1000);

// เก็บพิกัดตะกร้า (มือ) ล่าสุด
let currentBasket = { x: -1000, y: -1000, isActive: false };

function onResults(results) {

    if (videoElement.videoWidth && videoElement.videoHeight) {
        if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
        }
    }
    // ปิดหน้าจอโหลดเมื่อ AI ทำงานสำเร็จ
    if (loadingElement.style.display !== 'none') {
        loadingElement.style.display = 'none';
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // วาดภาพวิดีโอจากกล้อง
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // ตรวจสอบว่าพบฝ่ามือหรือไม่
    currentBasket.isActive = false;
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // ใช้ตำแหน่งจุดที่ 9 (โคนนิ้วกลาง) เป็นศูนย์กลางของตะกร้า
        const basketBase = landmarks[9];
        
        // แปลงพิกัด (0-1) ให้เป็นพิกัด Pixel ของ Canvas
        const basketX = basketBase.x * canvasElement.width;
        const basketY = basketBase.y * canvasElement.height;
        
        currentBasket = { x: basketX, y: basketY, isActive: true };

        // วาดรูปตะกร้า 🧺 ที่ตำแหน่งมือ
        // ต้องวาดโดยกลับด้าน text เพื่อไม่ให้ emoji หันผิดทาง
        canvasCtx.save();
        canvasCtx.translate(canvasElement.width, 0);
        canvasCtx.scale(-1, 1);
        
        const flippedBasketX = canvasElement.width - basketX;
        
        canvasCtx.font = '80px Arial';
        canvasCtx.textAlign = 'center';
        canvasCtx.textBaseline = 'middle';
        canvasCtx.fillText('🧺', flippedBasketX, basketY);
        
        // วงกลมไกด์ระยะการรับ (รัศมี CATCH_RADIUS)
        canvasCtx.beginPath();
        canvasCtx.arc(flippedBasketX, basketY, CATCH_RADIUS, 0, 2 * Math.PI);
        canvasCtx.lineWidth = 3;
        canvasCtx.strokeStyle = 'rgba(46, 204, 113, 0.6)'; // สีเขียวโปร่งใส
        canvasCtx.stroke();
        
        canvasCtx.restore();
    }

    // --- ส่วนของระบบเกมเพลย์ (Game Loop) ---
    canvasCtx.save();
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.font = '50px Arial';
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'middle';

    for (let i = 0; i < fruits.length; i++) {
        let f = fruits[i];
        if (!f.active) continue;

        // ให้ผลไม้ตกลงมาตามความเร็ว
        f.y += f.speed;

        // วาดรูปผลไม้ (Emoji) โดยพิกัด x ต้องกลับด้านก่อนวาด
        const flippedFX = canvasElement.width - f.x;
        canvasCtx.fillText(f.emoji, flippedFX, f.y);

        // ตรวจสอบการชน (Collision) ถ้ายกมืออยู่
        if (currentBasket.isActive) {
            const dx = f.x - currentBasket.x;
            const dy = f.y - currentBasket.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            // ถ้าระยะห่างน้อยกว่ารัศมีการรับ แปลว่าลงตะกร้า!
            if (distance < CATCH_RADIUS) {
                f.active = false; // ผลไม้หายไป
                score += 10; // เพิ่มคะแนน
                scoreElement.innerText = score; // อัปเดต UI
                
                // วาดเอฟเฟกต์วิ้งๆ ตอนเก็บได้
                canvasCtx.font = '30px Arial';
                canvasCtx.fillStyle = '#f1c40f';
                canvasCtx.fillText('✨', flippedFX, f.y - 20);
            }
        }

        // ลบผลไม้ทิ้งถ้าตกขอบจอด้านล่างไปแล้ว
        if (f.y > canvasElement.height + 50) {
            f.active = false;
        }
    }

    // ล้าง Array เอาเฉพาะตัวที่ยัง Active (ป้องกัน Memory Leak)
    fruits = fruits.filter(f => f.active);

    canvasCtx.restore();
    canvasCtx.restore();
}

// ตั้งค่า MediaPipe Hands
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1, // จับมือเดียว
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults(onResults);

// เปิดกล้อง WebCam
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 640,
    height: 480
});

camera.start().catch(err => {
    console.error("Camera error:", err);
    loadingElement.innerHTML = "เปิดกล้องไม่สำเร็จ กรุณาเช็คการตั้งค่าการเข้าถึงกล้อง";
    loadingElement.style.color = "red";
});
