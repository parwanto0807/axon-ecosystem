import React from 'react';
import HostingerLogo from './HostingerLogo';

export default function InvoicePrintTemplate() {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const formattedNextYear = nextYear.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div className="bg-white min-h-screen text-black p-6 max-w-[1000px] mx-auto print:p-0 text-[11px]" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                    <div className="mb-2">
                        <HostingerLogo className="h-[35px] w-auto object-contain" />
                    </div>
                    <p>PT. Web Media Technology Indonesia</p>
                    <p>Jl. Palagan Tentara Pelajar, Jangkang No.81, Jongkang, Sariharjo, Kec.</p>
                    <p>Ngaglik, Kabupaten Sleman, Daerah Istimewa</p>
                    <p>Yogyakarta 55581</p>
                    <p>Indonesia</p>
                    <p className="font-bold">VAT Reg #: 0032992034071000</p>
                </div>
                
                <div className="text-right space-y-1 text-[11px]">
                    <h1 className="text-2xl font-bold mb-2 text-left">INVOICE</h1>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-left">
                        <span>Invoice #</span>
                        <span className="font-bold">HID-1581539</span>
                        
                        <span>Invoice Issued #</span>
                        <span className="font-bold">{formattedDate}</span>
                        
                        <span>Invoice Amount #</span>
                        <span className="font-bold">IDR 3,516,457.00 (IDR)</span>
                        
                        <span>Next Billing Date #</span>
                        <span className="font-bold">{formattedNextYear}</span>
                        
                        <span>Order Nr. #</span>
                        <span className="font-bold">hb_52514850</span>
                    </div>
                    <div className="text-left mt-2 text-green-500 font-bold">
                        PAID
                    </div>
                </div>
            </div>

            {/* Billed To */}
            <div className="mb-6 space-y-0.5">
                <h3 className="font-bold mb-1">BILLED TO</h3>
                <p>PARWANTO wanto</p>
                <p>PERORANGAN</p>
                <p>Perum Metland Cibitung Blok s6 No 34</p>
                <p>BEKASI 17520</p>
                <p>Jawa Barat</p>
                <p>Indonesia</p>
                <p>parwanto0807@gmail.com</p>
                <p>6281280212068</p>
            </div>

            {/* Table */}
            <div className="w-full text-[10px] mb-6">
                <div className="grid grid-cols-12 gap-4 font-bold border-y-2 border-gray-100 py-2 mb-2 text-[9px]">
                    <div className="col-span-4">DESCRIPTION</div>
                    <div className="col-span-2 text-center">PRICE</div>
                    <div className="col-span-1 text-center">DISCOUNT</div>
                    <div className="col-span-2 text-right">TOTAL EXCL. VAT</div>
                    <div className="col-span-1 text-right">VAT</div>
                    <div className="col-span-2 text-right">AMOUNT (IDR)</div>
                </div>

                {/* Item 1 */}
                <div className="grid grid-cols-12 gap-4 py-2 border-b border-gray-100 items-start">
                    <div className="col-span-4">
                        <p className="font-bold">Perpanjangan VPS KVM 4 (billed every year)</p>
                        <p className="text-gray-400 mt-0.5">{formattedDate} to {formattedNextYear}</p>
                    </div>
                    <div className="col-span-2 text-center">IDR 4,112,000.00 x 1</div>
                    <div className="col-span-1 text-center">-</div>
                    <div className="col-span-2 text-right">IDR 4,112,000.00</div>
                    <div className="col-span-1 text-right">IDR 452,320.00</div>
                    <div className="col-span-2 text-right font-bold">IDR 4,564,320.00</div>
                </div>

                {/* Item 2 */}
                <div className="grid grid-cols-12 gap-4 py-2 border-b border-gray-100 items-start">
                    <div className="col-span-4">
                        <p className="font-bold">Nama Domain rylif-app.com (billed every year)</p>
                        <p className="text-gray-400 mt-0.5">{formattedDate} to {formattedNextYear}</p>
                    </div>
                    <div className="col-span-2 text-center">IDR 385,000.00 x 1</div>
                    <div className="col-span-1 text-center">-</div>
                    <div className="col-span-2 text-right">IDR 385,000.00</div>
                    <div className="col-span-1 text-right">IDR 42,350.00</div>
                    <div className="col-span-2 text-right font-bold">IDR 427,350.00</div>
                </div>

                {/* Item 3 */}
                <div className="grid grid-cols-12 gap-4 py-2 border-b border-gray-100 items-start">
                    <div className="col-span-4">
                        <p className="font-bold">Deposit Saldo</p>
                    </div>
                    <div className="col-span-2 text-center">IDR -1,475,213.00 x 1</div>
                    <div className="col-span-1 text-center">-</div>
                    <div className="col-span-2 text-right">IDR -1,475,213.00</div>
                    <div className="col-span-1 text-right">IDR 0.00</div>
                    <div className="col-span-2 text-right font-bold">IDR -1,475,213.00</div>
                </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end text-[11px]">
                <div className="w-[350px]">
                    <div className="flex justify-between py-1">
                        <span>Total excl. VAT</span>
                        <span>IDR 3,021,787.00</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                        <span>VAT</span>
                        <span>IDR 494,670.00</span>
                    </div>
                    <div className="flex justify-between py-1.5 font-bold">
                        <span>Total</span>
                        <span>IDR 3,516,457.00</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                        <span>Payments</span>
                        <span>(IDR 3,516,457.00)</span>
                    </div>
                    <div className="flex justify-between py-2 font-bold">
                        <span>Amount Due (IDR)</span>
                        <span>IDR 0.00</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
