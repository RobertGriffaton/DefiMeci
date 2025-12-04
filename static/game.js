// static/game.js

window.onload = function() {
    console.log("✅ Le jeu est chargé et prêt !");

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("❌ Impossible de trouver le canvas !");
        return;
    }
    const ctx = canvas.getContext('2d');

    // --- 1. CONFIGURATION ---
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Position de départ
    const player = { x: canvas.width / 2, y: canvas.height / 2, size: 20, speed: 5, color: '#2ecc71' };
    
    // On stocke les touches pressées
    const keysPressed = {};
    
    let currentWorld = 'hub';
    let activeField = 'username';

    const ui = {
        user: document.getElementById('vis-username'),
        pass: document.getElementById('vis-password'),
        realUser: document.getElementById('real-username'),
        realPass: document.getElementById('real-password')
    };

    // --- 2. DONNÉES DES MONDES ---
    function createGrid(chars, startX, startY) {
        let objects = [];
        let x = startX;
        let y = startY;
        chars.forEach((char, index) => {
            objects.push({ type: 'key', val: char, x: x, y: y, size: 40, color: '#ecf0f1' });
            x += 60;
            if ((index + 1) % 10 === 0) { 
                x = startX;
                y += 60;
            }
        });
        objects.push({ type: 'door', target: 'hub', label: 'SORTIE', x: 50, y: 50, size: 60, color: '#e74c3c' });
        return objects;
    }

    const worlds = {
        'hub': [
            { type: 'door', target: 'lowercase', label: 'abc', x: canvas.width/2 - 200, y: 100, size: 80, color: '#e67e22' },
            { type: 'door', target: 'uppercase', label: 'ABC', x: canvas.width/2 + 120, y: 100, size: 80, color: '#e67e22' },
            { type: 'door', target: 'numbers', label: '123', x: canvas.width/2 - 200, y: 400, size: 80, color: '#e67e22' },
            { type: 'door', target: 'special', label: '@#&', x: canvas.width/2 + 120, y: 400, size: 80, color: '#e67e22' },
            { type: 'submit', label: 'LOGIN', x: canvas.width/2 - 50, y: canvas.height - 100, size: 100, color: '#3498db' }
        ],
        'lowercase': createGrid("azertyuiopqsdfghjklmwxcvbn".split(''), 100, 150),
        'uppercase': createGrid("AZERTYUIOPQSDFGHJKLMWXCVBN".split(''), 100, 150),
        'numbers': createGrid("1234567890".split(''), 100, 150),
        'special': createGrid("&é'(-è_çà)=~#{[|`\\^@]}".split(''), 100, 150)
    };

    // --- 3. GESTION DES TOUCHES (CORRIGÉE) ---
    window.addEventListener('keydown', e => {
        // On convertit la touche en minuscule pour éviter les problèmes Maj/Min
        // ex: 'Z' devient 'z', 'ArrowUp' reste 'ArrowUp'
        let key = e.key;
        if (key.length === 1) key = key.toLowerCase(); 

        console.log("Touche enfoncée :", key); // <--- REGARDEZ LA CONSOLE (F12)
        keysPressed[key] = true;

        if (key === 'f') checkInteraction();
        if (key === 'tab') { e.preventDefault(); switchField(); }
        if (key === 'backspace') typeChar('BACK');
    });

    window.addEventListener('keyup', e => {
        let key = e.key;
        if (key.length === 1) key = key.toLowerCase();
        keysPressed[key] = false;
    });

    // --- 4. LOGIQUE DU JEU ---
    function update() {
        // Déplacement (On vérifie minuscules et ArrowKeys)
        if (keysPressed['arrowup'] || keysPressed['z']) player.y -= player.speed;
        if (keysPressed['arrowdown'] || keysPressed['s']) player.y += player.speed;
        if (keysPressed['arrowleft'] || keysPressed['q']) player.x -= player.speed;
        if (keysPressed['arrowright'] || keysPressed['d']) player.x += player.speed;

        // Limites
        if (player.x < 0) player.x = 0;
        if (player.y < 0) player.y = 0;
        if (player.x > canvas.width) player.x = canvas.width;
        if (player.y > canvas.height) player.y = canvas.height;
    }

    function draw() {
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Objets
        const objects = worlds[currentWorld];
        if(objects) {
            objects.forEach(obj => {
                ctx.fillStyle = obj.color;
                ctx.fillRect(obj.x, obj.y, obj.size, obj.size);
                
                ctx.fillStyle = 'white';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(obj.label || obj.val, obj.x + obj.size/2, obj.y + obj.size/2 + 6);

                // Interaction
                if (getDistance(player, obj) < 50) {
                    ctx.strokeStyle = 'yellow';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(obj.x - 5, obj.y - 5, obj.size + 10, obj.size + 10);
                    ctx.fillStyle = 'yellow';
                    ctx.fillText("[F]", obj.x + obj.size/2, obj.y - 10);
                }
            });
        }

        // Joueur
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.size, player.size);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText("Moi", player.x + 10, player.y - 5);

        requestAnimationFrame(loop);
    }

    function loop() {
        update();
        draw();
    }

    // --- 5. FONCTIONS UTILES ---
    function getDistance(p, obj) {
        return Math.sqrt( ((p.x + p.size/2)-(obj.x + obj.size/2))**2 + ((p.y + p.size/2)-(obj.y + obj.size/2))**2 );
    }

    function checkInteraction() {
        const objects = worlds[currentWorld];
        let target = null;
        objects.forEach(obj => {
            if (getDistance(player, obj) < 50) target = obj;
        });

        if (target) {
            console.log("Interaction avec :", target);
            if (target.type === 'door') {
                currentWorld = target.target;
                player.x = canvas.width / 2;
                player.y = canvas.height / 2;
            } else if (target.type === 'key') {
                typeChar(target.val);
                target.color = '#2ecc71';
                setTimeout(() => target.color = '#ecf0f1', 150);
            } else if (target.type === 'submit') {
                document.getElementById('hidden-form').submit();
            }
        }
    }

    function switchField() {
        ui.user.classList.remove('active');
        ui.pass.classList.remove('active');
        activeField = (activeField === 'username') ? 'password' : 'username';
        if (activeField === 'username') ui.user.classList.add('active');
        else ui.pass.classList.add('active');
    }

    function typeChar(char) {
        const visInput = (activeField === 'username') ? ui.user : ui.pass;
        const realInput = (activeField === 'username') ? ui.realUser : ui.realPass;
        if (char === 'BACK') {
            visInput.value = visInput.value.slice(0, -1);
            realInput.value = realInput.value.slice(0, -1);
        } else {
            visInput.value += char;
            realInput.value += char;
        }
    }

    // Démarrage
    loop();
};