// ==== SOUND ====
function playSound() {
    let mySound = new Audio('typewriter (mp3cut.net)1.mp3');
    mySound.play();
}

// ==== DOM ELEMENTS ====
let m1 = 1; // масса малого куба
const massa = document.getElementById('massInput');
const startButton = document.getElementById('start');
const aboutButton = document.getElementById('about');
const menu = document.getElementById('menu');
const sim = document.getElementById('simulation');
let counter = document.getElementById('counter');
const quitButton = document.getElementById('quit');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const aboutuh = document.getElementById('aboutuh');



let animationId = null;
let cancelAnim = null;

// ===========================================
// ======= КЛАССЫ БЛОКОВ (оптимизированные)
// ===========================================
class Block {
    constructor(size, mass, color) {
        Object.assign(this, { size, mass, color });
    }
    drawAt(ctx, leftX, groundY) {
        ctx.fillStyle = this.color;
        ctx.fillRect(leftX, groundY - this.size, this.size, this.size);
    }
    sliding(x, vx) {
        return new SlidingBlock(this, x, vx);
    }
}

class SlidingBlock {
    constructor(block, x, vx) {
        this.block = block;
        this.x = x;
        this.vx = vx;
    }
    draw(ctx, groundY) {
        this.block.drawAt(ctx, this.x, groundY);
    }
    after(elapsed) {
        return this.block.sliding(this.x + elapsed * this.vx, this.vx);
    }
    reverse() {
        return this.block.sliding(this.x, -this.vx);
    }
    collide(other) {
        return this.block.sliding(
            this.x,
            ((this.block.mass - other.block.mass) * this.vx +
                2 * other.block.mass * other.vx) /
                (this.block.mass + other.block.mass)
        );
    }

    drawMassLabel(ctx, text) {
        ctx.font = "24px Times New Roman";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText(
            text, 
            this.x + this.block.size / 2, 
            ctx.canvas.height - this.block.size - 15
        );
    }

}

// ===========================================
// ======= ГЕНЕРАТОР СТОЛКНОВЕНИЙ ============
// (оптимизированный; как в версии с форума)
// ===========================================
function* generatePath(small, big) {
    while (small.vx > big.vx) {
        // Столкновение кубов
        let duration = (big.x - small.x - small.block.size) / (small.vx - big.vx);
        yield [duration, small, big];

        [small, big] = [
            small.after(duration).collide(big),
            big.after(duration).collide(small)
        ];

        if (small.vx >= 0) break;

        // Столкновение малого куба со стеной
        duration = small.x / -small.vx;
        yield [duration, small, big];

        [small, big] = [
            small.after(duration).reverse(),
            big.after(duration)
        ];
    }
    yield [Infinity, small, big];
}

// ===========================================
// === MERGE SHORT INTERVALS (главная магия) ==
// ===========================================
function getFilteredEvents(small, big, minDuration = 10) {
    const path = Array.from(generatePath(small, big)).reduce((path, [duration, small, big]) => {
        if (path.at(-1)?.[0] < minDuration) {
            path.at(-1)[0] += duration;
            path.at(-1)[1]++;
        } else {
            path.push([duration, (path.at(-1)?.[1] ?? -1) + 1, small, big]);
        }
        return path;
    }, []);

    let time = performance.now();
    return path.map(([duration, collisions, small, big]) =>
        [time, time += duration, collisions, small, big]
    );
}

// ===========================================
// =============== АНИМАЦИЯ ==================
// ===========================================
function animate(initSmall, initBig, draw) {
    const gen = getFilteredEvents(initSmall, initBig).values();
    let [startTime, nextHitTime, collisions, small, big] = gen.next().value;

    function loop(timestamp) {
        while (timestamp > nextHitTime) {
            [startTime, nextHitTime, collisions, small, big] = gen.next().value;
        }

        const elapsed = timestamp - startTime;
        draw(small.after(elapsed), big.after(elapsed), collisions);

        animationId = requestAnimationFrame(loop);
    }

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
}

// ===========================================
// =============== UI EVENTS =================
// ===========================================
aboutButton.addEventListener('click', function() {
    if (window.innerWidth > 560) {
        menu.style.display = 'none';
        aboutuh.style.display = 'block';
    } else {
        menu.style.display = 'none';
        document.getElementById('aboutuh-mob').style.display = 'block';
    }
});

document.querySelector('.quit-mob').addEventListener('click', function(){
    menu.style.display = 'flex';
    document.getElementById('aboutuh-mob').style.display = 'none';

})

quitButton.addEventListener('click', function() {
    sim.style.display = 'none';
    menu.style.display = 'flex';
    if (cancelAnim) cancelAnim();
});

startButton.addEventListener('click', function() {
    const bigmass = parseFloat(massa.value);

    // Новый предел — до КВИНТИЛЛИОНА:
    if (bigmass > 1e13) {
        showLagWarning()
        return;
    } else if (isNaN(bigmass) || bigmass < 1) {
        showLagWarningLittle()
        return;
    }

    // выбор цвета/размера
    let size, color;
    if (bigmass < 10) { size = 30; color = 'white'; }
    else if (bigmass < 100) { size = 60; color = '#08bcfed4'; }
    else if (bigmass < 1000000) { size = 90; color = '#040cf7ff'; }
    else { size = 120; color = 'rgba(193, 193, 193, 1)'; }

    menu.style.display = 'none';
    sim.style.display = 'block';

    const groundY = canvas.height;

    const small = new Block(30, 1, 'white').sliding(80, 0);
    const big = new Block(size, bigmass, color).sliding(canvas.width - size - 300, -0.1);

    cancelAnim = animate(small, big, draw.bind(null, ctx, counter, groundY));
});

// ===========================================
// ============= РИСОВАНИЕ ===================
// ===========================================
function draw(ctx, counter, groundY, small, big, collisions) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // пол и стена
    ctx.fillStyle = "white";
    ctx.fillRect(0, groundY - 2, ctx.canvas.width, 2);
    ctx.fillRect(0, 0, 2, ctx.canvas.height);

    small.draw(ctx, groundY);
    big.draw(ctx, groundY);

    small.drawMassLabel(ctx, formatMass(small.block.mass));
    big.drawMassLabel(ctx, formatMass(big.block.mass));

    counter.innerText = `Collisions: ${collisions}`;
}

function showLagWarning() {
    const container = document.getElementById('toastContainer');

    // создаём новый toast
    const toast = document.createElement('div');
    toast.className = 'toast';

    toast.innerHTML = `
        <span>Values above 10 trillion may cause heavy lag!</span>
        <button class="close-btn">✕</button>
        <div class="border-anim"></div>
    `;

    container.appendChild(toast);

    // обработчик крестика
    toast.querySelector('.close-btn').onclick = () => removeToast(toast);

    // автоудаление через 2 сек
    setTimeout(() => removeToast(toast), 2000);
}

function showLagWarningLittle() {
    const container = document.getElementById('toastContainer');

    // создаём новый toast
    const toast = document.createElement('div');
    toast.className = 'toast';

    toast.innerHTML = `
        <span>Enter the mass of the big cube!</span>
        <button class="close-btn">✕</button>
        <div class="border-anim"></div>
    `;

    container.appendChild(toast);

    // обработчик крестика
    toast.querySelector('.close-btn').onclick = () => removeToast(toast);

    // автоудаление через 2 сек
    setTimeout(() => removeToast(toast), 2000);
}

function removeToast(toast) {
    toast.style.animation = 'fadeOut 0.25s linear forwards';
    setTimeout(() => {
        toast.remove();
    }, 250);
}

function formatMass(n) {
    if (n < 1e6) return n + " kg";

    // Берём степень 10
    const exp = Math.floor(Math.log10(n));

    return `10^${exp}kg`;
}

