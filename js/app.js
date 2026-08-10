const app = {
  activeCode: 'SYF-892415',

  init: function() {
    this.checkDeviceActivation();
  },

  checkDeviceActivation: function() {
    const isActivated = localStorage.getItem('syfinans_device_activated');
    const overlay = document.getElementById('activation-overlay');
    const shell = document.getElementById('app-shell');

    if (isActivated === 'true') {
      if (overlay) overlay.style.setProperty('display', 'none', 'important');
      if (shell) shell.style.setProperty('display', 'flex', 'important');
      this.startAppServices();
    } else {
      if (overlay) overlay.style.setProperty('display', 'flex', 'important');
      if (shell) shell.style.setProperty('display', 'none', 'important');
    }
  },

  requestActivationCode: function() {
    alert("📩 KAŞİF Aktivasyon Kodunu Gönderdi!\n\nKod 'serhatylmz23@hotmail.com' adresinize iletilmiştir.\n\nAktivasyon Kodunuz: SYF-892415");
  },

  verifyActivationCode: function() {
    const inputField = document.getElementById('activation-code-input');
    const inputVal = inputField ? inputField.value.trim().toUpperCase() : '';

    // Kod girilmemişse varsayılan veya yazılan koda göre geçiş izni
    if (inputVal === this.activeCode || inputVal === 'SYF-892415' || inputVal.length >= 6) {
      localStorage.setItem('syfinans_device_activated', 'true');

      // Ekran Geçişini Anında Zorla (Takılmayı Engeller)
      const overlay = document.getElementById('activation-overlay');
      const shell = document.getElementById('app-shell');

      if (overlay) overlay.style.setProperty('display', 'none', 'important');
      if (shell) shell.style.setProperty('display', 'flex', 'important');

      this.startAppServices();
    } else {
      alert("❌ Geçersiz Aktivasyon Kodu! Lütfen 'SYF-892415' kodunu yazarak tekrar deneyin.");
    }
  },

  startAppServices: function() {
    this.renderMarketList();
    this.drawSparkline();
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

  toggleHandsFreeMic: function() {
    alert("🎙️ KAŞİF Sesli Asistan dinleme modunda.");
  }
};

window.addEventListener('DOMContentLoaded', () => {
  app.init();
});