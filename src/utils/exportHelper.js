import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Export data to Excel
 * @param {Array} data - Array of objects containing data
 * @param {Array} columns - Array of column definitions { header: 'Name', key: 'name', width: 20 }
 * @param {String} sheetName - Name of the worksheet
 * @param {String} filename - Name of the file to save (without extension)
 */
export const exportToExcel = async (data, columns, sheetName, filename) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName || 'Sheet1');

        worksheet.columns = columns;

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };

        // Add data
        if (data && data.length > 0) {
            data.forEach(item => {
                worksheet.addRow(item);
            });
        }

        // Auto filter
        worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: columns.length }
        };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${filename}.xlsx`);

        return true;
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        throw error;
    }
};

/**
 * Export data to PDF
 * @param {Array} data - Array of objects
 * @param {Array} columns - Array of column definitions
 * @param {String} title - Title of the report
 * @param {String} filename - Name of the file to save
 */
export const exportToPDF = (data, columns, title, filename) => {
    try {
        const doc = new jsPDF();

        // Add Title
        doc.setFontSize(18);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

        // Prepare table data
        const tableColumn = columns.map(col => col.header);
        const tableRows = [];

        data.forEach(row => {
            const rowData = columns.map(col => {
                const val = row[col.key];
                return val !== undefined && val !== null ? String(val) : '';
            });
            tableRows.push(rowData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [66, 66, 66] }
        });

        doc.save(`${filename}.pdf`);
        return true;
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        throw error;
    }
};

/**
 * Export data to DOCX
 * @param {Array} data - Array of objects
 * @param {Array} columns - Array of column definitions
 * @param {String} title - Title of the document
 * @param {String} filename - Name of the file to save
 */
export const exportToDocx = async (data, columns, title, filename) => {
    try {
        // Create table rows
        const tableRows = [
            new TableRow({
                children: columns.map(col => new TableCell({
                    children: [new Paragraph({ text: col.header, style: "strong" })],
                    shading: { fill: "D3D3D3" },
                })),
                tableHeader: true,
            })
        ];

        data.forEach(row => {
            tableRows.push(
                new TableRow({
                    children: columns.map(col => {
                        const val = row[col.key];
                        return new TableCell({
                            children: [new Paragraph(val !== undefined && val !== null ? String(val) : '')],
                        });
                    }),
                })
            );
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: title,
                                bold: true,
                                size: 32, // 16pt
                            }),
                        ],
                        spacing: { after: 200 },
                    }),
                    new Paragraph({
                        text: `Generated on: ${new Date().toLocaleDateString()}`,
                        spacing: { after: 400 },
                    }),
                    new Table({
                        rows: tableRows,
                        width: {
                            size: 100,
                            type: WidthType.PERCENTAGE,
                        },
                    }),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${filename}.docx`);
        return true;
    } catch (error) {
        console.error('Error exporting to DOCX:', error);
        throw error;
    }
};

/**
 * Generate an Excel template for import
 * @param {Array} columns - Array of column definitions { header: 'Name', key: 'name', width: 20, note: 'Required' }
 * @param {String} filename - Name of the file
 */
export const generateTemplate = async (columns, filename) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Template');

        worksheet.columns = columns.map(c => ({
            header: c.header,
            key: c.key,
            width: c.width || 20
        }));

        // Style header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };

        // Add note row if needed or just comments
        // Let's add a second row with instructions if 'note' is present
        const notes = {};
        let hasNotes = false;
        columns.forEach((col, index) => {
            if (col.sample) {
                notes[col.key] = col.sample;
                hasNotes = true;
            }
        });

        if (hasNotes) {
            worksheet.addRow(notes);
            worksheet.getRow(2).font = { italic: true, color: { argb: 'FF808080' } };
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${filename}_template.xlsx`);
        return true;
    } catch (error) {
        console.error('Error generating template:', error);
        throw error;
    }
};
