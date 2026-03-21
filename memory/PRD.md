# GroceryTracker - Product Requirements Document

## Overview
Greek supermarket receipt tracking and price comparison mobile app built with Expo (React Native) + FastAPI + MongoDB.

## Problem Statement
Greek retail receipts now include barcodes/QR codes linking to e-invoicing platforms with detailed purchase data. This app automates the process of logging purchases from these receipts, creating a personal archive, and enabling price comparisons across supermarkets.

## User Choices
- **Authentication**: None (anonymous device ID)
- **AI Integration**: None (future version)
- **Language**: Bilingual (Greek + English)
- **Data Storage**: Local + centralized MongoDB backup
- **Import Methods**: Auto-scrape (URL), XML upload, manual entry

## Supported Supermarkets

| Supermarket | Provider | Method |
|---|---|---|
| Σκλαβενίτης | e-invoicing.gr (Entersoft) | ✅ Auto-scrape via URL |
| Μασούτης | e-invoicing.gr (Entersoft) | ✅ Auto-scrape via URL |
| Jumbo | e-invoicing.gr (Entersoft) | ✅ Auto-scrape via URL |
| My Market | einvoice.impact.gr (Impact) | ✅ Auto-scrape via URL |
| ΑΒ Βασιλόπουλος | epsilondigital (Epsilon Net) | 📄 XML upload (myData) |
| Market In | epsilondigital (Epsilon Net) | 📄 XML upload (myData) |

## Architecture

### Backend (FastAPI)
- **Parsers**: Entersoft (e-invoicing.gr via iframe API), Impact (einvoice.impact.gr), myData XML
- **Collections**: receipts, products, devices
- **Key Endpoints**:
  - POST /api/receipts/import-url - Auto-scrape receipt from URL
  - POST /api/receipts/import-xml - Parse uploaded XML file
  - POST /api/receipts/manual - Manual receipt entry
  - GET /api/receipts - List receipts for device
  - GET /api/receipts/{id} - Receipt detail
  - DELETE /api/receipts/{id} - Delete receipt
  - GET /api/products/compare - Compare product prices across stores
  - GET /api/products/search - Search products
  - GET /api/stats - Dashboard statistics
  - GET /api/backup/export - Export all data
  - POST /api/devices/register - Register device

### Frontend (Expo Router)
- **Tab Navigation**: Dashboard, Add Receipt, Purchases, Compare, Settings
- **Screens**: Receipt Detail (/receipt/[id])
- **i18n**: Full Greek + English translations
- **Store Colors**: Branded colors per supermarket

## Key Features (MVP)
1. ✅ Auto-import receipts from e-invoicing.gr and einvoice.impact.gr
2. ✅ XML upload for Epsilon Digital providers
3. ✅ Manual receipt entry
4. ✅ Receipt history with search
5. ✅ Price comparison across stores
6. ✅ Bilingual support (EL/EN)
7. ✅ Anonymous device ID (no login)
8. ✅ Auto-backup to central MongoDB
9. ✅ Data export (JSON)

## Future Enhancements
- AI-powered product matching (GPT/Gemini)
- Barcode/QR scanner via camera
- Optional user login for multi-device sync
- Push notifications for price drops
- Spending analytics and charts
- Weekly/monthly backup reminders
