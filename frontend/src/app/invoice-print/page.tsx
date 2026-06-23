"use client";

import InvoicePrintTemplate from '@/components/invoice/InvoicePrintTemplate';
import { useEffect } from 'react';

export default function InvoicePrintPage() {
    // Automatically trigger print when page loads
    useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="bg-white min-h-screen">
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0; /* This removes the browser header/footer */
                    }
                    body {
                        margin: 1cm; /* Add some padding back to the content */
                    }
                }
            `}</style>
            
            <div className="print:hidden p-4 bg-gray-50 border-b flex justify-between items-center">
                <span className="text-sm text-gray-500">Invoice ready for printing...</span>
                <button 
                    onClick={() => window.print()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 transition-colors"
                >
                    Print to PDF
                </button>
            </div>

            <div className="max-w-[1000px] mx-auto bg-white">
                <InvoicePrintTemplate />
            </div>
        </div>
    );
}
