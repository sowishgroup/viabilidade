-- =============================================================================
-- SOWISH VIABILIDADE – Setup completo do banco no Supabase
--
-- USO: Crie um NOVO projeto no Supabase na região desejada (ex: South America
--      São Paulo). Depois: SQL Editor → New query → cole este arquivo → Run.
-- Pode rodar mais de uma vez no mesmo projeto (idempotente).
-- =============================================================================

-- 1) TABELA PROFILES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 3,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  full_name text,
  avatar_url text,
  phone text,
  especialidade text,
  email text,
  cpf_cnpj text
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS main_specialty text;

-- 2) FUNÇÃO is_admin (evita recursão em RLS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 3) RLS – PROFILES
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users (own row)" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users (own row)"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- 4) TRIGGER – criar perfil ao criar usuário em auth.users
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, credits, role, email)
  VALUES (NEW.id, 3, 'user', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5) TABELA CONSULTAS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consultas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  area_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  markdown text,
  relatorio text,
  imagem_url text,
  instalacoes_tecnicas text,
  especialidade text,
  num_salas integer,
  tem_anestesia boolean,
  equipe_admin integer
);

-- 6) RLS – CONSULTAS
-- -----------------------------------------------------------------------------
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own consultas" ON public.consultas;
DROP POLICY IF EXISTS "Users can insert own consultas" ON public.consultas;
DROP POLICY IF EXISTS "Admins can read all consultas" ON public.consultas;

CREATE POLICY "Users can read own consultas"
  ON public.consultas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consultas"
  ON public.consultas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all consultas"
  ON public.consultas FOR SELECT
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS consultas_user_id_idx ON public.consultas (user_id);
CREATE INDEX IF NOT EXISTS consultas_created_at_idx ON public.consultas (created_at DESC);

-- 7) TABELA SYSTEM_SETTINGS (admin)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users (id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can insert system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can update system_settings" ON public.system_settings;

CREATE POLICY "Admins can read system_settings"
  ON public.system_settings FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert system_settings"
  ON public.system_settings FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update system_settings"
  ON public.system_settings FOR UPDATE
  USING (public.is_admin());

-- 8) STORAGE – bucket avatars
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true);
  END IF;
END $$;

DROP POLICY IF EXISTS "Avatar images are publicly readable" ON storage.objects;
CREATE POLICY "Avatar images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 9) Garantir permissões no schema (caso o projeto não tenha)
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.consultas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.system_settings TO authenticated;

-- Fim. Recarregue o app e faça login de novo.
