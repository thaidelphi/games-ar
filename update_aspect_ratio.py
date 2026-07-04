import os

files = [
    'game1-logic.js',
    'game2-logic.js',
    'game3-logic.js',
    'game4-logic.js',
    'game5-logic.js',
    'game6-logic.js',
    'game7-logic.js'
]

sync_code = """
    if (videoElement.videoWidth && videoElement.videoHeight) {
        if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
        }
    }
"""

for f in files:
    filepath = os.path.join(r"z:\ar", f)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as file:
            content = file.read()
        
        # Check if already added
        if "canvasElement.width = videoElement.videoWidth;" in content:
            print(f"Already updated {f}")
            continue

        # Find the start of onResults function
        search_str = "function onResults(results) {\n"
        if search_str in content:
            new_content = content.replace(search_str, search_str + sync_code)
            with open(filepath, "w", encoding="utf-8") as file:
                file.write(new_content)
            print(f"Updated {f}")
        else:
            # Maybe it is defined differently e.g. function onResults (results)
            search_str2 = "function onResults(results) {"
            if search_str2 in content:
                new_content = content.replace(search_str2, search_str2 + "\n" + sync_code)
                with open(filepath, "w", encoding="utf-8") as file:
                    file.write(new_content)
                print(f"Updated {f}")
            else:
                print(f"Could not find onResults in {f}")
    else:
        print(f"File {f} not found")

print("Done")
