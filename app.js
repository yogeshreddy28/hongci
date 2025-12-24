const gate = document.getElementById("gate");
const beginBtn = document.getElementById("beginBtn");
const audio = document.getElementById("bgAudio");
const toggleAudio = document.getElementById("toggleAudio");

// Include storySection if present; filter out nulls
const sections = [
  document.getElementById("hero"),
  document.getElementById("wheelSection"),
  document.getElementById("filialSection"),
  document.getElementById("brotherhoodSection"),
  document.getElementById("storySection"),
  document.getElementById("footer"),
].filter(Boolean);

let isMuted = false;

function showAllImmediate() {
  for (const el of sections) el.classList.add("show");
}

function startAudioImmediate() {
  if (!audio) return;
  try {
    audio.volume = 0.18;
    const p = audio.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {
    // ignore
  }
}

function removeGateImmediate() {
  if (gate) gate.remove();
}

function beginNow() {
  // Absolutely no delay: do everything immediately
  startAudioImmediate();
  removeGateImmediate();
  showAllImmediate();
}

if (beginBtn) {
  beginBtn.addEventListener("click", beginNow);
}

// Tap anywhere on the gate card also begins
if (gate) {
  gate.addEventListener("click", (e) => {
    if (e.target === gate) return;
    beginNow();
  });
}

// Mute / Unmute
if (toggleAudio && audio) {
  toggleAudio.addEventListener("click", async () => {
    isMuted = !isMuted;
    audio.muted = isMuted;

    if (!isMuted) {
      try {
        const p = audio.play();
        if (p && typeof p.catch === "function") await p;
      } catch {
        // ignore
      }
      toggleAudio.textContent = "Mute";
    } else {
      toggleAudio.textContent = "Unmute";
    }
  });
}