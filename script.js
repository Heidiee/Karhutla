const story = document.getElementById("story");
const pages = ["home-page", "story"];

let currentScene = 1;
let isAnimating = false;

const maxScene = 20;
const copyByScene = [...document.querySelectorAll(".story-copy")].reduce(
  (copies, copy) => {
    const scene = Number(copy.className.match(/story-copy-(\d+)/)[1]);
    copies[scene] = copy;
    return copies;
  },
  {},
);

const SCENE_MS = 1200;
const designWidth = 1440;
const designHeight = 1018;
const cameraKeyframes = {
  6: [-1, -980, 1.777],
  7: [-1000, -980, 1.777],
  8: [-673, -170, 1.777],
  9: [-1462, -363, 2.562],
  10: [-1629, -751, 2.199],
  11: [-1629, -751, 2.199],
  12: [-116, -1012, 2.16],
  13: [-116, -1738, 2.874],
  14: [-1000, -233, 2.874],
  15: [-36, 0, 1.5],
  16: [0, 0, 1],
  17: [0, 0, 1],
  18: [0, 0, 1],
  19: [0, 0, 1],
  20: [0, 0, 1],
};
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let typewriterRun = 0;
const fireSound = document.getElementById("fire-sound");
const backgroundMusic = document.getElementById("background-music");
const narration = document.getElementById("narration");
const narrationToggle = document.querySelector(".narration-toggle");
const narrationFiles = [
  "narration_scene1.mp4",
  "narration_scene2.mp4",
  "narration_scene3.mp4",
  "narration_scene4.mp4",
  "narrative_scene5.mp4",
  "narrative_scene6.mp4",
  "narration_scene7.mp4",
  "narration_scene8.mp4",
  "narration_scene9.mp4",
  "narrative_scene10.mp4",
  "narrative_scene11.mp4",
  "narration_scene12.mp4",
  "narration_scene13.mp4",
  "narration_scene14.mp4",
  "narrative_scene15.mp4",
];
let narrationMuted = false;
let narrationNeedsGesture = false;
let narrationRequest = 0;
let narrationAudioContext;
let narrationAmplificationUnavailable = false;

const amplifyNarration = () => {
  if (narrationAmplificationUnavailable) return;
  if (!narrationAudioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      const context = new AudioContext();
      const gain = context.createGain();
      gain.gain.value = 1.2;
      gain.connect(context.destination);
      context.createMediaElementSource(narration).connect(gain);
      narrationAudioContext = context;
    } catch (error) {
      narrationAmplificationUnavailable = true;
      console.warn("Narration amplification is unavailable:", error);
      return;
    }
  }
  if (
    narrationAudioContext.state === "suspended" &&
    (!navigator.userActivation || navigator.userActivation.hasBeenActive)
  ) {
    narrationAudioContext.resume().then(() => {
      if (!narrationMuted && story.classList.contains("is-active")) {
        narrationNeedsGesture = false;
        narrationToggle.setAttribute("aria-label", "Mute narration");
      }
    }).catch((error) => {
      console.warn("Narration audio could not resume:", error);
    });
  }
};

const playNarration = () => {
  if (narrationMuted || !story.classList.contains("is-active")) return;
  amplifyNarration();
  const request = ++narrationRequest;
  narrationNeedsGesture = !!narrationAudioContext && narrationAudioContext.state !== "running";
  narrationToggle.setAttribute("aria-label", narrationNeedsGesture ? "Play narration" : "Mute narration");
  narration.play().then(() => {
    if (request !== narrationRequest || !narrationNeedsGesture) return;
    if (!narrationAudioContext || narrationAudioContext.state === "running") {
      narrationNeedsGesture = false;
      narrationToggle.setAttribute("aria-label", "Mute narration");
    } else {
      narration.pause();
    }
  }).catch((error) => {
    if (request !== narrationRequest) return;
    if (error.name === "NotAllowedError") {
      narrationNeedsGesture = true;
      narrationToggle.setAttribute("aria-label", "Play narration");
    } else if (error.name !== "AbortError") {
      console.warn("Narration could not start:", error);
    }
  });
};

const stopNarration = () => {
  narrationRequest++;
  narrationNeedsGesture = false;
  narration.pause();
};

const setNarrationScene = (scene) => {
  stopNarration();
  const narrationFile = narrationFiles[scene - 1];
  narrationToggle.disabled = !narrationFile;
  if (!narrationFile) {
    narration.removeAttribute("src");
    narration.load();
    narrationToggle.setAttribute("aria-label", "Narration unavailable");
    return;
  }
  narrationToggle.setAttribute("aria-label", "Mute narration");
  narration.src = `narration/${narrationFile}`;
  narration.load();
  playNarration();
};

narrationToggle.addEventListener("click", () => {
  if (narrationNeedsGesture && !narrationMuted) {
    playNarration();
    return;
  }
  narrationMuted = !narrationMuted;
  narrationToggle.setAttribute("aria-label", narrationMuted ? "Unmute narration" : "Mute narration");
  narrationToggle.querySelector("img").src = narrationMuted
    ? "assets/narration-volume-off.svg"
    : "assets/narration-volume-on.svg";
  if (narrationMuted) stopNarration();
  else playNarration();
});

document.addEventListener("pointerdown", (event) => {
  if (!narrationMuted && story.classList.contains("is-active"))
    amplifyNarration();
  if (narrationNeedsGesture && !event.target.closest(".narration-toggle"))
    playNarration();
});

const MUSIC_FADE_MS = 1200;
let backgroundMusicFadeTimer;
let backgroundMusicRequest = 0;
let backgroundMusicWanted = false;
let backgroundMusicNeedsGesture = false;
backgroundMusic.volume = 0;

const fadeBackgroundMusic = (targetVolume, onComplete) => {
  window.clearTimeout(backgroundMusicFadeTimer);
  const startVolume = backgroundMusic.volume;
  const startedAt = performance.now();
  const step = () => {
    const progress = Math.min((performance.now() - startedAt) / MUSIC_FADE_MS, 1);
    backgroundMusic.volume = startVolume + (targetVolume - startVolume) * progress;
    if (progress < 1) backgroundMusicFadeTimer = window.setTimeout(step, 50);
    else if (onComplete) onComplete();
  };
  step();
};

const startBackgroundMusic = () => {
  if (!backgroundMusicWanted) return;
  window.clearTimeout(backgroundMusicFadeTimer);
  if (backgroundMusic.ended) backgroundMusic.currentTime = 0;
  if (!backgroundMusic.paused) {
    fadeBackgroundMusic(1);
    return;
  }
  const request = ++backgroundMusicRequest;
  backgroundMusicNeedsGesture = false;
  backgroundMusic.play().then(() => {
    if (request === backgroundMusicRequest && backgroundMusicWanted) fadeBackgroundMusic(1);
  }).catch((error) => {
    if (request !== backgroundMusicRequest) return;
    if (error.name === "NotAllowedError") backgroundMusicNeedsGesture = true;
    else if (error.name !== "AbortError") console.warn("Background music could not start:", error);
  });
};

const stopBackgroundMusic = (fade = false) => {
  backgroundMusicWanted = false;
  backgroundMusicNeedsGesture = false;
  backgroundMusicRequest++;
  const stop = () => {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    backgroundMusic.volume = 0;
  };
  if (fade && !backgroundMusic.paused) fadeBackgroundMusic(0, stop);
  else {
    window.clearTimeout(backgroundMusicFadeTimer);
    stop();
  }
};

const updateBackgroundMusic = (scene) => {
  if (scene >= 4) {
    if (!backgroundMusicWanted) {
      backgroundMusicWanted = true;
      startBackgroundMusic();
    } else if (backgroundMusicNeedsGesture) {
      startBackgroundMusic();
    }
  } else if (backgroundMusicWanted || !backgroundMusic.paused) {
    stopBackgroundMusic(true);
  }
};

const FIRE_VOLUME = 0.2;
fireSound.volume = 0;
let fireFadeTimer;
let fireStopTimer;
let fireContext;
let fireGain;
let fireBufferPromise;
let fireSource;
let fireWanted = false;
let fireRequest = 0;

const fadeFireSound = (targetVolume, duration = MUSIC_FADE_MS) => {
  window.clearTimeout(fireFadeTimer);
  const startVolume = fireSound.volume;
  const startedAt = performance.now();
  const step = () => {
    const progress = Math.min((performance.now() - startedAt) / duration, 1);
    fireSound.volume = startVolume + (targetVolume - startVolume) * progress;
    if (fireGain) fireGain.gain.value = fireSound.volume;
    if (progress < 1) fireFadeTimer = window.setTimeout(step, 50);
  };
  step();
};

const startFireSound = () => {
  if (!fireSound || !fireWanted) return;
  window.clearTimeout(fireStopTimer);
  if (fireSource) {
    if (fireContext.state === "suspended") {
      fireContext.resume().catch((error) => console.warn("Fire sound could not resume:", error));
    }
    fadeFireSound(FIRE_VOLUME);
    return;
  }
  const request = ++fireRequest;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const fallback = (error) => {
    if (request !== fireRequest || !fireWanted) return;
    if (error) console.warn("Seamless fire loop is unavailable:", error);
    fireSound.play().then(() => {
      if (request === fireRequest && fireWanted) fadeFireSound(FIRE_VOLUME);
      else fireSound.pause();
    }).catch((playError) => console.warn("Fire sound could not start:", playError));
  };
  if (!AudioContext) {
    fallback();
    return;
  }
  try {
    if (!fireContext) {
      fireContext = new AudioContext();
      fireGain = fireContext.createGain();
      fireGain.gain.value = fireSound.volume;
      fireGain.connect(fireContext.destination);
    }
    if (fireContext.state === "suspended") {
      if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
      fireContext.resume().catch(fallback);
    }
    if (!fireBufferPromise) {
      fireBufferPromise = fetch(fireSound.src)
        .then((response) => {
          if (!response.ok) throw new Error(`Fire audio request failed: ${response.status}`);
          return response.arrayBuffer();
        })
        .then((data) => fireContext.decodeAudioData(data));
    }
    fireBufferPromise.then((buffer) => {
      if (request !== fireRequest || !fireWanted || fireSource) return;
      const source = fireContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(fireGain);
      source.start();
      fireSource = source;
      fireSound.pause();
      fadeFireSound(FIRE_VOLUME);
    }).catch((error) => {
      fireBufferPromise = null;
      fallback(error);
    });
  } catch (error) {
    fallback(error);
  }
};

const stopFireSound = () => {
  fireWanted = false;
  fireRequest++;
  window.clearTimeout(fireStopTimer);
  window.clearTimeout(fireFadeTimer);
  if (fireSource) {
    fireSource.stop();
    fireSource.disconnect();
    fireSource = null;
  }
  fireSound.pause();
  fireSound.currentTime = 0;
  fireSound.volume = 0;
  if (fireGain) fireGain.gain.value = 0;
};

const updateFireSound = (scene, previousScene, animate) => {
  if (scene >= 4) {
    fireWanted = true;
    startFireSound();
  } else if (previousScene >= 4 && animate && fireWanted) {
    fireRequest++;
    fadeFireSound(0);
    fireStopTimer = window.setTimeout(stopFireSound, MUSIC_FADE_MS);
  } else {
    stopFireSound();
  }
};

const typeSceneCopy = (scene) => {
  const run = ++typewriterRun;
  Object.values(copyByScene).forEach((copy) => {
    copy.classList.remove("is-typing");
    copy.textContent = "";
    copy.style.minHeight = "";
  });
  const copy = copyByScene[scene];
  if (!copy) return;

  const words = copy.dataset.fullText.trim().split(/\s+/);
  copy.classList.add("is-typing");
  let index = 0;
  const typeNext = () => {
    if (run !== typewriterRun) return;
    if (index >= words.length) {
      copy.classList.remove("is-typing");
      return;
    }
    copy.textContent = words.slice(0, ++index).join(" ");
    const progress = index / words.length;
    const easeInOut = 0.5 - Math.cos(progress * Math.PI) / 2;
    const delay = 85 + easeInOut * 65;
    window.setTimeout(typeNext, delay);
  };
  typeNext();
};

const setPage = (pageId, pushHistory = true) => {
  const home = document.getElementById("home-page");
  const isStory = pageId === "story";
  home.classList.toggle("is-hidden", isStory);
  story.classList.toggle("is-active", isStory);
  if (!isStory) {
    typewriterRun++;
    document.body.className = document.body.className
      .replace(/\bstory-scene-\d+\b/g, "")
      .replace(/\b(?:story-full-motion|story-transitioning|home-to-story|zoom-4-5|zoom-5-4|zoom-5-4-start|burning)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    document.documentElement.classList.remove("story-locked");
    stopNarration();
    stopFireSound();
    stopBackgroundMusic(true);
  }
  if (pushHistory)
    history.pushState({ pageId }, "", isStory ? "#scene-1" : "#home");
  if (pageId === "home-page") window.scrollTo(0, 0);
};

const applyCamera = (scene, immediate = false) => {
  const frame = cameraKeyframes[scene];
  const camera = document.querySelector(".story-camera");
  const canvas = camera?.parentElement;
  if (!frame || !camera) {
    camera?.style.removeProperty("--cam-x");
    camera?.style.removeProperty("--cam-y");
    camera?.style.removeProperty("--cam-s");
    canvas?.style.removeProperty("--cam-x");
    canvas?.style.removeProperty("--cam-y");
    canvas?.style.removeProperty("--cam-s");
    return;
  }
  const isIllustratedScene = scene >= 16;
  const frameHeight = isIllustratedScene ? 1024 : designHeight;
  const scale = isIllustratedScene
    ? Math.min(innerWidth / designWidth, innerHeight / frameHeight)
    : Math.max(innerWidth / designWidth, innerHeight / frameHeight);
  const offsetX = (innerWidth - designWidth * scale) / 2;
  const offsetY = (innerHeight - frameHeight * scale) / 2;
  const [x, y, s] = frame;
  const scaled = s * scale;
  const tx = isIllustratedScene ? offsetX : Math.max(
    innerWidth - designWidth * scaled,
    Math.min(0, x * scale + offsetX),
  );
  const ty = isIllustratedScene ? offsetY : Math.max(
    innerHeight - frameHeight * scaled,
    Math.min(0, y * scale + offsetY),
  );
  if (immediate) {
    camera.classList.add("is-resizing");
    requestAnimationFrame(() =>
      requestAnimationFrame(() => camera.classList.remove("is-resizing")),
    );
  }
  [camera, canvas].forEach((target) => {
    target.style.setProperty("--cam-x", `${tx}px`);
    target.style.setProperty("--cam-y", `${ty}px`);
    target.style.setProperty("--cam-s", scaled);
  });
};

let resizeFrame = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => applyCamera(currentScene, true));
});

const setScene = (
  scene,
  pushHistory = true,
  animate = true,
  preserveScroll = window.scrollY,
) => {
  if (
    scene === currentScene &&
    story.classList.contains("is-active") &&
    animate
  )
    return;
  const previousScene = currentScene;
  const wasStoryActive = story.classList.contains("is-active");
  const isZoomForward =
    previousScene === 4 && scene === 5 && animate && !reducedMotion.matches;
  const isZoomBack =
    previousScene === 5 && scene === 4 && animate && !reducedMotion.matches;
  const wasZoom = isZoomForward || isZoomBack;
  const camera = document.querySelector(".story-camera");
  const leavingLayers = document.querySelectorAll(
    `.story-art-${previousScene}, .story-frame-${previousScene}`,
  );
  const incomingLayers = document.querySelectorAll(
    `.story-art-${scene}, .story-frame-${scene}`,
  );
  leavingLayers.forEach((layer) => layer.classList.add("is-leaving"));
  incomingLayers.forEach((layer) => layer.classList.add("is-current"));
  Object.values(copyByScene).forEach((copy) => {
    copy.classList.remove("is-typing");
    copy.textContent = "";
  });
  currentScene = scene;
  applyCamera(scene);
  updateFireSound(scene, previousScene, animate);
  updateBackgroundMusic(scene);
  if (
    (scene < 5 || isZoomForward || isZoomBack) &&
    animate &&
    !reducedMotion.matches
  ) {
    const run = ++typewriterRun;
    window.setTimeout(() => {
      if (run === typewriterRun && currentScene === scene) typeSceneCopy(scene);
    }, SCENE_MS);
  } else {
    typeSceneCopy(scene);
  }
  document
    .querySelectorAll(
      '[class*="story-art-"], [class*="story-frame-"], [class*="story-copy-"]',
    )
    .forEach((layer) => layer.classList.remove("is-current"));
  document
    .querySelectorAll(
      `.story-art-${scene}, .story-frame-${scene}, .story-copy-${scene}`,
    )
    .forEach((layer) => layer.classList.add("is-current"));
  if (reducedMotion.matches) {
    document
      .querySelectorAll(".is-leaving")
      .forEach((layer) => layer.classList.remove("is-leaving"));
  } else {
    window.setTimeout(
      () =>
        document
          .querySelectorAll(".is-leaving")
          .forEach((layer) => layer.classList.remove("is-leaving")),
      SCENE_MS,
    );
  }
  const pageNumber = document.querySelector(".story-page-number");
  if (pageNumber) pageNumber.textContent = String(scene);
  document.body.className = document.body.className
    .replace(/\bstory-scene-\d+\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  document.body.classList.remove("zoom-4-5", "zoom-5-4", "zoom-5-4-start");
  if (isZoomForward) document.body.classList.add("zoom-4-5");
  if (isZoomBack) document.body.classList.add("zoom-5-4", "zoom-5-4-start");
  if (scene > 1 && scene <= maxScene && !isZoomForward && !isZoomBack)
    document.body.classList.add(`story-scene-${scene}`);
  document.documentElement.classList.toggle("story-locked", scene >= 5);
  document.body.classList.toggle("story-full-motion", scene >= 5);
  document.body.classList.remove("burning");
  document.body.classList.toggle(
    "story-transitioning",
    animate && scene > 1 && !isZoomForward && !isZoomBack,
  );
  document.body.classList.toggle("home-to-story", animate && scene === 1);
  setPage("story", false);
  if (scene !== previousScene || !wasStoryActive) setNarrationScene(scene);

  if (isZoomBack && camera) {
    void camera.offsetWidth; // commit the zoomed-in start state
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.body.classList.remove("zoom-5-4-start"),
      ),
    );
  }

  if (pushHistory)
    history.pushState({ pageId: `scene-${scene}` }, "", `#scene-${scene}`);
  requestAnimationFrame(() => {
    window.scrollTo({
      top: preserveScroll,
      left: window.scrollX,
      behavior: "auto",
    });
    requestAnimationFrame(() =>
      window.scrollTo({
        top: preserveScroll,
        left: window.scrollX,
        behavior: "auto",
      }),
    );
  });
  if (animate && scene === 1) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.body.classList.add("home-to-story");
      }),
    );
  }
  if (animate) {
    isAnimating = true;
    window.setTimeout(() => {
      isAnimating = false;
      if (wasZoom && camera) {
        camera.style.transition = "none";
        void camera.offsetWidth;
      }
      document.body.classList.remove(
        "story-transitioning",
        "home-to-story",
        "zoom-4-5",
        "zoom-5-4",
      );
      if (currentScene > 1)
        document.body.classList.add(`story-scene-${currentScene}`);
      document.documentElement.classList.toggle(
        "story-locked",
        currentScene >= 5,
      );
      if (wasZoom && camera) {
        requestAnimationFrame(() => {
          camera.style.transition = "";
        });
      }
    }, SCENE_MS + 100);
  }
};

const startStoryAudioFromGesture = () => {
  if (fireWanted) startFireSound();
  if (backgroundMusicNeedsGesture) startBackgroundMusic();
};

document.addEventListener("pointerdown", startStoryAudioFromGesture);

document.querySelector("[data-go-back]")?.addEventListener("click", () => {
  if (currentScene > 1 && !isAnimating) {
    setScene(currentScene - 1, true, true);
  }
});

document.querySelectorAll("[data-go-to]").forEach((control) => {
  control.addEventListener("click", () => {
    if (isAnimating) return;
    const target = control.dataset.goTo;
    const scrollPosition = window.scrollY;
    if (target === "scene-1") setScene(1, true, true, scrollPosition);
    if (target === "scene-2") {
      if (currentScene === maxScene) setPage("home-page");
      else setScene(currentScene + 1, true, true, scrollPosition);
    }
  });
});

document.querySelectorAll("[data-scene-step]").forEach((control) => {
  control.addEventListener("click", () => {
    if (isAnimating) return;
    const targetScene = currentScene + Number(control.dataset.sceneStep);
    if (targetScene > maxScene) setPage("home-page", true);
    else if (targetScene >= 1) setScene(targetScene, true, true);
  });
});

document.querySelector("[data-end-documentary]")?.addEventListener("click", () => {
  if (!isAnimating) setPage("home-page", true);
});

window.addEventListener("popstate", () => {
  const hash = location.hash.slice(1);
  const sceneMatch = hash.match(/^scene-(\d{1,2})$/);
  if (sceneMatch && Number(sceneMatch[1]) <= maxScene)
    setScene(Number(sceneMatch[1]), false, true);
  else if (hash === "scene-1") setScene(1, false, false);
  else setPage("home-page", false);
});

const initialHash = location.hash.slice(1);
const initialScene = initialHash.match(/^scene-(\d{1,2})$/);
if (initialScene && Number(initialScene[1]) <= maxScene)
  setScene(Number(initialScene[1]), false, false);
else if (initialHash === "scene-1") setScene(1, false, false);
else setPage("home-page", false);
