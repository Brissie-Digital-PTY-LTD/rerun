import { z } from 'zod'

export const engineDbColumnSchema = z.object({ name: z.string(), type: z.string(), pk: z.boolean(), notnull: z.boolean() })
export const engineDbTableSchema = z.object({ name: z.string(), columns: z.array(engineDbColumnSchema) })
export const engineDbTablesListSchema = z.object({ tables: z.array(engineDbTableSchema) })
export const engineDbRowsSchema = z.object({ columns: z.array(z.string()), rows: z.array(z.record(z.string(), z.unknown())), total: z.number() })
export const engineDeleteRowsResultSchema = z.object({ deleted: z.number() })

export type EngineDbColumn = z.infer<typeof engineDbColumnSchema>
export type EngineDbTable = z.infer<typeof engineDbTableSchema>
export type EngineDbRows = z.infer<typeof engineDbRowsSchema>
export type EngineDeleteRowsResult = z.infer<typeof engineDeleteRowsResultSchema>

export const sqlParamSchema = z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).default([])

export const dbQuerySchema = z.object({
    sql: z.string().min(1),
    params: sqlParamSchema,
    limit: z.number().int().positive().max(1000).default(100),
})
export const dbQueryResultSchema = z.object({
    columns: z.array(z.string()),
    rows: z.array(z.record(z.string(), z.unknown())),
    rowCount: z.number(),
    truncated: z.boolean(),
})

export const dbExecuteSchema = z.object({
    sql: z.string().min(1).optional(),
    params: sqlParamSchema,
    statements: z.array(z.object({ sql: z.string().min(1), params: sqlParamSchema })).optional(),
})
export const dbExecuteResultSchema = z.object({
    statements: z.number(),
    rowsAffected: z.number(),
    lastInsertRowid: z.string().nullable(),
})

export type DbQueryInput = z.infer<typeof dbQuerySchema>
export type DbQueryResult = z.infer<typeof dbQueryResultSchema>
export type DbExecuteInput = z.infer<typeof dbExecuteSchema>
export type DbExecuteResult = z.infer<typeof dbExecuteResultSchema>

export const engineUsageBucketSchema = z.object({
    day: z.string(),
    model: z.string().nullable(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    cachedInputTokens: z.number(),
    reasoningTokens: z.number(),
    totalTokens: z.number(),
    costMicros: z.number(),
    runCount: z.number(),
})
export const engineUsageSchema = z.object({ buckets: z.array(engineUsageBucketSchema) })

export type EngineUsageBucket = z.infer<typeof engineUsageBucketSchema>
