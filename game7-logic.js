const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const loadingElement = document.getElementById('loading');
const wordPopup = document.getElementById('word-popup');

// ข้อมูลอวัยวะที่สามารถชี้ได้
// เราจะใช้ Pose Landmarks
const BODY_PARTS = [
    { id: 'hair', nameEn: 'Hair', nameTh: 'ผม', source: 'face', landmarks: [10], offsetY: -0.15 },
    { id: 'forehead', nameEn: 'Forehead', nameTh: 'หน้าผาก', source: 'face', landmarks: [10] },
    { id: 'eyebrow', nameEn: 'Eyebrow', nameTh: 'คิ้ว', source: 'face', landmarks: [105, 334] },
    { id: 'eye', nameEn: 'Eye', nameTh: 'ตา', source: 'pose', landmarks: [2, 5] },
    { id: 'ear', nameEn: 'Ear', nameTh: 'หู', source: 'pose', landmarks: [7, 8] },
    { id: 'nose', nameEn: 'Nose', nameTh: 'จมูก', source: 'pose', landmarks: [0] },
    { id: 'cheek', nameEn: 'Cheek', nameTh: 'แก้ม', source: 'face', landmarks: [234, 454] },
    { id: 'mouth', nameEn: 'Mouth', nameTh: 'ปาก', source: 'pose', landmarks: [9, 10] },
    { id: 'chin', nameEn: 'Chin', nameTh: 'คาง', source: 'face', landmarks: [152] },
    { id: 'neck', nameEn: 'Neck', nameTh: 'คอ', source: 'face', landmarks: [152], offsetY: 0.15 },
    { id: 'shoulder', nameEn: 'Shoulder', nameTh: 'ไหล่', source: 'pose', landmarks: [11, 12] },
    { id: 'arm', nameEn: 'Arm', nameTh: 'แขน', source: 'pose', landmarks: [13, 14, 15, 16] }
];

let hoverState = { partId: null, progress: 0 };
let lastSpokenPart = null;
let cooldownTimer = null;

const HOVER_THRESHOLD = 10; // ลดจำนวนเฟรมลงเพื่อให้จับได้ไวขึ้น (จาก 30 เหลือ 10)
const DISTANCE_THRESHOLD = 0.12; // เพิ่มระยะห่างให้ตรวจจับง่ายขึ้นเล็กน้อย

const startOverlay = document.getElementById('start-overlay');
if (startOverlay) {
    startOverlay.addEventListener('click', () => {
        try {
            if (typeof responsiveVoice !== 'undefined') {
                responsiveVoice.speak(" ", "Thai Female");
            }
        } catch(e) { console.error(e); }
        startOverlay.style.display = 'none';
    });
}

function speakWord(en, th) {
    if (typeof responsiveVoice !== 'undefined') {
        responsiveVoice.speak(en, "US English Female", {
            onend: () => {
                setTimeout(() => {
                    responsiveVoice.speak(th, "Thai Female");
                }, 300);
            }
        });
    }
}

function showPopup(part, x, y) {
    wordPopup.innerText = `${part.nameEn} (${part.nameTh})`;
    wordPopup.style.left = `${x}px`;
    wordPopup.style.top = `${y}px`;
    wordPopup.classList.add('active');
    
    speakWord(part.nameEn, part.nameTh);
    
    lastSpokenPart = part.id;
    if (cooldownTimer) clearTimeout(cooldownTimer);
    
    // Popup หายไปหลัง 3 วินาที
    cooldownTimer = setTimeout(() => {
        wordPopup.classList.remove('active');
        lastSpokenPart = null;
    }, 4000);
}

function getDistance(lm1, lm2) {
    return Math.hypot(lm1.x - lm2.x, lm1.y - lm2.y);
}

function onResults(results) {
    if (loadingElement.style.display !== 'none') {
        loadingElement.style.display = 'none';
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // วาดภาพจากกล้อง (mirror)
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // ดึงตำแหน่งปลายนิ้วชี้ (ถ้ามีมือ)
    let fingerTips = [];
    if (results.rightHandLandmarks) {
        fingerTips.push(results.rightHandLandmarks[8]);
        drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {color: '#00CC00', lineWidth: 2});
        drawLandmarks(canvasCtx, results.rightHandLandmarks, {color: '#FF0000', lineWidth: 1, radius: 2});
    }
    if (results.leftHandLandmarks) {
        fingerTips.push(results.leftHandLandmarks[8]);
        drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {color: '#00CC00', lineWidth: 2});
        drawLandmarks(canvasCtx, results.leftHandLandmarks, {color: '#FF0000', lineWidth: 1, radius: 2});
    }

    // วาดโครงร่าง Pose แบบจางๆ เพื่อให้เห็นว่าจับได้
    if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: 'rgba(255, 255, 255, 0.3)', lineWidth: 2});
        drawLandmarks(canvasCtx, results.poseLandmarks, {color: 'rgba(255, 0, 0, 0.5)', lineWidth: 1, radius: 2});
    }

    let detectedPart = null;
    let pointX = 0;
    let pointY = 0;

    // ตรวจสอบการชี้
    if (fingerTips.length > 0) {
        for (let tip of fingerTips) {
            for (let part of BODY_PARTS) {
                let landmarkSource = part.source === 'face' ? results.faceLandmarks : results.poseLandmarks;
                if (!landmarkSource) continue;
                
                for (let idx of part.landmarks) {
                    let rawLm = landmarkSource[idx];
                    if (rawLm) {
                        // Apply offsetY if any
                        let targetLm = { x: rawLm.x, y: rawLm.y + (part.offsetY || 0), z: rawLm.z };
                        let dist = getDistance(tip, targetLm);
                        
                        if (dist < DISTANCE_THRESHOLD) {
                            detectedPart = part;
                            // คำนวณพิกัดบนหน้าจอเพื่อแสดง Popup
                            // สลับแกน X เพราะเรากำลัง Mirror อยู่
                            pointX = (1 - targetLm.x) * canvasElement.width;
                            pointY = targetLm.y * canvasElement.height;
                            
                            // วาดวงกลมไฮไลต์บริเวณที่ชี้
                            canvasCtx.beginPath();
                            canvasCtx.arc(targetLm.x * canvasElement.width, targetLm.y * canvasElement.height, 20, 0, 2 * Math.PI);
                            canvasCtx.fillStyle = 'rgba(241, 196, 15, 0.5)';
                            canvasCtx.fill();
                            canvasCtx.lineWidth = 3;
                            canvasCtx.strokeStyle = '#f1c40f';
                            canvasCtx.stroke();
                            
                            break;
                        }
                    }
                }
                if (detectedPart) break;
            }
            if (detectedPart) break;
        }
    }

    canvasCtx.restore(); // คืนค่าการ Mirror สำหรับ UI ด้านบน

    // Logic การนับเวลาชี้
    if (detectedPart) {
        if (hoverState.partId === detectedPart.id) {
            hoverState.progress++;
            if (hoverState.progress >= HOVER_THRESHOLD && lastSpokenPart !== detectedPart.id) {
                showPopup(detectedPart, pointX, pointY);
                hoverState.progress = 0; // รีเซ็ตหลัง trigger
            }
        } else {
            hoverState.partId = detectedPart.id;
            hoverState.progress = 1;
        }
        
        // วาดหลอด Progress เล็กๆ ตามปลายนิ้ว
        if (hoverState.progress > 0 && hoverState.progress < HOVER_THRESHOLD) {
            canvasCtx.save();
            const barWidth = 60;
            const barHeight = 10;
            const px = pointX - barWidth/2;
            const py = pointY - 40;
            
            canvasCtx.fillStyle = 'rgba(0,0,0,0.5)';
            canvasCtx.fillRect(px, py, barWidth, barHeight);
            
            const fillWidth = (hoverState.progress / HOVER_THRESHOLD) * barWidth;
            canvasCtx.fillStyle = '#2ecc71';
            canvasCtx.fillRect(px, py, fillWidth, barHeight);
            
            canvasCtx.strokeStyle = 'white';
            canvasCtx.strokeRect(px, py, barWidth, barHeight);
            canvasCtx.restore();
        }
        
    } else {
        hoverState.partId = null;
        hoverState.progress = 0;
    }
}

const holistic = new Holistic({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
}});

holistic.setOptions({
    modelComplexity: 0,
    smoothLandmarks: false,
    enableSegmentation: false,
    smoothSegmentation: false,
    refineFaceLandmarks: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

holistic.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await holistic.send({image: videoElement});
    },
    width: 640,
    height: 480
});

camera.start();
