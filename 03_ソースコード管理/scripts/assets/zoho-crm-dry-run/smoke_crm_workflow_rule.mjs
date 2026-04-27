// Purpose: Verify Zoho CRM Workflow Rule create/delete schema with cleanup.

import { ZohoCrmDryRunClient, sanitizeForLog } from './zoho_crm_client.mjs';

const marker = `_qa_gpt55_workflow_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
const workflowActive = process.env.WORKFLOW_ACTIVE === '1';
const client = new ZohoCrmDryRunClient({
  scope: 'ZohoCRM.settings.workflow_rules.ALL,ZohoCRM.settings.modules.READ',
});

function workflowPayload() {
  return {
    workflow_rules: [
      {
        execute_when: {
          details: {
            trigger_module: {
              api_name: 'Leads',
            },
            repeat: false,
          },
          type: 'create',
        },
        module: {
          api_name: 'Leads',
        },
        name: marker,
        description: 'Disposable GPT5.5 workflow schema smoke. Created inactive and deleted immediately.',
        conditions: [
          {
            sequence_number: 1,
            criteria_details: {
              criteria: {
                group_operator: 'and',
                group: [
                  {
                    comparator: 'equal',
                    field: {
                      api_name: 'Last_Name',
                    },
                    value: marker,
                  },
                ],
              },
            },
            instant_actions: {
              actions: [],
            },
            scheduled_actions: null,
          },
        ],
        status: {
          active: workflowActive,
        },
      },
    ],
  };
}

function firstWorkflowRow(result) {
  return result.response?.body?.workflow_rules?.[0] || {};
}

async function listMatching() {
  const result = await client.get('/settings/automation/workflow_rules?module=Leads');
  const rows = result.response?.body?.workflow_rules || [];
  return {
    result,
    matches: rows.filter((row) => row?.name === marker),
  };
}

async function main() {
  const summary = {
    ok: false,
    mode: client.mode,
    marker,
    workflow_active: workflowActive,
    phases: [],
    cleanup: {
      attempted: false,
      deleted_id: null,
      residual_found: null,
    },
  };

  let createdId = null;
  try {
    const dryOrCreate = await client.post('/settings/automation/workflow_rules', workflowPayload(), { rawPayload: true });
    const createRow = firstWorkflowRow(dryOrCreate);
    createdId = createRow.details?.id || null;
    summary.phases.push({
      phase: 'create',
      ok: dryOrCreate.ok,
      skipped: dryOrCreate.skipped,
      reason: dryOrCreate.reason,
      http_status: dryOrCreate.response?.http_status,
      code: createRow.code,
      status: createRow.status,
      id: createdId,
      message: createRow.message,
      details: sanitizeForLog(createRow.details),
      request: dryOrCreate.skipped ? sanitizeForLog(dryOrCreate.request) : undefined,
    });

    if (client.mode !== 'apply') {
      summary.ok = dryOrCreate.ok && dryOrCreate.skipped === true;
      return;
    }

    if (!dryOrCreate.ok || createRow.status !== 'success' || !createdId) {
      summary.ok = false;
      return;
    }

    const listed = await listMatching();
    summary.phases.push({
      phase: 'list_created',
      ok: listed.result.ok,
      http_status: listed.result.response?.http_status,
      matches: listed.matches.map((row) => ({
        id: row.id,
        name: row.name,
        active: row.status?.active,
      })),
    });
    summary.ok = listed.result.ok && listed.matches.some((row) => row.id === createdId);
  } finally {
    if (client.mode === 'apply' && createdId) {
      summary.cleanup.attempted = true;
      const del = await client.delete(`/settings/automation/workflow_rules/${createdId}`);
      const delRow = firstWorkflowRow(del);
      summary.phases.push({
        phase: 'delete',
        ok: del.ok,
        http_status: del.response?.http_status,
        code: delRow.code,
        status: delRow.status,
        id: delRow.details?.id || createdId,
        message: delRow.message,
      });
      summary.cleanup.deleted_id = delRow.details?.id || createdId;

      const residual = await listMatching();
      const residualFound = residual.matches.some((row) => row.id === createdId || row.name === marker);
      summary.cleanup.residual_found = residualFound;
      summary.phases.push({
        phase: 'residual_check',
        ok: residual.result.ok && !residualFound,
        http_status: residual.result?.response?.http_status,
        residual_found: residualFound,
      });
      summary.ok = summary.ok && del.ok && residual.result.ok && !residualFound;
    }

    console.log(JSON.stringify(summary, null, 2));
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
