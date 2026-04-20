# Test Credentials for GroceryTracker

## Admin Dashboard
- **URL:** `/admin` (Web Dashboard - accessible via browser)
- **Password:** `admin2024!`

## Email Notifications
- **Admin Email:** `admin@example.com` (configurable in backend/.env)
- **SMTP:** Not configured yet (set SMTP_USER and SMTP_PASSWORD in backend/.env)

## App Users
- Device IDs are auto-generated (anonymous users)
- No login required for regular app usage

## .env Configuration (backend/.env)
```
ADMIN_PASSWORD=admin2024!
ADMIN_EMAIL=admin@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
```

**To enable email notifications:**
1. Set your Gmail/SMTP credentials in backend/.env
2. For Gmail, use App Password (not your regular password)
