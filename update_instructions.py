import os
import re

target_code = """const startOverlay = document.getElementById('start-overlay');
if (startOverlay) {
    startOverlay.addEventListener('click', () => {
        try {
            if (typeof responsiveVoice !== 'undefined') {
                responsiveVoice.speak(" ", "Thai Female");
            }
        } catch(e) { console.error(e); }
        startOverlay.style.display = 'none';
    });
}"""

replacement = """const startOverlay = document.getElementById('start-overlay');
if (startOverlay) {
    startOverlay.addEventListener('click', () => {
        try {
            if (typeof responsiveVoice !== 'undefined') {
                responsiveVoice.speak(" ", "Thai Female");
            }
        } catch(e) { console.error(e); }
        startOverlay.style.display = 'none';
        
        // ซ่อนคำอธิบายหลังจาก 8 วินาที นับจากที่กดเริ่มเกม
        setTimeout(() => {
            const instructions = document.getElementById('instructions');
            if (instructions) {
                instructions.style.transition = "opacity 1s ease";
                instructions.style.opacity = "0";
                setTimeout(() => instructions.style.display = 'none', 1000);
            }
        }, 8000);
    });
}"""

files = ['game2-logic.js', 'game3-logic.js', 'game4-logic.js', 'game5-logic.js', 'game6-logic.js']

for f in files:
    filepath = os.path.join(r"z:\ar", f)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as file:
            content = file.read()
        
        if target_code in content:
            new_content = content.replace(target_code, replacement)
            with open(filepath, "w", encoding="utf-8") as file:
                file.write(new_content)
            print(f"Updated {f}")
        else:
            print(f"Could not find target code in {f}")
    else:
        print(f"File {f} not found")

print("Done")
