(() => {
    const gallery = document.querySelector('.album-gallery');
    const dialog = document.getElementById('album-lightbox');
    if (!gallery || !dialog) return;

    const links = Array.from(gallery.querySelectorAll('.album-frame-link'));
    const items = links.map((link) => {
        const image = link.querySelector('img');
        return {
            full: link.getAttribute('href'),
            title: link.dataset.title || '',
            alt: link.dataset.alt || (image ? image.alt : ''),
            thumb: image ? image.currentSrc : ''
        };
    });
    if (!items.length) return;

    const image = dialog.querySelector('.album-lightbox__image');
    const count = dialog.querySelector('.album-lightbox__count');
    const title = dialog.querySelector('.album-lightbox__title');
    const closeButton = dialog.querySelector('[data-close]');
    const prevButton = dialog.querySelector('[data-prev]');
    const nextButton = dialog.querySelector('[data-next]');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const preloaded = new Set();

    let current = 0;
    let trigger = null;
    let closing = false;
    let switchToken = 0;

    const pad = (number) => String(number).padStart(2, '0');
    const wrap = (index) => (index + items.length) % items.length;

    const preload = (index) => {
        const item = items[wrap(index)];
        if (!item || preloaded.has(item.full)) return;
        preloaded.add(item.full);
        const img = new Image();
        img.src = item.full;
    };

    const updateCaption = (index) => {
        count.textContent = `${pad(index + 1)} / ${pad(items.length)}`;
        title.textContent = items[index].title;
    };

    const setImage = (index, animate = true) => {
        current = wrap(index);
        const item = items[current];
        updateCaption(current);
        preload(current + 1);
        preload(current - 1);

        const token = ++switchToken;
        if (!animate || reduceMotion) {
            image.classList.remove('is-switching');
            image.src = item.full;
            image.alt = item.alt;
            return;
        }

        image.classList.add('is-switching');
        window.setTimeout(() => {
            if (token !== switchToken) return;
            image.src = item.full;
            image.alt = item.alt;
        }, 130);
    };

    image.addEventListener('load', () => {
        image.classList.remove('is-switching');
    });

    image.addEventListener('error', () => {
        image.classList.remove('is-switching');
    });

    const open = (index, link) => {
        trigger = link;
        closing = false;
        dialog.classList.remove('is-closing');
        setImage(index, false);

        if (!dialog.open) {
            if (typeof dialog.showModal === 'function') {
                dialog.showModal();
            } else {
                dialog.setAttribute('open', '');
            }
        }

        document.documentElement.classList.add('album-lightbox-open');
        window.setTimeout(() => closeButton.focus(), 60);
    };

    const close = () => {
        if (!dialog.open || closing) return;
        closing = true;
        dialog.classList.add('is-closing');

        let finished = false;
        const finish = () => {
            if (finished || !closing) return;
            finished = true;
            dialog.classList.remove('is-closing');
            if (typeof dialog.close === 'function') {
                dialog.close();
            } else {
                dialog.removeAttribute('open');
            }
            document.documentElement.classList.remove('album-lightbox-open');
            closing = false;
            if (trigger) trigger.focus();
        };

        const shell = dialog.querySelector('.album-lightbox__shell');
        shell.addEventListener('animationend', finish, { once: true });
        window.setTimeout(finish, reduceMotion ? 0 : 320);
    };

    links.forEach((link, index) => {
        link.addEventListener('click', (event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            open(index, link);
        });
    });

    closeButton.addEventListener('click', close);
    prevButton.addEventListener('click', () => setImage(current - 1));
    nextButton.addEventListener('click', () => setImage(current + 1));

    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) close();
    });

    dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        close();
    });

    dialog.addEventListener('close', () => {
        document.documentElement.classList.remove('album-lightbox-open');
        closing = false;
    });

    document.addEventListener('keydown', (event) => {
        if (!dialog.open) return;
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            setImage(current - 1);
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            setImage(current + 1);
        }
    });

    let touchStartX = null;
    const stage = dialog.querySelector('.album-lightbox__stage');

    stage.addEventListener('touchstart', (event) => {
        if (event.touches.length === 1) {
            touchStartX = event.touches[0].clientX;
        }
    }, { passive: true });

    stage.addEventListener('touchend', (event) => {
        if (touchStartX === null) return;
        const delta = event.changedTouches[0].clientX - touchStartX;
        touchStartX = null;
        if (Math.abs(delta) < 45) return;
        setImage(current + (delta < 0 ? 1 : -1));
    }, { passive: true });
})();
