import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

async function verifyAdmin(request) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
        return null
    }
    const token = authHeader.slice(7)

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error } = await adminClient.auth.getUser(token)
    if (error || !user) return null

    const { data: profile } = await adminClient
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single()

    if (profile?.user_type !== 'admin') return null
    return user
}

export async function GET(request) {
    const user = await verifyAdmin(request)
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    try {
        // Fetch all tables — no count:exact (avoids COUNT(*) timeout on free tier)
        const [usersResult, jobsResult, applicationsResult, reviewsResult, completionsResult] = await Promise.all([
            adminClient.from('users').select('id,email,first_name,last_name,phone_number,user_type,is_active,created_at').order('created_at', { ascending: false }).limit(1000),
            adminClient.from('jobs').select('id,title,description,category,budget,status,client_id,created_at').order('created_at', { ascending: false }).limit(500),
            adminClient.from('applications').select('id,job_id,worker_id,status,proposed_price,created_at').order('created_at', { ascending: false }).limit(500),
            adminClient.from('reviews').select('id,worker_id,client_id,rating,created_at').limit(500),
            adminClient.from('completions').select('id,job_id,worker_id,client_id,final_price,status,created_at').order('created_at', { ascending: false }).limit(500),
        ])

        const users = usersResult.data || []
        const jobs = jobsResult.data || []
        const applications = applicationsResult.data || []
        const completions = completionsResult.data || []
        const reviews = reviewsResult.data || []

        // Build lookup maps so jobs/applications/completions show names instead of IDs
        const userMap = {}
        users.forEach(u => { userMap[u.id] = u })
        const jobMap = {}
        jobs.forEach(j => { jobMap[j.id] = j })

        // Enrich jobs with client name
        const enrichedJobs = jobs.map(j => ({
            ...j,
            client: userMap[j.client_id]
                ? { first_name: userMap[j.client_id].first_name, last_name: userMap[j.client_id].last_name, email: userMap[j.client_id].email }
                : null
        }))

        // Enrich applications with job title and worker name
        const enrichedApplications = applications.map(a => ({
            ...a,
            job: jobMap[a.job_id] ? { title: jobMap[a.job_id].title } : null,
            worker: userMap[a.worker_id]
                ? { first_name: userMap[a.worker_id].first_name, last_name: userMap[a.worker_id].last_name, email: userMap[a.worker_id].email }
                : null
        }))

        // Enrich completions with job title, worker name, client name
        const enrichedCompletions = completions.map(c => ({
            ...c,
            job: jobMap[c.job_id] ? { title: jobMap[c.job_id].title } : null,
            worker: userMap[c.worker_id]
                ? { first_name: userMap[c.worker_id].first_name, last_name: userMap[c.worker_id].last_name }
                : null,
            client: userMap[c.client_id]
                ? { first_name: userMap[c.client_id].first_name, last_name: userMap[c.client_id].last_name }
                : null
        }))

        return NextResponse.json({
            users,
            jobs: enrichedJobs,
            applications: enrichedApplications,
            reviews,
            completions: enrichedCompletions,
            counts: {
                users: users.length,
                jobs: jobs.length,
                applications: applications.length,
                reviews: reviews.length,
                completions: completions.length,
            },
            errors: {
                users: usersResult.error?.message || null,
                jobs: jobsResult.error?.message || null,
                applications: applicationsResult.error?.message || null,
                reviews: reviewsResult.error?.message || null,
                completions: completionsResult.error?.message || null,
            }
        })
    } catch (err) {
        console.error('Admin data fetch error:', err)
        return NextResponse.json({ error: err.message || 'Failed to fetch data' }, { status: 500 })
    }
}
