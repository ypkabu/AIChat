alter table public.app_settings
  add column if not exists normal_conversation_provider text not null default 'openai',
  add column if not exists normal_conversation_model text not null default 'gpt-4.1-mini',
  add column if not exists nsfw_conversation_provider text not null default 'openai',
  add column if not exists nsfw_conversation_model text not null default 'gpt-4.1-mini',
  add column if not exists cheap_conversation_provider text not null default 'openai',
  add column if not exists cheap_conversation_model text not null default 'gpt-4.1-mini',
  add column if not exists smart_conversation_provider text not null default 'openai',
  add column if not exists smart_conversation_model text not null default 'gpt-4.1',
  add column if not exists standard_image_provider text not null default 'mock',
  add column if not exists standard_image_model text not null default 'mock-standard-image',
  add column if not exists nsfw_image_provider text not null default 'mock',
  add column if not exists nsfw_image_model text not null default 'mock-private-nsfw-image',
  add column if not exists smart_model_for_major_event boolean not null default true,
  add column if not exists auto_switch_when_budget_low boolean not null default true;

alter table public.usage_logs
  add column if not exists provider text,
  add column if not exists model text,
  add column if not exists image_count integer not null default 0;

update public.usage_logs
set provider = coalesce(provider, split_part(backend, ':', 1)),
    model = coalesce(nullif(model, ''), nullif(split_part(backend, ':', 2), ''))
where provider is null or model is null;
