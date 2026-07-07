// CROAKDOWN — swamp-mystic embodied tower-defense co-op.
// Scaffold only. Real architecture lands with BRIEF.md execution.
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = innerWidth;
canvas.height = innerHeight;
ctx.fillStyle = '#0b1410';
ctx.fillRect(0, 0, canvas.width, canvas.height);
