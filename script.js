/* 给茹茹的生日惊喜：无需第三方库，适配手机。 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const intro = $('intro');
  const introScene = $('introScene');
  const envelope = $('envelopeIllustration');
  const paper = $('letterPaper');
  const hint = $('envelopeInstruction');
  const wishScreen = $('wishScreen');
  wishScreen.inert = true;
  const main = $('mainContent');
  const micButton = $('enableMic');
  const micButtonText = micButton.querySelector('.mic-btn-text');
  const micStatus = $('micStatus');
  const micDetails = $('micDetails');
  const micBars = [...$('micMeter').children];
  const cakeVisual = $('cakeVisual');
  let introState = 'closed';
  const scheduleEnvelope = (callback, delay) => setTimeout(callback, delay);
  let wishFinished = false;
  let microphoneStream = null;
  let audioContext = null;
  let detectorFrame = null;
  let candleBlown = false;
  let toastTimer;
  let lastInputWasKeyboard = false;
  window.addEventListener('keydown', () => { lastInputWasKeyboard = true; }, { passive: true });
  window.addEventListener('pointerdown', () => { lastInputWasKeyboard = false; }, { passive: true });


  /* Gentle Happy Birthday instrumental and small synthesized sound effects.
     The audio track is created for this site and bundled locally; no streaming or tracking.
     Browsers block unprompted audio: first play is ALWAYS attached to an actual tap. */
  const bgm = $('birthdayBgm');
  const audioLinks = window.RURU_AUDIO_LINKS || {};
  // Remote URLs are optional. Blank URLs use the existing bundled filenames.
  const configuredBgm = typeof audioLinks.bgm === 'string' ? audioLinks.bgm.trim() : '';
  if (configuredBgm) bgm.src = configuredBgm;
  const soundToggle = $('soundToggle');
  const soundToggleText = $('soundToggleText');
  const BGM_LEVEL = 0.27;
  let soundMuted = false;
  let soundtrackStarted = false;
  let soundFxContext = null;
  let wasMusicPlayingBeforeMic = false;
  bgm.volume = BGM_LEVEL;

  function startSoundtrack() {
    if (soundMuted) return;
    soundtrackStarted = true;
    bgm.volume = BGM_LEVEL;
    // play() is called during a tap rather than a timer, to respect mobile autoplay policies.
    if (bgm.paused) bgm.play().catch(() => {});
  }
  function pauseSoundtrackForMic() {
    wasMusicPlayingBeforeMic = !bgm.paused;
    if (!bgm.paused) bgm.pause();
  }
  function resumeSoundtrackAfterMic() {
    if (soundMuted) return;
    if (soundtrackStarted && wasMusicPlayingBeforeMic) {
      bgm.play().catch(() => {});
    }
    wasMusicPlayingBeforeMic = false;
  }
  function updateSoundUI() {
    soundToggle.classList.toggle('is-muted', soundMuted);
    soundToggleText.textContent = soundMuted ? '声音关' : '声音开';
    const label = soundMuted ? '打开背景音乐和音效' : '关闭背景音乐和音效';
    soundToggle.setAttribute('aria-pressed', String(!soundMuted));
    soundToggle.setAttribute('aria-label', label);
    soundToggle.title = label;
  }
  soundToggle.addEventListener('click', () => {
    soundMuted = !soundMuted;
    updateSoundUI();
    if (soundMuted) bgm.pause();
    else if (!microphoneStream && !micButton.disabled) startSoundtrack();
  });

  function getFxContext() {
    if (soundMuted) return null;
    try {
      if (!soundFxContext) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        soundFxContext = new AC();
      }
      if (soundFxContext.state === 'suspended') soundFxContext.resume().catch(() => {});
      return soundFxContext;
    } catch (_) { return null; }
  }
  // A very quiet glass-like note, with a soft release instead of a hard beep.
  function shimmer(ctx, pitch, at, length = .55, amount = .025) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, amount), at + .013);
    gain.gain.exponentialRampToValueAtTime(.0001, at + length);
    gain.connect(ctx.destination);
    for (const [ratio,vol] of [[1,1],[2.005,.17],[3.99,.035]]) {
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine';o.frequency.value=pitch*ratio;
      g.gain.value=vol;o.connect(g);g.connect(gain);
      o.start(at);o.stop(at+length+.015);
    }
  }
  // Filtered paper/air noise; synthesized locally, never recorded from the microphone.
  function whisper(ctx, at, length = .45, frequency = 1400, amount = .035) {
    const frames = Math.max(128, Math.floor(ctx.sampleRate * length));
    const buffer=ctx.createBuffer(1,frames,ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<frames;i++) data[i]=(Math.random()*2-1)*(.45+.55*Math.sin(i*0.013));
    const source=ctx.createBufferSource();source.buffer=buffer;
    const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.55;
    const gain=ctx.createGain();
    gain.gain.setValueAtTime(.0001,at);
    gain.gain.linearRampToValueAtTime(amount,at+.04);
    gain.gain.exponentialRampToValueAtTime(.0001,at+length);
    source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
    source.start(at);source.stop(at+length+.01);
  }
  function playEffect(kind) {
    const ctx=getFxContext();if(!ctx)return;
    const t=ctx.currentTime+.025;
    try {
      if(kind==='seal') { shimmer(ctx,622.25,t,.52,.026);shimmer(ctx,830.61,t+.14,.47,.017); }
      if(kind==='open') { whisper(ctx,t,.56,1100,.042);shimmer(ctx,659.25,t+.34,.6,.012); }
      if(kind==='paper') { whisper(ctx,t,.7,2200,.029);shimmer(ctx,784,t+.45,.8,.02); }
      if(kind==='greeting') { shimmer(ctx,587.33,t,.7,.02);shimmer(ctx,783.99,t+.21,.75,.017);shimmer(ctx,987.77,t+.43,1.0,.018); }
      if(kind==='continue') { whisper(ctx,t,.44,1400,.018); }
      if(kind==='blow') { whisper(ctx,t,.72,420,.05); }
      if(kind==='celebrate') {
        [783.99,987.77,1174.66,1567.98].forEach((freq,i)=>shimmer(ctx,freq,t+i*.12,1.05+i*.08,.026));
        whisper(ctx,t+.16,.52,2900,.017);
      }
    } catch (_) { /* Allow the visual interaction even if sound hardware is unavailable. */ }
  }

  function toast(message) {
    const node = $('toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 3200);
  }

  // 第一步：蜡封先转一整圈，再从顶部掀开信封，最后纸张缓缓升起。
  // 顺序分离避免信纸在未打开的信封上方露出轮廓。
  $('openEnvelope').addEventListener('click', () => {
    if (introState !== 'closed') return;
    startSoundtrack();
    playEffect('seal');
    introState = 'opening';
    introScene.classList.add('opening-envelope');
    envelope.classList.add('sealing');
    $('openEnvelope').setAttribute('aria-expanded', 'true');
    $('openEnvelope').tabIndex = -1;
    hint.textContent = '小惊喜正在打开…';
    scheduleEnvelope(() => { envelope.classList.add('flap-opening'); playEffect('open'); }, 780);
    scheduleEnvelope(() => {
      envelope.classList.add('paper-out');
      playEffect('paper');
      paper.tabIndex = 0;
    }, 1770);
    scheduleEnvelope(() => {
      introState = 'opened';
      envelope.classList.add('ready');
      hint.textContent = '再点一下露出的信纸';
      if (lastInputWasKeyboard) paper.focus({ preventScroll: true });
    }, 2850);
  });

  paper.addEventListener('click', () => {
    if (introState !== 'opened') return;
    playEffect('greeting');
    introState = 'reading';
    introScene.classList.add('dim');
    introScene.inert = true;
    wishScreen.inert = false;
    wishScreen.classList.add('visible');
    wishScreen.setAttribute('aria-hidden', 'false');
    // 让她自己决定读多久；不会强制自动跳到蛋糕。
  });
  $('skipGreeting').addEventListener('click', goToCake);

  function goToCake() {
    if (wishFinished) return;
    playEffect('continue');
    wishFinished = true;
    wishScreen.classList.add('leaving');
    wishScreen.inert = true;
    main.hidden = false;
    // The cake is now the last scene; allow vertical overflow on short devices.
    document.body.classList.remove('is-locked');
    window.scrollTo({ top: 0, behavior: 'auto' });
    intro.classList.add('exit');
    setTimeout(() => {
      intro.hidden = true;
      if (lastInputWasKeyboard) micButton.focus({ preventScroll: true });
    }, 920);
  }

  // 第二步：用 Web Audio 检测靠近话筒的吹气噪声。需要 HTTPS / localhost 和用户授权。
  // 不同手机的话筒和系统降噪差异很大，因此始终保留手动熄灭选项。
  async function enableMic() {
    if (candleBlown || microphoneStream) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast('这台浏览器暂时不能使用麦克风，点下面的文字也能吹灭蜡烛');
      return;
    }
    pauseSoundtrackForMic();
    micButton.disabled = true;
    micButton.classList.add('is-loading');
    micButtonText.textContent = '正在连接…';
    try {
      microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false
      });
      if (candleBlown) { stopMic(); return; }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('AudioContext unavailable');
      audioContext = new AudioCtx();
      await audioContext.resume();
      const source = audioContext.createMediaStreamSource(microphoneStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.64;
      source.connect(analyser);
      const waveform = new Uint8Array(analyser.fftSize);
      const frequencies = new Uint8Array(analyser.frequencyBinCount);
      const startTime = performance.now();
      let backgroundRms = 0.015;
      let blowingDuration = 0;
      let lastTime = startTime;
      micDetails.hidden = false;
      micButton.classList.remove('is-loading');
      micButton.classList.add('is-listening');
      micButtonText.textContent = '麦克风已开启';
      $('micInstruction').textContent = '现在可以轻轻吹气啦';
      micStatus.textContent = '准备好啦！靠近手机下方的话筒，轻轻吹～';
      const measure = (now) => {
        if (candleBlown || !microphoneStream) return;
        analyser.getByteTimeDomainData(waveform);
        analyser.getByteFrequencyData(frequencies);
        let squareSum = 0;
        for (let i = 0; i < waveform.length; i++) {
          const normalized = (waveform[i] - 128) / 128;
          squareSum += normalized * normalized;
        }
        const rms = Math.sqrt(squareSum / waveform.length);
        const binHz = audioContext.sampleRate / analyser.fftSize;
        const first = Math.max(1, Math.floor(240 / binHz));
        const last = Math.min(frequencies.length - 1, Math.floor(4200 / binHz));
        let presence = 0;
        for (let i = first; i <= last; i++) presence += frequencies[i];
        presence /= Math.max(1, last - first + 1);
        const elapsed = now - startTime;
        const delta = Math.min(50, now - lastTime);
        lastTime = now;
        if (elapsed < 1100) backgroundRms = (backgroundRms * 0.93) + (rms * 0.07);
        else if (rms < backgroundRms * 2.2) backgroundRms = (backgroundRms * 0.991) + (rms * 0.009);
        // Near-field airflow makes a burst of strong broadband noise.
        const threshold = Math.max(0.029, backgroundRms * 2.25);
        const isBlowing = elapsed > 1250 && rms > threshold && presence > 13;
        blowingDuration = isBlowing ? blowingDuration + delta : Math.max(0, blowingDuration - delta * 1.3);
        const meter = Math.min(1, Math.max(rms / Math.max(threshold * 1.6, .07), blowingDuration / 460));
        micBars.forEach((bar, index) => {
          const amplitude = (0.55 + 0.45 * Math.sin(now / 165 + index * 0.74));
          bar.style.height = `${4 + (22 * meter * amplitude)}px`;
        });
        if (blowingDuration > 280) {
          blowOutCandles();
          return;
        }
        detectorFrame = requestAnimationFrame(measure);
      };
      detectorFrame = requestAnimationFrame(measure);
    } catch (error) {
      stopMic();
      resumeSoundtrackAfterMic();
      micButton.disabled = false;
      micButton.classList.remove('is-loading','is-listening');
      micButtonText.textContent = '重试麦克风';
      $('micInstruction').textContent = '也可以使用下方的手动方式';
      micDetails.hidden = false;
      micStatus.textContent = '没能打开麦克风。也可以直接点下面的文字吹灭蜡烛';
      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        toast('麦克风没有获得权限，没关系，也可以点一下吹灭蜡烛。');
      } else {
        toast('话筒好像暂时不可用，试试手动吹灭吧。');
      }
    }
  }
  micButton.addEventListener('click', enableMic);
  $('blowFallback').addEventListener('click', blowOutCandles);

  function stopMic() {
    if (detectorFrame !== null) cancelAnimationFrame(detectorFrame);
    detectorFrame = null;
    if (microphoneStream) microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
    if (audioContext) audioContext.close().catch(() => {});
    audioContext = null;
  }

  function blowOutCandles() {
    if (candleBlown) return;
    candleBlown = true;
    playEffect('blow');
    stopMic();
    resumeSoundtrackAfterMic();
    setTimeout(() => playEffect('celebrate'), 410);
    cakeVisual.classList.add('blown');
    cakeVisual.setAttribute('aria-label', '三根蜡烛已被吹灭的生日蛋糕');
    $('candleInteraction').hidden = true;
    $('celebrateMessage').hidden = false;
    document.body.classList.remove('is-locked');
    launchConfetti();
    setTimeout(() => { if (candleBlown) $('scrollCue').hidden = false; }, 1350);
  }

  // 彩纸只在蛋糕庆祝时出现；滚离蛋糕或重播时立即清理。
  let activeConfettiFrame = null;
  function stopConfetti() {
    if (activeConfettiFrame !== null) cancelAnimationFrame(activeConfettiFrame);
    activeConfettiFrame = null;
    const canvas = $('confettiCanvas');
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  function launchConfetti() {
    stopConfetti();
    const canvas = $('confettiCanvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0;
    function resize() {
      w = canvas.width = window.innerWidth * Math.min(devicePixelRatio || 1, 2);
      h = canvas.height = window.innerHeight * Math.min(devicePixelRatio || 1, 2);
      context.setTransform(w / window.innerWidth, 0, 0, h / window.innerHeight, 0, 0);
    }
    resize();
    const palette = ['#ffe5ae', '#ecb4bd', '#ccafe1', '#f9f4ed', '#b88fae', '#e7bd8e'];
    const pieces = Array.from({ length: reducedMotion ? 46 : 138 }, () => ({
      x: Math.random() * innerWidth, y: -Math.random() * innerHeight * .9 - 8,
      size: 3 + Math.random() * 7, velY: 1.6 + Math.random() * 3.2,
      velX: (Math.random() - .5) * 2.3, spin: Math.random() * 7,
      spinRate: .03 + Math.random() * .08, color: palette[Math.floor(Math.random() * palette.length)]
    }));
    const start = performance.now();
    function frame(now) {
      context.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of pieces) {
        p.y += p.velY; p.x += p.velX + Math.sin(now / 390 + p.spin) * .3; p.spin += p.spinRate;
        context.save(); context.translate(p.x, p.y); context.rotate(p.spin);
        context.fillStyle = p.color; context.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .65);
        context.restore();
      }
      const stillAtCake = $('cakeSection').getBoundingClientRect().bottom > innerHeight * .8;
      if (now - start < (reducedMotion ? 1000 : 4100) && stillAtCake)
        activeConfettiFrame = requestAnimationFrame(frame);
      else { context.clearRect(0, 0, canvas.width, canvas.height); activeConfettiFrame = null; }
    }
    activeConfettiFrame = requestAnimationFrame(frame);
  }


  // Animate letters gently as they enter the viewport. Static content remains visible
  // when IntersectionObserver is unavailable or reduced motion is enabled.
  const revealItems = [...document.querySelectorAll('.reveal')];
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    revealItems.forEach(item => item.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    }, { threshold:.08, rootMargin:'0px 0px -20px 0px' });
    revealItems.forEach(item => revealObserver.observe(item));
  }


  // Real scroll parallax on every note: paper and ornament move at different speeds.
  // Read geometry in a single rAF pass; stop animation entirely for reduced-motion users.
  const parallaxCards = [...document.querySelectorAll('.parallax-card')];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let parallaxFrame = null;
  function updateNotesParallax() {
    parallaxFrame = null;
    if (prefersReducedMotion.matches || main.hidden) return;
    const center = innerHeight * .5;
    const range = Math.max(260, innerHeight * .72);
    for (const card of parallaxCards) {
      const r = card.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) continue;
      const ratio = Math.max(-1, Math.min(1, (center - (r.top + r.height / 2)) / range));
      card.style.setProperty('--parallax-shift', `${(ratio * 16).toFixed(2)}px`);
      card.style.setProperty('--parallax-art', `${(ratio * -28).toFixed(2)}px`);
    }
  }
  function scheduleNotesParallax() {
    if (parallaxFrame !== null || prefersReducedMotion.matches) return;
    parallaxFrame = requestAnimationFrame(updateNotesParallax);
  }
  window.addEventListener('scroll', scheduleNotesParallax, {passive:true});
  window.addEventListener('resize', scheduleNotesParallax, {passive:true});
  if (prefersReducedMotion.addEventListener) prefersReducedMotion.addEventListener('change', scheduleNotesParallax);
  scheduleNotesParallax();

  // Fourteen user-recorded voice slots: files are intentionally not included until uploaded.
  // Pause the background music while a voice clip is playing.
  const voiceButtons = [...document.querySelectorAll('.voice-card')];
  const requestedExt = typeof audioLinks.voiceExtension === 'string' ? audioLinks.voiceExtension.trim().replace(/^\./, '').toLowerCase() : 'mpeg';
  const voiceExtension = /^(mpeg|mp3|mpga|m4a|wav|ogg)$/.test(requestedExt) ? requestedExt : 'mpeg';
  const voiceAudios = voiceButtons.map((btn, index) => {
    const number = String(index + 1).padStart(2, '0');
    const configuredVoice = typeof audioLinks.voices?.[number] === 'string'
      ? audioLinks.voices[number].trim() : '';
    const audio = new Audio(configuredVoice || `assets/audio/${number}.${voiceExtension}`);
    audio.preload = 'none';
    audio.addEventListener('timeupdate', () => {
      const progress = btn.querySelector('.voice-progress i');
      if (audio.duration && Number.isFinite(audio.duration))
        progress.style.width = (100 * audio.currentTime / audio.duration) + '%';
    });
    audio.addEventListener('ended', () => endVoice(btn, audio));
    audio.addEventListener('error', () => {
      if (activeVoice === audio) {
        endVoice(btn,audio);
        toast('这段语音还没放进来，之后可以替换成你的录音');
      }
    });
    return audio;
  });
  let activeVoice = null;
  let previousMusicForVoice = false;
  function endVoice(btn,audio){
    const wasActive = activeVoice === audio;
    btn.classList.remove('playing');
    btn.querySelector('.voice-icon').textContent = '▶';
    btn.setAttribute('aria-label','播放语音：'+btn.querySelector('strong').textContent);
    if(audio.ended || audio.error) btn.querySelector('.voice-progress i').style.width='0%';
    if(wasActive){
      activeVoice = null;
      if(previousMusicForVoice && !soundMuted && !microphoneStream) bgm.play().catch(()=>{});
      previousMusicForVoice=false;
    }
  }
  voiceButtons.forEach((btn,index)=> btn.addEventListener('click', async () => {
    const bgmBeforeVoice = musicBeforeVideo;
    if (birthdayVideo && !birthdayVideo.paused) { musicBeforeVideo = false; birthdayVideo.pause(); }
    const audio=voiceAudios[index];
    if(activeVoice === audio && !audio.paused){
      audio.pause(); endVoice(btn,audio); return;
    }
    if(activeVoice){
      const old=activeVoice; const oldIndex=voiceAudios.indexOf(old);
      old.pause(); if(oldIndex>=0){
        const oldBtn=voiceButtons[oldIndex];oldBtn.classList.remove('playing');
        oldBtn.querySelector('.voice-icon').textContent='▶';
        oldBtn.setAttribute('aria-label','播放语音：'+oldBtn.querySelector('strong').textContent);
      }
      activeVoice=null;
    } else previousMusicForVoice=!bgm.paused || bgmBeforeVoice;
    if(!bgm.paused) bgm.pause();
    activeVoice=audio;
    btn.classList.add('playing');
    btn.querySelector('.voice-icon').textContent='Ⅱ';
    btn.setAttribute('aria-label','暂停语音：'+btn.querySelector('strong').textContent);
    try { await audio.play(); }
    catch(e){
      if(activeVoice===audio){
        endVoice(btn,audio);
        toast('这段语音还没放进来，之后可以替换成你的录音');
      }
    }
  }));
  soundToggle.addEventListener('click',()=>{
    if(soundMuted && activeVoice){
      const current=activeVoice; const i=voiceAudios.indexOf(current);
      current.pause();if(i>=0)endVoice(voiceButtons[i],current);
    }
  });


  // Fifth scene: the promised birthday gesture-dance video.
  // Use a user-supplied local MP4 or a direct HTTPS link from audio-config.js.
  const birthdayVideo = $('birthdayVideo');
  const videoCover = $('videoCover');
  const videoStart = $('playBirthdayVideo');
  const videoHelp = $('videoHelp');
  const configuredVideo = typeof audioLinks.video === 'string' ? audioLinks.video.trim() : '';
  const videoFile = configuredVideo || 'assets/video/birthday-gesture-dance.mp4';
  let musicBeforeVideo = false;
  let videoLoading = false;
  let mediaVideoError = false;
  function videoReset(showCover=true) {
    if (!birthdayVideo) return;
    birthdayVideo.pause();
    birthdayVideo.removeAttribute('src');
    birthdayVideo.load();
    birthdayVideo.hidden = true;
    if (showCover) videoCover.hidden = false;
    videoStart.disabled = false;
    videoStart.querySelector('span').textContent = '点开看看';
    videoHelp.textContent = '';
    videoLoading = false;
    mediaVideoError = false;
    musicBeforeVideo = false;
  }
  function videoError() {
    if (mediaVideoError) return;
    mediaVideoError = true;
    videoLoading = false;
    videoStart.disabled = false;
    videoStart.querySelector('span').textContent = '点开看看';
    birthdayVideo.pause();
    birthdayVideo.hidden = true;
    videoCover.hidden = false;
    videoHelp.textContent = '视频还没放进来，或者这个格式暂时无法播放。';
    if (musicBeforeVideo && !soundMuted && !activeVoice && !microphoneStream) bgm.play().catch(() => {});
    musicBeforeVideo = false;
  }
  birthdayVideo.addEventListener('playing', () => {
    videoLoading = false;
    mediaVideoError = false;
    videoCover.hidden = true;
    birthdayVideo.hidden = false;
    videoHelp.textContent = '';
    videoStart.disabled = false;
    if (activeVoice) {
      const i = voiceAudios.indexOf(activeVoice);
      const voiceToStop=activeVoice;
      musicBeforeVideo = musicBeforeVideo || previousMusicForVoice;
      previousMusicForVoice=false;
      voiceToStop.pause();
      if (i>=0) endVoice(voiceButtons[i], voiceToStop);
    }
    if (!bgm.paused) { musicBeforeVideo = true; bgm.pause(); }
  });
  birthdayVideo.addEventListener('pause', () => {
    if (birthdayVideo.ended || mediaVideoError || videoLoading) return;
    if (musicBeforeVideo && !soundMuted && !activeVoice && !microphoneStream) {
      bgm.play().catch(() => {});
      musicBeforeVideo = false;
    }
  });
  birthdayVideo.addEventListener('ended', () => {
    if (musicBeforeVideo && !soundMuted && !activeVoice && !microphoneStream) bgm.play().catch(() => {});
    musicBeforeVideo = false;
  });
  birthdayVideo.addEventListener('error', () => {
    // No media file exists yet: keep a graceful placeholder rather than a black error player.
    if (videoLoading || birthdayVideo.getAttribute('src')) videoError();
  });
  videoStart.addEventListener('click', async () => {
    if (videoLoading) return;
    videoLoading = true;
    mediaVideoError = false;
    videoStart.disabled = true;
    videoStart.querySelector('span').textContent = '正在打开…';
    videoHelp.textContent = '';
    // Pause BGM immediately so video audio and BGM will not play over each other.
    musicBeforeVideo = !bgm.paused || Boolean(activeVoice && previousMusicForVoice);
    if (!bgm.paused) bgm.pause();
    if (activeVoice) {
      const i = voiceAudios.indexOf(activeVoice);
      const oldVoice=activeVoice;
      previousMusicForVoice=false;
      oldVoice.pause();
      if (i>=0) endVoice(voiceButtons[i], oldVoice);
    }
    try {
      birthdayVideo.src = videoFile;
      birthdayVideo.hidden = false;
      videoCover.hidden = true;
      await birthdayVideo.play();
      videoLoading = false;
    } catch (_) {
      videoError();
    }
  });

  // Replay all scenes without a reload. Preserve the guest's sound preference.
  $('replayBtn').addEventListener('click',()=>{
    stopConfetti();
    stopMic();
    videoReset();
    if(activeVoice)activeVoice.pause();
    voiceAudios.forEach((audio,index)=>{
      audio.pause();audio.currentTime=0;
      voiceButtons[index].classList.remove('playing');
      voiceButtons[index].querySelector('.voice-icon').textContent='▶';
      voiceButtons[index].querySelector('.voice-progress i').style.width='0%';
    });
    activeVoice=null;previousMusicForVoice=false;
    candleBlown=false;wishFinished=false;introState='closed';
    envelope.classList.remove('sealing','flap-opening','paper-out','ready');
    $('openEnvelope').setAttribute('aria-expanded','false');
    $('openEnvelope').tabIndex=0;
    paper.tabIndex=-1;
    hint.textContent='轻轻点一下信封';
    introScene.classList.remove('dim','opening-envelope');
    introScene.inert=false;
    wishScreen.classList.remove('visible','leaving');
    wishScreen.inert=true;
    wishScreen.setAttribute('aria-hidden','true');
    cakeVisual.classList.remove('blown');
    cakeVisual.setAttribute('aria-label','有三根点燃的蜡烛的粉色生日蛋糕');
    $('candleInteraction').hidden=false;
    $('celebrateMessage').hidden=true;
    $('scrollCue').hidden=true;
    micDetails.hidden=true;
    micButton.disabled=false;
    micButton.classList.remove('is-loading','is-listening');
    micButtonText.textContent='开启麦克风';
    $('micInstruction').textContent='点一下，再轻轻吹一口气';
    micBars.forEach(bar=>bar.style.height='4px');
    intro.hidden=false; intro.classList.remove('exit');
    main.hidden=true;
    document.body.classList.add('is-locked');
    window.scrollTo({top:0,behavior:'instant'});
  });

  window.addEventListener('pagehide', () => { stopMic(); birthdayVideo.pause(); bgm.pause(); if(soundFxContext) soundFxContext.close().catch(() => {}); });
})();
