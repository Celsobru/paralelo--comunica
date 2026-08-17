const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');

class WhatsAppBot {
  constructor() {
    this.client = null;
    this.qrCodeBase64 = null;
    this.status = 'initializing';
    this.phoneNumber = null;
    this.ready = false;
    this.sessionDir = path.join(__dirname, 'data', 'wwebjs-session');
    this.reconnectTimer = null;
  }

  async start() {
    if (this.client) return;

    this.qrCodeBase64 = null;
    this.status = 'initializing';

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: this.sessionDir }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--no-first-run',
          '--no-default-browser-check',
        ],
      },
    });

    this.client.on('qr', async (qr) => {
      this.status = 'qr';
      console.log('QR Code recebido, gerando imagem...');
      try {
        this.qrCodeBase64 = await qrcode.toDataURL(qr);
        console.log('QR Code gerado com sucesso');
      } catch (err) {
        console.error('QR generate error:', err.message);
      }
    });

    this.client.on('ready', () => {
      this.status = 'connected';
      this.ready = true;
      const info = this.client.info;
      this.phoneNumber = info?.wid?.user || info?.me?.user || 'desconhecido';
      console.log('WhatsApp conectado:', this.phoneNumber);
    });

    this.client.on('authenticated', () => {
      this.status = 'authenticated';
      console.log('WhatsApp autenticado');
    });

    this.client.on('auth_failure', (msg) => {
      this.status = 'auth_failure';
      this.ready = false;
      console.error('WhatsApp auth failure:', msg);
      // Clean session folder and restart to generate new QR Code
      this.stop(true).then(() => {
        this.start().catch(e => console.error('Restart after auth_failure error:', e.message));
      });
    });

    this.client.on('disconnected', (reason) => {
      this.status = 'disconnected';
      this.ready = false;
      console.log('WhatsApp desconectado:', reason);
      this.reconnectTimer = setTimeout(() => {
        this.client = null;
        this.start().catch(e => console.error('Reconnect error:', e.message));
      }, 5000);
    });

    try {
      console.log('Iniciando WhatsApp Client...');
      await this.client.initialize();
    } catch (err) {
      console.error('WhatsApp init error:', err.message);
      this.status = 'error';
    }
  }

  async stop(cleanSession = false) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.client) {
      try {
        if (this.ready) {
          await Promise.race([
            this.client.logout(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 4000))
          ]).catch(e => console.warn('Logout warning:', e.message));
        }
        await Promise.race([
          this.client.destroy(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Destroy timeout')), 4000))
        ]).catch(e => console.warn('Destroy warning:', e.message));
      } catch (e) {
        console.error('Stop error:', e.message);
      }
      this.client = null;
      this.ready = false;
      this.status = 'stopped';
      this.qrCodeBase64 = null;
    }
    if (cleanSession) {
      const fs = require('fs');
      try {
        if (fs.existsSync(this.sessionDir)) {
          fs.rmSync(this.sessionDir, { recursive: true, force: true });
          console.log('Session folder deleted successfully');
        }
      } catch (err) {
        console.error('Error deleting session folder:', err.message);
      }
    }
  }

  async restart() {
    await this.stop();
    await new Promise(r => setTimeout(r, 2000));
    await this.start();
  }

  getStatus() {
    return {
      status: this.status,
      qrCode: this.qrCodeBase64,
      phoneNumber: this.phoneNumber,
      ready: this.ready,
    };
  }

  async sendMessage(number, text) {
    if (!this.ready || !this.client) {
      throw new Error('WhatsApp nao conectado');
    }

    const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
    console.log('Enviando mensagem para:', chatId);

    try {
      const msg = await this.client.sendMessage(chatId, text);
      console.log('Mensagem enviada ok');
      return msg;
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err.message || err);
      throw new Error('Falha ao enviar: ' + (err.message || err));
    }
  }
}

module.exports = new WhatsAppBot();
