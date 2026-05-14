alter table public.app_settings
  alter column normal_conversation_provider set default 'anthropic',
  alter column normal_conversation_model set default 'claude-sonnet-4-5',
  alter column nsfw_conversation_provider set default 'anthropic',
  alter column nsfw_conversation_model set default 'claude-sonnet-4-5',
  alter column cheap_conversation_provider set default 'anthropic',
  alter column cheap_conversation_model set default 'claude-sonnet-4-5',
  alter column smart_conversation_provider set default 'anthropic',
  alter column smart_conversation_model set default 'claude-opus-4-5',
  alter column director_provider set default 'anthropic',
  alter column director_model set default 'claude-sonnet-4-5',
  alter column smart_reply_provider set default 'anthropic',
  alter column smart_reply_model set default 'claude-sonnet-4-5',
  alter column summary_provider set default 'anthropic',
  alter column summary_model set default 'claude-sonnet-4-5',
  alter column image_prompt_provider set default 'anthropic',
  alter column image_prompt_model set default 'claude-sonnet-4-5';

update public.app_settings
set
  normal_conversation_backend = case when normal_conversation_backend = 'openai' then 'anthropic' else normal_conversation_backend end,
  nsfw_conversation_backend = case when nsfw_conversation_backend = 'openai' then 'anthropic' else nsfw_conversation_backend end,
  normal_conversation_provider = case when normal_conversation_provider = 'openai' then 'anthropic' else normal_conversation_provider end,
  normal_conversation_model = case when normal_conversation_provider = 'openai' or normal_conversation_model in ('gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini') then 'claude-sonnet-4-5' else normal_conversation_model end,
  nsfw_conversation_provider = case when nsfw_conversation_provider = 'openai' then 'anthropic' else nsfw_conversation_provider end,
  nsfw_conversation_model = case when nsfw_conversation_provider = 'openai' or nsfw_conversation_model in ('gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini') then 'claude-sonnet-4-5' else nsfw_conversation_model end,
  cheap_conversation_provider = case when cheap_conversation_provider = 'openai' then 'anthropic' else cheap_conversation_provider end,
  cheap_conversation_model = case when cheap_conversation_provider = 'openai' or cheap_conversation_model in ('gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini') then 'claude-sonnet-4-5' else cheap_conversation_model end,
  smart_conversation_provider = case when smart_conversation_provider = 'openai' then 'anthropic' else smart_conversation_provider end,
  smart_conversation_model = case when smart_conversation_provider = 'openai' or smart_conversation_model in ('gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini') then 'claude-opus-4-5' else smart_conversation_model end,
  director_provider = case when director_provider = 'openai' then 'anthropic' else director_provider end,
  director_model = case when director_provider = 'openai' or director_model in ('gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini') then 'claude-sonnet-4-5' else director_model end,
  smart_reply_provider = case when smart_reply_provider = 'openai' then 'anthropic' else smart_reply_provider end,
  smart_reply_model = case when smart_reply_provider = 'openai' or smart_reply_model in ('gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini') then 'claude-sonnet-4-5' else smart_reply_model end,
  summary_provider = case when summary_provider = 'openai' then 'anthropic' else summary_provider end,
  summary_model = case when summary_provider = 'openai' or summary_model in ('gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini') then 'claude-sonnet-4-5' else summary_model end,
  image_prompt_provider = case when image_prompt_provider = 'openai' then 'anthropic' else image_prompt_provider end,
  image_prompt_model = case when image_prompt_provider = 'openai' or image_prompt_model in ('gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini') then 'claude-sonnet-4-5' else image_prompt_model end,
  model_preset = case when model_preset = 'balanced' then 'custom' else model_preset end,
  updated_at = now();

grant select, insert, update, delete on public.app_settings to authenticated;
