const SO_STATUS_RANK = { DRAFT: 0, PENDING: 1, PROCESSING: 2, PARTIAL: 3, SHIPPED: 4, DELIVERED: 5, INVOICED: 6, PAID: 7, COMPLETED: 8 };
const DO_STATUS_RANK = { DRAFT: 0, SHIPPED: 1, DELIVERED: 2, INVOICED: 3, PAID: 4 };

const INVOICE_INCLUDE = {
  customer: true,
  project: true,
  salesOrder: true,
  deliveryOrder: true,
  bast: true,
  contract: true,
  bankAccount: true,
  items: { orderBy: { no: 'asc' } },
  payments: { orderBy: { date: 'asc' } }
};

async function advanceSalesOrderStatus(tx, salesOrderId, nextStatus) {
  if (!salesOrderId) return;
  const so = await tx.salesOrder.findUnique({
    where: { id: salesOrderId },
    select: { status: true }
  });
  if (!so || so.status === 'CANCELLED') return;
  if ((SO_STATUS_RANK[nextStatus] ?? -1) > (SO_STATUS_RANK[so.status] ?? -1)) {
    await tx.salesOrder.update({ where: { id: salesOrderId }, data: { status: nextStatus } });
  }
}

async function advanceDeliveryOrderStatus(tx, deliveryOrderId, nextStatus) {
  if (!deliveryOrderId) return;
  const d = await tx.deliveryOrder.findUnique({
    where: { id: deliveryOrderId },
    select: { status: true }
  });
  if (!d || d.status === 'CANCELLED') return;
  if ((DO_STATUS_RANK[nextStatus] ?? -1) > (DO_STATUS_RANK[d.status] ?? -1)) {
    await tx.deliveryOrder.update({ where: { id: deliveryOrderId }, data: { status: nextStatus } });
  }
}

async function resolveDeliveryOrder(tx, salesOrderId, deliveryOrderId) {
  if (deliveryOrderId) return deliveryOrderId;
  if (!salesOrderId) return null;
  const d = await tx.deliveryOrder.findFirst({
    where: { salesOrderId, status: { not: 'CANCELLED' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true }
  });
  return d ? d.id : null;
}

const PAID_ALLOWED_STATUSES = new Set(['POSTED', 'SENT', 'PARTIAL', 'OVERDUE']);

async function fetchIdempotentPayment(prisma, paymentId) {
  if (!paymentId) return null;
  const payment = await prisma.invoicePayment.findUnique({ where: { id: paymentId } });
  if (!payment) return null;
  const invoice = await prisma.invoice.findUnique({
    where: { id: payment.invoiceId },
    include: INVOICE_INCLUDE
  });
  return { invoice, payment, idempotent: true };
}

/**
 * Mencatat pembayaran invoice + jurnal penerimaan.
 * `paymentId` opsional: jika diisi oleh client (mis. UUID dari mobile),
 * ID tersebut dipakai sebagai primary key sehingga request ulang bersifat idempoten.
 */
async function recordInvoicePayment(prisma, options = {}) {
  const {
    invoiceId,
    amount,
    bankAccountId,
    paymentMethod,
    paymentDate,
    notes,
    proofOfPayment,
    paymentId,
    requirePosted = false,
    allowOverpayment = false
  } = options;

  if (!invoiceId) throw new Error('invoiceId wajib diisi');

  const existingPayment = await fetchIdempotentPayment(prisma, paymentId);
  if (existingPayment) return existingPayment;

  try {
    return await prisma.$transaction(async (tx) => {
      if (paymentId) {
        const duplicate = await tx.invoicePayment.findUnique({ where: { id: paymentId } });
        if (duplicate) {
          const invoice = await tx.invoice.findUnique({
            where: { id: duplicate.invoiceId },
            include: INVOICE_INCLUDE
          });
          return { invoice, payment: duplicate, idempotent: true };
        }
      }

      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: INVOICE_INCLUDE
      });

      if (!invoice) throw new Error('Invoice not found');
      if (invoice.status === 'CANCELLED') throw new Error('Invoice is cancelled');
      if (invoice.status === 'PAID') throw new Error('Invoice already fully paid');
      if (requirePosted && !PAID_ALLOWED_STATUSES.has(invoice.status)) {
        throw new Error(`Invoice status ${invoice.status} is not payable`);
      }

      const currentPaid = invoice.payments
        ? invoice.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
        : 0;
      const outstanding = Math.max(Number(invoice.grandTotal || 0) - currentPaid, 0);
      const paymentAmount = amount === undefined || amount === null || amount === ''
        ? outstanding
        : Number(amount);

      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }
      if (!allowOverpayment && paymentAmount - outstanding > 0.01) {
        throw new Error(`Payment amount exceeds outstanding balance (${outstanding})`);
      }

      const totalPaid = currentPaid + paymentAmount;
      const newStatus = totalPaid >= Number(invoice.grandTotal || 0) ? 'PAID' : 'PARTIAL';

      let targetCoaId = null;
      if (bankAccountId) {
        const bank = await tx.bankAccount.findUnique({
          where: { id: bankAccountId },
          include: { coa: true }
        });
        if (!bank) throw new Error('Bank account not found');
        if (bank.coaId) targetCoaId = bank.coaId;
      }

      if (!targetCoaId) {
        const cashAcc = await tx.systemAccount.findUnique({
          where: { key: 'CASH' },
          include: { coa: true }
        });
        if (!cashAcc) throw new Error('CASH system account not mapped and no bank provided');
        targetCoaId = cashAcc.coaId;
      }

      const arAcc = await tx.systemAccount.findUnique({
        where: { key: 'ACCOUNTS_RECEIVABLE' },
        include: { coa: true }
      });
      if (!arAcc) throw new Error('AR system account not mapped');

      const result = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: newStatus,
          bankAccountId: bankAccountId || invoice.bankAccountId
        },
        include: INVOICE_INCLUDE
      });

      await advanceSalesOrderStatus(tx, result.salesOrderId, newStatus === 'PAID' ? 'PAID' : 'PARTIAL');
      await advanceDeliveryOrderStatus(tx, await resolveDeliveryOrder(tx, result.salesOrderId, result.deliveryOrderId), newStatus === 'PAID' ? 'PAID' : 'INVOICED');

      const paymentRecord = await tx.invoicePayment.create({
        data: {
          ...(paymentId ? { id: paymentId } : {}),
          invoiceId,
          amount: paymentAmount,
          date: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod: paymentMethod || 'TRANSFER',
          status: 'SUCCESS',
          proofOfPayment: proofOfPayment || null,
          notes: notes || `Ref: PAY-${result.number}-${result.payments.length + 1}`
        }
      });

      const journalItems = [
        {
          coaId: targetCoaId,
          description: `Penerimaan Pembayaran (${newStatus}): ${result.number} - ${result.customer?.name || ''}`,
          debit: paymentAmount,
          credit: 0
        },
        {
          coaId: arAcc.coaId,
          description: `Pelunasan Piutang (${newStatus}): ${result.number}`,
          debit: 0,
          credit: paymentAmount
        }
      ];

      const lastJE = await tx.journalEntry.findFirst({
        where: { number: { startsWith: `JV-${new Date().getFullYear()}-` } },
        orderBy: { number: 'desc' }
      });
      const nextNum = lastJE ? parseInt(lastJE.number.split('-')[2] || '0', 10) + 1 : 1;
      const jvNumber = `JV-${new Date().getFullYear()}-${nextNum.toString().padStart(4, '0')}`;

      await tx.journalEntry.create({
        data: {
          number: jvNumber,
          date: new Date(),
          description: `Payment for Invoice: ${result.number}`,
          reference: result.number,
          type: 'RECEIPT',
          items: { create: journalItems }
        }
      });

      return { invoice: result, payment: paymentRecord, idempotent: false };
    }, { timeout: 20000 });
  } catch (e) {
    if (e && e.code === 'P2002' && paymentId) {
      const existing = await fetchIdempotentPayment(prisma, paymentId);
      if (existing) return existing;
    }
    throw e;
  }
}

module.exports = {
  INVOICE_INCLUDE,
  recordInvoicePayment
};
