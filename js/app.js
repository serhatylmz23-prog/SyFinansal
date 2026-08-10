// ============================================
// SyFinansOtağı v3.1 - Geliştirilmiş Sürüm
// Türkçe Karakter Uyumlu | Dinamik Canvas Grafikler
// Sürüm: 3.1 | Ağustos 2026
// NOT: Tüm finansal veriler SANAL/EĞLENCE AMAÇLIDIR.
// ============================================

const APP_VERSION = '3.1.0';
const BUILD_DATE = '2026-08-09';
const DISCLAIMER = '⚠️ Bu uygulama tamamen eğlence ve simülasyon amaçlıdır. Gösterilen tüm fiyatlar, portföy değerleri ve yatırım verileri SANALDIR. Gerçek para ile işlem yapılmaz.';

// ============================================
// TÜRKÇE KARAKTER YARDIMCISI
// ============================================
const TR = {
  chars: 'çğıöşüÇĞİÖŞÜ',
  normalize: (str) => str,
  upper: (str) => str.toLocaleUpperCase('tr-TR'),
  lower: (str) => str.toLocaleLowerCase('tr-TR')
};

// ============================================
// SİREN MOTORU (Web Audio API - dosya gerektirmez)
// M5.5+ deprem uyarısı için yüksek sesli alarm
// ============================================
class SirenEngine {
  constructor() {
    this.ctx = null;
    this.oscillators = [];
    this.playing = false;
    this.sweepInterval = null;
  }

  _ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  start() {
    if (this.playing) return;
    try {
      const ctx = this._ensureContext();
      this.playing = true;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      gain.gain.value = 0.35; // yüksek ama kulak zedelemeyecek seviye
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this.oscillators.push(osc);
      this.gainNode = gain;

      // Klasik siren efekti: frekans yukarı-aşağı sürekli süpürülüyor
      let rising = true;
      let freq = 500;
      this.sweepInterval = setInterval(() => {
        if (!this.ctx || this.ctx.state === 'closed') return;
        freq += rising ? 40 : -40;
        if (freq >= 1200) rising = false;
        if (freq <= 500) rising = true;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
      }, 60);
    } catch (e) {
      console.warn('[Siren] Ses başlatılamadı (kullanıcı etkileşimi gerekebilir):', e);
    }
  }

  stop() {
    this.playing = false;
    if (this.sweepInterval) { clearInterval(this.sweepInterval); this.sweepInterval = null; }
    this.oscillators.forEach(o => { try { o.stop(); } catch {} });
    this.oscillators = [];
    if (this.gainNode) { try { this.gainNode.disconnect(); } catch {} }
  }
}

// ============================================
// CANVAS GRAFİK MOTORU (Dinamik & Göz Alıcı)
// ============================================
class ChartEngine {
  static drawSparkline(canvasId, data, color = '#667eea', fill = true) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width, h = rect.height;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * w,
      y: h - ((v - min) / range) * (h - 10) - 5
    }));

    ctx.clearRect(0, 0, w, h);

    // Glow efekti
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Alan doldurma
    if (fill) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, color + '40');
      grad.addColorStop(1, color + '00');
      ctx.beginPath();
      ctx.moveTo(points[0].x, h);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Çizgi
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Nokta
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  static drawAreaChart(canvasId, data, colorUp = '#10b981', colorDown = '#ef4444') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width, h = rect.height;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * w,
      y: h - ((v - min) / range) * (h - 20) - 10
    }));

    const isUp = data[data.length - 1] >= data[0];
    const color = isUp ? colorUp : colorDown;

    ctx.clearRect(0, 0, w, h);

    // Grid çizgileri
    ctx.strokeStyle = 'rgba(128,128,128,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = (h / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;

    // Alan
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color + '50');
    grad.addColorStop(0.5, color + '15');
    grad.addColorStop(1, color + '00');
    ctx.beginPath();
    ctx.moveTo(points[0].x, h);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Çizgi
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Animasyonlu nokta
    const last = points[points.length - 1];
    const time = Date.now() / 1000;
    const pulse = 1 + Math.sin(time * 3) * 0.3;
    ctx.beginPath();
    ctx.arc(last.x, last.y, 5 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = color + '60';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  static drawPieChart(canvasId, labels, values, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width, h = rect.height;
    const cx = w / 2, cy = h / 2 + 10;
    const radius = Math.min(cx, cy) - 30;
    const total = values.reduce((a, b) => a + b, 0);

    ctx.clearRect(0, 0, w, h);

    let startAngle = -Math.PI / 2;
    values.forEach((val, i) => {
      const angle = (val / total) * Math.PI * 2;
      const endAngle = startAngle + angle;

      // Glow
      ctx.shadowColor = colors[i % colors.length];
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      // Kenar
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle = endAngle;
    });

    ctx.shadowBlur = 0;

    // Merkez boşluğu (donut)
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg2').trim() || '#12121a';
    ctx.fill();

    // Merkezde toplam
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e8e8ef';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Varlık', cx, cy - 8);
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text2').trim() || '#a0a0b0';
    ctx.fillText('Dağılımı', cx, cy + 8);

    // Legend
    let legendY = 20;
    labels.forEach((label, i) => {
      const pct = ((values[i] / total) * 100).toFixed(1);
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(w - 80, legendY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text2').trim() || '#a0a0b0';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label + ' %' + pct, w - 70, legendY + 4);
      legendY += 18;
    });
  }

  static animateChart(canvasId, drawFn, data, duration = 1000) {
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const partialData = data.slice(0, Math.ceil(data.length * eased));
      if (partialData.length > 1) drawFn(canvasId, partialData);
      if (progress < 1) requestAnimationFrame(animate);
      else drawFn(canvasId, data);
    };
    requestAnimationFrame(animate);
  }
}

// ============================================
// AKTİVASYON & LİSANS YÖNETİCİSİ v3.1
// ============================================
class ActivationManager {
  constructor() {
    this.deviceId = this.getDeviceId();
    this.activationKey = localStorage.getItem('syf_activation_key');
    this.transferLock = localStorage.getItem('syf_transfer_lock') !== 'false';
    this.approvedDevices = DataStore.get('approved_devices', []);
  }

  getDeviceId() {
    let id = localStorage.getItem('syf_device_id');
    if (!id) {
      id = 'CİHAZ-' + Math.random().toString(36).substr(2, 6).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
      localStorage.setItem('syf_device_id', id);
    }
    return id;
  }

  generateActivationKey() {
    const key = 'SYF-' + Math.random().toString(36).substr(2, 4).toUpperCase() + '-' + 
                Math.random().toString(36).substr(2, 4).toUpperCase() + '-' +
                Math.random().toString(36).substr(2, 4).toUpperCase();
    localStorage.setItem('syf_activation_key', key);
    localStorage.setItem('syf_transfer_lock', 'true');
    this.activationKey = key;
    return key;
  }

  validateKey(inputKey) {
    return inputKey === this.activationKey;
  }

  isTransferLocked() {
    return this.transferLock;
  }

  generateTransferCode() {
    if (!this.transferLock) return null;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem('syf_pending_transfer_code', code);
    localStorage.setItem('syf_pending_transfer_time', Date.now().toString());
    return code;
  }

  validateTransferCode(inputCode) {
    const pending = localStorage.getItem('syf_pending_transfer_code');
    const time = parseInt(localStorage.getItem('syf_pending_transfer_time') || '0');
    if (!pending || Date.now() - time > 300000) return false;
    return inputCode === pending;
  }

  unlockTransfer() {
    localStorage.setItem('syf_transfer_lock', 'false');
    this.transferLock = false;
  }

  lockTransfer() {
    localStorage.setItem('syf_transfer_lock', 'true');
    this.transferLock = true;
    localStorage.removeItem('syf_pending_transfer_code');
  }

  showActivationScreen() {
    const screen = document.getElementById('activation-screen');
    screen.style.display = 'flex';
    screen.className = 'auth-screen';

    if (!this.activationKey) {
      const key = this.generateActivationKey();
      screen.innerHTML = `
        <div class="auth-logo">🔐</div>
        <div class="auth-title">SyFinansOtağı Aktivasyon</div>
        <div class="auth-subtitle">
          Bu cihaz için benzersiz aktivasyon kodu oluşturuldu.<br>
          Bu kodu güvenli bir yerde saklayın. Başkalarıyla paylaşmayın.
        </div>
        <div class="auth-key-box">
          <div class="auth-key-text" id="activation-key-text">${key}</div>
        </div>
        <button class="btn btn-primary" style="max-width:280px" onclick="app.activation.copyKey()">📋 Kodu Kopyala</button>
        <div class="auth-hint">
          Cihaz ID: <code style="color:var(--primary)">${this.deviceId}</code><br>
          Bu kodu kaybetmeyin. Yeniden erişilemez.
        </div>
        <button class="btn btn-primary" style="max-width:280px;margin-top:8px" onclick="app.activation.goToPinSetup()">Aktivasyonu Tamamla</button>
      `;
    } else {
      screen.innerHTML = `
        <div class="auth-logo">🔐</div>
        <div class="auth-title">Aktivasyon Gerekli</div>
        <div class="auth-subtitle">
          Bu cihaz onaylı değil. Aktivasyon kodunu girin.<br>
          Cihaz ID: <code style="color:var(--primary)">${this.deviceId}</code>
        </div>
        <input type="text" id="activation-input" class="input auth-input" placeholder="SYF-XXXX-XXXX-XXXX" 
          style="max-width:320px;text-transform:uppercase" 
          onkeypress="if(event.key==='Enter')app.activation.verify()">
        <button class="btn btn-primary" style="max-width:280px" onclick="app.activation.verify()">Doğrula</button>
        <div class="auth-hint" style="margin-top:10px">
          Bu cihazı başka bir cihazdan onaylamak için:<br>
          Ayarlar → Cihaz Yönetimi → "Yeni Cihaz Onayla"
        </div>
      `;
    }
  }

  copyKey() {
    const key = document.getElementById('activation-key-text').textContent;
    navigator.clipboard.writeText(key).then(() => {
      app.toast('✅ Aktivasyon kodu kopyalandı', 'success');
    });
  }

  goToPinSetup() {
    document.getElementById('activation-screen').style.display = 'none';
    app.showPinSetup();
  }

  verify() {
    const input = document.getElementById('activation-input').value.trim().toUpperCase();
    if (this.validateKey(input)) {
      localStorage.setItem('syf_activated', 'true');
      document.getElementById('activation-screen').style.display = 'none';
      app.toast('🔓 Aktivasyon başarılı', 'success');
      app.showPinSetup();
    } else {
      app.toast('❌ Geçersiz aktivasyon kodu', 'error');
      const inputEl = document.getElementById('activation-input');
      inputEl.style.borderColor = 'var(--danger)';
      setTimeout(() => inputEl.style.borderColor = '', 500);
    }
  }
}

// ============================================
// PIN HASH YARDIMCISI (SHA-256 - düz metin saklamamak için)
// ============================================
async function hashPin(pin) {
  const enc = new TextEncoder().encode('syf_salt_v1:' + pin);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================
// PIN YÖNETİCİSİ (Yeni - Numpad Destekli)
// ============================================
class PinManager {
  constructor() {
    this.pinBuffer = '';
    this.mode = 'login'; // 'login' veya 'setup'
    this.tempPin = '';
  }

  showSetup() {
    this.mode = 'setup';
    this.pinBuffer = '';
    this.tempPin = '';
    const screen = document.getElementById('pin-setup-screen');
    screen.style.display = 'flex';
    screen.className = 'auth-screen';
    this.renderSetupScreen('Yeni PIN Belirleyin', 'Güvenliğiniz için 4-6 haneli bir PIN kodu belirleyin.');
  }

  renderSetupScreen(title, subtitle) {
    const screen = document.getElementById('pin-setup-screen');
    screen.innerHTML = `
      <div class="auth-logo">🛡️</div>
      <div class="auth-title">${title}</div>
      <div class="auth-subtitle">${subtitle}</div>
      <div class="auth-pin-dots" id="pin-dots">
        ${'<div class="pin-dot"></div>'.repeat(6)}
      </div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:8px" id="pin-hint">En az 4 hane girin</div>
      <div class="numpad" id="numpad">
        ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="numpad-btn" onclick="app.pin.press('${n}')">${n}</button>`).join('')}
        <button class="numpad-btn" style="font-size:18px" onclick="app.pin.backspace()">⌫</button>
        <button class="numpad-btn" onclick="app.pin.press('0')">0</button>
        <button class="numpad-btn" style="font-size:16px" onclick="app.pin.confirm()">✓</button>
      </div>
      <button class="btn btn-secondary" style="max-width:280px;margin-top:16px;font-size:13px" onclick="app.pin.skip()">PIN olmadan devam et (Güvensiz)</button>
    `;
  }

  showLogin() {
    this.mode = 'login';
    this.pinBuffer = '';
    const screen = document.getElementById('pin-login-screen');
    screen.style.display = 'flex';
    screen.className = 'auth-screen';
    screen.innerHTML = `
      <div class="auth-logo">🛡️</div>
      <div class="auth-title">SyFinansOtağı</div>
      <div class="auth-subtitle">Finansal verileriniz güvende.<br>PIN kodunuzu girin.</div>
      <div class="auth-pin-dots" id="pin-dots">
        ${'<div class="pin-dot"></div>'.repeat(6)}
      </div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:8px" id="pin-hint">PIN kodunuzu girin</div>
      <div class="numpad" id="numpad">
        ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="numpad-btn" onclick="app.pin.press('${n}')">${n}</button>`).join('')}
        <button class="numpad-btn" style="font-size:18px" onclick="app.pin.backspace()">⌫</button>
        <button class="numpad-btn" onclick="app.pin.press('0')">0</button>
        <button class="numpad-btn" style="font-size:16px" onclick="app.pin.confirm()">✓</button>
      </div>
      <button class="btn btn-secondary" style="max-width:280px;margin-top:12px" onclick="app.pin.biyometrikDene()">🔓 Face ID / Parmak İzi</button>
      <div class="auth-hint" style="margin-top:12px">
        <span style="font-size:11px;opacity:0.7">⚠️ Bu uygulama tamamen eğlence ve simülasyon amaçlıdır.</span>
      </div>
    `;
  }

  press(num) {
    if (this.pinBuffer.length < 6) {
      this.pinBuffer += num;
      this.updateDots();
    }
  }

  backspace() {
    this.pinBuffer = this.pinBuffer.slice(0, -1);
    this.updateDots();
  }

  updateDots() {
    const dots = document.querySelectorAll('#pin-dots .pin-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('filled', i < this.pinBuffer.length);
      dot.classList.remove('error');
    });
    const hint = document.getElementById('pin-hint');
    if (hint) hint.textContent = this.mode === 'setup' 
      ? (this.tempPin ? 'PIN\'i tekrar girin (Doğrulama)' : 'En az 4 hane girin') 
      : 'PIN kodunuzu girin';
  }

  async confirm() {
    if (this.pinBuffer.length < 4) {
      app.toast('❌ PIN en az 4 hane olmalı', 'error');
      this.shakeDots();
      return;
    }

    if (this.mode === 'setup') {
      if (!this.tempPin) {
        this.tempPin = this.pinBuffer;
        this.pinBuffer = '';
        this.updateDots();
        document.getElementById('pin-hint').textContent = 'PIN\'i tekrar girin (Doğrulama)';
      } else {
        if (this.pinBuffer === this.tempPin) {
          const hashed = await hashPin(this.pinBuffer);
          DataStore.set('pin', hashed);
          document.getElementById('pin-setup-screen').style.display = 'none';
          app.toast('🔐 PIN başarıyla belirlendi', 'success');
          app.showApp();
        } else {
          app.toast('❌ PIN eşleşmiyor. Tekrar deneyin.', 'error');
          this.tempPin = '';
          this.pinBuffer = '';
          this.updateDots();
          this.shakeDots();
        }
      }
    } else {
      const savedPin = DataStore.get('pin');
      const inputHash = await hashPin(this.pinBuffer);
      // Eski sürümlerden kalma düz metin PIN'lerle de geriye dönük uyumluluk
      if (inputHash === savedPin || this.pinBuffer === savedPin) {
        if (this.pinBuffer === savedPin && inputHash !== savedPin) {
          DataStore.set('pin', inputHash); // sessizce hash'e yükselt
        }
        document.getElementById('pin-login-screen').style.display = 'none';
        app.showApp();
      } else {
        app.toast('❌ Yanlış PIN', 'error');
        this.pinBuffer = '';
        this.updateDots();
        this.shakeDots();
      }
    }
  }

  shakeDots() {
    const dots = document.querySelectorAll('#pin-dots .pin-dot');
    dots.forEach(d => d.classList.add('error'));
    setTimeout(() => dots.forEach(d => d.classList.remove('error')), 500);
  }

  skip() {
    if (!confirm('PIN belirlemeden devam etmek güvenli değildir. Emin misiniz?')) return;
    document.getElementById('pin-setup-screen').style.display = 'none';
    app.showApp();
  }

  async biyometrikDene() {
    if (!window.PublicKeyCredential) {
      app.toast('❌ Bu cihaz biyometrik girişi desteklemiyor', 'error');
      return;
    }
    try {
      const enabled = DataStore.get('biometric_enabled', false);
      if (!enabled) {
        app.toast('⚠️ Önce Ayarlar > Biyometrik Giriş\'i aktif edin', 'warning');
        return;
      }

      // Platform authenticator kullan (QR çıkmaz)
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        app.toast('❌ Cihazınızda biyometrik sensör bulunamadı', 'error');
        return;
      }

      app.toast('🔓 Biyometrik doğrulama başlatılıyor...', 'info');

      // Basit WebAuthn platform doğrulama
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          rpId: window.location.hostname,
          allowCredentials: [],
          userVerification: 'required',
          timeout: 60000
        }
      });

      if (credential) {
        document.getElementById('pin-login-screen').style.display = 'none';
        app.showApp();
        app.toast('🔓 Biyometrik giriş başarılı', 'success');
      }
    } catch(e) {
      console.log('Biyometrik hata:', e);
      app.toast('❌ Biyometrik doğrulama başarısız veya iptal edildi', 'error');
    }
  }
}

// ============================================
// VERİ DEPOLAMA YÖNETİCİSİ
// ============================================
class DataStore {
  static get(key, def = null) {
    try { return JSON.parse(localStorage.getItem('syf_' + key)) || def; }
    catch { return def; }
  }
  static set(key, val) {
    localStorage.setItem('syf_' + key, JSON.stringify(val));
  }
  static remove(key) { localStorage.removeItem('syf_' + key); }
}

// ============================================
// ÇOK CİHAZLI SENKRONİZASYON MOTORU v2
// ============================================
class SyncEngine {
  constructor() {
    this.deviceId = this.getDeviceId();
    this.roomCode = localStorage.getItem('syf_room') || null;
    this.channel = null;
    this.init();
  }

  getDeviceId() {
    let id = localStorage.getItem('syf_device_id');
    if (!id) {
      id = 'CİHAZ-' + Math.random().toString(36).substr(2, 6).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
      localStorage.setItem('syf_device_id', id);
    }
    return id;
  }

  init() {
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('syfinans_sync');
      this.channel.onmessage = (e) => this.handleSyncMessage(e.data);
    }
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('syf_') && e.key !== 'syf_sync_ts') {
        this.handleStorageChange(e.key, e.newValue);
      }
    });
    setInterval(() => this.checkRemoteSync(), 5000);
  }

  ALLOWED_SYNC_TYPES = ['safe_people', 'earthquake_alert', 'emergency_status'];

  handleSyncMessage(data) {
    if (data.from === this.deviceId) return;
    if (data.room && data.room !== this.roomCode) return;
    if (!this.ALLOWED_SYNC_TYPES.includes(data.payload?.type)) {
      console.log('[Sync] Engellendi:', data.payload?.type);
      return;
    }
    this.applySyncData(data.payload);
    app.toast('📡 ' + data.deviceName + ' cihazından afet durumu geldi', 'info');
  }

  handleStorageChange(key, value) {
    if (!value) return;
    try {
      const data = JSON.parse(value);
      if (data._sync && data._device !== this.deviceId) {
        if (!this.ALLOWED_SYNC_TYPES.includes(data.payload?.type)) return;
        this.applySyncData(data.payload);
      }
    } catch(e) {}
  }

  applySyncData(payload) {
    if (payload.type === 'safe_people') {
      localStorage.setItem('syf_safe_people', JSON.stringify(payload.data));
      if (app.currentTab === 'afet') app.Afet.renderSafePeople();
    }
    if (payload.type === 'earthquake_alert') {
      app.toast('🚨 ' + payload.data.message, 'error', 8000);
      if (app.currentTab === 'afet') app.Afet.render();
    }
    if (payload.type === 'emergency_status') {
      app.toast('🆘 ' + payload.data.message, 'error', 10000);
    }
  }

  broadcast(type, data) {
    if (!this.ALLOWED_SYNC_TYPES.includes(type)) {
      console.log('[Sync] Broadcast engellendi:', type);
      return;
    }
    const payload = { _sync: true, _device: this.deviceId, _ts: Date.now(), payload: { type, data } };
    if (this.channel) {
      this.channel.postMessage({ from: this.deviceId, room: this.roomCode, deviceName: this.getDeviceName(), payload: { type, data } });
    }
    localStorage.setItem('syf_sync_' + type, JSON.stringify(payload));
    localStorage.setItem('syf_sync_ts', Date.now().toString());
  }

  getDeviceName() {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua)) return 'Android';
    return 'Bilgisayar';
  }

  checkRemoteSync() {
    const lastSync = parseInt(localStorage.getItem('syf_sync_ts') || '0');
    if (lastSync > (this.lastCheck || 0)) this.lastCheck = Date.now();
  }

  joinRoom(code) {
    this.roomCode = code;
    localStorage.setItem('syf_room', code);
    app.toast('🔗 Oda ' + code + ' ile senkronize edildi', 'success');
  }

  leaveRoom() {
    this.roomCode = null;
    localStorage.removeItem('syf_room');
    app.toast('🔗 Senkronizasyon durduruldu', 'warning');
  }
}

// ============================================
// SANAL VERİ MOTORU (Eğlence/Simülasyon)
// ============================================
class VirtualDataEngine {
  constructor() {
    this.basePrices = {
      'BIST100': 9847.32, 'XU030': 10540.18, 'XU050': 8920.45,
      'ASELS': 45.82, 'THYAO': 265.40, 'GARAN': 112.30, 'ISCTR': 42.15,
      'AKBNK': 58.90, 'YKBNK': 35.60, 'BIMAS': 182.50, 'SISE': 38.75,
      'EREGL': 52.30, 'KCHOL': 145.20, 'SAHOL': 98.40, 'TUPRS': 185.60,
      'BTC': 685420, 'ETH': 35280, 'XRP': 18.45, 'SOL': 4850,
      'GRAM_ALTIN': 2850.50, 'CEYREK': 11500, 'YARIM': 22800, 'TAM': 45500,
      'USD': 35.42, 'EUR': 38.15, 'GBP': 44.80, 'CHF': 39.20, 'JPY': 0.235,
      'CAD': 25.80, 'AUD': 23.40, 'CNY': 4.85
    };
    this.trends = {};
    this.history = {};
    this.initTrends();
    this.startLiveSimulation();
  }

  initTrends() {
    for (const k in this.basePrices) {
      this.trends[k] = { direction: Math.random() > 0.5 ? 1 : -1, volatility: Math.random() * 0.02 + 0.001 };
      this.history[k] = this.generateHistory(k, 50);
    }
  }

  generateHistory(symbol, points) {
    const arr = [];
    let p = this.basePrices[symbol] || 100;
    for (let i = 0; i < points; i++) {
      arr.unshift(p);
      p *= (1 + (Math.random() - 0.5) * 0.02);
    }
    return arr;
  }

  startLiveSimulation() {
    setInterval(() => {
      for (const k in this.basePrices) {
        const t = this.trends[k];
        const change = (Math.random() - 0.48) * t.volatility;
        this.basePrices[k] *= (1 + change);
        this.history[k].push(this.basePrices[k]);
        if (this.history[k].length > 100) this.history[k].shift();
        if (Math.random() > 0.95) t.direction *= -1;
      }
      if (app.currentTab === 'piyasa') app.Piyasa.updateLive();
      if (app.currentTab === 'kasam') app.Kasam.updateLive();
      if (app.currentTab === 'doviz') app.Doviz.updateLive();
    }, 3000);
  }

  getPrice(symbol) { return this.basePrices[symbol] || (Math.random() * 100 + 10); }
  getChange(symbol) { return parseFloat(((Math.random() - 0.45) * 5).toFixed(2)); }
  getHistory(symbol, points = 30) {
    const h = this.history[symbol] || this.generateHistory(symbol, points);
    return h.slice(-points);
  }
}

// ============================================
// TOAST BİLDİRİM SİSTEMİ
// ============================================
class ToastSystem {
  constructor() {
    this.container = document.getElementById('toast-container');
  }

  show(message, type = 'info', duration = 3500) {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    el.innerHTML = '<span>' + (icons[type] || 'ℹ️') + '</span><span>' + message + '</span>';
    this.container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(30px) scale(0.9)';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }
}

// ============================================
// MODAL SİSTEMİ
// ============================================
class ModalSystem {
  static open(title, content, buttons = []) {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-title">${title}</div>
        <div style="margin-bottom:16px">${content}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
          ${buttons.map(b => `<button class="btn ${b.class||'btn-secondary'}" style="width:auto;padding:8px 16px;font-size:13px" onclick="${b.onclick}">${b.text}</button>`).join('')}
        </div>
      </div>
    `;
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  static close() {
    const m = document.querySelector('.modal-overlay');
    if (m) m.remove();
  }
}

// ============================================
// KONUM İZNİ (Şeffaf Onay Katmanı)
// Tarayıcının yerel izin penceresinden ÖNCE, NEDEN sorulduğunu
// açıklayan bir uygulama-içi diyalog gösterir. Karar hatırlanır;
// reddedilirse tekrar tekrar sorulmaz (Ayarlar'dan sıfırlanabilir).
// ============================================
class LocationConsent {
  static REASONS = {
    deprem: 'yakınınızdaki deprem uyarılarını önceliklendirmek',
    yol: 'trafik, radar ve hız sınırı bilgisini konumunuza göre getirmek',
    hava: 'bulunduğunuz yerin hava durumunu göstermek'
  };

  static async request(reasonKey) {
    const decision = DataStore.get('location_consent', null); // null | 'granted' | 'denied'
    const reasonText = this.REASONS[reasonKey] || 'konum tabanlı özellikleri sunmak';

    if (decision === 'denied') return null; // karar verilmiş, tekrar sormuyoruz
    if (decision === 'granted') return this._getPosition();

    return new Promise((resolve) => {
      ModalSystem.open('📍 Konum İzni', `
        <div style="font-size:13px;line-height:1.7;color:var(--text2)">
          SyFinansOtağı, <b>${reasonText}</b> için konumunuzu okumak istiyor.
          <br><br>
          Konumunuz sadece bu cihazda işlenir, sunucuya gönderilmez ve başka bir kişiyle otomatik paylaşılmaz.
          Afet modülündeki "Güvendeyim" tuşuna bastığınızda dışında konumunuz kimseye iletilmez.
        </div>
      `, [
        { text: 'Reddet', class: 'btn-secondary', onclick: 'LocationConsent.resolve(false)' },
        { text: '✅ İzin Ver', class: 'btn-primary', onclick: 'LocationConsent.resolve(true)' }
      ]);
      this._pendingResolve = resolve;
    });
  }

  static async resolve(granted) {
    ModalSystem.close();
    DataStore.set('location_consent', granted ? 'granted' : 'denied');
    const result = granted ? await this._getPosition() : null;
    if (this._pendingResolve) { this._pendingResolve(result); this._pendingResolve = null; }
  }

  static async _getPosition() {
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000, maximumAge: 300000 })
      );
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    } catch {
      return null;
    }
  }

  static resetConsent() {
    DataStore.set('location_consent', null);
    app.toast('📍 Konum izni sıfırlandı, bir dahaki istekte tekrar sorulacak', 'info');
  }
}

// ============================================
// OCR (FOTOĞRAFTAN VERİ OKUMA) SİMÜLASYONU
// ============================================
class OCRModule {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
  }

  async open() {
    if (app.activation && app.activation.isTransferLocked()) {
      app.toast('🔒 Transfer kilidi aktif. Ayarlar > Cihaz Yönetimi > Transfer Onayı', 'warning');
      return;
    }

    ModalSystem.open('📷 Fotoğraftan Veri Oku', `
      <div style="text-align:center">
        <video id="ocr-video" autoplay playsinline style="width:100%;max-height:300px;border-radius:12px;background:var(--bg3)"></video>
        <canvas id="ocr-canvas" style="display:none"></canvas>
        <div id="ocr-status" style="margin-top:10px;font-size:13px;color:var(--text2)">Kamera başlatılıyor...</div>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:center">
          <button class="btn btn-primary btn-sm" onclick="app.ocr.capture()" style="width:auto">📸 Çek & Oku</button>
          <button class="btn btn-secondary btn-sm" onclick="app.ocr.close()" style="width:auto">❌ Kapat</button>
        </div>
      </div>
    `, []);

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      this.video = document.getElementById('ocr-video');
      this.video.srcObject = this.stream;
      document.getElementById('ocr-status').textContent = '✅ Kamera aktif. Hisse senedi veya döviz ekranını gösterin.';
    } catch(err) {
      document.getElementById('ocr-status').innerHTML = '❌ Kamera erişimi reddedildi.<br><small>Simülasyon moduna geçiliyor...</small>';
      setTimeout(() => this.simulateCapture(), 1500);
    }
  }

  capture() {
    if (!this.video) return;
    this.canvas = document.getElementById('ocr-canvas');
    this.canvas.width = this.video.videoWidth || 640;
    this.canvas.height = this.video.videoHeight || 480;
    const ctx = this.canvas.getContext('2d');
    ctx.drawImage(this.video, 0, 0);
    this.processImage();
  }

  simulateCapture() {
    const symbols = ['ASELS', 'THYAO', 'GARAN', 'BTC', 'GRAM_ALTIN', 'USD'];
    const detected = symbols[Math.floor(Math.random() * symbols.length)];
    const price = app.data.getPrice(detected);
    this.showResult(detected, price, true);
  }

  processImage() {
    document.getElementById('ocr-status').textContent = '🔍 Görüntü analiz ediliyor...';
    setTimeout(() => {
      const symbols = ['ASELS', 'THYAO', 'GARAN', 'ISCTR', 'BTC', 'ETH', 'GRAM_ALTIN', 'USD', 'EUR'];
      const detected = symbols[Math.floor(Math.random() * symbols.length)];
      const price = app.data.getPrice(detected);
      this.showResult(detected, price, false);
    }, 2000);
  }

  showResult(symbol, price, isSimulated) {
    const isCrypto = ['BTC','ETH','XRP','SOL'].includes(symbol);
    const isMetal = symbol.includes('ALTIN') || symbol.includes('CEYREK') || symbol.includes('YARIM') || symbol.includes('TAM');
    const isCurrency = ['USD','EUR','GBP','CHF','JPY','CAD','AUD','CNY'].includes(symbol);
    let type = 'hisse';
    if (isCrypto) type = 'kripto';
    if (isMetal) type = 'altın';
    if (isCurrency) type = 'döviz';

    ModalSystem.open('📋 Tespit Edilen Veri', `
      <div style="text-align:center;padding:10px">
        <div style="font-size:32px;margin-bottom:8px">${isSimulated ? '🤖' : '📸'}</div>
        <div style="font-size:20px;font-weight:700">${symbol}</div>
        <div style="font-size:28px;font-weight:800;color:var(--primary);margin:8px 0">${isCurrency ? '' : '₺'}${price.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        <div style="font-size:13px;color:var(--text2)">Tür: ${type.toUpperCase()}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:8px">${isSimulated ? '(Simülasyon modu)' : '(Kamera okuması)'}</div>
      </div>
    `, [
      { text: '💼 Portföye Ekle', class: 'btn-primary', onclick: 'app.ocr.addToPortfolio(\'' + symbol + '\', ' + price + '); ModalSystem.close();' },
      { text: '➕ İzleme Listesine Ekle', class: 'btn-secondary', onclick: 'app.ocr.addToWatchlist(\'' + symbol + '\'); ModalSystem.close();' },
      { text: 'Kapat', class: 'btn-secondary', onclick: 'ModalSystem.close()' }
    ]);
  }

  addToPortfolio(symbol, price) {
    const portfolio = DataStore.get('portfolio', []);
    const existing = portfolio.find(p => p.symbol === symbol);
    if (existing) {
      existing.lot += 1;
      existing.avgPrice = ((existing.avgPrice * (existing.lot - 1)) + price) / existing.lot;
    } else {
      portfolio.push({ symbol, lot: 1, avgPrice: price, addedAt: Date.now() });
    }
    DataStore.set('portfolio', portfolio);
    app.toast('✅ ' + symbol + ' portföye eklendi', 'success');
    if (app.currentTab === 'kasam') app.Kasam.render();
  }

  addToWatchlist(symbol) {
    const list = DataStore.get('watchlist', ['BIST100', 'ASELS', 'THYAO', 'GARAN', 'BTC', 'GRAM_ALTIN', 'USD']);
    if (!list.includes(symbol)) {
      list.push(symbol);
      DataStore.set('watchlist', list);
    }
    app.toast('👁️ ' + symbol + ' izleme listesine eklendi', 'success');
    if (app.currentTab === 'piyasa') app.Piyasa.render();
  }

  close() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    ModalSystem.close();
  }
}

// ============================================
// AI KAŞİF - FİNANS DANIŞMANI
// ============================================
class KasefAI {
  constructor() {
    this.knowledge = {
      'ASELS': { name: 'Aselsan', sector: 'Savunma', advice: 'Savunma sanayiinde lider. Yüksek büyüme potansiyeli. Risk: Orta' },
      'THYAO': { name: 'Türk Hava Yolları', sector: 'Havacılık', advice: 'Küresel havacılık sektörü canlanıyor. Risk: Yüksek (döviz kuru hassasiyeti)' },
      'GARAN': { name: 'Garanti BBVA', sector: 'Bankacılık', advice: 'Dijital bankacılıkta öncü. Temettü verimi yüksek. Risk: Düşük-Orta' },
      'ISCTR': { name: 'İş Bankası', sector: 'Bankacılık', advice: 'En büyük özel banka. İstikrarlı. Risk: Düşük' },
      'BIMAS': { name: 'BİM', sector: 'Perakende', advice: 'Enflasyon ortamında dayanıklı. Risk: Düşük' },
      'SISE': { name: 'Şişe Cam', sector: 'Cam', advice: 'Global oyuncu. Döviz geliri yüksek. Risk: Orta' },
      'EREGL': { name: 'Ereğli Demir Çelik', sector: 'Metal', advice: 'Çelik fiyatları volatil. Risk: Yüksek' },
      'KCHOL': { name: 'Koç Holding', sector: 'Holding', advice: 'Çeşitlendirilmiş portföy. Risk: Düşük' },
      'BTC': { name: 'Bitcoin', sector: 'Kripto', advice: 'Yüksek volatilite. Sadece kaybetmeyi göze alabileceğiniz kadar yatırım yapın. Risk: Çok Yüksek' },
      'ETH': { name: 'Ethereum', sector: 'Kripto', advice: 'Akıllı kontrat lideri. Risk: Çok Yüksek' },
      'GRAM_ALTIN': { name: 'Gram Altın', sector: 'Değerli Maden', advice: 'Enflasyon koruyucu. Risk: Düşük' },
      'USD': { name: 'Dolar', sector: 'Döviz', advice: 'Türkiye\'de enflasyon karşısında korunma aracı. Risk: Orta' }
    };
    this.chatHistory = DataStore.get('chat_history', []);
  }

  analyze(query) {
    query = query.toUpperCase();
    let response = '';
    let confidence = 0;

    const symbols = Object.keys(this.knowledge);
    let detected = null;
    for (const s of symbols) {
      if (query.includes(s)) { detected = s; break; }
    }

    if (query.includes('AL') || query.includes('SAT') || query.includes('YATIRIM')) {
      if (detected) {
        const info = this.knowledge[detected];
        const price = app.data.getPrice(detected);
        const change = app.data.getChange(detected);
        const trend = change > 0 ? 'yükseliş' : 'düşüş';
        const rec = change < -3 ? 'Değerlendirilebilir (düşüşte)' : change > 5 ? 'Dikkat (yükselişte, geri çekilme olabilir)' : 'İzleme veya kademeli alım stratejisi önerilir';

        response = `<b>${info.name} (${detected})</b> analizi:<br><br>` +
          `📊 <b>Sektör:</b> ${info.sector}<br>` +
          `💰 <b>Güncel Fiyat:</b> ₺${price.toLocaleString('tr-TR', {minimumFractionDigits: 2})}<br>` +
          `📈 <b>Günlük Değişim:</b> %${change.toFixed(2)} (${trend})<br>` +
          `🧠 <b>AI Değerlendirmesi:</b> ${info.advice}<br><br>` +
          `🎯 <b>Öneri:</b> ${rec}<br><br>` +
          `<i>⚠️ Bu bir simülasyondur. Gerçek yatırım tavsiyesi değildir.</i>`;
        confidence = 87;
      } else {
        response = 'Belirttiğiniz sembolü tanıyamadım. Örnek: "ASELS almalı mıyım?" veya "THYAO hakkında ne düşünüyorsun?"';
        confidence = 30;
      }
    } else if (query.includes('PORTFÖY') || query.includes('KASAM')) {
      const portfolio = DataStore.get('portfolio', []);
      const total = portfolio.reduce((sum, p) => sum + (p.lot * app.data.getPrice(p.symbol)), 0);
      response = `💼 Portföyünüzde ${portfolio.length} adet varlık bulunuyor.<br>Toplam değer: <b>₺${total.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</b><br><br>Detaylı analiz için "Kasam" sekmesine bakabilirsiniz.`;
      confidence = 95;
    } else if (query.includes('PLAN') || query.includes('KADEME')) {
      response = '🎯 Alım planı oluşturmak için "Planlar" sekmesini kullanabilirsiniz.';
      confidence = 90;
    } else if (query.includes('DEPREM') || query.includes('AFET')) {
      response = '🚨 Son deprem verileri için "Afet" sekmesine bakabilirsiniz.';
      confidence = 92;
    } else if (query.includes('HAVA') || query.includes('HAVA DURUMU')) {
      response = '🌤️ Hava durumu bilgisi için "Hava" sekmesine bakabilirsiniz.';
      confidence = 92;
    } else if (query.includes('MERHABA') || query.includes('SELAM')) {
      response = 'Merhaba! Ben Kaşif, sanal finans danışmanınız.<br><br><b>Unutmayın:</b> Bu bir simülasyon uygulamasıdır. Gerçek para ile işlem yapılmaz.';
      confidence = 100;
    } else {
      response = 'Sorunuzu anlamaya çalışıyorum. Daha spesifik bir soru sorabilir misiniz?';
      confidence = 20;
    }

    return { response, confidence };
  }

  addToHistory(role, text) {
    this.chatHistory.push({ role, text, time: Date.now() });
    if (this.chatHistory.length > 100) this.chatHistory.shift();
    DataStore.set('chat_history', this.chatHistory);
  }
}

// ============================================
// PİYASA MODÜLÜ (Canvas Grafikli)
// ============================================
class PiyasaModule {
  constructor() {
    this.currentFilter = 'all';
    this.sparklineData = [];
  }

  render() {
    const container = document.getElementById('watchlist-container');
    const watchlist = DataStore.get('watchlist', ['BIST100', 'ASELS', 'THYAO', 'GARAN', 'BTC', 'GRAM_ALTIN', 'USD']);
    const filter = this.currentFilter;

    let html = '';
    for (const sym of watchlist) {
      const type = this.getSymbolType(sym);
      if (filter !== 'all' && type !== filter) continue;
      const price = app.data.getPrice(sym);
      const change = app.data.getChange(sym);
      const isUp = change >= 0;
      const name = this.getSymbolName(sym);
      const history = app.data.getHistory(sym, 20);

      html += `
        <div class="watchlist-item" onclick="app.Piyasa.showDetail('${sym}')">
          <div style="flex:1">
            <div class="symbol">${sym}</div>
            <div class="name">${name}</div>
          </div>
          <div style="width:80px;height:40px;margin:0 12px">
            <canvas id="spark-${sym}" style="width:100%;height:100%"></canvas>
          </div>
          <div style="text-align:right;min-width:90px">
            <div class="price">${type === 'doviz' || type === 'kripto' ? '' : '₺'}${price.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div class="change ${isUp ? 'up' : 'down'}">${isUp ? '▲' : '▼'} %${Math.abs(change).toFixed(2)}</div>
          </div>
        </div>
      `;
    }

    if (html === '') html = '<div style="text-align:center;padding:20px;color:var(--text2)">Bu kategoride veri bulunmuyor.</div>';
    container.innerHTML = html;

    // Canvas sparkline'ları çiz
    setTimeout(() => {
      for (const sym of watchlist) {
        const type = this.getSymbolType(sym);
        if (filter !== 'all' && type !== filter) continue;
        const history = app.data.getHistory(sym, 20);
        const change = app.data.getChange(sym);
        const color = change >= 0 ? '#10b981' : '#ef4444';
        ChartEngine.drawSparkline('spark-' + sym, history, color);
      }
    }, 50);

    // BIST başlık sparkline
    const bistHistory = app.data.getHistory('BIST100', 30);
    ChartEngine.drawAreaChart('bist-sparkline', bistHistory);
  }

  getSymbolType(sym) {
    if (['BIST100','XU030','XU050'].includes(sym)) return 'bist';
    if (['BTC','ETH','XRP','SOL'].includes(sym)) return 'kripto';
    if (['GRAM_ALTIN','CEYREK','YARIM','TAM'].includes(sym)) return 'altın';
    if (['USD','EUR','GBP','CHF','JPY','CAD','AUD','CNY'].includes(sym)) return 'doviz';
    return 'bist';
  }

  getSymbolName(sym) {
    const names = {
      'BIST100': 'BIST 100 Endeksi', 'XU030': 'BIST 30', 'XU050': 'BIST 50',
      'ASELS': 'Aselsan', 'THYAO': 'Türk Hava Yolları', 'GARAN': 'Garanti BBVA',
      'ISCTR': 'İş Bankası', 'AKBNK': 'Akbank', 'YKBNK': 'Yapı Kredi',
      'BIMAS': 'BİM', 'SISE': 'Şişe Cam', 'EREGL': 'Ereğli Demir Çelik',
      'KCHOL': 'Koç Holding', 'SAHOL': 'Sabancı Holding', 'TUPRS': 'Tüpraş',
      'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'XRP': 'Ripple', 'SOL': 'Solana',
      'GRAM_ALTIN': 'Gram Altın', 'CEYREK': 'Çeyrek Altın', 'YARIM': 'Yarım Altın', 'TAM': 'Tam Altın',
      'USD': 'Amerikan Doları', 'EUR': 'Euro', 'GBP': 'İngiliz Sterlini', 'CHF': 'İsviçre Frangı', 'JPY': 'Japon Yeni',
      'CAD': 'Kanada Doları', 'AUD': 'Avustralya Doları', 'CNY': 'Çin Yuanı'
    };
    return names[sym] || sym;
  }

  updateLive() {
    if (app.currentTab !== 'piyasa') return;
    this.render();
    const bistPrice = app.data.getPrice('BIST100');
    const bistChange = app.data.getChange('BIST100');
    const priceEl = document.getElementById('bist-price');
    const changeEl = document.getElementById('bist-change');
    if (priceEl) priceEl.textContent = bistPrice.toLocaleString('tr-TR', {minimumFractionDigits: 2});
    if (changeEl) {
      const isUp = bistChange >= 0;
      changeEl.style.color = isUp ? 'var(--success)' : 'var(--danger)';
      changeEl.textContent = (isUp ? '▲ ' : '▼ ') + '%' + Math.abs(bistChange).toFixed(2);
    }
  }

  showDetail(sym) {
    const price = app.data.getPrice(sym);
    const change = app.data.getChange(sym);
    const history = app.data.getHistory(sym, 40);

    ModalSystem.open(this.getSymbolName(sym) + ' (' + sym + ')', `
      <div style="text-align:center">
        <div style="font-size:36px;font-weight:800;color:var(--primary)">${this.getSymbolType(sym) === 'doviz' || this.getSymbolType(sym) === 'kripto' ? '' : '₺'}${price.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</div>
        <div style="font-size:16px;color:${change>=0?'var(--success)':'var(--danger)'};font-weight:600;margin:8px 0">${change>=0?'▲':'▼'} %${Math.abs(change).toFixed(2)}</div>
        <canvas id="detail-chart" style="width:100%;height:160px;margin:16px 0;border-radius:12px;background:linear-gradient(180deg,rgba(102,126,234,0.05),transparent)"></canvas>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">
          <div style="background:var(--bg3);padding:14px;border-radius:10px">
            <div style="color:var(--text3);font-size:11px;margin-bottom:4px">En Yüksek (24s)</div>
            <div style="font-weight:700;font-size:16px">₺${Math.max(...history).toLocaleString('tr-TR', {minimumFractionDigits: 2})}</div>
          </div>
          <div style="background:var(--bg3);padding:14px;border-radius:10px">
            <div style="color:var(--text3);font-size:11px;margin-bottom:4px">En Düşük (24s)</div>
            <div style="font-weight:700;font-size:16px">₺${Math.min(...history).toLocaleString('tr-TR', {minimumFractionDigits: 2})}</div>
          </div>
        </div>
      </div>
    `, [
      { text: '💼 Portföye Ekle', class: 'btn-primary', onclick: 'app.ocr.addToPortfolio(\'' + sym + '\', ' + price + '); ModalSystem.close();' },
      { text: 'Kapat', class: 'btn-secondary', onclick: 'ModalSystem.close()' }
    ]);

    setTimeout(() => {
      ChartEngine.drawAreaChart('detail-chart', history, '#10b981', '#ef4444');
    }, 50);
  }

  filter(type) {
    this.currentFilter = type;
    this.render();
  }
}

// ============================================
// KASAM (PORTFÖY) MODÜLÜ (Canvas Grafikli)
// ============================================
class KasamModule {
  render() {
    const portfolio = DataStore.get('portfolio', []);
    const container = document.getElementById('hisse-list');
    const header = document.getElementById('kasam-header');

    let totalValue = 0;
    let totalCost = 0;
    let dailyPL = 0;

    let html = '';
    for (const item of portfolio) {
      const currentPrice = app.data.getPrice(item.symbol);
      const value = item.lot * currentPrice;
      const cost = item.lot * item.avgPrice;
      const pl = value - cost;
      const plPct = ((currentPrice - item.avgPrice) / item.avgPrice) * 100;
      totalValue += value;
      totalCost += cost;
      dailyPL += pl;

      html += `
        <div class="portfolio-item">
          <div class="row">
            <div>
              <div class="symbol">${item.symbol}</div>
              <div class="lot">${item.lot} lot @ ₺${item.avgPrice.toFixed(2)}</div>
            </div>
            <div style="text-align:right">
              <div class="value">₺${value.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</div>
              <div class="pl ${pl >= 0 ? 'pos' : 'neg'}">${pl >= 0 ? '+' : ''}₺${pl.toLocaleString('tr-TR', {minimumFractionDigits: 2})} (%${plPct.toFixed(2)})</div>
            </div>
          </div>
          <div class="actions">
            <button onclick="app.Kasam.updateLot('${item.symbol}', 1)">➕ Lot Ekle</button>
            <button onclick="app.Kasam.updateLot('${item.symbol}', -1)">➖ Lot Çıkar</button>
            <button onclick="app.Kasam.remove('${item.symbol}')">🗑️ Sil</button>
          </div>
        </div>
      `;
    }

    if (html === '') {
      html = '<div style="text-align:center;padding:30px;color:var(--text2)">💼 Portföyünüz boş.<br><br>"Piyasa" sekmesinden veya 📷 OCR ile hisse ekleyebilirsiniz.</div>';
    }

    container.innerHTML = html;

    if (header) {
      const totalPL = totalValue - totalCost;
      const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
      header.innerHTML = `
        <div style="font-size:13px;color:var(--text2);margin-bottom:8px">Toplam Portföy Değeri (SANAL)</div>
        <div style="font-size:36px;font-weight:700" id="portfolio-total">₺${totalValue.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</div>
        <div style="display:flex;justify-content:center;gap:24px;margin-top:16px">
          <div><div style="font-size:12px;color:var(--text2)">Günlük</div><div style="color:${dailyPL>=0?'var(--success)':'var(--danger)'};font-weight:700">${dailyPL>=0?'+':''}₺${dailyPL.toLocaleString('tr-TR', {minimumFractionDigits: 0})}</div></div>
          <div><div style="font-size:12px;color:var(--text2)">Toplam K/Z</div><div style="color:${totalPL>=0?'var(--success)':'var(--danger)'};font-weight:700">${totalPL>=0?'+':''}₺${totalPL.toLocaleString('tr-TR', {minimumFractionDigits: 0})}</div></div>
          <div><div style="font-size:12px;color:var(--text2)">Getiri</div><div style="color:${totalPLPct>=0?'var(--success)':'var(--danger)'};font-weight:700">%${totalPLPct.toFixed(2)}</div></div>
        </div>
        <canvas id="portfolio-chart" style="width:100%;height:120px;margin-top:16px"></canvas>
        <div style="margin-top:8px;font-size:11px;color:var(--text3)">🔒 Bu cihaza özel veridir. Diğer cihazlarla paylaşılmaz.</div>
      `;

      // Portföy geçmişi grafiği (simüle)
      const portHistory = Array.from({length: 30}, (_, i) => {
        const ratio = i / 29;
        return totalValue * (0.85 + ratio * 0.15 + (Math.random() - 0.5) * 0.05);
      });
      setTimeout(() => ChartEngine.drawAreaChart('portfolio-chart', portHistory), 50);
    }

    this.renderAssetChart();
    this.renderNotes();
  }

  renderAssetChart() {
    const portfolio = DataStore.get('portfolio', []);
    const container = document.getElementById('varlik-dagilim');
    if (!container) return;

    if (portfolio.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text2)">Portföy boş olduğu için dağılım gösterilemiyor.</div>';
      return;
    }

    const total = portfolio.reduce((s, p) => s + (p.lot * app.data.getPrice(p.symbol)), 0);
    const colors = ['#667eea', '#764ba2', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

    const labels = portfolio.map(p => p.symbol);
    const values = portfolio.map(p => p.lot * app.data.getPrice(p.symbol));

    container.innerHTML = '<canvas id="asset-pie-chart" style="width:100%;height:220px"></canvas>';
    setTimeout(() => ChartEngine.drawPieChart('asset-pie-chart', labels, values, colors), 50);
  }

  updateLot(symbol, delta) {
    const portfolio = DataStore.get('portfolio', []);
    const item = portfolio.find(p => p.symbol === symbol);
    if (!item) return;
    item.lot += delta;
    if (item.lot <= 0) { this.remove(symbol); return; }
    DataStore.set('portfolio', portfolio);
    this.render();
    app.toast(delta > 0 ? '➕ ' + symbol + ' lot arttırıldı' : '➖ ' + symbol + ' lot azaltıldı', 'success');
  }

  remove(symbol) {
    if (!confirm(symbol + ' portföyden silinsin mi?')) return;
    let portfolio = DataStore.get('portfolio', []);
    portfolio = portfolio.filter(p => p.symbol !== symbol);
    DataStore.set('portfolio', portfolio);
    this.render();
    app.toast('🗑️ ' + symbol + ' silindi', 'warning');
  }

  renderNotes() {
    const container = document.getElementById('not-list');
    if (!container) return;
    const notes = DataStore.get('notes', []);

    let html = '';
    for (const note of notes.slice().reverse()) {
      const date = new Date(note.time).toLocaleString('tr-TR');
      html += `
        <div class="note-item">
          <button class="note-delete" onclick="app.Kasam.deleteNote(${note.time})">×</button>
          <div class="note-date">📝 ${date}</div>
          <div class="note-text">${this.escapeHtml(note.text)}</div>
        </div>
      `;
    }
    if (html === '') html = '<div style="text-align:center;padding:20px;color:var(--text2)">Henüz not eklenmemiş.</div>';
    container.innerHTML = html;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  deleteNote(time) {
    let notes = DataStore.get('notes', []);
    notes = notes.filter(n => n.time !== time);
    DataStore.set('notes', notes);
    this.renderNotes();
    app.toast('🗑️ Not silindi', 'warning');
  }

  updateLive() {
    if (app.currentTab === 'kasam') this.render();
  }
}

// ============================================
// PLANLAR MODÜLÜ
// ============================================
class PlanlarModule {
  render() {
    const container = document.getElementById('plan-list');
    const plans = DataStore.get('plans', []);

    let html = '<div style="font-size:16px;font-weight:700;margin-bottom:12px">📋 Kayıtlı Planlarım</div>';
    if (plans.length === 0) {
      html += '<div style="text-align:center;padding:20px;color:var(--text2)">Henüz plan oluşturulmamış.</div>';
    } else {
      for (const plan of plans) {
        const stepsHtml = plan.steps.map((s, i) => `
          <div class="plan-step ${s.completed ? 'completed' : ''}">
            <div class="step-num">${i + 1}</div>
            <div class="step-info">
              <div class="step-price">₺${s.price.toFixed(2)}</div>
              <div class="step-amount">${s.lot} lot - ₺${s.total.toFixed(2)}</div>
            </div>
            ${s.completed ? '<span style="color:var(--success);font-size:18px">✓</span>' : '<button class="btn btn-sm btn-secondary" style="width:auto;padding:4px 10px;font-size:11px" onclick="Planlar.completeStep(' + plan.id + ', ' + i + ')">Tamamla</button>'}
          </div>
        `).join('');

        html += `
          <div class="plan-item">
            <div class="plan-header">
              <div>
                <div class="plan-symbol">${plan.symbol}</div>
                <div style="font-size:12px;color:var(--text2)">Bütçe: ₺${plan.budget.toLocaleString()} | ${plan.steps.length} kademe</div>
              </div>
              <span class="plan-badge ${plan.steps.every(s => s.completed) ? 'completed' : 'active'}">${plan.steps.every(s => s.completed) ? 'Tamamlandı' : 'Aktif'}</span>
            </div>
            <div class="plan-steps">${stepsHtml}</div>
            <div style="display:flex;gap:8px;margin-top:12px">
              <button class="btn btn-danger btn-sm" style="width:auto" onclick="Planlar.delete(${plan.id})">🗑️ Sil</button>
            </div>
          </div>
        `;
      }
    }
    container.innerHTML = html;
  }

  static calculate() {
    const symbol = document.getElementById('plan-sembol').value.toUpperCase().trim();
    const budget = parseFloat(document.getElementById('plan-butce').value);
    const steps = parseInt(document.getElementById('plan-kademe').value);
    const firstPrice = parseFloat(document.getElementById('plan-fiyat').value);
    const dropPct = parseFloat(document.getElementById('plan-dusus').value) || 5;

    if (!symbol || !budget || !steps || !firstPrice) {
      app.toast('❌ Tüm alanları doldurun', 'error');
      return;
    }

    const stepBudget = budget / steps;
    const planSteps = [];
    let currentPrice = firstPrice;

    for (let i = 0; i < steps; i++) {
      const lot = Math.floor(stepBudget / currentPrice);
      planSteps.push({ price: currentPrice, lot: lot, total: lot * currentPrice, completed: false });
      currentPrice = currentPrice * (1 - dropPct / 100);
    }

    const preview = document.getElementById('plan-onizleme');
    let html = '<div style="background:var(--bg3);border-radius:12px;padding:16px;margin-top:12px;border:1px solid var(--border)">';
    html += '<div style="font-weight:700;margin-bottom:12px;font-size:15px">📊 Önizleme</div>';
    planSteps.forEach((s, i) => {
      html += `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px"><span style="font-weight:600">Kademe ${i + 1}:</span><span>₺${s.price.toFixed(2)} → ${s.lot} lot (₺${s.total.toFixed(2)})</span></div>`;
    });
    html += `<div style="margin-top:12px;font-weight:700;color:var(--primary);font-size:15px">Toplam: ${planSteps.reduce((a, s) => a + s.lot, 0)} lot</div>`;
    html += '</div>';
    preview.innerHTML = html;

    document.getElementById('plan-kaydet-btn').style.display = 'block';
    document.getElementById('plan-kaydet-btn').onclick = () => {
      PlanlarModule.save(symbol, budget, steps, firstPrice, dropPct, planSteps);
    };
  }

  static save(symbol, budget, steps, firstPrice, dropPct, planSteps) {
    const plans = DataStore.get('plans', []);
    plans.push({ id: Date.now(), symbol, budget, steps: planSteps, createdAt: Date.now() });
    DataStore.set('plans', plans);
    app.toast('💾 Plan kaydedildi', 'success');
    document.getElementById('plan-onizleme').innerHTML = '';
    document.getElementById('plan-kaydet-btn').style.display = 'none';
    document.querySelector('#view-planlar form').reset();
    app.Planlar.render();
  }

  static delete(id) {
    if (!confirm('Plan silinsin mi?')) return;
    let plans = DataStore.get('plans', []);
    plans = plans.filter(p => p.id !== id);
    DataStore.set('plans', plans);
    app.toast('🗑️ Plan silindi', 'warning');
    app.Planlar.render();
  }

  static completeStep(planId, stepIndex) {
    const plans = DataStore.get('plans', []);
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      plan.steps[stepIndex].completed = true;
      DataStore.set('plans', plans);
      app.toast('✅ Kademe ' + (stepIndex + 1) + ' tamamlandı', 'success');
      app.Planlar.render();
    }
  }
}

// ============================================
// AFET (DEPREM) MODÜLÜ
// ============================================
class AfetModule {
  constructor() {
    this.map = null;
    this.earthquakes = [];
    this.alertedIds = new Set(DataStore.get('afet_alerted_ids', []));
    this.SIREN_THRESHOLD_FAR = 5.5;   // uzak/global depremler için eşik
    this.SIREN_THRESHOLD_NEAR = 4.5;  // yakın (≤200km) depremler için daha düşük eşik — yakında küçük büyüklük bile şiddetli hissedilir
    this.NEAR_RADIUS_KM = 200;
    this.userLoc = null; // {lat, lon}
    this.TR_BOUNDS = { latMin: 35.5, latMax: 42.5, lonMin: 25.5, lonMax: 45.0 };
  }

  async getUserLocation() {
    if (this.userLoc) return this.userLoc;
    const pos = await LocationConsent.request('deprem');
    if (pos) {
      this.userLoc = pos;
    } else {
      // İzin verilmedi/reddedildi → Türkiye merkezine varsayılan (yine de "Türkiye geneli" önceliği çalışır)
      this.userLoc = { lat: 39.0, lon: 35.0, fallback: true };
    }
    return this.userLoc;
  }

  haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  isInTurkey(lat, lon) {
    const b = this.TR_BOUNDS;
    return lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax;
  }

  async fetchTurkeyFeed() {
    try {
      const res = await fetch('https://api.orhanaydogdu.com.tr/deprem/live.php?limit=25');
      const data = await res.json();
      return (data.result || []).map(eq => ({
        id: 'tr_' + (eq.earthquake_id || eq.date + eq.title),
        title: eq.title || eq.lokasyon,
        mag: parseFloat(eq.mag),
        lat: parseFloat(eq.geojson?.coordinates?.[1] ?? eq.lat),
        lon: parseFloat(eq.geojson?.coordinates?.[0] ?? eq.lng),
        depth: eq.depth,
        date: eq.date,
        time: new Date(eq.date).getTime() || Date.now(),
        source: 'AFAD/Kandilli (TR)'
      }));
    } catch { return []; }
  }

  async fetchUSGSFeed() {
    try {
      // USGS açık veri - anahtar gerektirmez, son 24 saat M4.0+
      const start = new Date(Date.now() - 86400000).toISOString();
      const res = await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}&minmagnitude=4.0`);
      const data = await res.json();
      return (data.features || []).map(f => ({
        id: 'usgs_' + f.id,
        title: f.properties.place,
        mag: f.properties.mag,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        depth: f.geometry.coordinates[2],
        date: new Date(f.properties.time).toLocaleString('tr-TR'),
        time: f.properties.time,
        source: 'USGS (Dünya)'
      }));
    } catch { return []; }
  }

  async fetchEMSCFeed() {
    try {
      // EMSC açık veri - anahtar gerektirmez
      const res = await fetch('https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=30&minmag=4.0&start=' +
        new Date(Date.now() - 86400000).toISOString().slice(0,19));
      const data = await res.json();
      return (data.features || []).map(f => ({
        id: 'emsc_' + f.id,
        title: f.properties.flynn_region,
        mag: f.properties.mag,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        depth: f.geometry.coordinates[2],
        date: new Date(f.properties.time).toLocaleString('tr-TR'),
        time: new Date(f.properties.time).getTime(),
        source: 'EMSC (Dünya)'
      }));
    } catch { return []; }
  }

  async fetchAllSources() {
    const [tr, usgs, emsc] = await Promise.all([
      this.fetchTurkeyFeed(), this.fetchUSGSFeed(), this.fetchEMSCFeed()
    ]);
    // Basit tekilleştirme: ~aynı konum (0.3° içinde) + ~aynı zaman (10dk içinde) + yakın büyüklük = aynı deprem
    const merged = [...tr];
    for (const eq of [...usgs, ...emsc]) {
      const dup = merged.some(m =>
        Math.abs(m.lat - eq.lat) < 0.3 && Math.abs(m.lon - eq.lon) < 0.3 &&
        Math.abs(m.time - eq.time) < 600000 && Math.abs(m.mag - eq.mag) < 0.5
      );
      if (!dup) merged.push(eq);
    }
    return merged;
  }

  async render() {
    const container = document.getElementById('afet-content');
    container.innerHTML = '<div class="skeleton" style="height:120px;margin-bottom:12px"></div><div class="skeleton" style="height:80px;margin-bottom:12px"></div>';

    await this.getUserLocation();

    try {
      this.earthquakes = await this.fetchAllSources();
      if (this.earthquakes.length === 0) throw new Error('boş');
    } catch {
      this.earthquakes = this.generateSimulatedEarthquakes();
    }

    // Konuma göre mesafe hesapla ve önceliklendir: Yakın (≤200km) → Türkiye geneli → Dünya
    for (const eq of this.earthquakes) {
      eq.distanceKm = (eq.lat && eq.lon) ? Math.round(this.haversineKm(this.userLoc.lat, this.userLoc.lon, eq.lat, eq.lon)) : null;
      eq.tier = (eq.distanceKm !== null && eq.distanceKm <= this.NEAR_RADIUS_KM) ? 'near'
              : (this.isInTurkey(eq.lat, eq.lon) ? 'tr' : 'world');
    }
    const tierOrder = { near: 0, tr: 1, world: 2 };
    this.earthquakes.sort((a, b) => (tierOrder[a.tier] - tierOrder[b.tier]) || (b.time - a.time));

    this.checkSirenThreshold();

    let html = '';

    const latest = this.earthquakes[0];
    if (latest) {
      const mag = parseFloat(latest.mag);
      const severity = mag >= 5 ? 'high' : mag >= 4 ? 'mid' : 'low';
      html += `
        <div class="emergency-card">
          <div class="emergency-title">🚨 SON DEPREM</div>
          <div class="emergency-time">${latest.date || 'Bilinmiyor'} | ${latest.title || latest.lokasyon || 'Bilinmiyor'}</div>
          <div style="display:flex;align-items:center;gap:12px;margin-top:10px">
            <div class="eq-mag ${severity}" style="width:56px;height:56px;font-size:20px">${mag}</div>
            <div>
              <div style="font-weight:700;font-size:16px">${latest.title || latest.lokasyon}</div>
              <div style="font-size:13px;color:var(--text2)">Derinlik: ${latest.depth || '?'} km</div>
            </div>
          </div>
        </div>
      `;
    }

    html += `
      <div class="card" style="margin-bottom:12px">
        <div style="font-weight:700;margin-bottom:10px">✅ Güvendeyim Mesajı</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:10px;line-height:1.6">
          Durumunuzu bildirin. <b>Sadece afet verileri</b> senkronize cihazlara iletilir.<br>
          <span style="font-size:11px;color:var(--text3)">Finansal veriler ve konum paylaşılmaz.</span>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-success btn-sm" style="width:auto;background:var(--success);color:white" onclick="app.Afet.sendSafeStatus('safe')">✅ Güvendeyim</button>
          <button class="btn btn-danger btn-sm" style="width:auto" onclick="app.Afet.sendSafeStatus('help')">🆘 Yardım İhtiyacım Var</button>
        </div>
        <div style="margin-top:12px">
          <div style="font-size:12px;color:var(--text2);margin-bottom:6px">Güvende olanlar (senkronize cihazlar):</div>
          <div id="safe-people-afet" class="safe-people-list"></div>
        </div>
      </div>
    `;

    html += '<div style="font-weight:700;margin-bottom:10px">📋 Son Depremler <span style="font-weight:400;font-size:11px;color:var(--text3)">(yakın → Türkiye → dünya sıralı)</span></div>';
    const tierLabel = { near: '📍 Yakın', tr: '🇹🇷 Türkiye', world: '🌍 Dünya' };
    const tierColor = { near: 'var(--danger)', tr: 'var(--warning)', world: 'var(--text3)' };
    for (const eq of this.earthquakes.slice(0, 15)) {
      const mag = parseFloat(eq.mag);
      const severity = mag >= 5.5 ? 'high' : mag >= 4.5 ? 'mid' : 'low';
      const distText = eq.distanceKm !== null ? `${eq.distanceKm} km` : '';
      html += `
        <div class="eq-item" onclick="app.Afet.showOnMap('${eq.lat}', '${eq.lon}', '${(eq.title||'').replace(/'/g,"")}')">
          <div class="eq-mag ${severity}">${mag}</div>
          <div class="eq-info">
            <div class="eq-location">${eq.title || 'Bilinmiyor'}</div>
            <div class="eq-detail">
              <span style="color:${tierColor[eq.tier]};font-weight:600">${tierLabel[eq.tier]}</span>
              ${distText ? ' · ' + distText : ''} · Derinlik: ${eq.depth ? Math.round(eq.depth) : '?'} km
              <br><span style="font-size:10px;opacity:0.7">${eq.source || ''}</span>
            </div>
          </div>
          <div class="eq-time">${eq.date || '?'}</div>
        </div>
      `;
    }

    html += '<div style="font-weight:700;margin:16px 0 10px">🗺️ Deprem Haritası</div>';
    html += '<div id="map-container" style="height:350px;border-radius:12px;overflow:hidden;border:1px solid var(--border)"></div>';

    container.innerHTML = html;
    this.initMap();
    this.renderSafePeople();
  }

  checkSirenThreshold() {
    for (const eq of this.earthquakes) {
      const mag = parseFloat(eq.mag);
      const id = eq.id || eq.earthquake_id || eq.date + '_' + (eq.title || eq.lokasyon);
      const threshold = eq.tier === 'near' ? this.SIREN_THRESHOLD_NEAR : this.SIREN_THRESHOLD_FAR;
      // Uzak/dünya depremlerinde sadece Türkiye'yi de etkileyebilecek büyüklükte olanları say (aksi halde her gün dünyanın bir yerinde M5.5+ oluyor)
      const relevant = eq.tier !== 'world' || mag >= this.SIREN_THRESHOLD_FAR;
      if (mag >= threshold && relevant && !this.alertedIds.has(id)) {
        this.alertedIds.add(id);
        DataStore.set('afet_alerted_ids', Array.from(this.alertedIds).slice(-200));
        this.triggerSirenAlert(eq, mag);
        break; // aynı render'da sadece en öncelikli depremi tetikle
      }
    }
  }

  triggerSirenAlert(eq, mag) {
    app.siren.start();

    if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);

    const existing = document.getElementById('siren-alert-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'siren-alert-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:linear-gradient(160deg,#7f1d1d,#450a0a);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px;gap:16px;animation:pulse 1s infinite';
    overlay.innerHTML = `
      <div style="font-size:64px;animation:pulse 0.6s infinite">🚨</div>
      <div style="font-size:24px;font-weight:800;color:white;letter-spacing:0.5px">BÜYÜK DEPREM UYARISI</div>
      <div style="font-size:48px;font-weight:800;color:white">${mag}</div>
      <div style="font-size:16px;color:rgba(255,255,255,0.9)">${eq.title || eq.lokasyon || 'Konum bilinmiyor'}</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.7);max-width:320px;line-height:1.6">Bu bir simülasyon/eğlence uygulamasıdır ancak gösterilen deprem verisi gerçek zamanlı kaynaktan alınmıştır. Gerekiyorsa resmi AFAD kanallarını takip edin.</div>
      <button class="btn" style="max-width:280px;background:white;color:#7f1d1d;font-weight:800;margin-top:8px" onclick="app.Afet.dismissSirenAlert()">🔇 Sireni Sustur</button>
    `;
    document.body.appendChild(overlay);
  }

  dismissSirenAlert() {
    app.siren.stop();
    const overlay = document.getElementById('siren-alert-overlay');
    if (overlay) overlay.remove();
  }

  generateSimulatedEarthquakes() {
    const locations = [
      { title: 'İzmir - Karabağlar', lat: 38.42, lon: 27.14, mag: 4.2, depth: 8.5 },
      { title: 'Manisa - Şehzadeler', lat: 38.61, lon: 27.44, mag: 3.8, depth: 12.3 },
      { title: 'Muğla - Bodrum', lat: 37.03, lon: 27.43, mag: 3.5, depth: 6.2 },
      { title: 'Van - Merkez', lat: 38.50, lon: 43.37, mag: 3.2, depth: 15.0 },
      { title: 'Erzincan - Merkez', lat: 39.75, lon: 39.49, mag: 3.9, depth: 9.8 }
    ];
    return locations.map((l, i) => ({
      ...l,
      id: 'sim_' + i,
      time: Date.now() - i * 3600000,
      date: new Date(Date.now() - i * 3600000).toLocaleString('tr-TR'),
      source: 'Simülasyon (çevrimdışı)'
    }));
  }

  initMap() {
    setTimeout(() => {
      const container = document.getElementById('map-container');
      if (!container || !window.L) return;
      const center = this.userLoc ? [this.userLoc.lat, this.userLoc.lon] : [39.0, 35.0];
      this.map = L.map(container).setView(center, this.userLoc && !this.userLoc.fallback ? 8 : 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(this.map);

      if (this.userLoc && !this.userLoc.fallback) {
        L.marker(center).addTo(this.map).bindPopup('📍 Konumunuz');
      }

      for (const eq of this.earthquakes) {
        if (eq.lat && eq.lon) {
          const mag = parseFloat(eq.mag);
          const color = mag >= 5.5 ? '#ef4444' : mag >= 4.5 ? '#f59e0b' : '#10b981';
          const radius = mag * 3;
          L.circleMarker([eq.lat, eq.lon], { radius, color, fillColor: color, fillOpacity: 0.5 })
            .addTo(this.map).bindPopup(`<b>${eq.title}</b><br>Şiddet: ${eq.mag}<br>Derinlik: ${eq.depth || '?'} km<br>${eq.distanceKm !== null ? eq.distanceKm + ' km uzaklıkta' : ''}`);
        }
      }
    }, 500);
  }

  showOnMap(lat, lon, title) {
    if (this.map && lat && lon) {
      this.map.setView([parseFloat(lat), parseFloat(lon)], 10);
    }
  }

  sendSafeStatus(status) {
    const safePeople = DataStore.get('safe_people', []);
    const me = { name: 'Ben', device: app.sync.getDeviceName(), status, time: Date.now(), location: 'Türkiye' };
    const existing = safePeople.find(p => p.name === 'Ben');
    if (existing) Object.assign(existing, me);
    else safePeople.push(me);
    DataStore.set('safe_people', safePeople);
    app.sync.broadcast('safe_people', safePeople);

    const msg = status === 'safe' ? '✅ Güvendeyim mesajı gönderildi' : '🆘 Yardım talebi gönderildi';
    app.toast(msg, status === 'safe' ? 'success' : 'error');
    this.renderSafePeople();
  }

  renderSafePeople() {
    const container = document.getElementById('safe-people-afet');
    if (!container) return;
    const people = DataStore.get('safe_people', []);
    let html = '';
    for (const p of people) {
      const time = new Date(p.time).toLocaleTimeString('tr-TR');
      html += `<div class="safe-person">
        <span class="status-dot" style="background:${p.status==='help'?'var(--danger)':'var(--success)'};box-shadow:0 0 8px ${p.status==='help'?'var(--danger)':'var(--success)'}"></span>
        <span>${p.name} (${p.device}) - ${time}</span>
      </div>`;
    }
    container.innerHTML = html || '<span style="color:var(--text3);font-size:12px">Henüz durum bildirimi yok.</span>';
  }
}

// ============================================
// YOL (RADAR/TRAFİK) MODÜLÜ
// ============================================
class YolModule {
  // Sabit/donuk göstermemek için her render'da havuzdan rastgele bir alt küme seçilir.
  // NOT: Bu bir simülasyondur - gerçek zamanlı, doğrulanmış radar/kaza verisi sağlayan
  // ücretsiz/açık bir kaynak yok (TomTom/HERE/Waze gibi servisler ücretli API anahtarı ister).
  static RADAR_POOL = [
    'Ankara - İstanbul (E-5): Kocaeli geçişinde sabit radar aktif. Hız limiti 120 km/s.',
    'İzmir - Aydın (O-31): Turgutlu mevkisinde mobil radar aracı görüldü.',
    'Antalya - Konya: Seydişehir çıkışında trafik kontrolü var.',
    'İstanbul - Edirne (TEM): Silivri girişinde ortalama hız denetimi bölgesi.',
    'Bursa - Yalova: Orhangazi kavşağında mobil radar.',
    'Adana - Mersin: Tarsus çıkışında sabit hız kontrol noktası.',
    'Samsun - Ordu (D-010): Ünye mevkisinde denetim ekibi.',
    'Ankara Çevre Yolu: Etimesgut kavşağında ortalama hız sistemi aktif.'
  ];
  static ROUTE_POOL = [
    { from: 'İstanbul', to: 'Ankara', alt: 'Kuzey Marmara Otoyolu + Ankara çevre yolu', gain: 15, time: '4 sa 15 dk', normal: '5 sa', save: 85 },
    { from: 'İzmir', to: 'Antalya', alt: 'D-400 yerine Aydın-Denizli otoyol bağlantısı', gain: 10, time: '4 sa 40 dk', normal: '5 sa 10 dk', save: 60 },
    { from: 'Ankara', to: 'Konya', alt: 'Otoyol tam güzergahı (şehir içi geçişten kaçının)', gain: 20, time: '2 sa 30 dk', normal: '3 sa 10 dk', save: 45 },
    { from: 'Bursa', to: 'İstanbul', alt: 'Osmangazi Köprüsü güzergahı', gain: 25, time: '1 sa 40 dk', normal: '2 sa 15 dk', save: 120 }
  ];

  render() {
    const container = document.getElementById('yol-content');
    const radarSample = [...YolModule.RADAR_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
    const route = YolModule.ROUTE_POOL[Math.floor(Math.random() * YolModule.ROUTE_POOL.length)];

    container.innerHTML = `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-2));display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 16px rgba(102,126,234,0.3)">🛰️</div>
          <div>
            <div style="font-weight:700">Radar & Trafik İstihbaratı</div>
            <div style="font-size:12px;color:var(--text2)">Simülasyon modu</div>
          </div>
        </div>
        <div style="font-size:13px;color:var(--text2);line-height:1.6">
          Bu modül, trafik polisi radar konumları, yol durumu ve alternatif güzergah önerileri sunar.
          <b>Not:</b> Gerçek zamanlı, ücretsiz ve doğrulanmış bir radar/trafik veri kaynağı bulunmadığından tüm içerik <b>topluluk esintili simülasyondur</b>, gerçek sürüş kararları için resmi trafik uygulamalarını (örn. Yandex Navi, Google Haritalar trafik katmanı) kullanın.
        </div>
      </div>

      <div class="spy-card">
        <div class="spy-header">
          <div class="spy-icon">📡</div>
          <div>
            <div class="spy-title">Radar Bildirimleri (simülasyon)</div>
            <div class="spy-confidence">Son güncelleme: ${new Date().toLocaleTimeString('tr-TR')}</div>
          </div>
        </div>
        <div class="spy-prediction">
          ${radarSample.map(r => '• ' + r).join('<br>')}
        </div>
        <div class="spy-sources">Kaynak: Simülasyon havuzu (gerçek veri değildir)</div>
      </div>

      <div class="card" style="margin-bottom:12px">
        <div style="font-weight:700;margin-bottom:10px">🗺️ Trafik Haritası</div>
        <div id="traffic-map" style="height:300px;border-radius:12px;border:1px solid var(--border);overflow:hidden"></div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <span class="badge" style="background:var(--danger-dim);color:var(--danger)">🚨 Yoğun Trafik</span>
          <span class="badge" style="background:var(--warning-dim);color:var(--warning)">⚠️ Yol Çalışması</span>
          <span class="badge" style="background:var(--success-dim);color:var(--success)">✅ Açık</span>
          <span class="badge" style="background:var(--primary-glow);color:var(--primary)">📡 Radar</span>
        </div>
      </div>

      <div class="card">
        <div style="font-weight:700;margin-bottom:10px">🧠 Güzergah Önerisi (simülasyon)</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.6">
          <b>${route.from} → ${route.to}:</b> ${route.alt} yaklaşık %${route.gain} daha hızlı.<br>
          <b>Tahmini süre:</b> ${route.time} (Normal: ${route.normal})<br>
          <b>Yakıt tasarrufu:</b> ~₺${route.save}
        </div>
      </div>
    `;
    setTimeout(() => this.initTrafficMap(), 500);
  }

  initTrafficMap() {
    const container = document.getElementById('traffic-map');
    if (!container || !window.L) return;
    const map = L.map(container).setView([39.5, 32.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const radars = [
      { lat: 40.78, lng: 29.95, type: 'radar', title: 'Kocaeli - Sabit Radar' },
      { lat: 38.62, lng: 27.43, type: 'radar', title: 'Manisa - Mobil Radar' },
      { lat: 39.93, lng: 32.85, type: 'control', title: 'Ankara - Trafik Kontrol' },
      { lat: 41.01, lng: 28.98, type: 'jam', title: 'İstanbul - Yoğun Trafik' }
    ];

    radars.forEach(r => {
      const color = r.type === 'radar' ? '#ef4444' : r.type === 'control' ? '#f59e0b' : '#3b82f6';
      L.circleMarker([r.lat, r.lng], { radius: 10, color, fillColor: color, fillOpacity: 0.6 })
        .addTo(map).bindPopup(r.title);
    });
  }
}

// ============================================
// EKONOMİ TAKVİMİ MODÜLÜ
// ============================================
class EkonomiModule {
  render() {
    const container = document.getElementById('ekonomi-content');
    const events = [
      { time: '10:00', flag: '🇹🇷', title: 'TÜİK - Enflasyon Verisi (TÜFE)', forecast: 'Beklenti: %2,45', impact: 'high' },
      { time: '10:00', flag: '🇹🇷', title: 'TCMB - Faiz Kararı', forecast: 'Beklenti: %50 sabit', impact: 'high' },
      { time: '14:30', flag: '🇺🇸', title: 'ABD - İstihdam Verisi (NFP)', forecast: 'Beklenti: 185K', impact: 'high' },
      { time: '16:00', flag: '🇪🇺', title: 'Euro Bölgesi - PMI', forecast: 'Beklenti: 48,5', impact: 'mid' },
      { time: '09:00', flag: '🇹🇷', title: 'BIST Açılış', forecast: 'Beklenti: 9.850', impact: 'mid' },
      { time: '11:00', flag: '🇨🇳', title: 'Çin - Ticaret Dengesi', forecast: 'Beklenti: 75,2B $', impact: 'low' }
    ];

    let html = '<div style="font-weight:700;margin-bottom:12px;font-size:16px">📅 Ekonomik Takvim</div>';
    for (const ev of events) {
      html += `
        <div class="eco-item">
          <div class="eco-time">${ev.time}</div>
          <div class="eco-flag">${ev.flag}</div>
          <div class="eco-content">
            <div class="eco-title">${ev.title}</div>
            <div class="eco-forecast">${ev.forecast}</div>
          </div>
          <div class="eco-impact ${ev.impact}" title="Etki: ${ev.impact === 'high' ? 'Yüksek' : ev.impact === 'mid' ? 'Orta' : 'Düşük'}"></div>
        </div>
      `;
    }

    html += `
      <div class="card" style="margin-top:12px">
        <div style="font-weight:700;margin-bottom:10px">🧠 AI Ekonomi Öngörüsü</div>
        <div style="font-size:13px;color:var(--text);line-height:1.7;background:var(--bg3);padding:14px;border-radius:10px;border-left:3px solid var(--primary)">
          <b>Haftalık BIST Tahmini:</b> Enflasyon verisi beklentileri aşarsa endeks %2-3 primli açılabilir.<br><br>
          <b>Döviz Tahmini:</b> USD/TRY kuru 35,20-35,80 bandında dalgalanma bekleniyor.
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:10px;font-style:italic">Güven: %82 | Son güncelleme: ${new Date().toLocaleString('tr-TR')}</div>
      </div>
    `;

    container.innerHTML = html;
  }
}

// ============================================
// TEMETTÜ MODÜLÜ
// ============================================
class TemettuModule {
  render() {
    const container = document.getElementById('temettu-content');
    const dividends = [
      { symbol: 'GARAN', date: '2026-08-15', amount: 1.85, type: 'Nakit' },
      { symbol: 'ISCTR', date: '2026-08-20', amount: 0.95, type: 'Nakit' },
      { symbol: 'AKBNK', date: '2026-08-25', amount: 1.20, type: 'Nakit' },
      { symbol: 'THYAO', date: '2026-09-05', amount: 2.50, type: 'Nakit' },
      { symbol: 'KCHOL', date: '2026-09-10', amount: 3.15, type: 'Nakit' },
      { symbol: 'BIMAS', date: '2026-09-15', amount: 4.20, type: 'Nakit' }
    ];

    const portfolio = DataStore.get('portfolio', []);
    let myTotal = 0;
    let html = '<div style="font-weight:700;margin-bottom:12px;font-size:16px">💰 Yaklaşan Temettüler</div>';

    for (const d of dividends) {
      const myShares = portfolio.find(p => p.symbol === d.symbol);
      const myAmount = myShares ? (myShares.lot * d.amount) : 0;
      myTotal += myAmount;

      html += `
        <div class="div-item">
          <div>
            <div class="div-symbol">${d.symbol}</div>
            <div class="div-date">📅 ${d.date} | ${d.type}</div>
          </div>
          <div style="text-align:right">
            <div class="div-amount">₺${d.amount.toFixed(2)} / lot</div>
            ${myShares ? `<div style="font-size:12px;color:var(--success);font-weight:600">Siz: +₺${myAmount.toFixed(2)}</div>` : ''}
          </div>
        </div>
      `;
    }

    html += `
      <div class="card" style="margin-top:12px;text-align:center">
        <div style="font-size:13px;color:var(--text2)">Portföyünüzden Beklenen Toplam</div>
        <div style="font-size:32px;font-weight:700;color:var(--success);margin-top:4px">₺${myTotal.toFixed(2)}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:8px">🔒 Bu cihaza özel veridir.</div>
      </div>
    `;

    container.innerHTML = html;
  }
}

// ============================================
// DÖVİZ MODÜLÜ
// ============================================
class DovizModule {
  render() {
    const container = document.getElementById('doviz-content');
    const currencies = [
      { code: 'USD', name: 'Amerikan Doları', flag: '🇺🇸' },
      { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
      { code: 'GBP', name: 'İngiliz Sterlini', flag: '🇬🇧' },
      { code: 'CHF', name: 'İsviçre Frangı', flag: '🇨🇭' },
      { code: 'JPY', name: 'Japon Yeni', flag: '🇯🇵' },
      { code: 'CAD', name: 'Kanada Doları', flag: '🇨🇦' },
      { code: 'AUD', name: 'Avustralya Doları', flag: '🇦🇺' },
      { code: 'CNY', name: 'Çin Yuanı', flag: '🇨🇳' }
    ];

    let html = '<div style="font-weight:700;margin-bottom:12px;font-size:16px">💱 Döviz Kurları</div>';
    html += '<div class="card" style="padding:0;overflow:hidden">';
    for (const c of currencies) {
      const rate = app.data.getPrice(c.code);
      const change = app.data.getChange(c.code);
      const history = app.data.getHistory(c.code, 20);
      html += `
        <div class="currency-row">
          <div style="display:flex;align-items:center;gap:10px;flex:1">
            <span style="font-size:24px">${c.flag}</span>
            <div>
              <div class="currency-name">${c.name}</div>
              <div class="currency-code">${c.code}/TRY</div>
            </div>
          </div>
          <div style="width:60px;height:32px;margin:0 8px">
            <canvas id="doviz-spark-${c.code}" style="width:100%;height:100%"></canvas>
          </div>
          <div style="text-align:right;min-width:80px">
            <div class="currency-rate">₺${rate.toFixed(c.code === 'JPY' ? 4 : 2)}</div>
            <div class="currency-change" style="color:${change>=0?'var(--success)':'var(--danger)'}">${change>=0?'▲':'▼'} %${Math.abs(change).toFixed(2)}</div>
          </div>
        </div>
      `;
    }
    html += '</div>';

    html += `
      <div class="card" style="margin-top:12px">
        <div style="font-weight:700;margin-bottom:10px">🧠 AI Döviz Tahmini</div>
        <div style="font-size:13px;color:var(--text);line-height:1.7;background:var(--bg3);padding:14px;border-radius:10px;border-left:3px solid var(--primary)">
          <b>USD/TRY:</b> Kısa vadede 35,20-35,80 bandı bekleniyor.<br>
          <b>EUR/TRY:</b> Euro bölgesi PMI verileri olumsuz gelirse 38,50 seviyesi test edilebilir.<br>
          <b>Altın/Döviz:</b> Gram altın 2.850-2.950 bandında hareket edecek.
        </div>
      </div>
    `;

    container.innerHTML = html;

    setTimeout(() => {
      for (const c of currencies) {
        const history = app.data.getHistory(c.code, 20);
        const change = app.data.getChange(c.code);
        const color = change >= 0 ? '#10b981' : '#ef4444';
        ChartEngine.drawSparkline('doviz-spark-' + c.code, history, color);
      }
    }, 50);
  }

  updateLive() {
    if (app.currentTab === 'doviz') this.render();
  }
}

// ============================================
// HAVA DURUMU MODÜLÜ
// ============================================
class HavaModule {
  async render() {
    const container = document.getElementById('hava-content');
    container.innerHTML = '<div class="skeleton" style="height:150px;margin-bottom:12px"></div>';

    let lat = 41.0, lon = 29.0;
    const pos = await LocationConsent.request('hava');
    if (pos) { lat = pos.lat; lon = pos.lon; }

    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=5`);
      const data = await res.json();
      this.renderWeather(data, container);
    } catch {
      this.renderWeather(null, container, true);
    }
  }

  renderWeather(data, container, isSimulated = false) {
    const wmo = {
      0: '☀️ Açık', 1: '🌤️ Az Bulutlu', 2: '⛅ Parçalı Bulutlu', 3: '☁️ Bulutlu',
      45: '🌫️ Sisli', 48: '🌫️ Kuru Sis', 51: '🌦️ Hafif Yağmur', 53: '🌧️ Yağmur',
      55: '🌧️ Şiddetli Yağmur', 61: '🌧️ Hafif Yağış', 63: '🌧️ Yağış', 65: '🌧️ Şiddetli',
      71: '🌨️ Hafif Kar', 73: '🌨️ Kar', 75: '🌨️ Yoğun Kar', 95: '⛈️ Fırtına'
    };

    let current = { temp: 28, humidity: 55, wind: 12, pressure: 1013, code: 1 };
    let daily = [];

    if (data && data.current) {
      current = {
        temp: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        wind: data.current.wind_speed_10m,
        pressure: data.current.pressure_msl,
        code: data.current.weather_code
      };
      if (data.daily) {
        for (let i = 0; i < 5; i++) {
          daily.push({
            day: new Date(data.daily.time[i]).toLocaleDateString('tr-TR', { weekday: 'short' }),
            max: data.daily.temperature_2m_max[i],
            min: data.daily.temperature_2m_min[i],
            code: data.daily.weather_code[i]
          });
        }
      }
    } else {
      daily = [
        { day: 'Bugün', max: 30, min: 22, code: 1 },
        { day: 'Yarın', max: 32, min: 23, code: 2 },
        { day: 'Çar', max: 29, min: 21, code: 51 },
        { day: 'Per', max: 27, min: 20, code: 3 },
        { day: 'Cum', max: 31, min: 22, code: 0 }
      ];
    }

    let html = `
      <div class="card" style="text-align:center">
        <div style="font-size:13px;color:var(--text2);margin-bottom:8px">${isSimulated ? '📍 Konum alınamadı (Simülasyon)' : '📍 Mevcut Konum'}</div>
        <div style="font-size:64px;margin:10px 0">${wmo[current.code] || '☀️'}</div>
        <div style="font-size:48px;font-weight:200">${Math.round(current.temp)}°C</div>
        <div style="font-size:16px;color:var(--text2);margin-bottom:16px">${wmo[current.code] || 'Açık'}</div>
        <div class="weather-grid">
          <div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">Nem</div><div style="font-size:14px;font-weight:700">%${current.humidity}</div></div>
          <div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">Rüzgar</div><div style="font-size:14px;font-weight:700">${current.wind} km/s</div></div>
          <div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">Basınç</div><div style="font-size:14px;font-weight:700">${Math.round(current.pressure)} hPa</div></div>
          <div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">Hissedilen</div><div style="font-size:14px;font-weight:700">${Math.round(current.temp + (current.humidity > 60 ? 2 : 0))}°C</div></div>
        </div>
      </div>
    `;

    html += '<div style="font-weight:700;margin:16px 0 10px;font-size:16px">📅 5 Günlük Tahmin</div>';
    html += '<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:8px">';
    for (const d of daily) {
      html += `
        <div class="card" style="min-width:80px;text-align:center;padding:14px 8px">
          <div style="font-size:11px;color:var(--text2);font-weight:600">${d.day}</div>
          <div style="font-size:28px;margin:8px 0">${wmo[d.code]?.split(' ')[0] || '☀️'}</div>
          <div style="font-size:14px;font-weight:700">${Math.round(d.max)}°</div>
          <div style="font-size:12px;color:var(--text3)">${Math.round(d.min)}°</div>
        </div>
      `;
    }
    html += '</div>';

    container.innerHTML = html;
  }
}

// ============================================
// AYARLAR MODÜLÜ (Güvenlik Odaklı)
// ============================================
class AyarlarModule {
  render() {
    const container = document.getElementById('ayarlar-content');
    const roomCode = localStorage.getItem('syf_room') || 'Bağlı değil';
    const activationKey = app.activation ? app.activation.activationKey : 'N/A';
    const deviceId = app.activation ? app.activation.deviceId : 'N/A';
    const approvedDevices = DataStore.get('approved_devices', []);
    const transferLocked = app.activation ? app.activation.isTransferLocked() : true;

    container.innerHTML = `
      <div class="card">
        <div class="settings-group">
          <div class="settings-group-title">🔐 Aktivasyon & Güvenlik</div>
          <div class="settings-row">
            <div>
              <div class="settings-label">Aktivasyon Kodunuz</div>
              <div class="settings-desc">Bu kodu başkalarıyla paylaşmayın</div>
            </div>
            <div style="font-family:monospace;font-size:14px;color:var(--primary);font-weight:700">${activationKey}</div>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-label">Cihaz ID</div>
              <div class="settings-desc">Bu cihazın benzersiz kimliği</div>
            </div>
            <div style="font-family:monospace;font-size:12px;color:var(--text2)">${deviceId}</div>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-label">Transfer Kilidi</div>
              <div class="settings-desc">Başkasına yollama engeli</div>
            </div>
            <div class="toggle ${transferLocked ? 'on' : ''}" onclick="app.Ayarlar.toggleTransferLock()"></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="settings-group">
          <div class="settings-group-title">📤 Transfer Onay Kodu</div>
          <div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:12px">
            Başka bir cihaz uygulamayı kullanmak istediğinde, transfer onay kodu oluşturun. 
            Yeni cihaz bu kodu girmek zorundadır.
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" style="width:auto" onclick="app.Ayarlar.generateTransferCode()">🔢 Onay Kodu Oluştur</button>
            <button class="btn btn-secondary btn-sm" style="width:auto" onclick="app.Ayarlar.showApprovedDevices()">📱 Onaylı Cihazlar (${approvedDevices.length})</button>
          </div>
          <div id="transfer-code-display" style="margin-top:10px;font-family:monospace;font-size:18px;color:var(--warning);font-weight:700"></div>
        </div>
      </div>

      <div class="card">
        <div class="settings-group">
          <div class="settings-group-title">🔗 Cihaz Senkronizasyonu (Sadece Afet)</div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:10px">
            ⚠️ Sadece afet/deprem verileri senkronize edilir. Finansal veriler ve konum paylaşılmaz.
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-label">Oda Kodu</div>
              <div class="settings-desc">Tüm cihazları senkronize et</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <span style="font-family:monospace;font-size:14px;color:var(--primary);font-weight:700">${roomCode}</span>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <input type="text" class="input" id="sync-room-input" placeholder="6 haneli oda kodu" maxlength="6" style="flex:1;margin:0;text-transform:uppercase">
            <button class="btn btn-primary btn-sm" style="width:auto" onclick="app.Ayarlar.joinRoom()">🔗 Bağlan</button>
          </div>
          <button class="btn btn-secondary btn-sm" style="width:auto;margin-top:8px" onclick="app.Ayarlar.createRoom()">➕ Yeni Oda Oluştur</button>
          <button class="btn btn-danger btn-sm" style="width:auto;margin-top:8px" onclick="app.Ayarlar.leaveRoom()">❌ Bağlantıyı Kes</button>
        </div>
      </div>

      <div class="card">
        <div class="settings-group">
          <div class="settings-group-title">🎨 Görünüm</div>
          <div class="settings-row">
            <div>
              <div class="settings-label">Karanlık Mod</div>
              <div class="settings-desc">Sistem temasını değiştir</div>
            </div>
            <div class="toggle ${document.documentElement.getAttribute('data-theme') === 'dark' ? 'on' : ''}" onclick="app.Ayarlar.toggleTheme()"></div>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-label">Kompakt Yazı</div>
              <div class="settings-desc">Daha sıkışık görünüm</div>
            </div>
            <div class="toggle ${document.documentElement.getAttribute('data-font') === 'compact' ? 'on' : ''}" onclick="app.Ayarlar.toggleFont()"></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="settings-group">
          <div class="settings-group-title">🔐 PIN & Biyometrik</div>
          <div class="settings-row">
            <div>
              <div class="settings-label">PIN Değiştir</div>
              <div class="settings-desc">Giriş PIN kodunuzu güncelleyin</div>
            </div>
            <button class="btn btn-secondary btn-sm" style="width:auto" onclick="app.Ayarlar.changePin()">Değiştir</button>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-label">Biyometrik Giriş</div>
              <div class="settings-desc">Face ID / Parmak izi</div>
            </div>
            <div class="toggle ${DataStore.get('biometric_enabled', false) ? 'on' : ''}" onclick="app.Ayarlar.toggleBiometric()"></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="settings-group">
          <div class="settings-group-title">⚠️ Yasal</div>
          <div style="font-size:13px;color:var(--text2);line-height:1.6;padding:10px 0">
            ${DISCLAIMER}
          </div>
          <div style="font-size:12px;color:var(--text3);margin-top:10px;line-height:1.6">
            Sürüm: ${APP_VERSION} | Derleme: ${BUILD_DATE}<br>
            Cihaz ID: ${deviceId}<br>
            Senkronizasyon: Sadece afet verileri
          </div>
          <button class="btn btn-danger btn-sm" style="width:auto;margin-top:12px" onclick="app.Ayarlar.resetData()">🗑️ Tüm Verileri Sıfırla</button>
        </div>
      </div>
    `;
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    DataStore.set('theme', next);
    this.render();
  }

  toggleFont() {
    const current = document.documentElement.getAttribute('data-font');
    const next = current === 'compact' ? 'normal' : 'compact';
    document.documentElement.setAttribute('data-font', next);
    DataStore.set('font', next);
    this.render();
  }

  generateTransferCode() {
    if (!app.activation) return;
    const code = app.activation.generateTransferCode();
    if (code) {
      document.getElementById('transfer-code-display').textContent = 'Onay Kodu: ' + code;
      app.toast('🔢 Transfer onay kodu oluşturuldu: ' + code, 'success');
    }
  }

  showApprovedDevices() {
    const devices = DataStore.get('approved_devices', []);
    let html = '<div style="font-size:13px;color:var(--text2);line-height:1.8">';
    if (devices.length === 0) {
      html += 'Henüz onaylı cihaz yok.';
    } else {
      html += '<ul style="margin:0;padding-left:18px">';
      for (const d of devices) {
        const date = new Date(d.approvedAt).toLocaleString('tr-TR');
        html += `<li><b>${d.name}</b> (${d.id})<br><span style="font-size:11px;color:var(--text3)">Onaylanma: ${date}</span></li>`;
      }
      html += '</ul>';
    }
    html += '</div>';
    ModalSystem.open('📱 Onaylı Cihazlar', html, [{ text: 'Kapat', class: 'btn-secondary', onclick: 'ModalSystem.close()' }]);
  }

  toggleTransferLock() {
    if (!app.activation) return;
    if (app.activation.isTransferLocked()) {
      app.activation.unlockTransfer();
      app.toast('🔓 Transfer kilidi açıldı', 'warning');
    } else {
      app.activation.lockTransfer();
      app.toast('🔒 Transfer kilidi aktif', 'success');
    }
    this.render();
  }

  joinRoom() {
    const code = document.getElementById('sync-room-input').value.trim().toUpperCase();
    if (code.length < 4) { app.toast('❌ Geçerli bir oda kodu girin', 'error'); return; }
    app.sync.joinRoom(code);
    this.render();
  }

  createRoom() {
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    app.sync.joinRoom(code);
    this.render();
    app.toast('✅ Yeni oda oluşturuldu: ' + code, 'success');
  }

  leaveRoom() {
    app.sync.leaveRoom();
    this.render();
  }

  changePin() {
    const newPin = prompt('Yeni PIN (4-6 hane):');
    if (newPin && /^\d{4,6}$/.test(newPin)) {
      DataStore.set('pin', newPin);
      app.toast('🔐 PIN güncellendi', 'success');
    } else {
      app.toast('❌ Geçersiz PIN formatı', 'error');
    }
  }

  toggleBiometric() {
    const enabled = !DataStore.get('biometric_enabled', false);
    DataStore.set('biometric_enabled', enabled);
    app.toast(enabled ? '🔓 Biyometrik giriş aktif' : '🔒 Biyometrik giriş devre dışı', 'info');
    this.render();
  }

  resetData() {
    if (!confirm('⚠️ TÜM verileriniz silinecek! Emin misiniz?')) return;
    const keys = Object.keys(localStorage).filter(k => k.startsWith('syf_'));
    keys.forEach(k => localStorage.removeItem(k));
    app.toast('🗑️ Tüm veriler sıfırlandı', 'warning');
    setTimeout(() => location.reload(), 1000);
  }
}

// ============================================
// ANA UYGULAMA SINIFI v3.1
// ============================================
class App {
  constructor() {
    this.currentTab = 'piyasa';
    this.toast = new ToastSystem();
    this.activation = new ActivationManager();
    this.pin = new PinManager();
    this.sync = new SyncEngine();
    this.data = new VirtualDataEngine();
    this.siren = new SirenEngine();
    this.ocr = new OCRModule();
    this.kasef = new KasefAI();
    this.Piyasa = new PiyasaModule();
    this.Kasam = new KasamModule();
    this.Planlar = PlanlarModule;
    this.Afet = new AfetModule();
    this.Yol = new YolModule();
    this.Ekonomi = new EkonomiModule();
    this.Temettu = new TemettuModule();
    this.Doviz = new DovizModule();
    this.Hava = new HavaModule();
    this.Ayarlar = new AyarlarModule();
  }

  async init() {
    // Tema yükle
    const savedTheme = DataStore.get('theme', 'dark');
    document.documentElement.setAttribute('data-theme', savedTheme);
    const savedFont = DataStore.get('font', 'normal');
    document.documentElement.setAttribute('data-font', savedFont);

    // Service Worker kaydet (dosya adı düzeltildi: sw.js)
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('./sw.js');
        console.log('SW kaydedildi');
      } catch(e) { console.log('SW kaydedilemedi:', e); }
    }

    // Varsayılan verileri ayarla
    if (!DataStore.get('watchlist')) {
      DataStore.set('watchlist', ['BIST100', 'ASELS', 'THYAO', 'GARAN', 'BTC', 'GRAM_ALTIN', 'USD']);
    }
    if (!DataStore.get('portfolio')) DataStore.set('portfolio', [
      { symbol: 'ASELS', lot: 100, avgPrice: 42.50, addedAt: Date.now() - 86400000 * 30 },
      { symbol: 'THYAO', lot: 50, avgPrice: 250.00, addedAt: Date.now() - 86400000 * 15 },
      { symbol: 'GARAN', lot: 200, avgPrice: 105.00, addedAt: Date.now() - 86400000 * 60 },
      { symbol: 'GRAM_ALTIN', lot: 10, avgPrice: 2700.00, addedAt: Date.now() - 86400000 * 10 }
    ]);
    if (!DataStore.get('plans')) DataStore.set('plans', []);
    if (!DataStore.get('notes')) DataStore.set('notes', []);
    if (!DataStore.get('safe_people')) DataStore.set('safe_people', []);

    // GİRİŞ AKIŞI (Düzeltilmiş)
    const isActivated = localStorage.getItem('syf_activated') === 'true';

    if (!isActivated) {
      // 1. Aktivasyon ekranı
      this.activation.showActivationScreen();
      document.getElementById('app-shell').style.display = 'none';
    } else {
      // Aktive edilmiş
      const savedPin = DataStore.get('pin');
      if (savedPin) {
        // PIN var → Giriş ekranı
        this.pin.showLogin();
        document.getElementById('app-shell').style.display = 'none';
      } else {
        // PIN yok → PIN kurulumu
        this.pin.showSetup();
        document.getElementById('app-shell').style.display = 'none';
      }
    }

    // Header saat
    this.updateHeader();
    setInterval(() => this.updateHeader(), 1000);

    // URL parametre kontrolü
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) this.currentTab = tab;

    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
    });

    // Disclaimer göster
    setTimeout(() => {
      const banner = document.getElementById('disclaimer-banner');
      if (banner) {
        banner.style.display = 'block';
        document.body.classList.add('has-banner');
      }
    }, 2000);
  }

  showPinSetup() {
    this.pin.showSetup();
  }

  showApp() {
    const activationScreen = document.getElementById('activation-screen');
    const pinSetupScreen = document.getElementById('pin-setup-screen');
    const pinLoginScreen = document.getElementById('pin-login-screen');

    if (activationScreen) activationScreen.style.display = 'none';
    if (pinSetupScreen) pinSetupScreen.style.display = 'none';
    if (pinLoginScreen) pinLoginScreen.style.display = 'none';

    document.getElementById('app-shell').style.display = 'flex';
    this.tabDegistir(this.currentTab);
  }

  updateHeader() {
    const el = document.getElementById('header-sub');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) +
        ' | ' + now.toLocaleTimeString('tr-TR');
    }
  }

  // SEKME DEĞİŞİM
  tabDegistir(tab) {
    this.currentTab = tab;

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + tab);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item, .tab').forEach(n => {
      n.classList.toggle('active', n.getAttribute('data-tab') === tab);
    });

    const fab = document.querySelector('.fab');
    if (fab) fab.style.display = (tab === 'kasam' || tab === 'piyasa') ? 'flex' : 'none';

    switch(tab) {
      case 'piyasa': this.Piyasa.render(); break;
      case 'kasam': this.Kasam.render(); break;
      case 'kasef': this.renderKasef(); break;
      case 'planlar': this.Planlar.render(); break;
      case 'afet': this.Afet.render(); break;
      case 'yol': this.Yol.render(); break;
      case 'ekonomi': this.Ekonomi.render(); break;
      case 'temettu': this.Temettu.render(); break;
      case 'doviz': this.Doviz.render(); break;
      case 'hava': this.Hava.render(); break;
      case 'ayarlar': this.Ayarlar.render(); break;
    }

    window.scrollTo(0, 0);
  }

  // KAŞİF
  renderKasef() {
    const container = document.getElementById('chat-container');
    const history = this.kasef.chatHistory;
    if (history.length === 0) return;

    container.innerHTML = '';
    for (const msg of history) {
      const div = document.createElement('div');
      div.className = 'chat-msg ' + (msg.role === 'user' ? 'chat-user' : 'chat-bot');
      div.innerHTML = msg.text;
      container.appendChild(div);
    }
    container.scrollTop = container.scrollHeight;
  }

  kasefGonder() {
    const input = document.getElementById('chat-input');
    const query = input.value.trim();
    if (!query) return;

    this.kasef.addToHistory('user', this.escapeHtml(query));
    this.renderKasef();
    input.value = '';

    setTimeout(() => {
      const result = this.kasef.analyze(query);
      this.kasef.addToHistory('bot', result.response + '<div style="margin-top:8px;font-size:11px;color:var(--text3)">Kanıt gücü: %' + result.confidence + '</div>');
      this.renderKasef();
    }, 600 + Math.random() * 800);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // FİLTRE
  filtrele(type) {
    this.Piyasa.filter(type);
  }

  // OCR
  ocrAc() {
    this.ocr.open();
  }

  // NOT EKLE
  notEkle() {
    const text = prompt('📝 Yatırım notunuzu yazın:');
    if (text && text.trim()) {
      const notes = DataStore.get('notes', []);
      notes.push({ text: text.trim(), time: Date.now() });
      DataStore.set('notes', notes);
      app.toast('📝 Not eklendi', 'success');
      if (this.currentTab === 'kasam') this.Kasam.renderNotes();
    }
  }

  // TEMA
  temaDegistir() {
    this.Ayarlar.toggleTheme();
  }

  // PWA KURULUM
  async installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        this.toast('✅ SyFinans ana ekrana eklendi', 'success');
      }
      this.deferredPrompt = null;
    } else {
      this.toast('ℹ️ Tarayıcı menüsünden "Ana Ekrana Ekle" seçeneğini kullanın', 'info');
    }
  }
}

// ============================================
// GLOBAL FONKSİYONLAR
// ============================================
window.Planlar = {
  kaydet: () => PlanlarModule.calculate(),
  delete: (id) => PlanlarModule.delete(id),
  completeStep: (pid, sid) => PlanlarModule.completeStep(pid, sid)
};

// ============================================
// BAŞLAT
// ============================================
const app = new App();
window.app = app;

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
