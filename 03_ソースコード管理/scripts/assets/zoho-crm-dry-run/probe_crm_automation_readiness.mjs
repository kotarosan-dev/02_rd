// Purpose: Probe Zoho CRM automation settings read-only endpoints and dry-run write payloads.

import { ZohoCrmDryRunClient, sanitizeForLog } from './zoho_crm_client.mjs';

const marker = `_qa_gpt55_automation_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
const client = new ZohoCrmDryRunClient({
  mode: 'dry_run',
  scope: 'ZohoCRM.modules.READ,ZohoCRM.settings.ALL',
});

function summarizeReadOnlyResult(name, result) {
  const body = result.response?.body;
  return {
    phase: name,
    ok: result.ok,
    endpoint: result.request?.endpoint,
    http_status: result.response?.http_status,
    top_level_keys: body && typeof body === 'object' ? Object.keys(body).slice(0, 12) : [],
    data_count: Array.isArray(body?.data) ? body.data.length : undefined,
    code: body?.code,
    message: body?.message,
    details: sanitizeForLog(body?.details),
  };
}

function summarizeDryRunResult(name, result) {
  return {
    phase: name,
    ok: result.ok,
    skipped: result.skipped,
    reason: result.reason,
    request: sanitizeForLog(result.request),
  };
}

async function safeGet(name, path) {
  try {
    return summarizeReadOnlyResult(name, await client.get(path));
  } catch (error) {
    return {
      phase: name,
      ok: false,
      endpoint: `GET ${path}`,
      error: error.message,
    };
  }
}

async function main() {
  const workflowPayload = {
    workflow_rules: [
      {
        name: marker,
        description: 'Dry-run only payload for GPT5.5 automation readiness probe. Do not apply.',
        module: {
          api_name: 'Leads',
        },
        active: false,
      },
    ],
  };

  const functionPayload = {
    functions: [
      {
        name: marker,
        display_name: marker,
        description: 'Dry-run only payload for GPT5.5 function readiness probe. Do not apply.',
        category: 'automation',
      },
    ],
  };

  const summary = {
    ok: false,
    mode: 'dry_run',
    dc: client.environment.dc,
    api_host: client.environment.apiHost,
    marker,
    read_only: [],
    dry_run_payloads: [],
    apply_attempted: false,
    apply_eligible: false,
    apply_block_reason: 'Workflow/Function create endpoints and cleanup semantics are not proven by this read-only probe.',
  };

  summary.read_only.push(await safeGet('settings_modules', '/settings/modules'));
  summary.read_only.push(await safeGet('workflow_rules_leads', '/settings/automation/workflow_rules?module=Leads'));
  summary.read_only.push(await safeGet('settings_functions', '/settings/functions'));
  summary.read_only.push(await safeGet('automation_functions', '/settings/automation/functions'));

  summary.dry_run_payloads.push(summarizeDryRunResult(
    'dry_run_workflow_rule_create_payload',
    await client.post('/settings/automation/workflow_rules', workflowPayload),
  ));
  summary.dry_run_payloads.push(summarizeDryRunResult(
    'dry_run_function_create_payload',
    await client.post('/settings/functions', functionPayload),
  ));

  summary.ok = summary.read_only.some((phase) => phase.ok === true)
    && summary.dry_run_payloads.every((phase) => phase.ok === true && phase.skipped === true);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.message,
    detail: sanitizeForLog(error.detail),
  }, null, 2));
  process.exit(1);
});
