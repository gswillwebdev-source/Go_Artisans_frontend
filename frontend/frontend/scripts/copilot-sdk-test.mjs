import { CopilotClient, approveAll } from '@github/copilot-sdk'

const client = new CopilotClient({ logLevel: 'info' })

try {
    await client.start()
    console.log('COPILOT_SDK_STARTED')

    const session = await client.createSession({
        model: 'gpt-5',
        onPermissionRequest: approveAll,
    })

    console.log('SESSION_CREATED', session.sessionId)

    let finalMessage = ''

    session.on('assistant.message_delta', (event) => {
        const delta = event?.data?.deltaContent || ''
        process.stdout.write(delta)
    })

    session.on('assistant.message', (event) => {
        finalMessage = event?.data?.content || finalMessage
        console.log('\nASSISTANT_MESSAGE_RECEIVED')
    })

    const timeoutMs = 180000
    const idlePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms waiting for session.idle`)), timeoutMs)
        session.on('session.idle', () => {
            clearTimeout(timeout)
            resolve()
        })
    })

    await session.send({ prompt: 'Reply with exactly: Copilot SDK test successful.' })
    await idlePromise

    console.log('\nFINAL_RESPONSE:', finalMessage || '[no final assistant.message content]')

    await session.disconnect()
    await client.stop()
    console.log('COPILOT_SDK_STOPPED')
} catch (error) {
    console.error('COPILOT_SDK_TEST_ERROR:', error?.message || error)
    try {
        await client.forceStop()
    } catch {
        // ignore cleanup errors
    }
    process.exit(1)
}
