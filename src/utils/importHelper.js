import ExcelJS from 'exceljs';

/**
 * Parse Excel file to JSON
 * @param {File} file - The uploaded file
 * @returns {Promise<Array>} - Array of row objects
 */
export const parseExcel = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const buffer = e.target.result;
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(buffer);

                const worksheet = workbook.getWorksheet(1); // Get first sheet
                if (!worksheet) {
                    reject(new Error('No worksheet found in the Excel file'));
                    return;
                }

                const jsonData = [];
                const headers = [];

                // Get headers from first row
                const headerRow = worksheet.getRow(1);
                headerRow.eachCell((cell, colNumber) => {
                    headers[colNumber] = cell.value ? cell.value.toString().trim() : `col_${colNumber}`;
                });

                // Get data
                worksheet.eachRow((row, rowNumber) => {
                    if (rowNumber === 1) return; // Skip header
                    // If row 2 is sample data/notes (detected by check), skip it?
                    // For now, assume strict format. However, if we generated a template with sample data in row 2, we might want to skip it if it matches known sample values. 
                    // Better to instruct user or check if row looks like sample.

                    const rowData = {};
                    let hasData = false;

                    row.eachCell((cell, colNumber) => {
                        const header = headers[colNumber];
                        if (header) {
                            rowData[header] = cell.value;
                            hasData = true;
                        }
                    });

                    if (hasData) {
                        jsonData.push(rowData);
                    }
                });

                resolve(jsonData);
            } catch (error) {
                console.error('Error parsing Excel:', error);
                reject(error);
            }
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsArrayBuffer(file);
    });
};
