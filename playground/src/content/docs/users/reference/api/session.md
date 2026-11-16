# Sessions

The layer with *colour*: it takes a query (which has none) and runs it. The
two sessions expose the same surface and consume the same execution plan — including the same error
messages, which a test compares.

:::note[Where this text comes from]
Everything below the headings is generated from the package's own docstrings, on every build.
:::

## Sessions

### `SnakeSession`

```python
SnakeSession(driver: SnakeDriver, dialect: SnakeDialect, *, model_registry: SnakeRegistry | None = None) -> None
```

Runs queries against a driver and maps the results to models.

**Functions:**

- **close** – Closes the underlying driver (with a pool, it RETURNS the connection to the pool).
- **all** – Runs the query and returns every row as an instance of the model.
- **first** – Runs the query with LIMIT 1 and returns the first instance, or None if there is none.
- **iterate** – Walks the result WITHOUT materialising it whole: one instance at a time.
- **count** – Counts the rows that match the query (COUNT(*), it honours filters and JOINs).
- **exists** – Tells whether any row matching the query exists (EXISTS).
- **select** – Projects concrete columns and/or aggregates: it returns TUPLES (not model instances).
- **annotate** – Annotates each row of the base model with aggregates and wraps it in a typed `@snake_result`.
- **call** – Calls a database FUNCTION that returns rows and hydrates them into a DECLARED shape.
- **explain** – Asks the engine for its PLAN for this query, without running it.
- **raw** – Runs RAW SQL and hydrates it into a DECLARED shape (`@snake_row`).
- **get_or_create** – Looks up with the query and, if there is nothing, inserts whatever `build` returns. Gives `(row, created)`.
- **refresh** – Reloads the instance from the DB, overwriting ALL of its columns. It returns the same one.
- **execute_procedure** – Runs a PROCEDURE that returns NO rows (`CALL name(...)`); the opposite of `call(...)`.
- **add** – Inserts the instance. With RETURNING, it assigns back ALL the columns from the DB.
- **add_all** – Inserts a batch of instances of the SAME model with a single multi-row INSERT per chunk.
- **upsert** – Inserts the instance resolving the conflict over `on_conflict` (an idempotent upsert).
- **update** – Updates the instance's non-PK columns, filtering by its primary key.
- **delete** – Deletes the instance's row, filtering by its primary key.
- **update_where** – Updates IN BULK the rows that match the query's filter. It returns the affected ones.
- **delete_where** – Deletes IN BULK the rows that match the query's filter. It returns the affected ones.
- **commit** – Commits the transaction in progress (it delegates to the driver).
- **rollback** – Rolls back the transaction in progress (it delegates to the driver).
- **set_isolation** – Sets the ISOLATION level of the transaction starting now.
- **savepoint** – SAVEPOINT context manager: it isolates a block inside the transaction in progress.

**Attributes:**

- **dialect** (`SnakeDialect`) – This session's dialect, read-only: to ask it what the engine knows how to do.

The session, and the registry whose models decide which TYPE caveats it mentions.

`model_registry` defaults to the global one, which is what almost every project has. It
exists because a project built entirely on `@snake_model(registry=...)` used to open a
session and hear NOTHING: the advisor enumerated the global registry, found no models, and
the fidelity caveats — the `Decimal` that SQLite degrades, the timestamps without a zone —
went unsaid. Structural caveats came out either way; the type ones did not.

#### `dialect`

```python
dialect: SnakeDialect
```

This session's dialect, read-only: to ask it what the engine knows how to do.

Public because there is application code that LEGITIMATELY changes with the engine — the
demos' seeder inserts row by row where there is no `RETURNING`, because it needs the ids —
and the alternative was for each of them to sneak in through `session._dialect`. Asking about
a declared capability is the exact opposite of coupling to an engine: it is not taking for
granted the one you happen to have.

#### `close`

```python
close() -> None
```

Closes the underlying driver (with a pool, it RETURNS the connection to the pool).

`__exit__` does NOT call it (the driver is injected), but without this method a connection
taken out of a pool had no way back.

#### `all`

```python
all(query: SnakeQuery[T] | SnakeCompound[T] | SnakeRecursive[T]) -> list[T]
```

Runs the query and returns every row as an instance of the model.

It also accepts a COMPOUND (`UNION`/`EXCEPT`/`INTERSECT`) with no separate path: it fulfils
the same contract as a query (`model`, `has_includes`, `to_sql`).

#### `first`

```python
first(query: SnakeQuery[T] | SnakeCompound[T] | SnakeRecursive[T]) -> T | None
```

Runs the query with LIMIT 1 and returns the first instance, or None if there is none.

#### `iterate`

```python
iterate(query: SnakeQuery[T] | SnakeCompound[T] | SnakeRecursive[T], *, chunk: int = 1000) -> Iterator[T]
```

Walks the result WITHOUT materialising it whole: one instance at a time.

    for invoice in session.iterate(SnakeQuery(Invoice), chunk=500):
        export(invoice)

`all()` builds a list with ALL the rows before returning the first one; over ten million rows
that is ten million tuples and ten million objects in memory. Here the engine keeps the
result (a server-side cursor where there is one) and only `chunk` rows travel at a time. It
is lazy: nothing is executed until the first row is asked for, so cutting out with a `break`
does not pay for the rest.

It does NOT admit `include()` of a to-many nor prefetch, and it RAISES if you ask for one.
The select-in needs every root to fire its second query and in streaming they do not exist:
the ways out would be materialising (which defeats this) or one query per row (an N+1). Both
betray what was asked for, so it is said out loud. The `include()` of a to-ONE does work: it
travels in the same JOIN.

#### `count`

```python
count(query: SnakeQuery[T]) -> int
```

Counts the rows that match the query (COUNT(*), it honours filters and JOINs).

#### `exists`

```python
exists(query: SnakeQuery[T]) -> bool
```

Tells whether any row matching the query exists (EXISTS).

#### `select`

```python
select(query: SnakeQuery[Any] | SnakeJoinedQuery[Any, Any], /, *columns: SnakeValue[Any]) -> list[tuple[Any, ...]]
```

Projects concrete columns and/or aggregates: it returns TUPLES (not model instances).

Partial data does not pretend to be a complete model. Typed up to FOUR values, and a
fifth is not a looser tuple — there is no overload for it, so it fails the checker
(overloads); beyond that, `tuple[Any, ...]`.

It accepts a `SnakeJoinedQuery` (a JOIN onto a collection -> MULTIPLIED rows, one per child),
which `all`/`first` do NOT accept: hydrating multiplied models is a type error. Each value is
coerced to the determinable `python_type`; whatever has none (arithmetic, subqueries) passes
through untouched.

#### `annotate`

```python
annotate(query: SnakeQuery[T], result: type[R], /, **aggregates: SnakeValue[Any]) -> list[R]
```

Annotates each row of the base model with aggregates and wraps it in a typed `@snake_result`.

It returns `list[R]` with `R` the concrete `@snake_result` (not `list[Any]`): the
`SnakeResult[Any]` bound captures the real type and forces `result` to be a `@snake_result`.

The `**aggregates` match by NAME with `result`'s scalar fields (validated BEFORE emitting).
The scalars are coerced to the type DECLARED in the `@snake_result` (an `avg: float` would
receive an AVG's `Decimal` without this).

LIMIT: that the query consults the SAME model the `result` declares is validated at RUNTIME
(`SnakeEmitError`), not in the checker: it would demand a dependent bound
`R <: SnakeResult[T]`, and `TypeVar` bounds cannot be generic. See
`snakeorm/decorators/result.py`.

#### `call`

```python
call(name: str, args: Sequence[object], *, into: type[Row]) -> list[Row]
```

Calls a database FUNCTION that returns rows and hydrates them into a DECLARED shape.

It emits `SELECT * FROM name(placeholders)` (a `RETURNS TABLE`/`SETOF` function in Postgres).
The ARGS travel parametrised (user data, which kills injection); the name is a developer's
identifier and gets emitted as is.

POSITIONAL mapping onto the `@snake_row` `into`, coercing each column to its DECLARED type.
OPAQUE SQL: neither the routine's existence nor its shape is checked (you declare, I
hydrate). For a PROCEDURE with no rows, use `execute_procedure(...)`.

#### `explain`

```python
explain(query: SnakeQuery[ModelT]) -> list[str]
```

Asks the engine for its PLAN for this query, without running it.

The dialect wraps the compiled statement and the driver runs it: `EXPLAIN` costs an extra
round trip and nothing else, and the parameters travel as parameters.

The lines come back as the ENGINE writes them. Postgres answers one column, SQLite four and
MySQL about a dozen, so a row is joined into a line rather than forced into a shape the
three do not share.

#### `raw`

```python
raw(sql: str, params: Sequence[object] = (), *, into: type[Row]) -> list[Row]
```

Runs RAW SQL and hydrates it into a DECLARED shape (`@snake_row`).

The escape hatch for the SQL the builder does not cover; at least the result comes back
TYPED. Parametrised values; the SHAPE is not checked (the same contract as `call`: you
declare, I hydrate).

Limit: the number of columns is checked ROW BY ROW, so a query with no rows passes even if
its shape does not match (the driver hands over data, not the cursor's description). To write
without reading (`VACUUM`, `SET`), use the driver directly.

#### `get_or_create`

```python
get_or_create(query: SnakeQuery[ModelT], build: Callable[[], ModelT]) -> tuple[ModelT, bool]
```

Looks up with the query and, if there is nothing, inserts whatever `build` returns. Gives `(row, created)`.

    user, created = session.get_or_create(
        SnakeQuery(User).filter(User.email == "a@x.com"),
        lambda: User(email="a@x.com", name="Ana"),
    )

The boolean is the reason it exists: `upsert` writes too, but it does not say whether it
created it or it was already there. `build` is an explicit CALLABLE (not the filter's magic
`**kwargs` as in Django): you build the object yourself with the typed constructor.

Mind the race: another transaction fits between the SELECT and the INSERT. If two processes
can create the same row, put a UNIQUE on it and catch its violation, or use `upsert`.

#### `refresh`

```python
refresh(instance: ModelT) -> ModelT
```

Reloads the instance from the DB, overwriting ALL of its columns. It returns the same one.

It is needed when the DB changed the row on its own (a trigger, a `server_default`, a bulk
write, another transaction); the alternative was re-querying and having TWO objects for the
same row. It is identified by PK; if the row is no longer there, it is said in plain words.

#### `execute_procedure`

```python
execute_procedure(name: str, args: Sequence[object]) -> None
```

Runs a PROCEDURE that returns NO rows (`CALL name(...)`); the opposite of `call(...)`.

The ARGS travel parametrised (user data); the NAME is an identifier and cannot, so it goes
through the same `routine_name` check `call` uses — this door had the very same hole, and
one rule for the two of them is the point. If your routine returns rows, use `call`.

#### `add`

```python
add(instance: ModelT) -> ModelT
```

Inserts the instance. With RETURNING, it assigns back ALL the columns from the DB.

Not just the PK: a `DEFAULT now()` or a trigger column comes back into the object (coerced).
The columns omitted from the INSERT (MISSING, e.g. an autoincrementing PK) are the ones the
server fills in.

#### `add_all`

```python
add_all(instances: Sequence[ModelT]) -> None
```

Inserts a batch of instances of the SAME model with a single multi-row INSERT per chunk.

A single `INSERT ... VALUES (...), (...)` (not `executemany`: psycopg2 would go row by row
with no RETURNING). It chunks by `max_bind_params // columns` so as not to overshoot the
engine's limit. With RETURNING it fills in the server's columns IN ORDER. An empty list ->
nothing. Different models -> an error.

#### `upsert`

```python
upsert(instance: SnakeModel, /, *, on_conflict: Sequence[SnakeExpr[Any]], update: Sequence[SnakeExpr[Any]] = ()) -> None
```

Inserts the instance resolving the conflict over `on_conflict` (an idempotent upsert).

Without `update` -> it does not touch the row (`DO NOTHING`); with `update` -> it rewrites
those columns (`DO UPDATE SET c = EXCLUDED.c`). The jargon (`ON CONFLICT`) is translated by
the dialect. A `DO NOTHING` with a conflict returns no row, so there is nothing to assign.

If the dialect does not support it, `SnakeUnsupportedFeature`: it is NOT emulated with
SELECT+INSERT (a race between the SELECT and the INSERT; it would fake an atomicity it does
not have).

#### `update`

```python
update(instance: SnakeModel) -> None
```

Updates the instance's non-PK columns, filtering by its primary key.

#### `delete`

```python
delete(instance: SnakeModel) -> None
```

Deletes the instance's row, filtering by its primary key.

#### `update_where`

```python
update_where(query: SnakeQuery[ModelT], values: Sequence[tuple[SnakeExpr[Any], object]]) -> int
```

Updates IN BULK the rows that match the query's filter. It returns the affected ones.

`values` are (column, value) pairs: `[(User.views, User.views + 1)]`, with the column as a
`SnakeExpr` and the value a literal or an expression. It is a SEQUENCE of pairs, NOT a
`Mapping`, because `SnakeExpr` is deliberately NOT hashable (its `==` returns a condition,
not a bool).

The SET only touches columns of the BASE TABLE: navigating a relationship (key or value) is
rejected (one cannot assign from a joined table without a FROM). Only the WHERE can go deep.

#### `delete_where`

```python
delete_where(query: SnakeQuery[ModelT]) -> int
```

Deletes IN BULK the rows that match the query's filter. It returns the affected ones.

The guard lives in the query: with no explicit filter, it raises (a DELETE with no WHERE
would wipe the table out).

#### `commit`

```python
commit() -> None
```

Commits the transaction in progress (it delegates to the driver).

#### `rollback`

```python
rollback() -> None
```

Rolls back the transaction in progress (it delegates to the driver).

#### `set_isolation`

```python
set_isolation(level: SnakeIsolation) -> None
```

Sets the ISOLATION level of the transaction starting now.

The other half of concurrency control: `for_update()` says which rows you RESERVE, the
isolation what you SEE meanwhile. It has to be called before reading or writing: `SET
TRANSACTION` is only valid as the first statement, and the engine rejects it if the DB has
already been touched.

The engine is ASKED first. This used to hand the statement straight to the driver, so on an
engine without it the ORM emitted SQL the engine refuses — `near "SET": syntax error` on
SQLite — instead of saying what it could not do. Emitting for one engine from the session is
also the thing the dialect seam exists to prevent.

#### `savepoint`

```python
savepoint() -> Iterator[None]
```

SAVEPOINT context manager: it isolates a block inside the transaction in progress.

On entry `SAVEPOINT`; on a clean exit `RELEASE`; if the block raises, `ROLLBACK TO SAVEPOINT`
(it discards ONLY what is inside, the transaction stays alive) and RE-RAISES. It exists so a
long process does not lose everything if one part of it fails.

NESTABLE: each level uses a name unique per depth (`sp1`, `sp2`, ...; an INTERNAL name, never
user data). On exit it is decremented, so the same level reuses the name.

### `AsyncSession`

```python
AsyncSession(driver: AsyncDriver, dialect: SnakeDialect, *, model_registry: SnakeRegistry | None = None) -> None
```

Runs queries against an `AsyncDriver` and maps the results to models.

**Functions:**

- **iterate** – Async mirror of `SnakeSession.iterate`: it walks the result without materialising it whole.
- **all** – Runs the query and returns the rows as instances of the model.
- **first** – The first row, or None. It bounds with LIMIT 1: it does not fetch the rest just to throw it away.
- **count** – Counts the rows that match the query.
- **exists** – Tells whether any row matching the query exists.
- **add** – Inserts the instance and copies back onto it whatever the `RETURNING` gives.
- **update** – Updates the instance's non-PK columns, filtering by its primary key.
- **delete** – Deletes the instance's row, filtering by its primary key.
- **delete_where** – Deletes IN BULK the rows that match the filter. It warns about the signals it skips.
- **update_where** – Updates IN BULK. It warns about the signals it skips, just like the synchronous session.
- **select** – Projects columns and/or aggregates: it returns TUPLES, not instances.
- **annotate** – Annotates each row with aggregates and wraps it in a typed `@snake_result`.
- **call** – Calls a database FUNCTION that returns rows and hydrates them into `into`.
- **explain** – The plan for this query, without running it. Same contract as the synchronous session.
- **raw** – The escape hatch: raw SQL hydrated into a DECLARED shape (`@snake_row`).
- **add_all** – Inserts a batch with a single multi-row INSERT per chunk.
- **upsert** – Inserts resolving the conflict over `on_conflict` (an idempotent upsert).
- **refresh** – Reloads the instance from the database, overwriting ALL of its columns.
- **get_or_create** – Looks it up and, if there is nothing, inserts whatever `build` returns. Gives `(row, created)`.
- **set_isolation** – Sets the ISOLATION of the transaction starting now (before reading or writing).
- **savepoint** – SAVEPOINT as an asynchronous context manager: it isolates a block inside the transaction.
- **execute_procedure** – Runs a PROCEDURE that returns NO rows (`CALL name(...)`); the opposite of `call(...)`.
- **commit** – Commits the transaction in progress.
- **rollback** – Rolls back the transaction in progress.
- **close** – Closes the underlying connection.

**Attributes:**

- **dialect** (`SnakeDialect`) – This session's dialect, read-only: to ask it what the engine knows how to do.

The session, and the registry whose models decide which TYPE caveats it mentions.

`model_registry` defaults to the global one, which is what almost every project has. It
exists because a project built entirely on `@snake_model(registry=...)` used to open a
session and hear NOTHING: the advisor enumerated the global registry, found no models, and
the fidelity caveats — the `Decimal` that SQLite degrades, the timestamps without a zone —
went unsaid. Structural caveats came out either way; the type ones did not.

#### `dialect`

```python
dialect: SnakeDialect
```

This session's dialect, read-only: to ask it what the engine knows how to do.

Public because there is application code that LEGITIMATELY changes with the engine — the
demos' seeder inserts row by row where there is no `RETURNING`, because it needs the ids —
and the alternative was for each of them to sneak in through `session._dialect`. Asking about
a declared capability is the exact opposite of coupling to an engine: it is not taking for
granted the one you happen to have.

#### `iterate`

```python
iterate(query: SnakeQuery[T] | SnakeCompound[T] | SnakeRecursive[T], *, chunk: int = 1000) -> AsyncIterator[T]
```

Async mirror of `SnakeSession.iterate`: it walks the result without materialising it whole.

    async for invoice in session.iterate(SnakeQuery(Invoice), chunk=500):
        await export(invoice)

It is NOT `async def`: it returns the iterator so the GUARD fires on the call and not on the
first `async for`. With the same restriction as the synchronous one: `include()` of a to-many
and prefetch RAISE, because the select-in needs every root and in streaming they do not exist.

#### `all`

```python
all(query: SnakeQuery[T] | SnakeCompound[T] | SnakeRecursive[T]) -> list[T]
```

Runs the query and returns the rows as instances of the model.

It loads the `include`/`prefetch` relationships with the SAME criteria as the synchronous
session (to-one by LEFT JOIN, to-many by select-in, one query per level): the plans are shared.

#### `first`

```python
first(query: SnakeQuery[T] | SnakeCompound[T] | SnakeRecursive[T]) -> T | None
```

The first row, or None. It bounds with LIMIT 1: it does not fetch the rest just to throw it away.

#### `count`

```python
count(query: SnakeQuery[T]) -> int
```

Counts the rows that match the query.

#### `exists`

```python
exists(query: SnakeQuery[T]) -> bool
```

Tells whether any row matching the query exists.

#### `add`

```python
add(instance: ModelT) -> ModelT
```

Inserts the instance and copies back onto it whatever the `RETURNING` gives.

The plan is built by `planning.plan_insert`, the same one as the synchronous session (a
single decision about which columns go and what gets copied back).

#### `update`

```python
update(instance: SnakeModel) -> None
```

Updates the instance's non-PK columns, filtering by its primary key.

#### `delete`

```python
delete(instance: SnakeModel) -> None
```

Deletes the instance's row, filtering by its primary key.

#### `delete_where`

```python
delete_where(query: SnakeQuery[ModelT]) -> int
```

Deletes IN BULK the rows that match the filter. It warns about the signals it skips.

#### `update_where`

```python
update_where(query: SnakeQuery[ModelT], values: list[tuple[Any, object]]) -> int
```

Updates IN BULK. It warns about the signals it skips, just like the synchronous session.

#### `select`

```python
select(query: SnakeQuery[Any] | SnakeJoinedQuery[Any, Any], /, *columns: SnakeValue[Any]) -> list[tuple[Any, ...]]
```

Projects columns and/or aggregates: it returns TUPLES, not instances.

The projection and the coercion live in `planning.project_rows`, colourless: here it only
awaits. Typed like its synchronous sibling's implementation: `query: Any` there switched off
the guard that a compound query cannot be projected, and `*columns: Any` let a plain value
through where a `SnakeValue` is required.

#### `annotate`

```python
annotate(query: SnakeQuery[T], result: type[R], /, **aggregates: SnakeValue[Any]) -> list[R]
```

Annotates each row with aggregates and wraps it in a typed `@snake_result`.

Typed EXACTLY like its synchronous sibling: the `R: SnakeResult` bound (which rejects a
`result` that is not a `@snake_result`) must stay live in async, not `Any -> list[Any]`.

#### `call`

```python
call(name: str, args: Sequence[object], *, into: type[Row]) -> list[Row]
```

Calls a database FUNCTION that returns rows and hydrates them into `into`.

Typed EXACTLY like its synchronous sibling: `into: Any -> list[Any]` would switch off the
`Row: SnakeRow` bound (the lock that rejects an `into` that is not a `@snake_row`).

#### `explain`

```python
explain(query: SnakeQuery[ModelT]) -> list[str]
```

The plan for this query, without running it. Same contract as the synchronous session.

#### `raw`

```python
raw(sql: str, params: Sequence[object] = (), *, into: type[Row]) -> list[Row]
```

The escape hatch: raw SQL hydrated into a DECLARED shape (`@snake_row`).

Parametrised values; the SHAPE is not checked (the same contract as the synchronous session:
you declare, I hydrate).

#### `add_all`

```python
add_all(instances: Sequence[ModelT]) -> None
```

Inserts a batch with a single multi-row INSERT per chunk.

The PREs are ALL fired before anything is emitted (a handler can modify the instance, and
doing so halfway through the batch would leave some rows with the change and others without).

#### `upsert`

```python
upsert(instance: SnakeModel, /, *, on_conflict: Sequence[Any], update: Sequence[Any] = ()) -> None
```

Inserts resolving the conflict over `on_conflict` (an idempotent upsert).

#### `refresh`

```python
refresh(instance: ModelT) -> ModelT
```

Reloads the instance from the database, overwriting ALL of its columns.

#### `get_or_create`

```python
get_or_create(query: SnakeQuery[ModelT], build: Callable[[], ModelT]) -> tuple[ModelT, bool]
```

Looks it up and, if there is nothing, inserts whatever `build` returns. Gives `(row, created)`.

The boolean is the reason it exists: `upsert` writes too, but it does not say whether it
created it or it was already there.

#### `set_isolation`

```python
set_isolation(level: SnakeIsolation) -> None
```

Sets the ISOLATION of the transaction starting now (before reading or writing).

The engine is ASKED first, through the SAME guard the synchronous session calls. This used
to hand the statement straight to the driver, so on an engine without it SQLite answered
`near "SET": syntax error` — the failure its sibling's docstring says the check exists to
prevent, alive in this colour because the fix had been applied to one of the two.

#### `savepoint`

```python
savepoint() -> AsyncIterator[None]
```

SAVEPOINT as an asynchronous context manager: it isolates a block inside the transaction.

Same contract as the synchronous one (nesting by depth): on a clean exit `RELEASE`, if the
block raises it discards ONLY what is inside and re-raises.

#### `execute_procedure`

```python
execute_procedure(name: str, args: Sequence[object]) -> None
```

Runs a PROCEDURE that returns NO rows (`CALL name(...)`); the opposite of `call(...)`.

The ARGS travel parametrised (user data); the NAME goes through the same `routine_name`
check the other three doors use — the SAME sentence, not a reworded one.

#### `commit`

```python
commit() -> None
```

Commits the transaction in progress.

#### `rollback`

```python
rollback() -> None
```

Rolls back the transaction in progress.

#### `close`

```python
close() -> None
```

Closes the underlying connection.

### `snake_session`

```python
snake_session(database: str = DEFAULT_DATABASE) -> SnakeSession
```

Opens a session against the connection with that name, resolving the DSN by configuration.

A single path for the common case (multi-DB). Whoever needs to decorate the driver (logging,
pool, timeout) still builds the session by hand: this is convenience, not a replacement for the
seam.

Pairing driver and dialect is delegated to `SnakeConnectionConfig`, which exists precisely so
that a driver cannot be put together with another engine's dialect. Two composition roots are
one too many: the one nobody reviews is the one that ends up lying. The engine is READ like the
DSN is (see `backend_name_for`); hardcoding it would reach only one of the three.

### `SnakeIsolation`

Bases: `Enum`

What a transaction sees of what the others are doing while it is alive.

STANDARD SQL values (not engine jargon), the other half of concurrency control alongside
`for_update()`: the lock says which rows you reserve, the isolation what you see meanwhile.

- `READ_COMMITTED`: each statement sees what was committed at its instant (Postgres default).
- `REPEATABLE_READ`: a still photo of the whole transaction; a write conflict aborts it.
- `SERIALIZABLE`: as if they ran single file. The strongest guarantee and the one that aborts most.
- `READ_UNCOMMITTED`: for standard completeness; Postgres treats it as `READ COMMITTED`.

## Retries

### `with_retry`

```python
with_retry(session: SnakeSession, work: Callable[[SnakeSession], T], *, attempts: int = 3) -> T
```

Runs `work` and REPEATS it if the engine aborted the transaction over a transient conflict.

    seat = with_retry(session, lambda s: reserve_seat(s, course_id))

It lives in the session, not in the driver: an abort renders the WHOLE transaction useless
("current transaction is aborted"), so the entire unit of work has to be redone along with its
`rollback` — not the statement. It goes hand in hand with
`set_isolation(REPEATABLE_READ | SERIALIZABLE)`, which abort on conflict. `work` must be
IDEMPOTENT with respect to external side effects (do not send the email inside it).

### `is_transient`

```python
is_transient(error: BaseException) -> bool
```

Whether the error is a concurrency conflict that makes sense to retry.

The SQLSTATE is what gets looked at where there is one, not the message nor the driver's class.
Syntax, constraint or network errors are NOT transient: retrying them repeats the failure (and a
constraint could duplicate side effects).

It reads every spelling the shipped drivers use, because it used to read exactly one. The tests
could not see that: they built a double carrying the attribute the code read, so the fixture was
shaped like the implementation and agreed with it by construction.

## Instants

### `SnakeUtc`

Bases: `datetime`

An instant in UTC. There is no way to build one that is not.

    created: SnakeColumn[SnakeUtc] = snake_datetimetz()

It is a SUBCLASS of `datetime`, and the whole design decision sits right there:

- Facing inwards, the checker rejects `SnakeUtc = datetime.now(UTC)`, because a `datetime` is not
  a `SnakeUtc`. The error shows up in the editor, not when saving.
- Facing outwards, a `SnakeUtc` IS a `datetime`: `isinstance`, `isoformat()`, `astimezone()`, the
  DRF or Pydantic serialisers and the templates all keep working without noticing.

A wrapper keeping the `datetime` inside would give the first and lose the second: every library
in the stack would have to be taught the type.

Two shapes arrive from outside, and only one carries the instant:

    JS   `date.toISOString()`      "2026-06-01T12:30:00.000Z"   -> parse()      direct
    HTML `<input datetime-local>`  "2026-06-01T14:30"           -> from_zone()  must be placed

The second cannot be resolved on its own: that string does not say where the time is from. Only
someone who knows the user does, so the caller supplies the zone.

**Functions:**

- **astimezone** – The same instant in another zone, as a plain `datetime` — it is NO LONGER a `SnakeUtc`.
- **replace** – Like `datetime.replace`, but returning a plain `datetime` if the zone is changed.
- **now** – The current instant. The signature accepts `tz` for `datetime` compatibility and ignores
- **of** – Re-expresses in UTC a `datetime` that ALREADY has a zone. It does not move the instant.
- **from_zone** – Places a LOCAL time in its zone and returns the instant in UTC.
- **parse** – Reads an ISO-8601 WITH a zone. It is the direct path from JS.
- **to_zone** – The same instant, expressed in another zone. For PAINTING it, not for storing it.

#### `astimezone`

```python
astimezone(tz: tzinfo | None = None) -> datetime
```

The same instant in another zone, as a plain `datetime` — it is NO LONGER a `SnakeUtc`.

This is the piece that keeps the type from being viral. `datetime.astimezone` rebuilds the
SAME class, so without this a `SnakeUtc` in Madrid would try to exist and the constructor
would reject it: any template or serialiser painting a date in local time would blow up. And
the type changing is the CORRECT outcome: converted to Madrid it is no longer a UTC instant.

#### `replace`

```python
replace(*args: Any, **kwargs: Any) -> datetime
```

Like `datetime.replace`, but returning a plain `datetime` if the zone is changed.

Same criterion as `astimezone`: relabelling the zone stops it being an instant in UTC, so it
stops being a `SnakeUtc`. Leave the zone alone and it still is one.

#### `now`

```python
now(tz: object = None) -> SnakeUtc
```

The current instant. The signature accepts `tz` for `datetime` compatibility and ignores
it: a `SnakeUtc` is always UTC.

#### `of`

```python
of(value: datetime) -> SnakeUtc
```

Re-expresses in UTC a `datetime` that ALREADY has a zone. It does not move the instant.

It rejects a naive one: with no zone there is no instant to re-express, it would have to be
guessed where it is from.

#### `from_zone`

```python
from_zone(value: datetime, zone: str) -> SnakeUtc
```

Places a LOCAL time in its zone and returns the instant in UTC.

    SnakeUtc.from_zone(datetime.fromisoformat(form["when"]), user.zone)

It is the form's path. The zone is applied with its DAYLIGHT SAVING (`ZoneInfo`, not a fixed
offset): the same 14:30 in Madrid are 12:30 UTC in June and 13:30 in January, and a fixed
offset would be right half the year — the worst kind of bug, the one that only shows up for
one season.

#### `parse`

```python
parse(text: str) -> SnakeUtc
```

Reads an ISO-8601 WITH a zone. It is the direct path from JS.

Text with no zone is REJECTED: it is what `<input type="datetime-local">` sends and it does
not say where the time is from. Converting an offset here IS correct — you called `parse` to
get the UTC — but inventing a zone that never came is not.

#### `to_zone`

```python
to_zone(zone: str) -> datetime
```

The same instant, expressed in another zone. For PAINTING it, not for storing it.

Storing in UTC and showing in the reader's zone is the full cycle; this is its outbound half.

### `utc_now`

```python
utc_now() -> datetime
```

The current instant, WITH a zone and in UTC.

It exists so nobody has to remember: a bare `datetime.now()` returns a naive one, which is the
value the ORM is going to reject. A `utc_now()` that reads at a glance saves the round trip.

### `parse_utc`

```python
parse_utc(text: str) -> datetime
```

Reads an ISO-8601 WITH a zone and returns the instant in UTC.

    parse_utc("2026-06-01T12:30:00.000Z")     # what JS sends with toISOString()
    parse_utc("2026-06-01T14:30:00+02:00")    # another offset: re-expressed in UTC

It rejects text with no zone — what `<input type="datetime-local">` sends — because that text does
not say where the time is from, and the ORM is not going to assume it.

### `to_utc`

```python
to_utc(value: datetime) -> datetime
```

Re-expresses in UTC an instant that ALREADY has a zone. It does not move it: only rewrites it.

It rejects a naive one on purpose. A `datetime` with no zone identifies no instant — the same
14:30 are different moments in Madrid and in Bogota — so converting it would mean GUESSING where
it is from. `utc_from_zone()` is there for that, where the zone comes from whoever knows it.

### `utc_from_zone`

```python
utc_from_zone(value: datetime, zone: str) -> datetime
```

Places a LOCAL time in its zone and returns the instant in UTC.

    utc_from_zone(datetime(2026, 6, 1, 14, 30), "Europe/Madrid")   # -> 12:30 UTC

It is the form's tool: `<input type="datetime-local">` sends "2026-06-01T14:30" with no zone. The
zone is applied with its DAYLIGHT SAVING (`ZoneInfo`, not a fixed offset): the same 14:30 in
Madrid are 12:30 UTC in June and 13:30 in January, and a fixed offset would be right half the
year.

It rejects a `datetime` that already has a zone: it would be ambiguous between reinterpreting and
converting, two reasonable readings with different results. `to_utc()` is there to convert.

## Signals

### `SnakeSignal`

Bases: `Enum`

The moment a handler fires relative to the write.
### `snake_on`

```python
snake_on(model: type[T], signal: SnakeSignal) -> Callable[[Callable[[T], None]], Callable[[T], None]]
```

Connects a handler to a model's signal. Returns the function untouched.

    @snake_on(Order, SnakeSignal.POST_SAVE)
    def notify(order: Order) -> None:
        ...

The handler receives the instance with the model's TYPE (to the checker it is a `Order`, not
`Any`).

