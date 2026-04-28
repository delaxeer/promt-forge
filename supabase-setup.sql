-- ========================================
-- PromptForge — Supabase Setup
-- ========================================
-- Выполни этот SQL в Supabase Dashboard:
-- SQL Editor → New Query → вставь → Run
-- ========================================

-- 1. Создаём таблицу шаблонов
CREATE TABLE templates (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category   TEXT NOT NULL CHECK (category IN ('photo', 'video')),
  model      TEXT NOT NULL CHECK (model IN ('nana', 'gpt2', 'kling', 'sora2')),
  mode       TEXT NOT NULL CHECK (mode IN ('create', 'edit')),
  name       TEXT NOT NULL,
  template   TEXT NOT NULL,
  author     TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Включаем Row Level Security
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 3. Разрешаем всем ЧИТАТЬ шаблоны
CREATE POLICY "Anyone can read templates"
  ON templates FOR SELECT
  USING (true);

-- 4. Разрешаем всем ДОБАВЛЯТЬ шаблоны
CREATE POLICY "Anyone can insert templates"
  ON templates FOR INSERT
  WITH CHECK (true);

-- 5. Индекс для быстрой фильтрации
CREATE INDEX idx_templates_filter
  ON templates (category, model, mode);

-- Готово! Теперь подставь URL и anon key в app.js
