# Data Model (Single Table Design)

Gyms, exercises and workouts live in the **same table**, keyed by a partition key (`PK`) and a sort key (`SK`). Every access pattern is a `GetItem` or a `Query`; the table is never scanned.

| Item | `PK` | `SK` | Access patterns |
|---|---|---|---|
| Gym | `GYM` | `GYM#<slug>` | Get by ID, prefix search by name, list catalog |
| Exercise | `EXERCISE` | `EXERCISE#<slug>` | Get by ID, prefix search by name, list catalog |
| Workout | `USER#<userId>` | `WORKOUT#<ulid>` | Get by ID, list a user's workouts newest first (paginated) |

Keys are defined in three places that must stay in sync: `TableSchemaFactory` (how items are written), `DynamoDbLocalInitializer` (the local table) and the `Database` construct in `infra/` (the real table).

## Catalog IDs are slugs

Slugs drop accents, apostrophes and symbols, which is what makes prefix search by name work:

| Input | ID |
|---|---|
| `Farmer's Walk (Básico)` | `farmers-walk-basico` |
| `Smart Fit` + `Valle Oriente` + `Monterrey` | `smart-fit-valle-oriente-monterrey` |

`Slugs.of(...)` builds both the stored ID and the search prefix, so the two can never drift apart. Gyms include the optional branch and the city, so **every branch of a chain is its own gym**, while a search for the chain name still finds all of them.

Creation uses a conditional write (`attribute_not_exists`), so an existing entry is never overwritten: the API answers `409` instead. DynamoDB checks that condition atomically, so two concurrent creations cannot both succeed.

## Workouts belong to their owner

The partition key is `USER#<userId>`, where `userId` is the Cognito `sub`. A user's workouts are therefore a single partition, and reading someone else's is not just forbidden, it is impossible to express as a query.

Workouts optionally carry denormalized `gymId` and `gymName` to avoid a second lookup when showing history.

## Workout IDs are ULIDs

A workout's ID is a [ULID](https://github.com/ulid/spec) generated from its `startedAt`:

```
01KZ8BHKC0N761RDSJY0HMX246
└───┬────┘└──────┬───────┘
 timestamp    random
 10 chars     16 chars
```

Because a ULID begins with its timestamp, sorting IDs sorts by start time. One key therefore serves both access patterns: `GetItem` by ID for the detail view, and a `Query` sorted by time for the history. A date-only sort key would have needed the ID appended anyway, would have lost intra-day ordering, and would have had to pick a timezone to decide which day a workout belongs to.

Date ranges (a calendar view, "this week") remain efficient: the client resolves the range in its own timezone and the query uses `SK BETWEEN` the minimum and maximum ULID for that range.

## Workout times

`startedAt` and `endedAt` are both **required**: only completed workouts are stored. A workout in progress is expected to live on the client until it is finished.

* Accepted on input: ISO-8601 **with a time zone** (`2026-07-31T18:30:00Z` or `2026-07-31T12:30:00-06:00`). Anything else is a `400`.
* Stored as UTC with a fixed width: `yyyy-MM-ddTHH:mm:ssZ`, truncated to seconds. A fixed width matters because DynamoDB compares sort keys as text.
* `endedAt` must be after `startedAt`, at most 12 hours later, and no more than 5 minutes in the future (a tolerance for client clocks).

Two full timestamps are stored instead of a date plus two times, because a session can cross midnight, because a time without a zone is ambiguous, and because duration is then a subtraction.
