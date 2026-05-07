import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user identity via their JWT
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // Admin client to perform privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Block deletion if user owns a club (cascade would destroy the club)
    const { data: ownedClubs, error: clubsError } = await supabaseAdmin
      .from('clubs')
      .select('id')
      .eq('owner_id', userId)

    if (clubsError) throw new Error(clubsError.message)

    if (ownedClubs && ownedClubs.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'club_owner',
          message: "Vous êtes propriétaire d'un club. Supprimez d'abord votre club depuis l'application avant de supprimer votre compte.",
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get teams owned by user to delete their storage files
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('id, club_id')
      .eq('owner_id', userId)

    if (teamsError) throw new Error(teamsError.message)

    // Delete storage files for each owned team
    if (teams && teams.length > 0) {
      for (const team of teams) {
        const folderPath = `club-${team.club_id}/team-${team.id}`
        const { data: files } = await supabaseAdmin.storage
          .from('clubs')
          .list(folderPath)

        if (files && files.length > 0) {
          const filePaths = files.map((f: { name: string }) => `${folderPath}/${f.name}`)
          await supabaseAdmin.storage.from('clubs').remove(filePaths)
        }
      }
    }

    // Remove admin entry if present
    await supabaseAdmin.from('admins').delete().eq('user_id', userId)

    // Delete the auth user — cascades: club_members, teams, players
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteError) throw new Error(deleteError.message)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
