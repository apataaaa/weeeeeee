import gsap from 'gsap';

export class UIManager {
    constructor() {
        this.els = {
            startScreen: document.getElementById('start-screen'),
            startBtn: document.getElementById('start-btn'),
            introOverlay: document.getElementById('intro-overlay'),
            subtitleContainer: document.getElementById('subtitle-container'),
            hud: document.getElementById('hud'),
            inventoryBar: document.getElementById('inventory-bar'),
            itemDescPanel: document.getElementById('item-description-panel'),
            itemTitle: document.getElementById('item-title'),
            itemDesc: document.getElementById('item-desc'),
            popupOverlay: document.getElementById('popup-overlay'),
            popupMessage: document.getElementById('popup-message'),
            popupButtons: document.getElementById('popup-buttons')
        };
        console.log('UIManager Initialized', this.els);

        // Prevent animation jumps when main thread is blocked by FBXLoader
        gsap.ticker.lagSmoothing(0);
    }

    bindStartScreen(callback) {
        if (this.els.startScreen) {
            console.log('Binding Start Screen Click');
            this.els.startScreen.addEventListener('click', () => {
                console.log('Start Screen Clicked');
                this.hide(this.els.startScreen);
                callback();
            });
        } else {
            console.error('Start Screen not found!');
        }
    }

    playIntro(onComplete) {
        console.log('Playing Intro');
        this.show(this.els.introOverlay);
        this.els.subtitleContainer.innerHTML = '';

        const lines = [
            "有些人死去時，世界會改變。",
            "有些人「還活著」，但世界已經不再承認他們是原本的那個人。",
            "光會投下影子；影子會模仿形體。",
            "當影子開始學會生活，",
            "我們該如何確認，站在餐桌另一側的，",
            "仍然是我們所愛之人？"
        ];

        const tl = gsap.timeline({
            onComplete: () => {
                console.log('Intro Complete');
                gsap.to(this.els.introOverlay, {
                    opacity: 0,
                    duration: 0.5,
                    onComplete: () => {
                        this.hide(this.els.introOverlay);
                        this.show(this.els.hud);
                        onComplete();
                    }
                });
            }
        });

        lines.forEach((line) => {
            const p = document.createElement('p');
            p.textContent = line;
            p.style.opacity = 0;
            this.els.subtitleContainer.appendChild(p);

            // Exact 1.5s total duration per line
            tl.to(p, { opacity: 1, duration: 0.25, ease: "power2.out" })
                .to(p, { opacity: 1, duration: 1.0 }) // read time
                .to(p, { opacity: 0, duration: 0.25, ease: "power2.in" });
        });
    }

    updateInventory(inventoryItems) {
        const slots = this.els.inventoryBar.querySelectorAll('.inv-slot');
        slots.forEach(s => s.innerHTML = '');

        inventoryItems.forEach((item, index) => {
            if (index < slots.length) {
                const img = document.createElement('img');
                img.src = item.icon || 'https://placehold.co/64x64?text=Item';
                img.alt = item.name;
                slots[index].appendChild(img);

                slots[index].onclick = (e) => {
                    e.stopPropagation();
                    item.onInspect();
                };
            }
        });
    }

    showItemDescription(title, description) {
        this.els.itemTitle.textContent = title;
        this.els.itemDesc.textContent = description;
        this.show(this.els.itemDescPanel);
    }

    hideItemDescription() {
        this.hide(this.els.itemDescPanel);
    }

    showPopup(message, buttons) {
        this.els.popupMessage.textContent = message;
        this.els.popupButtons.innerHTML = '';

        buttons.forEach(btnConfig => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.style.margin = '0 10px';
            btn.style.fontSize = '1rem';
            btn.textContent = btnConfig.text;
            btn.onclick = btnConfig.action;
            this.els.popupButtons.appendChild(btn);
        });

        this.show(this.els.popupOverlay);
    }

    hidePopup() {
        this.hide(this.els.popupOverlay);
    }

    show(el) {
        if (!el) return;
        el.classList.remove('hidden');
        gsap.to(el, { opacity: 1, duration: 0.2 });
    }

    hide(el) {
        if (!el) return;
        gsap.to(el, {
            opacity: 0,
            duration: 0.1,
            onComplete: () => el.classList.add('hidden')
        });
    }
}
