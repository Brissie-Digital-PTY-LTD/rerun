import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { vi } from 'vitest'

process.env.RERUN_DATA_DIR = mkdtempSync(resolve(tmpdir(), 'rerun-mcp-relay-'))
process.env.RERUN_LOG_LEVEL = 'fatal'

const pool = vi.hoisted(() => ({ reachable: new Set<string>(), acquired: [] as Array<{ agentId: string; name: string; cwd: string }> }))

vi.mock('./mcp-pool.js', async importOriginal => ({
    ...(await importOriginal<typeof import('./mcp-pool.js')>()),
    acquireMcp: async (agentId: string, server: { name: string }, spawn: { cwd: string }) => {
        pool.acquired.push({ agentId, name: server.name, cwd: spawn.cwd })
        return pool.reachable.has(server.name) ? { name: server.name, tools: [], call: async () => ({ content: [] }) } : null
    },
}))

const { describe, expect, it } = await import('vitest')
const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js')
const { relayMcpServer, withPooledRelays } = await import('./mcp-relay.js')
const { workspaceDir } = await import('../config/paths.js')

type Relay = Parameters<typeof relayMcpServer>[0]

async function clientOf(relay: Relay) {
    const { instance } = relayMcpServer(relay, 1234)
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
    await instance.connect(serverSide)
    const client = new Client({ name: 'cli', version: '1.0.0' })
    await client.connect(clientSide)
    return client
}

describe('relayMcpServer', () => {
    it('lists the tools as the server did, JSON schemas untouched', async () => {
        const inputSchema = { type: 'object' as const, properties: { channel: { type: 'string' } }, oneOf: [{ required: ['channel'] }] }
        const client = await clientOf({ name: 'discord', tools: [{ name: 'send', description: 'Send a message', inputSchema }], call: async () => ({ content: [] }) })
        expect((await client.listTools()).tools).toEqual([{ name: 'send', description: 'Send a message', inputSchema }])
    })

    it('passes each call on to the pooled connection, with the tool timeout', async () => {
        const calls: unknown[] = []
        const client = await clientOf({
            name: 'discord',
            tools: [{ name: 'send', inputSchema: { type: 'object' } }],
            call: async (name, args, options) => {
                calls.push({ name, args, timeout: options?.timeout })
                return { content: [{ type: 'text', text: 'sent' }] }
            },
        })
        expect(await client.callTool({ name: 'send', arguments: { text: 'hi' } })).toEqual({ content: [{ type: 'text', text: 'sent' }] })
        expect(calls).toEqual([{ name: 'send', args: { text: 'hi' }, timeout: 1234 }])
    })

    it('turns a failed call into a tool error the model can read', async () => {
        const client = await clientOf({
            name: 'discord',
            tools: [{ name: 'send', inputSchema: { type: 'object' } }],
            call: async () => {
                throw new Error('connection closed')
            },
        })
        expect(await client.callTool({ name: 'send', arguments: {} })).toEqual({ isError: true, content: [{ type: 'text', text: 'connection closed' }] })
    })

    it('passes a call without arguments as an empty object, and reads any thrown value', async () => {
        const seen: unknown[] = []
        const client = await clientOf({
            name: 'discord',
            tools: [{ name: 'ping', inputSchema: { type: 'object' } }],
            call: async (_name, args) => {
                seen.push(args)
                throw 'gone'
            },
        })
        expect(await client.callTool({ name: 'ping' })).toEqual({ isError: true, content: [{ type: 'text', text: 'gone' }] })
        expect(seen).toEqual([{}])
    })
})

describe('withPooledRelays', () => {
    it('relays the servers the pool reaches and leaves the others as declared', async () => {
        pool.reachable.add('discord')
        const agent = { id: 'relay-agent', env: {}, config: { tools: {} } } as never
        const servers = [
            { name: 'discord', command: 'npx', args: [], env: {}, headers: {} },
            { name: 'down', url: 'https://down.example/mcp', args: [], env: {}, headers: {} },
        ]
        const relayed = await withPooledRelays(agent, servers)
        expect(relayed[0]!.relay?.name).toBe('discord')
        expect(relayed[1]).toEqual(servers[1])
        expect(pool.acquired).toEqual([
            { agentId: 'relay-agent', name: 'discord', cwd: workspaceDir('relay-agent') },
            { agentId: 'relay-agent', name: 'down', cwd: workspaceDir('relay-agent') },
        ])
    })
})
