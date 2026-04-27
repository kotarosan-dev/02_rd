// Purpose: Verify Workflow Rule apply with a disposable tag action and full cleanup.

import { ZohoCrmDryRunClient, sanitizeForLog } from './zoho_crm_client.mjs';

const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const marker = `_qa_gpt55_wf_${stamp}`;
const tagName = `qa_gpt55_${stamp.slice(6)}`;
const client = new ZohoCrmDryRunClient({
  scope: 'ZohoCRM.settings.workflow_rules.ALL,ZohoCRM.settings.tags.ALL,ZohoCRM.settings.modules.READ',
});

function firstTagRow(result) {
  return result.response?.body?.tags?.[0] || {};
}

function firstWorkflowRow(result) {
  return result.response?.body?.workflow_rules?.[0] || {};
}

function workflowPayload(tagId) {
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
        description: 'Disposable GPT5.5 workflow+tag smoke. Delete immediately.',
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
              actions: [
                {
                  type: 'add_tags',
                  module: 'Leads',
                  details: {
                    tags: [
                      {
                        id: tagId || 'DRY_RUN_TAG_ID',
                      },
                    ],
                    overwrite: false,
                  },
                },
              ],
            },
            scheduled_actions: null,
          },
        ],
        status: {
          active: true,
        },
      },
    ],
  };
}

async function listMatchingWorkflows() {
  const result = await client.get('/settings/automation/workflow_rules?module=Leads');
  const rows = result.response?.body?.workflow_rules || [];
  return {
    result,
    matches: rows.filter((row) => row?.name === marker),
  };
}

async function listMatchingTags() {
  const result = await client.get('/settings/tags?module=Leads');
  const rows = result.response?.body?.tags || [];
  return {
    result,
    matches: rows.filter((row) => row?.name === tagName),
  };
}

async function main() {
  const summary = {
    ok: false,
    mode: client.mode,
    marker,
    tag_name: tagName,
    phases: [],
    cleanup: {
      workflow_deleted_id: null,
      tag_deleted_id: null,
      workflow_residual_found: null,
      tag_residual_found: null,
    },
  };

  let workflowId = null;
  let tagId = null;

  try {
    const tagCreate = await client.post('/settings/tags?module=Leads', {
      tags: [
        {
          name: tagName,
          color_code: '#969696',
        },
      ],
    }, { rawPayload: true });
    const tagRow = firstTagRow(tagCreate);
    tagId = tagRow.details?.id || null;
    summary.phases.push({
      phase: 'create_tag',
      ok: tagCreate.ok,
      skipped: tagCreate.skipped,
      reason: tagCreate.reason,
      http_status: tagCreate.response?.http_status,
      code: tagRow.code,
      status: tagRow.status,
      id: tagId,
      message: tagRow.message,
      request: tagCreate.skipped ? sanitizeForLog(tagCreate.request) : undefined,
    });

    if (client.mode === 'apply' && (!tagCreate.ok || tagRow.status !== 'success' || !tagId)) {
      throw new Error('create_tag_failed');
    }

    const workflowCreate = await client.post(
      '/settings/automation/workflow_rules',
      workflowPayload(tagId),
      { rawPayload: true },
    );
    const workflowRow = firstWorkflowRow(workflowCreate);
    workflowId = workflowRow.details?.id || null;
    summary.phases.push({
      phase: 'create_workflow',
      ok: workflowCreate.ok,
      skipped: workflowCreate.skipped,
      reason: workflowCreate.reason,
      http_status: workflowCreate.response?.http_status,
      code: workflowRow.code,
      status: workflowRow.status,
      id: workflowId,
      message: workflowRow.message,
      details: sanitizeForLog(workflowRow.details),
      request: workflowCreate.skipped ? sanitizeForLog(workflowCreate.request) : undefined,
    });

    if (client.mode !== 'apply') {
      summary.ok = tagCreate.ok && tagCreate.skipped === true
        && workflowCreate.ok && workflowCreate.skipped === true;
      return;
    }

    if (!workflowCreate.ok || workflowRow.status !== 'success' || !workflowId) {
      throw new Error('create_workflow_failed');
    }

    const listed = await listMatchingWorkflows();
    summary.phases.push({
      phase: 'list_created_workflow',
      ok: listed.result.ok,
      http_status: listed.result.response?.http_status,
      matches: listed.matches.map((row) => ({
        id: row.id,
        name: row.name,
        active: row.status?.active,
      })),
    });

    summary.ok = listed.result.ok && listed.matches.some((row) => row.id === workflowId);
  } finally {
    if (client.mode === 'apply' && workflowId) {
      const workflowDelete = await client.delete(`/settings/automation/workflow_rules/${workflowId}`);
      const row = firstWorkflowRow(workflowDelete);
      summary.phases.push({
        phase: 'delete_workflow',
        ok: workflowDelete.ok,
        http_status: workflowDelete.response?.http_status,
        code: row.code,
        status: row.status,
        id: row.details?.id || workflowId,
        message: row.message,
      });
      summary.cleanup.workflow_deleted_id = row.details?.id || workflowId;
      summary.ok = summary.ok && workflowDelete.ok;
    }

    if (client.mode === 'apply' && tagId) {
      const tagDelete = await client.delete(`/settings/tags/${tagId}`);
      const row = firstTagRow(tagDelete);
      summary.phases.push({
        phase: 'delete_tag',
        ok: tagDelete.ok,
        http_status: tagDelete.response?.http_status,
        code: row.code,
        status: row.status,
        id: row.details?.id || tagId,
        message: row.message,
      });
      summary.cleanup.tag_deleted_id = row.details?.id || tagId;
      summary.ok = summary.ok && tagDelete.ok;
    }

    if (client.mode === 'apply') {
      const workflowResidual = await listMatchingWorkflows();
      const tagResidual = await listMatchingTags();
      const workflowResidualFound = workflowResidual.matches.some((row) => row.id === workflowId || row.name === marker);
      const tagResidualFound = tagResidual.matches.some((row) => row.id === tagId || row.name === tagName);
      summary.cleanup.workflow_residual_found = workflowResidualFound;
      summary.cleanup.tag_residual_found = tagResidualFound;
      summary.phases.push({
        phase: 'residual_check',
        ok: workflowResidual.result.ok && tagResidual.result.ok && !workflowResidualFound && !tagResidualFound,
        workflow_http_status: workflowResidual.result.response?.http_status,
        tag_http_status: tagResidual.result.response?.http_status,
        workflow_residual_found: workflowResidualFound,
        tag_residual_found: tagResidualFound,
      });
      summary.ok = summary.ok && workflowResidual.result.ok && tagResidual.result.ok && !workflowResidualFound && !tagResidualFound;
    }

    console.log(JSON.stringify(summary, null, 2));
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
