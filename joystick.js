document.addEventListener('DOMContentLoaded', () => {
    const joystickZone = document.getElementById('joystick-zone');

    // Create the Nipple.js joystick
    const manager = nipplejs.create({
        zone: joystickZone,
        mode: 'static',
        position: { left: '75px', bottom: '75px' },
        color: 'white',
        size: 120
    });

    // Global object to store joystick data, accessed by character-controller.js
    window.joystickData = {
        moveX: 0,
        moveY: 0,
        isActive: false
    };

    // Listen to move event
    manager.on('move', (event, data) => {
        window.joystickData.isActive = true;
        
        // NippleJS provides a unit vector where:
        // x goes from -1 (left) to 1 (right)
        // y goes from -1 (down) to 1 (up)
        window.joystickData.moveX = data.vector.x;
        window.joystickData.moveY = data.vector.y;
    });

    // Listen to end event
    manager.on('end', () => {
        window.joystickData.isActive = false;
        window.joystickData.moveX = 0;
        window.joystickData.moveY = 0;
    });
});
