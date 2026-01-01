import * as THREE from 'three';

export class Scene {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Init
        // Init
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.0002);

        this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 1, 5000);
        this.camera.position.set(0, 200, 400);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Lights
        // Brighter Ambient
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
        this.scene.add(ambientLight);

        // Add Hemisphere Light for better overall visibility
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
        hemiLight.position.set(0, 5000, 0);
        this.scene.add(hemiLight);

        // Main Point Light (Sun/Bulb) - Increased range for huge room
        const pointLight = new THREE.PointLight(0xffaa00, 2.0, 10000); // Range 10000
        pointLight.position.set(0, 500, 0);
        pointLight.castShadow = true;
        this.scene.add(pointLight);

        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.interactableObjects = [];

        // Input State
        this.moveState = { w: false, a: false, s: false, d: false };
        this.dragState = {
            isDragging: false,
            isDown: false,
            lastX: 0,
            lastY: 0,
            yaw: 0,
            pitch: 0
        };

        // DOM Events
        window.addEventListener('resize', this.onResize.bind(this));

        // Touch/Mouse Drag Events
        window.addEventListener('mousedown', (e) => this.onPointerDown(e));
        window.addEventListener('mousemove', (e) => this.onPointerMove(e));
        window.addEventListener('mouseup', (e) => this.onPointerUp(e));

        // Keyboard
        window.addEventListener('keydown', (e) => this.onKey(e, true));
        window.addEventListener('keyup', (e) => this.onKey(e, false));
    }

    onPointerDown(e) {
        this.dragState.isDown = true;
        this.dragState.isDragging = false;
        this.dragState.lastX = e.clientX;
        this.dragState.lastY = e.clientY;
    }

    onPointerMove(e) {
        if (!this.dragState.isDown) return;

        const deltaX = e.clientX - this.dragState.lastX;
        const deltaY = e.clientY - this.dragState.lastY;

        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
            this.dragState.isDragging = true;
        }

        const sensitivity = 0.002;
        this.dragState.yaw -= deltaX * sensitivity;
        this.dragState.pitch -= deltaY * sensitivity;

        // Clamp Pitch
        this.dragState.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.dragState.pitch));

        this.camera.rotation.order = "YXZ";
        // Only set rotation for "Free Fly". In TPP, lookAt overrides this usually, 
        // but we use these values to calculating camera OFFSET.

        this.dragState.lastX = e.clientX;
        this.dragState.lastY = e.clientY;
    }

    onPointerUp(e) {
        this.dragState.isDown = false;
        if (!this.dragState.isDragging) {
            this.onClick(e);
        }
    }

    addMap() { }

    addObject(obj, position, rotation, userData) {
        obj.position.copy(position);
        if (rotation) obj.rotation.set(rotation.x, rotation.y, rotation.z);
        obj.userData = userData;
        this.scene.add(obj);
        obj.traverse((child) => {
            if (child.isMesh) {
                child.userData = userData;
                this.interactableObjects.push(child);
            }
        });
    }

    removeObject(obj) {
        this.scene.remove(obj);
        this.interactableObjects = [];
        this.scene.traverse(child => {
            if (child.isMesh && child.userData && child.userData.id) {
                this.interactableObjects.push(child);
            }
        });
    }

    onResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
    }

    onKey(e, isDown) {
        const key = e.key.toLowerCase();
        if (this.moveState.hasOwnProperty(key)) {
            this.moveState[key] = isDown;
        }
    }

    onClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactableObjects);

        if (intersects.length > 0) {
            let target = intersects[0].object;
            while (target) {
                if (target.userData && target.userData.id) {
                    if (this.onObjectClick) this.onObjectClick(target.userData);
                    return;
                }
                target = target.parent;
            }
        }
    }

    setPlayer(player) {
        this.player = player;
        this.player.rotation.order = "YXZ";
    }

    update() {
        if (!this.player) {
            // Free Fly Fallback
            this.camera.lookAt(0, 0, 0); // Ensure we look at the room center if player missing
            this.renderer.render(this.scene, this.camera);
            requestAnimationFrame(this.update.bind(this));
            return;
        }

        const speed = 8.0; // Faster movement
        const yaw = this.dragState.yaw;
        const pitch = this.dragState.pitch;

        // Direction vectors based on CAMERA yaw (so W is always "forward" from camera pov)
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

        // Update Player Position
        // Room Scale 5.
        // User requested larger movement range. Expanded to 200.
        const boundX = 200;
        const boundZ = 200;

        if (this.moveState.w) this.player.position.add(forward.multiplyScalar(speed));
        if (this.moveState.s) this.player.position.add(forward.multiplyScalar(-speed));
        if (this.moveState.a) this.player.position.add(right.multiplyScalar(-speed));
        if (this.moveState.d) this.player.position.add(right.multiplyScalar(speed));

        // Clamp Position
        this.player.position.x = Math.max(-boundX, Math.min(boundX, this.player.position.x));
        this.player.position.z = Math.max(-boundZ, Math.min(boundZ, this.player.position.z));

        // Player Rotation
        this.player.rotation.y = yaw + Math.PI;

        // Camera Follow Logic (Standard TPP for 176cm human)
        const dist = 130;
        const height = 160; // Eye level / slightly above

        // Offset from Player
        const offset = new THREE.Vector3(0, 0, dist);
        offset.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

        const targetPos = this.player.position.clone().add(new THREE.Vector3(0, height, 0)).add(offset);
        this.camera.position.copy(targetPos);

        // Look at player head
        this.camera.lookAt(this.player.position.clone().add(new THREE.Vector3(0, 150, 0)));

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.update.bind(this));
    }

    setObjectClickHandler(callback) {
        this.onObjectClick = callback;
    }
}
