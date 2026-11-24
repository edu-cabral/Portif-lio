const stage = document.querySelector("#bookStage");
const book = document.querySelector("#book");
// Ordem do DOM define a ordem de virada: a capa (#cover) vem primeiro.
const leaves = [document.querySelector("#cover"), ...book.querySelectorAll(".leaf:not(.leaf-cover)")];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const N = leaves.length;
const ACTIVE = 0.9;   // fração da rolagem usada para virar todas as folhas
const GAP = 4;        // px de espessura entre folhas empilhadas
const SCROLL_PER_LEAF = 90; // vh de rolagem por folha

let pending = false;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const smooth = (t) => t * t * (3 - 2 * t); // ease-in-out
const lerp = (a, b, t) => a + (b - a) * t;

function updateBook() {
  pending = false;
  if (reduceMotion.matches) {
    [stage, book, ...leaves].forEach((el) => el.removeAttribute("style"));
    return;
  }
  stage.style.height = `${100 + SCROLL_PER_LEAF * N}vh`;

  const rect = stage.getBoundingClientRect();
  const distance = stage.offsetHeight - innerHeight;
  const progress = distance > 0 ? clamp(-rect.top / distance, 0, 1) : 0;

  let coverOpen = 0;
  leaves.forEach((leaf, i) => {
    // Cada folha tem o seu trecho da rolagem: 0 = na pilha direita, 1 = na pilha esquerda.
    const open = smooth(clamp((progress * N) / ACTIVE - i, 0, 1));
    if (i === 0) coverOpen = open;
    // Empilhamento: não viradas, a folha 0 fica por cima; viradas, a última fica por cima.
    const z = lerp((N - i) * GAP, i * GAP, open);
    leaf.style.transform = `translateZ(${z}px) rotateY(${-180 * open}deg)`;
  });

  // Centralização: só a capa muda o que está visível (ver comentário da versão anterior).
  const angle = 180 * coverOpen;
  const shift = 25 * (1 + Math.min(0, Math.cos((angle * Math.PI) / 180)));
  book.style.transform = `translateX(${-shift}%) rotateX(${7 - progress * 2}deg) rotateZ(-1deg)`;
  book.style.setProperty("--open", coverOpen.toFixed(3));
}

function scheduleUpdate() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(updateBook);
}

addEventListener("scroll", scheduleUpdate, { passive: true });
addEventListener("resize", scheduleUpdate);
reduceMotion.addEventListener("change", scheduleUpdate);
updateBook();
