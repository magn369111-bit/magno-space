// Ouroboros em SVG: a serpente que morde a própria cauda.
// O corpo é calculado por código (afunila da cauda até a cabeça), então o desenho
// é nítido em qualquer tamanho e não depende de imagem externa.
// As cores e a animação ficam no CSS (classes .ouro-*).

const CENTER = 100;
const RADIUS = 66;
const SAMPLES = 160;

const TAU = Math.PI * 2;
const TAIL_START = 0.16; // ponta da cauda, logo depois do topo
const HEAD_END = TAU - 0.03; // focinho, quase tocando a cauda

function point(angle, radius) {
  return [CENTER + radius * Math.sin(angle), CENTER - radius * Math.cos(angle)];
}

function smooth(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

// Espessura do corpo ao longo do trajeto (t de 0 = cauda a 1 = focinho).
function thickness(t) {
  if (t < 0.5) return 1.5 + 13.5 * smooth(t / 0.5); // cauda afunilando
  if (t < 0.9) return 15; // corpo
  if (t < 0.94) return 15 - 3 * smooth((t - 0.9) / 0.04); // pescoço
  if (t < 0.97) return 12 + 8 * smooth((t - 0.94) / 0.03); // crânio
  return 20 - 9 * smooth((t - 0.97) / 0.03); // focinho
}

function bodyPath() {
  const outer = [];
  const inner = [];
  for (let step = 0; step <= SAMPLES; step += 1) {
    const t = step / SAMPLES;
    const angle = TAIL_START + (HEAD_END - TAIL_START) * t;
    const half = thickness(t) / 2;
    outer.push(point(angle, RADIUS + half));
    inner.push(point(angle, RADIUS - half));
  }
  const format = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  return `M ${outer.map(format).join(" L ")} L ${inner.reverse().map(format).join(" L ")} Z`;
}

function spinePath() {
  const points = [];
  for (let step = 0; step <= SAMPLES; step += 1) {
    const t = step / SAMPLES;
    points.push(point(TAIL_START + (HEAD_END - TAIL_START) * t, RADIUS));
  }
  const format = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  return `M ${points.map(format).join(" L ")}`;
}

let cached = "";

export function ouroborosSvg() {
  if (cached) return cached;

  const [eyeX, eyeY] = point(HEAD_END - 0.1, RADIUS - 3);
  const [tongueX, tongueY] = point(HEAD_END + 0.045, RADIUS);
  const [forkAX, forkAY] = point(HEAD_END + 0.11, RADIUS - 5);
  const [forkBX, forkBY] = point(HEAD_END + 0.11, RADIUS + 5);

  const body = bodyPath();
  cached = `
    <svg class="ouro" viewBox="0 0 200 200" role="img" aria-label="Ouroboros: serpente que morde a própria cauda">
      <defs>
        <linearGradient id="ouro-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ff4b5e"/>
          <stop offset="0.55" stop-color="#e11931"/>
          <stop offset="1" stop-color="#7d0c1b"/>
        </linearGradient>
        <clipPath id="ouro-clip"><path d="${body}"/></clipPath>
      </defs>
      <circle class="ouro-halo" cx="${CENTER}" cy="${CENTER}" r="${RADIUS + 22}"/>
      <g class="ouro-spin">
        <path class="ouro-body" d="${body}" fill="url(#ouro-body)"/>
        <path class="ouro-scales" d="${spinePath()}" clip-path="url(#ouro-clip)"/>
        <circle class="ouro-eye" cx="${eyeX.toFixed(2)}" cy="${eyeY.toFixed(2)}" r="1.9"/>
        <path class="ouro-tongue" d="M ${tongueX.toFixed(2)} ${tongueY.toFixed(2)} L ${forkAX.toFixed(2)} ${forkAY.toFixed(2)} M ${tongueX.toFixed(2)} ${tongueY.toFixed(2)} L ${forkBX.toFixed(2)} ${forkBY.toFixed(2)}"/>
      </g>
    </svg>`;
  return cached;
}
