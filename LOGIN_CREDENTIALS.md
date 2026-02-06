# 🔑 Test Login Credentials

## Waiter Web App Access

**URL:** https://sabanti.tech/waiter/

### Test Waiter Account

- **📱 Телефон:** `+7 (999) 999-99-99` (любой формат, автоформатирование)
- **🔒 Пароль:** `waiter123`
- **👤 Имя:** Тест Официант
- **🏪 Ресторан:** Richy Richy

## How to Login

1. Open https://sabanti.tech/waiter/
2. Enter phone number: **+7 (999) 999-99-99**
3. Enter password: **waiter123**
4. Click "Войти" (Login)

## Features Available

After login you can:

✅ **Scan QR codes** - Click "Сканировать гостя" to use camera
✅ **Search by phone** - Click "Ввести телефон вручную" for manual search  
✅ **View guest profiles** - Complete history and preferences
✅ **Start visits** - Begin service for seated guests
✅ **Apply offers** - Personalized promotions
✅ **Add notes** - Observations about guests
✅ **Manage active tables** - Track ongoing service

## Restaurant Configuration

- **Restaurant ID:** `b5eb9327-a738-446c-b097-acc7f3332381`
- **Restaurant Name:** Richy Richy
- **Configuration File:** `/var/www/sabanti_tech/html/waiter/config.js`

## Creating Additional Staff

To create more staff members, use PostgreSQL:

```sql
docker exec nook-postgres psql -U nook_user -d nook_db -c "
INSERT INTO staff_members (
  id, restaurant_id, phone, name, password_hash, 
  role, permissions, is_active, created_at
) VALUES (
  gen_random_uuid(),
  'b5eb9327-a738-446c-b097-acc7f3332381',
  '+7 (999) 123-45-67',  -- NEW PHONE NUMBER
  'Staff Name',          -- NEW NAME
  crypt('password123', gen_salt('bf')),  -- NEW PASSWORD
  'waiter',
  '[\"view_guests\", \"add_notes\", \"apply_offers\"]'::json,
  true,
  NOW()
);
"
```

## Troubleshooting

**Camera not working?**
- Ensure HTTPS is used (required for camera access)
- Allow camera permissions in browser
- Try different browsers (Chrome recommended)

**Login fails?**
- Double-check phone number format: `+7 (999) 999-99-99`
- Password is case-sensitive: `waiter123`
- Check browser console for error messages

**No guests found?**
- Create test guests first using admin panel
- Generate QR codes for testing
- Use manual phone search as fallback

---

Ready to use! 🚀