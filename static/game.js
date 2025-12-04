// static/game.js

window.onload = function() {
    console.log("✅ Le jeu est chargé et prêt !");

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("❌ Impossible de trouver le canvas !");
        return;
    }
    const ctx = canvas.getContext('2d');

    // --- 0. CHARGEMENT DE LA TEXTURE ---
    // On crée l'objet image pour la texture
    const keyTexture = new Image();
    // Assurez-vous que l'image est bien dans static/images/
    keyTexture.src = '/static/images/case.png'; 

    // --- 1. CONFIGURATION ---
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Position de départ
    const player = { x: canvas.width / 2, y: canvas.height / 2, size: 20, speed: 5, color: '#2ecc71' };
    
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

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function isOverlapping(x, y, size, existingObjects) {
        const margin = 10; 
        for (let obj of existingObjects) {
            const dist = Math.sqrt( ((x)-(obj.x))**2 + ((y)-(obj.y))**2 );
            if (dist < (size + margin)) {
                return true; 
            }
        }
        return false; 
    }

    function createScatteredWorld(chars, thisWorld) {
        let objects = [];
        const minX = canvas.width / 2;       
        const maxX = canvas.width - 60;      
        const minY = 80;                     
        const maxY = canvas.height - 150;    

        chars.forEach(char => {
            let placed = false;
            let attempts = 0;
            let size = 45; 

            while (!placed && attempts < 100) {
                let randomX = getRandomInt(minX, maxX);
                let randomY = getRandomInt(minY, maxY);

                if (!isOverlapping(randomX, randomY, size, objects)) {
                    // Note: On garde la propriété color pour l'effet de flash quand on clique
                    objects.push({ type: 'key', val: char, x: randomX, y: randomY, size: size, color: '#ecf0f1' });
                    placed = true;
                }
                attempts++;
            }
        });

        // Touche BACK
        objects.push({ 
            type: 'key', val: 'BACK', label: '⌫', 
            x: canvas.width - 70, y: 30, size: 50, color: '#c0392b' 
        });

        // Barre de navigation
        const doorSize = 50;
        const doorY = canvas.height - 80;
        const gapDoor = 70;
        const startDoorX = canvas.width - (4 * gapDoor) - 50;

        const slots = [
            { id: 'lowercase', label: 'abc' },
            { id: 'uppercase', label: 'ABC' },
            { id: 'numbers',   label: '123' },
            { id: 'special',   label: '@#&' }
        ];

        slots.forEach((slot, index) => {
            let posX = startDoorX + (index * gapDoor);
            let target = slot.id;
            let label = slot.label;
            let color = '#e67e22';

            if (target === thisWorld) {
                target = 'hub';
                label = 'SORTIE';
                color = '#e74c3c';
            }
            objects.push({ type: 'door', target: target, label: label, x: posX, y: doorY, size: doorSize, color: color });
        });

        return objects;
    }

    const worlds = {
        'hub': [
            { type: 'key', val: 'BACK', label: '⌫', x: canvas.width - 70, y: 30, size: 50, color: '#c0392b' },
            { type: 'door', target: 'lowercase', label: 'abc', x: canvas.width/2 - 200, y: 150, size: 80, color: '#e67e22' },
            { type: 'door', target: 'uppercase', label: 'ABC', x: canvas.width/2 - 50, y: 150, size: 80, color: '#e67e22' },
            { type: 'door', target: 'numbers',   label: '123', x: canvas.width/2 + 100, y: 150, size: 80, color: '#e67e22' },
            { type: 'door', target: 'special',   label: '@#&', x: canvas.width/2 - 50, y: 350, size: 80, color: '#e67e22' },
            { type: 'submit', label: 'LOGIN', x: canvas.width/2 - 50, y: canvas.height - 150, size: 100, color: '#3498db' }
        ],
        'lowercase': createScatteredWorld("azertyuiopqsdfghjklmwxcvbn".split(''), 'lowercase'),
        'uppercase': createScatteredWorld("AZERTYUIOPQSDFGHJKLMWXCVBN".split(''), 'uppercase'),
        'numbers':   createScatteredWorld("1234567890".split(''), 'numbers'),
        'special':   createScatteredWorld("&é'(-è_çà)=~#{[|`\\^@]}".split(''), 'special')
    };

    // --- 3. GESTION DES TOUCHES ---
    window.addEventListener('keydown', e => {
        let key = e.key;
        if (key.length === 1) key = key.toLowerCase(); 

        console.log("Touche enfoncée :", key);
        keysPressed[key] = true;

        if (key === 'f') checkInteraction();
        if (key === 'k' || key === 'tab') { e.preventDefault(); switchField(); }
        if (key === 'backspace') typeChar('BACK');
    });

    window.addEventListener('keyup', e => {
        let key = e.key;
        if (key.length === 1) key = key.toLowerCase();
        keysPressed[key] = false;
    });

    // --- 4. LOGIQUE DU JEU ---
    function update() {
        if (keysPressed['arrowup'] || keysPressed['z']) player.y -= player.speed;
        if (keysPressed['arrowdown'] || keysPressed['s']) player.y += player.speed;
        if (keysPressed['arrowleft'] || keysPressed['q']) player.x -= player.speed;
        if (keysPressed['arrowright'] || keysPressed['d']) player.x += player.speed;

        if (player.x < 0) player.x = 0;
        if (player.y < 0) player.y = 0;
        if (player.x > canvas.width) player.x = canvas.width;
        if (player.y > canvas.height) player.y = canvas.height;
    }

    // --- 5. DESSIN (MODIFIÉ POUR LA TEXTURE) ---
    function draw() {
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const objects = worlds[currentWorld];
        if(objects) {
            objects.forEach(obj => {
                
                // --- MODIFICATION ICI : DESSIN DE L'IMAGE ---
                if (obj.type === 'key') {
                    // On dessine l'image case.png
                    ctx.drawImage(keyTexture, obj.x, obj.y, obj.size, obj.size);

                    // Si la touche a été activée (couleur verte), on ajoute un filtre vert par dessus
                    if (obj.color !== '#ecf0f1' && obj.val !== 'BACK') {
                         ctx.fillStyle = 'rgba(46, 204, 113, 0.5)'; // Vert transparent
                         ctx.fillRect(obj.x, obj.y, obj.size, obj.size);
                    }
                } else {
                    // Pour les portes et le submit, on garde les carrés de couleur
                    ctx.fillStyle = obj.color;
                    ctx.fillRect(obj.x, obj.y, obj.size, obj.size);
                }

                // --- DESSIN DU TEXTE (Amélioré avec ombre pour lisibilité sur texture) ---
                ctx.fillStyle = 'white';
                ctx.shadowColor = "black"; // Ombre noire pour que le texte ressorte
                ctx.shadowBlur = 4;
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(obj.label || obj.val, obj.x + obj.size/2, obj.y + obj.size/2 + 6);
                ctx.shadowBlur = 0; // On reset l'ombre

                // Interaction (Cadre jaune)
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

    // --- 6. INTERACTIONS ---
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
                // Petit effet visuel
                let originalColor = target.color;
                target.color = '#2ecc71'; // Vert
                // On remet la couleur normale après 150ms
                setTimeout(() => target.color = originalColor, 150);
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