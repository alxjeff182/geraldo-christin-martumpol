(() => {
  const app = document.getElementById("app");
  const openBtn = document.getElementById("openBook");
  const closeBtn = document.getElementById("closeBook");
  const pages = document.getElementById("isi");
  const card = document.getElementById("card");
  const flap = document.getElementById("cover");
  const audio = document.getElementById("bgMusic");
  const musicBtn = document.getElementById("musicToggle");

  if (!app || !openBtn || !closeBtn || !pages || !card || !flap) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TURN_MS = 1750;
  // Goodness of God — mulai dari "From the moment that I wake up"
  const MUSIC_START = 45;
  let openTimer = 0;
  let savedPagesScroll = 0;
  let musicEnabled = true;

  const syncNarrow = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    app.classList.toggle("is-narrow", w < 820);
    app.classList.toggle("is-landscape-mobile", h <= 500 && w <= 960);
  };

  syncNarrow();
  window.addEventListener("resize", syncNarrow, { passive: true });

  const syncMusicUi = () => {
    if (!musicBtn || !audio) return;
    const playing = !audio.paused && !audio.ended;
    musicBtn.classList.toggle("is-playing", playing);
    musicBtn.setAttribute("aria-pressed", playing ? "true" : "false");
    musicBtn.setAttribute("aria-label", playing ? "Stop musik" : "Putar musik");
    const playIcon = musicBtn.querySelector(".music-fab__icon--play");
    const stopIcon = musicBtn.querySelector(".music-fab__icon--stop");
    if (playIcon) playIcon.hidden = playing;
    if (stopIcon) stopIcon.hidden = !playing;
  };

  const seekToMusicStart = () => {
    if (!audio) return;
    try {
      audio.currentTime = MUSIC_START;
    } catch {
      /* ignore until metadata ready */
    }
  };

  const playMusic = (forceStart = false) => {
    if (!audio || !musicEnabled) return;

    const start = () => {
      if (forceStart || audio.currentTime < MUSIC_START - 0.5 || audio.ended) {
        seekToMusicStart();
      }
      const result = audio.play();
      if (result && typeof result.then === "function") {
        result.then(syncMusicUi).catch(() => syncMusicUi());
      } else {
        syncMusicUi();
      }
    };

    if (audio.readyState >= 1) start();
    else audio.addEventListener("loadedmetadata", start, { once: true });
  };

  const stopMusic = () => {
    if (!audio) return;
    audio.pause();
    syncMusicUi();
  };

  const setOpen = (open) => {
    window.clearTimeout(openTimer);
    card.style.transform = "";
    syncNarrow();

    if (!open) {
      savedPagesScroll = pages.scrollTop;
      document.body.classList.remove("is-open");
      pages.setAttribute("aria-hidden", "true");
      if (musicBtn) musicBtn.hidden = true;
      stopMusic();

      const finishClose = () => {
        openTimer = window.setTimeout(
          () => {
            app.dataset.state = "closed";
            openBtn.focus({ preventScroll: true });
          },
          reduceMotion ? 0 : TURN_MS,
        );
      };

      app.dataset.state = "closing";
      finishClose();
      return;
    }

    app.dataset.state = "opening";
    document.body.classList.add("is-open");
    pages.setAttribute("aria-hidden", "false");
    if (musicBtn) musicBtn.hidden = false;
    musicEnabled = true;
    playMusic(true);

    openTimer = window.setTimeout(
      () => {
        app.dataset.state = "open";
        pages.focus({ preventScroll: true });
        pages.scrollTop = savedPagesScroll;
      },
      reduceMotion ? 0 : TURN_MS,
    );
  };

  openBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(true);
  });
  closeBtn.addEventListener("click", () => setOpen(false));

  flap.addEventListener("click", () => {
    if (app.dataset.state === "closed") setOpen(true);
  });

  if (musicBtn && audio) {
    musicBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (audio.paused) {
        musicEnabled = true;
        playMusic();
      } else {
        musicEnabled = false;
        stopMusic();
      }
    });
    audio.addEventListener("play", syncMusicUi);
    audio.addEventListener("pause", syncMusicUi);
    audio.addEventListener("ended", () => {
      syncMusicUi();
      if (!musicEnabled) return;
      playMusic(true);
    });
    syncMusicUi();
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && app.dataset.state !== "closed") {
      setOpen(false);
    }
    if ((event.key === "Enter" || event.key === " ") && app.dataset.state === "closed") {
      if (document.activeElement === openBtn || document.activeElement === flap) {
        event.preventDefault();
        setOpen(true);
      }
    }
  });

  if (!reduceMotion) {
    let ticking = false;
    window.addEventListener(
      "pointermove",
      (event) => {
        if (app.dataset.state !== "closed" || ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const nx = (event.clientX / window.innerWidth - 0.5) * 2;
          const ny = (event.clientY / window.innerHeight - 0.5) * 2;
          card.style.transform = `rotateY(${nx * 3}deg) rotateX(${ny * -2.5}deg)`;
          ticking = false;
        });
      },
      { passive: true },
    );

    window.addEventListener("pointerleave", () => {
      if (app.dataset.state === "closed") card.style.transform = "";
    });
  }
})();
