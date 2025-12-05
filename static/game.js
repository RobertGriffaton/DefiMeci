window.onload = function() {
    console.log("Démarrage du jeu avec le Chevalier...");

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Canvas introuvable !");
        return;
    }
    const ctx = canvas.getContext('2d');

    // --- 1. CONFIGURATION & VARIABLES ---
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    
    const player = { x: canvas.width / 2, y: canvas.height / 2, size: 100, speed: 5, color: '#2ecc71' };
    
    const keysPressed = {};
    let currentWorld = 'hub';
    
    // UI Elements
    const ui = {
        user: document.getElementById('vis-username'),
        pass: document.getElementById('vis-password'),
        realUser: document.getElementById('real-username'),
        realPass: document.getElementById('real-password')
    };
    let activeField = 'username';

    // --- 2. CHARGEMENT DES TEXTURES ---
    const textures = {
        player: new Image(), 
        key: new Image(),
        door_abc: new Image(),
        door_ABC: new Image(),
        door_123: new Image(),
        door_special: new Image(),
        door_exit: new Image(),
        door_login: new Image()
    };

    // url des images
    textures.player.src = '/static/images/knight.png'; 
    textures.key.src = '/static/images/case.png';
    textures.door_abc.src = '/static/images/door_uncap.png';
    textures.door_ABC.src = '/static/images/door_cap.png';
    textures.door_123.src = '/static/images/door_123.png';
    textures.door_special.src = '/static/images/door_special.png';
    textures.door_exit.src = '/static/images/door_exit.png';
    textures.door_login.src = '/static/images/door_login.png';

    // --- 3. FONCTIONS UTILITAIRES---
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function getDistance(p, obj) {
        return Math.sqrt( ((p.x + p.size/2)-(obj.x + obj.size/2))**2 + ((p.y + p.size/2)-(obj.y + obj.size/2))**2 );
    }

    function isOverlapping(x, y, size, existingObjects) {
        const margin = 10; 
        for (let obj of existingObjects) {
            const dist = Math.sqrt( ((x)-(obj.x))**2 + ((y)-(obj.y))**2 );
            if (dist < (size + margin)) return true;
        }
        return false; 
    }

    // --- CRÉATION DES MONDES ---
    function createScatteredWorld(chars, thisWorld) {
        let objects = [];
        const minX = canvas.width / 2;       
        const maxX = canvas.width - 60;      
        const minY = 80;                     
        const maxY = canvas.height - 150;    

        // Placement des touches
        chars.forEach(char => {
            let placed = false;
            let attempts = 0;
            let size = 45; 

            while (!placed && attempts < 100) {
                let randomX = getRandomInt(minX, maxX);
                let randomY = getRandomInt(minY, maxY);

                if (!isOverlapping(randomX, randomY, size, objects)) {
                    objects.push({ type: 'key', val: char, x: randomX, y: randomY, size: size, color: '#ecf0f1' });
                    placed = true;
                }
                attempts++;
            }
        });

        // Touche BACK
        objects.push({ type: 'key', val: 'BACK', label: '⌫', x: canvas.width - 70, y: 30, size: 50, color: '#c0392b' });

        // Barre de navigation
        const doorSize = 120;
        const doorY = canvas.height - 130; 
        const gapDoor = 130;
        const startDoorX = canvas.width - (4 * gapDoor) - 50;
        const slots = [
            { id: 'lowercase', label: ' ' }, { id: 'uppercase', label: ' ' },
            { id: 'numbers',   label: ' ' }, { id: 'special',   label: ' ' }
        ];

        slots.forEach((slot, index) => {
            let posX = startDoorX + (index * gapDoor);
            let target = slot.id;
            let label = slot.label;
            let color = '#e67e22';

            if (target === thisWorld) {
                target = 'hub';
                label = ' ';
                color = '#e74c3c';
            }
            objects.push({ type: 'door', target: target, label: label, x: posX, y: doorY, size: doorSize, color: color });
        });

        return objects;
    }

    // Initialisation des mondes
    const worlds = {
        'hub': [
            { type: 'key', val: 'BACK', label: '⌫', x: canvas.width - 70, y: 30, size: 50, color: '#c0392b' },
            { type: 'door', target: 'lowercase', label: ' ', x: canvas.width/2 - 200, y: 150, size: 120, color: '#e67e22' },
            { type: 'door', target: 'uppercase', label: ' ', x: canvas.width/2 - 50, y: 150, size: 120, color: '#e67e22' },
            { type: 'door', target: 'numbers',   label: ' ', x: canvas.width/2 -50, y: 350, size: 120, color: '#e67e22' },
            { type: 'door', target: 'special',   label: ' ', x: canvas.width/2 - 200, y: 350, size: 120, color: '#e67e22' },
            { type: 'submit', label: 'LOGIN', x: canvas.width/1.35 - 50, y: canvas.height - 500, size: 250, color: '#3498db' }
        ],
        'lowercase': createScatteredWorld("azertyuiopqsdfghjklmwxcvbn".split(''), 'lowercase'),
        'uppercase': createScatteredWorld("AZERTYUIOPQSDFGHJKLMWXCVBN".split(''), 'uppercase'),
        'numbers':   createScatteredWorld("1234567890".split(''), 'numbers'),
        'special':   createScatteredWorld("&é'(-è_çà)=~#{[|`\\^@]}".split(''), 'special')
    };

    // --- 5. GESTION DES ENTRÉES ---
    window.addEventListener('keydown', e => {
        let key = e.key;
        if (key.length === 1) key = key.toLowerCase(); 
        keysPressed[key] = true;

        if (key === 'f') checkInteraction();
        if (key === 'k') { e.preventDefault(); switchField(); }
        if (key === 'backspace') typeChar('BACK');
    });

    window.addEventListener('keyup', e => {
        let key = e.key;
        if (key.length === 1) key = key.toLowerCase();
        keysPressed[key] = false;
    });

    // --- 6. LOGIQUE DU JEU ---
    function update() {
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

    function checkInteraction() {
        const objects = worlds[currentWorld];
        let target = null;
        objects.forEach(obj => {
            if (getDistance(player, obj) < 50) target = obj;
        });

        if (target) {
            if (target.type === 'door') {
                currentWorld = target.target;
                player.x = canvas.width / 2;
                player.y = canvas.height / 2;
            } else if (target.type === 'key') {
                typeChar(target.val);
                target.isActive = true; 
                setTimeout(() => target.isActive = false, 150);
            } else if (target.type === 'submit') {
                const form = document.getElementById('hidden-form');
                if(form) form.submit();
            }
        }
    }

    function switchField() {
        if(ui.user) ui.user.classList.remove('active');
        if(ui.pass) ui.pass.classList.remove('active');
        activeField = (activeField === 'username') ? 'password' : 'username';
        if (activeField === 'username' && ui.user) ui.user.classList.add('active');
        else if (ui.pass) ui.pass.classList.add('active');
    }

    function typeChar(char) {
        const visInput = (activeField === 'username') ? ui.user : ui.pass;
        const realInput = document.getElementById(activeField === 'username' ? 'real-username' : 'real-password');

        if (!visInput || !realInput) return;

        if (char === 'BACK') {
            visInput.value = visInput.value.slice(0, -1);
            realInput.value = realInput.value.slice(0, -1);
        } else {
            visInput.value += char;
            realInput.value += char;
        }
    }

    // --- 7. DESSIN ---
    function draw() {
        // Effacer l'écran
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const objects = worlds[currentWorld];
        if (objects) {
            objects.forEach(obj => {
                let imgToDraw = null;

                // Choix de l'image
                if (obj.type === 'key') {
                    imgToDraw = textures.key;
                } else if (obj.type === 'door') {
                    if (obj.target === 'lowercase') imgToDraw = textures.door_abc;
                    else if (obj.target === 'uppercase') imgToDraw = textures.door_ABC;
                    else if (obj.target === 'numbers') imgToDraw = textures.door_123;
                    else if (obj.target === 'special') imgToDraw = textures.door_special;
                    else imgToDraw = textures.door_exit;
                } else if (obj.type === 'submit') {
                    imgToDraw = textures.door_login;
                }

                // Dessin Objets
                if (imgToDraw && imgToDraw.complete && imgToDraw.naturalHeight !== 0) {
                    ctx.drawImage(imgToDraw, obj.x, obj.y, obj.size, obj.size);
                    if (obj.isActive) {
                         ctx.fillStyle = 'rgba(46, 204, 113, 0.5)';
                         ctx.fillRect(obj.x, obj.y, obj.size, obj.size);
                    }
                } else {
                    ctx.fillStyle = obj.color || 'white';
                    ctx.fillRect(obj.x, obj.y, obj.size, obj.size);
                }

                // Texte (Label) - Sauf pour Login et portes vides
                if (obj.type !== 'submit' && obj.label !== ' ') {
                    ctx.fillStyle = 'white';
                    ctx.shadowColor = "black";
                    ctx.shadowBlur = 4;
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(obj.label || obj.val, obj.x + obj.size/2, obj.y + obj.size/2 + 6);
                    ctx.shadowBlur = 0;
                }

                // Cadre Interaction
                if (getDistance(player, obj) < 50) {
                    ctx.strokeStyle = 'yellow';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(obj.x - 5, obj.y - 5, obj.size + 10, obj.size + 10);
                    ctx.fillStyle = 'yellow';
                    ctx.fillText("[F]", obj.x + obj.size/2, obj.y - 10);
                }
            });
        }

        // --- DESSIN JOUEUR  ---
        if (textures.player.complete && textures.player.naturalHeight !== 0) {
            ctx.drawImage(textures.player, player.x, player.y, player.size, player.size);
        } else {
            // Fallback si l'image n'est pas encore chargée (carré vert)
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y, player.size, player.size);
        }
        
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText("Moi", player.x + player.size/2, player.y - 5);

        requestAnimationFrame(loop);
    }

    function loop() {
        update();
        draw();
    }

    // Lancement
    loop();
};