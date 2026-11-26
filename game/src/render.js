// render.js — every pixel of Cloudrunner Courier: sky, valley, runway,
// rings, storms, the little courier plane, the lit instruments and screens.
// All art is drawn with canvas paths; no image, font or sound file exists.
import { CFG, REGIONS } from './config.js';

const W = CFG.viewW;
const H = CFG.viewH;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function project(G, z, wx, wy) {
  // The camera sits a little behind the plane, so the ground below the
  // plane and the near field are visible: a chase view, not a nose cam.
  const dz = z - G.camZ;
  if (dz < 2) return null;
  const s = CFG.camDepth / dz;
  return { x: G.cx + s * (wx - G.camX), y: G.horizon + s * (G.player.alt - wy), s };
}

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
}

function drawSky(G, ctx, now) {
  const g = ctx.createLinearGradient(0, 0, 0, G.horizon + 60);
  g.addColorStop(0, '#2f6fd0');
  g.addColorStop(0.55, '#7db6e8');
  g.addColorStop(1, '#dceefb');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, G.horizon + 60);

  // Sun with a soft glow.
  const sx = W * 0.8;
  const sy = 84;
  const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 90);
  glow.addColorStop(0, 'rgba(255,244,180,0.95)');
  glow.addColorStop(0.35, 'rgba(255,230,130,0.55)');
  glow.addColorStop(1, 'rgba(255,230,130,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 95, sy - 95, 190, 190);
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.arc(sx, sy, 26, 0, Math.PI * 2);
  ctx.fill();

  // Far mountain ridge, drifting with heading (parallax). Overlapping
  // triangles make one continuous ridge, not separate pyramids.
  const region = REGIONS[G.regionNow];
  ctx.fillStyle = region.far;
  ctx.beginPath();
  ctx.moveTo(-20, G.horizon + 2);
  for (let k = 0; k < 16; k++) {
    const px = (((k * 173 - G.player.heading * 1.6) % (W + 240)) + W + 240) % (W + 240) - 120;
    const ph = 30 + ((k * 53) % 55);
    ctx.lineTo(px, G.horizon - ph);
    ctx.lineTo(px + 200, G.horizon + 2);
  }
  ctx.lineTo(W + 20, G.horizon + 2);
  ctx.closePath();
  ctx.fill();

  // Ambient clouds, drifting slowly with heading and time.
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  for (let k = 0; k < 12; k++) {
    const base = (k * 211 + 40) % (W + 260);
    const cx = (((base - G.player.heading * 2.1 - now * 3) % (W + 260)) + W + 260) % (W + 260) - 130;
    const cy = 30 + ((k * 67) % 130);
    const sc = 0.7 + ((k * 31) % 10) / 14;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 46 * sc, 15 * sc, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 26 * sc, cy + 5 * sc, 26 * sc, 11 * sc, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 28 * sc, cy + 4 * sc, 28 * sc, 12 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround(G, ctx) {
  // Base fill so the ground never shows gaps at the screen edges when the
  // track curves away from the camera.
  ctx.fillStyle = REGIONS[G.regionNow].ground[0];
  ctx.fillRect(0, G.horizon, W, H - G.horizon);
  const playerSeg = Math.floor(G.player.z / CFG.segLen);
  for (let n = CFG.drawSegs; n >= -4; n--) {
    const seg = G.world.segs[playerSeg + n];
    if (!seg) continue;
    const z0 = seg.i * CFG.segLen;
    const z1 = z0 + CFG.segLen;
    const region = REGIONS[seg.region];
    const a = project(G, z0, -CFG.groundHalf, 0);
    const b = project(G, z0, CFG.groundHalf, 0);
    const c = project(G, z1, CFG.groundHalf, 0);
    const d = project(G, z1, -CFG.groundHalf, 0);
    if (!a || !c) continue;
    // Ground quad.
    ctx.fillStyle = region.ground[seg.checker];
    poly(ctx, [a, b, c, d]);
    // Side hills rising off the ground edge.
    for (const side of [-1, 1]) {
      const h = side < 0 ? seg.hillL : seg.hillR;
      if (h < 3) continue;
      const e0 = project(G, z0, side * CFG.groundHalf, 0);
      const e1 = project(G, z0, side * CFG.groundHalf, h);
      const e2 = project(G, z1, side * CFG.groundHalf, h);
      const e3 = project(G, z1, side * CFG.groundHalf, 0);
      if (!e1 || !e2) continue;
      ctx.fillStyle = region.hill;
      poly(ctx, [e0, e1, e2, e3]);
    }
    // Runway strip with centre dashes and edge lines.
    if (seg.runway) {
      const r0 = project(G, z0, -CFG.runwayHalf, 0.5);
      const r1 = project(G, z0, CFG.runwayHalf, 0.5);
      const r2 = project(G, z1, CFG.runwayHalf, 0.5);
      const r3 = project(G, z1, -CFG.runwayHalf, 0.5);
      if (r0 && r2) {
        ctx.fillStyle = '#3a3f46';
        poly(ctx, [r0, r1, r2, r3]);
        ctx.fillStyle = '#f2f2f2';
        if (seg.i % 4 < 2) {
          const c0 = project(G, z0, -5, 0.8);
          const c1 = project(G, z0, 5, 0.8);
          const c2 = project(G, z1, 5, 0.8);
          const c3 = project(G, z1, -5, 0.8);
          if (c0 && c2) poly(ctx, [c0, c1, c2, c3]);
        }
      }
    }
  }
}

function starPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 === 0 ? r : r * 0.45;
    const ang = -Math.PI / 2 + (k * Math.PI) / 5;
    const px = x + Math.cos(ang) * rr;
    const py = y + Math.sin(ang) * rr;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawItems(G, ctx, now) {
  const playerSeg = Math.floor(G.player.z / CFG.segLen);
  for (let n = CFG.drawSegs; n >= -4; n--) {
    const seg = G.world.segs[playerSeg + n];
    if (!seg || seg.items.length === 0) continue;
    const z = seg.i * CFG.segLen;
    // Items between the camera and the plane would fill the screen; the
    // camera has already passed them, so they are not drawn.
    if (z - G.camZ < 160) continue;
    for (const it of seg.items) {
      if (it.taken) continue;
      const wx = seg.dx + it.x;
      const p = project(G, z, wx, it.y);
      if (!p || p.y < -80 || p.y > H + 80) continue;
      const s = p.s;
      if (it.kind === 'ring') {
        ctx.save();
        ctx.strokeStyle = '#ffc21c';
        ctx.lineWidth = Math.max(2.5, 7 * s);
        ctx.shadowColor = '#ff9d00';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, it.r * s, it.r * s * 0.96, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth = Math.max(1, 2 * s);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, it.r * s * 0.72, it.r * s * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (it.kind === 'fuel') {
        ctx.save();
        ctx.strokeStyle = '#37e08a';
        ctx.lineWidth = Math.max(2.5, 7 * s);
        ctx.shadowColor = '#0fbf6a';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, it.r * s, it.r * s * 0.96, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#0c7a45';
        ctx.font = `bold ${Math.max(10, 15 * s)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FUEL', p.x, p.y);
      } else if (it.kind === 'star') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.sin(now * 2 + seg.i) * 0.25);
        ctx.fillStyle = '#ffd94a';
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = Math.max(1, 1.6 * s);
        ctx.shadowColor = '#ffdf5e';
        ctx.shadowBlur = 12;
        starPath(ctx, 0, 0, Math.max(6, 26 * s));
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (it.kind === 'mountain') {
        const base = project(G, z, wx, 0);
        const apex = project(G, z, wx, it.y);
        const left = project(G, z, wx - 260, 0);
        const right = project(G, z, wx + 260, 0);
        if (!base || !apex || !left || !right) continue;
        ctx.fillStyle = '#6d5b4a';
        poly(ctx, [left, apex, base]);
        ctx.fillStyle = '#7d6a58';
        poly(ctx, [apex, right, base]);
        // Snow cap.
        const capY = apex.y + (base.y - apex.y) * 0.3;
        const capL = { x: apex.x - (base.x - apex.x) * 0.3, y: capY };
        const capR = { x: apex.x + (base.x - apex.x) * 0.3, y: capY };
        ctx.fillStyle = '#f4f8ff';
        poly(ctx, [apex, capL, capR]);
      } else if (it.kind === 'balloon') {
        const rx = 52 * s;
        const ry = 66 * s;
        ctx.save();
        ctx.fillStyle = `hsl(${it.hue}, 72%, 55%)`;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(p.x - rx * 0.45, p.y, rx * 0.28, ry * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5a3a22';
        ctx.lineWidth = Math.max(1, 1.5 * s);
        ctx.beginPath();
        ctx.moveTo(p.x - rx * 0.5, p.y + ry * 0.8);
        ctx.lineTo(p.x, p.y + ry + 14 * s + 10);
        ctx.moveTo(p.x + rx * 0.5, p.y + ry * 0.8);
        ctx.lineTo(p.x, p.y + ry + 14 * s + 10);
        ctx.stroke();
        ctx.fillStyle = '#7a5230';
        ctx.fillRect(p.x - 9 * s, p.y + ry + 14 * s + 4, 18 * s, 12 * s);
        ctx.restore();
      } else if (it.kind === 'storm') {
        ctx.save();
        ctx.fillStyle = '#3c4150';
        for (let k = 0; k < 5; k++) {
          const ox = (k - 2) * 34 * s;
          const oy = Math.sin(k * 2.1) * 12 * s;
          ctx.beginPath();
          ctx.ellipse(p.x + ox, p.y + oy, 34 * s, 24 * s, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#565e73';
        ctx.beginPath();
        ctx.ellipse(p.x - 20 * s, p.y - 16 * s, 26 * s, 15 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // Lightning flicker.
        if ((seg.i * 7 + Math.floor(now * 3)) % 9 === 0) {
          ctx.strokeStyle = '#ffe95e';
          ctx.lineWidth = Math.max(1.5, 2.5 * s);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + 20 * s);
          ctx.lineTo(p.x - 8 * s, p.y + 48 * s);
          ctx.lineTo(p.x + 4 * s, p.y + 70 * s);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
}

// Where the plane sits on screen: fixed in the lower frame, banking with
// the turn. The shadow hangs below it, shrinking as the plane climbs.
function planeScreenPos(G) {
  return {
    x: G.cx + G.player.bank * 26,
    y: H * 0.72 + G.player.pitchVis * 12,
  };
}

function drawPlaneShadow(G, ctx) {
  const pos = planeScreenPos(G);
  const altFrac = Math.min(1, G.player.alt / CFG.maxAlt);
  const size = Math.max(12, 58 * (1 - altFrac * 0.75));
  ctx.fillStyle = `rgba(20,30,20,${(0.3 * (1 - altFrac * 0.6)).toFixed(2)})`;
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y + 95, size, size * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
}

// The courier plane, seen from behind and slightly above: nose points at
// the horizon, wings span the screen, prop spinning at the nose.
function drawPlane(G, ctx, now) {
  const pos = planeScreenPos(G);
  const px = pos.x;
  const py = pos.y;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(G.player.bank * 0.5);
  const blink = G.invulnT > 0 && Math.floor(now * 10) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.35;

  // Wings.
  ctx.fillStyle = '#d23b2e';
  ctx.beginPath();
  ctx.moveTo(-96, -6);
  ctx.lineTo(-16, -18);
  ctx.lineTo(-14, 6);
  ctx.lineTo(-96, 14);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(96, -6);
  ctx.lineTo(16, -18);
  ctx.lineTo(14, 6);
  ctx.lineTo(96, 14);
  ctx.closePath();
  ctx.fill();
  // Wing tips: navigation lights.
  ctx.fillStyle = '#ff3b30';
  ctx.shadowColor = '#ff3b30';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(-96, 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2eff5e';
  ctx.shadowColor = '#2eff5e';
  ctx.beginPath();
  ctx.arc(96, 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Tailplane and fin.
  ctx.fillStyle = '#b02e24';
  ctx.beginPath();
  ctx.moveTo(-34, 44);
  ctx.lineTo(-12, 34);
  ctx.lineTo(-10, 48);
  ctx.lineTo(-34, 56);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(34, 44);
  ctx.lineTo(12, 34);
  ctx.lineTo(10, 48);
  ctx.lineTo(34, 56);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d23b2e';
  ctx.beginPath();
  ctx.moveTo(0, 52);
  ctx.lineTo(-8, 26);
  ctx.lineTo(8, 26);
  ctx.closePath();
  ctx.fill();

  // Fuselage, tapering toward the nose.
  ctx.fillStyle = '#f4f1e8';
  ctx.beginPath();
  ctx.moveTo(0, -72);
  ctx.quadraticCurveTo(15, -50, 16, -10);
  ctx.quadraticCurveTo(17, 30, 12, 52);
  ctx.lineTo(-12, 52);
  ctx.quadraticCurveTo(-17, 30, -16, -10);
  ctx.quadraticCurveTo(-15, -50, 0, -72);
  ctx.closePath();
  ctx.fill();
  // Red cheatline.
  ctx.fillStyle = '#d23b2e';
  ctx.fillRect(-15, -2, 30, 7);
  // Canopy, lit.
  ctx.fillStyle = '#9fd8ff';
  ctx.shadowColor = '#bfe9ff';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(0, -44, 9, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-3, -50, 3, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Propeller at the nose: two blades spinning.
  const ang = now * 38;
  ctx.save();
  ctx.translate(0, -72);
  ctx.rotate(ang);
  ctx.fillStyle = 'rgba(40,40,46,0.55)';
  ctx.beginPath();
  ctx.ellipse(0, -16, 3.5, 16, 0, 0, Math.PI * 2);
  ctx.ellipse(0, 16, 3.5, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#2c2c30';
  ctx.beginPath();
  ctx.arc(0, -72, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,18,32,0.62)';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(125,249,255,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function text(ctx, s, x, y, font, color, align) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fillText(s, x, y);
  ctx.shadowBlur = 0;
}

function drawHUD(G, ctx) {
  const p = G.player;
  const mono = (w, sz) => `${w} ${sz}px ui-monospace, Menlo, Consolas, monospace`;
  const sans = (w, sz) => `${w} ${sz}px system-ui, sans-serif`;

  // Compass tape across the top.
  const hdg = Math.round(((p.heading % 360) + 360) % 360);
  ctx.save();
  ctx.fillStyle = 'rgba(8,18,32,0.55)';
  ctx.fillRect(W / 2 - 190, 0, 380, 54);
  ctx.strokeStyle = 'rgba(125,249,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 190, 54);
  ctx.lineTo(W / 2 + 190, 54);
  ctx.stroke();
  for (let d = -60; d <= 60; d += 15) {
    const deg = ((Math.round(p.heading / 15) * 15 + d) % 360 + 360) % 360;
    const x = W / 2 + d * 2.6;
    const major = deg % 90 === 0;
    ctx.strokeStyle = 'rgba(220,245,255,0.8)';
    ctx.beginPath();
    ctx.moveTo(x, 30);
    ctx.lineTo(x, major ? 18 : 24);
    ctx.stroke();
    if (major) {
      const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : 'W';
      text(ctx, label, x, 12, sans('bold', 11), '#dff6ff', 'center');
    }
  }
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 6, 30);
  ctx.lineTo(W / 2 + 6, 30);
  ctx.lineTo(W / 2, 40);
  ctx.closePath();
  ctx.fill();
  text(ctx, String(hdg).padStart(3, '0') + '°', W / 2, 47, mono('bold', 12), '#ffd94a', 'center');
  ctx.restore();

  // Left instruments: altitude, speed.
  panel(ctx, 12, 12, 168, 92);
  text(ctx, 'ALT', 24, 30, sans('bold', 11), '#8fd8ff');
  text(ctx, `${Math.round(p.alt * 12)} FT`, 24, 52, mono('bold', 20), '#eafcff');
  text(ctx, 'SPD', 24, 76, sans('bold', 11), '#8fd8ff');
  text(ctx, `${Math.round(p.speed * 1.9)} KT`, 24, 94, mono('bold', 20), '#eafcff');

  // Right: score, best, lives, sortie objective.
  panel(ctx, W - 192, 12, 180, 92);
  text(ctx, 'SCORE', W - 180, 30, sans('bold', 11), '#8fd8ff');
  text(ctx, String(Math.floor(p.score)), W - 180, 52, mono('bold', 20), '#eafcff');
  text(ctx, `BEST ${Math.floor(G.best)}`, W - 180, 76, sans('bold', 11), '#ffd94a');
  for (let k = 0; k < 3; k++) {
    const lx = W - 58 + k * 20;
    ctx.fillStyle = k < p.lives ? '#ff5a4a' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(lx, 88);
    ctx.lineTo(lx + 5, 80);
    ctx.lineTo(lx + 10, 88);
    ctx.lineTo(lx + 5, 92);
    ctx.closePath();
    ctx.fill();
  }
  const sortie = G.sortie;
  if (G.state === 'fly' || G.state === 'paused' || G.state === 'landed' || G.state === 'sortie') {
    panel(ctx, W - 192, 112, 180, 54);
    text(ctx, sortie.name, W - 180, 128, sans('bold', 12), '#ffd94a');
    text(
      ctx,
      `${sortie.goalKind === 'rings' ? 'Rings' : 'Stars'} ${G.progress}/${sortie.goalCount}`,
      W - 180,
      148,
      sans('bold', 12),
      '#eafcff',
    );
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(W - 180, 156, 156, 5);
    ctx.fillStyle = '#37e08a';
    ctx.fillRect(W - 180, 156, 156 * Math.min(1, G.progress / sortie.goalCount), 5);
  }

  // Attitude indicator, bottom left.
  const ax = 52;
  const ay = H - 56;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, ay, 36, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(ax, ay);
  ctx.rotate(-p.bank * 0.5);
  ctx.translate(0, p.pitchVis * 16);
  ctx.fillStyle = '#4aa3df';
  ctx.fillRect(-40, -40, 80, 40);
  ctx.fillStyle = '#8a6b46';
  ctx.fillRect(-40, 0, 80, 40);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-40, -1, 80, 2);
  ctx.restore();
  ctx.strokeStyle = '#dff6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ax, ay, 36, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(ax - 14, ay);
  ctx.lineTo(ax - 3, ay);
  ctx.lineTo(ax, ay - 4);
  ctx.lineTo(ax + 3, ay);
  ctx.lineTo(ax + 14, ay);
  ctx.closePath();
  ctx.fill();
  text(ctx, 'ATT', ax, ay + 50, sans('bold', 10), '#dff6ff', 'center');

  // Fuel gauge, bottom right.
  const fx = W - 44;
  const fyTop = H - 128;
  const fyH = 84;
  panel(ctx, W - 64, H - 140, 52, 128);
  text(ctx, 'FUEL', W - 38, H - 124, sans('bold', 10), '#8fd8ff', 'center');
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(fx - 8, fyTop, 16, fyH);
  const fuelFrac = p.fuel / CFG.fuelMax;
  const lowFuel = fuelFrac * CFG.fuelMax < CFG.lowFuelAt;
  ctx.fillStyle = lowFuel && Math.floor(G.time * 4) % 2 === 0 ? '#ff3b30' : fuelFrac > 0.5 ? '#37e08a' : '#ffc21c';
  const fh = fyH * fuelFrac;
  ctx.fillRect(fx - 8, fyTop + fyH - fh, 16, fh);
  text(ctx, `${Math.round(p.fuel)}`, W - 38, H - 30, mono('bold', 11), '#eafcff', 'center');

  // Throttle bar, bottom centre.
  const tw = 150;
  const tx = W / 2 - tw / 2;
  const ty = H - 24;
  ctx.fillStyle = 'rgba(8,18,32,0.62)';
  roundRect(ctx, tx - 8, ty - 8, tw + 16, 18, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(tx, ty - 2, tw, 6);
  ctx.fillStyle = '#7df9ff';
  ctx.fillRect(tx, ty - 2, tw * p.throttle, 6);
  text(ctx, 'THR', tx - 34, ty + 1, sans('bold', 10), '#8fd8ff');
  text(ctx, `${Math.round(p.throttle * 100)}%`, tx + tw + 8, ty + 1, mono('bold', 11), '#eafcff');

  // Centre messages, below the top panels so they never cover them.
  let my = 185;
  for (const m of G.msgs) {
    const age = G.time - m.t;
    if (age > 2.2) continue;
    ctx.globalAlpha = age < 1.6 ? 1 : 1 - (age - 1.6) / 0.6;
    text(ctx, m.text, W / 2, my, sans('bold', 26), m.color || '#fff', 'center');
    ctx.globalAlpha = 1;
    my += 32;
  }
  if (lowFuel && G.state === 'fly') {
    text(ctx, 'LOW FUEL — FIND A GREEN RING OR LAND', W / 2, H - 52, sans('bold', 15), '#ff5a4a', 'center');
  }
}

function drawTitle(G, ctx) {
  ctx.fillStyle = 'rgba(6,14,28,0.45)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'CLOUDRUNNER COURIER', W / 2, 128, 'bold 54px system-ui, sans-serif', '#fff', 'center');
  text(ctx, 'A valley delivery flight — rings, stars, storms and one small plane', W / 2, 168, 'bold 17px system-ui, sans-serif', '#cfeeff', 'center');
  const s = G.sortie;
  text(ctx, `SORTIE 1 · ${s.name} — ${s.brief}`, W / 2, 208, 'bold 16px system-ui, sans-serif', '#ffd94a', 'center');
  text(ctx, '← → steer      ↑ ↓ climb / descend      SHIFT throttle up      CTRL throttle down', W / 2, 258, '15px system-ui, sans-serif', '#eafcff', 'center');
  text(ctx, 'Mouse move steers · hold mouse to boost · touch drag steers', W / 2, 284, '15px system-ui, sans-serif', '#eafcff', 'center');
  text(ctx, 'Fly the gold rings · grab stars · dodge mountains, balloons and storms', W / 2, 310, '15px system-ui, sans-serif', '#eafcff', 'center');
  text(ctx, 'Land on the runway to refuel and repair. Three lives — make them count.', W / 2, 334, '15px system-ui, sans-serif', '#eafcff', 'center');
  if (Math.floor(G.time * 1.6) % 2 === 0) {
    text(ctx, 'PRESS ENTER OR TAP TO FLY', W / 2, 398, 'bold 22px system-ui, sans-serif', '#7df9ff', 'center');
  }
  if (G.best > 0) text(ctx, `Best score: ${Math.floor(G.best)}`, W / 2, 438, '15px system-ui, sans-serif', '#ffd94a', 'center');
}

function drawSortieComplete(G, ctx) {
  ctx.fillStyle = 'rgba(6,14,28,0.5)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'SORTIE COMPLETE', W / 2, 200, 'bold 44px system-ui, sans-serif', '#7df9ff', 'center');
  text(ctx, `Bonus +${CFG.sortieScore}`, W / 2, 248, 'bold 20px system-ui, sans-serif', '#ffd94a', 'center');
  text(ctx, `Next: ${G.sortie.name} — ${G.sortie.brief}`, W / 2, 288, '16px system-ui, sans-serif', '#eafcff', 'center');
}

function drawLanded(G, ctx) {
  text(ctx, 'DELIVERED — REFUELLED', W / 2, 200, 'bold 34px system-ui, sans-serif', '#37e08a', 'center');
}

function drawGameOver(G, ctx) {
  ctx.fillStyle = 'rgba(10,8,16,0.55)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'OUT OF PLANES', W / 2, 190, 'bold 48px system-ui, sans-serif', '#ff5a4a', 'center');
  text(ctx, `Final score: ${Math.floor(G.player.score)}`, W / 2, 244, 'bold 22px system-ui, sans-serif', '#fff', 'center');
  text(ctx, `Best: ${Math.floor(G.best)}   ·   Sorties flown: ${G.sortiesDone}`, W / 2, 278, '16px system-ui, sans-serif', '#ffd94a', 'center');
  if (Math.floor(G.time * 1.6) % 2 === 0) {
    text(ctx, 'PRESS R OR TAP TO FLY AGAIN', W / 2, 330, 'bold 20px system-ui, sans-serif', '#7df9ff', 'center');
  }
}

function drawPaused(G, ctx) {
  ctx.fillStyle = 'rgba(6,14,28,0.5)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'PAUSED', W / 2, 240, 'bold 44px system-ui, sans-serif', '#fff', 'center');
  text(ctx, 'Press P to keep flying', W / 2, 286, '16px system-ui, sans-serif', '#cfeeff', 'center');
}

export function render(ctx, G, now) {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (G.shakeT > 0) {
    ctx.translate((Math.random() - 0.5) * 14 * G.shakeT, (Math.random() - 0.5) * 10 * G.shakeT);
  }
  drawSky(G, ctx, now);
  drawGround(G, ctx);
  drawItems(G, ctx, now);
  drawPlaneShadow(G, ctx);
  if (G.state !== 'over') drawPlane(G, ctx, now);
  ctx.restore();

  // Crash flash.
  if (G.flashT > 0) {
    ctx.fillStyle = `rgba(255,120,40,${0.35 * G.flashT})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawHUD(G, ctx);
  if (G.state === 'title') drawTitle(G, ctx);
  else if (G.state === 'sortie') drawSortieComplete(G, ctx);
  else if (G.state === 'landed') drawLanded(G, ctx);
  else if (G.state === 'over') drawGameOver(G, ctx);
  else if (G.state === 'paused') drawPaused(G, ctx);
}
