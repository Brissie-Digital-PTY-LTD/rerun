-- WhatsApp Pro had no logo, so every place drawing it fell back to a generic glyph. The asset is the
-- Simple Icons WhatsApp mark, already in the service-icons bucket.
update public.services
set icon = '/services/whatsapp.svg?v=1792416753128'
where slug = 'whatsapp-pro' and icon is null;
