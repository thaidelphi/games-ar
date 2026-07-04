AFRAME.registerComponent('character-controller', {
    schema: {
        speed: { type: 'number', default: 0.03 }, // Movement speed scalar
        idleAnimation: { type: 'string', default: 'Survey' }, // Name of idle animation in Fox model
        walkAnimation: { type: 'string', default: 'Walk' }    // Name of walk animation in Fox model
    },

    init: function () {
        this.camera = document.querySelector('a-camera');
        this.isWalking = false;
        
        // Set initial idle animation
        this.el.setAttribute('animation-mixer', { clip: this.data.idleAnimation });
    },

    tick: function (time, timeDelta) {
        // Ensure joystick data is available
        if (!window.joystickData) return;

        const data = window.joystickData;
        const el = this.el; // The 3D model entity

        if (data.isActive) {
            // If starting to move, switch to walk animation
            if (!this.isWalking) {
                // crossFadeDuration smoothly blends between animations (requires aframe-extras 7+)
                el.setAttribute('animation-mixer', { clip: this.data.walkAnimation, crossFadeDuration: 0.2 });
                this.isWalking = true;
            }

            // Calculate movement vector relative to camera's orientation
            // We want pushing "up" on joystick to move the character forward relative to the camera's view
            
            // Get camera Y rotation in radians
            const camRot = this.camera.object3D.rotation.y;
            
            // Convert joystick coordinates to 3D world coordinates
            // Joystick up (moveY = 1) -> negative Z axis (forward in A-Frame)
            // Joystick right (moveX = 1) -> positive X axis (right in A-Frame)
            const localX = data.moveX;
            const localZ = -data.moveY;

            // Rotate the 2D movement vector by the camera's Y rotation
            const moveX = localX * Math.cos(camRot) + localZ * Math.sin(camRot);
            const moveZ = -localX * Math.sin(camRot) + localZ * Math.cos(camRot);

            // Apply speed and timeDelta for consistent frame-rate independent movement
            const deltaMoveX = moveX * this.data.speed * (timeDelta / 16);
            const deltaMoveZ = moveZ * this.data.speed * (timeDelta / 16);

            // Update character position
            el.object3D.position.x += deltaMoveX;
            el.object3D.position.z += deltaMoveZ;

            // Rotate character to face the direction it is moving
            // Math.atan2(x, z) gives the angle in the XZ plane
            const targetRotation = Math.atan2(moveX, moveZ);
            el.object3D.rotation.y = targetRotation;
            
        } else {
            // If stopped moving, switch back to idle animation
            if (this.isWalking) {
                el.setAttribute('animation-mixer', { clip: this.data.idleAnimation, crossFadeDuration: 0.2 });
                this.isWalking = false;
            }
        }
    }
});
