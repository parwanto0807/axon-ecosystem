import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Add to jspdf module to support autotable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
        lastAutoTable: {
            finalY: number;
        };
    }
}

export const generateProjectPDF = async (project: any, stats: any, company: any, preview: boolean = false) => {
    // A4 portrait
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const W = 210
    const M = 15
    const indigo = [79, 70, 229] as [number, number, number]
    const dark = [15, 23, 42] as [number, number, number]
    const gray = [100, 116, 139] as [number, number, number]
    const white = [255, 255, 255] as [number, number, number]
    const light = [241, 245, 249] as [number, number, number]
    let y = M

    const formatCurrency = (amount: number) => `Rp ${Number(amount || 0).toLocaleString('id-ID')}`
    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // --- Header ---
    if (company?.logo) {
        try {
            const img = new Image(); img.crossOrigin = 'anonymous'
            await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); img.src = `http://localhost:5000${company.logo}` })
            if (img.complete && img.naturalWidth > 0) {
                const cv = document.createElement('canvas')
                cv.width = img.naturalWidth; cv.height = img.naturalHeight
                cv.getContext('2d')!.drawImage(img, 0, 0)
                doc.addImage(cv.toDataURL('image/png'), 'PNG', M, y, 22, 22)
            }
        } catch { /* skip */ }
    }

    // Company info
    const ix = company?.logo ? M + 26 : M
    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...dark)
    doc.text(company?.name || 'PT. Axon Ecosystem', ix, y + 5)
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
    let cy = y + 11
    if (company?.legalName && company.legalName !== company.name) { doc.text(company.legalName, ix, cy); cy += 4 }
    if (company?.address) {
        const addrParts = [company.address, [company.city, company.province].filter(Boolean).join(', '), company.postalCode].filter(Boolean).join(' — ')
        const addrLines = doc.splitTextToSize(addrParts, 88)
        doc.text(addrLines, ix, cy); cy += addrLines.length * 4
    }
    if (company?.phone) { doc.text(`Tel: ${company.phone}`, ix, cy); cy += 4 }
    if (company?.email) { doc.text(`Email: ${company.email}`, ix, cy); cy += 4 }
    if (company?.taxId) { doc.text(`NPWP: ${company.taxId}`, ix, cy) }

    // Project meta (Right aligned)
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
    const hdr = [
        ['No. Project', project?.number || '-'], 
        ['Tanggal', formatDate(project?.createdAt || new Date().toISOString())],
        ['Status', project?.status || '-']
    ]
    let hy = y + 4
    hdr.forEach(([k, v]) => {
        doc.setFont('helvetica', 'bold'); doc.text(`${k} :`, W - M - 35, hy, { align: 'right' })
        doc.setFont('helvetica', 'normal').setTextColor(...dark); doc.text(v, W - M, hy, { align: 'right' })
        doc.setTextColor(...gray); hy += 4.5
    })

    // Separator line
    y = Math.max(cy, hy) + 5
    doc.setDrawColor(...indigo).setLineWidth(0.8).line(M, y, W - M, y)
    y += 7

    // "PROJECT FINANCIAL REPORT"
    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...indigo)
    doc.text('PROJECT FINANCIAL REPORT', W / 2, y, { align: 'center' })
    y += 8

    // Project Details Box
    doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray).text('INFORMASI PROYEK', M, y)
    y += 4
    
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...dark).text(project?.name || '', M, y)
    y += 4
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
    doc.text(`Customer: ${project?.customer?.name || '-'}`, M, y); y += 4

    y += 4

    // --- FINANCIAL SUMMARY (Highlights) ---
    doc.setDrawColor(...light).setLineWidth(0.3).line(M, y, W - M, y); y += 6
    doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray).text('RINGKASAN FINANSIAL', M, y)
    y += 5

    const summaryData = [
        ['Total Pendapatan (Sales)', formatCurrency(stats.revenue)],
        ['Total HPP (COGS)', formatCurrency(stats.cogs)],
        ['Total Beban Operasional', formatCurrency(stats.operationalExpenses)],
        ['Laba Bersih (Net Profit)', formatCurrency(stats.profit)],
        ['Persentase Margin', `${stats.margin.toFixed(2)}%`]
    ];

    autoTable(doc, {
        startY: y, margin: { left: M, right: M },
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 2, textColor: dark },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: gray, cellWidth: 100 },
            1: { fontStyle: 'bold', halign: 'right' }
        },
        didParseCell: function (data: any) {
            if (data.row.index >= 3) {
                // Highlight Net Profit and Margin
                data.cell.styles.textColor = data.row.index === 3 ? [22, 163, 74] : indigo;
                data.cell.styles.fontSize = 9;
            }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 8

    // --- DETAILED BREAKDOWN ---
    // 1. Revenue Sources (Sales Orders)
    if (y > 250) { doc.addPage(); y = 20 }
    
    doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray).text('RINCIAN PENDAPATAN (SALES)', M, y)
    y += 3

    const soRows = (project?.salesOrders || []).map((so: any) => [
        so.number,
        formatDate(so.date || so.createdAt),
        so.subject || '-',
        so.status,
        formatCurrency(so.grandTotal || 0)
    ]);

    if (soRows.length > 0) {
        autoTable(doc, {
            startY: y, margin: { left: M, right: M },
            head: [['No. SO', 'Tanggal', 'Subject', 'Status', 'Nilai (Rp)']],
            body: soRows,
            theme: 'grid',
            headStyles: { fillColor: indigo, textColor: white, fontStyle: 'bold', fontSize: 7 },
            bodyStyles: { fontSize: 7, textColor: dark },
            alternateRowStyles: { fillColor: light },
            columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
            styles: { lineColor: [226, 232, 240], lineWidth: 0.1 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    } else {
        doc.setFont("helvetica", "italic").setFontSize(7).setTextColor(...gray)
        doc.text("- Belum ada Sales Order yang tercatat -", M, y + 3)
        y += 8;
    }

    // 2. COGS Breakdown
    if (y > 250) { doc.addPage(); y = 20 }
    
    doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray).text('RINCIAN HPP (COGS & MATERIAL)', M, y)
    y += 3

    const cogsRows: any[] = [];
    const validPOStatuses = ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'COMPLETED', 'POSTED'];
    
    // Material Usage from Stock Movements (CONFIRMED OUT)
    (project?.workOrders || []).forEach((wo: any) => {
        (wo.stockMovements || []).forEach((sm: any) => {
            if (sm.status === 'CONFIRMED' && (sm.type === 'OUT' || sm.type === 'STOK_OUT')) {
                const smTotal = sm.items?.reduce((acc: number, item: any) => acc + (item.qty || 0) * (item.unitCost || 0), 0) || 0;
                if (smTotal > 0) {
                    cogsRows.push([
                        `Stok Out: ${sm.number}`,
                        `Material dari ${sm.warehouse?.name || 'Gudang'}`,
                        'CONFIRMED',
                        formatCurrency(smTotal)
                    ]);
                }
            }
        });
    });

    // Direct Purchases from Purchase Orders (Non-Inventory)
    (project?.purchaseOrders || []).forEach((po: any) => {
        if (validPOStatuses.includes(po.status)) {
            let directAmt = 0;
            po.items?.forEach((item: any) => {
                const desc = (item.description || '').toLowerCase()
                const isInventoryItem = desc.includes('sku-') || desc.includes('prod-')
                const isService = desc.includes('jasa') || desc.includes('service') || desc.includes('fee') || desc.includes('ongkos')
                
                if (isService || !isInventoryItem) {
                    directAmt += (item.qty || 0) * (item.unitPrice || 0)
                }
            });

            if (directAmt > 0) {
                cogsRows.push([
                    `PO: ${po.number}`,
                    po.vendor?.name || 'Manual Purchase',
                    po.status,
                    formatCurrency(directAmt)
                ]);
            }
        }
    });

    if (cogsRows.length > 0) {
        autoTable(doc, {
            startY: y, margin: { left: M, right: M },
            head: [['Referensi', 'Deskripsi / Vendor', 'Status', 'Nilai (Rp)']],
            body: cogsRows,
            theme: 'grid',
            headStyles: { fillColor: indigo, textColor: white, fontStyle: 'bold', fontSize: 7 },
            bodyStyles: { fontSize: 7, textColor: dark },
            alternateRowStyles: { fillColor: light },
            columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
            styles: { lineColor: [226, 232, 240], lineWidth: 0.1 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    } else {
        doc.setFont("helvetica", "italic").setFontSize(7).setTextColor(...gray)
        doc.text("- Belum ada HPP / Pembelian yang tercatat -", M, y + 3)
        y += 8;
    }

    // 3. Operational Expenses Breakdown
    if (y > 250) { doc.addPage(); y = 20 }
    
    doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray).text('RINCIAN BEBAN OPERASIONAL', M, y)
    y += 3

    const expRows: any[] = [];
    const processedExpIds = new Set<string>();

    const addExpenseRow = (exp: any, source: string) => {
        if (!exp || !exp.id || processedExpIds.has(exp.id)) return;
        if ((exp.status === 'APPROVED' || exp.status === 'POSTED') && !exp.purchaseOrderId) {
            expRows.push([
                source,
                exp.category || '-',
                exp.description || '-',
                exp.status,
                formatCurrency(exp.amount || 0)
            ]);
        }
        processedExpIds.add(exp.id);
    };

    (project?.surveys || []).forEach((s: any) => {
        (s.expenses || []).forEach((e: any) => addExpenseRow(e, `Survey: ${s.number}`));
    });

    (project?.workOrders || []).forEach((wo: any) => {
        (wo.surveyExpenses || []).forEach((e: any) => addExpenseRow(e, `WO: ${wo.number}`));
    });

    (project?.surveyExpenses || []).forEach((e: any) => addExpenseRow(e, `Direct Project Ref`));

    if (expRows.length > 0) {
        autoTable(doc, {
            startY: y, margin: { left: M, right: M },
            head: [['Sumber', 'Kategori', 'Deskripsi', 'Status', 'Nilai (Rp)']],
            body: expRows,
            theme: 'grid',
            headStyles: { fillColor: indigo, textColor: white, fontStyle: 'bold', fontSize: 7 },
            bodyStyles: { fontSize: 7, textColor: dark },
            alternateRowStyles: { fillColor: light },
            columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
            styles: { lineColor: [226, 232, 240], lineWidth: 0.1 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    } else {
        doc.setFont("helvetica", "italic").setFontSize(7).setTextColor(...gray)
        doc.text("- Belum ada Beban Operasional yang tercatat -", M, y + 3)
        y += 8;
    }

    // Footer
    const pc = doc.getNumberOfPages()
    for (let i = 1; i <= pc; i++) {
        doc.setPage(i).setFont('helvetica', 'normal').setFontSize(7).setTextColor(...gray)
        doc.text(`Dokumen resmi dari ${company?.name || 'PT. Axon Ecosystem'}`, M, 290)
        doc.text(`Hal ${i} / ${pc}`, W - M, 290, { align: 'right' })
    }

    if (preview) {
        return doc.output('blob')
    } else {
        doc.save(`Project_Financial_Report_${project?.number}.pdf`)
    }
}
