// Purpose: Smoke-test Zoho CRM Accounts create -> get -> delete through the dry-run client.

import { ZohoCrmDryRunClient, sanitizeForLog } from './zoho_crm_client.mjs';

const args = new Set(process.argv.slice(2));
const mode = args.has('--apply') || process.env.ZOHO_MODE === 'apply' || process.env.ZOHO_CRM_MODE === 'apply'
  ? 'apply'
  : 'dry_run';
const keepRecord = args.has('--keep') || process.env.ZOHO_KEEP_RECORD === '1';

const marker = `_qa_gpt55_account_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
const accountRecord = {
  Account_Name: marker,
  Description: `Disposable CRM API Accounts smoke probe at ${new Date().toISOString()}`,
};
const createPayload = {
  data: [accountRecord],
  trigger: [],
};

function phaseFromResult(phase, result) {
  return {
    phase,
    ok: result.ok,
    skipped: result.skipped,
    request: sanitizeForLog(result.request),
    response: sanitizeForLog(result.response),
  };
}

function requireSuccess(condition, message, detail) {
  if (!condition) {
    const error = new Error(message);
    error.detail = detail;
    throw error;
  }
}

async function main() {
  const client = new ZohoCrmDryRunClient({ mode });
  const summary = {
    ok: false,
    mode,
    dc: client.environment.dc,
    api_host: client.environment.apiHost,
    module: 'Accounts',
    marker,
    phases: [],
  };

  if (mode !== 'apply') {
    const dryRunCreate = await client.post('/Accounts', createPayload);
    summary.ok = dryRunCreate.ok && dryRunCreate.skipped === true;
    summary.phases.push(phaseFromResult('dry_run_create', dryRunCreate));
    summary.phases.push({
      phase: 'dry_run_cleanup_plan',
      endpoint: 'DELETE /crm/v8/Accounts/{id}',
      skipped: true,
      reason: 'no record created in dry_run',
    });
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  let createdId = null;
  try {
    const create = await client.post('/Accounts', createPayload);
    const createRow = create.response?.body?.data?.[0] || {};
    createdId = createRow.details?.id || null;
    summary.phases.push({
      phase: 'create',
      ok: create.ok,
      http_status: create.response?.http_status,
      code: createRow.code,
      status: createRow.status,
      id: createdId,
      message: createRow.message,
    });
    requireSuccess(create.ok && createdId, 'create_failed', create.response?.body);

    const get = await client.get(`/Accounts/${createdId}`);
    const record = get.response?.body?.data?.[0] || {};
    summary.phases.push({
      phase: 'get_by_id',
      ok: get.ok,
      http_status: get.response?.http_status,
      id: record.id,
      account_name_matches: record.Account_Name === marker,
    });
    requireSuccess(
      get.ok && record.id === createdId && record.Account_Name === marker,
      'get_failed',
      get.response?.body,
    );

    summary.ok = true;
  } finally {
    if (createdId && !keepRecord) {
      const del = await client.delete(`/Accounts/${createdId}`);
      const delRow = del.response?.body?.data?.[0] || {};
      summary.phases.push({
        phase: 'delete',
        ok: del.ok,
        http_status: del.response?.http_status,
        code: delRow.code,
        status: delRow.status,
        id: delRow.details?.id || createdId,
        message: delRow.message,
      });
      if (!del.ok || delRow.code !== 'SUCCESS') {
        summary.ok = false;
        summary.cleanup_warning = sanitizeForLog(del.response?.body);
      }
    }

    console.log(JSON.stringify(summary, null, 2));
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.message,
    detail: sanitizeForLog(error.detail),
  }, null, 2));
  process.exit(1);
});
