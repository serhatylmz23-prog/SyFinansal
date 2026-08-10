const app = {
  activeCode: 'SYF-892415',

  init: function() {
    const isActivated = localStorage.getItem('syfinans_device_activated');
    if (isActivated === 'true') {
      document.getElementById('activation-overlay').style.display = 'none';
      document.getElementById('app-shell').style.display = 'flex';
    } else {
      document.getElementById('activation-overlay').style.display = 'flex';
      document.getElementById('app-shell').style.display = 'none';
    }
  },

  requestActivationCode: function() {
    alert("📩 Aktivasyon Kodu Gönderildi!\n\nKod 'serhatylmz23@hotmail.com' adresine iletilmiştir.\n\nAktivasyon Kodunuz: SYF-892415");
  },

  verifyActivationCode: function() {
    const inputVal = document.getElementById('activation-code-input').value.trim().toUpperCase();
    if (inputVal === this.activeCode || inputVal === 'SYF-892415') {
      localStorage.setItem('syfinans_device_activated', 'true');
      document.getElementById('activation-overlay').style.display = 'none';
      document.getElementById('app-shell').style.display = 'flex';
      alert("✅ Cihazınız Başarıyla Aktifleştirildi!");
    } else {
      alert("❌ Geçersiz Aktivasyon Kodu! Lütfen koda dikkat ederek tekrar giriniz.");
    }
  },

  toggleHandsFreeMic: function() {
    alert("🎙️ Sesli asistan dinleme moduna geçti.");
  }
};

window.addEventListener('DOMContentLoaded', () => {
  app.init();
});