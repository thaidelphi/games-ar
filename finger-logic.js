// ดึง Elements จาก DOM
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const loadingElement = document.getElementById('loading');

// ตำแหน่ง Index (Landmark) ของปลายนิ้วทั้ง 4 (ชี้, กลาง, นาง, ก้อย)
const fingerTips = [8, 12, 16, 20]; 
// ตำแหน่งข้อต่อฐานของแต่ละนิ้ว (เพื่อเทียบว่ายืดหรือพับ)
const fingerPIPs = [6, 10, 14, 18]; 

const thumbTip = 4;
const thumbIP = 3;

// ฟังก์ชันทำงานทุกครั้งที่ AI ประมวลผลแต่ละเฟรมเสร็จ
function onResults(results) {
    // ปิดข้อความโหลดเมื่อภาพเริ่มมา
    loadingElement.style.display = 'none';

    // เตรียม Canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // วาดภาพจากกล้องลงบน Canvas
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    let fingersCount = 0;
    let isPalm = true;
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // ตรวจสอบหน้ามือ/หลังมือ
        if (results.multiHandedness && results.multiHandedness.length > 0) {
            const handedness = results.multiHandedness[0].label;
            const v1 = { x: landmarks[5].x - landmarks[0].x, y: landmarks[5].y - landmarks[0].y };
            const v2 = { x: landmarks[17].x - landmarks[0].x, y: landmarks[17].y - landmarks[0].y };
            const crossProduct = v1.x * v2.y - v1.y * v2.x;
            isPalm = (handedness === 'Left') ? (crossProduct > 0) : (crossProduct < 0);
        }
        
        const handSideText = isPalm ? "หน้ามือ (Palm)" : "หลังมือ (Back)";
        document.getElementById('hand-side-display').innerText = `ด้านมือ: ${handSideText}`;
        document.getElementById('hand-side-display').style.color = isPalm ? '#2ecc71' : '#e74c3c';

        // ประมวลผลแค่มือแรกที่เจอ (หากมีหลายมือ)
        const handedness = results.multiHandedness[0]; // ซ้ายหรือขวา
        
        // วาดเส้นเชื่อมต่อโครงกระดูกมือ
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 5});
        drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 2, radius: 3});
        
        // 1. ตรวจสอบนิ้วโป้ง (Thumb)
        // นิ้วโป้งจะพับเข้าหาฝ่ามือในแนวแกน X เป็นหลัก 
        // ดังนั้นต้องเช็คตำแหน่งแกน X และต้องแยกมือซ้าย/มือขวา
        const isRightHand = handedness.label === 'Right';
        
        if (isRightHand) {
            // ถ้ามือขวา ปลายนิ้วโป้งต้องอยู่ทางซ้าย (ค่า x น้อยกว่า) ของข้อต่อ
            if (landmarks[thumbTip].x < landmarks[thumbIP].x) {
                fingersCount++;
            }
        } else {
            // ถ้ามือซ้าย ปลายนิ้วโป้งต้องอยู่ทางขวา (ค่า x มากกว่า) ของข้อต่อ
            if (landmarks[thumbTip].x > landmarks[thumbIP].x) {
                fingersCount++;
            }
        }

        // 2. ตรวจสอบอีก 4 นิ้ว (ชี้, กลาง, นาง, ก้อย)
        // นิ้วอื่นๆ จะพับลงมาในแนวแกน Y เป็นหลัก
        // จุด Y บน Canvas นับจากบนลงล่าง (บนสุดคือ 0)
        // ดังนั้นถ้านิ้วชูขึ้น ปลายนิ้ว (Tip) จะต้องมีค่า Y "น้อยกว่า" ข้อต่อ (PIP)
        for (let i = 0; i < fingerTips.length; i++) {
            if (landmarks[fingerTips[i]].y < landmarks[fingerPIPs[i]].y) {
                fingersCount++;
            }
        }

        // --- ส่วนแสดงผลตัวเลข ---
        canvasCtx.save();
        // เนื่องจาก Canvas ถูกทำ Mirror ผ่าน CSS (transform: scaleX(-1))
        // ตัวหนังสือที่วาดลงไปจะกลับด้าน (Mirror) ไปด้วย
        // เราจึงต้องทำ Mirror บริเวณที่จะวาดตัวอักษรกลับคืนมาให้ถูกต้อง
        canvasCtx.translate(canvasElement.width, 0);
        canvasCtx.scale(-1, 1);
        
        // ตั้งค่าฟอนต์
        canvasCtx.font = "bold 200px Arial";
        canvasCtx.fillStyle = "#FFD700";
        canvasCtx.strokeStyle = "#000000";
        canvasCtx.lineWidth = 10;
        
        // เนื่องจากเราเพิ่ง Flip Canvas แกน X ตัวอักษรจะไปเริ่มวาดจากฝั่งตรงข้าม
        const textStr = fingersCount.toString();
        // ตำแหน่ง X อ้างอิงจากขอบจอด้านขวา (เนื่องจาก flip แล้ว)
        const textX = 50; 
        const textY = 430;
        
        canvasCtx.fillText(textStr, textX, textY);
        canvasCtx.strokeText(textStr, textX, textY);
        
        canvasCtx.restore();
    }
    
    canvasCtx.restore();
}

// ตั้งค่า MediaPipe Hands
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1, // ตรวจจับแค่ 1 มือ
    modelComplexity: 1, // ความแม่นยำ 0, 1 (สมดุล)
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

// ผูกฟังก์ชัน callback เมื่อประมวลผลเสร็จ
hands.onResults(onResults);

// ตั้งค่ากล้องเว็บแคมผ่าน MediaPipe CameraUtils
const camera = new Camera(videoElement, {
    onFrame: async () => {
        // ส่งภาพไปให้ MediaPipe วิเคราะห์ทุกเฟรม
        await hands.send({image: videoElement});
    },
    width: 640,
    height: 480
});

// เริ่มเปิดกล้อง
camera.start().catch(err => {
    console.error("Camera error:", err);
    loadingElement.innerHTML = "ไม่สามารถเปิดกล้องได้ โปรดตรวจสอบการอนุญาตใช้งานกล้องบนบราวเซอร์";
    loadingElement.style.color = "#ff4444";
});
