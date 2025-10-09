import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const formatDateForPrint = (dateString, includeTime = false) => {
  if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = true;
  }
  return date.toLocaleDateString('en-US', options);
};

export const generateInvoiceHtml = (invoiceData, userProfile, theme) => {
   if (!invoiceData || !userProfile) return '';

  const {
    invoiceNumber,
    billingPeriodStart,
    billingPeriodEnd,
    date,
    dueDate,
    lineItems = [],
    amount,
    status, // Destructure the 'status' property
    } = invoiceData;

  const { displayName, email } = userProfile;
  const { address, phase, city, province, zipCode } = userProfile.profile || {};

  const customerAddress = [address, phase, city, province, zipCode]
    .filter(Boolean)
    .join(', ');

   const totalAmount = amount?.toFixed(2) || '0.00';
   const formattedInvoiceDate = formatDateForPrint(date);
   const formattedDueDate = formatDateForPrint(dueDate);
   const formattedBillingPeriod = (billingPeriodStart && billingPeriodEnd)
      ? `${formatDateForPrint(billingPeriodStart)} - ${formatDateForPrint(billingPeriodEnd)}`
    : 'N/A';

  const lineItemsHtml = lineItems.length > 0
    ? lineItems.map(item => `
      <tr>
        <td>${item.description || 'Service/Item'}</td>
        <td class="align-right">₱${(item.amount || 0).toFixed(2)}</td>
      </tr>
        `).join('')
          : `<tr><td colspan="2">No detailed line items available.</td></tr>`;

  // --- NEW: Conditionally create the "PAID" stamp ---
  const paidStampHtml = status === 'Paid' ? `
    <div class="paid-stamp">Paid</div>
  ` : '';

  return `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
      <title>Invoice #${invoiceNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

        body {
          font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          margin: 0;
          color: #333;
          background-color: #f4f7fc;
          -webkit-print-color-adjust: exact;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 40px 15px;
          min-height: 100vh;
          box-sizing: border-box;
        }

        .invoice-container {
          display: flex;
          max-width: 800px;
          width: 100%;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border-radius: 15px;
          overflow: hidden;
        }

        .sidebar {
          background-color: #2c3e50;
          color: #ecf0f1;
          padding: 30px;
          width: 250px;
        }

        .sidebar h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          border-bottom: 2px solid #3498db;
          padding-bottom: 10px;
        }

        .sidebar-section {
          margin-bottom: 25px;
        }

        .sidebar-section h2 {
          font-size: 16px;
          color: #3498db;
          margin-bottom: 10px;
          text-transform: uppercase;
        }

        .sidebar-section p {
          margin: 5px 0;
          font-size: 14px;
          line-height: 1.6;
        }

        .main-content {
          background-color: #ffffff;
          padding: 30px;
          flex: 1;
          /* --- MODIFICATION FOR STAMP POSITIONING --- */
          position: relative;
          overflow: hidden; /* Ensures stamp rotation doesn't break layout */
        }

        .header { text-align: right; margin-bottom: 40px; }
        .header h2 { color: #2c3e50; font-size: 36px; margin: 0; }
        .header p { font-size: 14px; color: #7f8c8d; margin: 5px 0; }
        .billed-to { margin-bottom: 30px; }
        .billed-to h3 { color: #3498db; font-size: 16px; margin-bottom: 10px; text-transform: uppercase; }
        .billed-to p { margin: 5px 0; font-size: 15px; }

        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; font-size: 14px; border-bottom: 1px solid #ecf0f1; }
        th { background-color: #f4f7fc; font-weight: 700; color: #2c3e50; text-transform: uppercase; }
        .align-right { text-align: right; }
        .total-row { background-color: #3498db; color: #ffffff; font-weight: 700; font-size: 18px; }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #95a5a6; }

        /* --- NEW: PAID STAMP STYLES --- */
        .paid-stamp {
          position: absolute;
          top: 65px;
          right: -35px;
          transform: rotate(15deg);
          border: 5px double #2ecc71;
          color: #2ecc71;
          font-size: 32px;
          font-weight: 700;
          padding: 10px 40px;
          text-transform: uppercase;
          letter-spacing: 2px;
          opacity: 0.5;
          pointer-events: none; /* Make it non-interactive */
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="sidebar">
          <div class="sidebar-section">
            <h1>FiBear Network</h1>
            <p>Block 18, Lot 95 Phase 1D, Kasiglahan Village, Brgy San Jose, Rodriguez, Rizal</p>
            <p>09154283220 | 09707541724 | 09071049526</p>
          </div>
          <div class="sidebar-section">
            <h2>Invoice Details</h2>
            <p><strong>Invoice No:</strong> #${invoiceNumber || 'N/A'}</p>
            <p><strong>Invoice Date:</strong> ${formattedInvoiceDate}</p>
            <p><strong>Due Date:</strong> ${formattedDueDate}</p>
          </div>
          <div class="sidebar-section">
            <h2>Billing Period</h2>
            <p>${formattedBillingPeriod}</p>
          </div>
        </div>
        <div class="main-content">
          <!-- Inject the stamp HTML here -->
          ${paidStampHtml}

          <div class="header">
            <h2>INVOICE</h2>
            <p>FiBear Network Technologies Corp. Montalban</p>
          </div>
          <div class="billed-to">
            <h3>Billed To</h3>
            <p>${displayName || 'N/A'}</p>
            <p>${customerAddress || ''}</p>
            <p>${email || 'N/A'}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="align-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml}
            </tbody>
          </table>
          <table>
            <tbody>
              <tr class="total-row">
                <td>TOTAL AMOUNT DUE</td>
                <td class="align-right">₱${totalAmount}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <p>Thank you for your timely payment!</p>
            <p>For inquiries, please contact our support team.</p>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
};

export const handlePrintAndShare = async (htmlContent, fileName = 'document', onError) => {
   try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf', dialogTitle: `Share ${fileName}` });
    } catch (error) {
       console.error(`Error printing/sharing ${fileName}:`, error);
    if (onError) onError(error);
    }
  };

  