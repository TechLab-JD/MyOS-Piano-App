// MyOS Piano — a Web Audio keyboard. Pure static, no backend.
(function () {
  var keysEl = document.getElementById('pi-keys');
  if (!keysEl) return;
  var waveEl = document.getElementById('pi-wave');
  var recBtn = document.getElementById('pi-rec');
  var playBtn = document.getElementById('pi-play');

  // note: midi, keyboard key, isBlack, and (for black) which white index it follows
  var NOTES = [
    { m: 60, k: 'a', b: false }, { m: 61, k: 'w', b: true, after: 0 },
    { m: 62, k: 's', b: false }, { m: 63, k: 'e', b: true, after: 1 },
    { m: 64, k: 'd', b: false },
    { m: 65, k: 'f', b: false }, { m: 66, k: 't', b: true, after: 3 },
    { m: 67, k: 'g', b: false }, { m: 68, k: 'y', b: true, after: 4 },
    { m: 69, k: 'h', b: false }, { m: 70, k: 'u', b: true, after: 5 },
    { m: 71, k: 'j', b: false }, { m: 72, k: 'k', b: false }
  ];
  var LABEL = { 60: 'C', 62: 'D', 64: 'E', 65: 'F', 67: 'G', 69: 'A', 71: 'B', 72: 'C' };

  var ac = null, active = {}, elByMidi = {};
  var whites = [];
  var recording = false, recStart = 0, track = [];

  function ctx() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function noteOn(m) {
    if (active[m]) return;
    var c = ctx();
    var osc = c.createOscillator(), g = c.createGain();
    osc.type = waveEl.value;
    osc.frequency.value = freq(m);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + 0.01);
    osc.connect(g); g.connect(c.destination); osc.start();
    active[m] = { osc: osc, g: g };
    if (elByMidi[m]) elByMidi[m].classList.add('down');
    if (recording) track.push({ m: m, t: Date.now() - recStart });
  }
  function noteOff(m) {
    var a = active[m]; if (!a) return;
    var c = ctx();
    a.g.gain.cancelScheduledValues(c.currentTime);
    a.g.gain.setValueAtTime(a.g.gain.value, c.currentTime);
    a.g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12);
    a.osc.stop(c.currentTime + 0.14);
    delete active[m];
    if (elByMidi[m]) elByMidi[m].classList.remove('down');
  }
  function blip(m, dur) {
    var c = ctx();
    var osc = c.createOscillator(), g = c.createGain();
    osc.type = waveEl.value; osc.frequency.value = freq(m);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(); osc.stop(c.currentTime + dur + 0.02);
    if (elByMidi[m]) { elByMidi[m].classList.add('down'); setTimeout(function () { elByMidi[m].classList.remove('down'); }, dur * 1000); }
  }

  // build white keys, then overlay black keys
  NOTES.forEach(function (n) {
    if (n.b) return;
    var w = document.createElement('div');
    w.className = 'pi-w'; w.textContent = LABEL[n.m] || '';
    w.addEventListener('mousedown', function (e) { e.preventDefault(); noteOn(n.m); });
    w.addEventListener('mouseup', function () { noteOff(n.m); });
    w.addEventListener('mouseleave', function () { noteOff(n.m); });
    keysEl.appendChild(w); whites.push(w); elByMidi[n.m] = w;
  });
  var blacks = [];
  NOTES.forEach(function (n) {
    if (!n.b) return;
    var b = document.createElement('div');
    b.className = 'pi-b';
    b.addEventListener('mousedown', function (e) { e.preventDefault(); noteOn(n.m); });
    b.addEventListener('mouseup', function () { noteOff(n.m); });
    b.addEventListener('mouseleave', function () { noteOff(n.m); });
    keysEl.appendChild(b); elByMidi[n.m] = b; blacks.push({ el: b, after: n.after });
  });

  function layout() {
    blacks.forEach(function (bk) {
      var w = whites[bk.after]; if (!w) return;
      bk.el.style.left = (w.offsetLeft + w.offsetWidth - 13) + 'px';
    });
  }
  layout();
  if (window.ResizeObserver) { new ResizeObserver(layout).observe(keysEl); }
  window.addEventListener('resize', layout);
  setTimeout(layout, 50);

  // keyboard
  var byKey = {};
  NOTES.forEach(function (n) { byKey[n.k] = n.m; });
  document.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    var m = byKey[e.key.toLowerCase()];
    if (m != null) { noteOn(m); }
  });
  document.addEventListener('keyup', function (e) {
    var m = byKey[e.key.toLowerCase()];
    if (m != null) noteOff(m);
  });

  // record / play
  recBtn.onclick = function () {
    recording = !recording;
    recBtn.classList.toggle('on', recording);
    if (recording) { track = []; recStart = Date.now(); recBtn.textContent = '■ Stop'; }
    else { recBtn.textContent = '● Rec'; }
  };
  playBtn.onclick = function () {
    if (!track.length) return;
    track.forEach(function (ev) { setTimeout(function () { blip(ev.m, 0.4); }, ev.t); });
  };
})();
