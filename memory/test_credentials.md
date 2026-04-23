# Test Credentials for apodixxi

## Admin Dashboard (NEW!)
- **URL:** `/api/admin/dashboard` (Web Dashboard - accessible via browser)
- **Username:** `admin`
- **Password:** `admin2024!`

### Admin Dashboard Features:
- Επισκόπηση (Overview): Στατιστικά εφαρμογής
- Αποδείξεις: Διαχείριση & Excel Export
- Χρήστες: Λίστα χρηστών & αναβάθμιση σε Premium
- Προωθήσεις: Promoted προϊόντα στις προτάσεις
- Promo Codes: Κωδικοί για δωρεάν Premium

## Test User Account
- **Email:** `test@example.com`
- **Password:** `password123`

## Email Notifications
- **Admin Email:** `admin@example.com` (configurable in backend/.env)
- **SMTP:** Not configured yet (set SMTP_USER and SMTP_PASSWORD in backend/.env)

## Phone OTP (Firebase)
- Real SMS via Firebase Phone Auth
- Configure in `/app/frontend/src/firebase.ts`

## App Users
- Users must register/login before using the app
- Authentication methods: Email/Password, Google, Apple, Facebook, Phone

## .env Configuration (backend/.env)
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin2024!
ADMIN_EMAIL=admin@example.com
JWT_SECRET_KEY=apodixxi-super-secret-key-change-in-production-2024
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

**To enable email notifications:**
1. Set your Gmail/SMTP credentials in backend/.env
2. For Gmail, use App Password (not your regular password)
