        // --- Configuration & State ---
        let currentTask = null;
        let allTasks = [];
        let workspace = null;
        let charPos = { x: 0, y: 0 };
        let uid = new URLSearchParams(window.location.search).get('uid');

        // Persistence for UID
        if (!uid) {
            uid = localStorage.getItem('last_uid') || 'guest_' + Math.random().toString(36).substr(2, 5);
            localStorage.setItem('last_uid', uid);
        }

        // --- Core Logic ---
        async function init() {
            // Mobile layout: move .controls out of preview-panel and FAB into controls row
            if (isMobile) {
                const sidebar = document.querySelector('.sidebar');
                const controls = document.querySelector('.controls');
                const fab = document.getElementById('scratchyFab');
                if (sidebar && controls && fab) {
                    sidebar.appendChild(controls);
                    controls.appendChild(fab);
                }
            }

            try {
                const response = await fetch('../data/tasks.json');
                const tasks = await response.json();
                allTasks = tasks;

                const regKey = `reg_${uid}`;
                let regDate = localStorage.getItem(regKey);
                if (!regDate) {
                    regDate = new Date().toISOString();
                    localStorage.setItem(regKey, regDate);
                }

                const urlTaskId = new URLSearchParams(window.location.search).get('task');

                if (urlTaskId) {
                    currentTask = tasks.find(t => t.id === urlTaskId);
                }

                if (!currentTask) {
                    // Logic: 1 new task per day if no URL param or ID not found
                    const diffTime = Math.abs(Date.now() - new Date(regDate));
                    const daysSinceReg = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const taskIndex = Math.min(daysSinceReg, tasks.length - 1);
                    currentTask = tasks[taskIndex];
                }

                initBlockly();
                loadWorkspace();
                workspace.addChangeListener(saveWorkspace);
                updateUI();
                initCanvas();
                if (new URLSearchParams(window.location.search).has('admin')) {
                    document.getElementById('adminPanel').style.display = 'flex';
                }
                document.getElementById('themeToggle').textContent = canvasTheme === 'dark' ? '🌙' : '☀️';
            } catch (err) {
                console.error("Failed to load task:", err);
                document.getElementById('taskTitle').innerText = "Помилка завантаження";
            }
        }

        function updateUI() {
            document.getElementById('taskTitle').innerText = currentTask.title;
            const dayLabel = currentTask.day
                ? `День ${currentTask.day} · ${currentTask.type === 'challenge' ? '⭐ Челендж' : `Урок ${currentTask.order_in_day}`}`
                : `Завдання #${currentTask.id.split('_')[1]}`;
            document.getElementById('dayLabel').innerText = dayLabel;

            document.getElementById('hintBox').innerText = currentTask.description || currentTask.audio_intro || '';

            document.getElementById('logoLink').href = `progress.html?uid=${uid}`;

            // Avatar bubble
            const profileRaw = localStorage.getItem(`profile_${uid}`);
            const avatarBubble = document.getElementById('avatarBubble');
            if (profileRaw && avatarBubble) {
                const profile = JSON.parse(profileRaw);
                avatarBubble.textContent = profile.avatarEmoji || '👤';
                avatarBubble.href = `profile.html?uid=${uid}`;
            } else if (avatarBubble) {
                avatarBubble.href = `profile.html?uid=${uid}`;
            }

            // Animated logo: alternates between "Кодомандри" and "👆 Твій прогрес тут"
            const logoMain = document.getElementById('logoMain');
            const logoCta = document.getElementById('logoCta');
            let logoShowingCta = false;
            setInterval(() => {
                logoShowingCta = !logoShowingCta;
                if (logoShowingCta) {
                    logoMain.className = 'logo-text hidden';
                    logoCta.className = 'logo-cta visible';
                } else {
                    logoMain.className = 'logo-text visible';
                    logoCta.className = 'logo-cta hidden';
                }
            }, 3500);

            const progress = JSON.parse(localStorage.getItem(`progress_${uid}`) || '{"completedTasks":[], "streak":0}');
            document.getElementById('streakLabel').innerText = `🔥 ${progress.streak} днів`;
            document.getElementById('starsLabel').innerText = `⭐ ${progress.stars || 0}`;

            // Show save/load buttons for Day 5+
            if ((currentTask.day || 0) >= 5) {
                document.getElementById('saveBar').classList.add('visible');
            }

            // Show intro overlay for new block presentation (once per block per user)
            if (currentTask.intro_block && typeof AnimEngine !== 'undefined') {
                AnimEngine.trigger('intro_overlay', {
                    blockId: currentTask.intro_block.id,
                    uid,
                });
            }

            // Mobile: show task announcement modal with TTS
            if (isMobile) {
                const charEmojis = {
                    'cat':'🐱','dog':'🐶','parrot':'🦜','snail':'🐌','frog':'🐸',
                    'rabbit':'🐰','robot':'🤖','bee':'🐝','turtle':'🐢','pixel':'👾'
                };
                const introText = currentTask.audio_intro || currentTask.description || '';
                document.getElementById('mtmEmoji').textContent = charEmojis[currentTask.character] || '🤖';
                document.getElementById('mtmTitle').textContent = currentTask.title || '';
                document.getElementById('mtmText').textContent = introText;
                document.getElementById('mobileTaskModal').classList.add('active');
                document.getElementById('mtmOk').onclick = () => {
                    document.getElementById('mobileTaskModal').classList.remove('active');
                };
                if (introText) speak(introText);
            }
        }

        function initBlockly() {
            const toolbox = {
                'kind': 'flyoutToolbox',
                'contents': currentTask.available_blocks.map(blockId => ({
                    'kind': 'block',
                    'type': blockId
                }))
            };

            // Custom block definitions (minimal set)
            if (!Blockly.Blocks['move_right']) {
                Blockly.defineBlocksWithJsonArray([
                    { "type": "move_right", "message0": "йти вправо ➔", "previousStatement": null, "nextStatement": null, "colour": 230 },
                    { "type": "move_left", "message0": "йти вліво ⬅", "previousStatement": null, "nextStatement": null, "colour": 230 },
                    { "type": "move_up", "message0": "йти вгору ⬆", "previousStatement": null, "nextStatement": null, "colour": 230 },
                    { "type": "move_down", "message0": "йти вниз ⬇", "previousStatement": null, "nextStatement": null, "colour": 230 },
                    { "type": "move_right_steps", "message0": "йти вправо %1 кроків", "args0": [{"type": "field_number", "name": "STEPS", "value": 1, "min": 1, "max": 20}], "previousStatement": null, "nextStatement": null, "colour": 230 },
                    { "type": "move_left_steps", "message0": "йти вліво %1 кроків", "args0": [{"type": "field_number", "name": "STEPS", "value": 1, "min": 1, "max": 20}], "previousStatement": null, "nextStatement": null, "colour": 230 },
                    { "type": "move_up_steps", "message0": "йти вгору %1 кроків", "args0": [{"type": "field_number", "name": "STEPS", "value": 1, "min": 1, "max": 20}], "previousStatement": null, "nextStatement": null, "colour": 230 },
                    { "type": "move_down_steps", "message0": "йти вниз %1 кроків", "args0": [{"type": "field_number", "name": "STEPS", "value": 1, "min": 1, "max": 20}], "previousStatement": null, "nextStatement": null, "colour": 230 },
                    { "type": "jump", "message0": "стрибнути ⤊", "previousStatement": null, "nextStatement": null, "colour": 290 },
                    { "type": "repeat_3", "message0": "повторити 3 рази %1 %2", "args0": [{ "type": "input_dummy" }, { "type": "input_statement", "name": "DO" }], "previousStatement": null, "nextStatement": null, "colour": 120 },
                    { "type": "repeat_5", "message0": "повторити 5 разів %1 %2", "args0": [{ "type": "input_dummy" }, { "type": "input_statement", "name": "DO" }], "previousStatement": null, "nextStatement": null, "colour": 120 },
                    { "type": "always", "message0": "завжди %1 %2", "args0": [{ "type": "input_dummy" }, { "type": "input_statement", "name": "DO" }], "previousStatement": null, "nextStatement": null, "colour": 120 },
                    { "type": "if_obstacle", "message0": "якщо перешкода %1 %2", "args0": [{ "type": "input_dummy" }, { "type": "input_statement", "name": "DO" }], "previousStatement": null, "nextStatement": null, "colour": 20 },
                    { "type": "event_flag", "message0": "коли натиснуто прапорець", "nextStatement": null, "colour": 65, "hat": "cap" },
                    { "type": "event_click", "message0": "коли натиснуто на героя", "nextStatement": null, "colour": 65, "hat": "cap" },
                    { "type": "say_alert", "message0": "сказати %1", "args0": [{ "type": "field_input", "name": "TEXT", "text": "Привіт!" }], "previousStatement": null, "nextStatement": null, "colour": 160 },
                    { "type": "repair_bridge", "message0": "полагодити міст", "previousStatement": null, "nextStatement": null, "colour": 230 },
                    { "type": "hit_hammer", "message0": "вдарити молотком", "previousStatement": null, "nextStatement": null, "colour": 230 },
                    { "type": "use_water", "message0": "використати воду", "previousStatement": null, "nextStatement": null, "colour": 230 },
                    { "type": "strike_sword", "message0": "вдарити мечем", "previousStatement": null, "nextStatement": null, "colour": 230 },
                    { "type": "if_touching_sign", "message0": "якщо торкаєшся знака %1 %2", "args0": [{ "type": "input_dummy" }, { "type": "input_statement", "name": "DO" }], "previousStatement": null, "nextStatement": null, "colour": 210 },
                    { "type": "if_near_creeper", "message0": "якщо поруч крипер %1 %2", "args0": [{ "type": "input_dummy" }, { "type": "input_statement", "name": "DO" }], "previousStatement": null, "nextStatement": null, "colour": 210 },
                    { "type": "if_wall", "message0": "якщо стіна %1 %2", "args0": [{ "type": "input_dummy" }, { "type": "input_statement", "name": "DO" }], "previousStatement": null, "nextStatement": null, "colour": 210 },
                    { "type": "if_dragon_fire", "message0": "якщо вогонь дракона %1 %2", "args0": [{ "type": "input_dummy" }, { "type": "input_statement", "name": "DO" }], "previousStatement": null, "nextStatement": null, "colour": 210 },
                    { "type": "if_else_safe", "message0": "якщо безпечно %1 %2 інакше %3 %4", "args0": [{ "type": "input_dummy" }, { "type": "input_statement", "name": "DO" }, { "type": "input_dummy" }, { "type": "input_statement", "name": "ELSE" }], "previousStatement": null, "nextStatement": null, "colour": 210 },
                    { "type": "if_else_bridge_ok", "message0": "якщо міст цілий %1 %2 інакше %3 %4", "args0": [{ "type": "input_dummy" }, { "type": "input_statement", "name": "DO" }, { "type": "input_dummy" }, { "type": "input_statement", "name": "ELSE" }], "previousStatement": null, "nextStatement": null, "colour": 210 },
                    { "type": "pencil_down", "message0": "✏️ олівець вниз", "previousStatement": null, "nextStatement": null, "colour": 180 },
                    { "type": "pencil_up", "message0": "✏️ олівець вгору", "previousStatement": null, "nextStatement": null, "colour": 180 }
                ]);
            }

            // Ukrainian labels for Blockly prompts
            Blockly.Msg['CHANGE_VALUE_TITLE'] = 'Введи число';
            Blockly.Msg['MATH_NUMBER_TOOLTIP'] = 'Число';

            workspace = Blockly.inject('blocklyDiv', {
                toolbox: toolbox,
                theme: Blockly.Themes.Dark,
                grid: { snap: true },
                trashcan: true,
                scrollbars: true,
                zoom: {
                    controls: true,
                    wheel: true,
                    startScale: 1.0,
                    maxScale: 2,
                    minScale: 0.4,
                    scaleSpeed: 1.2
                }
            });
        }

        let canvasTheme = localStorage.getItem('canvasTheme') || 'dark';

        function xmlTextToDom(text) {
            return new DOMParser().parseFromString(text, 'text/xml').documentElement;
        }

        function saveWorkspace() {
            if (!workspace || !currentTask) return;
            try {
                const xml = Blockly.Xml.workspaceToDom(workspace);
                localStorage.setItem(`ws_${currentTask.id}`, new XMLSerializer().serializeToString(xml));
            } catch(e) {}
        }

        function loadWorkspace() {
            if (!workspace || !currentTask) return;
            const saved = localStorage.getItem(`ws_${currentTask.id}`);
            if (!saved) return;
            document.getElementById('resumeOverlay').classList.add('active');
        }

        function resumeYes() {
            document.getElementById('resumeOverlay').classList.remove('active');
            const saved = localStorage.getItem(`ws_${currentTask.id}`);
            if (!saved) return;
            try {
                workspace.clear();
                Blockly.Xml.domToWorkspace(xmlTextToDom(saved), workspace);
            } catch(e) {}
        }

        function resumeNo() {
            document.getElementById('resumeOverlay').classList.remove('active');
            localStorage.removeItem(`ws_${currentTask.id}`);
        }

        function manualSave() {
            saveWorkspace();
            showToast('Збережено ✓');
        }

        function manualLoad() {
            const saved = localStorage.getItem(`ws_${currentTask.id}`);
            if (!saved) {
                showToast('Немає збереженого коду 🤷');
                return;
            }
            try {
                workspace.clear();
                Blockly.Xml.domToWorkspace(xmlTextToDom(saved), workspace);
                showToast('Код завантажено 📂');
            } catch(e) {}
        }

        function showToast(msg) {
            const toast = document.getElementById('saveToast');
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        }

        function exportWorkspace() {
            if (!workspace) return;
            const xml = Blockly.Xml.workspaceToDom(workspace);
            const text = new XMLSerializer().serializeToString(xml);
            navigator.clipboard.writeText(text).then(() => alert('XML скопійовано в буфер обміну!'));
        }

        async function importWorkspace() {
            const text = await navigator.clipboard.readText().catch(() => null);
            if (!text) { alert('Буфер порожній або доступ заблоковано'); return; }
            try {
                workspace.clear();
                Blockly.Xml.domToWorkspace(xmlTextToDom(text), workspace);
            } catch(e) { alert('Помилка парсингу XML: ' + e.message); }
        }

        function clearSavedWorkspace() {
            if (!currentTask) return;
            localStorage.removeItem(`ws_${currentTask.id}`);
            workspace.clear();
        }

        function toggleCanvasTheme() {
            canvasTheme = canvasTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('canvasTheme', canvasTheme);
            document.getElementById('themeToggle').textContent = canvasTheme === 'dark' ? '🌙' : '☀️';
        }

        function initCanvas() {
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;

            const LOGICAL_W = 600;
            const LOGICAL_H = 450;
            const displayW = canvas.clientWidth;
            const displayH = canvas.clientHeight;
            const gameScale = Math.min(displayW / LOGICAL_W, displayH / LOGICAL_H);

            canvas.width = displayW * dpr;
            canvas.height = displayH * dpr;
            ctx.scale(dpr * gameScale, dpr * gameScale);
            canvas._gameScale = gameScale;
            canvas._logicalW = LOGICAL_W;
            canvas._logicalH = LOGICAL_H;

            // Full display area in logical coordinates (may be larger than LOGICAL_W/H if aspect differs)
            const fullW = displayW / gameScale;
            const fullH = displayH / gameScale;

            charPos = { x: currentTask.startX, y: currentTask.startY };

            function draw() {
                ctx.clearRect(0, 0, fullW, fullH);
                ctx.fillStyle = canvasTheme === 'light' ? '#f0f4f8' : '#1e293b';
                ctx.fillRect(0, 0, fullW, fullH);

                // Draw Grid across the full canvas area so no blank strips appear
                ctx.strokeStyle = canvasTheme === 'light' ? 'rgba(100, 116, 139, 0.6)' : 'rgba(51, 65, 85, 0.5)';
                for (let x = 0; x < fullW; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, fullH); ctx.stroke(); }
                for (let y = 0; y < fullH; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(fullW, y); ctx.stroke(); }

                // All emoji drawn with textBaseline='top' so they sit inside their grid cell on Y axis
                ctx.textBaseline = 'top';

                // Target Mapping
                const targetEmojis = {
                    'star': '⭐',
                    'bone': '🦴',
                    'branch': '🌿',
                    'flower': '🌸',
                    'leaf': '🍃',
                    'carrot': '🥕',
                    'battery': '🔋',
                    'ocean': '🌊',
                    'ribbon': '🎀',
                    'nest': '🪹',
                    'station': '🔌',
                    'farm': '🏡',
                    'beach': '🏖️',
                    'cup': '🏆',
                    'ender_sign': '🔮',
                    'farmer': '👨‍🌾',
                    'chest': '📦',
                    'castle_gate': '🏰',
                    'safe_zone': '🛡️',
                    'blacksmith': '⚒️',
                    'fox_byte': '🦊',
                    'pixie': '🧚',
                    'anvil': '🗜️',
                    'ender_dragon': '🐉',
                    'fish': '🐟'
                };
                if (currentTask.target_type !== 'none') {
                    ctx.font = '32px serif';
                    const targetEmoji = targetEmojis[currentTask.target_type] || '⭐';
                    ctx.fillText(targetEmoji, currentTask.target_x, currentTask.target_y);
                }

                // Obstacles Mapping
                if (currentTask.obstacles) {
                    currentTask.obstacles.forEach(obs => {
                        let obsEmoji = '🚧';
                        if (obs.type === 'creeper_hole') obsEmoji = '🕳️';
                        if (obs.type === 'unknown_path') obsEmoji = '❓';
                        if (obs.type === 'arrow') obsEmoji = '🏹';
                        if (obs.type === 'fire' || obs.type === 'dragon_fire') obsEmoji = '🔥';
                        if (obs.type === 'pixel_wall' || obs.type === 'rock') obsEmoji = '🪨';
                        if (obs.type === 'broken_bridge') obsEmoji = '🌉';
                        if (obs.type === 'wind_zone') obsEmoji = '💨';

                        ctx.fillText(obsEmoji, obs.x, obs.y);
                    });
                }

                // Drawing guide (faint letter/shape outlines for tracing)
                if (currentTask.drawing_guide) {
                    ctx.save();
                    ctx.strokeStyle = 'rgba(180, 100, 220, 0.22)';
                    ctx.lineWidth = 7;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    for (const stroke of currentTask.drawing_guide) {
                        if (!stroke || stroke.length < 2) continue;
                        ctx.beginPath();
                        ctx.moveTo(stroke[0][0] + 25, stroke[0][1] + 25);
                        for (let i = 1; i < stroke.length; i++) {
                            ctx.lineTo(stroke[i][0] + 25, stroke[i][1] + 25);
                        }
                        ctx.stroke();
                    }
                    ctx.restore();
                }

                // Pencil trail
                if (pencilTrail.length > 0) {
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 4;
                    ctx.lineCap = 'round';
                    pencilTrail.forEach(seg => {
                        ctx.beginPath();
                        ctx.moveTo(seg.x1 + 25, seg.y1 + 25);
                        ctx.lineTo(seg.x2 + 25, seg.y2 + 25);
                        ctx.stroke();
                    });
                    ctx.lineWidth = 1;
                }

                // Character Mapping
                ctx.font = '40px serif';
                const charEmojis = {
                    'cat': '🐱',
                    'dog': '🐶',
                    'parrot': '🦜',
                    'snail': '🐌',
                    'frog': '🐸',
                    'rabbit': '🐰',
                    'robot': '🤖',
                    'bee': '🐝',
                    'turtle': '🐢',
                    'pixel': '👾'
                };
                const emoji = charEmojis[currentTask.character] || '🐱';
                ctx.fillText(emoji, charPos.x, charPos.y);
                requestAnimationFrame(draw);
            }
            canvas.addEventListener('click', (e) => {
                const rect = canvas.getBoundingClientRect();
                const scale = canvas._gameScale || 1;
                const logicalX = (e.clientX - rect.left) / scale;
                const logicalY = (e.clientY - rect.top) / scale;
                if (Math.abs(logicalX - charPos.x) < 30 && Math.abs(logicalY - charPos.y) < 30) {
                    runCode('click');
                }
            });

            draw();
        }

        // --- Допоміжна: перевірка чи герой досяг цілі ---
        function reachedTarget() {
            return Math.abs(charPos.x - currentTask.target_x) < 5 && Math.abs(charPos.y - currentTask.target_y) < 5;
        }

        // --- Animation Engine ---
        const EVENT_BLOCK_TYPES = ['event_flag', 'event_click'];

        async function executeChain(startBlock) {
            let block = startBlock;
            while (block) {
                const type = block.type;

                if (type.endsWith('_steps')) {
                    const baseType = type.replace('_steps', '');
                    const dir = baseType.replace('move_', '');
                    const steps = parseInt(block.getFieldValue('STEPS')) || 1;
                    for (let i = 0; i < steps; i++) {
                        moveLog.push({type: 'move', dir, penDown: pencilDown, x: charPos.x, y: charPos.y});
                        const hit = await move(baseType);
                        if (hit) return false;
                        if (reachedTarget() && !(currentTask.drawingPattern && currentTask.drawingPattern.figureType)) return true;
                    }
                } else if (type.startsWith('move_') || type === 'jump') {
                    if (type !== 'jump') moveLog.push({type: 'move', dir: type.replace('move_', ''), penDown: pencilDown, x: charPos.x, y: charPos.y});
                    const hitObstacle = await move(type);
                    if (hitObstacle) return false;
                } else if (type === 'repeat_3' || type === 'repeat_5' || type === 'always') {
                    const times = type === 'repeat_3' ? 3 : type === 'repeat_5' ? 5 : 20;
                    for (let i = 0; i < times; i++) {
                        const ok = await executeChain(block.getInputTargetBlock('DO'));
                        if (!ok) return false;
                        if (type === 'always' && reachedTarget() && !(currentTask.drawingPattern && currentTask.drawingPattern.figureType)) return true;
                    }
                } else if (type === 'say_alert') {
                    const text = block.getFieldValue('TEXT') || 'Привіт!';
                    alert(text);
                } else if (type === 'pencil_down') {
                    pencilDown = true;
                    moveLog.push({type: 'pen', down: true});
                } else if (type === 'pencil_up') {
                    pencilDown = false;
                    moveLog.push({type: 'pen', down: false});
                } else if (type === 'repair_bridge' || type === 'hit_hammer' || type === 'use_water' || type === 'strike_sword') {
                    await move(type);
                } else if (type === 'if_obstacle') {
                    if (checkCollision()) {
                        const ok = await executeChain(block.getInputTargetBlock('DO'));
                        if (!ok) return false;
                    }
                } else if (type === 'if_touching_sign') {
                    const nearSign = currentTask.target_type === 'ender_sign'
                        ? (Math.abs(charPos.x - currentTask.target_x) < 30 && Math.abs(charPos.y - currentTask.target_y) < 30)
                        : checkCollision('ender_sign');
                    if (nearSign) {
                        const ok = await executeChain(block.getInputTargetBlock('DO'));
                        if (!ok) return false;
                    }
                } else if (type === 'if_near_creeper') {
                    if (checkCollision('creeper_hole')) {
                        const ok = await executeChain(block.getInputTargetBlock('DO'));
                        if (!ok) return false;
                    }
                } else if (type === 'if_wall') {
                    if (checkCollision('pixel_wall')) {
                        const ok = await executeChain(block.getInputTargetBlock('DO'));
                        if (!ok) return false;
                    }
                } else if (type === 'if_dragon_fire') {
                    if (checkCollision('dragon_fire')) {
                        const ok = await executeChain(block.getInputTargetBlock('DO'));
                        if (!ok) return false;
                    }
                } else if (type === 'if_else_safe') {
                    if (!checkCollision('unknown_path')) {
                        const ok = await executeChain(block.getInputTargetBlock('DO'));
                        if (!ok) return false;
                    } else {
                        const ok = await executeChain(block.getInputTargetBlock('ELSE'));
                        if (!ok) return false;
                    }
                } else if (type === 'if_else_bridge_ok') {
                    if (!checkCollision('broken_bridge')) {
                        const ok = await executeChain(block.getInputTargetBlock('DO'));
                        if (!ok) return false;
                    } else {
                        const ok = await executeChain(block.getInputTargetBlock('ELSE'));
                        if (!ok) return false;
                    }
                }

                block = block.getNextBlock();
            }
            return true;
        }

        async function runCode(trigger = 'flag') {
            const topBlocks = workspace.getTopBlocks(true);
            charPos = { x: currentTask.startX, y: currentTask.startY };
            stepCount = 0;
            pencilDown = false;
            pencilTrail = [];
            moveLog = [];
            _outOfBounds = false;
            document.getElementById('successOverlay').classList.remove('active');

            // If task has event blocks — only run chains connected to event blocks
            const taskUsesEventBlocks = currentTask.available_blocks &&
                currentTask.available_blocks.some(b => EVENT_BLOCK_TYPES.includes(b));

            for (let block of topBlocks) {
                const type = block.type;
                if (type === 'event_flag' && trigger === 'flag') {
                    const ok = await executeChain(block.getNextBlock());
                    if (!ok) return false;
                } else if (type === 'event_click' && trigger === 'click') {
                    const ok = await executeChain(block.getNextBlock());
                    if (!ok) return false;
                } else if (!EVENT_BLOCK_TYPES.includes(type) && trigger === 'flag' && !taskUsesEventBlocks) {
                    // Legacy: tasks without event blocks run all top-level chains
                    const ok = await executeChain(block);
                    if (!ok) return false;
                }
            }
            return true;
        }



        function checkCollision(requiredType = null) {
            if (!currentTask.obstacles) return false;

            const roundedX = Math.round(charPos.x / 50) * 50;
            const roundedY = Math.round(charPos.y / 50) * 50;

            for (let obs of currentTask.obstacles) {
                if (Math.abs(roundedX - obs.x) < 20 && Math.abs(roundedY - obs.y) < 20) {
                    if (requiredType !== null) {
                        if (obs.type === requiredType) return true;
                    } else {
                        return true;
                    }
                }
            }
            return false;
        }

        // Scene logical bounds (matches LOGICAL_W/H in initCanvas)
        const SCENE_MAX_X = 550; // 600 - 50 (one step)
        const SCENE_MAX_Y = 400; // 450 - 50 (one step)
        let _outOfBounds = false;

        function move(type) {
            if (['repair_bridge', 'hit_hammer', 'use_water', 'strike_sword'].includes(type)) {
                return new Promise(r => setTimeout(() => r(false), 500));
            }
            playStepSound();
            const trailStartX = charPos.x;
            const trailStartY = charPos.y;
            return new Promise(resolve => {
                const step = 50;
                let frames = 10;
                const interval = setInterval(() => {
                    if (type === 'jump') {
                        if (frames > 5) {
                            charPos.y -= 15;
                        } else {
                            charPos.y += 15;
                        }
                    } else if (type === 'move_right') charPos.x += step / 10;
                    else if (type === 'move_left') charPos.x -= step / 10;
                    else if (type === 'move_up') charPos.y -= step / 10;
                    else if (type === 'move_down') charPos.y += step / 10;

                    frames--;
                    if (frames <= 0) {
                        clearInterval(interval);
                        charPos.x = Math.round(charPos.x / 50) * 50;
                        charPos.y = Math.round(charPos.y / 50) * 50;

                        // Bounds check — герой не може виходити за межі сцени
                        if (type !== 'jump' && (charPos.x < 0 || charPos.x > SCENE_MAX_X || charPos.y < 0 || charPos.y > SCENE_MAX_Y)) {
                            charPos.x = Math.max(0, Math.min(SCENE_MAX_X, charPos.x));
                            charPos.y = Math.max(0, Math.min(SCENE_MAX_Y, charPos.y));
                            _outOfBounds = true;
                            resolve(true);
                            return;
                        }

                        // Record pencil trail segment
                        if (pencilDown && type !== 'jump') {
                            pencilTrail.push({ x1: trailStartX, y1: trailStartY, x2: charPos.x, y2: charPos.y });
                        }

                        // Якщо після кроку ми в перешкоді - повертаємо true (hit)
                        if (type !== 'jump' && checkCollision()) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    }
                }, 50);
            });
        }

        // --- Duplicate step-block validator (Day 3+) ---
        // Returns true only if two CONSECUTIVE blocks have the same _steps type
        // (e.g. вгору→вправо→вгору is OK; вгору→вгору is NOT OK)
        function checkDuplicateSteps() {
            const topBlocks = workspace.getTopBlocks(true);
            for (const top of topBlocks) {
                let block = EVENT_BLOCK_TYPES.includes(top.type) ? top.getNextBlock() : top;
                let prevStepType = null;
                while (block) {
                    if (block.type.endsWith('_steps')) {
                        if (block.type === prevStepType) return true;
                        prevStepType = block.type;
                    } else {
                        prevStepType = null;
                    }
                    block = block.getNextBlock();
                }
            }
            return false;
        }

        // --- Pencil state ---
        let pencilDown = false;
        let pencilTrail = [];
        let moveLog = []; // [{type:'move', dir:'right', penDown:bool} | {type:'pen', down:bool}]

        // --- Sounds ---
        let stepCount = 0;

        function playSuccessSound() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const notes = [261, 329, 392, 523]; // C4→E4→G4→C5 «магічна гамма»
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    const t = ctx.currentTime + i * 0.18;
                    gain.gain.setValueAtTime(0.18, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
                    osc.start(t);
                    osc.stop(t + 0.25);
                });
            } catch(e) {}
        }

        function playStepSound() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'square';
                osc.frequency.value = 220 + Math.floor(stepCount / 2) * 20;
                const t = ctx.currentTime;
                gain.gain.setValueAtTime(0.08, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
                osc.start(t);
                osc.stop(t + 0.12);
                stepCount++;
            } catch(e) {}
        }

        // --- Interaction ---
        function playFailSound() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const notes = [523, 415, 330, 262]; // C5→Ab4→E4→C4 «вааа»
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sawtooth';
                    osc.frequency.value = freq;
                    const t = ctx.currentTime + i * 0.13;
                    gain.gain.setValueAtTime(0.18, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
                    osc.start(t);
                    osc.stop(t + 0.18);
                });
            } catch(e) {}
        }

        function triggerFailAnimation() {
            const panel = document.querySelector('.preview-panel');
            panel.classList.remove('shake');
            void panel.offsetWidth; // reflow
            panel.classList.add('shake');
            panel.addEventListener('animationend', () => panel.classList.remove('shake'), { once: true });
        }

        // --- Drawing validation ---
        function getPenSegments(log) {
            const segs = []; let cur = [], inPen = false;
            for (const e of log) {
                if (e.type === 'pen') {
                    if (e.down) { inPen = true; }
                    else { if (cur.length) { segs.push(cur); cur = []; } inPen = false; }
                } else if (e.type === 'move' && inPen) { cur.push(e.dir); }
            }
            if (cur.length) segs.push(cur);
            return segs;
        }

        function mergeDirs(dirs) {
            if (!dirs.length) return [];
            const r = [{dir: dirs[0], count: 1}];
            for (let i = 1; i < dirs.length; i++) {
                if (dirs[i] === r[r.length-1].dir) r[r.length-1].count++;
                else r.push({dir: dirs[i], count: 1});
            }
            return r;
        }

        function isClosedShape(dirs) {
            let x = 0, y = 0;
            for (const d of dirs) {
                if (d === 'right') x++; else if (d === 'left') x--;
                else if (d === 'up') y--; else if (d === 'down') y++;
            }
            return x === 0 && y === 0;
        }

        function isStairs(dirs, count) {
            const m = mergeDirs(dirs);
            if (m.length !== count * 2) return false;
            const d1 = m[0].dir, d2 = m[1].dir;
            if (d1 === d2) return false;
            const size1 = m[0].count, size2 = m[1].count;
            for (let i = 0; i < count; i++) {
                if (m[i*2].dir !== d1 || m[i*2+1].dir !== d2) return false;
                if (m[i*2].count !== size1 || m[i*2+1].count !== size2) return false;
            }
            return true;
        }

        function validateDrawing(pattern, log) {
            if (pattern.requirePen && !log.some(e => e.type === 'move' && e.penDown))
                return { ok: false, msg: '✏️ Щоб намалювати — спочатку опусти олівець!' };

            const segs = getPenSegments(log);

            if (pattern.requireGap && segs.length < 2)
                return { ok: false, msg: '✏️ Між фігурами підніми олівець!' };

            if (pattern.figures && segs.length < pattern.figures)
                return { ok: false, msg: `Намалюй ${pattern.figures} фігури окремо!` };

            if (pattern.figureType === 'stairs') {
                if (!isStairs(segs.flat(), pattern.stairCount || 3))
                    return { ok: false, msg: '🪜 Намалюй сходинки: чергуй два напрямки рівними відрізками!' };
            }

            if (pattern.figureType === 'closedShape') {
                const toCheck = pattern.figures ? segs.slice(0, pattern.figures) : segs;
                for (const seg of toCheck) {
                    if (!isClosedShape(seg))
                        return { ok: false, msg: '🔲 Фігура не замкнена — герой має повернутись до початкової точки!' };
                }
            }

            if (pattern.penZones) {
                for (const zone of pattern.penZones) {
                    const hasStroke = log.some(e =>
                        e.type === 'move' && e.penDown &&
                        e.x >= zone.xMin && e.x <= zone.xMax
                    );
                    if (!hasStroke)
                        return { ok: false, msg: zone.msg || `✏️ Намалюй фігуру в зоні x=${zone.xMin}–${zone.xMax}!` };
                }
            }

            return { ok: true };
        }

        document.getElementById('runBtn').onclick = async () => {
            // Block duplicate _steps blocks (teaches students to use the number field)
            if (currentTask.available_blocks && currentTask.available_blocks.some(b => b.endsWith('_steps'))) {
                if (checkDuplicateSteps()) {
                    triggerFailAnimation();
                    playFailSound();
                    document.getElementById('hintBox').innerText = '🚫 Не можна використовувати однаковий блок двічі! Замість двох однакових блоків — використай один і впиши правильне число кроків у поле всередині.';
                    document.getElementById('hintBox').style.color = '#f43f5e';
                    setTimeout(() => {
                        document.getElementById('hintBox').style.color = '';
                        document.getElementById('hintBox').innerText = currentTask.description || '';
                    }, 4000);
                    return;
                }
            }

            const successRun = await runCode('flag');
            await new Promise(r => setTimeout(r, 500));
            let isCorrect = successRun && reachedTarget();

            // Drawing validation for pencil tasks — runs always, shows specific error reason
            if (currentTask.drawingPattern) {
                const drawCheck = validateDrawing(currentTask.drawingPattern, moveLog);
                const showDrawError = (msg) => {
                    isCorrect = false;
                    triggerFailAnimation();
                    playFailSound();
                    document.getElementById('hintBox').innerText = msg;
                    document.getElementById('hintBox').style.color = '#f43f5e';
                    setTimeout(() => {
                        document.getElementById('hintBox').style.color = '';
                        document.getElementById('hintBox').innerText = currentTask.description || '';
                    }, 4000);
                };
                if (!drawCheck.ok) {
                    showDrawError(drawCheck.msg);
                } else if (currentTask.drawingPattern.figureType || currentTask.target_type === 'none') {
                    // For shape tasks (stairs/closedShape/figures): drawing is the goal, ignore target
                    isCorrect = true;
                } else if (!reachedTarget()) {
                    // Simple pen tasks (requirePen only): still need to reach the star
                    showDrawError('⭐ Олівець піднятий правильно! Але герой має дійти до зірки.');
                } else {
                    isCorrect = true;
                }
            }

            if (isCorrect) {
                playSuccessSound();
                markTaskDoneToday();
                document.getElementById('successOverlay').classList.add('active');
                let progress = JSON.parse(localStorage.getItem(`progress_${uid}`) || '{"completedTasks":[], "completedDays":[], "streak":0, "stars":0}');
                if (!progress.completedDays) progress.completedDays = [];
                if (!progress.stars) progress.stars = 0;

                if (!progress.completedTasks.includes(currentTask.id)) {
                    progress.completedTasks.push(currentTask.id);

                    // Add stars for this task
                    progress.stars += (currentTask.stars || 1);

                    // Auto-complete all lessons of the day when challenge is passed
                    if (currentTask.type === 'challenge') {
                        const dayLessons = allTasks.filter(t => t.day === currentTask.day && t.type !== 'challenge');
                        dayLessons.forEach(t => {
                            if (!progress.completedTasks.includes(t.id)) {
                                progress.completedTasks.push(t.id);
                                progress.stars += (t.stars || 1);
                            }
                        });
                    }

                    document.getElementById('starsLabel').innerText = `⭐ ${progress.stars}`;

                    // Стрік зараховується лише коли закрито весь день (всі вправи + челендж)
                    const dayTasks = allTasks.filter(t => t.day === currentTask.day);
                    const dayComplete = dayTasks.every(t => progress.completedTasks.includes(t.id));
                    if (dayComplete && !progress.completedDays.includes(currentTask.day)) {
                        progress.completedDays.push(currentTask.day);
                        progress.streak = (progress.streak || 0) + 1;
                        document.getElementById('streakLabel').innerText = `🔥 ${progress.streak} днів`;
                    }

                    localStorage.setItem(`progress_${uid}`, JSON.stringify(progress));
                }
                // Navigate to next task
                // From challenge → next day's challenge; from lesson → next lesson or challenge
                const nextTask = currentTask.type === 'challenge'
                    ? allTasks.find(t => t.day === (currentTask.day || 0) + 1 && t.type === 'challenge')
                      || allTasks.find(t => t.day === (currentTask.day || 0) + 1 && t.order_in_day === 1)
                    : allTasks.find(t => t.day === currentTask.day && t.order_in_day === currentTask.order_in_day + 1)
                      || allTasks.find(t => t.day === (currentTask.day || 0) + 1 && t.order_in_day === 1);
                const nextBtn = document.getElementById('nextBtn');
                if (nextTask) {
                    nextBtn.onclick = () => location.href = `task.html?task=${nextTask.id}&uid=${uid}`;
                } else {
                    nextBtn.textContent = 'До карти курсу';
                    nextBtn.onclick = () => location.href = `progress.html?uid=${uid}`;
                }
            } else {
                charPos = { x: currentTask.startX, y: currentTask.startY };
                playFailSound();
                triggerFailAnimation();
                const errorMsg = successRun
                    ? currentTask.hint_2 || currentTask.audio_hint || 'Спробуй ще раз!'
                    : _outOfBounds
                        ? '🚧 Стоп! Піксель виходить за межі сцени. Перевір кількість кроків!'
                        : 'Ой! Ти врізався в перешкоду. Спробуй ще раз.';
                document.getElementById('hintBox').innerText = errorMsg;
                document.getElementById('hintBox').style.color = '#f43f5e';
                setTimeout(() => {
                    document.getElementById('hintBox').style.color = '';
                    document.getElementById('hintBox').innerText = currentTask.description || '';
                }, 3000);
            }
        };

        window.onload = init;

        window.addEventListener('resize', () => {
            if (workspace) Blockly.svgResize(workspace);
            if (currentTask) initCanvas();
            if (document.getElementById('debugPanel')) updateDebug();
        });

        // --- Debug overlay (activated by ?debug in URL) ---
        if (new URLSearchParams(window.location.search).has('debug')) {
            const panel = document.createElement('div');
            panel.id = 'debugPanel';
            panel.style.cssText = 'position:fixed;top:0;left:0;z-index:9999;background:rgba(0,0,0,0.85);color:#0f0;font:12px monospace;padding:8px 12px;max-width:100vw;pointer-events:none;';
            document.body.appendChild(panel);

            function updateDebug() {
                const el = (sel) => document.querySelector(sel);
                const h = (el) => el ? Math.round(el.getBoundingClientRect().height) : '?';
                const w = (el) => el ? Math.round(el.getBoundingClientRect().width) : '?';
                panel.innerHTML = [
                    `vw=${window.innerWidth} vh=${window.innerHeight} dpr=${window.devicePixelRatio}`,
                    `orientation=${screen.orientation?.type || (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait')}`,
                    `pointer:coarse=${matchMedia('(pointer:coarse)').matches}`,
                    `portrait=${matchMedia('(orientation:portrait)').matches}`,
                    `mq-mobile=${matchMedia('(pointer:coarse) and (orientation:portrait),(max-width:768px)').matches}`,
                    `mq-landscape-touch=${matchMedia('(pointer:coarse) and (orientation:landscape)').matches}`,
                    `---`,
                    `main: ${w(el('main'))}×${h(el('main'))}`,
                    `sidebar: ${w(el('.sidebar'))}×${h(el('.sidebar'))}`,
                    `preview-panel: ${w(el('.preview-panel'))}×${h(el('.preview-panel'))}`,
                    `canvas: ${w(el('#gameCanvas'))}×${h(el('#gameCanvas'))}`,
                    `controls: ${w(el('.controls'))}×${h(el('.controls'))}`,
                    `controls.bottom=${el('.controls') ? Math.round(el('.controls').getBoundingClientRect().bottom) : '?'} (vh=${window.innerHeight})`,
                ].join('<br>');
            }
            updateDebug();
            setInterval(updateDebug, 1000);
        }

// ===== BLOCKLY PROMPT OVERRIDE =====
        (function () {
            const overlay = document.getElementById('blocklyPromptOverlay');
            const msgEl = document.getElementById('bpMsg');
            const inputEl = document.getElementById('bpInput');
            let _cb = null;

            function confirm(val) {
                overlay.classList.remove('active');
                if (_cb) { _cb(val); _cb = null; }
            }

            document.getElementById('bpOk').onclick = () => confirm(inputEl.value);
            document.getElementById('bpCancel').onclick = () => confirm(null);
            inputEl.addEventListener('keydown', e => {
                if (e.key === 'Enter') confirm(inputEl.value);
                if (e.key === 'Escape') confirm(null);
            });

            // Override Blockly's native window.prompt with our modal
            function installBlocklyPrompt() {
                if (typeof Blockly !== 'undefined' && Blockly.dialog && Blockly.dialog.setPrompt) {
                    Blockly.dialog.setPrompt((message, defaultValue, callback) => {
                        msgEl.textContent = message;
                        inputEl.value = defaultValue || '';
                        _cb = callback;
                        overlay.classList.add('active');
                        setTimeout(() => { inputEl.focus(); inputEl.select(); }, 50);
                    });
                } else {
                    setTimeout(installBlocklyPrompt, 200);
                }
            }
            installBlocklyPrompt();
        })();

    // ===== СКРЕТЧИК — FAB, TTS, STT =====

    let fabOpen = false;

    function toggleFab() {
        fabOpen = !fabOpen;
        document.querySelectorAll('.fab-btn').forEach(b => b.classList.toggle('open', fabOpen));
        // Hide tooltip permanently after first click
        const tooltip = document.getElementById('fabTooltip');
        tooltip.classList.add('hidden');
        localStorage.setItem('fab_tooltip_seen', '1');
    }

    // Close when clicking outside FAB
    document.addEventListener('click', e => {
        if (fabOpen && !document.getElementById('scratchyFab').contains(e.target)) {
            fabOpen = false;
            document.querySelectorAll('.fab-btn').forEach(b => b.classList.remove('open'));
        }
    });

    function closeFab() {
        fabOpen = false;
        document.querySelectorAll('.fab-btn').forEach(b => b.classList.remove('open'));
    }

    function initFab() {
        // Tooltip: show once per day
        const today = new Date().toDateString();
        const seenToday = localStorage.getItem('fab_tooltip_day') === today;
        const seenEver  = localStorage.getItem('fab_tooltip_seen');
        if (seenToday || seenEver) {
            document.getElementById('fabTooltip').classList.add('hidden');
        } else {
            localStorage.setItem('fab_tooltip_day', today);
        }

        // Restore disabled states
        ['fact', 'joke', 'question'].forEach(action => {
            if (wasUsedToday(action)) {
                const btn = document.querySelector(`.fab-btn[data-action="${action}"]`);
                if (btn) btn.disabled = true;
            }
        });
    }

    // ---- Per-day usage tracking ----
    const _fabDebug = new URLSearchParams(location.search).has('fabDebug');

    function wasUsedToday(action) {
        if (_fabDebug) return false;
        return localStorage.getItem(`scratchy_${action}_day`) === new Date().toDateString();
    }

    function markUsedToday(action) {
        if (_fabDebug) return; // no limits in debug mode
        localStorage.setItem(`scratchy_${action}_day`, new Date().toDateString());
        const btn = document.querySelector(`.fab-btn[data-action="${action}"]`);
        if (btn) btn.disabled = true;
    }

    // ---- Mobile detection ----
    const isMobile = matchMedia('(pointer:coarse) and (orientation:portrait),(max-width:768px)').matches;

    // ---- TTS (ElevenLabs або Google Translate — вирішує сервер) ----
    // Silent WAV to unlock autoplay on iOS/Android (must be called synchronously in user gesture)
    const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    let _currentAudio = null;

    function stripMarkdown(t) {
        return t
            .replace(/\*\*(.*?)\*\*/g, '$1')  // **bold**
            .replace(/\*(.*?)\*/g, '$1')        // *italic*
            .replace(/`([^`]+)`/g, '$1')        // `code`
            .replace(/_{1,2}(.*?)_{1,2}/g, '$1')// _italic_ or __bold__
            .replace(/#+\s/g, '')               // # headings
            .trim();
    }

    function speak(text, onEnd) {
        text = stripMarkdown(text);
        // Stop any playing audio first
        if (_currentAudio) {
            _currentAudio.pause();
            _currentAudio.src = '';
            _currentAudio = null;
        }

        const avatar = document.getElementById('fabAvatar');
        avatar.classList.add('speaking');

        // Unlock autoplay synchronously (iOS/Android requirement)
        const audio = new Audio(SILENT_WAV);
        _currentAudio = audio;
        audio.play().catch(() => {});

        const finish = () => {
            if (_currentAudio === audio) _currentAudio = null;
            avatar.classList.remove('speaking');
            if (onEnd) onEnd();
        };

        fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        }).then(r => {
            if (!r.ok) throw new Error(r.status);
            return r.blob();
        }).then(blob => {
            if (_currentAudio !== audio) return; // cancelled
            const url = URL.createObjectURL(blob);
            audio.src = url;
            audio.onended = () => { URL.revokeObjectURL(url); finish(); };
            audio.onerror = finish;
            audio.play().catch(finish);
        }).catch(() => {
            // Server TTS failed — fallback to browser speechSynthesis
            if (_currentAudio !== audio) return;
            _currentAudio = null;
            const utt = new SpeechSynthesisUtterance(text);
            utt.lang = 'uk-UA';
            utt.rate = 0.9;
            utt.onend  = finish;
            utt.onerror = finish;
            speechSynthesis.speak(utt);
        });
    }

    // ---- API call ----
    async function getHint(action, extra = {}) {
        try {
            const resp = await fetch('/api/hint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, task: { ...(currentTask || {}), ...extra } })
            });
            const data = await resp.json();
            if (data.success) return data.hint;
        } catch (_) {}
        return null;
    }

    // ---- Button handlers ----
    async function doFact() {
        closeFab();
        const hint = await getHint('fact');
        if (hint) speak(hint);
        markUsedToday('fact');
    }

    async function doJoke() {
        closeFab();
        // Available only after completing at least 1 task today
        const today = new Date().toDateString();
        const taskDoneToday = localStorage.getItem('scratchy_task_done_day') === today;
        if (!taskDoneToday) {
            speak('Спочатку виконай хоча б одне завдання — тоді розповім! 😄');
            return;
        }
        const hint = await getHint('joke');
        if (hint) speak(hint);
        markUsedToday('joke');
    }

    async function doHelp() {
        closeFab();
        if (isMobile) {
            const text = currentTask.audio_intro || currentTask.description || '';
            if (text) { speak(text); return; }
        }
        const hint = await getHint('start');
        if (hint) speak(hint);
        // Help is always available — no markUsedToday
    }

    async function doQuestion() {
        closeFab();
        if (wasUsedToday('question')) {
            speak('Ти вже задавав мені питання сьогодні! Завтра ще одне! 😊');
            return;
        }
        speak('Задавай! Слухаю тебе уважно!', () => startListening());
    }

    // ---- STT ----
    function startListening() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            speak('Схоже, твій браузер не підтримує мікрофон. Спробуй Chrome! 🎤');
            return;
        }

        const mic = document.getElementById('micIndicator');
        mic.classList.add('active');

        const recognition = new SR();
        recognition.lang = 'uk-UA';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = async e => {
            mic.classList.remove('active');
            const question = e.results[0][0].transcript;
            const hint = await getHint('question', { question });
            if (hint) speak(hint);
            markUsedToday('question');
        };

        recognition.onerror = () => {
            mic.classList.remove('active');
            speak('Не почув тебе. Спробуй ще раз! 🎤');
        };

        recognition.onend = () => mic.classList.remove('active');
        recognition.start();
    }

    // ---- Mark task done (for joke unlock) ----
    // Called from success handler in main script
    function markTaskDoneToday() {
        localStorage.setItem('scratchy_task_done_day', new Date().toDateString());
    }

    // ---- Wire up button clicks ----
    document.getElementById('btnFact').addEventListener('click', doFact);
    document.getElementById('btnJoke').addEventListener('click', doJoke);
    document.getElementById('btnHelp').addEventListener('click', doHelp);
    document.getElementById('btnQuestion').addEventListener('click', doQuestion);

    // Init on page load
    window.addEventListener('load', initFab);
