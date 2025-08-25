import { supabase } from './supabase'

// Salvar dashboards do usuário autenticado
export const saveDashboards = async (dashboards) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Usuário não autenticado' }

    const { data, error } = await supabase
      .from('dashboards')
      .upsert({
        user_id: user.id,
        data: dashboards,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (error) return { error }
    return { data }
  } catch (error) {
    return { error }
  }
}

// Carregar dashboards do usuário autenticado
export const loadDashboards = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('dashboards')
      .select('data, updated_at')
      .eq('user_id', user.id)
      .single()

    if (error) return null
    return data?.data || null
  } catch (error) {
    return null
  }
}

// Sincronização em tempo real por usuário
export const subscribeToChanges = (callback) => {
  const channel = supabase
    .channel('dashboards-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dashboards' }, (payload) => {
      if (payload.new?.data) callback(payload.new.data)
    })
    .subscribe()
  return channel
}

// Info de última atualização
export const getLastUpdateInfo = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('dashboards')
      .select('updated_at')
      .eq('user_id', user.id)
      .single()
    if (error) return null
    return data
  } catch (e) {
    return null
  }
}

// -------------------- Múltiplos dashboards por usuário --------------------

// Lista dashboards onde o usuário é dono
export const listOwnedDashboards = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('dashboards')
    .select('id,name,updated_at,is_public,public_slug')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// Lista dashboards onde o usuário é membro
export const listMemberDashboards = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('dashboard_members')
    .select('role,dashboards(id,name,updated_at,is_public,public_slug)')
    .eq('user_id', user.id);
  if (error) return [];
  return (data || []).map((r) => ({ role: r.role, ...r.dashboards }));
}

export const createDashboard = async (name, initialData = []) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado' }
  const { data, error } = await supabase
    .from('dashboards')
    .insert({ owner_id: user.id, user_id: user.id, name: name || 'Novo dashboard', data: initialData })
    .select('id')
    .single();
  return { data, error };
}

export const renameDashboard = async (dashboardId, name) => {
  const { error } = await supabase
    .from('dashboards')
    .update({ name })
    .eq('id', dashboardId);
  return { error };
}

export const deleteDashboardById = async (dashboardId) => {
  const { error } = await supabase
    .from('dashboards')
    .delete()
    .eq('id', dashboardId);
  return { error };
}

export const getDashboard = async (dashboardId) => {
  const { data, error } = await supabase
    .from('dashboards')
    .select('id,name,data,updated_at,is_public,public_slug,owner_id')
    .eq('id', dashboardId)
    .single();
  if (error) return null;
  return data;
}

export const saveDashboardData = async (dashboardId, dataJson) => {
  const { data, error } = await supabase
    .from('dashboards')
    .update({ data: dataJson, updated_at: new Date().toISOString() })
    .eq('id', dashboardId)
    .select('updated_at')
    .single();
  return { data, error };
}

export const getDashboardBySlug = async (slug) => {
  const { data, error } = await supabase
    .from('dashboards')
    .select('id,name,data,updated_at,is_public,public_slug,owner_id')
    .eq('public_slug', slug)
    .eq('is_public', true)
    .single();
  if (error) return null;
  return data;
}

export const togglePublic = async (dashboardId, makePublic) => {
  let patch = { is_public: !!makePublic };
  if (makePublic) {
    patch.public_slug = Math.random().toString(36).slice(2, 10);
  } else {
    patch.public_slug = null;
  }
  const { error } = await supabase
    .from('dashboards')
    .update(patch)
    .eq('id', dashboardId);
  return { error };
}

// Perfis: manter tabela profiles para lookup por email
export const upsertProfile = async (user) => {
  if (!user) return;
  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || null,
    avatar_url: user.user_metadata?.avatar_url || null,
    updated_at: new Date().toISOString(),
  });
}

export const addMemberByEmail = async (dashboardId, email, role = 'viewer') => {
  const { data: prof } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();
  if (!prof?.id) return { error: 'Usuário não encontrado' };
  const { error } = await supabase
    .from('dashboard_members')
    .upsert({ dashboard_id: dashboardId, user_id: prof.id, role }, { onConflict: 'dashboard_id,user_id' });
  return { error };
}

export const listMembers = async (dashboardId) => {
  const { data, error } = await supabase
    .from('dashboard_members')
    .select('user_id,role,profiles:profiles(id,email,full_name,avatar_url)')
    .eq('dashboard_id', dashboardId);
  if (error) return [];
  return data || [];
}

export const removeMember = async (dashboardId, userId) => {
  const { error } = await supabase
    .from('dashboard_members')
    .delete()
    .eq('dashboard_id', dashboardId)
    .eq('user_id', userId);
  return { error };
}
