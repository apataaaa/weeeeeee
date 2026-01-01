import { Scene } from './Scene.js';
import { ResourceManager } from './ResourceManager.js';
import { UIManager } from './UIManager.js';
import * as THREE from 'three';

class Game {
    constructor() {
        console.log('Game Constructor');
        this.scene = new Scene('game-container');
        this.ui = new UIManager();
        this.resources = new ResourceManager();

        this.state = 'LOADING';
        this.inventory = [];
        this.collectedIds = new Set();
        this.assetsLoaded = false;

        this.init();
    }

    init() {
        console.log('Game Init');

        // 1. Bind UI Immediately so user can click START
        this.ui.bindStartScreen(() => this.startIntro());
        this.scene.setObjectClickHandler((data) => this.handleInteraction(data));

        // 2. Load Assets in Background with timeout check
        this.loadAssets().then(() => {
            console.log("Assets loaded fully");
            this.assetsLoaded = true;
            const debugEl = document.getElementById('debug-layer');
            if (debugEl) debugEl.innerHTML = '<div style="color:green;">Assets Ready</div>';
            setTimeout(() => { if (debugEl) debugEl.innerHTML = ''; }, 2000);
        }).catch(err => {
            console.error("Asset load failed", err);
            const debugEl = document.getElementById('debug-layer');
            if (debugEl) debugEl.innerHTML += `<div style="color:red; background:white;">LOAD FAILED: ${err.message}</div>`;
        });

        // 3. Start Loop
        this.scene.update();
        this.state = 'MENU';
    }

    async loadAssets() {
        console.log("Starting resource load...");
        await this.resources.load();

        const room = this.resources.assets.models['room'];
        if (room) {
            // User requested another 0.5x (from 10 -> 5).
            room.scale.set(5, 5, 5);

            this.scene.addObject(room, new THREE.Vector3(0, 0, 0), { x: 0, y: 0, z: 0 }, {
                id: 'room',
                name: 'Room',
                type: 'scenery'
            });
        }

        const player = this.resources.assets.models['player'];
        if (player) {
            // Keep Scale 1.0 (Correct).
            player.scale.set(1.0, 1.0, 1.0);

            // Pivot guessing: Y=88 was "Floating half a head".
            // Lowering to 75 to touch floor.
            this.scene.addObject(player, new THREE.Vector3(0, 75, 0), { x: 0, y: 0, z: 0 }, {
                id: 'player',
                name: 'Protagonist',
                type: 'player'
            });
            this.scene.setPlayer(player);
        }

        const clipboard = this.resources.assets.models['clipboard'];
        if (clipboard) {
            // Scale 50 confirmed good.
            clipboard.scale.set(50, 50, 50);

            // Place on floor (Y=30 to ensure visibility above floor)
            // Dispersing items further apart (X +/- 100)
            this.scene.addObject(clipboard, new THREE.Vector3(-100, 30, -80), { x: 0, y: Math.PI / 4, z: 0 }, {
                id: 'student_file',
                name: '主角的學生檔案',
                type: 'collectible'
            });
        }

        const photoframe = this.resources.assets.models['photoframe'];
        if (photoframe) {
            photoframe.scale.set(50, 50, 50);
            // Place on floor (Y=30)
            this.scene.addObject(photoframe, new THREE.Vector3(100, 30, -80), { x: -Math.PI / 6, y: -Math.PI / 4, z: 0 }, {
                id: 'photo_frame',
                name: '與父母合照的相框',
                type: 'collectible'
            });
        }
    }

    startIntro() {
        console.log("Starting Intro Sequence");
        this.state = 'INTRO';
        this.ui.playIntro(() => {
            console.log("Intro finished, checking assets...");
            // Wait for assets if not ready
            if (this.assetsLoaded) {
                this.state = 'PLAYING';
            } else {
                console.log("Waiting for assets...");
                const check = setInterval(() => {
                    if (this.assetsLoaded) {
                        clearInterval(check);
                        this.state = 'PLAYING';
                    }
                }, 100);
            }
        });
    }

    handleInteraction(data) {
        if (this.state !== 'PLAYING') return;
        if (!data) return;

        if (data.type === 'collectible') {
            this.collectItem(data.id);
        }
    }

    collectItem(id) {
        if (this.collectedIds.has(id)) return;

        let itemData = null;

        if (id === 'student_file') {
            itemData = {
                id: 'student_file',
                name: '主角的學生檔案',
                icon: './assets/models/snapshot_clipboard.png',
                desc: `姓名: 光\n性別: 男\n生日: 2034年9月21日\n學號: R314\n年級: 高二\n社團: 攝影社`,
                onInspect: () => {
                    this.ui.showItemDescription('主角的學生檔案', itemData.desc);
                }
            };
            const obj = this.resources.assets.models['clipboard'];
            if (obj) this.scene.removeObject(obj);
        }
        else if (id === 'photo_frame') {
            itemData = {
                id: 'photo_frame',
                name: '與父母合照的相框',
                icon: './assets/models/snapshot_frame.png',
                desc: `那天天氣晴朗，天空沒有雲。\n陽光直直地照在草地上，\n幾乎沒有影子。\n那天的光，\n沒有留下任何可疑的地方。`,
                desc2: `再看一次照片，\n光線過於乾淨，\n影子短得不像是午後。\n父母站得很近，\n影子卻沒有彼此重疊。`,
                viewCount: 0,
                onInspect: () => {
                    itemData.viewCount++;
                    const text = (itemData.viewCount > 1) ? itemData.desc2 : itemData.desc;
                    this.ui.showItemDescription('與父母合照的相框', text); // Fixed logic to use text variable
                }
            };
            const obj = this.resources.assets.models['photoframe'];
            if (obj) this.scene.removeObject(obj);
        }

        if (itemData) {
            this.ui.showItemDescription(itemData.name, itemData.desc);
            this.inventory.push(itemData);
            this.collectedIds.add(itemData.id);
            this.ui.updateInventory(this.inventory);

            if (this.collectedIds.size === 2) {
                setTimeout(() => this.triggerEndChoice(), 2000);
            }
        }
    }

    triggerEndChoice() {
        this.state = 'DIALOG';
        this.ui.showPopup("已完成該場景探索，是否前往下一個場景?", [
            {
                text: "是",
                action: () => {
                    this.ui.showPopup("下個場景請靜待更新解鎖", [
                        { text: "結束體驗", action: () => location.reload() }
                    ]);
                }
            },
            {
                text: "否",
                action: () => {
                    this.ui.hidePopup();
                    this.state = 'PLAYING';
                    setTimeout(() => {
                        this.ui.showPopup("下個場景請靜待更新解鎖", [
                            { text: "結束體驗", action: () => location.reload() }
                        ]);
                    }, 60000);
                }
            }
        ]);
    }
}

new Game();
