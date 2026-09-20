# Data Model (Single Table Design)

*For understanding how the data is stored, and why the keys look the way they do.*

Gyms, exercises and workouts live in the **same table**, keyed by a partition key (`PK`) and a sort key (`SK`). Every access pattern is a `GetItem` or a `Query`; the table is never scanned.

| Item | `PK` | `SK` | Access patterns |
|---|---|---|---|
| Gym | `GYM` | `GYM#<slug>` | Get by ID, prefix search by name, list catalog |
| Exercise | `EXERCISE` | `EXERCISE#<slug>` | Get by ID, prefix search by name, list catalog |
| Workout | `USER#<userId>` | `WORKOUT#<ulid>` | Get by ID, list a user's workouts newest first (paginated) |

Keys are defined in three places that must stay in sync: `TableSchemaFactory` (how items are written), `DynamoDbLocalInitializer` (the local table) and the `Database` construct in `infra/` (the real table).

Fixed lists, like an exercise's `muscleGroup` and `category` or a set's `unit`, are stored as the **enum's name** (`CHEST`, `PUSH`, `KG`). Reading an item whose stored value is not in the enum fails, so renaming or removing a value needs a migration of the stored items. Adding one does not.

> Before the fixed lists, `muscleGroup` was free text such as `Chest`. The dev table only held the exercises Bruno registers, which are deleted and registered again before each run against AWS, so no migration was written. A table with real data would need one.

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

### Client IDs make retries safe

A client may send its own ULID, generated once per workout, so that retrying a lost request never stores a second copy. The server keeps only its **random part** and stamps the **time part from `startedAt`**:

```
client sends   01KZ9X7Q2M  N761RDSJY0HMX246
                   │              │
stored         01KZ8BHKC0  N761RDSJY0HMX246
               └ startedAt ┘ └ kept as sent ┘
```

* The history keeps sorting by start time, whatever the phone's clock said, or whenever the ID was generated.
* Every attempt maps to the same key, and the write is conditional (`attribute_not_exists`), so a retry never overwrites anything: it reads back the stored workout instead. That read is strongly consistent, so it finds a first attempt written milliseconds earlier. It costs one read unit instead of half, which the provisioned capacity absorbs at no extra charge.
* The key is scoped to the caller's partition, `USER#<sub>`, so a chosen ID can only ever collide with the caller's own workouts.

## Workout times

`startedAt` and `endedAt` are both **required**: only completed workouts are stored. A workout in progress is expected to live on the client until it is finished.

* Accepted on input: ISO-8601 **with a time zone** (`2026-07-31T18:30:00Z` or `2026-07-31T12:30:00-06:00`). Anything else is a `400`.
* Stored as UTC with a fixed width: `yyyy-MM-ddTHH:mm:ssZ`, truncated to seconds. A fixed width matters because DynamoDB compares sort keys as text.
* `endedAt` must be after `startedAt`, at most 12 hours later, and no more than 5 minutes in the future (a tolerance for client clocks).

Two full timestamps are stored instead of a date plus two times, because a session can cross midnight, because a time without a zone is ambiguous, and because duration is then a subtraction.

## Sets carry their own unit

A set is a `count`, a `weight` and a `unit`, and the unit belongs to **each set**, not to the exercise or the user: one gym mixes machines in kilos and in pounds, sometimes within the same exercise.

| `unit` | `weight` | For |
|---|---|---|
| `KG` | 0 or more | Plates and machines in kilos |
| `LB` | 0 or more | Plates and machines in pounds |
| `NONE` | must be `0` | Sets without a weight, like pull-ups: only the count matters |

`NONE` is its own value rather than `KG` with a weight of zero, because "0 kg" and "no weight" are different sets: a weighted pull-up with +10 kg is `KG`, a plain one is `NONE`. A weight sent with `NONE` is a `400`, not silently dropped.

Duration and distance, for cardio, do not fit this shape yet: a run can only be logged as a count, see [still open](decisions.md#still-open).

## Every item says which shape it was written with

Each stored item carries a `schemaVersion`, a number stamped on every write. All three are at `1` today.

| Item | Version | Covers |
|---|---|---|
| Gym | `GYM_SCHEMA_VERSION` | the gym item |
| Exercise | `EXERCISE_SCHEMA_VERSION` | the catalog item |
| Workout | `WORKOUT_SCHEMA_VERSION` | the workout and the exercises and sets nested inside it |

One number per item type, because the three shapes evolve independently: changing how a workout is stored should not renumber every gym.

**Nothing reads it yet**, and that is the point. It exists so that a later change can tell an old item from a new one — either a migration script reading items raw from a scan, or a setter added to the schema to upgrade an item as it is read. Adding a field never needs this: `StaticTableSchema` ignores attributes it does not know and leaves missing ones `null`, so old items keep reading correctly. What needs it is the case inspection cannot solve — **a field whose meaning changes while its name and type stay the same**, which no amount of looking at the stored attributes can detect.

It is stamped in [`TableSchemaFactory`](../core/src/main/java/licaza/etiya/core/repository/dynamo/TableSchemaFactory.java) and is deliberately **not** a field on the model classes. Those are serialized straight into API responses and read straight from request bodies, so a field there would publish a storage detail as part of the API and let a client send its own version. It is written from a constant and ignored on read, the same way `PK` and `SK` are.

The reason to do this before production rather than when it is needed: data cannot be versioned retroactively. An item written without the attribute never gains one, and the first migration would have to treat "no version" as an implicit version 0.
