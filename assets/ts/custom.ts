/* ---------------------------------------------------------------------------
   Site interactions
   Background terms, custom cursor, click bursts, back-to-top and music dock.
   --------------------------------------------------------------------------- */

(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const rand = (min, max) => min + Math.random() * (max - min);
    const pick = (items) => items[Math.floor(Math.random() * items.length)];

    function initBackToTop() {
        const button = document.getElementById("back-to-top");
        if (!button) return;

        const progress = button.querySelector(".back-to-top__progress");
        const circumference = 2 * Math.PI * 20;
        if (progress) {
            progress.style.strokeDasharray = `${circumference}`;
            progress.style.strokeDashoffset = `${circumference}`;
        }

        let ticking = false;

        const update = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
            const maxScroll = Math.max(
                1,
                document.documentElement.scrollHeight - window.innerHeight
            );
            const ratio = clamp(scrollTop / maxScroll, 0, 1);

            button.classList.toggle("is-visible", scrollTop > 360);
            if (progress) {
                progress.style.strokeDashoffset = `${circumference * (1 - ratio)}`;
            }
            ticking = false;
        };

        const requestUpdate = () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(update);
        };

        window.addEventListener("scroll", requestUpdate, { passive: true });
        window.addEventListener("resize", requestUpdate, { passive: true });
        update();

        button.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: reduceMotion.matches ? "auto" : "smooth",
            });
        });
    }

    function initMusicDock() {
        const dock = document.getElementById("music-dock");
        const toggle = document.getElementById("music-toggle");
        const close = document.getElementById("music-close");
        const panel = document.getElementById("music-panel");
        const iframe = document.getElementById("music-iframe");
        if (!dock || !toggle || !panel || !iframe) return;

        let loaded = false;
        let closeTimer = 0;
        let loadTimer = 0;

        const markLoaded = () => {
            window.clearTimeout(loadTimer);
            dock.classList.add("is-loaded");
        };

        iframe.addEventListener("load", markLoaded);

        const open = () => {
            window.clearTimeout(closeTimer);
            panel.hidden = false;
            dock.classList.add("is-open");
            toggle.setAttribute("aria-expanded", "true");

            if (!loaded) {
                const src = iframe.getAttribute("data-src");
                if (src) iframe.setAttribute("src", src);
                loaded = true;
                loadTimer = window.setTimeout(markLoaded, 2800);
            }
        };

        const shut = () => {
            window.clearTimeout(closeTimer);
            dock.classList.remove("is-open");
            toggle.setAttribute("aria-expanded", "false");
            closeTimer = window.setTimeout(
                () => {
                    if (!dock.classList.contains("is-open")) panel.hidden = true;
                },
                reduceMotion.matches ? 0 : 220
            );
        };

        toggle.addEventListener("click", () => {
            if (dock.classList.contains("is-open")) {
                shut();
                toggle.focus();
            } else {
                open();
            }
        });

        close?.addEventListener("click", () => {
            shut();
            toggle.focus();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !panel.hidden) {
                shut();
                toggle.focus();
            }
        });

        document.addEventListener("click", (event) => {
            if (!panel.hidden && !dock.contains(event.target)) shut();
        });
    }

    function initClickBurst() {
        if (reduceMotion.matches) return;

        document.addEventListener(
            "pointerdown",
            (event) => {
                if (event.pointerType === "mouse" && event.button !== 0) return;

                const layer = document.createElement("span");
                layer.className = "click-fx";
                layer.style.left = `${event.clientX}px`;
                layer.style.top = `${event.clientY}px`;

                const ring = document.createElement("span");
                ring.className = "click-fx__ring";
                layer.appendChild(ring);

                const sparks = 9;
                for (let index = 0; index < sparks; index += 1) {
                    const spark = document.createElement("span");
                    spark.className = "click-fx__spark";
                    const angle = (Math.PI * 2 * index) / sparks + rand(-0.16, 0.16);
                    const distance = rand(18, 46);
                    spark.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
                    spark.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
                    spark.style.setProperty("--delay", `${rand(0, 0.06)}s`);
                    layer.appendChild(spark);
                }

                document.body.appendChild(layer);
                window.setTimeout(() => layer.remove(), 820);
            },
            { passive: true }
        );
    }

    function initCustomCursor() {
        const cursor = document.getElementById("custom-cursor");
        if (!cursor) return;

        const enabled = () => finePointer.matches;
        if (!enabled()) return;

        let x = window.innerWidth / 2;
        let y = window.innerHeight / 2;
        let ringX = x;
        let ringY = y;
        let hasMoved = false;

        const setPosition = () => {
            cursor.style.setProperty("--cursor-x", `${x.toFixed(2)}`);
            cursor.style.setProperty("--cursor-y", `${y.toFixed(2)}`);
            cursor.style.setProperty("--ring-x", `${ringX.toFixed(2)}`);
            cursor.style.setProperty("--ring-y", `${ringY.toFixed(2)}`);
        };

        const animate = () => {
            const easing = reduceMotion.matches ? 1 : 0.18;
            ringX += (x - ringX) * easing;
            ringY += (y - ringY) * easing;
            setPosition();
            window.requestAnimationFrame(animate);
        };

        window.addEventListener(
            "pointermove",
            (event) => {
                if (event.pointerType === "touch") return;
                x = event.clientX;
                y = event.clientY;
                if (!hasMoved) {
                    ringX = x;
                    ringY = y;
                    hasMoved = true;
                    document.body.classList.add("has-custom-cursor");
                    cursor.classList.add("is-visible");
                }
            },
            { passive: true }
        );

        document.addEventListener(
            "pointerover",
            (event) => {
                const target = event.target;
                if (!(target instanceof Element)) return;
                const interactive = target.closest(
                    "a, button, summary, input, textarea, select, label, [role='button']"
                );
                cursor.classList.toggle("is-hover", Boolean(interactive));
            },
            true
        );

        document.addEventListener("pointerdown", () => cursor.classList.add("is-down"), {
            passive: true,
        });
        document.addEventListener("pointerup", () => cursor.classList.remove("is-down"), {
            passive: true,
        });

        document.documentElement.addEventListener("pointerleave", () => {
            cursor.classList.remove("is-visible");
        });
        document.documentElement.addEventListener("pointerenter", () => {
            if (hasMoved) cursor.classList.add("is-visible");
        });
        window.addEventListener("blur", () => cursor.classList.remove("is-visible"));

        window.requestAnimationFrame(animate);
    }

    function initTermUniverse() {
        const canvas = document.getElementById("term-canvas");
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        const TERMS = [
            "JavaScript",
            "TypeScript",
            "Python",
            "Rust",
            "Golang",
            "Java",
            "C++",
            "Linux",
            "Unix",
            "kernel",
            "compiler",
            "algorithm",
            "database",
            "recursion",
            "protocol",
            "binary",
            "regex",
            "function",
            "variable",
            "array",
            "stack",
            "heap",
            "pointer",
            "object",
            "class",
            "API",
            "HTTP",
            "TCP/IP",
            "GPU",
            "CPU",
            "cache",
            "vector",
            "matrix",
            "entropy",
            "neural",
            "token",
            "syntax",
            "loop",
            "async",
            "docker",
            "git",
            "socket",
            "cipher",
            "hash",
            "byte",
            "bit",
            "logic",
            "memory",
            "terminal",
            "debug",
            "quantum",
            "network",
            "server",
            "client",
            "cluster",
            "thread",
            "mutex",
            "segfault",
            "runtime",
            "virtual",
            "sandbox",
            "firewall",
            "packet",
            "router",
            "cloud",
            "data flow",
            "machine code",
            "source code",
            "bug",
            "patch",
            "deploy",
            "build",
            "commit",
            "branch",
            "merge",
            "fork",
            "pull request",
        ];

        const FONT = '"ui-monospace", "SFMono-Regular", Menlo, Consolas, monospace';
        const state = {
            width: 0,
            height: 0,
            dpr: 1,
            time: 0,
            words: [],
            forms: [],
            debris: [],
            ripples: [],
            colors: { accent: "#0f766e", secondary: "#64748b" },
            mouse: {
                x: 0,
                y: 0,
                lastX: 0,
                lastY: 0,
                lastTime: 0,
                vx: 0,
                vy: 0,
                active: false,
            },
            lastSpawn: -10,
            lastShatter: -10,
        };

        const readColors = () => {
            const styles = window.getComputedStyle(document.documentElement);
            state.colors.accent =
                styles.getPropertyValue("--accent-color").trim() || "#0f766e";
            state.colors.secondary =
                styles.getPropertyValue("--card-text-color-secondary").trim() || "#64748b";
        };

        const fontFor = (size) => `600 ${size}px ${FONT}`;

        const targetCount = () => {
            if (state.width < 640) return 12;
            if (state.width < 1024) return 18;
            return Math.min(32, Math.max(18, Math.round((state.width * state.height) / 60000)));
        };

        const termSize = () => {
            if (state.width < 640) return rand(11, 15);
            if (state.width < 1024) return rand(13, 18);
            return rand(15, 22);
        };

        const measure = (text, size) => {
            context.font = fontFor(size);
            return context.measureText(text).width;
        };

        const termColor = () =>
            Math.random() < 0.72 ? state.colors.accent : state.colors.secondary;

        const makeWord = (text, x = 0, y = 0, size = termSize(), angle = 0) => {
            const width = measure(text, size);
            return {
                text,
                x,
                y,
                size,
                width,
                radius: Math.max(width / 2, size * 1.1) + 8,
                vx: rand(-40, 40),
                vy: rand(-40, 40),
                angle,
                spin: rand(-0.18, 0.18),
                alpha: rand(0.16, 0.32),
                color: termColor(),
                hits: 0,
                dead: false,
            };
        };

        const spawnWord = (text = pick(TERMS)) => {
            const margin = 28;
            let candidate = null;

            for (let attempt = 0; attempt < 26; attempt += 1) {
                candidate = makeWord(text);
                const minX = margin + candidate.width / 2;
                const maxX = state.width - margin - candidate.width / 2;
                const minY = margin + candidate.size;
                const maxY = state.height - margin - candidate.size;
                if (maxX <= minX || maxY <= minY) break;

                candidate.x = rand(minX, maxX);
                candidate.y = rand(minY, maxY);

                const overlaps = state.words.some((word) => {
                    const dx = word.x - candidate.x;
                    const dy = word.y - candidate.y;
                    return Math.hypot(dx, dy) < word.radius + candidate.radius + 16;
                });

                if (!overlaps) {
                    state.words.push(candidate);
                    return candidate;
                }
            }

            if (candidate) {
                candidate.x = clamp(candidate.x, margin, state.width - margin);
                candidate.y = clamp(candidate.y, margin, state.height - margin);
                state.words.push(candidate);
            }
            return candidate;
        };

        const pickNewTerm = (excluded) => {
            const available = TERMS.filter((term) => !excluded.includes(term));
            return available.length ? pick(available) : pick(TERMS);
        };

        const shatterPair = (first, second) => {
            if (first.dead || second.dead) return;
            if (state.time - state.lastShatter < 0.28) return;

            state.lastShatter = state.time;
            first.dead = true;
            second.dead = true;

            const centerX = (first.x + second.x) / 2;
            const centerY = (first.y + second.y) / 2;

            const sources = [];
            [first, second].forEach((word) => {
                Array.from(word.text).forEach(() => {
                    sources.push({
                        x: word.x + rand(-word.width / 2, word.width / 2),
                        y: word.y + rand(-word.size / 2, word.size / 2),
                    });
                });

                Array.from(word.text).forEach((char, index) => {
                    state.debris.push({
                        char,
                        x: word.x + (index - (word.text.length - 1) / 2) * (word.size * 0.58),
                        y: word.y + rand(-word.size * 0.4, word.size * 0.4),
                        vx: word.vx * 0.35 + rand(-120, 120),
                        vy: word.vy * 0.35 + rand(-100, 100),
                        angle: rand(-1, 1),
                        spin: rand(-4, 4),
                        size: word.size * 0.8,
                        color: word.color,
                        life: rand(0.7, 1.25),
                        maxLife: 1.25,
                    });
                });
            });

            for (let index = sources.length - 1; index > 0; index -= 1) {
                const swap = Math.floor(Math.random() * (index + 1));
                [sources[index], sources[swap]] = [sources[swap], sources[index]];
            }

            const text = pickNewTerm([first.text, second.text]);
            const size = state.width < 640 ? rand(13, 17) : rand(16, 23);
            const width = measure(text, size);
            const formX = clamp(centerX, width / 2 + 24, state.width - width / 2 - 24);
            const formY = clamp(centerY, size + 32, state.height - size - 32);
            const widths = Array.from(text).map((char) => measure(char, size));
            const totalWidth = widths.reduce((sum, value) => sum + value, 0);

            let cursor = -totalWidth / 2;
            const letters = Array.from(text).map((char, index) => {
                const targetX = cursor + widths[index] / 2;
                cursor += widths[index];
                const source = sources[index % sources.length] || {
                    x: formX + rand(-80, 80),
                    y: formY + rand(-60, 60),
                };
                return {
                    char,
                    sx: source.x,
                    sy: source.y,
                    tx: targetX,
                    ty: 0,
                    delay: rand(0, 0.16),
                    angle: rand(-1.2, 1.2),
                    spin: rand(-6, 6),
                };
            });

            state.forms.push({
                text,
                x: formX,
                y: formY,
                size,
                width,
                color: state.colors.accent,
                letters,
                elapsed: 0,
                duration: rand(0.72, 0.94),
            });

            state.ripples.push({
                x: centerX,
                y: centerY,
                radius: 12,
                life: 0.52,
                maxLife: 0.52,
            });

            state.debris = state.debris.slice(-220);
        };

        const update = (delta) => {
            const mouse = state.mouse;
            for (const word of state.words) {
                word.x += word.vx * delta;
                word.y += word.vy * delta;
                word.angle += word.spin * delta;

                if (mouse.active) {
                    const dx = word.x - mouse.x;
                    const dy = word.y - mouse.y;
                    const distance = Math.hypot(dx, dy);
                    const reach = 185;
                    if (distance > 0.1 && distance < reach) {
                        const strength = 1 - distance / reach;
                        const mouseVX = clamp(mouse.vx, -1400, 1400);
                        const mouseVY = clamp(mouse.vy, -1400, 1400);
                        word.vx += (dx / distance) * strength * 520 * delta;
                        word.vy += (dy / distance) * strength * 520 * delta;
                        word.vx += mouseVX * 0.012 * strength;
                        word.vy += mouseVY * 0.012 * strength;
                    }
                }

                const halfWidth = word.width / 2;
                const halfHeight = word.size;

                if (word.x - halfWidth < 12) {
                    word.x = 12 + halfWidth;
                    word.vx = Math.abs(word.vx) * 0.92;
                } else if (word.x + halfWidth > state.width - 12) {
                    word.x = state.width - 12 - halfWidth;
                    word.vx = -Math.abs(word.vx) * 0.92;
                }

                if (word.y - halfHeight < 12) {
                    word.y = 12 + halfHeight;
                    word.vy = Math.abs(word.vy) * 0.92;
                } else if (word.y + halfHeight > state.height - 12) {
                    word.y = state.height - 12 - halfHeight;
                    word.vy = -Math.abs(word.vy) * 0.92;
                }

                // Keep a little turbulence in the field so words keep meeting
                // instead of slowly coming to a stop.
                word.vx += rand(-55, 55) * delta;
                word.vy += rand(-55, 55) * delta;

                let speed = Math.hypot(word.vx, word.vy);
                const maxSpeed = 58;
                const minSpeed = 16;
                if (speed > maxSpeed) {
                    word.vx = (word.vx / speed) * maxSpeed;
                    word.vy = (word.vy / speed) * maxSpeed;
                } else if (speed < minSpeed) {
                    const angle = rand(0, Math.PI * 2);
                    word.vx = Math.cos(angle) * minSpeed;
                    word.vy = Math.sin(angle) * minSpeed;
                }
            }

            for (let firstIndex = 0; firstIndex < state.words.length; firstIndex += 1) {
                const first = state.words[firstIndex];
                if (first.dead) continue;

                for (let secondIndex = firstIndex + 1; secondIndex < state.words.length; secondIndex += 1) {
                    const second = state.words[secondIndex];
                    if (second.dead) continue;

                    const dx = second.x - first.x;
                    const dy = second.y - first.y;
                    const distance = Math.hypot(dx, dy) || 0.001;
                    const minDistance = first.radius + second.radius;

                    if (distance >= minDistance) continue;

                    const nx = dx / distance;
                    const ny = dy / distance;
                    const overlap = minDistance - distance;

                    first.x -= nx * overlap * 0.5;
                    first.y -= ny * overlap * 0.5;
                    second.x += nx * overlap * 0.5;
                    second.y += ny * overlap * 0.5;

                    const relativeX = second.vx - first.vx;
                    const relativeY = second.vy - first.vy;
                    const relativeSpeed = relativeX * nx + relativeY * ny;

                    if (relativeSpeed < 0) {
                        const impulse = -(1.55 * relativeSpeed) / 2;
                        first.vx -= impulse * nx;
                        first.vy -= impulse * ny;
                        second.vx += impulse * nx;
                        second.vy += impulse * ny;
                        first.hits += 1;
                        second.hits += 1;
                    }

                    if (first.hits + second.hits >= 2) {
                        shatterPair(first, second);
                        break;
                    }
                }
            }

            state.words = state.words.filter((word) => !word.dead);

            if (
                state.words.length < targetCount() &&
                state.forms.length < 5 &&
                state.time - state.lastSpawn > 1.5
            ) {
                spawnWord();
                state.lastSpawn = state.time;
            }

            for (const form of state.forms) {
                form.elapsed += delta;
            }

            const finished = [];
            state.forms.forEach((form, index) => {
                const maxDelay = Math.max(...form.letters.map((letter) => letter.delay), 0);
                if (form.elapsed > form.duration + maxDelay + 0.08) {
                    finished.push(index);
                    const word = makeWord(form.text, form.x, form.y, form.size);
                    word.angle = 0;
                    word.hits = 0;
                    state.words.push(word);
                }
            });
            state.forms = state.forms.filter((_, index) => !finished.includes(index));

            for (const piece of state.debris) {
                piece.x += piece.vx * delta;
                piece.y += piece.vy * delta;
                piece.vx *= 0.985;
                piece.vy *= 0.985;
                piece.vy += 18 * delta;
                piece.angle += piece.spin * delta;
                piece.life -= delta;
            }
            state.debris = state.debris.filter((piece) => piece.life > 0);

            for (const ripple of state.ripples) {
                ripple.radius += 95 * delta;
                ripple.life -= delta;
            }
            state.ripples = state.ripples.filter((ripple) => ripple.life > 0);
        };

        const drawWord = (word) => {
            context.save();
            context.translate(word.x, word.y);
            context.rotate(word.angle);
            context.globalAlpha = word.alpha;
            context.fillStyle = word.color;
            context.font = fontFor(word.size);
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(word.text, 0, 0);
            context.restore();
        };

        const drawForm = (form) => {
            context.save();
            context.font = fontFor(form.size);
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillStyle = form.color;

            for (const letter of form.letters) {
                const progress = clamp((form.elapsed - letter.delay) / form.duration, 0, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const x = letter.sx + (form.x + letter.tx - letter.sx) * eased;
                const y = letter.sy + (form.y + letter.ty - letter.sy) * eased;

                context.save();
                context.translate(x, y);
                context.rotate(letter.angle * (1 - eased));
                context.globalAlpha = 0.18 + eased * 0.48;
                context.fillText(letter.char, 0, 0);
                context.restore();
            }

            context.restore();
        };

        const draw = () => {
            context.clearRect(0, 0, state.width, state.height);

            for (const word of state.words) drawWord(word);
            for (const form of state.forms) drawForm(form);

            for (const piece of state.debris) {
                const alpha = clamp(piece.life / piece.maxLife, 0, 1) * 0.5;
                context.save();
                context.translate(piece.x, piece.y);
                context.rotate(piece.angle);
                context.globalAlpha = alpha;
                context.fillStyle = piece.color;
                context.font = fontFor(piece.size);
                context.textAlign = "center";
                context.textBaseline = "middle";
                context.fillText(piece.char, 0, 0);
                context.restore();
            }

            for (const ripple of state.ripples) {
                const progress = 1 - ripple.life / ripple.maxLife;
                context.save();
                context.globalAlpha = (1 - progress) * 0.22;
                context.strokeStyle = state.colors.accent;
                context.lineWidth = 1;
                context.beginPath();
                context.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
                context.stroke();
                context.restore();
            }
        };

        const resize = () => {
            state.width = window.innerWidth;
            state.height = window.innerHeight;
            state.dpr = Math.min(window.devicePixelRatio || 1, 2);

            canvas.width = Math.floor(state.width * state.dpr);
            canvas.height = Math.floor(state.height * state.dpr);
            canvas.style.width = `${state.width}px`;
            canvas.style.height = `${state.height}px`;

            context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
            readColors();

            if (!state.words.length) {
                const count = targetCount();
                for (let index = 0; index < count; index += 1) spawnWord();
            } else {
                for (const word of state.words) {
                    word.x = clamp(word.x, word.width / 2 + 12, state.width - word.width / 2 - 12);
                    word.y = clamp(word.y, word.size + 12, state.height - word.size - 12);
                }
            }

            if (reduceMotion.matches) draw();
        };

        const onPointerMove = (event) => {
            if (event.pointerType === "touch") {
                state.mouse.active = false;
                return;
            }

            const now = performance.now();
            const elapsed = Math.max(16, now - (state.mouse.lastTime || now));
            state.mouse.vx = ((event.clientX - state.mouse.lastX) / elapsed) * 1000;
            state.mouse.vy = ((event.clientY - state.mouse.lastY) / elapsed) * 1000;
            state.mouse.lastX = event.clientX;
            state.mouse.lastY = event.clientY;
            state.mouse.lastTime = now;
            state.mouse.x = event.clientX;
            state.mouse.y = event.clientY;
            state.mouse.active = true;
        };

        window.addEventListener("pointermove", onPointerMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", () => {
            state.mouse.active = false;
        });
        window.addEventListener("resize", resize, { passive: true });
        let lastFrame = performance.now();
        window.addEventListener("visibilitychange", () => {
            if (!document.hidden) lastFrame = performance.now();
        });

        const themeObserver = new MutationObserver(() => {
            readColors();
            if (reduceMotion.matches) draw();
        });
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-scheme", "class"],
        });

        resize();

        const frame = (now) => {
            const delta = Math.min(0.045, Math.max(0.001, (now - lastFrame) / 1000));
            lastFrame = now;

            if (!document.hidden) {
                state.time += delta;
                update(delta);
                draw();
            }

            window.requestAnimationFrame(frame);
        };

        if (reduceMotion.matches) {
            draw();
        } else {
            window.requestAnimationFrame(frame);
        }
    }

    const boot = () => {
        initBackToTop();
        initMusicDock();
        initClickBurst();
        initCustomCursor();
        initTermUniverse();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
})();
