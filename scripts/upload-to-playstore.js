/**
 * Uploads the Capacitor release AAB to Google Play Store (internal track)
 * using the Google Play Developer API v3.
 */
const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')

const AAB_PATH = path.resolve(
    __dirname,
    '../frontend/frontend/frontend/android/app/build/outputs/bundle/release/app-release.aab'
)
const KEY_PATH = 'C:/Users/ADMIN/Downloads/job-seekers-app-487911-2ad4c3286e82.json'
const PACKAGE_NAME = 'online.goartisans.app'

async function uploadToPlayStore() {
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

    // Step 2: Upload the AAB
    console.log('📦 Uploading AAB file...')
    const aabSize = (fs.statSync(AAB_PATH).size / 1024 / 1024).toFixed(2)
    console.log(`   File: ${AAB_PATH}`)
    console.log(`   Size: ${aabSize} MB`)

    const uploadResponse = await androidpublisher.edits.bundles.upload({
        packageName: PACKAGE_NAME,
        editId,
        media: {
            mimeType: 'application/octet-stream',
            body: fs.createReadStream(AAB_PATH),
        },
    })
    const versionCode = uploadResponse.data.versionCode
    console.log(`   ✅ AAB uploaded — versionCode: ${versionCode}`)

    // Step 3: Assign to internal track (required before production)
    console.log('🚀 Assigning to internal track...')
    await androidpublisher.edits.tracks.update({
        packageName: PACKAGE_NAME,
        editId,
        track: 'internal',
        requestBody: {
            track: 'internal',
            releases: [
                {
                    versionCodes: [String(versionCode)],
                    status: 'draft',
                    releaseNotes: [
                        {
                            language: 'en-US',
                            text: "Initial release of the GoArtisans app.\n\n• Browse thousands of job listings\n• Discover skilled local artisans\n• Manage your worker or client profile\n• Apply to jobs and track applications in real time\n• Job alerts, notifications and AI job-matching assistant\n• Subscription plans for enhanced visibility",
                        },
                        {
                            language: 'fr-FR',
                            text: "Première version de l'application GoArtisans.\n\n• Parcourez des milliers d'offres d'emploi\n• Découvrez des artisans locaux qualifiés\n• Gérez votre profil travailleur ou client\n• Postulez et suivez vos candidatures en temps réel\n• Alertes emploi, notifications et assistant IA\n• Plans d'abonnement pour une visibilité améliorée",
                        },
                    ],
                },
            ],
        },
    })
    console.log('   ✅ Track updated')

    // Step 4: Commit the edit
    console.log('💾 Committing edit...')
    await androidpublisher.edits.commit({
        packageName: PACKAGE_NAME,
        editId,
    })
    console.log('✅ Done! AAB successfully uploaded to Play Store internal track.')
    console.log('   Visit https://play.google.com/console to review and promote to production.')
}

uploadToPlayStore().catch((err) => {
    console.error('❌ Upload failed:', err.message)
    if (err.response?.data?.error) {
        console.error('   API error:', JSON.stringify(err.response.data.error, null, 2))
    }
    process.exit(1)
})
