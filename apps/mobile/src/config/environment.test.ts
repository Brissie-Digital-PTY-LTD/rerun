import { environmentForChannel } from '@/config/environment'
import { PRODUCTION, STAGING } from '@rerun/cloud-mobile/environments'

describe('environmentForChannel', () => {
    it('binds a store build to the environment of its update channel', () => {
        expect(environmentForChannel('production')).toBe(PRODUCTION)
        expect(environmentForChannel('staging')).toBe(STAGING)
    })

    it('ignores EXPO_PUBLIC_* on a store build, whatever the publishing laptop had', () => {
        process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3050'
        expect(environmentForChannel('staging').apiUrl).toBe(STAGING.apiUrl)
        delete process.env.EXPO_PUBLIC_API_URL
    })

    it('reads the local .env on a development build, which has no channel', () => {
        process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3050'
        expect(environmentForChannel(null)).toMatchObject({ name: 'local', apiUrl: 'http://localhost:3050' })
        delete process.env.EXPO_PUBLIC_API_URL
    })
})
