// オリジナルBGM（Web Audio APIでその場で合成。音源ファイルは使わない）
// 92BPM・Aマイナーのダークなヒップホップ／ロック系ループ
const BGM = (() => {
  const BPM = 92;
  const STEP = 60 / BPM / 4; // 16分音符の長さ（秒）
  const STEPS_PER_BAR = 16;
  const LOOKAHEAD = 0.12; // 何秒先までスケジュールするか
  const TICK_MS = 25;

  // 1小節ごとのコード（MIDIノート番号）: Am → F → C → G
  const CHORDS = [
    { root: 45, notes: [57, 60, 64] }, // Am
    { root: 41, notes: [57, 60, 65] }, // F
    { root: 48, notes: [55, 60, 64] }, // C
    { root: 43, notes: [55, 59, 62] }, // G
  ];
  const KICK = [0, 7, 10];
  const SNARE = [4, 12];
  const BASS = [0, 3, 7, 10, 14];
  const ARP = [0, 1, 2, 1, 0, 2, 1, 2]; // 8分音符ごとのコード構成音の並び

  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let timer = null;
  let step = 0;
  let nextTime = 0;
  let playing = false;

  const freq = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(comp);
    comp.connect(ctx.destination);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function env(g, t, peak, attack, release) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  }

  function kick(t) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    env(g, t, 0.9, 0.003, 0.3);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.35);
  }

  function noise(t, type, f, peak, release) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    const g = ctx.createGain();
    env(g, t, peak, 0.002, release);
    s.connect(flt).connect(g).connect(master);
    s.start(t);
    s.stop(t + release + 0.05);
  }

  function snare(t) {
    noise(t, "bandpass", 1800, 0.5, 0.18);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = 190;
    env(g, t, 0.25, 0.002, 0.08);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.12);
  }

  function hat(t, accent) {
    noise(t, "highpass", 8000, accent ? 0.12 : 0.05, 0.04);
  }

  function bass(t, note) {
    const o = ctx.createOscillator();
    const flt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.value = freq(note);
    flt.type = "lowpass";
    flt.frequency.setValueAtTime(600, t);
    flt.frequency.exponentialRampToValueAtTime(150, t + 0.25);
    env(g, t, 0.35, 0.005, 0.3);
    o.connect(flt).connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.35);
  }

  function pad(t, notes) {
    const dur = STEP * STEPS_PER_BAR;
    const flt = ctx.createBiquadFilter();
    flt.type = "lowpass";
    flt.frequency.value = 1100;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    flt.connect(g).connect(master);
    notes.forEach((n) => {
      [-7, 7].forEach((detune) => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = freq(n);
        o.detune.value = detune;
        o.connect(flt);
        o.start(t);
        o.stop(t + dur);
      });
    });
  }

  function pluck(t, note) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = freq(note);
    env(g, t, 0.08, 0.004, 0.25);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.3);
  }

  function schedule(s, t) {
    const pos = s % STEPS_PER_BAR;
    const bar = Math.floor(s / STEPS_PER_BAR) % CHORDS.length;
    const chord = CHORDS[bar];

    if (KICK.includes(pos)) kick(t);
    if (SNARE.includes(pos)) snare(t);
    if (pos % 2 === 0) hat(t, pos % 4 === 2);
    if (BASS.includes(pos)) bass(t, chord.root);
    if (pos === 0) pad(t, chord.notes);
    // 2周目以降はアルペジオを重ねて展開をつける
    if (s >= STEPS_PER_BAR * CHORDS.length && pos % 2 === 0) {
      pluck(t, chord.notes[ARP[pos / 2]] + 12);
    }
  }

  function tick() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      schedule(step, nextTime);
      nextTime += STEP;
      step++;
    }
  }

  function start() {
    if (playing) return true;
    if (!ctx && !init()) return false;
    ctx.resume();
    step = 0;
    nextTime = ctx.currentTime + 0.1;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1);
    timer = setInterval(tick, TICK_MS);
    playing = true;
    return true;
  }

  function stop() {
    if (!playing) return;
    clearInterval(timer);
    timer = null;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    playing = false;
  }

  // タブを離れている間は止め、戻ったら再開する
  document.addEventListener("visibilitychange", () => {
    if (!ctx || !playing) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  return { start, stop, isPlaying: () => playing };
})();
