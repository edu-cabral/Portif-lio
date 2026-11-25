const stage = document.querySelector("#bookStage");
const camera = document.querySelector("#bookCamera"); // camada externa: só a câmera (mobile)
const book = document.querySelector("#book");
// Ordem do DOM define a ordem de virada: a capa (#cover) vem primeiro.
const leaves = [document.querySelector("#cover"), ...book.querySelectorAll(".leaf:not(.leaf-cover)")];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const mobileQuery = matchMedia("(max-width: 600px)");

const N = leaves.length;
const ACTIVE = 0.9; // fração da rolagem usada para percorrer todo o livro
const GAP = 4;      // px de espessura entre folhas empilhadas

let pending = false;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const smooth = (t) => t * t * (3 - 2 * t); // ease-in-out
const lerp = (a, b, t) => a + (b - a) * t;

function updateBook() {
  pending = false;
  if (reduceMotion.matches) {
    [stage, camera, book, ...leaves].forEach((el) => el.removeAttribute("style"));
    return;
  }
  const mobile = mobileQuery.matches;
  // Desktop: 1 passo de rolagem por folha. Mobile: 2 passos por folha
  // (virar a folha + ler a página direita), cada um com a câmera em uma página.
  const perLeaf = mobile ? 2 : 1;
  const steps = N * perLeaf;
  stage.style.height = `${100 + (mobile ? 55 : 90) * steps}vh`;

  const rect = stage.getBoundingClientRect();
  const distance = stage.offsetHeight - innerHeight;
  const progress = distance > 0 ? clamp(-rect.top / distance, 0, 1) : 0;
  const t = (progress / ACTIVE) * steps; // 0..steps

  let coverOpen = 0;
  leaves.forEach((leaf, i) => {
    const open = smooth(clamp(t - i * perLeaf, 0, 1)); // 0 = pilha direita, 1 = pilha esquerda
    if (i === 0) coverOpen = open;
    const z = lerp((N - i) * GAP, i * GAP, open);
    leaf.style.transform = `translateZ(${z}px) rotateY(${-180 * open}deg)`;
  });

  const tilt = `rotateX(${7 - progress * 2}deg) rotateZ(-1deg)`;
  if (mobile) {
    // Foco da câmera: 0 = centro da metade direita, 1 = centro da metade esquerda.
    // Durante a virada da folha i a câmera usa a MESMA curva da folha (acompanha a
    // capa/folha até a página que ela revela); depois volta para ler a página direita.
    const u = clamp(t, 0, steps);
    const i = Math.min(Math.floor(u / 2), N - 1);
    const local = u - 2 * i;
    const focus = local <= 1 ? smooth(local) : 1 - smooth(local - 1);
    camera.style.transform = `translateX(${-25 + 50 * focus}%)`;
    book.style.transform = tilt;
  } else {
    camera.style.transform = "";
    // Livro fechado = só a metade direita: desloca 25% para centralizar o que é visível.
    const angle = 180 * coverOpen;
    const shift = 25 * (1 + Math.min(0, Math.cos((angle * Math.PI) / 180)));
    book.style.transform = `translateX(${-shift}%) ${tilt}`;
  }
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
mobileQuery.addEventListener("change", scheduleUpdate);
updateBook();

const pageSteps = {
  apresentacao: 1,
  projetos: 2,
  curriculo: 6,
  contatos: 7
};

document.querySelectorAll("header nav a, footer a").forEach((link) => {
  link.addEventListener("click", (event) => {
    const pageId = link.getAttribute("href").replace("#", "");

    if (pageId === "header") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const targetStep = pageSteps[pageId];

    if (targetStep === undefined) return;

    event.preventDefault();

    const mobile = mobileQuery.matches;
    const perLeaf = mobile ? 2 : 1;
    const steps = N * perLeaf;

    // Converte a página desejada em progresso de rolagem
    const targetProgress = (targetStep / steps) * ACTIVE;

    const stageTop = stage.getBoundingClientRect().top + window.scrollY;
    const scrollDistance = stage.offsetHeight - window.innerHeight;

    const targetScroll = stageTop + targetProgress * scrollDistance;

    window.scrollTo({
      top: targetScroll,
      behavior: "smooth"
    });
  });
});
