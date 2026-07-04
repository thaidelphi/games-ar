const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const loadingElement = document.getElementById('loading');
const scoreElement = document.getElementById('score');

// ตัวแปรในเกม
let score = 0;
let foods = [];
const FOOD_EMOJIS = ['🍕', '🍎', '🍔', '🍓', '🍩', '🌭', '🍗', '🍉'];
const MOUTH_OPEN_THRESHOLD = 15; // ระยะห่างระหว่างริมฝีปากบน-ล่างที่ถือว่า "อ้าปาก" (หน่วยเป็น pixel)
const CATCH_RADIUS = 40; // รัศมีรอบปากที่ใช้วัดว่ากินอาหารโดนไหม

// ฟังก์ชันสร้างอาหารให้ตกลงมา
function spawnFood() {
    // สุ่มตำแหน่งแกน X ให้อยู่ภายในจอ (เว้นขอบไว้ 50px)
    const x = Math.random() * (canvasElement.width - 100) + 50;
    const emoji = FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)];
    
    foods.push({
        x: x,
        y: -30, // เริ่มต้นตกลงมาจากนอกจอด้านบน
        speed: 4 + Math.random() * 4, // สุ่มความเร็ว (ยิ่งค่าเยอะยิ่งตกเร็ว)
        emoji: emoji,
        active: true
    });
}

// สร้างอาหารใหม่ทุกๆ 1.2 วินาที
setInterval(spawnFood, 1200);

// เก็บสถานะปากล่าสุด
let currentMouth = { x: 0, y: 0, isOpen: false };

function onResults(results) {
    // ปิดหน้าจอโหลดเมื่อ AI ทำงานสำเร็จ
    if (loadingElement.style.display !== 'none') {
        loadingElement.style.display = 'none';
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // วาดภาพวิดีโอจากกล้อง
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // ตรวจสอบว่าพบใบหน้าหรือไม่
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        
        // จุด 13 (ริมฝีปากบนด้านใน), จุด 14 (ริมฝีปากล่างด้านใน)
        const upperLip = landmarks[13];
        const lowerLip = landmarks[14];
        
        // แปลงพิกัด (0-1) ให้เป็นพิกัด Pixel ของ Canvas
        const mouthTopY = upperLip.y * canvasElement.height;
        const mouthBottomY = lowerLip.y * canvasElement.height;
        const mouthX = (upperLip.x + lowerLip.x) / 2 * canvasElement.width;
        const mouthY = (upperLip.y + lowerLip.y) / 2 * canvasElement.height;
        
        // คำนวณความกว้างของการอ้าปาก
        const mouthDistance = Math.abs(mouthBottomY - mouthTopY);
        const isOpen = mouthDistance > MOUTH_OPEN_THRESHOLD;
        
        currentMouth = { x: mouthX, y: mouthY, isOpen: isOpen };

        // วาดวงกลมเล็งเป้าที่ปาก (UI Guide)
        canvasCtx.beginPath();
        canvasCtx.arc(mouthX, mouthY, CATCH_RADIUS, 0, 2 * Math.PI);
        canvasCtx.lineWidth = 3;
        
        if (isOpen) {
            // ถ้าอ้าปาก ให้วงกลมเป็นสีเขียว
            canvasCtx.strokeStyle = '#00FF00'; 
            canvasCtx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            canvasCtx.fill();
        } else {
            // ถ้าหุบปาก วงกลมเป็นสีแดง
            canvasCtx.strokeStyle = '#FF0000';
        }
        canvasCtx.stroke();
    }

    // --- ส่วนของระบบเกมเพลย์ (Game Loop) ---
    canvasCtx.font = '50px Arial';
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'middle';

    for (let i = 0; i < foods.length; i++) {
        let f = foods[i];
        if (!f.active) continue;

        // ให้อาหารตกลงมาตามความเร็ว
        f.y += f.speed;

        // วาดรูปอาหาร (Emoji)
        canvasCtx.fillText(f.emoji, f.x, f.y);

        // ตรวจสอบการชน (Collision) เมื่อ "อ้าปากอยู่"
        if (currentMouth.isOpen) {
            const dx = f.x - currentMouth.x;
            const dy = f.y - currentMouth.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            // ถ้าระยะห่างน้อยกว่ารัศมีการกิน แปลว่างับโดน!
            if (distance < CATCH_RADIUS) {
                f.active = false; // อาหารหายไป
                score += 10; // เพิ่มคะแนน
                scoreElement.innerText = score; // อัปเดต UI
            }
        }

        // ลบอาหารทิ้งถ้าตกขอบจอด้านล่างไปแล้ว
        if (f.y > canvasElement.height + 50) {
            f.active = false;
        }
    }

    // ล้าง Array เอาเฉพาะตัวที่ยัง Active (ป้องกัน Memory Leak)
    foods = foods.filter(f => f.active);

    canvasCtx.restore();
}

// ตั้งค่า MediaPipe Face Mesh
const faceMesh = new FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
}});

faceMesh.setOptions({
    maxNumFaces: 1, // จับแค่หน้าเดียว
    refineLandmarks: true, // ตรวจจับละเอียดขึ้น (จำเป็นสำหรับการจับริมฝีปากและตา)
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

faceMesh.onResults(onResults);

// เปิดใช้งานกล้องเว็บแคม
const camera = new Camera(videoElement, {
    onFrame: async () => {
        // ส่งภาพแต่ละเฟรมให้ AI ประมวลผล
        await faceMesh.send({image: videoElement});
    },
    width: 640,
    height: 480
});

camera.start().catch(err => {
    console.error("Camera error:", err);
    loadingElement.innerHTML = "ไม่สามารถเปิดกล้องได้ โปรดอนุญาตการใช้งานกล้องในบราวเซอร์";
    loadingElement.style.color = "red";
});
