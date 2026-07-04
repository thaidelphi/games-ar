import re

with open('game6-logic.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove FRUIT_DATA
content = re.sub(r'// ข้อมูลคำศัพท์ผลไม้และ Emoji\nconst FRUIT_DATA = \[.*?\];\n', '', content, flags=re.DOTALL)

# Update generateQuestion
new_generate = """function generateQuestion() {
    let num1 = Math.floor(Math.random() * 12) + 1; // 1 ถึง 12
    let num2 = Math.floor(Math.random() * 12) + 1; // 1 ถึง 12
    
    while (`${num1} x ${num2}` === lastCorrectWord) {
        num1 = Math.floor(Math.random() * 12) + 1;
        num2 = Math.floor(Math.random() * 12) + 1;
    }
    
    currentWord = `${num1} x ${num2}`;
    lastCorrectWord = currentWord;
    let correctAnswer = num1 * num2;
    
    let answerOptions = [correctAnswer];
    while(answerOptions.length < 4) {
        let offset = Math.floor(Math.random() * 20) - 10;
        if (offset === 0) continue;
        let fakeAnswer = correctAnswer + offset;
        if (fakeAnswer > 0 && !answerOptions.includes(fakeAnswer)) {
            answerOptions.push(fakeAnswer);
        }
    }

    for (let i = answerOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [answerOptions[i], answerOptions[j]] = [answerOptions[j], answerOptions[i]];
    }

    const startX = (canvasElement.width - (BOX_SIZE * 4 + 60)) / 2; 
    const yPos = 300; 

    answers = answerOptions.map((ans, index) => {
        return {
            text: ans.toString(),
            isCorrect: ans === correctAnswer,
            x: startX + (3 - index) * (BOX_SIZE + 20),
            y: yPos,
            width: BOX_SIZE,
            height: BOX_SIZE,
            hoverProgress: 0
        };
    });
    
    window.currentCorrectAnswer = correctAnswer;
    window.currentSpeakWord = `${num1} คูณ ${num2}`;

    startCountdown();
}"""
content = re.sub(r'function generateQuestion\(\) \{.*?\n    startCountdown\(\);\n\}', new_generate, content, flags=re.DOTALL)

# Update speakWord in startCountdown
content = content.replace("speakWord(currentWord);", "speakWord(window.currentSpeakWord, 'th-TH');")

# Update punish and celebrate
punish_regex = r'function punish\(\) \{.*?\}\n'
new_punish = """function punish() {
    if (gameState === 'PUNISHED' || gameState === 'CELEBRATING') return;
    gameState = 'PUNISHED';
    document.getElementById('correct-answer-display').innerText = `เฉลย: ${currentWord} = ${window.currentCorrectAnswer}`;
    playBooSound();
    speakWord(window.currentCorrectAnswer.toString(), 'th-TH');
    gameContainer.classList.add('shake-effect');
    gameContainer.classList.add('punish-active');
    setTimeout(() => {
        gameContainer.classList.remove('shake-effect');
        gameContainer.classList.remove('punish-active');
        startCountdown();
    }, 3000);
}
"""
content = re.sub(punish_regex, new_punish, content, flags=re.DOTALL)

celebrate_regex = r'function celebrate\(\) \{.*?\}\n'
new_celebrate = """function celebrate() {
    if (gameState === 'PUNISHED' || gameState === 'CELEBRATING') return;
    gameState = 'CELEBRATING';
    playClapSound();
    speakWord(window.currentCorrectAnswer.toString(), 'th-TH');
    gameContainer.classList.add('success-active');
    score += 10;
    scoreElement.innerText = score;
    setTimeout(() => {
        gameContainer.classList.remove('success-active');
        generateQuestion();
    }, 1000);
}
"""
content = re.sub(celebrate_regex, new_celebrate, content, flags=re.DOTALL)

# Update ans.emoji to ans.text in onResults
content = content.replace('canvasCtx.fillText(ans.emoji, flippedX, textY);', 'canvasCtx.fillText(ans.text, flippedX, textY);')

with open('game6-logic.js', 'w', encoding='utf-8') as f:
    f.write(content)
