window.onload = function() {
    console.log("🚀 Démarrage du jeu : Mode Chevalier (HUD Texture)...");

    // --- 0. PRÉPARATION DE LA PAGE (INJECTION) ---
    const originalContent = document.getElementById('original-content') || document.body.firstElementChild;
    if (originalContent) {
        Array.from(document.body.children).forEach(child => {
            if (child.tagName !== 'SCRIPT') child.style.display = 'none';
        });
    }

    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.style.backgroundColor = "#2c3e50";

    const canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    document.body.appendChild(canvas);

    // --- CRÉATION DU HUD AVEC TEXTURE ---
    const hud = document.createElement('div');
    hud.style.position = 'absolute';
    hud.style.top = '20px';
    hud.style.width = '100%';
    hud.style.textAlign = 'center';
    hud.style.pointerEvents = 'none';
    hud.style.fontFamily = 'Arial, sans-serif';
    
    // Modification ici pour utiliser panneau.png
    hud.innerHTML = `
        <div style="
            display:inline-block; 
            background-image: url('/static/images/panneau.png'); 
            background-size: 100% 100%;
            background-repeat: no-repeat;
            padding: 40px 30px; 
            width: 350px;
            color: #ecf0f1;
            text-shadow: 2px 2px 4px #000000; /* Ombre pour lisibilité sur la texture */
        ">
            <div id="hud-user-box" style="border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom:10px; margin-bottom:10px;">
                <small style="color:#f1c40f; font-weight:bold; font-size:12px;">USERNAME</small><br>
                <span id="vis-username" style="font-size:24px; font-weight:bold; font-family:'Courier New', monospace;"></span>
            </div>
            <div id="hud-pass-box">
                <small style="color:#f1c40f; font-weight:bold; font-size:12px;">PASSWORD (Press 'K')</small><br>
                <span id="vis-password" style="font-size:24px; font-weight:bold; font-family:'Courier New', monospace;"></span>
            </div>
        </div>
        <div style="color:rgba(255,255,255,0.8); font-size:14px; margin-top:10px; text-shadow: 1px 1px 2px black;">
            Flèches: Bouger | F: Frapper | K: Changer de champ
        </div>
    `;
    document.body.appendChild(hud);

    // --- 1. CONFIGURATION ---
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    const player = { x: canvas.width / 2, y: canvas.height / 2, size: 80, speed: 6, color: '#2ecc71' };
    const keysPressed = {};
    let currentWorld = 'hub';
    let activeField = 'username';

    // Liaison HTML
    const realInputs = {
        username: document.querySelector('input[name="username"]'),
        password: document.querySelector('input[name="password"]'),
        form: document.querySelector('input[name="username"]') ? document.querySelector('input[name="username"]').closest('form') : document.querySelector('form')
    };
    
    const visInputs = {
        username: document.getElementById('vis-username'),
        password: document.getElementById('vis-password'),
        userBox: document.getElementById('hud-user-box'),
        passBox: document.getElementById('hud-pass-box')
    };

    // --- 2. TEXTURES ---
    const textures = {
        player: new Image(), key: new Image(),
        door_abc: new Image(), door_ABC: new Image(), door_123: new Image(),
        door_special: new Image(), door_exit: new Image(), door_login: new Image()
    };

    textures.player.src = '/static/images/knight.png';
    textures.key.src = '/static/images/case.png';
    textures.door_abc.src = '/static/images/door_uncap.png';
    textures.door_ABC.src = '/static/images/door_cap.png';
    textures.door_123.src = '/static/images/door_123.png';
    textures.door_special.src = '/static/images/door_special.png';
    textures.door_exit.src = '/static/images/door_exit.png';
    textures.door_login.src = '/static/images/door_login.png';

    // --- 3. LOGIQUE ---
    function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function getDistance(p, obj) { return Math.sqrt( ((p.x + p.size/2)-(obj.x + obj.size/2))**2 + ((p.y + p.size/2)-(obj.y + obj.size/2))**2 ); }
    function isOverlapping(x, y, size, existingObjects) {
        for (let obj of existingObjects) {
            if (Math.sqrt( ((x)-(obj.x))**2 + ((y)-(obj.y))**2 ) < (size + 10)) return true;
        } return false; 
    }

    // --- CRÉATION DES MONDES ---
    function createScatteredWorld(chars, thisWorld) {
        let objects = [];
        const minX = 50, maxX = canvas.width - 60, minY = 150, maxY = canvas.height - 200;    

        // Touches
        chars.forEach(char => {
            let placed = false, attempts = 0;
            while (!placed && attempts < 100) {
                let rx = getRandomInt(minX, maxX), ry = getRandomInt(minY, maxY);
                if (!isOverlapping(rx, ry, 45, objects)) {
                    objects.push({ type: 'key', val: char, x: rx, y: ry, size: 45, color: '#ecf0f1' });
                    placed = true;
                } attempts++;
            }
        });

        // Configuration des portes alignées en bas (Avec HUB/EXIT incluse)
        const allSlots = [ {id:'lowercase'}, {id:'uppercase'}, {id:'numbers'}, {id:'special'}, {id:'hub'} ];
        const activeSlots = allSlots.filter(slot => slot.id !== thisWorld); // On retire le monde actuel

        const doorSize = 100;
        const gap = 120;
        const totalWidth = (activeSlots.length * gap); 
        const startX = (canvas.width / 2) - (totalWidth / 2) + (gap/2) - (doorSize/2);
        const doorY = canvas.height - 130;

        activeSlots.forEach((slot, i) => {
            let color = '#e67e22';
            if (slot.id === 'hub') color = '#c0392b'; // Exit en rouge si pas de texture
            
            objects.push({ 
                type: 'door', 
                target: slot.id, 
                label: ' ', 
                x: startX + (i * gap), 
                y: doorY, 
                size: doorSize, 
                color: color 
            });
        });

        return objects;
    }

    const worlds = {
        'hub': [
            { type: 'door', target: 'lowercase', label: 'abc', x: canvas.width/2 - 250, y: 200, size: 120, color: '#e67e22' },
            { type: 'door', target: 'uppercase', label: 'ABC', x: canvas.width/2 - 100, y: 200, size: 120, color: '#e67e22' },
            { type: 'door', target: 'numbers',   label: '123', x: canvas.width/2 + 50, y: 200, size: 120, color: '#e67e22' },
            { type: 'door', target: 'special',   label: '#@&', x: canvas.width/2 + 200, y: 200, size: 120, color: '#e67e22' },
            { type: 'submit', label: ' ', x: canvas.width/2 - 100, y: canvas.height - 250, size: 200, color: '#3498db' }
        ],
        'lowercase': createScatteredWorld("azertyuiopqsdfghjklmwxcvbn".split(''), 'lowercase'),
        'uppercase': createScatteredWorld("AZERTYUIOPQSDFGHJKLMWXCVBN".split(''), 'uppercase'),
        'numbers':   createScatteredWorld("1234567890".split(''), 'numbers'),
        'special':   createScatteredWorld("&é'(-è_çà)=~#{[|`\\^@]}".split(''), 'special')
    };

    // --- 4. INPUTS ---
    window.addEventListener('keydown', e => {
        let key = e.key; if (key.length === 1) key = key.toLowerCase(); 
        keysPressed[key] = true;
        if (key === 'f') checkInteraction();
        if (key === 'k') { e.preventDefault(); switchField(); }
        if (key === 'backspace') typeChar('BACK');
    });
    window.addEventListener('keyup', e => keysPressed[e.key.length===1?e.key.toLowerCase():e.key] = false);

    // --- 5. LOGIQUE JEU ---
    function update() {
        if (keysPressed['arrowup'] || keysPressed['z']) player.y -= player.speed;
        if (keysPressed['arrowdown'] || keysPressed['s']) player.y += player.speed;
        if (keysPressed['arrowleft'] || keysPressed['q']) player.x -= player.speed;
        if (keysPressed['arrowright'] || keysPressed['d']) player.x += player.speed;
        player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
        player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));
    }

    function checkInteraction() {
        const objects = worlds[currentWorld];
        let target = null;
        objects.forEach(obj => { if (getDistance(player, obj) < 50) target = obj; });

        if (target) {
            if (target.type === 'door') {
                currentWorld = target.target;
                player.x = canvas.width / 2; player.y = canvas.height / 2;
            } else if (target.type === 'key') {
                typeChar(target.val);
                target.isActive = true; setTimeout(() => target.isActive = false, 150);
            } else if (target.type === 'submit') {
                if (realInputs.username.value !== "" && realInputs.password.value !== "") {
                    realInputs.form.submit();
                } else {
                    alert("Remplissez les champs !");
                }
            }
        }
    }

    function switchField() {
        activeField = (activeField === 'username') ? 'password' : 'username';
        // Petit effet visuel : on change la couleur du texte selon le champ actif
        if(activeField === 'username') {
            visInputs.username.style.color = '#2ecc71'; // Vert
            visInputs.password.style.color = '#ecf0f1'; // Blanc cassé
        } else {
            visInputs.username.style.color = '#ecf0f1';
            visInputs.password.style.color = '#2ecc71';
        }
    }

    function typeChar(char) {
        const visTarget = (activeField === 'username') ? visInputs.username : visInputs.password;
        const realTarget = (activeField === 'username') ? realInputs.username : realInputs.password;

        if (char === 'BACK') {
            visTarget.innerText = visTarget.innerText.slice(0, -1);
            realTarget.value = realTarget.value.slice(0, -1);
        } else {
            if (activeField === 'password') visTarget.innerText += "*";
            else visTarget.innerText += char;
            realTarget.value += char;
        }
    }

    // --- 6. DESSIN ---
    function draw() {
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const objects = worlds[currentWorld];
        if (objects) {
            objects.forEach(obj => {
                let imgToDraw = null;
                if (obj.type === 'key') imgToDraw = textures.key;
                else if (obj.type === 'submit') imgToDraw = textures.door_login;
                else if (obj.type === 'door') {
                    if (obj.target === 'hub') imgToDraw = textures.door_exit;
                    else if (obj.target === 'lowercase') imgToDraw = textures.door_abc;
                    else if (obj.target === 'uppercase') imgToDraw = textures.door_ABC;
                    else if (obj.target === 'numbers') imgToDraw = textures.door_123;
                    else if (obj.target === 'special') imgToDraw = textures.door_special;
                }

                if (imgToDraw && imgToDraw.complete && imgToDraw.naturalHeight !== 0) {
                    ctx.drawImage(imgToDraw, obj.x, obj.y, obj.size, obj.size);
                } else {
                    ctx.fillStyle = obj.color || 'white';
                    ctx.fillRect(obj.x, obj.y, obj.size, obj.size);
                }

                if (obj.isActive) {
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.fillRect(obj.x, obj.y, obj.size, obj.size);
                }

                if (obj.type === 'key' || (obj.label !== ' ' && obj.type !== 'submit')) {
                     ctx.fillStyle = 'white'; 
                     ctx.font = 'bold 16px Arial'; 
                     ctx.textAlign = 'center';
                     ctx.shadowColor="black"; ctx.shadowBlur=4; // Ombre texte jeu
                     ctx.fillText(obj.label || obj.val, obj.x + obj.size/2, obj.y + obj.size/2 + 6);
                     ctx.shadowBlur=0;
                }

                if (getDistance(player, obj) < 50) {
                    ctx.strokeStyle = 'yellow'; ctx.lineWidth = 3;
                    ctx.strokeRect(obj.x - 5, obj.y - 5, obj.size + 10, obj.size + 10);
                    ctx.fillStyle = 'yellow'; ctx.fillText("[F]", obj.x + obj.size/2, obj.y - 12);
                }
            });
        }

        if (textures.player.complete && textures.player.naturalHeight !== 0) {
            ctx.drawImage(textures.player, player.x, player.y, player.size, player.size);
        } else {
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y, player.size, player.size);
        }

        requestAnimationFrame(loop);
    }

    function loop() { update(); draw(); }
    loop();
};