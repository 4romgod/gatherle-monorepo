# Event Occurrence Maintenance

This runbook covers the operational maintenance flow for persisted `EventOccurrence` rows.

## Purpose

The maintenance job exists to keep occurrence data healthy without relying on request-time repair.

It handles four cases:

- materializing missing occurrence windows for a series
- topping up recurring series whose rolling six-month window is running low
- repairing occurrence metadata snapshots such as `eventSeriesSlug`
- reconciling `reservedSlotCount` drift when occurrence capacity counters no longer match RSVP state

## Automatic Schedule

Occurrence maintenance now runs automatically in AWS outside the deploy pipeline.

- **Prod:** every 6 hours
- **Non-prod:** every 12 hours

The scheduled Lambda uses the same maintenance service as the CLI script, then performs a dry-run health snapshot so
CloudWatch can track the remaining health state after repair.

## Script

Run the maintenance script from the repository root:

```bash
npm run maintain-event-occurrences -w @gatherle/api
```

## Dry Run

Use `--dry-run` to inspect what would be synced without writing anything:

```bash
npm run maintain-event-occurrences -w @gatherle/api -- --dry-run
```

## Target One Series

To repair or top up one specific event series:

```bash
npm run maintain-event-occurrences -w @gatherle/api -- --event-series-id <eventSeriesId>
```

This is the safest way to repair one series after a manual data inspection.

## Batch Controls

The script supports:

- `--limit <n>` to control batch size
- `--after-event-id <eventSeriesId>` to continue from a cursor
- `--threshold-days <n>` to control when a recurring series is considered close enough to the horizon to top up

By default, the script keeps advancing through batches until the maintenance run is complete. `--limit` controls the
size of each batch, not the total number of series processed across the whole run.

Example:

```bash
npm run maintain-event-occurrences -w @gatherle/api -- --limit 200 --threshold-days 21
```

## Recommended Usage

For routine operations:

1. run a dry run
2. confirm the reported counts look reasonable
3. run the real maintenance command

For local repair after schema or metadata changes:

1. run the series-targeted command for one known series
2. inspect `eventoccurrences` in MongoDB
3. run the full batch command once the targeted repair looks correct

## What Success Looks Like

Healthy occurrence data should have:

- one persisted occurrence for every single-date `EventSeries`
- a topped-up future window for recurring series
- `eventSeriesSlug` populated on occurrence rows for operator readability
- `reservedSlotCount` matching the sum of `Going`/`CheckedIn` participant quantities
- no dependence on request-time generation or repair

## CloudWatch Metrics & Alerts

The scheduled Lambda emits custom metrics under the `Gatherle/EventOccurrenceMaintenance` namespace.

Operational health metrics:

- `RemainingMissingSeriesCount`
- `RemainingLowHorizonSeriesCount`
- `RemainingMetadataRepairSeriesCount`
- `RemainingDriftedOccurrenceCount`

Workload metrics:

- `ProcessedSeriesCount`
- `SyncedSeriesCount`
- `DetectedMissingSeriesCount`
- `DetectedLowHorizonSeriesCount`
- `DetectedMetadataRepairSeriesCount`
- `DetectedDriftedOccurrenceCount`
- `ReconciledOccurrenceCount`
- `BatchesProcessed`
- `MaintenanceRunSuccess`
- `MaintenanceRunFailure`

The monitoring dashboard surfaces these metrics and CloudWatch alarms are created for:

- maintenance Lambda failures
- missing occurrence series remaining after maintenance
- low-horizon recurring series remaining after maintenance
- occurrence/participant drift remaining after maintenance
- no successful maintenance run recorded in the last 24 hours

## Performance Review Playbook

After real traffic, review the occurrence-heavy queries with `explain()` before changing indexes. Start with:

- `eventoccurrences.find({ eventSeriesId }).sort({ originalStartAt: 1, occurrenceKey: 1 })`
- `eventoccurrences.find({ startAt: { $lte: end }, ... })` for date-range reads
- `eventoccurrenceparticipants.find({ occurrenceId }).sort({ rsvpAt: 1 })`
- `eventoccurrenceparticipants.find({ userId }).sort({ rsvpAt: -1, createdAt: -1 })`
- the maintenance aggregations for latest horizon, missing slug snapshots, and reserved-slot drift

Focus on:

- whether the existing compound indexes are fully covering the filter + sort pattern
- whether scan counts grow materially faster than result counts
- whether the scheduled maintenance runtime trends upward as series volume grows

## Notes

- The script is safe to run repeatedly. Occurrence regeneration is idempotent.
- Exception occurrences are preserved during regeneration.
- If a series has no occurrence rows because it is outside the current rolling window, maintenance will regenerate or
  prune as needed based on the series schedule.
