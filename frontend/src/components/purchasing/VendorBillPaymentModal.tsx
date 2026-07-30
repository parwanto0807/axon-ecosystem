import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Building2, CheckCircle2, Loader2, Receipt } from 'lucide-react';

const formatCurrency = (val: number) => 'Rp ' + (val || 0).toLocaleString('id-ID');

interface BankAccount {
    id: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    coa?: { id: string; balance: number };
}

interface Props {
    invoice: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function VendorBillPaymentModal({ invoice, onClose, onSuccess }: Props) {
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [selectedBankId, setSelectedBankId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchBankAccounts();
    }, []);

    const fetchBankAccounts = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bank-accounts`);
            const data = await res.json();
            setBankAccounts(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Error fetching bank accounts:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-invoices/${invoice.id}/pay`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bankAccountId: selectedBankId || null })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Gagal melakukan pembayaran');
            }
            onSuccess();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-2xl md:rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <Receipt size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">Payment Confirmation</h2>
                            <p className="text-xs text-slate-500 font-medium">Bayar Vendor Bill: {invoice?.number}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-slate-500">Total Tagihan</span>
                            <span className="text-lg font-black text-slate-900">{formatCurrency(invoice?.grandTotal || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-slate-500">Vendor</span>
                            <span className="text-sm font-bold text-slate-700">{invoice?.vendor?.name}</span>
                        </div>
                    </div>

                    <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Pilih Rekening Pembayaran (Opsional)</label>
                            {loading ? (
                                <div className="h-11 bg-slate-100 animate-pulse rounded-xl w-full"></div>
                            ) : (
                                <div className="space-y-2">
                                    <select
                                        value={selectedBankId}
                                        onChange={(e) => setSelectedBankId(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700"
                                    >
                                        <option value="">Gunakan Akun Kas Default (CASH)</option>
                                        {bankAccounts.map(bank => (
                                            <option key={bank.id} value={bank.id}>
                                                {bank.bankName} - {bank.accountNumber} (Saldo: {formatCurrency(bank.coa?.balance || 0)})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-500 font-medium px-1">
                                        Pilih rekening bank jika menggunakan transfer. Biarkan default jika pembayaran menggunakan uang tunai dari kas kecil.
                                    </p>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 mt-auto">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-all"
                        disabled={submitting}
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="payment-form"
                        disabled={submitting}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Konfirmasi Pembayaran
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
