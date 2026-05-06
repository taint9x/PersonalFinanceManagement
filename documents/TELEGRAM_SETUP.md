# Telegram Setup Guide

This guide helps you configure automatic monthly report messages via Telegram.

## Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send: `/newbot`
3. Choose a name: e.g., "My Finance Bot"
4. Choose a username: e.g., "myfinance_report_bot" (must end in 'bot')
5. BotFather gives you a token like:
   `1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi`
6. Copy this token → set as `TELEGRAM_BOT_TOKEN` in `.env`

## Step 2: Get your Chat ID

### Method A: Use @userinfobot
1. Search Telegram for **@userinfobot**
2. Start a chat and send `/start`
3. It replies with your user ID (a number like 987654321)
4. This number is your `TELEGRAM_CHAT_ID`

### Method B: Use the Bot API directly
1. First, send any message to your new bot (search it by username)
2. Open this URL in browser (replace TOKEN with yours):
   `https://api.telegram.org/bot{TOKEN}/getUpdates`
3. Find `"chat"` → `"id"` in the JSON response
4. That number is your `TELEGRAM_CHAT_ID`

## Step 3: Update your .env file
```
TELEGRAM_BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi
TELEGRAM_CHAT_ID=987654321
```

## Step 4: Authorize your bot
**Important:** You must start a conversation with your bot FIRST.
1. Search for your bot by username in Telegram
2. Click **START** (or send `/start`)
3. The bot can now send you messages

## Step 5: Restart and test
```
docker compose restart backend
```

Go to app → Lịch Sử Báo Cáo → Gửi Báo Cáo Thủ Công → select month → confirm.
Check your Telegram for the message (usually instant).

---

## Troubleshooting

**No message received after test**
→ Make sure you sent `/start` to your bot (Step 4 above).
→ Verify `TELEGRAM_CHAT_ID` is correct (should be a number, not a username).

**"Unauthorized" error in logs**
→ `TELEGRAM_BOT_TOKEN` is incorrect. Re-check with @BotFather → `/mybots`.

**"Chat not found" error**
→ You haven't started the bot yet. Send `/start` to your bot first.

**Bot token security**
→ Never share your bot token publicly.
→ If compromised: go to @BotFather → `/revoke` → get new token → update `.env`.

---

## How the Reports Look

Monthly reports are sent as formatted Telegram messages:

```
📅 Báo Cáo Tài Chính — Tháng 04/2025

💰 TỔNG THU NHẬP:    15,000,000 ₫
💸 TỔNG CHI TIÊU:     3,500,000 ₫
💳 TỔNG TRẢ NỢ:       3,500,000 ₫
📊 DÒNG TIỀN RÒNG:  +8,000,000 ₫

✅ Đã xử lý: 5 / 8 khoản

--- TOP CHI TIÊU ---
1. YouTube Premium — 79,000 ₫ ✅
2. Điện nước — 350,000 ₫ ❌
...
```

---

## Scheduler Behavior Reference

| Setting | Behavior |
|---|---|
| `SCHEDULER_ENABLED=true` | Auto-sends on last day of month at 22:00 (Asia/Ho_Chi_Minh) |
| `SCHEDULER_ENABLED=false` | No auto-send; manual send still works via app |
| Email disabled (empty vars) | Email channel skipped; Telegram still works |
| Telegram disabled (empty vars) | Telegram channel skipped; Email still works |
| Both disabled | Manual send button shows error; auto-send is no-op |

The app sends via both channels independently — if Email fails, Telegram still sends (and vice versa). Each attempt is logged separately in notification history.
