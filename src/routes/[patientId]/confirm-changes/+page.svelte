<script lang="ts">
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabaseClient'
  import type { LLMPayload } from '../../api/propose-changes/+server'
  import Card from '$lib/components/ui/card/card.svelte'
  import CardContent from '$lib/components/ui/card/card-content.svelte'
  import Badge from '$lib/components/ui/badge/badge.svelte'
  import Button from '$lib/components/ui/button/button.svelte'
  import Separator from '$lib/components/ui/separator/separator.svelte'
  import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte'

  let { data } = $props()
  let patientId = $derived(data.patient.id)

  const { changes } = page.state as { changes?: LLMPayload }

  type Task = {
    id: string
    description: string
    complete: boolean
  }

  let currentTasks = $state<Record<string, Task>>({})
  let loadingTasks = $state(true)
  let isConfirming = $state(false)
  let confirmed = $state(false)
  let error = $state('')

  onMount(async () => {
    if (!changes || changes.task_edits.length === 0) {
      loadingTasks = false
      return
    }

    const ids = changes.task_edits.map((e) => e.id)
    const { data: taskData, error: fetchError } = await supabase
      .from('tasks')
      .select('id, description, complete')
      .in('id', ids)

    if (fetchError) {
      error = fetchError.message
    } else if (taskData) {
      for (const task of taskData) {
        currentTasks[task.id] = task
      }
    }

    loadingTasks = false
  })

  async function confirm() {
    if (!changes) return
    isConfirming = true
    error = ''

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const taskUpdates = changes.task_edits.map(({ id, ...fields }) =>
        supabase.from('tasks').update(fields).eq('id', id)
      )

      const noteInserts = changes.notes.length > 0
        ? [supabase.from('notes').insert(
            changes.notes.map((n) => ({ ...n, patient_id: patientId, author_id: user.id }))
          )]
        : []

      const results = await Promise.all([...taskUpdates, ...noteInserts])
      const failed = results.find((r) => r.error)
      if (failed?.error) throw new Error(failed.error.message)

      confirmed = true
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Something went wrong'
    } finally {
      isConfirming = false
    }
  }

  function discard() {
    history.back()
  }
</script>

<div class="mx-auto max-w-2xl px-4 py-12">
  <h1 class="mb-2 text-2xl font-semibold">Review AI-Suggested Changes</h1>
  <p class="mb-8 text-sm text-muted-foreground">
    Confirm to apply these changes, or discard to cancel.
  </p>

  {#if !changes}
    <Card>
      <CardContent class="py-8 text-center text-muted-foreground">
        No pending changes. Navigate here from the speech-to-text flow.
      </CardContent>
    </Card>
  {:else if confirmed}
    <Card>
      <CardContent class="py-8 text-center">
        <p class="mb-4 text-lg font-medium">Changes saved.</p>
        <Button onclick={() => goto(`/${patientId}/tasks`)}>Done</Button>
      </CardContent>
    </Card>
  {:else}
    <!-- Task Changes -->
    {#if changes.task_edits.length > 0}
      <section class="mb-8">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Task Changes ({changes.task_edits.length})
        </h2>
        <div class="flex flex-col gap-3">
          {#each changes.task_edits as edit (edit.id)}
            {@const current = currentTasks[edit.id]}
            <Card size="sm">
              <CardContent class="pt-4">
                {#if loadingTasks}
                  <Skeleton class="mb-2 h-4 w-3/4" />
                  <Skeleton class="h-3 w-1/2" />
                {:else if current}
                  <p class="mb-2 text-sm font-medium">{current.description}</p>
                  <div class="flex items-center gap-1 text-xs text-muted-foreground">
                    <span class="font-medium text-foreground">complete:</span>
                    <span class="line-through">{current.complete}</span>
                    <span>→</span>
                    <Badge variant={edit.complete ? 'default' : 'outline'}>
                      {edit.complete}
                    </Badge>
                  </div>
                {:else}
                  <p class="text-sm italic text-muted-foreground">Task not found: {edit.id}</p>
                {/if}
              </CardContent>
            </Card>
          {/each}
        </div>
      </section>
    {/if}

    <!-- New Notes -->
    {#if changes.notes.length > 0}
      <section class="mb-8">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          New Notes ({changes.notes.length})
        </h2>
        <div class="flex flex-col gap-3">
          {#each changes.notes as note, i (i)}
            <Card size="sm">
              <CardContent class="pt-4">
                <p class="mb-1 text-xs text-muted-foreground">
                  {new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  {#if note.task_id}&nbsp;· linked to task{/if}
                </p>
                <p class="text-sm leading-relaxed">{note.content}</p>
              </CardContent>
            </Card>
          {/each}
        </div>
      </section>
    {/if}

    {#if error}
      <p class="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
    {/if}

    <Separator class="mb-6" />

    <div class="flex justify-between">
      <Button variant="outline" onclick={discard} disabled={isConfirming}>Discard</Button>
      <Button onclick={confirm} disabled={isConfirming || loadingTasks}>
        {isConfirming ? 'Saving…' : 'Confirm Changes'}
      </Button>
    </div>
  {/if}
</div>
