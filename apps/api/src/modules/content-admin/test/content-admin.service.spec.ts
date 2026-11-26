import { eq } from 'drizzle-orm';
import { DEFAULT_BLUEPRINT_RULES } from '@loopedu/shared';
import { createTestDb } from '../../../common/testing/test-db.js';
import { adminAuditLogs, users } from '../../../db/schema/index.js';
import type { Database } from '../../../db/database.js';
import { ContentAdminRepository } from '../content-admin.repository.js';
import { ContentAdminService } from '../content-admin.service.js';

let db: Database;
let close: () => Promise<void>;
let service: ContentAdminService;
let adminId: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  service = new ContentAdminService(new ContentAdminRepository(db));
  [{ id: adminId }] = await db.insert(users).values({ email: 'admin@example.com' }).returning();
}, 60_000);
afterAll(() => close());

const ielts = () => ({ examType: 'ielts' as const, rules: DEFAULT_BLUEPRINT_RULES.ielts });
const toeic = () => ({ examType: 'toeic' as const, rules: DEFAULT_BLUEPRINT_RULES.toeic });
const conflict = { response: { code: 'CONFLICT' } };

describe('blueprints', () => {
  it('numbers versions per exam type, starting as drafts', async () => {
    const a = await service.createBlueprint(adminId, ielts());
    const b = await service.createBlueprint(adminId, ielts());
    const t = await service.createBlueprint(adminId, toeic());
    expect([a.version, b.version, t.version]).toEqual([1, 2, 1]);
    expect(a).toMatchObject({ status: 'draft', approvedBy: null, rules: DEFAULT_BLUEPRINT_RULES.ielts });
  });

  it('numbers parallel creations without duplicates', async () => {
    const made = await Promise.all(Array.from({ length: 5 }, () => service.createBlueprint(adminId, toeic())));
    expect(new Set(made.map((m) => m.version)).size).toBe(5);
  });

  it('activates a draft, retires the previous active version and audits both', async () => {
    const v1 = await service.createBlueprint(adminId, ielts());
    const v2 = await service.createBlueprint(adminId, ielts());
    expect(await service.activateBlueprint(adminId, v1.id)).toMatchObject({ status: 'active', approvedBy: adminId });

    await service.activateBlueprint(adminId, v2.id);
    const all = await service.listBlueprints('ielts');
    expect(all.filter((b) => b.status === 'active').map((b) => b.id)).toEqual([v2.id]);
    expect(all.find((b) => b.id === v1.id)?.status).toBe('retired');

    const logs = await db.select().from(adminAuditLogs).where(eq(adminAuditLogs.targetId, v2.id));
    expect(logs.map((l) => l.action).sort()).toEqual(['blueprint.activate', 'blueprint.create']);
    expect(logs.find((l) => l.action === 'blueprint.activate')?.changesJson).toMatchObject({
      retiredVersion: v1.version,
    });
  });

  it('repeating an activation changes nothing and writes no second audit row', async () => {
    const draft = await service.createBlueprint(adminId, toeic());
    await Promise.all([service.activateBlueprint(adminId, draft.id), service.activateBlueprint(adminId, draft.id)]);
    const logs = await db.select().from(adminAuditLogs).where(eq(adminAuditLogs.targetId, draft.id));
    expect(logs.filter((l) => l.action === 'blueprint.activate')).toHaveLength(1);
  });

  it('refuses to reactivate a retired version and reports unknown ids', async () => {
    const old = await service.createBlueprint(adminId, toeic());
    const next = await service.createBlueprint(adminId, toeic());
    await service.activateBlueprint(adminId, old.id);
    await service.activateBlueprint(adminId, next.id);
    await expect(service.activateBlueprint(adminId, old.id)).rejects.toMatchObject(conflict);
    await expect(service.activateBlueprint(adminId, crypto.randomUUID())).rejects.toMatchObject({
      response: { code: 'NOT_FOUND' },
    });
  });
});
