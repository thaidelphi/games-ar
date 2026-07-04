const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const loadingElement = document.getElementById('loading');
const scoreElement = document.getElementById('score');
const timerBarElement = document.getElementById('timer-bar');
const gameContainer = document.getElementById('game-container');

// Game State
let score = 0;
let gameState = 'COUNTDOWN'; // 'PLAYING', 'PUNISHED', 'CELEBRATING', 'COUNTDOWN'
let questionStartTime = 0;
let countdownValue = 3;
let countdownInterval = null;
const TIME_LIMIT = 15000; // 15 วินาที

let currentQuestion = "";
let answers = []; // [{ value: 10, x, y, width, height, hoverTime: 0 }]
const BOX_SIZE = 120;

const clapAudio = new Audio('https://www.myinstants.com/media/sounds/applause.mp3');
clapAudio.volume = 0.5;
function playClapSound() {
    clapAudio.currentTime = 0;
    clapAudio.play().catch(e => console.log("Audio play failed:", e));
}

const booAudio = new Audio('https://www.myinstants.com/media/sounds/boo.mp3');
booAudio.volume = 0.5;
function playBooSound() {
    booAudio.currentTime = 0;
    booAudio.play().catch(e => console.log("Audio play failed:", e));
}
const FPS_ASSUMED = 30;
const HOVER_REQUIRED = 200; // 0.2 วินาที
const HOVER_INCREMENT = 1 / (FPS_ASSUMED * (HOVER_REQUIRED / 1000)); 
const HOVER_DECREMENT = HOVER_INCREMENT * 2; 

function startCountdown() {
    gameState = 'COUNTDOWN';
    countdownValue = 3;
    
    if (countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        countdownValue--;
        if (countdownValue <= 0) {
            clearInterval(countdownInterval);
            questionStartTime = Date.now();
            gameState = 'PLAYING';
        }
    }, 1000);
}

let lastCorrectAnswer = null;

// ฟังก์ชันสร้างโจทย์ใหม่
function generateQuestion() {
    let num1, num2, correctAnswer;
    
    // สุ่มเลข 1 หลัก (1-9) พยายามไม่ให้ซ้ำกับคำตอบข้อที่แล้ว
    let attempts = 0;
    do {
        num1 = Math.floor(Math.random() * 9) + 1;
        num2 = Math.floor(Math.random() * 9) + 1;
        correctAnswer = num1 + num2;
        attempts++;
    } while (correctAnswer === lastCorrectAnswer && attempts < 10);
    
    lastCorrectAnswer = correctAnswer;
    currentQuestion = `${num1} + ${num2} = ?`;

    // สร้างคำตอบหลอก
    let wrong1 = correctAnswer + Math.floor(Math.random() * 10) + 1;
    let wrong2 = correctAnswer - Math.floor(Math.random() * 10) - 1;
    if (wrong2 < 0) wrong2 = correctAnswer + 15; // กันติดลบ
    
    let choices = [correctAnswer, wrong1, wrong2];
    
    // สลับตำแหน่งคำตอบ (Fisher-Yates Shuffle)
    for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    // กำหนดตำแหน่งกล่อง 3 กล่องเรียงแนวนอน
    const startX = (canvasElement.width - (BOX_SIZE * 3 + 40)) / 2; // จัดให้อยู่ตรงกลาง
    const yPos = 300; // ตำแหน่งครึ่งล่างจอ

    answers = choices.map((val, index) => {
        return {
            value: val,
            isCorrect: val === correctAnswer,
            x: startX + (2 - index) * (BOX_SIZE + 20),
            y: yPos,
            width: BOX_SIZE,
            height: BOX_SIZE,
            hoverStart: 0,
            hoverProgress: 0 // 0 to 1
        };
    });

    startCountdown();
}

function punish() {
    if (gameState === 'PUNISHED' || gameState === 'CELEBRATING') return;
    gameState = 'PUNISHED';
    
    // เล่นเสียงโห่
    playBooSound();
    
    let correctVal = answers.find(a => a.isCorrect).value;
    document.getElementById('correct-answer-display').innerText = `เฉลย: ${currentQuestion.replace('?', correctVal)}`;
    
    gameContainer.classList.add('shake-effect');
    gameContainer.classList.add('punish-active');

    setTimeout(() => {
        gameContainer.classList.remove('shake-effect');
        gameContainer.classList.remove('punish-active');
        startCountdown();
    }, 3000); // 3 วินาทีเพื่อให้ดูเฉลยทัน
}

function celebrate() {
    if (gameState === 'PUNISHED' || gameState === 'CELEBRATING') return;
    gameState = 'CELEBRATING';
    
    // เล่นเสียงปรบมือ
    playClapSound();
    
    gameContainer.classList.add('success-active');
    
    score += 10;
    scoreElement.innerText = score;

    setTimeout(() => {
        gameContainer.classList.remove('success-active');
        generateQuestion();
    }, 1000);
}

function onResults(results) {

    if (videoElement.videoWidth && videoElement.videoHeight) {
        if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
        }
    }
    if (loadingElement.style.display !== 'none') {
        loadingElement.style.display = 'none';
        generateQuestion(); // เริ่มเกมทันทีที่โหลดโมเดลเสร็จ
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (gameState === 'PLAYING') {
        const now = Date.now();
        const elapsedTime = now - questionStartTime;
        let timeLeftPercentage = 100 - (elapsedTime / TIME_LIMIT) * 100;
        
        // อัปเดตหลอดเวลา
        if (timeLeftPercentage <= 0) {
            timeLeftPercentage = 0;
            punish(); // เวลาหมด โดนทุบ!
        }
        
        let timerColor = '#f1c40f';
        if (timeLeftPercentage < 25) timerColor = '#e74c3c';
        else if (timeLeftPercentage < 50) timerColor = '#e67e22';
        
        document.getElementById('timer-bar-container').style.background = `conic-gradient(${timerColor} ${timeLeftPercentage}%, transparent 0)`;

        // วาดโจทย์เลข (Mirror ข้อความด้วย)
        canvasCtx.save();
        canvasCtx.translate(canvasElement.width, 0);
        canvasCtx.scale(-1, 1);
        
        canvasCtx.font = 'bold 80px Arial';
        canvasCtx.textAlign = 'center';
        canvasCtx.fillStyle = '#FFFFFF';
        canvasCtx.strokeStyle = '#000000';
        canvasCtx.lineWidth = 6;
        const textX = canvasElement.width / 2;
        canvasCtx.strokeText(currentQuestion, textX, 150);
        canvasCtx.fillText(currentQuestion, textX, 150);
        
        canvasCtx.restore();

        // นับจำนวนนิ้ว
        let fingersCount = 0;
        let hoveredBoxIndex = -1;
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];

            // ตรวจสอบหน้ามือ/หลังมือ
            let isPalm = true;
            if (results.multiHandedness && results.multiHandedness.length > 0) {
                const handedness = results.multiHandedness[0].label;
                const v1 = { x: landmarks[5].x - landmarks[0].x, y: landmarks[5].y - landmarks[0].y };
                const v2 = { x: landmarks[17].x - landmarks[0].x, y: landmarks[17].y - landmarks[0].y };
                const crossProduct = v1.x * v2.y - v1.y * v2.x;
                isPalm = (handedness === 'Left') ? (crossProduct > 0) : (crossProduct < 0);
            }
            const handSideText = isPalm ? "หน้ามือ (Palm)" : "หลังมือ (Back)";
            document.getElementById('hand-side-display').innerText = `🖐️ ด้าน: ${handSideText}`;
            document.getElementById('hand-side-display').style.color = isPalm ? '#2ecc71' : '#e74c3c';

            // เช็คว่านิ้วชี้ชี้กล่องไหนอยู่
            const visualFingerX = (1 - landmarks[8].x) * canvasElement.width;
            const visualFingerY = landmarks[8].y * canvasElement.height;
            answers.forEach((ans, idx) => {
                const screenBoxX = canvasElement.width - ans.x - ans.width;
                if (visualFingerX > screenBoxX && visualFingerX < screenBoxX + ans.width && 
                    visualFingerY > ans.y && visualFingerY < ans.y + ans.height) {
                    hoveredBoxIndex = idx;
                }
            });
            
            // วาดโครงมือเพื่อให้ผู้เล่นรู้ว่ากล้องจับได้
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 3});
            drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 1, radius: 2});

            // นับนิ้วโป้ง (เช็คจากระยะห่างปลายนิ้วโป้งกับโคนนิ้วก้อย เพื่อแก้ปัญหาซ้าย/ขวา)
            const thumbTip = landmarks[4];
            const thumbIP = landmarks[3];
            const pinkyMCP = landmarks[17];
            
            const distThumbTipToPinky = Math.hypot(thumbTip.x - pinkyMCP.x, thumbTip.y - pinkyMCP.y);
            const distThumbIPToPinky = Math.hypot(thumbIP.x - pinkyMCP.x, thumbIP.y - pinkyMCP.y);
            
            if (distThumbTipToPinky > distThumbIPToPinky) {
                fingersCount++;
            }

            // นับนิ้วที่เหลือ 4 นิ้ว
            const fingerTips = [8, 12, 16, 20];
            const fingerPIPs = [6, 10, 14, 18];
            for (let i = 0; i < fingerTips.length; i++) {
                if (landmarks[fingerTips[i]].y < landmarks[fingerPIPs[i]].y) fingersCount++;
            }
        }

        // อัปเดต UI จำนวนนิ้วที่มุมซ้ายล่าง
        const fingerDisplay = document.getElementById('finger-display');
        if (fingerDisplay) {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                fingerDisplay.innerText = fingersCount;
            } else {
                fingerDisplay.innerText = "0";
            }
        }

        // วาดและเช็คสถานะกล่องคำตอบ
        let answered = false;
        answers.forEach((ans, index) => {
            const requiredFingers = index + 1;
            let isSelected = false;
            
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                if (hoveredBoxIndex !== -1) {
                    isSelected = (hoveredBoxIndex === index);
                } else {
                    isSelected = (fingersCount === requiredFingers);
                }
            }

            if (isSelected) {
                ans.hoverProgress += HOVER_INCREMENT;
                if (ans.hoverProgress > 1) ans.hoverProgress = 1;
                
                // ถ้าแช่นิ้วครบ 1 วินาที
                if (ans.hoverProgress === 1 && !answered) {
                    answered = true;
                    if (ans.isCorrect) {
                        celebrate();
                    } else {
                        punish();
                    }
                }
            } else {
                // ถ้าเอานิ้วออก ให้รีเซ็ตค่า hover
                ans.hoverProgress = Math.max(0, ans.hoverProgress - HOVER_DECREMENT);
            }

            // --- วาดกล่องคำตอบ ---
            // พื้นหลังกล่อง
            canvasCtx.fillStyle = 'rgba(52, 152, 219, 0.8)'; // สีฟ้า
            canvasCtx.fillRect(ans.x, ans.y, ans.width, ans.height);
            canvasCtx.strokeStyle = 'white';
            canvasCtx.lineWidth = 4;
            canvasCtx.strokeRect(ans.x, ans.y, ans.width, ans.height);

            // วาดหลอด Progress ตอนเอานิ้วชี้แช่ (ถมสีทับจากข้างล่างขึ้นข้างบน)
            if (ans.hoverProgress > 0) {
                const fillHeight = ans.height * ans.hoverProgress;
                canvasCtx.fillStyle = 'rgba(46, 204, 113, 0.9)'; // สีเขียว
                canvasCtx.fillRect(ans.x, ans.y + ans.height - fillHeight, ans.width, fillHeight);
            }

            // วาดตัวอักษรและหมายเลขข้อ (Mirror กลับด้าน)
            canvasCtx.save();
            canvasCtx.translate(canvasElement.width, 0);
            canvasCtx.scale(-1, 1);
            
            const flippedX = canvasElement.width - (ans.x + ans.width / 2);
            const textY = ans.y + ans.height / 2;

            // วาดป้ายหมายเลขข้อด้านบน
            canvasCtx.beginPath();
            canvasCtx.arc(flippedX, ans.y - 30, 25, 0, 2 * Math.PI);
            canvasCtx.fillStyle = '#e67e22';
            canvasCtx.fill();
            canvasCtx.lineWidth = 3;
            canvasCtx.strokeStyle = 'white';
            canvasCtx.stroke();
            
            canvasCtx.font = 'bold 30px Arial';
            canvasCtx.textAlign = 'center';
            canvasCtx.textBaseline = 'middle';
            canvasCtx.fillStyle = 'white';
            canvasCtx.fillText((index + 1).toString(), flippedX, ans.y - 30);

            // วาดคำตอบ
            canvasCtx.font = 'bold 50px Arial';
            canvasCtx.fillText(ans.value.toString(), flippedX, textY);
            canvasCtx.restore();
        });
    } else if (gameState === 'COUNTDOWN') {
        // วาดตัวเลขนับถอยหลังไว้ด้านซ้าย
        canvasCtx.save();
        canvasCtx.translate(canvasElement.width, 0);
        canvasCtx.scale(-1, 1);
        canvasCtx.font = 'bold 150px Arial';
        canvasCtx.fillStyle = '#e74c3c';
        canvasCtx.strokeStyle = 'white';
        canvasCtx.lineWidth = 10;
        canvasCtx.textAlign = 'center';
        canvasCtx.textBaseline = 'middle';
        canvasCtx.strokeText(countdownValue, canvasElement.width / 2, canvasElement.height / 2);
        canvasCtx.fillText(countdownValue, canvasElement.width / 2, canvasElement.height / 2);
        canvasCtx.restore();
    }

    canvasCtx.restore();
}

const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1, // จับแค่มือเดียวพอ
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 640,
    height: 480
});

camera.start().catch(err => {
    console.error("Camera error:", err);
    loadingElement.innerHTML = "ไม่สามารถเปิดกล้องได้ โปรดอนุญาตการใช้งานกล้องในบราวเซอร์";
    loadingElement.style.color = "red";
});
