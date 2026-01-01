import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export class ResourceManager {
    constructor() {
        this.manager = new THREE.LoadingManager();
        this.loader = new FBXLoader(this.manager);
        this.textureLoader = new THREE.TextureLoader(this.manager);

        this.assets = {
            models: {},
            textures: {}
        };
    }

    load() {
        return new Promise((resolve, reject) => {
            this.manager.onLoad = () => resolve(this.assets);
            this.manager.onProgress = (url, itemsLoaded, itemsTotal) => {
                const msg = `Loading: ${Math.round(itemsLoaded / itemsTotal * 100)}% (${url})`;
                console.log(msg);
                const debugEl = document.getElementById('debug-layer');
                if (debugEl) debugEl.innerHTML = `<div style="background:rgba(0,0,0,0.5);">${msg}</div>`;
            };
            this.manager.onError = (url) => {
                const msg = 'Error loading ' + url;
                console.error(msg);
                const debugEl = document.getElementById('debug-layer');
                if (debugEl) debugEl.innerHTML += `<div style="color:red; background:rgba(0,0,0,0.8);">${msg}</div>`;
            };

            // Load Models
            this.loadModel('clipboard', './assets/models/clipboard.fbx');
            this.loadModel('photoframe', './assets/models/photoframe.fbx');
            // User confirmed f7e7... is room (textures_b)
            this.loadModel('room', './assets/models/textures_b/base.fbx', './assets/models/textures_b/texture_diffuse.png');
            // Assuming textures_a (2abd...) is the character/protagonist
            this.loadModel('player', './assets/models/textures_a/base.fbx', './assets/models/textures_a/texture_diffuse.png');
        });
    }

    loadModel(name, path, texturePath = null) {
        this.loader.load(path, (object) => {
            let texture = null;
            if (texturePath) {
                texture = this.textureLoader.load(texturePath);
                texture.colorSpace = THREE.SRGBColorSpace;
                // texture.flipY = false; // often needed for FBX
            }

            // Normalization
            if (name !== 'room') {
                // Character likely needs scaling too if it's from same source
                // Try 1.0 for Room, 1.0 for Player (if same unit)
                // But previously we used 0.1 for props. 
                // If Room is 1:1, Player likely 1:1.
                if (name === 'player') object.scale.set(0.4, 0.4, 0.4);
                else object.scale.set(0.1, 0.1, 0.1);
            }

            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (name === 'room') {
                        child.castShadow = false;
                        child.receiveShadow = true; // Room receives
                    }

                    // Apply Texture
                    if (texture) {
                        // Keep original material props but swap map
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.map = texture);
                        } else {
                            child.material.map = texture;
                        }
                    }
                }
            });
            this.assets.models[name] = object;
        });
    }
}
