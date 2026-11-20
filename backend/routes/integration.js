const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { recordInvoicePayment, INVOICE_INCLUDE } = require('../utils/invoicePayments');

const PAYABLE_STATUSES = new Set(['POSTED', 'SENT', 'PARTIAL', 'OVERDUE']);
const MAX_PROOF_BYTES = 8 * 1024 * 1024;
const PROOF_DIR = path.join(__dirname, '..', 'public', 'invoice-payments');

if (!fs.existsSync(PROOF_DIR)) fs.mkdirSync(PROOF_DIR, { recursive: true });

const fail = (res, status, code, message) =>
  res.status(status).json({ ok: false, error: code, message });

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const numberOrZero = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const sanitizeText = (value, max = 120) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const parseDateInput = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value);
  const text = String(value).trim();
  if (/^\d+$/.test(text)) return new Date(Number(text));
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid date format');
  return parsed;
};

const parseBool = (value) => ['1', 'true', 'yes', 'y'].includes(String(value || '').toLowerCase());

const absoluteUrl = (req, relative) => {
  if (!relative) return null;
  if (/^https?:\/\//i.test(relative)) return relative;
  const proto = req.protocol || 'http';
  const host = req.get('host');
  if (!host) return relative;
  return `${proto}://${host}${relative.startsWith('/') ? '' : '/'}${relative}`;
};

async function saveProofImage(value) {
  if (!value) return null;
  if (typeof value !== 'string') throw new Error('proofOfPayment must be a string');
  if (/^https?:\/\//i.test(value) || value.startsWith('/public/')) return value;

  const match = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i.exec(value.trim());
  if (!match) throw new Error('proofOfPayment must be a data URL (data:image/...;base64,...)');

  const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (!buffer.length) throw new Error('proofOfPayment is empty');
  if (buffer.length > MAX_PROOF_BYTES) throw new Error('proofOfPayment exceeds 8 MB');

  const fileName = `mob-pay-${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
  await sharp(buffer).webp({ quality: 80 }).toFile(path.join(PROOF_DIR, fileName));
  return `/public/invoice-payments/${fileName}`;
}

function toPaymentDto(payment, req) {
  return {
    id: payment.id,
    date: payment.date,
    amount: numberOrZero(payment.amount),
    paymentMethod: payment.paymentMethod,
    status: payment.status,
    notes: payment.notes || null,
    proofOfPayment: payment.proofOfPayment || null,
    proofUrl: absoluteUrl(req, payment.proofOfPayment),
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  };
}

function toInvoiceDto(invoice, req) {
  const payments = (invoice.payments || [])
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((p) => toPaymentDto(p, req));

  const paidAmount = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.amount, 0);
  const grandTotal = numberOrZero(invoice.grandTotal);
  const outstandingAmount = Math.max(grandTotal - paidAmount, 0);
  const dueTime = invoice.dueDate ? new Date(invoice.dueDate).getTime() : null;
  const isOverdue = dueTime !== null && dueTime < Date.now() && outstandingAmount > 0;
  const paymentStatus = outstandingAmount <= 0 && grandTotal > 0
    ? 'PAID'
    : paidAmount > 0
      ? 'PARTIAL'
      : 'UNPAID';

  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    invoiceType: invoice.invoiceType,
    date: invoice.date,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    subtotal: numberOrZero(invoice.subtotal),
    discountType: invoice.discountType,
    discount: numberOrZero(invoice.discount),
    discountAmt: numberOrZero(invoice.discountAmt),
    tax: numberOrZero(invoice.tax),
    taxAmt: numberOrZero(invoice.taxAmt),
    grandTotal,
    paidAmount,
    outstandingAmount,
    paymentStatus,
    isOverdue,
    notes: invoice.notes || null,
    paymentTerms: invoice.paymentTerms || null,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    customer: invoice.customer
      ? {
          id: invoice.customer.id,
          code: invoice.customer.code,
          name: invoice.customer.name,
          company: invoice.customer.company || null,
          email: invoice.customer.email || null,
          phone: invoice.customer.phone || null,
          address: invoice.customer.address || null,
          taxId: invoice.customer.taxId || null,
          paymentTerms: invoice.customer.paymentTerms || null,
          type: invoice.customer.type || null
        }
      : null,
    items: (invoice.items || []).map((item) => ({
      id: item.id,
      no: item.no,
      description: item.description,
      qty: numberOrZero(item.qty),
      unit: item.unit,
      unitPrice: numberOrZero(item.unitPrice),
      discount: numberOrZero(item.discount),
      amount: numberOrZero(item.amount)
    })),
    payments,
    salesOrder: invoice.salesOrder
      ? {
          id: invoice.salesOrder.id,
          number: invoice.salesOrder.number,
          date: invoice.salesOrder.date,
          status: invoice.salesOrder.status,
          grandTotal: numberOrZero(invoice.salesOrder.grandTotal)
        }
      : null,
    project: invoice.project
      ? { id: invoice.project.id, name: invoice.project.name, status: invoice.project.status }
      : null,
    deliveryOrder: invoice.deliveryOrder
      ? { id: invoice.deliveryOrder.id, number: invoice.deliveryOrder.number, status: invoice.deliveryOrder.status }
      : null,
    contract: invoice.contract
      ? { id: invoice.contract.id, number: invoice.contract.number, status: invoice.contract.status }
      : null,
    bast: invoice.bast
      ? { id: invoice.bast.id, number: invoice.bast.number, status: invoice.bast.status }
      : null,
    bankAccount: invoice.bankAccount
      ? {
          id: invoice.bankAccount.id,
          bankName: invoice.bankAccount.bankName,
          accountNumber: invoice.bankAccount.accountNumber,
          accountHolder: invoice.bankAccount.accountHolder,
          branch: invoice.bankAccount.branch || null
        }
      : null
  };
}

module.exports = function createIntegrationRouter(prisma) {
  const router = express.Router();

  router.use(async (req, res, next) => {
    try {
      const provided = sanitizeText(
        req.get('x-api-key') ||
          (String(req.get('authorization') || '').replace(/^Bearer\s+/i, '')),
        256
      );

      if (!provided) {
        return fail(res, 401, 'unauthorized', 'API key required (header x-api-key)');
      }

      const expected = process.env.MOBILE_INTEGRATION_API_KEY;
      let valid = false;
      let subAppId = null;

      if (expected) {
        valid = safeEqual(provided, expected);
      } else {
        const subApp = await prisma.subApp.findUnique({ where: { apiKey: provided } });
        if (subApp) {
          const status = String(subApp.status || '').toUpperCase();
          valid = !['DISABLED', 'INACTIVE', 'OFFLINE', 'SUSPENDED'].includes(status);
          if (valid) {
            subAppId = subApp.id;
            prisma.subApp
              .update({ where: { id: subApp.id }, data: { lastSeen: new Date() } })
              .catch(() => {});
          }
        }
      }

      if (!valid) {
        return fail(res, 401, 'unauthorized', 'Invalid API key');
      }

      req.integration = { subAppId, source: 'mobile' };
      next();
    } catch (e) {
      return fail(res, 500, 'auth_error', e.message);
    }
  });

  router.get('/ping', async (req, res) => {
    try {
      const [invoiceCount, bankCount] = await Promise.all([
        prisma.invoice.count(),
        prisma.bankAccount.count({ where: { isActive: true } })
      ]);
      res.json({
        ok: true,
        service: 'axon-mobile-integration',
        serverTime: new Date().toISOString(),
        invoiceCount,
        bankCount
      });
    } catch (e) {
      return fail(res, 500, 'server_error', e.message);
    }
  });

  router.get('/banks', async (req, res) => {
    try {
      const banks = await prisma.bankAccount.findMany({
        where: { isActive: true },
        orderBy: { bankName: 'asc' },
        select: {
          id: true,
          bankName: true,
          accountNumber: true,
          accountHolder: true,
          branch: true
        }
      });
      res.json({ ok: true, data: banks });
    } catch (e) {
      return fail(res, 500, 'server_error', e.message);
    }
  });

  router.get('/invoices', async (req, res) => {
    try {
      const limitRaw = Number(req.query.limit);
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200) : 100;
      const offsetRaw = Number(req.query.offset);
      const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.trunc(offsetRaw) : 0;
      const status = sanitizeText(req.query.status, 32).toUpperCase();
      const customerId = sanitizeText(req.query.customerId, 64);
      const includeCancelled = parseBool(req.query.includeCancelled);
      const full = parseBool(req.query.full);

      const where = {};
      if (status) where.status = status;
      else if (!includeCancelled) where.status = { not: 'CANCELLED' };
      if (customerId) where.customerId = customerId;

      if (!full && req.query.updatedSince) {
        const since = parseDateInput(req.query.updatedSince);
        if (since) {
          where.OR = [
            { updatedAt: { gte: since } },
            { payments: { some: { updatedAt: { gte: since } } } }
          ];
        }
      }

      const rows = await prisma.invoice.findMany({
        where,
        include: INVOICE_INCLUDE,
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
        skip: offset,
        take: limit + 1
      });

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const data = page.map((invoice) => toInvoiceDto(invoice, req));

      res.json({
        ok: true,
        serverTime: new Date().toISOString(),
        data,
        page: {
          limit,
          offset,
          hasMore,
          nextOffset: hasMore ? offset + page.length : null,
          returned: data.length
        }
      });
    } catch (e) {
      return fail(res, 500, 'server_error', e.message);
    }
  });

  router.get('/invoices/:id', async (req, res) => {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: req.params.id },
        include: INVOICE_INCLUDE
      });
      if (!invoice) return fail(res, 404, 'not_found', 'Invoice not found');
      res.json({ ok: true, serverTime: new Date().toISOString(), data: toInvoiceDto(invoice, req) });
    } catch (e) {
      return fail(res, 500, 'server_error', e.message);
    }
  });

  router.post('/invoices/:id/payments', async (req, res) => {
    try {
      const body = req.body || {};
      const paymentId = sanitizeText(body.paymentId, 64);
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(paymentId)) {
        return fail(res, 422, 'invalid_payment_id', 'paymentId wajib berupa UUID/string 8-64 karakter');
      }

      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return fail(res, 422, 'invalid_amount', 'amount harus lebih besar dari 0');
      }

      const existingPayment = await prisma.invoicePayment.findUnique({
        where: { id: paymentId },
        include: { invoice: { include: INVOICE_INCLUDE } }
      });
      if (existingPayment) {
        if (existingPayment.invoiceId !== req.params.id) {
          return fail(res, 409, 'idempotency_conflict', 'paymentId sudah dipakai untuk invoice lain');
        }
        return res.json({
          ok: true,
          idempotent: true,
          serverTime: new Date().toISOString(),
          payment: toPaymentDto(existingPayment, req),
          invoice: toInvoiceDto(existingPayment.invoice, req)
        });
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id: req.params.id },
        select: { id: true, number: true, status: true }
      });
      if (!invoice) return fail(res, 404, 'not_found', 'Invoice not found');
      if (!PAYABLE_STATUSES.has(invoice.status)) {
        return fail(res, 409, 'invoice_not_payable', `Invoice berstatus ${invoice.status} tidak bisa dibayar`);
      }

      const proofOfPayment = await saveProofImage(body.proofOfPayment);
      const recordedBy = sanitizeText(body.recordedBy || req.get('x-mobile-user'), 120);
      const noteParts = [];
      if (body.notes) noteParts.push(String(body.notes).trim().slice(0, 500));
      if (body.reference) noteParts.push(`Ref: ${String(body.reference).trim().slice(0, 100)}`);
      noteParts.push(`via mobile${recordedBy ? ` (${recordedBy})` : ''}`);

      const result = await recordInvoicePayment(prisma, {
        invoiceId: invoice.id,
        amount,
        bankAccountId: sanitizeText(body.bankAccountId, 64) || null,
        paymentMethod: sanitizeText(body.paymentMethod, 32).toUpperCase() || 'TRANSFER',
        paymentDate: parseDateInput(body.date),
        notes: noteParts.join(' | '),
        proofOfPayment,
        paymentId,
        requirePosted: true,
        allowOverpayment: body.allowOverpayment === true
      });

      res.status(result.idempotent ? 200 : 201).json({
        ok: true,
        idempotent: Boolean(result.idempotent),
        serverTime: new Date().toISOString(),
        payment: toPaymentDto(result.payment, req),
        invoice: toInvoiceDto(result.invoice, req)
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gagal mencatat pembayaran';
      if (/Invoice not found/i.test(message)) return fail(res, 404, 'not_found', message);
      if (/already fully paid|cancelled|not payable|Bank account not found/i.test(message)) {
        return fail(res, 409, 'conflict', message);
      }
      if (/amount|balance|proofOfPayment|Invalid date|wajib|required/i.test(message)) {
        return fail(res, 422, 'validation_error', message);
      }
      return fail(res, 500, 'server_error', message);
    }
  });

  return router;
};
