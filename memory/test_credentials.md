# Test Credentials for apodixxi

## Admin Dashboard
- **URL:** `/api/admin-panel` (Web Dashboard - accessible via browser)
- **Password:** `admin2024!`

## Test User Account
- **Email:** `test@example.com`
- **Password:** `password123`

## Email Notifications
- **Admin Email:** `admin@example.com` (configurable in backend/.env)
- **SMTP:** Not configured yet (set SMTP_USER and SMTP_PASSWORD in backend/.env)

## Phone OTP (Mock)
- OTP codes are logged in backend console during development
- Will be sent via SMS in production (Twilio/Firebase)

## App Users
- Users must register/login before using the app
- Authentication methods: Email/Password, Google, Apple, Facebook, Phone

## .env Configuration (backend/.env)
```
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
