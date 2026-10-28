        const story = document.getElementById('story');
        const pages = ['home-page', 'story'];

        let currentScene = 1;
        let isAnimating = false;

        const maxScene = 15;
        const copyByScene = [...document.querySelectorAll('.story-copy')].reduce((copies, copy) => {
            const scene = Number(copy.className.match(/story-copy-(\d+)/)[1]);
            copies[scene] = copy;
            return copies;
        }, {});

        const SCENE_MS = 1200;
        const designWidth = 1440;
        const designHeight = 1018;
        const cameraKeyframes = {
            6: [-1, -980, 1.777], 7: [-1000, -980, 1.777], 8: [-673, -170, 1.777],
            9: [-1462, -363, 2.562], 10: [-1629, -751, 2.199], 11: [-1629, -751, 2.199],
            12: [-116, -1012, 2.16], 13: [-116, -1738, 2.874], 14: [-1000, -233, 2.874], 15: [-36, 0, 1.5]
        };
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let typewriterRun = 0;
        const fireSound = document.getElementById('fire-sound');
        const MUSIC_FADE_MS = 1200;
        let musicFadeTimer;

        const fadeFireSound = (targetVolume, duration = MUSIC_FADE_MS) => {
            if (!fireSound) return;
            window.clearInterval(amusicFadeTimer);
            const startVolume = fireSound.volume;
            const startedAt = performance.now();
            const step = () => {
                const progress = Math.min((performance.now() - startedAt) / duration, 1);
                fireSound.volume = startVolume + (targetVolume - startVolume) * progress;
                if (progress < 1) musicFadeTimer = window.setTimeout(step, 50);
            };
            step();
        };

        const updateFireSound = (scene, animate) => {
            if (!fireSound) return;
            if (scene >= 4) {
                fireSound.volume = fireSound.volume || 0;
                const playRequest = fireSound.play();
                if (playRequest) playRequest.then(() => fadeFireSound(1)).catch((error) => console.warn('Fire sound could not start:', error));
            } else if (currentScene >= 4 && animate) {
                fadeFireSound(0);
                window.setTimeout(() => {
                    if (currentScene < 4) fireSound.pause();
                }, MUSIC_FADE_MS);
            } else {
                fireSound.pause();
                fireSound.currentTime = 0;
                fireSound.volume = 0;
            }
        };

        const typeSceneCopy = (scene) => {
            const run = ++typewriterRun;
            Object.values(copyByScene).forEach((copy) => {
                copy.classList.remove('is-typing');
                copy.textContent = '';
                copy.style.minHeight = '';
            });
            const copy = copyByScene[scene];
            if (!copy) return;
            
            const words = copy.dataset.fullText.trim().split(/\s+/);
            copy.classList.add('is-typing');
            let index = 0;
            const typeNext = () => {
                if (run !== typewriterRun) return;
                if (index >= words.length) {
                    copy.classList.remove('is-typing');
                    return;
                }
                copy.textContent = words.slice(0, ++index).join(' ');
                const progress = index / words.length;
                const easeInOut = 0.5 - Math.cos(progress * Math.PI) / 2;
                const delay = 85 + easeInOut * 65;
                window.setTimeout(typeNext, delay);
            };
            typeNext();
        };

        const setPage = (pageId, pushHistory = true) => {
            const home = document.getElementById('home-page');
            const isStory = pageId === 'story';
            home.classList.toggle('is-hidden', isStory);
            story.classList.toggle('is-active', isStory);
            if (pushHistory) history.pushState({ pageId }, '', isStory ? '#scene-1' : '#home');
            if (pageId === 'home-page') window.scrollTo(0, 0);
        };

        const applyCamera = (scene, immediate = false) => {
            const frame = cameraKeyframes[scene];
            const camera = document.querySelector('.story-camera');
            if (!frame || !camera) {
                camera?.style.removeProperty('--cam-x');
                camera?.style.removeProperty('--cam-y');
                camera?.style.removeProperty('--cam-s');
                return;
            }
            const scale = Math.max(innerWidth / designWidth, innerHeight / designHeight);
            const offsetX = (innerWidth - designWidth * scale) / 2;
            const offsetY = (innerHeight - designHeight * scale) / 2;
            const [x, y, s] = frame;
            const scaled = s * scale;
            const tx = Math.max(innerWidth - designWidth * scaled, Math.min(0, x * scale + offsetX));
            const ty = Math.max(innerHeight - designHeight * scaled, Math.min(0, y * scale + offsetY));
            if (immediate) {
                camera.classList.add('is-resizing');
                requestAnimationFrame(() => requestAnimationFrame(() => camera.classList.remove('is-resizing')));
            }
            camera.style.setProperty('--cam-x', `${tx}px`);
            camera.style.setProperty('--cam-y', `${ty}px`);
            camera.style.setProperty('--cam-s', scaled);
        };

        let resizeFrame = 0;
        window.addEventListener('resize', () => {
            cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(() => applyCamera(currentScene, true));
        });

        const setScene = (scene, pushHistory = true, animate = true, preserveScroll = window.scrollY) => {
            if (scene === currentScene && story.classList.contains('is-active') && animate) return;
            const previousScene = currentScene;
            const isZoomForward = previousScene === 4 && scene === 5 && animate && !reducedMotion.matches;
            const isZoomBack = previousScene === 5 && scene === 4 && animate && !reducedMotion.matches;
            const wasZoom = isZoomForward || isZoomBack;
            const camera = document.querySelector('.story-camera');
            const leavingLayers = document.querySelectorAll(`.story-art-${previousScene}, .story-frame-${previousScene}`);
            const incomingLayers = document.querySelectorAll(`.story-art-${scene}, .story-frame-${scene}`);
            leavingLayers.forEach((layer) => layer.classList.add('is-leaving'));
            incomingLayers.forEach((layer) => layer.classList.add('is-current'));
            Object.values(copyByScene).forEach((copy) => {
                copy.classList.remove('is-typing');
                copy.textContent = '';
            });
            currentScene = scene;
            applyCamera(scene);
            updateFireSound(scene, animate);
            if ((scene < 5 || isZoomForward || isZoomBack) && animate && !reducedMotion.matches) {
                const run = ++typewriterRun;
                window.setTimeout(() => {
                    if (run === typewriterRun && currentScene === scene) typeSceneCopy(scene);
                }, SCENE_MS);
            } else {
                typeSceneCopy(scene);
            }
            document.querySelectorAll('[class*="story-art-"], [class*="story-frame-"], [class*="story-copy-"]').forEach((layer) => layer.classList.remove('is-current'));
            document.querySelectorAll(`.story-art-${scene}, .story-frame-${scene}, .story-copy-${scene}`).forEach((layer) => layer.classList.add('is-current'));
            if (reducedMotion.matches) {
                document.querySelectorAll('.is-leaving').forEach((layer) => layer.classList.remove('is-leaving'));
            } else {
                window.setTimeout(() => document.querySelectorAll('.is-leaving').forEach((layer) => layer.classList.remove('is-leaving')), SCENE_MS);
            }
            const pageNumber = document.querySelector('.story-page-number');
            if (pageNumber) pageNumber.textContent = String(scene);
            document.body.className = document.body.className.replace(/\bstory-scene-\d+\b/g, '').replace(/\s+/g, ' ').trim();
            document.body.classList.remove('zoom-4-5', 'zoom-5-4', 'zoom-5-4-start');
            if (isZoomForward) document.body.classList.add('zoom-4-5');
            if (isZoomBack) document.body.classList.add('zoom-5-4', 'zoom-5-4-start');
            if (scene > 1 && scene <= maxScene && !isZoomForward && !isZoomBack) document.body.classList.add(`story-scene-${scene}`);
            document.documentElement.classList.toggle('story-locked', scene >= 5);
            document.body.classList.toggle('story-full-motion', scene >= 5);
            document.body.classList.remove('burning');
            document.body.classList.toggle('story-transitioning', animate && scene > 1 && !isZoomForward && !isZoomBack);
            document.body.classList.toggle('home-to-story', animate && scene === 1);
            setPage('story', false);

            if (isZoomBack && camera) {
    void camera.offsetWidth; // commit the zoomed-in start state
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('zoom-5-4-start')));
}

            if (pushHistory) history.pushState({ pageId: `scene-${scene}` }, '', `#scene-${scene}`);
            requestAnimationFrame(() => {
                window.scrollTo({ top: preserveScroll, left: window.scrollX, behavior: 'auto' });
                requestAnimationFrame(() => window.scrollTo({ top: preserveScroll, left: window.scrollX, behavior: 'auto' }));
            });
            if (animate && scene === 1) {
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    document.body.classList.add('home-to-story');
                }));
            }
            if (animate) {
                isAnimating = true;
                window.setTimeout(() => {
                    isAnimating = false;
                    if (wasZoom && camera) {
                        camera.style.transition = 'none';
                        void camera.offsetWidth;
                    }
                    document.body.classList.remove('story-transitioning', 'home-to-story', 'zoom-4-5', 'zoom-5-4');
                    if (currentScene > 1) document.body.classList.add(`story-scene-${currentScene}`);
                    document.documentElement.classList.toggle('story-locked', currentScene >= 5);
                    if (wasZoom && camera) {
                        requestAnimationFrame(() => {
                            camera.style.transition = '';
                        });
                    }
                }, SCENE_MS + 100);
            }
        };

        const startFireSoundFromGesture = () => {
            if (currentScene < 4 || !fireSound) return;
            fireSound.volume = fireSound.volume || 0;
            const playRequest = fireSound.play();
            if (playRequest) {
                playRequest.then(() => fadeFireSound(1)).catch((error) => console.warn('Fire sound could not start:', error));
            }
        };

        document.addEventListener('pointerdown', startFireSoundFromGesture);

        document.querySelector('[data-go-back]')?.addEventListener('click', () => {
            if (currentScene > 1 && !isAnimating) {
                setScene(currentScene - 1, true, true);
            }
        });

        document.querySelectorAll('[data-go-to]').forEach((control) => {
            control.addEventListener('click', () => {
                if (isAnimating) return;
                const target = control.dataset.goTo;
                const scrollPosition = window.scrollY;
                if (target === 'scene-1') setScene(1, true, true, scrollPosition);
                if (target === 'scene-2') setScene(Math.min(currentScene + 1, maxScene), true, true, scrollPosition);
            });
        });

        window.addEventListener('popstate', () => {
            const hash = location.hash.slice(1);
            const sceneMatch = hash.match(/^scene-(\d{1,2})$/);
            if (sceneMatch && Number(sceneMatch[1]) <= maxScene) setScene(Number(sceneMatch[1]), false, true);
            else if (hash === 'scene-1') setScene(1, false, false);
            else setPage('home-page', false);
        });

        const initialHash = location.hash.slice(1);
        const initialScene = initialHash.match(/^scene-(\d{1,2})$/);
        if (initialScene && Number(initialScene[1]) <= maxScene) setScene(Number(initialScene[1]), false, false);
        else if (initialHash === 'scene-1') setScene(1, false, false);
        else setPage('home-page', false);

