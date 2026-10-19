-- Allow hero MP4 media alongside existing image uploads.
update storage.buckets set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif','image/gif','video/mp4'], file_size_limit = greatest(coalesce(file_size_limit, 0), 52428800) where id = 'banners';
