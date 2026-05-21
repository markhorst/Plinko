// --- Matter.js Setup ---
const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Events, Body } = Matter;

const engine = Engine.create();
const world = engine.world;
const width = 800;
const height = 900;

// Setup Renderer (Hidden, we use it just for mouse interaction context)
const render = Render.create({
    element: document.getElementById('canvas-container'),
    engine: engine,
    options: {
        width, height,
        wireframes: false,
        background: 'transparent'
    }
});
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// --- Build Board ---
// Pegs
const pegs = [];
const rows = 7; // Reduced from 10 to clear vertical jams
const cols = 8; // Reduced from 12 so gaps (100px) are wider than the 70px coins
const spacingX = width / cols;
const spacingY = (height - 350) / rows; 

for (let r = 0; r < rows; r++) {
    const offset = (r % 2 === 0) ? spacingX / 2 : 0;
    for (let c = 0; c < cols; c++) {
        const x = c * spacingX + offset;
        const y = r * spacingY + 150; 
        const peg = Bodies.circle(x, y, 6, { 
            isStatic: true, 
            restitution: 0.6, 
            render: { fillStyle: '#ffffff' } 
        });
        pegs.push(peg);
    }
}
Composite.add(world, pegs);

// Walls, Ground, and Bucket Floors with secure protective edges
Composite.add(world, [
    Bodies.rectangle(width/2, height+50, width, 100, { isStatic: true }), // Main Floor (Coin stash)
    Bodies.rectangle(-25, height/2, 50, height, { isStatic: true }), // Left Wall
    Bodies.rectangle(width+25, height/2, 50, height, { isStatic: true }), // Right Wall
    
// Bucket bases
    Bodies.rectangle(165, height - 110, 250, 20, { isStatic: true, label: 'saas-floor', render: { visible: false } }), 
    Bodies.rectangle(width - 165, height - 110, 250, 20, { isStatic: true, label: 'non-saas-floor', render: { visible: false } }),

    // Physical retaining walls for J1 SAAS bucket (Left & Right edges)
    Bodies.rectangle(40, height - 150, 20, 100, { isStatic: true, render: { visible: false } }), 
    Bodies.rectangle(290, height - 150, 20, 100, { isStatic: true, render: { visible: false } }), 

    // Physical retaining walls for Non-SAAS bucket (Left & Right edges)
    Bodies.rectangle(510, height - 150, 20, 100, { isStatic: true, render: { visible: false } }), 
    Bodies.rectangle(760, height - 150, 20, 100, { isStatic: true, render: { visible: false } })
]);

// --- Create Coins ---
const coinNames = [
    "J1 Admissions Stage Update", "Nightly Canvas Export", 
    "Starfish Import", "Bill’s SFTP", "Jenzabar BI Run", "NBS Nelnet Import"
];
const coins = [];

const domLayer = document.getElementById('dom-layer');

coinNames.forEach((name, index) => {
    // Starting position (Tray at the bottom)
    const startX = 100 + (index * 120);
    const startY = height - 50;

    // Physics Body
    const coinBody = Bodies.circle(startX, startY, 35, {
        restitution: 0.5,
        friction: 0.05,
        density: 0.05
    });
    
    // HTML Element
    const coinUI = document.createElement('div');
    coinUI.className = 'coin-ui';
    coinUI.innerText = name;
    domLayer.appendChild(coinUI);

    coins.push({ body: coinBody, ui: coinUI });
    Composite.add(world, coinBody);
});

// Sync Physics to HTML UI
Events.on(engine, 'afterUpdate', () => {
    coins.forEach(coin => {
        coin.ui.style.left = `${coin.body.position.x}px`;
        coin.ui.style.top = `${coin.body.position.y}px`;
        coin.ui.style.transform = `translate(-50%, -50%) rotate(${coin.body.angle}rad)`;
    });
});

// --- Mouse Drag & Drop ---
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.2, render: { visible: false } }
});
Composite.add(world, mouseConstraint);
render.mouse = mouse; // Keep render synced

// --- Game Logic State ---
let activeCoin = null;
let currentStep = 0;
let targetMagnetX = null; // Where the coin is pulled toward

// Detect when a coin is dropped at the TOP of the board
Events.on(mouseConstraint, 'enddrag', function(event) {
    const body = event.body;
    if (body && body.position.y < 120) {
        // Coin dropped at the top! Freeze it and start Q&A
        Body.setStatic(body, true);
        activeCoin = body;
        startQA();
    }
});

// --- Physics Engine Update Loop (Magnetism & UI States) ---
const dropZoneUI = document.getElementById('drop-zone');

Events.on(engine, 'beforeUpdate', function() {
    
    // 1. DROP ZONE VISUAL ACTIVATION
    // Check if the user is currently holding a body with the mouse
    if (mouseConstraint.body) {
        // If the dragged coin is dragged above the y=120 line
        if (mouseConstraint.body.position.y < 120) {
            dropZoneUI.classList.add('active');
        } else {
            dropZoneUI.classList.remove('active');
        }
    } else {
        // Turn it off instantly when they let go of the mouse
        dropZoneUI.classList.remove('active');
    }

    // 2. MAGNETISM LOGIC
    if (activeCoin && !activeCoin.isStatic && targetMagnetX !== null) {
        const currentY = activeCoin.position.y;
        
        // Wait until it drops a bit, shut off before it hits the bucket floor
        if (currentY > 250 && currentY < 730) {
            const currentX = activeCoin.position.x;
            const distanceX = targetMagnetX - currentX;
            
            // The "Drop Zone" logic to prevent wall-pinning
            if (Math.abs(distanceX) < 40) return; 
            
            // Mass-adjusted proportional pull
            const pullMultiplier = 0.00015 * activeCoin.mass; 
            let forceX = distanceX * pullMultiplier;
            
            const maxForce = 0.03 * activeCoin.mass;
            if (forceX > maxForce) forceX = maxForce;
            if (forceX < -maxForce) forceX = -maxForce;
            
            Body.applyForce(activeCoin, activeCoin.position, { x: forceX, y: 0 });
        }
    }
});

// --- UI Interaction ---
const modal = document.getElementById('qa-modal');
const qText = document.getElementById('question-text');
const nText = document.getElementById('note-text');
const btnGroup = document.getElementById('btn-group');
const resText = document.getElementById('result-text');

function startQA() {
    currentStep = 0;
    targetMagnetX = null;
    btnGroup.style.display = 'block';
    resText.classList.add('hidden');
    nText.classList.add('hidden');
    modal.classList.remove('hidden');
    loadQuestion();
}

function loadQuestion() {
    qText.innerText = rules[currentStep].text;
}

window.submitAnswer = function(answer) {
    const outcome = rules[currentStep][answer];

    if (outcome.note) {
        nText.innerText = outcome.note;
        nText.classList.remove('hidden');
    } else {
        nText.classList.add('hidden');
    }

    if (outcome.type === 'next') {
        currentStep = outcome.step;
        loadQuestion();
    } else if (outcome.type === 'end') {
        finishQA(outcome);
    }
}

function finishQA(outcome) {
    btnGroup.style.display = 'none';
    resText.innerText = `Decision: ${outcome.result}`;
    resText.classList.remove('hidden');
    
    // Set Magnetism Target Coordinates
    // SAAS bucket is on the left (~165px), Non-SAAS on the right (~635px)
    targetMagnetX = outcome.isSaas ? 165 : 635;

    // Wait 1.5 seconds so they read the result, then drop the coin
    setTimeout(() => {
        modal.classList.add('hidden');
        Body.setStatic(activeCoin, false); // Unfreeze
    }, 1500);
}

// --- Collision Detection for Animations ---
// Listens for the exact moment the active coin touches a bucket floor
Events.on(engine, 'collisionStart', function(event) {
    event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        
        // Check if the collision involves the coin that is currently falling
        if (activeCoin && (bodyA === activeCoin || bodyB === activeCoin)) {
            const otherBody = (bodyA === activeCoin) ? bodyB : bodyA;
            
            // If the coin hit the SAAS floor
            if (otherBody.label === 'saas-floor') {
                const bucketElement = document.querySelector('.saas-bucket');
                if (bucketElement) triggerGlow(bucketElement);
            } 
            // If the coin hit the Non-SAAS floor
            else if (otherBody.label === 'non-saas-floor') {
                const bucketElement = document.querySelector('.non-saas-bucket');
                if (bucketElement) triggerGlow(bucketElement);
            }
        }
    });
});

// Applies the CSS animation class and automatically removes it so it can trigger again later
function triggerGlow(bucketElement) {
    // The if-statement prevents the animation from restarting if the coin bounces slightly on the floor
    if (!bucketElement.classList.contains('pulse-glow')) {
        bucketElement.classList.add('pulse-glow');
        setTimeout(() => bucketElement.classList.remove('pulse-glow'), 1600);
    }
}
