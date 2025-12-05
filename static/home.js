window.onload = function() {
    console.log("🚀 Démarrage de l'écran d'accueil HOME.JS...");

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("❌ Canvas introuvable ! Vérifiez votre home.html.");
        return;
    }
    const ctx = canvas.getContext('2d');

    // --- 1. CONFIGURATION & VARIABLES ---
    
    // Définir la taille du Canvas pour qu'il remplisse la fenêtre
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Chargement de l'Audio 
    const doorSound = document.getElementById('doorSound');
    if (!doorSound) {
    console.warn("⚠️ Élément audio 'doorSound' introuvable dans le HTML. Le son ne fonctionnera pas.");
}

    // Propriétés du joueur
    const player = { x: canvas.width / 2, y: canvas.height * 0.7, size: 100, speed: 5, color: '#2ecc71' };
    
    const keysPressed = {};
    let currentWorld = 'hub'; // Le seul monde actif


    // --- 2. CHARGEMENT DES TEXTURES ---
    const textures = {
        player: new Image(),
        door_sign_in: new Image(),
        door_sign_up: new Image(),
    };

    // Chemins des images (Vérifiez les chemins dans static/images/)
    textures.player.src = '/static/images/knight.png';
    textures.door_sign_in.src = '/static/images/door_sign_in.png';
    textures.door_sign_up.src = '/static/images/door_sign_up.png';

    function loadAllTextures() {
        const imagesToLoad = Object.values(textures); 
        const promises = [];

        imagesToLoad.forEach(img => {
            const promise = new Promise((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => {
                    console.warn(`⚠️ Erreur de chargement de la texture : ${img.src}`);
                    resolve(); // Ne bloque pas si une image manque
                };
            });
            promises.push(promise);
        });
        return Promise.all(promises);
    }


    // --- 3. FONCTIONS UTILITAIRES ---
    function getDistance(p, obj) {
        return Math.sqrt( ((p.x + p.size/2)-(obj.x + obj.size/2))**2 + ((p.y + p.size/2)-(obj.y + obj.size/2))**2 );
    }

    // --- 4. CRÉATION DU MONDE 'hub' ---
    
    // Variables pour le positionnement des portes (Centrées)
    const doorSize = 150; 
    const gapDoor = 250; 
    const totalWidth = 2 * doorSize + gapDoor;
    const startDoorX = canvas.width / 2 - totalWidth / 2;
    const doorY = canvas.height / 2 - doorSize / 2;
    
    const worlds = {
        'hub': [
            // --- Porte Sign In ---
            { 
                type: 'door', 
                target: 'sign_in', // Le monde 'sign_in' doit être défini ou lier vers une route Flask
                label: 'Sign In', 
                x: startDoorX, 
                y: doorY, 
                size: doorSize, 
                color: '#3498db' 
            },
            // --- Porte Sign Up ---
            { 
                type: 'door', 
                target: 'sign_up', // Le monde 'sign_up' doit être défini ou lier vers une route Flask
                label: 'Sign Up',
                x: startDoorX + doorSize + gapDoor, 
                y: doorY, 
                size: doorSize, 
                color: '#2ecc71' 
            }
        ],
        // Mondes vides pour la transition interne (si vous ne redirigez pas vers une autre page Flask)
        'sign_in': [], 
        'sign_up': []
    };

    // --- 5. GESTION DES ENTRÉES ---
    window.addEventListener('keydown', e => {
        let key = e.key;
        if (key.length === 1) key = key.toLowerCase(); 
        keysPressed[key] = true;

        if (key === 'f') checkInteraction();
    });

    window.addEventListener('keyup', e => {
        let key = e.key;
        if (key.length === 1) key = key.toLowerCase();
        keysPressed[key] = false;
    });

    // --- 6. LOGIQUE DU JEU ---
    function update() {
        // Déplacement du joueur (Z, Q, S, D)
        if (keysPressed['arrowup'] || keysPressed['z']) player.y -= player.speed;
        if (keysPressed['arrowdown'] || keysPressed['s']) player.y += player.speed;
        if (keysPressed['arrowleft'] || keysPressed['q']) player.x -= player.speed;
        if (keysPressed['arrowright'] || keysPressed['d']) player.x += player.speed;

        // Limites du Canvas
        player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
        player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));
    }


    function checkInteraction() {
    // Récupération des objets du monde actuel
    const objects = worlds[currentWorld];
    let target = null;
    
    // Récupérer l'élément audio (déjà chargé globalement au début du script)
    const doorSound = document.getElementById('doorSound');

    // 1. Détection de l'objet proche
    objects.forEach(obj => {
        // Vérifie si le joueur est suffisamment proche (distance < 50)
        if (getDistance(player, obj) < 50) target = obj; 
    });

    if (target) {
        
        // --- 2. Gérer le Son et la Redirection ---
        
        // Tente de jouer le son
        let audioPlayed = false;
        if (doorSound) {
            doorSound.volume = 0.8;
            doorSound.currentTime = 0;
            
            // Tentative de lecture asynchrone
            const playPromise = doorSound.play();
            
            if (playPromise) {
                // Si play() retourne une promesse (mode moderne)
                audioPlayed = true;
                
                Promise.resolve(playPromise).then(() => {
                    // Lecture réussie, on attend 250ms avant de rediriger
                    setTimeout(() => {
                        handleRedirection(target);
                    }, 500); 
                }).catch(error => {
                    // Lecture bloquée par le navigateur, on redirige immédiatement
                    console.warn("La lecture audio a été bloquée. Redirection immédiate.");
                    handleRedirection(target);
                });
            }
        }
        
        // Si l'audio n'a pas été géré par la promesse (mode de secours ou son désactivé), on redirige immédiatement.
        if (!audioPlayed) {
            handleRedirection(target);
        }
    }
}

// --- Fonction Utilitaires de Redirection (à placer après checkInteraction) ---

function handleRedirection(target) {
    if (target.type === 'door') {
        if (target.target === 'sign_in') {
            console.log("Redirection vers la connexion : /login");
            window.location.href = "/login";
            return; 
        } else if (target.target === 'sign_up') {
            console.log("Redirection vers l'inscription : /register");
            window.location.href = "/register";
            return;
        }
        
        // Logique de changement de monde interne si les cibles ne sont pas des routes Flask
        currentWorld = target.target;
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
    }

}


    // --- 7. DESSIN ---
    function draw() {
        // Effacer l'écran (Fond bleu foncé)
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const objects = worlds[currentWorld];
        if (objects) {
            objects.forEach(obj => {
                let imgToDraw = null;

                // Choix de l'image pour les portes
                if (obj.type === 'door') {
                    if (obj.target === 'sign_in') {
                        imgToDraw = textures.door_sign_in;
                    } else if (obj.target === 'sign_up') {
                        imgToDraw = textures.door_sign_up;
                    }
                }

                // Dessin Objets
                if (imgToDraw && imgToDraw.complete && imgToDraw.naturalHeight !== 0) {
                    ctx.drawImage(imgToDraw, obj.x, obj.y, obj.size, obj.size);
                } else {
                    // Fallback (carré de couleur) si l'image ne charge pas
                    ctx.fillStyle = obj.color || 'white';
                    ctx.fillRect(obj.x, obj.y, obj.size, obj.size);
                }


                // Cadre d'Interaction
                if (getDistance(player, obj) < 50) {
                    ctx.strokeStyle = 'yellow';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(obj.x - 5, obj.y - 5, obj.size + 10, obj.size + 10);
                    ctx.fillStyle = 'yellow';
                    ctx.font = '16px Arial';
                    ctx.fillText("[F]", obj.x + obj.size/2, obj.y - 10);
                }
            });
        }

        // --- DESSIN JOUEUR ---
        if (textures.player.complete && textures.player.naturalHeight !== 0) {
            ctx.drawImage(textures.player, player.x, player.y, player.size, player.size);
        } else {
            // Fallback joueur (carré vert)
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

    // --- DÉMARRAGE DU JEU ---
    loadAllTextures()
        .then(() => {
            console.log("✅ Textures chargées. Démarrage de la boucle de jeu.");
            loop();
        })
        .catch(error => {
            console.error("Erreur lors du chargement initial:", error);
            loop(); // Démarre le jeu même si une image a manqué
        });
};