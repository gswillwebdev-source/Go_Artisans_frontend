import fs from 'fs'
import path from 'path'

const envPath = path.resolve('.env.local')
const envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''

const getEnv = (key) => {
    const pattern = new RegExp(`^${key}=(.*)$`, 'm')
    const match = envText.match(pattern)
    if (match) {
        return match[1].trim().replace(/^"|"$/g, '')
    }
    return process.env[key]
}

const url = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const key = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if (!url || !key) {
    console.log('SUPABASE_ENV_MISSING')
    process.exit(0)
}

const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
}

const authHealth = await fetch(`${url}/auth/v1/health`)
console.log('SUPABASE_AUTH_HEALTH', authHealth.status)

const users = await fetch(`${url}/rest/v1/users?select=id&limit=1`, { headers })
console.log('SUPABASE_USERS_QUERY', users.status)

const jobs = await fetch(`${url}/rest/v1/jobs?select=id&limit=1`, { headers })
console.log('SUPABASE_JOBS_QUERY', jobs.status)
