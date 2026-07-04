const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const loadingElement = document.getElementById('loading');
const scoreElement = document.getElementById('score');
const timerBarElement = document.getElementById('timer-bar');
const gameContainer = document.getElementById('game-container');

// ข้อมูลคำศัพท์สัตว์และ Emoji
const ANIMAL_DATA = [
    { word: 'DOG', emoji: '🐶' },
    { word: 'CAT', emoji: '🐱' },
    { word: 'MOUSE', emoji: '🐭' },
    { word: 'RABBIT', emoji: '🐰' },
    { word: 'FOX', emoji: '🦊' },
    { word: 'BEAR', emoji: '🐻' },
    { word: 'PANDA', emoji: '🐼' },
    { word: 'KOALA', emoji: '🐨' },
    { word: 'TIGER', emoji: '🐯' },
    { word: 'LION', emoji: '🦁' },
    { word: 'COW', emoji: '🐮' },
    { word: 'PIG', emoji: '🐷' },
    { word: 'FROG', emoji: '🐸' },
    { word: 'MONKEY', emoji: '🐵' },
    { word: 'CHICKEN', emoji: '🐔' },
    { word: 'PENGUIN', emoji: '🐧' },
    { word: 'BIRD', emoji: '🐦' },
    { word: 'DUCK', emoji: '🦆' },
    { word: 'OWL', emoji: '🦉' },
    { word: 'HORSE', emoji: '🐴' },
    { word: 'ELEPHANT', emoji: '🐘' },
    { word: 'GIRAFFE', emoji: '🦒' },
    { word: 'HIPPO', emoji: '🦛' },
    { word: 'RHINO', emoji: '🦏' },
    { word: 'ZEBRA', emoji: '🦓' },
    { word: 'CAMEL', emoji: '🐫' },
    { word: 'KANGAROO', emoji: '🦘' },
    { word: 'WOLF', emoji: '🐺' },
    { word: 'BAT', emoji: '🦇' },
    { word: 'GORILLA', emoji: '🦍' },
    { word: 'ORANGUTAN', emoji: '🦧' },
    { word: 'SLOTH', emoji: '🦥' },
    { word: 'OTTER', emoji: '🦦' },
    { word: 'RACCOON', emoji: '🦝' },
    { word: 'SKUNK', emoji: '🦨' },
    { word: 'BADGER', emoji: '🦡' },
    { word: 'HAMSTER', emoji: '🐹' },
    { word: 'SHEEP', emoji: '🐑' },
    { word: 'GOAT', emoji: '🐐' },
    { word: 'DEER', emoji: '🦌' },
    { word: 'LLAMA', emoji: '🦙' },
    { word: 'BOAR', emoji: '🐗' },
    { word: 'SNAKE', emoji: '🐍' },
    { word: 'TURTLE', emoji: '🐢' },
    { word: 'CROCODILE', emoji: '🐊' },
    { word: 'FISH', emoji: '🐟' },
    { word: 'SHARK', emoji: '🦈' },
    { word: 'WHALE', emoji: '🐳' },
    { word: 'DOLPHIN', emoji: '🐬' },
    { word: 'OCTOPUS', emoji: '🐙' },
    { word: 'SQUID', emoji: '🦑' },
    { word: 'CRAB', emoji: '🦀' },
    { word: 'LOBSTER', emoji: '🦞' },
    { word: 'BUTTERFLY', emoji: '🦋' },
    { word: 'BEE', emoji: '🐝' },
    { word: 'ANT', emoji: '🐜' },
    { word: 'SPIDER', emoji: '🕷️' },
    { word: 'SCORPION', emoji: '🦂' },
    { word: 'SNAIL', emoji: '🐌' },
    { word: 'BUG', emoji: '🐛' },
    { word: 'ROOSTER', emoji: '🐓' },
    { word: 'TURKEY', emoji: '🦃' },
    { word: 'PEACOCK', emoji: '🦚' },
    { word: 'PARROT', emoji: '🦜' },
    { word: 'SWAN', emoji: '🦢' },
    { word: 'FLAMINGO', emoji: '🦩' },
    { word: 'DOVE', emoji: '🕊️' },
    { word: 'EAGLE', emoji: '🦅' }
];

let score = 0;
let gameState = 'COUNTDOWN'; // 'PLAYING', 'PUNISHED', 'CELEBRATING', 'COUNTDOWN'
const TIME_LIMIT = 15000; // 15 วินาที
let questionStartTime = 0;
let countdownValue = 3;
let countdownInterval = null;

let currentWord = "";
let answers = []; // [{ emoji: '🐶', x, y, width, height, hoverTime: 0 }]
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
            // ให้เสียงอ่านทำงานพร้อมกับตอนที่ภาพโจทย์ปรากฏขึ้น
            speakWord(currentWord);
        }
    }, 1000);
}

let lastCorrectWord = "";

let currentUtterance = null;
function speakWord(word) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        currentUtterance = new SpeechSynthesisUtterance(word);
        currentUtterance.lang = 'en-US';
        currentUtterance.rate = 0.9;
        window.speechSynthesis.speak(currentUtterance);
    }
}

function generateQuestion() {
    let dataPool = [...ANIMAL_DATA];
    
    // กรองคำตอบเก่าออกเพื่อไม่ให้ซ้ำกับข้อที่แล้ว
    let available = dataPool.filter(a => a.word !== lastCorrectWord);
    if (available.length === 0) available = dataPool;
    
    let correctAnimal = available[Math.floor(Math.random() * available.length)];
    currentWord = correctAnimal.word;
    lastCorrectWord = currentWord;
    
    // เอาข้อที่ถูกออกไปก่อน เพื่อสุ่มตัวหลอกมาเพิ่ม
    dataPool = dataPool.filter(a => a.word !== currentWord);
    
    let selectedAnimals = [correctAnimal];
    for(let i=0; i<2; i++) {
        let randIndex = Math.floor(Math.random() * dataPool.length);
        selectedAnimals.push(dataPool[randIndex]);
        dataPool.splice(randIndex, 1); 
    }

    // สลับตำแหน่งคำตอบ (Fisher-Yates Shuffle)
    for (let i = selectedAnimals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedAnimals[i], selectedAnimals[j]] = [selectedAnimals[j], selectedAnimals[i]];
    }

    const startX = (canvasElement.width - (BOX_SIZE * 3 + 40)) / 2; 
    const yPos = 300; 

    answers = selectedAnimals.map((animal, index) => {
        return {
            emoji: animal.emoji,
            isCorrect: animal.word === correctAnimal.word,
            x: startX + (2 - index) * (BOX_SIZE + 20),
            y: yPos,
            width: BOX_SIZE,
            height: BOX_SIZE,
            hoverProgress: 0
        };
    });

    startCountdown();
}

function punish() {
    if (gameState === 'PUNISHED' || gameState === 'CELEBRATING') return;
    gameState = 'PUNISHED';
    
    // เล่นเสียงโห่
    playBooSound();
    
    let correctAns = answers.find(a => a.isCorrect);
    document.getElementById('correct-answer-display').innerText = `เฉลย: ${currentWord} = ${correctAns.emoji}`;
    
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
    if (loadingElement.style.display !== 'none') {
        loadingElement.style.display = 'none';
        generateQuestion(); 
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (gameState === 'PLAYING') {
        const now = Date.now();
        const elapsedTime = now - questionStartTime;
        let timeLeftPercentage = 100 - (elapsedTime / TIME_LIMIT) * 100;
        
        if (timeLeftPercentage <= 0) {
            timeLeftPercentage = 0;
            punish();
        }
        
        let timerColor = '#2ecc71';
        if (timeLeftPercentage < 25) timerColor = '#e74c3c';
        else if (timeLeftPercentage < 50) timerColor = '#e67e22';
        
        document.getElementById('timer-bar-container').style.background = `conic-gradient(${timerColor} ${timeLeftPercentage}%, transparent 0)`;

        // วาดคำศัพท์สัตว์ (Mirror กลับด้านข้อความ)
        canvasCtx.save();
        canvasCtx.translate(canvasElement.width, 0);
        canvasCtx.scale(-1, 1);
        
        canvasCtx.font = 'bold 80px Arial';
        canvasCtx.textAlign = 'center';
        canvasCtx.fillStyle = '#FFD700';
        canvasCtx.strokeStyle = '#000000';
        canvasCtx.lineWidth = 6;
        const textX = canvasElement.width / 2;
        canvasCtx.strokeText(currentWord, textX, 150);
        canvasCtx.fillText(currentWord, textX, 150);
        
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
            
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 3});
            drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 1, radius: 2});

            const thumbTip = landmarks[4];
            const thumbIP = landmarks[3];
            const pinkyMCP = landmarks[17];
            
            const distThumbTipToPinky = Math.hypot(thumbTip.x - pinkyMCP.x, thumbTip.y - pinkyMCP.y);
            const distThumbIPToPinky = Math.hypot(thumbIP.x - pinkyMCP.x, thumbIP.y - pinkyMCP.y);
            
            if (distThumbTipToPinky > distThumbIPToPinky) {
                fingersCount++;
            }

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

        // วาดและประมวลผลกล่อง Emoji สัตว์
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
                
                if (ans.hoverProgress === 1 && !answered) {
                    answered = true;
                    if (ans.isCorrect) {
                        celebrate();
                    } else {
                        punish();
                    }
                }
            } else {
                ans.hoverProgress = Math.max(0, ans.hoverProgress - HOVER_DECREMENT);
            }

            // กล่องพื้นหลัง
            canvasCtx.fillStyle = 'rgba(142, 68, 173, 0.8)'; // สีม่วง
            canvasCtx.fillRect(ans.x, ans.y, ans.width, ans.height);
            canvasCtx.strokeStyle = 'white';
            canvasCtx.lineWidth = 4;
            canvasCtx.strokeRect(ans.x, ans.y, ans.width, ans.height);

            // หลอดโหลดเวลาจิ้ม
            if (ans.hoverProgress > 0) {
                const fillHeight = ans.height * ans.hoverProgress;
                canvasCtx.fillStyle = 'rgba(46, 204, 113, 0.9)'; // สีเขียว
                canvasCtx.fillRect(ans.x, ans.y + ans.height - fillHeight, ans.width, fillHeight);
            }

            // วาดรูป Emoji สัตว์ และหมายเลขกำกับ
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

            // วาด Emoji
            canvasCtx.font = '70px Arial';
            canvasCtx.fillText(ans.emoji, flippedX, textY);
            canvasCtx.restore();
        });
    } else if (gameState === 'COUNTDOWN') {
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
    maxNumHands: 1, 
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
    loadingElement.innerHTML = "เปิดกล้องไม่สำเร็จ กรุณาเช็คการตั้งค่าบราวเซอร์";
    loadingElement.style.color = "red";
});
