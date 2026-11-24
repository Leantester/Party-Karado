import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_SLOTS = new Set(['morning', 'evening', 'night', 'fullday', 'custom']);
const ALLOWED_METHODS = new Set(['upi', 'card', 'netbanking']);
const ALLOWED_BANKS = new Set(['HDFC', 'ICICI', 'SBI', 'AXIS', 'KOTAK']);

function luhnCheck(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number.parseInt(digits[i], 10);
    if (Number.isNaN(digit)) return false;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/maps-config', (_req, res) => {
    const apiKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      '';
    res.json({ apiKey });
  });

  app.post('/api/payments/verify', (req, res) => {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Invalid payment payload.' });
      return;
    }

    const venueId = typeof body.venueId === 'string' ? body.venueId.trim() : '';
    const date =
      typeof body.date === 'string'
        ? body.date.trim()
        : typeof body.eventDate === 'string'
        ? body.eventDate.trim()
        : '';
    const slot = typeof body.slot === 'string' ? body.slot.trim() : '';
    const startHour = typeof body.startHour === 'number' ? body.startHour : 16;
    const endHour = typeof body.endHour === 'number' ? body.endHour : 20;
    const guestCount = typeof body.guestCount === 'number' ? body.guestCount : 0;
    const baseAmount = typeof body.baseAmount === 'number' ? body.baseAmount : 0;
    const cleaningFee = typeof body.cleaningFee === 'number' ? body.cleaningFee : 0;
    const depositAmount = typeof body.depositAmount === 'number' ? body.depositAmount : 0;
    const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod.trim() : '';

    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(venueId)) {
      res.status(400).json({ error: 'Invalid venue identifier.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid event date format.' });
      return;
    }
    if (!ALLOWED_SLOTS.has(slot)) {
      res.status(400).json({ error: 'Invalid time slot.' });
      return;
    }
    if (
      !Number.isInteger(startHour) ||
      !Number.isInteger(endHour) ||
      startHour < 0 ||
      startHour > 23 ||
      endHour <= startHour ||
      endHour > 24
    ) {
      res.status(400).json({ error: 'Invalid booking hour range.' });
      return;
    }
    if (!Number.isFinite(guestCount) || guestCount < 1 || guestCount > 5000) {
      res.status(400).json({ error: 'Invalid guest count.' });
      return;
    }
    if (
      !Number.isFinite(baseAmount) ||
      baseAmount < 500 ||
      !Number.isFinite(cleaningFee) ||
      cleaningFee < 0 ||
      !Number.isFinite(depositAmount) ||
      depositAmount < 0
    ) {
      res.status(400).json({ error: 'Invalid pricing parameters.' });
      return;
    }
    if (!ALLOWED_METHODS.has(paymentMethod)) {
      res.status(400).json({ error: 'Unsupported payment method.' });
      return;
    }

    let paymentLast4 = '';

    if (paymentMethod === 'upi') {
      const upiId = typeof body.upiId === 'string' ? body.upiId.trim() : '';
      if (!/^[a-zA-Z0-9._-]{2,40}@[a-zA-Z]{2,20}$/.test(upiId)) {
        res.status(400).json({ error: 'Enter a valid UPI ID (e.g., name@okaxis).' });
        return;
      }
      const [handle, provider] = upiId.split('@');
      const maskedHandle = handle.length > 3 ? `${handle.slice(0, 3)}***` : `${handle[0] ?? '*'}***`;
      paymentLast4 = `${maskedHandle}@${provider}`;
    } else if (paymentMethod === 'card') {
      const rawCard = typeof body.cardNumber === 'string' ? body.cardNumber.replace(/\s+/g, '') : '';
      const expiry = typeof body.cardExpiry === 'string' ? body.cardExpiry.trim() : '';
      const cvv = typeof body.cardCvv === 'string' ? body.cardCvv.trim() : '';
      const cardHolder = typeof body.cardHolder === 'string' ? body.cardHolder.trim() : '';

      if (cardHolder.length < 2 || cardHolder.length > 80) {
        res.status(400).json({ error: 'Enter the cardholder name.' });
        return;
      }
      if (!/^\d{13,19}$/.test(rawCard) || !luhnCheck(rawCard)) {
        res.status(400).json({ error: 'Enter a valid card number.' });
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
        res.status(400).json({ error: 'Enter a valid expiry date (MM/YY).' });
        return;
      }
      if (!/^\d{3,4}$/.test(cvv)) {
        res.status(400).json({ error: 'Enter a valid 3 or 4 digit CVV.' });
        return;
      }
      paymentLast4 = `•••• ${rawCard.slice(-4)}`;
    } else if (paymentMethod === 'netbanking') {
      const bankCode = typeof body.bankCode === 'string' ? body.bankCode.trim().toUpperCase() : '';
      if (!ALLOWED_BANKS.has(bankCode)) {
        res.status(400).json({ error: 'Select a supported bank.' });
        return;
      }
      paymentLast4 = bankCode;
    }

    const gstAmount = Math.round((baseAmount + cleaningFee) * 0.18);
    const totalAmount = Math.round(baseAmount + cleaningFee + depositAmount + gstAmount);
    const transactionId = `PKTXN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    res.json({
      verified: true,
      transactionId,
      paymentLast4,
      gstAmount,
      totalAmount,
      verifiedAt: new Date().toISOString(),
    });
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Party Karado server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Party Karado server:', err);
  process.exit(1);
});
