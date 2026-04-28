import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function GET(request) {
    try {
        // Auth check
        const authHeader = request.headers.get('authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const token = authHeader.slice(7)

        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ACCOUNT_KEY
        )

        const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch worker profile
        const { data: profile, error: profileError } = await adminClient
            .from('users')
            .select('id, first_name, last_name, job_title, location, bio, years_experience, services, user_type')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        if (profile.user_type !== 'worker') {
            return NextResponse.json({ error: 'AI job matches are only available for worker accounts.' }, { status: 403 })
        }

        // Premium gate — only premium subscribers can use AI matching
        const { data: subRows } = await adminClient.rpc('get_user_subscription', { p_user_id: user.id })
        const planId = subRows?.[0]?.plan_id || 'free'
        const planTier = planId.split('_')[1] || 'free'
        if (planTier !== 'premium') {
            return NextResponse.json(
                { error: 'AI job matching is a Premium feature. Upgrade to Premium to unlock it.', upgrade_required: true },
                { status: 403 }
            )
        }

        // Fetch jobs the worker has already applied to (to exclude them)
        const { data: appliedApps } = await adminClient
            .from('applications')
            .select('job_id')
            .eq('worker_id', user.id)

        const appliedJobIds = (appliedApps || []).map(a => a.job_id)

        // Fetch recent active jobs (up to 80 for AI scoring)
        let jobQuery = adminClient
            .from('jobs')
            .select('id, title, description, budget, location, category, created_at')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(80)

        const { data: jobs, error: jobsError } = await jobQuery
        if (jobsError) {
            return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
        }

        // Filter out already-applied jobs
        const unappliedJobs = (jobs || []).filter(j => !appliedJobIds.includes(j.id))

        if (unappliedJobs.length === 0) {
            return NextResponse.json({ matches: [] })
        }

        // Build profile summary for AI
        const profileSummary = [
            profile.job_title && `Role: ${profile.job_title}`,
            profile.location && `Location: ${profile.location}`,
            profile.years_experience && `Experience: ${profile.years_experience} years`,
            profile.services && `Services/Skills: ${profile.services}`,
            profile.bio && `Bio: ${profile.bio.slice(0, 300)}`,
        ].filter(Boolean).join('\n')

        // Build job list for AI (trim descriptions to keep token count low)
        const jobList = unappliedJobs.slice(0, 40).map((j, i) =>
            `[${i}] ID:${j.id} | Title: ${j.title} | Category: ${j.category || 'General'} | Location: ${j.location || 'Any'} | Budget: ${j.budget || 'Negotiable'} | Description: ${(j.description || '').slice(0, 150)}`
        ).join('\n')

        // Ask Groq to score and rank
        const prompt = `You are a job matching AI. Given a worker profile and a list of jobs, return the top matching jobs ranked by relevance.

WORKER PROFILE:
${profileSummary}

JOB LIST (format: [index] ID:... | Title:... | ...):
${jobList}

Task: Return ONLY a valid JSON array of the top 10 matches. Each object must have:
- "index": the index number from the job list (integer)
- "score": match score 0-100 (integer)
- "reason": one concise sentence explaining why this job fits the worker (max 15 words)

Rules:
- Only include jobs that are a good fit (score >= 50)
- Sort descending by score
- Return ONLY the JSON array, no other text, no markdown fences`

        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 800,
        })

        const raw = completion.choices[0]?.message?.content?.trim() || '[]'

        // Safely parse AI response
        let ranked = []
        try {
            // Strip any accidental markdown fences
            const cleaned = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim()
            ranked = JSON.parse(cleaned)
            if (!Array.isArray(ranked)) ranked = []
        } catch (_) {
            console.error('[AI Job Matches] Failed to parse AI response:', raw)
            ranked = []
        }

        // Map back to full job objects
        const matches = ranked
            .filter(r => typeof r.index === 'number' && unappliedJobs[r.index])
            .slice(0, 10)
            .map(r => ({
                ...unappliedJobs[r.index],
                match_score: Math.min(100, Math.max(0, r.score || 0)),
                match_reason: r.reason || 'Good fit based on your profile',
            }))

        return NextResponse.json({ matches })
    } catch (err) {
        console.error('[AI Job Matches] Error:', err)
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
