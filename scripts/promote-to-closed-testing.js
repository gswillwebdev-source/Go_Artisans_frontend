/**
 * Promotes versionCode 14 from internal track to closed testing (alpha)
 * on Google Play Store using the Google Play Developer API v3.
 */
const { google } = require('googleapis')

const KEY_PATH = 'C:/Users/ADMIN/Downloads/job-seekers-app-487911-2ad4c3286e82.json'
const PACKAGE_NAME = 'online.goartisans.app'
const VERSION_CODE = '14'

async function promoteToClosedTesting() {
    console.log('🔐 Authenticating with Google Play...')
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_PATH,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    })
    const authClient = await auth.getClient()
    const androidpublisher = google.androidpublisher({ version: 'v3', auth: authClient })

    // Step 1: Create an edit
    console.log('📝 Creating Play Store edit...')
    const editResponse = await androidpublisher.edits.insert({
        packageName: PACKAGE_NAME,
    })
    const editId = editResponse.data.id
    console.log(`   Edit ID: ${editId}`)

    // Step 2: Assign versionCode 14 to closed testing (alpha) track
    console.log('🚀 Promoting to closed testing (alpha) track...')
    await androidpublisher.edits.tracks.update({
        packageName: PACKAGE_NAME,
        editId,
        track: 'alpha',
        requestBody: {
            track: 'alpha',
            releases: [
                {
                    versionCodes: [VERSION_CODE],
                    status: 'completed',
                    releaseNotes: [
                        {
                            language: 'en-US',
                            text: "GoArtisans v1.5\n\n• Browse thousands of job listings\n• Discover skilled local artisans\n• Manage your worker or client profile\n• Apply to jobs and track applications in real time\n• Job alerts, notifications and AI job-matching assistant\n• Subscription plans for enhanced visibility",
                        },
                        {
                            language: 'fr-FR',
                            text: "GoArtisans v1.5\n\n• Parcourez des milliers d'offres d'emploi\n• Découvrez des artisans locaux qualifiés\n• Gérez votre profil travailleur ou client\n• Postulez et suivez vos candidatures en temps réel\n• Alertes emploi, notifications et assistant IA\n• Plans d'abonnement pour une visibilité améliorée",
                        },
                    ],
                },
            ],
        },
    })
    console.log('   ✅ Closed testing track updated')

    // Step 3: Commit the edit
    console.log('💾 Committing edit...')
    await androidpublisher.edits.commit({
        packageName: PACKAGE_NAME,
        editId,
    })
    console.log('✅ Done! versionCode 14 promoted to closed testing (alpha).')
    console.log('   Visit https://play.google.com/console to manage testers and review.')
}

promoteToClosedTesting().catch((err) => {
    console.error('❌ Promotion failed:', err.message)
    if (err.response?.data?.error) {
        console.error('   API error:', JSON.stringify(err.response.data.error, null, 2))
    }
    process.exit(1)
})
