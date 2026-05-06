# Email Setup Guide

This guide helps you configure the automatic monthly report email.

## Option A: Gmail (Recommended for personal use)

### Step 1: Enable 2-Factor Authentication on your Google account
1. Go to myaccount.google.com
2. Security → 2-Step Verification → Enable

### Step 2: Create an App Password
1. Go to myaccount.google.com → Security
2. Under "2-Step Verification" → click "App passwords"
3. Select app: "Mail", Select device: "Other" → type "FinanceApp"
4. Click Generate → Google gives you a 16-character password
5. Copy this password (you won't see it again)

### Step 3: Update your .env file
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.gmail@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx   ← the 16-char app password (spaces ok)
SMTP_FROM=your.gmail@gmail.com
REPORT_TO_EMAIL=your.gmail@gmail.com
```

### Step 4: Restart the backend
```
docker compose restart backend
```

### Step 5: Test
Go to the app → Lịch Sử Báo Cáo → Gửi Báo Cáo Thủ Công → select a month → confirm.
Check your email inbox (may take 1–2 minutes).

---

## Option B: Other SMTP Providers

### Outlook / Hotmail
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your@outlook.com
SMTP_PASSWORD=your-account-password
```

### Zoho Mail
```
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=your@zohomail.com
SMTP_PASSWORD=your-zoho-password
```

### Custom SMTP (self-hosted)
Fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` with your server details.

---

## Troubleshooting

**"Authentication failed"**
→ For Gmail: Make sure you're using App Password, NOT your regular Google password.

**"Connection timeout"**
→ Check if your Docker host allows outbound SMTP (port 587). Some VPS providers block this.
→ Try `SMTP_PORT=465` as alternative.

**Emails going to spam**
→ Check that `SMTP_FROM` matches `SMTP_USER`.
→ Consider setting up SPF/DKIM records for your domain.

**Test without sending**
→ Set `SCHEDULER_ENABLED=false` and use the "Gửi Thủ Công" button to test.
