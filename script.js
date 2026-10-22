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
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let typewriterRun = 0;

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

        const setScene = (scene, pushHistory = true, animate = true, preserveScroll = window.scrollY) => {
            if (scene === currentScene && story.classList.contains('is-active') && animate) return;
            const previousScene = currentScene;
            const isZoomForward = previousScene === 4 && scene === 5 && animate && !reducedMotion.matches;
            const isZoomBack = previousScene === 5 && scene === 4 && animate && !reducedMotion.matches;
            const isFireTransition = previousScene === 13 && scene === 14 && animate && !reducedMotion.matches;
            const leavingLayers = document.querySelectorAll(`.story-art-${previousScene}, .story-frame-${previousScene}`);
            const incomingLayers = document.querySelectorAll(`.story-art-${scene}, .story-frame-${scene}`);
            leavingLayers.forEach((layer) => layer.classList.add('is-leaving'));
            incomingLayers.forEach((layer) => layer.classList.add('is-current'));
            Object.values(copyByScene).forEach((copy) => {
                copy.classList.remove('is-typing');
                copy.textContent = '';
            });
            currentScene = scene;
            if (scene < 5 && animate && !reducedMotion.matches) {
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
            document.body.classList.remove('zoom-4-5', 'zoom-5-4', 'fire-13-14');
            if (isFireTransition) document.body.classList.add('fire-13-14');
            if (isZoomForward) document.body.classList.add('zoom-4-5');
            if (isZoomBack) document.body.classList.add('zoom-5-4');
            if (scene > 1 && scene <= maxScene && !isZoomForward && !isZoomBack) document.body.classList.add(`story-scene-${scene}`);
            document.documentElement.classList.toggle('story-locked', scene >= 5);
            document.body.classList.toggle('story-full-motion', scene >= 5);
            document.body.classList.remove('burning');
            document.body.classList.toggle('story-transitioning', animate && scene > 1 && !isZoomForward && !isZoomBack && !isFireTransition);
            document.body.classList.toggle('home-to-story', animate && scene === 1);
            setPage('story', false);
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
                    document.body.classList.remove('story-transitioning', 'home-to-story', 'zoom-4-5', 'zoom-5-4', 'fire-13-14');
                    if (currentScene >= 5) document.body.classList.add(`story-scene-${currentScene}`);
                    document.documentElement.classList.toggle('story-locked', currentScene >= 5);
                }, SCENE_MS + 100);
            }
        };

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

