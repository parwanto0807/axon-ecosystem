"use client"

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ShieldCheck, CreditCard, Wallet, Building, Smartphone, HelpCircle } from 'lucide-react';
import HostingerLogo from './HostingerLogo';

export default function InvoiceTemplate() {
    const [selectedPayment, setSelectedPayment] = useState<string>('BCA');
    
    // Mock Data for Payments
    const grandTotal = 3516457;
    const paidAmount = 0; // Mock paid amount
    const remainingBalance = grandTotal - paidAmount;
    
    const [paymentAmount, setPaymentAmount] = useState<number>(remainingBalance);
    const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');

    // Handle payment type change
    const handlePaymentTypeChange = (type: 'full' | 'partial') => {
        setPaymentType(type);
        if (type === 'full') {
            setPaymentAmount(remainingBalance);
        }
    };

    const paymentMethods = [
        { 
            id: 'kartu', 
            title: 'Kartu', 
            category: 'Pembayaran Instan:', 
            images: [
                'https://upload.wikimedia.org/wikipedia/commons/5/57/Discover_Card_logo.svg',
                'https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg',
                'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg'
            ] 
        },
        { 
            id: 'paypal', 
            title: 'PayPal', 
            category: 'Pembayaran Instan:', 
            images: ['https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg'] 
        },
        { 
            id: 'cicilan', 
            title: 'Cicilan Kartu Kredit', 
            category: 'Pembayaran Instan:', 
            images: [
                'https://upload.wikimedia.org/wikipedia/commons/5/57/Discover_Card_logo.svg',
                'https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg',
                'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg'
            ] 
        },
        { 
            id: 'BCA', 
            title: 'BCA', 
            category: '1 hari kerja:', 
            images: ['https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg'] 
        },
        { 
            id: 'QRIS', 
            title: 'QRIS', 
            category: '1 hari kerja:', 
            images: ['https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg'] 
        },
        { 
            id: 'BNI', 
            title: 'BNI', 
            category: '1 hari kerja:', 
            images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/BNI_logo_%282024%29.svg/512px-BNI_logo_%282024%29.svg.png'] 
        },
    ];

    const instantPayments = paymentMethods.filter(p => p.category === 'Pembayaran Instan:');
    const delayedPayments = paymentMethods.filter(p => p.category === '1 hari kerja:');

    return (
        <div className="min-h-screen bg-[#f4f5f7] pb-24 font-sans text-slate-800">
            {/* Header placeholder (simulating Hostinger header) */}
            <header className="bg-white px-8 py-4 flex justify-between items-center border-b border-slate-200">
                <div className="flex items-center">
                    <HostingerLogo className="h-16 w-auto object-contain" />
                </div>
                <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
                    <span>parwanto0807@gmail.com</span>
                    <button className="text-indigo-600 hover:text-indigo-800 font-bold">Logout</button>
                </div>
            </header>

            <div className="max-w-[1100px] mx-auto mt-8 px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Billing and Payment */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Billing Address Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full border border-green-500 text-green-500 flex items-center justify-center shrink-0 mt-1">
                                <Check size={16} strokeWidth={3} />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-slate-800 mb-6">Alamat Penagihan</h2>
                                
                                <div className="space-y-1 text-slate-600 text-[15px] font-medium leading-relaxed">
                                    <p className="text-slate-800 font-bold">PARWANTO wanto</p>
                                    <p>+62 81280212068</p>
                                    <p>Indonesia, Jawa Barat, BEKASI</p>
                                    <p>Perum Metland Cibitung Blok s6 No 34, 17520</p>
                                    <p>PERORANGAN</p>
                                </div>
                            </div>
                            <button className="text-indigo-600 font-bold text-sm hover:text-indigo-800 transition-colors">
                                Edit
                            </button>
                        </div>
                    </motion.div>

                    {/* Payment Methods Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0">
                                2
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Pembayaran</h2>
                        </div>

                        {/* Instant Payments */}
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-slate-500 mb-3">Pembayaran Instan:</h3>
                            <div className="space-y-3">
                                {instantPayments.map(method => (
                                    <PaymentMethodBox 
                                        key={method.id} 
                                        title={method.title} 
                                        images={method.images}
                                        selected={selectedPayment === method.id}
                                        onClick={() => setSelectedPayment(method.id)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Delayed Payments */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 mb-3">1 hari kerja:</h3>
                            <div className="space-y-3">
                                {delayedPayments.map(method => (
                                    <PaymentMethodBox 
                                        key={method.id} 
                                        title={method.title} 
                                        images={method.images}
                                        selected={selectedPayment === method.id}
                                        onClick={() => setSelectedPayment(method.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Right Column - Order Summary */}
                <div className="lg:col-span-1">
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 sticky top-8"
                    >
                        <h2 className="text-xl font-bold text-slate-800 mb-6">Daftar Tagihan</h2>
                        
                        <div className="mb-6">
                            <h3 className="font-bold text-slate-800 mb-4">Perpanjangan VPS KVM 4</h3>
                            
                            <div className="space-y-3 text-[15px]">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 font-medium">Durasi 12 bulan</span>
                                    <div className="text-right">
                                        <span className="font-bold">Rp4.112.000</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1">
                                            <span className="text-slate-600 font-medium">Nama Domain</span>
                                            <HelpCircle size={14} className="text-slate-400" />
                                        </div>
                                        <span className="text-xs text-slate-400 mt-0.5">rylif-app.com</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-slate-400 line-through text-sm mr-2">Rp1.959.900</span>
                                        <span className="font-bold">Rp385.000</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 font-medium">Proteksi Privasi Domain WHOIS</span>
                                    <span className="font-bold">Rp0</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 font-medium">Deposit Saldo</span>
                                    <span className="font-bold text-emerald-600">-Rp1.475.213</span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 py-4 mb-4">
                            <div className="flex justify-between items-center text-[15px]">
                                <div className="flex items-center gap-1">
                                    <span className="text-slate-600 font-medium">Pajak</span>
                                    <HelpCircle size={14} className="text-slate-400" />
                                </div>
                                <span className="font-bold">Rp494.670</span>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6 mb-6">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-lg font-medium text-slate-800">Total Tagihan</span>
                                <div className="text-right">
                                    <span className="text-xl font-bold text-slate-800">Rp{grandTotal.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-xl font-bold text-slate-800">Sisa Tagihan</span>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-rose-600">Rp{remainingBalance.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Amount Selection */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm">Nominal Pembayaran</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => handlePaymentTypeChange('full')}
                                    className={`py-2 px-3 rounded-lg text-sm font-bold border transition-colors ${paymentType === 'full' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'}`}
                                >
                                    Bayar Penuh
                                </button>
                                <button 
                                    onClick={() => handlePaymentTypeChange('partial')}
                                    className={`py-2 px-3 rounded-lg text-sm font-bold border transition-colors ${paymentType === 'partial' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'}`}
                                >
                                    Cicilan Bebas
                                </button>
                            </div>
                            
                            {paymentType === 'partial' && (
                                <div className="mt-3 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-slate-500 font-medium">Rp</span>
                                    </div>
                                    <input 
                                        type="number" 
                                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent font-medium"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                        max={remainingBalance}
                                        min={10000}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Masukkan nominal cicilan yang ingin dibayarkan.</p>
                                </div>
                            )}
                        </div>

                        <button className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 mb-4 flex justify-center items-center gap-2">
                            <Wallet size={20} />
                            Bayar Rp{paymentAmount.toLocaleString('id-ID')}
                        </button>

                        <button 
                            onClick={() => window.open('/invoice-print', '_blank')}
                            className="w-full bg-white text-indigo-600 border-2 border-indigo-600 font-bold py-4 rounded-xl hover:bg-indigo-50 transition-colors mb-6 flex justify-center items-center gap-2"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Print Invoice PDF
                        </button>

                        <button className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors w-full text-center mb-6">
                            Punya Kode Kupon?
                        </button>


                        <div className="flex items-center justify-center gap-2 text-slate-500 font-bold text-sm bg-slate-50 py-3 rounded-xl border border-slate-100">
                            Due Date : 16 Juni 2026
                        </div>
                        

                    </motion.div>
                </div>
            </div>
        </div>
    );
}

function PaymentMethodBox({ title, images, selected, onClick }: { title: string, images: string[], selected: boolean, onClick: () => void }) {
    return (
        <div 
            onClick={onClick}
            className={`
                flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all
                ${selected ? 'border-indigo-600 bg-white shadow-[0_0_0_1px_#4f46e5]' : 'border-slate-300 hover:border-slate-400'}
            `}
        >
            <span className="font-bold text-[15px] text-slate-800">{title}</span>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    {images.map((img, index) => (
                        <div key={index} className="h-5 flex items-center justify-center">
                            <img src={img} alt={`${title} logo ${index}`} className="h-full w-auto object-contain max-w-[45px]" />
                        </div>
                    ))}
                </div>
                <div className="ml-2 w-5 h-5 text-slate-800">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
            </div>
        </div>
    );
}
