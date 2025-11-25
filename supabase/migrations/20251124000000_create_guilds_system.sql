-- Sistema de Guildas GitRats
-- Criado em: 24/11/2025

-- Tabela de guildas
CREATE TABLE IF NOT EXISTS public.guilds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  tag TEXT UNIQUE CHECK (LENGTH(tag) <= 6),
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  total_members INTEGER DEFAULT 1,
  total_xp BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de membros da guilda
CREATE TABLE IF NOT EXISTS public.guild_members (
  guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  PRIMARY KEY (guild_id, user_id)
);

-- Tabela de convites pendentes
CREATE TABLE IF NOT EXISTS public.guild_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(guild_id, invited_user_id, status)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_guild_members_user_id ON public.guild_members(user_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild_id ON public.guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_invites_invited_user ON public.guild_invites(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_guild_invites_guild ON public.guild_invites(guild_id);
CREATE INDEX IF NOT EXISTS idx_guilds_total_xp ON public.guilds(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_guilds_owner ON public.guilds(owner_id);

-- RLS (Row Level Security)
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_invites ENABLE ROW LEVEL SECURITY;

-- Políticas para guilds
CREATE POLICY "Todos podem ver guildas" 
  ON public.guilds FOR SELECT 
  USING (true);

CREATE POLICY "Usuários autenticados podem criar guilda" 
  ON public.guilds FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

CREATE POLICY "Owner pode atualizar guilda" 
  ON public.guilds FOR UPDATE 
  USING (owner_id = auth.uid());

CREATE POLICY "Owner pode deletar guilda" 
  ON public.guilds FOR DELETE 
  USING (owner_id = auth.uid());

-- Políticas para guild_members
CREATE POLICY "Todos podem ver membros" 
  ON public.guild_members FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados podem inserir membros" 
  ON public.guild_members FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owner/Admin podem remover membros" 
  ON public.guild_members FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members gm 
      WHERE gm.guild_id = guild_members.guild_id 
      AND gm.user_id = auth.uid() 
      AND gm.role IN ('owner', 'admin')
    )
    OR user_id = auth.uid()
  );

-- Políticas para guild_invites
CREATE POLICY "Usuários podem ver seus convites" 
  ON public.guild_invites FOR SELECT 
  USING (invited_user_id = auth.uid());

CREATE POLICY "Usuarios autenticados podem enviar convites" 
  ON public.guild_invites FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL AND invited_by = auth.uid());

CREATE POLICY "Sistema pode atualizar convites" 
  ON public.guild_invites FOR UPDATE 
  USING (true);

-- Função para atualizar total_xp da guilda
CREATE OR REPLACE FUNCTION update_guild_total_xp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.guilds
  SET total_xp = (
    SELECT COALESCE(SUM(c.total_xp), 0)
    FROM public.guild_members gm
    JOIN public.characters c ON c.user_id = gm.user_id
    WHERE gm.guild_id = NEW.guild_id
  ),
  total_members = (
    SELECT COUNT(*)
    FROM public.guild_members
    WHERE guild_id = NEW.guild_id
  ),
  updated_at = NOW()
  WHERE id = NEW.guild_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar XP quando membro entra
CREATE TRIGGER trigger_update_guild_xp_on_member_join
AFTER INSERT ON public.guild_members
FOR EACH ROW
EXECUTE FUNCTION update_guild_total_xp();

-- Trigger para atualizar XP quando membro sai
CREATE OR REPLACE FUNCTION update_guild_total_xp_on_leave()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.guilds
  SET total_xp = (
    SELECT COALESCE(SUM(c.total_xp), 0)
    FROM public.guild_members gm
    JOIN public.characters c ON c.user_id = gm.user_id
    WHERE gm.guild_id = OLD.guild_id
  ),
  total_members = (
    SELECT COUNT(*)
    FROM public.guild_members
    WHERE guild_id = OLD.guild_id
  ),
  updated_at = NOW()
  WHERE id = OLD.guild_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_guild_xp_on_member_leave
AFTER DELETE ON public.guild_members
FOR EACH ROW
EXECUTE FUNCTION update_guild_total_xp_on_leave();

-- Constraint: Usuário pode estar em apenas 1 guilda
CREATE UNIQUE INDEX idx_one_guild_per_user ON public.guild_members(user_id);

-- Comentários
COMMENT ON TABLE public.guilds IS 'Tabela de guildas - agrupamento de jogadores';
COMMENT ON TABLE public.guild_members IS 'Membros das guildas';
COMMENT ON TABLE public.guild_invites IS 'Convites pendentes para guildas';
