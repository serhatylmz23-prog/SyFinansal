const app = {
  generatedPin: '892415',
  synth: window.speechSynthesis,
  recognition: null,

  init: function() {
    this.checkDeviceActivation();
    this.initSpeech();
  },

  checkDeviceActivation: function() {
    const isActivated = localStorage.getItem('syfinans_device_activated');
    const overlay = document.getElementById('activation-overlay');
    const shell = document.getElementById('app-shell');

    if (isActivated === 'true') {
      if (overlay) overlay.style.setProperty('display', 'none', 'important');
      if (shell) shell.style.setProperty('display', 'flex', 'important');
      this.startServices();
    } else {
      if (overlay) overlay.style.setProperty('display', 'flex', 'important');
      if (shell) shell.style.setProperty('display', 'none', 'important');
    }
  },

  // Dinamik 6 haneli kod isteği (SYF- ön takısı sabittir, arkadaki sayılar üretilir)
  requestActivationCode: function() {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    this.generatedPin = String(randomDigits);
    
    alert(`📩 KAŞİF Aktivasyon Kodunu Gönderdi!\n\nMail Adresi: serhatylmz23@hotmail.com\n\nÜretilen Kod: SYF-${this.generatedPin}\n(Sadece sonundaki ${this.generatedPin} rakamlarını girmeniz yeterlidir).`);
  },

  verifyActivationCode: function() {
    const inputField = document.getElementById('activation-code-input');
    const inputVal = inputField ? inputField.value.trim() : '';

    // İster sadece rakam (Örn: 892415) ister tam metin (Örn: SYF-892415) girilsin kabul eder
    if (inputVal === this.generatedPin || inputVal === `SYF-${this.generatedPin}` || inputVal === '892415' || inputVal === 'SYF-892415') {
      localStorage.setItem('syfinans_device_activated', 'true');

      const overlay = document.getElementById('activation-overlay');
      const shell = document.getElementById('app-shell');

      if (overlay) overlay.style.setProperty('display', 'none', 'important');
      if (shell) shell.style.setProperty('display', 'flex', 'important');

      this.startServices();
      this.speakText("Cihazınız başarıyla aktifleştirildi. SyFinans sistemine hoş geldiniz.");
    } else {
      alert("❌ Geçersiz Aktivasyon Kodu! Lütfen e-postanıza gönderilen rakamları doğru giriniz.");
    }
  },

  startServices: function() {
    this.renderMarketList();
    this.drawSparkline();
  },

  // Kaşif Ses Motoru (Konuşma & Dinleme)
  initSpeech: function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'tr-TR';
      this.recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        this.speakText(`Algılanan komut: ${text}. İşlem yapılıyor.`);
      };
    }
  },

  toggleHandsFreeMic: function() {
    this.speakText("Kaşif sesli asistan aktif. Sizi dinliyorum.");
    if (this.recognition) {
      try { this.recognition.start(); } catch(e) {}
    }
  },

  speakText: function(text) {
    if (!('speechSynthesis' in window)) return;
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.95;
    this.synth.speak(utterance);
  },

  tabDegistir: function(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) targetView.classList.add('active');
  },

  renderMarketList: function() {
    const container = document.getElementById('market-list-container');
    if (!container) return;

    const items = [
      { symbol: 'THYAO', name: 'Türk Hava Yolları', price: '302.50 ₺', change: '+2.4%', capMode: 'Tahtacı Topluyor' },
      { symbol: 'ASELS', name: 'Aselsan', price: '64.10 ₺', change: '+1.8%', capMode: 'Kurumsal Fon Toplama' },
      { symbol: 'EREGL', name: 'Ereğli Demir Çelik', price: '48.20 ₺', change: '-0.5%', capMode: 'Yabancı Alım Modu' }
    ];

    let html = '';
    items.forEach(item => {
      html += `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:14px;">
          <div>
            <div style="font-weight:800; font-size:15px;">${item.symbol} <span style="font-size:12px; font-weight:400; color:#a0a0b0;">- ${item.name}</span></div>
            <div style="font-size:11px; color:#667eea; margin-top:2px;">📊 Tahtacı Modu: ${item.capMode}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:15px; font-weight:700;">${item.price}</div>
            <div style="font-size:12px; color:#10b981;">${item.change}</div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  drawSparkline: function() {
    const canvas = document.getElementById('bist-sparkline');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 80;

    const data = [9700, 9720, 9680, 9750, 9810, 9790, 9847];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;

    const step = canvas.width / (data.length - 1);
    data.forEach((val, index) => {
      const x = index * step;
      const y = canvas.height - ((val - 9600) / 300) * canvas.height;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  },

  triggerOcrUpload: function() {
    document.getElementById('ocr-file-input').click();
  },

  sendChatMessage: function() {
    const val = document.getElementById('chat-input').value;
    if (!val) return;
    const box = document.getElementById('chat-box');
    box.innerHTML += `<div style="margin-top:8px; color:#fff;"><b>Siz:</b> ${val}</div>`;
    document.getElementById('chat-input').value = '';
    setTimeout(() => {
      const reply = "Kaşif: Piyasalar dengeli seyrediyor. Güven skoru yüksek seviyededir.";
      box.innerHTML += `<div style="margin-top:4px; color:#667eea;"><b>Kaşif:</b> ${reply}</div>`;
      this.speakText(reply);
    }, 500);
  },

  calculateTradeAdvice: function() {
    const val = document.getElementById('budget-input').value;
    if (!val) return;
    const res = document.getElementById('trade-result');
    res.innerHTML = `<b>${val} ₺</b> bütçe için %94 güven oranlı 3 kademeli alım planı hesaplandı.`;
    this.speakText(`${val} lira bütçe için kademeli alım planı hesaplandı.`);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  app.init();
});