/** Screen-space move for an overhead camera. +x is right, +y is down.
 *  A / ArrowLeft decreases x (ship slides left on screen).
 *  D / ArrowRight increases x. W / ArrowUp decreases y. S increases y.
 *  This is translation, not chase-cam yaw.
 */
export function moveVector(held: ReadonlySet<string>): { x: number; y: number } {
  let x = 0;
  let y = 0;
  if (held.has("KeyA") || held.has("ArrowLeft")) x -= 1;
  if (held.has("KeyD") || held.has("ArrowRight")) x += 1;
  if (held.has("KeyW") || held.has("ArrowUp")) y -= 1;
  if (held.has("KeyS") || held.has("ArrowDown")) y += 1;
  const m = Math.hypot(x, y);
  if (m > 1) {
    x /= m;
    y /= m;
  }
  return { x, y };
}

/** Radial stick deadzone with edge remapped to full magnitude. */
export function radialDeadzone(x: number, y: number, dz = 0.18): { x: number; y: number } {
  const m = Math.hypot(x, y);
  if (m < dz || m === 0) return { x: 0, y: 0 };
  const scale = (m - dz) / ((1 - dz) * m);
  return { x: x * scale, y: y * scale };
}
