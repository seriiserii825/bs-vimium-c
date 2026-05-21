const VELOCITY = 600  // px/s while key held
const DECEL    = 6000 // px/s² linear deceleration after keyup (~100ms coast)

let vel    = 0     // current velocity, signed (px/s)
let active = false // is scroll key currently held
let lastTime = 0
let rafId: number | null = null

export function startScroll(direction: 1 | -1): void {
  vel = direction * VELOCITY
  active = true
  if (rafId !== null) return // already ticking
  lastTime = performance.now()
  rafId = requestAnimationFrame(tick)
}

export function stopScroll(): void {
  active = false // tick() will decelerate and stop
}

function tick(now: number): void {
  const dt = Math.min(now - lastTime, 50) / 1000 // seconds, cap for tab switch
  lastTime = now

  if (!active) {
    const sign = Math.sign(vel)
    vel -= sign * DECEL * dt
    if (Math.sign(vel) !== sign) { // crossed zero → done
      vel = 0
      rafId = null
      return
    }
  }

  window.scrollBy(0, vel * dt)
  rafId = requestAnimationFrame(tick)
}
