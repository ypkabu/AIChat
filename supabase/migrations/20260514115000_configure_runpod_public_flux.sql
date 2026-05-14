update public.app_settings
set
  standard_image_backend = 'runpod',
  standard_image_provider = 'runpod',
  standard_image_model = 'black-forest-labs-flux-1-dev',
  updated_at = now()
where standard_image_provider is null
   or lower(standard_image_provider) like 'mock%';
