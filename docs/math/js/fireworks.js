export function launchFireworks(canvas, duration = 4000) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth;
  const H = canvas.height = canvas.offsetHeight;

  const particles = [];
  const colors = ['#ffd34d', '#ff6b6b', '#51cf66', '#339af0', '#cc5de8', '#ff922b'];
  let animId = null;
  const startTime = performance.now();

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function explode(x, y) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const count = Math.floor(random(40, 60));
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + random(-0.1, 0.1);
      const speed = random(2, 6);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: random(0.01, 0.025),
        color,
        size: random(2, 4),
      });
    }
  }

  // Schedule 3 fireworks
  const launches = [0, 400, 800];
  launches.forEach((delay) => {
    setTimeout(() => {
      explode(random(W * 0.2, W * 0.8), random(H * 0.15, H * 0.4));
    }, delay);
  });

  function update() {
    ctx.clearRect(0, 0, W, H);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06; // gravity
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    if (performance.now() - startTime < duration || particles.length > 0) {
      animId = requestAnimationFrame(update);
    }
  }

  animId = requestAnimationFrame(update);

  return () => {
    if (animId) cancelAnimationFrame(animId);
  };
}
