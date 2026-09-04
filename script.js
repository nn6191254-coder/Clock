/* ==========================================================================
   CHRONO - Elegant Modern Clock JavaScript Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // 1. DOM Elements & State Setup
    // ----------------------------------------------------------------------
    const themeBtn = document.getElementById('themeBtn');
    const themeMenu = document.getElementById('themeMenu');
    const themeOptions = document.querySelectorAll('.theme-option');
    const sweepToggleBtn = document.getElementById('sweepToggleBtn');
    const formatToggleBtn = document.getElementById('formatToggleBtn');

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabViews = document.querySelectorAll('.tab-view');

    // Analog Hands
    const hourHand = document.getElementById('hourHand');
    const minHand = document.getElementById('minHand');
    const secHand = document.getElementById('secHand');
    const dialTicksContainer = document.getElementById('dialTicks');

    // Digital Display
    const digitalTime = document.getElementById('digitalTime');
    const digitalAmpm = document.getElementById('digitalAmpm');
    const digitalDate = document.getElementById('digitalDate');
    const timezoneTag = document.getElementById('timezoneTag');

    // App Preferences (Persistent in LocalStorage)
    let currentTheme = localStorage.getItem('chrono_theme') || 'cyberpunk';
    let isSweepMode = localStorage.getItem('chrono_sweep') !== 'false'; // default true
    let is24HourFormat = localStorage.getItem('chrono_24h') === 'true'; // default false

    // Cumulative rotations for smooth hand movement
    let totalSecRot = 0;
    let totalMinRot = 0;
    let totalHourRot = 0;
    let prevSec = -1;
    let prevMin = -1;
    let prevHour = -1;

    // ----------------------------------------------------------------------
    // 2. Initialization & Themes
    // ----------------------------------------------------------------------
    function init() {
        applyTheme(currentTheme);
        updateToggleButtonsUI();
        createDialTicks();
        setupTimezone();
        loadAlarms();

        // Start Clock Engine Loop
        requestAnimationFrame(updateClockLoop);
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        currentTheme = theme;
        localStorage.setItem('chrono_theme', theme);

        themeOptions.forEach(opt => {
            if (opt.dataset.theme === theme) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
    }

    function updateToggleButtonsUI() {
        sweepToggleBtn.querySelector('.chip-label').textContent = isSweepMode ? 'Sweep' : 'Tick';
        formatToggleBtn.querySelector('.chip-label').textContent = is24HourFormat ? '24H' : '12H';

        if (isSweepMode) {
            secHand.classList.remove('tick-mode');
        } else {
            secHand.classList.add('tick-mode');
        }
    }

    // Generate 60 Dial Ticks dynamically
    function createDialTicks() {
        if (!dialTicksContainer) return;
        dialTicksContainer.innerHTML = '';
        for (let i = 0; i < 60; i++) {
            const tick = document.createElement('div');
            tick.className = i % 5 === 0 ? 'tick major' : 'tick';
            tick.style.transform = `rotate(${i * 6}deg)`;
            dialTicksContainer.appendChild(tick);
        }
    }

    function setupTimezone() {
        try {
            const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const offset = new Date().getTimezoneOffset();
            const absOffset = Math.abs(offset);
            const hrs = String(Math.floor(absOffset / 60)).padStart(2, '0');
            const mins = String(absOffset % 60).padStart(2, '0');
            const sign = offset <= 0 ? '+' : '-';
            timezoneTag.textContent = `${tzName} (GMT${sign}${hrs}:${mins})`;
        } catch (e) {
            timezoneTag.textContent = 'Local Timezone';
        }
    }

    // Theme Menu Toggle
    themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        themeMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        themeMenu.classList.remove('show');
    });

    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            applyTheme(option.dataset.theme);
            themeMenu.classList.remove('show');
        });
    });

    // Toggle Hand Movement Mode (Sweep / Tick)
    sweepToggleBtn.addEventListener('click', () => {
        isSweepMode = !isSweepMode;
        localStorage.setItem('chrono_sweep', isSweepMode);
        updateToggleButtonsUI();
    });

    // Toggle 12h / 24h Digital Format
    formatToggleBtn.addEventListener('click', () => {
        is24HourFormat = !is24HourFormat;
        localStorage.setItem('chrono_24h', is24HourFormat);
        updateToggleButtonsUI();
    });

    // ----------------------------------------------------------------------
    // 3. Tab Navigation
    // ----------------------------------------------------------------------
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabViews.forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`view-${targetTab}`).classList.add('active');
        });
    });

    // ----------------------------------------------------------------------
    // 4. Analog & Digital Clock Update Engine (60 FPS)
    // ----------------------------------------------------------------------
    function updateClockLoop() {
        const now = new Date();
        const hrs = now.getHours();
        const mins = now.getMinutes();
        const secs = now.getSeconds();
        const ms = now.getMilliseconds();

        // High resolution seconds calculation
        const secFraction = isSweepMode ? secs + ms / 1000 : secs;
        const minFraction = mins + secFraction / 60;
        const hourFraction = (hrs % 12) + minFraction / 60;

        // Prevent hands from unwinding when jumping from 359deg -> 0deg
        if (prevSec !== -1) {
            let sDiff = secFraction - (prevSec % 60);
            if (sDiff < -30) sDiff += 60;
            totalSecRot += sDiff * 6;

            let mDiff = minFraction - (prevMin % 60);
            if (mDiff < -30) mDiff += 60;
            totalMinRot += mDiff * 6;

            let hDiff = hourFraction - (prevHour % 12);
            if (hDiff < -6) hDiff += 12;
            totalHourRot += hDiff * 30;
        } else {
            totalSecRot = secFraction * 6;
            totalMinRot = minFraction * 6;
            totalHourRot = hourFraction * 30;
        }

        prevSec = secFraction;
        prevMin = minFraction;
        prevHour = hourFraction;

        // Apply Rotations to Analog Hands
        secHand.style.transform = `rotate(${totalSecRot}deg)`;
        minHand.style.transform = `rotate(${totalMinRot}deg)`;
        hourHand.style.transform = `rotate(${totalHourRot}deg)`;

        // Update Digital Clock (only every second tick to save work)
        updateDigitalClock(now, hrs, mins, secs);

        // Check Alarms every second
        if (secs !== lastAlarmCheckSec) {
            lastAlarmCheckSec = secs;
            checkAlarms(hrs, mins, secs);
        }

        requestAnimationFrame(updateClockLoop);
    }

    let lastAlarmCheckSec = -1;

    function updateDigitalClock(now, hrs, mins, secs) {
        let displayHours = hrs;
        let ampmStr = '';

        if (!is24HourFormat) {
            ampmStr = hrs >= 12 ? 'PM' : 'AM';
            displayHours = hrs % 12;
            if (displayHours === 0) displayHours = 12;
            digitalAmpm.style.display = 'inline';
            digitalAmpm.textContent = ampmStr;
        } else {
            digitalAmpm.style.display = 'none';
        }

        const hStr = String(displayHours).padStart(2, '0');
        const mStr = String(mins).padStart(2, '0');
        const sStr = String(secs).padStart(2, '0');

        digitalTime.textContent = `${hStr}:${mStr}:${sStr}`;

        // Date Display
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        digitalDate.textContent = now.toLocaleDateString('en-US', options);
    }

    // ----------------------------------------------------------------------
    // 5. Stopwatch Feature
    // ----------------------------------------------------------------------
    let swStartTime = 0;
    let swElapsedTime = 0;
    let swTimerInterval = null;
    let swRunning = false;
    let swLaps = [];

    const swMinutes = document.getElementById('swMinutes');
    const swSeconds = document.getElementById('swSeconds');
    const swMs = document.getElementById('swMs');
    const swStartBtn = document.getElementById('swStartBtn');
    const swLapBtn = document.getElementById('swLapBtn');
    const swResetBtn = document.getElementById('swResetBtn');
    const lapsList = document.getElementById('lapsList');
    const lapsContainer = document.getElementById('lapsContainer');

    function updateSwDisplay() {
        const totalMs = swElapsedTime;
        const mins = Math.floor(totalMs / 60000);
        const secs = Math.floor((totalMs % 60000) / 1000);
        const ms = Math.floor((totalMs % 1000) / 10);

        swMinutes.textContent = String(mins).padStart(2, '0');
        swSeconds.textContent = String(secs).padStart(2, '0');
        swMs.textContent = String(ms).padStart(2, '0');
    }

    swStartBtn.addEventListener('click', () => {
        if (!swRunning) {
            // Start
            swRunning = true;
            swStartTime = performance.now() - swElapsedTime;
            swTimerInterval = setInterval(() => {
                swElapsedTime = performance.now() - swStartTime;
                updateSwDisplay();
            }, 10);

            swStartBtn.textContent = 'Pause';
            swStartBtn.className = 'btn btn-secondary';
            swLapBtn.disabled = false;
            swResetBtn.disabled = false;
        } else {
            // Pause
            swRunning = false;
            clearInterval(swTimerInterval);
            swStartBtn.textContent = 'Resume';
            swStartBtn.className = 'btn btn-primary';
            swLapBtn.disabled = true;
        }
    });

    swLapBtn.addEventListener('click', () => {
        if (!swRunning) return;
        const lapTimeStr = `${swMinutes.textContent}:${swSeconds.textContent}.${swMs.textContent}`;
        swLaps.unshift({ number: swLaps.length + 1, time: lapTimeStr });
        renderLaps();
    });

    swResetBtn.addEventListener('click', () => {
        swRunning = false;
        clearInterval(swTimerInterval);
        swElapsedTime = 0;
        swLaps = [];
        updateSwDisplay();
        renderLaps();

        swStartBtn.textContent = 'Start';
        swStartBtn.className = 'btn btn-primary';
        swLapBtn.disabled = true;
        swResetBtn.disabled = true;
    });

    function renderLaps() {
        if (swLaps.length === 0) {
            lapsContainer.querySelector('.empty-laps').style.display = 'block';
            lapsList.innerHTML = '';
            return;
        }

        lapsContainer.querySelector('.empty-laps').style.display = 'none';
        lapsList.innerHTML = swLaps.map(lap => `
            <li class="lap-item">
                <span class="lap-no">Lap ${lap.number}</span>
                <span>${lap.time}</span>
            </li>
        `).join('');
    }

    // ----------------------------------------------------------------------
    // 6. Countdown Timer Feature
    // ----------------------------------------------------------------------
    let timerTotalSeconds = 300; // 5 min default
    let timerRemainingSeconds = 300;
    let timerInterval = null;
    let timerRunning = false;

    const timerInputH = document.getElementById('timerInputH');
    const timerInputM = document.getElementById('timerInputM');
    const timerInputS = document.getElementById('timerInputS');
    const timerInputsGroup = document.getElementById('timerInputsGroup');
    const timerText = document.getElementById('timerText');
    const timerProgressCircle = document.getElementById('timerProgressCircle');
    const timerStartBtn = document.getElementById('timerStartBtn');
    const timerResetBtn = document.getElementById('timerResetBtn');
    const presetBtns = document.querySelectorAll('.preset-btn');

    const totalDash = 597; // 2 * PI * 95

    function setTimerProgress(percent) {
        const offset = totalDash - (percent / 100) * totalDash;
        timerProgressCircle.style.strokeDashoffset = offset;
    }

    function formatTimerDisplay(secs) {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;

        if (h > 0) {
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function getSecondsFromInputs() {
        const h = parseInt(timerInputH.value) || 0;
        const m = parseInt(timerInputM.value) || 0;
        const s = parseInt(timerInputS.value) || 0;
        return h * 3600 + m * 60 + s;
    }

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (timerRunning) return;
            const secs = parseInt(btn.dataset.seconds);
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            const s = secs % 60;

            timerInputH.value = String(h).padStart(2, '0');
            timerInputM.value = String(m).padStart(2, '0');
            timerInputS.value = String(s).padStart(2, '0');

            timerTotalSeconds = secs;
            timerRemainingSeconds = secs;
            setTimerProgress(100);
        });
    });

    timerStartBtn.addEventListener('click', () => {
        if (!timerRunning) {
            if (timerRemainingSeconds <= 0 || !timerRunning && timerInputsGroup.style.display !== 'none') {
                timerTotalSeconds = getSecondsFromInputs();
                timerRemainingSeconds = timerTotalSeconds;
            }

            if (timerTotalSeconds <= 0) return;

            timerRunning = true;
            timerInputsGroup.style.display = 'none';
            timerText.classList.remove('hidden');
            timerText.textContent = formatTimerDisplay(timerRemainingSeconds);

            timerStartBtn.textContent = 'Pause';
            timerStartBtn.className = 'btn btn-secondary';

            timerInterval = setInterval(() => {
                timerRemainingSeconds--;
                const pct = (timerRemainingSeconds / timerTotalSeconds) * 100;
                setTimerProgress(pct);
                timerText.textContent = formatTimerDisplay(timerRemainingSeconds);

                if (timerRemainingSeconds <= 0) {
                    clearInterval(timerInterval);
                    timerRunning = false;
                    playAudioBeepSequence();
                    alertTimerFinished();
                }
            }, 1000);
        } else {
            // Pause
            timerRunning = false;
            clearInterval(timerInterval);
            timerStartBtn.textContent = 'Resume';
            timerStartBtn.className = 'btn btn-primary';
        }
    });

    timerResetBtn.addEventListener('click', () => {
        timerRunning = false;
        clearInterval(timerInterval);
        timerInputsGroup.style.display = 'flex';
        timerText.classList.add('hidden');
        timerRemainingSeconds = getSecondsFromInputs();
        timerTotalSeconds = timerRemainingSeconds;
        setTimerProgress(100);

        timerStartBtn.textContent = 'Start';
        timerStartBtn.className = 'btn btn-primary';
    });

    function alertTimerFinished() {
        timerStartBtn.textContent = 'Start';
        timerStartBtn.className = 'btn btn-primary';
        timerInputsGroup.style.display = 'flex';
        timerText.classList.add('hidden');

        // Simple alert feedback
        showAlarmModal("00:00", "Countdown Timer Finished!");
    }

    // ----------------------------------------------------------------------
    // 7. Alarm Clock Feature
    // ----------------------------------------------------------------------
    let alarms = [];
    const alarmTimeInput = document.getElementById('alarmTimeInput');
    const alarmLabelInput = document.getElementById('alarmLabelInput');
    const addAlarmBtn = document.getElementById('addAlarmBtn');
    const alarmsList = document.getElementById('alarmsList');
    const activeAlarmsBadge = document.getElementById('activeAlarmsBadge');

    const alarmModal = document.getElementById('alarmModal');
    const modalAlarmTime = document.getElementById('modalAlarmTime');
    const modalAlarmLabel = document.getElementById('modalAlarmLabel');
    const dismissAlarmBtn = document.getElementById('dismissAlarmBtn');

    let activeAlarmSoundInterval = null;

    function loadAlarms() {
        const saved = localStorage.getItem('chrono_alarms');
        if (saved) {
            try {
                alarms = JSON.parse(saved);
            } catch (e) {
                alarms = [];
            }
        }
        renderAlarms();
    }

    function saveAlarms() {
        localStorage.setItem('chrono_alarms', JSON.stringify(alarms));
        renderAlarms();
    }

    addAlarmBtn.addEventListener('click', () => {
        const timeVal = alarmTimeInput.value;
        if (!timeVal) return;

        const labelVal = alarmLabelInput.value.trim() || 'Alarm';
        const newAlarm = {
            id: Date.now(),
            time: timeVal, // "HH:MM"
            label: labelVal,
            enabled: true
        };

        alarms.push(newAlarm);
        saveAlarms();

        alarmTimeInput.value = '';
        alarmLabelInput.value = '';
    });

    function renderAlarms() {
        const activeCount = alarms.filter(a => a.enabled).length;
        if (activeCount > 0) {
            activeAlarmsBadge.textContent = activeCount;
            activeAlarmsBadge.classList.remove('hidden');
        } else {
            activeAlarmsBadge.classList.add('hidden');
        }

        if (alarms.length === 0) {
            alarmsList.innerHTML = '<div class="empty-alarms">No alarms set</div>';
            return;
        }

        alarmsList.innerHTML = alarms.map(alarm => `
            <div class="alarm-card">
                <div class="alarm-time-info">
                    <div class="time">${formatAlarmTimeStr(alarm.time)}</div>
                    <div class="label">${escapeHtml(alarm.label)}</div>
                </div>
                <div class="alarm-controls">
                    <label class="switch">
                        <input type="checkbox" ${alarm.enabled ? 'checked' : ''} onchange="toggleAlarm(${alarm.id})">
                        <span class="slider"></span>
                    </label>
                    <button class="delete-alarm-btn" onclick="deleteAlarm(${alarm.id})" title="Delete Alarm">&times;</button>
                </div>
            </div>
        `).join('');
    }

    function formatAlarmTimeStr(timeStr) {
        if (is24HourFormat) return timeStr;
        const [h, m] = timeStr.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        let h12 = h % 12;
        if (h12 === 0) h12 = 12;
        return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    window.toggleAlarm = function(id) {
        alarms = alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a);
        saveAlarms();
    };

    window.deleteAlarm = function(id) {
        alarms = alarms.filter(a => a.id !== id);
        saveAlarms();
    };

    function checkAlarms(hrs, mins, secs) {
        if (secs !== 0) return; // Only check on minute start
        const currentHHMM = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

        alarms.forEach(alarm => {
            if (alarm.enabled && alarm.time === currentHHMM) {
                triggerAlarm(alarm);
            }
        });
    }

    function triggerAlarm(alarm) {
        showAlarmModal(formatAlarmTimeStr(alarm.time), alarm.label);
        startAlarmAudioLoop();
    }

    function showAlarmModal(timeText, labelText) {
        modalAlarmTime.textContent = timeText;
        modalAlarmLabel.textContent = labelText;
        alarmModal.classList.remove('hidden');
    }

    dismissAlarmBtn.addEventListener('click', () => {
        alarmModal.classList.add('hidden');
        stopAlarmAudioLoop();
    });

    // ----------------------------------------------------------------------
    // 8. Web Audio API Sound Generator (No External Assets Required)
    // ----------------------------------------------------------------------
    function playAudioBeepSequence() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();

            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;

                gain.gain.setValueAtTime(0.15, ctx.currentTime + index * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.15 + 0.3);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime + index * 0.15);
                osc.stop(ctx.currentTime + index * 0.15 + 0.3);
            });
        } catch (e) {
            // Audio context blocked or not supported
        }
    }

    function startAlarmAudioLoop() {
        playAudioBeepSequence();
        activeAlarmSoundInterval = setInterval(playAudioBeepSequence, 1200);
    }

    function stopAlarmAudioLoop() {
        if (activeAlarmSoundInterval) {
            clearInterval(activeAlarmSoundInterval);
            activeAlarmSoundInterval = null;
        }
    }

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    }

    // Initialize App
    init();
});