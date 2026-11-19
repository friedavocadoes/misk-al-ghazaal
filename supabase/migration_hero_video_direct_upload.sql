-- Direct source uploads can be MP4, MOV or WebM before server-side conversion.
-- Preserve any additional MIME types and larger file-size limits configured by the owner.
update storage.buckets
set allowed_mime_types = case
      when allowed_mime_types is null then null
      else array(
        select distinct mime
        from unnest(allowed_mime_types || array[
          'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'
        ]) as mime
      )
    end,
    file_size_limit = greatest(coalesce(file_size_limit, 0), 52428800)
where id = 'banners';
