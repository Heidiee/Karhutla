        const story = document.getElementById('story');
        const pages = ['home-page', 'story'];
        let currentScene = 1;
        let isAnimating = false;
        const maxScene = 4;

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
            currentScene = scene;
            document.body.classList.remove('story-scene-2', 'story-scene-3', 'story-scene-4');
            if (scene > 1) document.body.classList.add(`story-scene-${scene}`);
            document.body.classList.remove('burning');
            document.body.classList.toggle('story-transitioning', animate && scene > 1);
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
                    document.body.classList.remove('story-transitioning', 'home-to-story');
                }, 1300);
            }
        };

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
            const sceneMatch = hash.match(/^scene-([1-4])$/);
            if (sceneMatch) setScene(Number(sceneMatch[1]), false, true);
            else if (hash === 'scene-1') setScene(1, false, false);
            else setPage('home-page', false);
        });

        const initialHash = location.hash.slice(1);
        const initialScene = initialHash.match(/^scene-([1-4])$/);
        if (initialScene) setScene(Number(initialScene[1]), false, false);
        else if (initialHash === 'scene-1') setScene(1, false, false);
        else setPage('home-page', false);

