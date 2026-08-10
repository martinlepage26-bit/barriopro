import { base44 } from '@/api/base44Client';

export async function logAudit(projectId, action, details) {
  try {
    const user = await base44.auth.me().catch(() => null);
    await base44.entities.AuditLog.create({
      project_id: projectId,
      action,
      details,
      user_name: user?.full_name || user?.email || 'Système',
    });
  } catch (e) {
    // Silent fail - audit logging should not break the main flow
  }
}