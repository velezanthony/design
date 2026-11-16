# Engines: dialects, drivers and capabilities

Two axes that never mix: the **dialect** decides how the SQL is written, the
**driver** decides how it is executed. A model never sees either.

On top of that sits the capability catalogue: every dialect answers the WHOLE of `Cap` with `Full`,
`Degraded(reason)` or `Nope(reason)`, and one that forgets an entry fails on import. From it come
both the decision the plan takes and the warning you get when the session opens.

:::note[Where this text comes from]
Everything below the headings is generated from the package's own docstrings, on every build.
:::

## Connection

### `SnakeConnectionConfig`

```python
SnakeConnectionConfig(backend: SnakeBackend, name: str, host: str = 'localhost', port: str = '', user: str = '', password: str = '', dsn: str | None = None) -> None
```

Everything defining ONE connection, in a typed object (frozen: not overwritten mid-request).

`name` is the database (Postgres/MySQL) or, for SQLite, whatever it calls a database: a file
path, `:memory:`, or a `file:` URI — the last being the only one that gives several connections
ONE in-memory database. The remaining pieces only apply to the networked engines; SQLite ignores
them.

**Functions:**

- **from_dsn** – Takes a DSN apart into the pieces THAT engine's driver actually wants.
- **driver_and_dialect** – Builds driver and dialect PAIRED according to `backend` (impossible to unpair them).
- **open** – Assembles the whole session (driver + dialect paired) in a single call.
- **async_driver_and_dialect** – The async pair PAIRED according to `backend`, just like its synchronous sibling.
- **open_async** – Assembles the whole ASYNCHRONOUS session (driver + dialect paired) in one call.
- **postgres_dsn** – psycopg's DSN: the declared one if there is one, or built from the pieces.

**Attributes:**

- **dsn** (`str | None`) – An already-written DSN, for when the connection comes as one rather than in pieces.

#### `dsn`

```python
dsn: str | None = None
```

An already-written DSN, for when the connection comes as one rather than in pieces.

It exists so that ONE single piece pairs driver and dialect. `snake_session(name)` resolves the
connection through its DSN — multi-DB by environment variable — and used to assemble the pair by
hand, which left two places where somebody could join a driver to another engine's dialect. That
path now comes through here, and the pairing goes on living in a single method.

#### `from_dsn`

```python
from_dsn(dsn: str, backend: SnakeBackend) -> SnakeConnectionConfig
```

Takes a DSN apart into the pieces THAT engine's driver actually wants.

Each one asks for the connection in its own shape and there is no common denominator:
psycopg reads a DSN string, SQLite wants a filesystem PATH, and PyMySQL wants loose keyword
arguments. So a DSN has to be translated, and it is translated HERE — beside
`driver_and_dialect` — because this class exists so that pairing a driver with another
engine's dialect is not expressible. A second place doing the same translation would be a
second place to get it wrong.

It was `snake_session` that needed it, and needed it badly: it handed the connection's ALIAS
over as `name`, which Postgres ignores (its DSN wins) and SQLite reads as the path. So
`snake_session("reports")` created a file literally called `reports` in the working
directory instead of opening the one the DSN named — and a test that only checked the
dialect passed over it.

#### `driver_and_dialect`

```python
driver_and_dialect() -> tuple[SnakeDriver, SnakeDialect]
```

Builds driver and dialect PAIRED according to `backend` (impossible to unpair them).

#### `open`

```python
open(wrap: Callable[[SnakeDriver], SnakeDriver] | None = None, *, model_registry: SnakeRegistry | None = None) -> SnakeSession
```

Assembles the whole session (driver + dialect paired) in a single call.

`wrap` wraps the driver before the session is assembled: the seam for `CaptureDriver` (so the
debug panel sees the SQL), pooling, logging or timeout. It is passed FROM outside — this
module does not import it — so the central config stays uncoupled from the debug subsystem
and from the decorators.

#### `async_driver_and_dialect`

```python
async_driver_and_dialect() -> tuple[AsyncDriver, SnakeDialect]
```

The async pair PAIRED according to `backend`, just like its synchronous sibling.

It is `async` because opening can wait: `AsyncPsycopgDriver.connect` is. Reusing the
synchronous method was no good, hence there are two: `driver_and_dialect` connects eagerly.

#### `open_async`

```python
open_async(wrap: Callable[[AsyncDriver], AsyncDriver] | None = None, *, model_registry: SnakeRegistry | None = None) -> AsyncSession
```

Assembles the whole ASYNCHRONOUS session (driver + dialect paired) in one call.

Without this, the async user picked driver and dialect separately — which is exactly what this
module exists to prevent: nobody can put a `SQLiteDriver` together with a `PostgresDialect`
because they never choose the two pieces.

`wrap` wraps the driver before the session is assembled, as on the synchronous path.

#### `postgres_dsn`

```python
postgres_dsn() -> str
```

psycopg's DSN: the declared one if there is one, or built from the pieces.

It only includes what was declared (no empty pieces). The UTC zone is pinned the same way on
both paths: that is what makes opening the database to look at a date show the instant that
was stored, and not the server's local time.

### `SnakeBackend`

Bases: `Enum`

The engine: it picks driver (how it EXECUTES) and dialect (how it WRITES SQL) at once.

**Attributes:**

- **db_system_name** (`str`) – What OpenTelemetry calls this engine (`db.system.name`), for the `otel` debug channel.

#### `db_system_name`

```python
db_system_name: str
```

What OpenTelemetry calls this engine (`db.system.name`), for the `otel` debug channel.

It answers HERE because this enum is the one place engine identity is written down. The
alternatives are all second spellings of the same fact: the driver's class is hidden the
moment a pool or a timeout decorator wraps it, and the SQL's placeholders say nothing about
MariaDB.

`mariadb` IS a value of its own in the convention and not an alias of `mysql`. SnakeORM
reaches both through PyMySQL and cannot tell them apart without asking the server for its
banner, so it reports `mysql` and leaves the correction to whoever knows: the capture driver
takes the name as an argument.

## Dialects

### `SnakeDialect`

Bases: `Protocol`

How the SQL is written for one specific engine. It executes NOTHING.

It only enters `sql/` (emission). The graph and the models are 100% engine-agnostic.
Adding a new engine = one implementation of this Protocol, without touching the core.

**Functions:**

- **placeholder** – Returns the parameter marker for the given position (e.g. '%s', '$1', '?').
- **trigger_statements** – How this engine spells a trigger body: `(statements to run first, the body to inline)`.
- **quote_ident** – Quotes an identifier (table or column) the way the engine wants it.
- **json_get_sql** – Emits a read INSIDE a JSON document, cast to the declared type.
- **date_shift_sql** – Emits a date moved by a signed amount, with the amount as a PARAMETER.
- **string_agg_sql** – Emits a group joined into one string, deciding how the SEPARATOR travels.
- **integer_division_op** – How this engine spells division between two INTEGERS.
- **cast_sql** – Emits an EXPLICIT cast of an already-emitted value to the named type.
- **map_type** – Translates a Python type into its COMPLETE SQL type, with its family's parameters.
- **drop_all_sql** – Statements that leave the schema empty of `tables`, in the order they must run.
- **explain_sql** – Wraps a statement so the engine reports its PLAN instead of running it.
- **statement_timeout_sql** – The statement that caps how long a query may run, or `None` if the engine has none.
- **register_type** – Adds (or rewrites) the SQL spelling of a Python type in THIS dialect.
- **literal** – Formats a value as a SQL literal for DDL (DEFAULT), which takes no placeholders.
- **function_name** – Translates the agnostic name of a scalar function into the engine's own.
- **index_method** – Translates an index's access method (agnostic) into the engine's jargon.
- **server_default_sql** – Translates a SERVER-side default value (agnostic: `NOW`, `UUID_V4`...) into its SQL
- **limit_offset** – Emits the parametrised LIMIT/OFFSET clause (appending to `params`), or '' if there is neither.
- **on_conflict_clause** – An upsert's conflict-resolution clause. `conflict_columns` define the conflict (a

**Attributes:**

- **capabilities** (`SnakeCapabilities`) – What the engine KNOWS how to do, answered against the WHOLE `Cap` catalogue. The source of truth.
- **syntax** (`SnakeSyntax`) – Differences in the SHAPE of the statement. They are translated in the emitter; they never stop the plan.
- **limits** (`SnakeLimits`) – The engine's numeric ceilings. `None` is not "no ceiling": it is "it ignores the declared parameter".
- **supports_returning** (`bool`) – Whether it can return the rows it wrote (`INSERT ... RETURNING`).
- **supports_row_constructor** (`bool`) – Whether it understands `(a, b) IN ((...), (...))`. If not, the emitter uses the equivalent OR-of-ANDs.
- **supports_transactional_ddl** (`bool`) – Whether DDL goes inside the transaction. With it, an N-step migration is all-or-nothing.
- **supports_upsert** (`bool`) – Whether it can do an INSERT that is idempotent on conflict. Without it, `session.upsert()` raises (it does not emulate: there is a race).
- **supports_add_constraint** (`bool`) – Whether it accepts `ALTER TABLE ... ADD CONSTRAINT`. It decides the SHAPE of the plan: with
- **supports_alter_column** (`bool`) – Whether it can change a column's type/nullability/default. SQLite cannot: it would require rebuilding the table.
- **supports_schemas** (`bool`) – Whether it has named schemas (`CREATE SCHEMA`). On SQLite the "schemas" are ATTACHed databases (`ATTACH`).
- **supports_stored_functions** (`bool`) – Whether it stores named functions that a migration can create.
- **supports_row_locking** (`bool`) – Whether it can lock ROWS (`SELECT ... FOR UPDATE`). SQLite locks the file: asking for it fails at compile time.
- **supports_comments** (`bool`) – Whether it STORES table and column comments. Only SQLite does not.
- **supports_replace_view** (`bool`) – Whether it can do `CREATE OR REPLACE VIEW`. Without it, altering a view is drop+create, and `realize()` rewrites it.
- **supports_parenthesised_compound** (`bool`) – Whether the branches of a UNION/EXCEPT/INTERSECT may go in PARENTHESES. It is not cosmetic:
- **supports_cte_in_compound_branch** (`bool`) – Whether a `WITH [RECURSIVE] ...` may be a BRANCH of a UNION/EXCEPT/INTERSECT.
- **supports_ilike** (`bool`) – Whether it has `ILIKE`. Without it (SQLite) the emission falls back to `LOWER(a) LIKE LOWER(b)`, with ASCII-only folding.
- **triggers_are_table_scoped** (`bool`) – Whether a trigger belongs to a TABLE (`DROP TRIGGER x ON t`) or is global (SQLite: `DROP TRIGGER x`).
- **max_bind_params** (`int`) – Ceiling of placeholders per statement; the bulk INSERT slices into batches with it. Postgres: 65535.
- **max_numeric_precision** (`int | None`) – TOTAL digits a NUMERIC/DECIMAL accepts. Postgres: 1000. MySQL: 65.
- **max_numeric_scale** (`int | None`) – Decimal places a NUMERIC/DECIMAL accepts. It is NOT the same number as the precision: MySQL
- **max_fractional_seconds** (`int | None`) – Fractional-second digits of a date column. Postgres and MySQL: 6 (microseconds, the

#### `capabilities`

```python
capabilities: SnakeCapabilities
```

What the engine KNOWS how to do, answered against the WHOLE `Cap` catalogue. The source of truth.

It is one object and not twenty loose attributes for two reasons the attributes could not give:
it can be WALKED (that is where the startup warning comes from, one for each thing the engine
does not give) and it can say "halfway" (SQLite stores an exact `Decimal` and sorts it as text:
neither absent nor full).

#### `syntax`

```python
syntax: SnakeSyntax
```

Differences in the SHAPE of the statement. They are translated in the emitter; they never stop the plan.

#### `limits`

```python
limits: SnakeLimits
```

The engine's numeric ceilings. `None` is not "no ceiling": it is "it ignores the declared parameter".

#### `supports_returning`

```python
supports_returning: bool
```

Whether it can return the rows it wrote (`INSERT ... RETURNING`).

#### `supports_row_constructor`

```python
supports_row_constructor: bool
```

Whether it understands `(a, b) IN ((...), (...))`. If not, the emitter uses the equivalent OR-of-ANDs.

#### `supports_transactional_ddl`

```python
supports_transactional_ddl: bool
```

Whether DDL goes inside the transaction. With it, an N-step migration is all-or-nothing.

#### `supports_upsert`

```python
supports_upsert: bool
```

Whether it can do an INSERT that is idempotent on conflict. Without it, `session.upsert()` raises (it does not emulate: there is a race).

#### `supports_add_constraint`

```python
supports_add_constraint: bool
```

Whether it accepts `ALTER TABLE ... ADD CONSTRAINT`. It decides the SHAPE of the plan: with
it the FKs go AT THE END with no ordering between tables; without it (SQLite) they go INSIDE the CREATE TABLE and force a topological order.

#### `supports_alter_column`

```python
supports_alter_column: bool
```

Whether it can change a column's type/nullability/default. SQLite cannot: it would require rebuilding the table.

#### `supports_schemas`

```python
supports_schemas: bool
```

Whether it has named schemas (`CREATE SCHEMA`). On SQLite the "schemas" are ATTACHed databases (`ATTACH`).

#### `supports_stored_functions`

```python
supports_stored_functions: bool
```

Whether it stores named functions that a migration can create.

A capability of its OWN ever since the catalogue exists. The plan used to ask about
`supports_schemas` to decide whether it could create a function: it matched on all three
engines, so it worked and nobody saw it, but they are different things and a new engine
would have inherited the confusion.

#### `supports_row_locking`

```python
supports_row_locking: bool
```

Whether it can lock ROWS (`SELECT ... FOR UPDATE`). SQLite locks the file: asking for it fails at compile time.

#### `supports_comments`

```python
supports_comments: bool
```

Whether it STORES table and column comments. Only SQLite does not.

Not "whether it has `COMMENT ON`": MySQL has no such statement and stores comments all the
same, as a clause. The spelling lives in `syntax.comment_style`.

#### `supports_replace_view`

```python
supports_replace_view: bool
```

Whether it can do `CREATE OR REPLACE VIEW`. Without it, altering a view is drop+create, and `realize()` rewrites it.

#### `supports_parenthesised_compound`

```python
supports_parenthesised_compound: bool
```

Whether the branches of a UNION/EXCEPT/INTERSECT may go in PARENTHESES. It is not cosmetic:
the parentheses make a `LIMIT` belong to the branch and not to the whole set. SQLite rejects them.

#### `supports_cte_in_compound_branch`

```python
supports_cte_in_compound_branch: bool
```

Whether a `WITH [RECURSIVE] ...` may be a BRANCH of a UNION/EXCEPT/INTERSECT.

A different question from `supports_parenthesised_compound`, and the two only look alike from
Postgres: MySQL parenthesises branches and still refuses a CTE inside one.

#### `supports_ilike`

```python
supports_ilike: bool
```

Whether it has `ILIKE`. Without it (SQLite) the emission falls back to `LOWER(a) LIKE LOWER(b)`, with ASCII-only folding.

#### `triggers_are_table_scoped`

```python
triggers_are_table_scoped: bool
```

Whether a trigger belongs to a TABLE (`DROP TRIGGER x ON t`) or is global (SQLite: `DROP TRIGGER x`).
Different syntax, not an absent capability: it is translated in the emitter, the plan does not stop.

#### `max_bind_params`

```python
max_bind_params: int
```

Ceiling of placeholders per statement; the bulk INSERT slices into batches with it. Postgres: 65535.

#### `max_numeric_precision`

```python
max_numeric_precision: int | None
```

TOTAL digits a NUMERIC/DECIMAL accepts. Postgres: 1000. MySQL: 65.
`None` if the engine does not restrict it because it IGNORES the declared parameter (SQLite,
which has per-column affinity): there, any number would assert a limit that does not exist.

#### `max_numeric_scale`

```python
max_numeric_scale: int | None
```

Decimal places a NUMERIC/DECIMAL accepts. It is NOT the same number as the precision: MySQL
stops at 30 with a precision of 65, so `DECIMAL(40,35)` has one valid half and one that is not.

#### `max_fractional_seconds`

```python
max_fractional_seconds: int | None
```

Fractional-second digits of a date column. Postgres and MySQL: 6 (microseconds, the
resolution of Python's `datetime`). SQL Server reaches 7 and Oracle 9 — that is why the
number belongs to the engine and not to the model.

#### `placeholder`

```python
placeholder(index: int) -> str
```

Returns the parameter marker for the given position (e.g. '%s', '$1', '?').

#### `trigger_statements`

```python
trigger_statements(name: str, body: str) -> tuple[list[str], str]
```

How this engine spells a trigger body: `(statements to run first, the body to inline)`.

THE THREE ARE DIFFERENT FROM EACH OTHER, which is why this is a translation and not a flag.
Measured, all three:

    PostgreSQL   the body goes in a FUNCTION and the trigger calls it (`EXECUTE FUNCTION f()`)
    SQLite       the body goes between `BEGIN` and `END`; without them it is a syntax error
    MySQL        a single statement goes bare

Sending it through verbatim made a declaration fail on whichever engine was not the one it
had been written for, and the DRIVER is what said so — `syntax error at or near "UPDATE"` on
PostgreSQL, `near "UPDATE": syntax error` on SQLite. Two different complaints about the same
portable declaration.

The first return value is anything that must exist BEFORE the trigger (PostgreSQL's function,
nothing for the others); the second is what goes after `FOR EACH ROW`.

#### `quote_ident`

```python
quote_ident(name: str) -> str
```

Quotes an identifier (table or column) the way the engine wants it.

#### `json_get_sql`

```python
json_get_sql(source: str, key_path: tuple[str, ...], as_type: type) -> str
```

Emits a read INSIDE a JSON document, cast to the declared type.

`source` arrives already emitted (a quoted column, or an expression). The three engines spell
this so differently —`->>` and a `{a,b}` path, `JSON_EXTRACT` with `$.a` and an unquote, a
bare `json_extract`— that it belongs here for the same reason placeholders do: what the SQL
SAYS is the dialect's business, what it MEANS is the graph's.

The path is emitted INSIDE a literal because no engine takes a placeholder there. The keys
are validated when the expression is BUILT (`SnakeValue.json_get`), which is why this may
interpolate them.

#### `date_shift_sql`

```python
date_shift_sql(source: str, amount_placeholder: str, unit: str, keeps_time: bool) -> str
```

Emits a date moved by a signed amount, with the amount as a PARAMETER.

The clearest case in the ORM for this seam: the three spellings have nothing in common
(`+ INTERVAL`, `DATE_ADD`, a modifier string), and all three were measured to accept the
amount as a placeholder, so the rule that values never touch the statement survives.

`unit` arrives as the agnostic lowercase name (`day`, `month`); each dialect shapes it.
`keeps_time` says whether the source carries a clock, which only SQLite needs — it has no
date type to inspect, and picking `date()` for a timestamp would silently drop the time.

#### `string_agg_sql`

```python
string_agg_sql(value: str, separator: str, order_by: str, params: list[object]) -> str
```

Emits a group joined into one string, deciding how the SEPARATOR travels.

It takes `params` for the same reason `limit_offset` does: whether the separator can be a
placeholder is the ENGINE's answer, not the emitter's. Measured — PostgreSQL and SQLite take
it as a normal argument and parameterise it; MySQL makes it the `SEPARATOR` keyword and
rejects a placeholder there, so that dialect escapes it through `literal()`.

`order_by` arrives already emitted, or empty. It is worth passing whenever a person reads the
result: without it the order belongs to the engine and can change between runs.

#### `integer_division_op`

```python
integer_division_op() -> str
```

How this engine spells division between two INTEGERS.

MEASURED, and the three do not agree: `SELECT 45/50` answers `0` on PostgreSQL and SQLite and
`0.9000` on MySQL, whose `/` is decimal division and which keeps `DIV` as a separate operator
for the integer one. The ORM declares `SnakeArith[int]` for two integer columns, so without
this the declared type is simply false on one engine of three.

It is asked ONLY when both operands are provably integers. Anything unproven keeps `/`.

#### `cast_sql`

```python
cast_sql(source: str, as_type: type) -> str
```

Emits an EXPLICIT cast of an already-emitted value to the named type.

It lives here for the same reason `json_get_sql` does, and the reason was MEASURED rather
than assumed: `CAST(x AS NUMERIC)` answers `0.9` on PostgreSQL and `0` on SQLite, whose
NUMERIC affinity collapses an integral value back to an integer. A single spelling shared by
the three engines would be right on two and silently wrong on the third.

The type is guaranteed to be in `CASTABLE`: `snake_cast` refuses anything else at the call
site, so an implementation never has to answer for a type it cannot spell.

#### `map_type`

```python
map_type(python_type: object, autoincrement: bool = False, params: SnakeTypeParams | None = None) -> str
```

Translates a Python type into its COMPLETE SQL type, with its family's parameters.

`params` arrives as ONE object per family (an int's width, a str's length, a Decimal's
precision, a dict's backing) and not as five loose knobs: loose, `precision` ended up
OUTSIDE this method —it was concatenated onto the result with an f-string— and that is why
it was the only parameter that was never validated. What this returns is the whole type,
not a fragment.

Returning the complete type is also what lets each engine genuinely decide: Postgres honours
every parameter, SQLite ignores the ones it does not distinguish.

#### `drop_all_sql`

```python
drop_all_sql(tables: Sequence[str]) -> tuple[str, ...]
```

Statements that leave the schema empty of `tables`, in the order they must run.

Emptying a schema is DDL, so it is written here like the rest of it. The keyword was never
the hard part: what differs is how each engine is persuaded to ignore the foreign keys while
the tables come down — Postgres cascades per statement, MySQL has a session switch, SQLite
has a pragma. Three answers to one question is what a dialect is for.

It lives in the Protocol so a fourth engine cannot arrive without answering it. The CLI's
`fresh` used to write `DROP TABLE ... CASCADE` itself, which is Postgres and only Postgres,
so the one DESTRUCTIVE command failed halfway on the other two.

Empty in, empty out: with no tables there is nothing to bracket either.

#### `explain_sql`

```python
explain_sql(sql: str) -> str
```

Wraps a statement so the engine reports its PLAN instead of running it.

It lives here and not in the driver because the difference is grammar, not execution:
`EXPLAIN` on two engines, `EXPLAIN QUERY PLAN` on SQLite. The compiled `(sql, params)` goes
down the existing `fetch_all`, so nothing in the driver Protocol moves for this.

The ANSWER has no common shape and is not given one: Postgres returns one column, SQLite
four, MySQL about a dozen. The session hands back the engine's own lines.

#### `statement_timeout_sql`

```python
statement_timeout_sql(milliseconds: int) -> str | None
```

The statement that caps how long a query may run, or `None` if the engine has none.

One hung query drains a pool, so this is a production knob rather than a nicety — and it
was written INSIDE `TimeoutDriver` as `SET statement_timeout = <ms>`, which is Postgres and
only Postgres, under a class name that promises nothing about engines. Measured: MySQL
answers `1193 Unknown system variable` and SQLite a syntax error.

`None` is a legitimate answer and not a gap: SQLite has no server-side statement timeout at
all. The caller refuses out loud rather than pretending; inventing something plausible there
would be answering a different question.

The value is in MILLISECONDS because that is the unit the API is written in. An engine whose
variable expects another unit converts here, which is exactly the kind of thing a dialect is
for.

#### `register_type`

```python
register_type(python_type: object, sql_type: str) -> None
```

Adds (or rewrites) the SQL spelling of a Python type in THIS dialect.

The extension point of the type vocabulary: without it, declaring an `INET`, a `CITEXT` or a
domain type meant editing the dialect — the type system was the single source of truth but
you could not add words to it. It is per dialect because the same Python type is written
differently on each engine.

#### `literal`

```python
literal(value: object) -> str
```

Formats a value as a SQL literal for DDL (DEFAULT), which takes no placeholders.
The formatting (TRUE vs 1, quoting) varies between engines, which is why it lives in the dialect.

#### `function_name`

```python
function_name(func: SnakeFunc) -> str
```

Translates the agnostic name of a scalar function into the engine's own.

#### `index_method`

```python
index_method(method: SnakeIndexMethod) -> str
```

Translates an index's access method (agnostic) into the engine's jargon.

#### `server_default_sql`

```python
server_default_sql(value: SnakeServerDefault) -> str
```

Translates a SERVER-side default value (agnostic: `NOW`, `UUID_V4`...) into its SQL
expression on the engine. If it cannot translate it, it raises `SnakeDialectError`.

#### `limit_offset`

```python
limit_offset(limit: int | None, offset: int | None, params: list[object]) -> str
```

Emits the parametrised LIMIT/OFFSET clause (appending to `params`), or '' if there is neither.
Non-standard syntax: that is why the dialect decides it.

#### `on_conflict_clause`

```python
on_conflict_clause(conflict_columns: Sequence[str], update_columns: Sequence[str]) -> str
```

An upsert's conflict-resolution clause. `conflict_columns` define the conflict (a
UNIQUE/PK constraint); `update_columns` are rewritten with the incoming value, or empty → leave alone.

### `PostgresDialect`

```python
PostgresDialect() -> None
```

Bases: `DerivedFlags`

How the SQL is written for PostgreSQL (psycopg2 driver).

Placeholder '%s'; it depends on the driver (asyncpg would use '$1'), today only psycopg2.

**Functions:**

- **placeholder** – psycopg2 uses a positional '%s'; the index is not needed on this engine.
- **trigger_statements** – The body goes in a function and the trigger calls it: PostgreSQL takes no statements here.
- **quote_ident** – Quotes with double quotes and doubles the inner quotes.
- **json_get_sql** – `->>` for one key, `#>>` with a `{a,b}` path for several, cast to the declared type.
- **date_shift_sql** – `(col + (%s * INTERVAL '1 day'))`, and the multiplication is what parameterises it.
- **string_agg_sql** – `STRING_AGG(col, %s ORDER BY ...)`: the separator is an argument, so it parameterises.
- **integer_division_op** – `/` — measured: `SELECT 45/50` is `0` here, of type `integer`. Nothing to translate.
- **cast_sql** – `CAST(x AS double precision)`, reading the SAME table `json_get_sql` reads.
- **drop_all_sql** – `DROP TABLE IF EXISTS ... CASCADE`, one per table: Postgres resolves the order itself.
- **explain_sql** – `EXPLAIN <statement>`: one text column per line of the plan.
- **statement_timeout_sql** – `SET statement_timeout`, already in milliseconds: no conversion needed.
- **register_type** – Adds (or rewrites) the SQL spelling of a Python type in THIS dialect.
- **map_type** – Translates the Python type into its COMPLETE Postgres type, parameters included.
- **limit_offset** – A parametrised `LIMIT %s OFFSET %s` (Postgres accepts parameters in both).
- **on_conflict_clause** – `ON CONFLICT (<cols>) DO NOTHING`; with `update_columns`, `DO UPDATE SET c = EXCLUDED.c`.
- **literal** – Formats a default value as a Postgres SQL literal (DDL DEFAULT).
- **function_name** – Translates the agnostic name of a scalar function into the engine's own.
- **index_method** – Translates the index method (agnostic) into Postgres's jargon for the `USING`.
- **server_default_sql** – Translates the server-side default (agnostic) into its Postgres SQL expression.

**Attributes:**

- **supports_returning** (`bool`) – Whether it can return the rows it wrote (`INSERT ... RETURNING`).
- **supports_row_constructor** (`bool`) – Whether it understands `(a, b) IN ((...), (...))`; if not, the emitter uses the OR-of-ANDs.
- **supports_transactional_ddl** (`bool`) – Whether DDL goes inside the transaction: with it, an N-step migration is all-or-nothing.
- **supports_upsert** (`bool`) – Whether it can do an INSERT that is idempotent on conflict. Without it, `upsert()` raises: emulating it is a race.
- **supports_add_constraint** (`bool`) – Whether it accepts `ALTER TABLE ... ADD CONSTRAINT`. It decides the SHAPE of the migration plan.
- **supports_alter_column** (`bool`) – Whether it can change the type or nullability of an existing column.
- **supports_schemas** (`bool`) – Whether it has named schemas (`CREATE SCHEMA`).
- **supports_stored_functions** (`bool`) – Whether it stores named functions/procedures.
- **supports_row_locking** (`bool`) – Whether it can lock ROWS (`SELECT ... FOR UPDATE`).
- **supports_comments** (`bool`) – Whether it STORES table and column comments — not whether it spells them `COMMENT ON`.
- **supports_replace_view** (`bool`) – Whether it can do `CREATE OR REPLACE VIEW`. Without it, altering a view is drop+create.
- **supports_parenthesised_compound** (`bool`) – Whether the branches of a UNION/EXCEPT/INTERSECT accept parentheses (which make the LIMIT belong to the branch).
- **supports_cte_in_compound_branch** (`bool`) – Whether a `WITH RECURSIVE` may be a BRANCH of a UNION/EXCEPT/INTERSECT. Only Postgres.
- **supports_ilike** (`bool`) – Whether it spells the case-insensitive match `ILIKE`, or needs `LOWER(a) LIKE LOWER(b)`.
- **triggers_are_table_scoped** (`bool`) – `DROP TRIGGER x ON t` versus `DROP TRIGGER x`. Grammar, not capability.
- **max_bind_params** (`int`) – Ceiling of placeholders per statement.
- **max_numeric_precision** (`int | None`) – Total digits of a NUMERIC/DECIMAL, or `None` if the engine ignores the parameter.
- **max_numeric_scale** (`int | None`) – Decimal places of a NUMERIC/DECIMAL, or `None`.
- **max_fractional_seconds** (`int | None`) – Fractional-second digits of a date, or `None`.

#### `placeholder`

```python
placeholder(index: int) -> str
```

psycopg2 uses a positional '%s'; the index is not needed on this engine.

#### `trigger_statements`

```python
trigger_statements(name: str, body: str) -> tuple[list[str], str]
```

The body goes in a function and the trigger calls it: PostgreSQL takes no statements here.

A body that ALREADY calls a function is left alone — wrapping it would make a function that
calls a function. `RETURN NEW` is appended because a trigger function must return something,
and for an `AFTER` trigger the value is ignored but its absence is an error.

#### `quote_ident`

```python
quote_ident(name: str) -> str
```

Quotes with double quotes and doubles the inner quotes.

#### `json_get_sql`

```python
json_get_sql(source: str, key_path: tuple[str, ...], as_type: type) -> str
```

`->>` for one key, `#>>` with a `{a,b}` path for several, cast to the declared type.

`str` gets NO cast: `->>` already returns text, and a `::text` on every statement would be
noise saying nothing. The others do, because without it the comparison is a TEXT comparison
and `'9' > '100'` is true.

#### `date_shift_sql`

```python
date_shift_sql(source: str, amount_placeholder: str, unit: str, keeps_time: bool) -> str
```

`(col + (%s * INTERVAL '1 day'))`, and the multiplication is what parameterises it.

`INTERVAL '30 days'` would mean interpolating the amount into the statement. Multiplying a
ONE-unit interval by a placeholder was measured to answer the same date and keeps the value
in `params`, where every value in this ORM belongs. `keeps_time` is unused: Postgres has real
date and timestamp types and the result follows the operand.

#### `string_agg_sql`

```python
string_agg_sql(value: str, separator: str, order_by: str, params: list[object]) -> str
```

`STRING_AGG(col, %s ORDER BY ...)`: the separator is an argument, so it parameterises.

#### `integer_division_op`

```python
integer_division_op() -> str
```

`/` — measured: `SELECT 45/50` is `0` here, of type `integer`. Nothing to translate.

#### `cast_sql`

```python
cast_sql(source: str, as_type: type) -> str
```

`CAST(x AS double precision)`, reading the SAME table `json_get_sql` reads.

Two tables of one thing drift, and the one that drifts is the one with fewer readers.

#### `drop_all_sql`

```python
drop_all_sql(tables: Sequence[str]) -> tuple[str, ...]
```

`DROP TABLE IF EXISTS ... CASCADE`, one per table: Postgres resolves the order itself.

`CASCADE` drops whatever depends on the table —the foreign keys pointing at it, the views
built on it— so no bracketing switch is needed and the order does not matter.

#### `explain_sql`

```python
explain_sql(sql: str) -> str
```

`EXPLAIN <statement>`: one text column per line of the plan.

#### `statement_timeout_sql`

```python
statement_timeout_sql(milliseconds: int) -> str | None
```

`SET statement_timeout`, already in milliseconds: no conversion needed.

#### `register_type`

```python
register_type(python_type: object, sql_type: str) -> None
```

Adds (or rewrites) the SQL spelling of a Python type in THIS dialect.

    dialect.register_type(Inet, "INET")
    address: SnakeColumn[Inet] = snake_column()

It is the extension point the thesis was missing: the type system was the single source of
truth, but its VOCABULARY was closed and putting in an `INET`, a `CITEXT` or a domain type
meant editing the dialect. It goes per dialect because the same Python type is written
differently on each engine, which is exactly what this axis exists for.

Rewriting a native type is allowed (e.g. `str` → `CITEXT` across the whole database): it is
an explicit escape hatch, and forbidding it would force forking the entire dialect over one
line.

#### `map_type`

```python
map_type(python_type: object, autoincrement: bool = False, params: SnakeTypeParams | None = None) -> str
```

Translates the Python type into its COMPLETE Postgres type, parameters included.

It accepts `object`, not `type`: `list[int]` is a generic alias, not a class, and is
resolved by origin+argument; a bare `list` is rejected (an array with no element type does
not exist in SQL).

`params` are those of the type's FAMILY and arrive as ONE object, not as five loose knobs.
`precision` being one more of them is not cosmetic: it used to be glued onto the type from
outside here, with an f-string in `migration/ddl.py`, and that is why it was the only
parameter nobody validated.

#### `limit_offset`

```python
limit_offset(limit: int | None, offset: int | None, params: list[object]) -> str
```

A parametrised `LIMIT %s OFFSET %s` (Postgres accepts parameters in both).

#### `on_conflict_clause`

```python
on_conflict_clause(conflict_columns: Sequence[str], update_columns: Sequence[str]) -> str
```

`ON CONFLICT (<cols>) DO NOTHING`; with `update_columns`, `DO UPDATE SET c = EXCLUDED.c`.
`EXCLUDED` is the row that was attempted, so the UPDATE rewrites with the incoming value.

#### `literal`

```python
literal(value: object) -> str
```

Formats a default value as a Postgres SQL literal (DDL DEFAULT).
The enum is unwrapped to its value EXPLICITLY, without relying on IntEnum/StrEnum's `str()`.

#### `supports_returning`

```python
supports_returning: bool
```

Whether it can return the rows it wrote (`INSERT ... RETURNING`).

#### `supports_row_constructor`

```python
supports_row_constructor: bool
```

Whether it understands `(a, b) IN ((...), (...))`; if not, the emitter uses the OR-of-ANDs.

#### `function_name`

```python
function_name(func: SnakeFunc) -> str
```

Translates the agnostic name of a scalar function into the engine's own.

#### `supports_transactional_ddl`

```python
supports_transactional_ddl: bool
```

Whether DDL goes inside the transaction: with it, an N-step migration is all-or-nothing.

#### `supports_upsert`

```python
supports_upsert: bool
```

Whether it can do an INSERT that is idempotent on conflict. Without it, `upsert()` raises: emulating it is a race.

#### `supports_add_constraint`

```python
supports_add_constraint: bool
```

Whether it accepts `ALTER TABLE ... ADD CONSTRAINT`. It decides the SHAPE of the migration plan.

#### `index_method`

```python
index_method(method: SnakeIndexMethod) -> str
```

Translates the index method (agnostic) into Postgres's jargon for the `USING`.

#### `supports_alter_column`

```python
supports_alter_column: bool
```

Whether it can change the type or nullability of an existing column.

#### `supports_schemas`

```python
supports_schemas: bool
```

Whether it has named schemas (`CREATE SCHEMA`).

#### `server_default_sql`

```python
server_default_sql(value: SnakeServerDefault) -> str
```

Translates the server-side default (agnostic) into its Postgres SQL expression.

#### `supports_stored_functions`

```python
supports_stored_functions: bool
```

Whether it stores named functions/procedures.

It is a capability of its OWN, and it was not before: the plan used to ask about
`supports_schemas` to decide whether it could create a function. It matched on all three
engines and that is why nobody noticed, but they are different things and the catalogue puts
it out in the open.

#### `supports_row_locking`

```python
supports_row_locking: bool
```

Whether it can lock ROWS (`SELECT ... FOR UPDATE`).

#### `supports_comments`

```python
supports_comments: bool
```

Whether it STORES table and column comments — not whether it spells them `COMMENT ON`.

The distinction is the bug this property was read through: MySQL has no `COMMENT ON` and
keeps comments perfectly well, and answering `False` here dropped a `db_comment` on a server
that stores it. The spelling is `syntax.comment_style`.

#### `supports_replace_view`

```python
supports_replace_view: bool
```

Whether it can do `CREATE OR REPLACE VIEW`. Without it, altering a view is drop+create.

#### `supports_parenthesised_compound`

```python
supports_parenthesised_compound: bool
```

Whether the branches of a UNION/EXCEPT/INTERSECT accept parentheses (which make the LIMIT belong to the branch).

#### `supports_cte_in_compound_branch`

```python
supports_cte_in_compound_branch: bool
```

Whether a `WITH RECURSIVE` may be a BRANCH of a UNION/EXCEPT/INTERSECT. Only Postgres.

#### `supports_ilike`

```python
supports_ilike: bool
```

Whether it spells the case-insensitive match `ILIKE`, or needs `LOWER(a) LIKE LOWER(b)`.

Read off the SYNTAX and no longer off `Cap.ILIKE`, which is the whole of that fix: what the
emitter needs here is which SHAPE to write, and the catalogue answers a different question —
how good the result is. Reading one for the other is what let a `Nope` sit on something that
works.

#### `triggers_are_table_scoped`

```python
triggers_are_table_scoped: bool
```

`DROP TRIGGER x ON t` versus `DROP TRIGGER x`. Grammar, not capability.

#### `max_bind_params`

```python
max_bind_params: int
```

Ceiling of placeholders per statement.

#### `max_numeric_precision`

```python
max_numeric_precision: int | None
```

Total digits of a NUMERIC/DECIMAL, or `None` if the engine ignores the parameter.

#### `max_numeric_scale`

```python
max_numeric_scale: int | None
```

Decimal places of a NUMERIC/DECIMAL, or `None`.

#### `max_fractional_seconds`

```python
max_fractional_seconds: int | None
```

Fractional-second digits of a date, or `None`.

### `MySQLDialect`

```python
MySQLDialect(flavour: Engine | None = None) -> None
```

Bases: `DerivedFlags`

How the SQL is written for MySQL/MariaDB (PyMySQL driver).

Placeholder `%s` (paramstyle `format`); it depends on the driver, but the common ones agree.

**Functions:**

- **drop_all_sql** – The drops bracketed by the FK switch: MySQL refuses to drop a referenced table.
- **explain_sql** – `EXPLAIN <statement>`: about a dozen columns per row, and that is the engine's shape.
- **statement_timeout_sql** – MariaDB's `max_statement_time`, converted to the SECONDS it expects.
- **register_type** – Adds (or rewrites) the SQL spelling of a Python type in THIS dialect.
- **placeholder** – PyMySQL uses a positional `%s` (paramstyle `format`); the index is not needed.
- **trigger_statements** – The body goes bare. MySQL accepts a single statement without `BEGIN`/`END`.
- **quote_ident** – Quotes with BACKTICKS and doubles the inner backticks (MySQL's equivalent of the quoting).
- **json_get_sql** – `JSON_EXTRACT` with a `$.a.b` path, UNQUOTED before the cast.
- **date_shift_sql** – `DATE_ADD(col, INTERVAL %s DAY)`: the unit is a bare KEYWORD, not a string.
- **string_agg_sql** – `GROUP_CONCAT(col ORDER BY ... SEPARATOR ', ')`: here the separator is SYNTAX.
- **integer_division_op** – `DIV`, and this is the whole reason the method exists.
- **cast_sql** – `CAST(x AS DOUBLE)`, and DOUBLE rather than DECIMAL on purpose.
- **map_type** – Translates the Python type into the COMPLETE MySQL type. With autoincrement it adds `AUTO_INCREMENT`.
- **limit_offset** – A parametrised `LIMIT %s OFFSET %s`. MySQL demands a LIMIT whenever there is an OFFSET, so
- **on_conflict_clause** – `ON DUPLICATE KEY UPDATE`: MySQL's upsert, which fires on ANY unique key.
- **literal** – Formats a default value as a MySQL SQL literal (DDL DEFAULT).
- **function_name** – Translates the agnostic name of a scalar function into MySQL's own.
- **index_method** – Translates the index method (agnostic) into MySQL's jargon for the `USING`.
- **server_default_sql** – Translates the server-side default (agnostic) into its MySQL SQL expression.

**Attributes:**

- **supports_returning** (`bool`) – Whether it can return the rows it wrote (`INSERT ... RETURNING`).
- **supports_row_constructor** (`bool`) – Whether it understands `(a, b) IN ((...), (...))`; if not, the emitter uses the OR-of-ANDs.
- **supports_transactional_ddl** (`bool`) – Whether DDL goes inside the transaction: with it, an N-step migration is all-or-nothing.
- **supports_upsert** (`bool`) – Whether it can do an INSERT that is idempotent on conflict. Without it, `upsert()` raises: emulating it is a race.
- **supports_add_constraint** (`bool`) – Whether it accepts `ALTER TABLE ... ADD CONSTRAINT`. It decides the SHAPE of the migration plan.
- **supports_alter_column** (`bool`) – Whether it can change the type or nullability of an existing column.
- **supports_schemas** (`bool`) – Whether it has named schemas (`CREATE SCHEMA`).
- **supports_stored_functions** (`bool`) – Whether it stores named functions/procedures.
- **supports_row_locking** (`bool`) – Whether it can lock ROWS (`SELECT ... FOR UPDATE`).
- **supports_comments** (`bool`) – Whether it STORES table and column comments — not whether it spells them `COMMENT ON`.
- **supports_replace_view** (`bool`) – Whether it can do `CREATE OR REPLACE VIEW`. Without it, altering a view is drop+create.
- **supports_parenthesised_compound** (`bool`) – Whether the branches of a UNION/EXCEPT/INTERSECT accept parentheses (which make the LIMIT belong to the branch).
- **supports_cte_in_compound_branch** (`bool`) – Whether a `WITH RECURSIVE` may be a BRANCH of a UNION/EXCEPT/INTERSECT. Only Postgres.
- **supports_ilike** (`bool`) – Whether it spells the case-insensitive match `ILIKE`, or needs `LOWER(a) LIKE LOWER(b)`.
- **triggers_are_table_scoped** (`bool`) – `DROP TRIGGER x ON t` versus `DROP TRIGGER x`. Grammar, not capability.
- **max_bind_params** (`int`) – Ceiling of placeholders per statement.
- **max_numeric_precision** (`int | None`) – Total digits of a NUMERIC/DECIMAL, or `None` if the engine ignores the parameter.
- **max_numeric_scale** (`int | None`) – Decimal places of a NUMERIC/DECIMAL, or `None`.
- **max_fractional_seconds** (`int | None`) – Fractional-second digits of a date, or `None`.

`flavour` narrows the capabilities once a connection has said which server is there.

Without it they stay at what BOTH can do.

#### `drop_all_sql`

```python
drop_all_sql(tables: Sequence[str]) -> tuple[str, ...]
```

The drops bracketed by the FK switch: MySQL refuses to drop a referenced table.

There is no `CASCADE` for a `DROP TABLE` here, and dropping in dependency order would mean
computing one — for a command whose whole point is that nothing survives. The switch is the
idiom MySQL itself documents, and it is put BACK: a session left with the checks off accepts
orphan rows in silence, which is a worse state than the one being repaired.

#### `explain_sql`

```python
explain_sql(sql: str) -> str
```

`EXPLAIN <statement>`: about a dozen columns per row, and that is the engine's shape.

#### `statement_timeout_sql`

```python
statement_timeout_sql(milliseconds: int) -> str | None
```

MariaDB's `max_statement_time`, converted to the SECONDS it expects.

THE FORK, and it decides what this line can be: MySQL and MariaDB do not share this
variable and neither accepts the other's. MariaDB has `max_statement_time` in seconds;
Oracle's MySQL has `max_execution_time` in milliseconds. One dialect, two spellings, no
overlap — and nothing in this ORM tells the two forks apart.

It emits MariaDB's, which is the fork the project tests against. On the other one the server
refuses by name (`1193 Unknown system variable`) the moment the driver is wrapped: loud, at
startup, and fixable — not a timeout that quietly never fires.

The conversion is the point of doing this here. Handing `max_statement_time` a value in
milliseconds would not fail; it would set a limit a THOUSAND times longer than asked for,
which is the kind of bug that only surfaces the day something hangs.

#### `register_type`

```python
register_type(python_type: object, sql_type: str) -> None
```

Adds (or rewrites) the SQL spelling of a Python type in THIS dialect.

See `SnakeDialect.register_type`. It goes per dialect because the same Python type is
written differently on each engine: an `Inet` is `INET` on Postgres and `TEXT` here.

#### `placeholder`

```python
placeholder(index: int) -> str
```

PyMySQL uses a positional `%s` (paramstyle `format`); the index is not needed.

#### `trigger_statements`

```python
trigger_statements(name: str, body: str) -> tuple[list[str], str]
```

The body goes bare. MySQL accepts a single statement without `BEGIN`/`END`.

Several statements WOULD need them, and would also need the client delimiter changed, which
is a property of the client and not of the SQL. A body of one statement is what this ORM
emits, so that door stays closed until something needs it opened.

#### `quote_ident`

```python
quote_ident(name: str) -> str
```

Quotes with BACKTICKS and doubles the inner backticks (MySQL's equivalent of the quoting).

#### `json_get_sql`

```python
json_get_sql(source: str, key_path: tuple[str, ...], as_type: type) -> str
```

`JSON_EXTRACT` with a `$.a.b` path, UNQUOTED before the cast.

The unquote is the step that is easy to leave out and impossible to notice: `JSON_EXTRACT`
returns a JSON scalar, so a string arrives with its quotes still on and `= 'ada'` never
matches. MySQL's cast targets are its own (`SIGNED`, not `integer`), which is the reason this
method exists per dialect at all.

#### `date_shift_sql`

```python
date_shift_sql(source: str, amount_placeholder: str, unit: str, keeps_time: bool) -> str
```

`DATE_ADD(col, INTERVAL %s DAY)`: the unit is a bare KEYWORD, not a string.

Measured to take the amount as a prepared parameter and to accept a negative one, which is
what lets subtraction be the same node with the sign flipped. `keeps_time` is unused: MySQL
has real date and datetime types.

#### `string_agg_sql`

```python
string_agg_sql(value: str, separator: str, order_by: str, params: list[object]) -> str
```

`GROUP_CONCAT(col ORDER BY ... SEPARATOR ', ')`: here the separator is SYNTAX.

Measured, a placeholder after `SEPARATOR` is a syntax error, so this is the one engine where
the string reaches the statement. It goes through `literal()` — the same escaping every DDL
default already uses — which doubles the quote and escapes the backslash. `params` is left
untouched on purpose, and a test pins that it is.

#### `integer_division_op`

```python
integer_division_op() -> str
```

`DIV`, and this is the whole reason the method exists.

MEASURED: `SELECT 45/50` answers `0.9000` here —type `decimal(6,4)`— while the other two
answer `0`. MySQL's `/` IS decimal division; `DIV` is the integer one. Emitting `/` for two
integer columns made `SnakeArith[int]` a lie on this engine and only on this engine.

#### `cast_sql`

```python
cast_sql(source: str, as_type: type) -> str
```

`CAST(x AS DOUBLE)`, and DOUBLE rather than DECIMAL on purpose.

MEASURED: a bare `CAST(x AS DECIMAL)` is `DECIMAL(10,0)` — no decimal places at all — so it
would read as a float cast and truncate. The table this reads already says DOUBLE.

#### `map_type`

```python
map_type(python_type: object, autoincrement: bool = False, params: SnakeTypeParams | None = None) -> str
```

Translates the Python type into the COMPLETE MySQL type. With autoincrement it adds `AUTO_INCREMENT`.

It honours the integer's width, the text's length, the NUMERIC's precision and the date's.
It ignores the JSON backing: MySQL only has `JSON` and does not distinguish JSONB, so the
knob has nothing to translate into (and it is not pretended otherwise).

#### `limit_offset`

```python
limit_offset(limit: int | None, offset: int | None, params: list[object]) -> str
```

A parametrised `LIMIT %s OFFSET %s`. MySQL demands a LIMIT whenever there is an OFFSET, so
a bare OFFSET carries a huge LIMIT (MySQL's standard idiom for "everything from N on").

#### `on_conflict_clause`

```python
on_conflict_clause(conflict_columns: Sequence[str], update_columns: Sequence[str]) -> str
```

`ON DUPLICATE KEY UPDATE`: MySQL's upsert, which fires on ANY unique key.
No conflict columns; for "do nothing" (MySQL has no `DO NOTHING`) it uses `col = col`.

#### `supports_returning`

```python
supports_returning: bool
```

Whether it can return the rows it wrote (`INSERT ... RETURNING`).

#### `literal`

```python
literal(value: object) -> str
```

Formats a default value as a MySQL SQL literal (DDL DEFAULT).
MySQL interprets the BACKSLASH in strings, so it is escaped as well as the quote; a bool goes as 1/0.

#### `supports_row_constructor`

```python
supports_row_constructor: bool
```

Whether it understands `(a, b) IN ((...), (...))`; if not, the emitter uses the OR-of-ANDs.

#### `supports_transactional_ddl`

```python
supports_transactional_ddl: bool
```

Whether DDL goes inside the transaction: with it, an N-step migration is all-or-nothing.

#### `supports_upsert`

```python
supports_upsert: bool
```

Whether it can do an INSERT that is idempotent on conflict. Without it, `upsert()` raises: emulating it is a race.

#### `supports_add_constraint`

```python
supports_add_constraint: bool
```

Whether it accepts `ALTER TABLE ... ADD CONSTRAINT`. It decides the SHAPE of the migration plan.

#### `function_name`

```python
function_name(func: SnakeFunc) -> str
```

Translates the agnostic name of a scalar function into MySQL's own.

#### `supports_alter_column`

```python
supports_alter_column: bool
```

Whether it can change the type or nullability of an existing column.

#### `supports_schemas`

```python
supports_schemas: bool
```

Whether it has named schemas (`CREATE SCHEMA`).

#### `supports_stored_functions`

```python
supports_stored_functions: bool
```

Whether it stores named functions/procedures.

It is a capability of its OWN, and it was not before: the plan used to ask about
`supports_schemas` to decide whether it could create a function. It matched on all three
engines and that is why nobody noticed, but they are different things and the catalogue puts
it out in the open.

#### `index_method`

```python
index_method(method: SnakeIndexMethod) -> str
```

Translates the index method (agnostic) into MySQL's jargon for the `USING`.

#### `server_default_sql`

```python
server_default_sql(value: SnakeServerDefault) -> str
```

Translates the server-side default (agnostic) into its MySQL SQL expression.

#### `supports_row_locking`

```python
supports_row_locking: bool
```

Whether it can lock ROWS (`SELECT ... FOR UPDATE`).

#### `supports_comments`

```python
supports_comments: bool
```

Whether it STORES table and column comments — not whether it spells them `COMMENT ON`.

The distinction is the bug this property was read through: MySQL has no `COMMENT ON` and
keeps comments perfectly well, and answering `False` here dropped a `db_comment` on a server
that stores it. The spelling is `syntax.comment_style`.

#### `supports_replace_view`

```python
supports_replace_view: bool
```

Whether it can do `CREATE OR REPLACE VIEW`. Without it, altering a view is drop+create.

#### `supports_parenthesised_compound`

```python
supports_parenthesised_compound: bool
```

Whether the branches of a UNION/EXCEPT/INTERSECT accept parentheses (which make the LIMIT belong to the branch).

#### `supports_cte_in_compound_branch`

```python
supports_cte_in_compound_branch: bool
```

Whether a `WITH RECURSIVE` may be a BRANCH of a UNION/EXCEPT/INTERSECT. Only Postgres.

#### `supports_ilike`

```python
supports_ilike: bool
```

Whether it spells the case-insensitive match `ILIKE`, or needs `LOWER(a) LIKE LOWER(b)`.

Read off the SYNTAX and no longer off `Cap.ILIKE`, which is the whole of that fix: what the
emitter needs here is which SHAPE to write, and the catalogue answers a different question —
how good the result is. Reading one for the other is what let a `Nope` sit on something that
works.

#### `triggers_are_table_scoped`

```python
triggers_are_table_scoped: bool
```

`DROP TRIGGER x ON t` versus `DROP TRIGGER x`. Grammar, not capability.

#### `max_bind_params`

```python
max_bind_params: int
```

Ceiling of placeholders per statement.

#### `max_numeric_precision`

```python
max_numeric_precision: int | None
```

Total digits of a NUMERIC/DECIMAL, or `None` if the engine ignores the parameter.

#### `max_numeric_scale`

```python
max_numeric_scale: int | None
```

Decimal places of a NUMERIC/DECIMAL, or `None`.

#### `max_fractional_seconds`

```python
max_fractional_seconds: int | None
```

Fractional-second digits of a date, or `None`.

### `SQLiteDialect`

```python
SQLiteDialect() -> None
```

Bases: `DerivedFlags`

How the SQL is written for SQLite (with the stdlib's `sqlite3` driver).

**Functions:**

- **drop_all_sql** – Plain drops, with the key checking POSTPONED to the COMMIT.
- **explain_sql** – `EXPLAIN QUERY PLAN`, and the two words matter.
- **statement_timeout_sql** – None: SQLite has no server-side statement timeout, and `busy_timeout` is not one.
- **register_type** – Adds (or rewrites) the SQL spelling of a Python type in THIS dialect.
- **placeholder** – SQLite uses a positional '?' (like psycopg2's `%s`): params in TEXTUAL ORDER for both.
- **trigger_statements** – `BEGIN ... END` around the body. Without them SQLite answers `near "UPDATE": syntax error`.
- **quote_ident** – Quotes with double quotes and doubles the inner ones (SQLite accepts the standard).
- **json_get_sql** – `json_extract` with a `$.a.b` path. The CAST is kept even though SQLite types the result.
- **date_shift_sql** – `date(col, ? || ' days')` — the modifier is TEXT, built in SQL and never in Python.
- **string_agg_sql** – `group_concat(col, ? ORDER BY ...)`: a different NAME, the same shape as Postgres.
- **integer_division_op** – `/` — measured: `SELECT 45/50` is `0` here too. SQLite agrees with PostgreSQL on this.
- **cast_sql** – `CAST(x AS REAL)` — and REAL is the point, not a detail.
- **map_type** – Translates the Python type into one of SQLite's five storage classes.
- **limit_offset** – A parametrised `LIMIT ? OFFSET ?`. With `offset` and no `limit` it uses `LIMIT -1`: SQLite does not accept a bare OFFSET.
- **on_conflict_clause** – `ON CONFLICT (<cols>) DO NOTHING` / `DO UPDATE SET c = excluded.c`. Like Postgres, but with `excluded` in lower case.
- **literal** – Formats a value as a SQLite SQL literal (DDL, no params).
- **function_name** – Translates the agnostic name of a scalar function into SQLite's own.
- **index_method** – SQLite has ONE kind of index: there is no `USING`.
- **server_default_sql** – Translates the server-side default into its SQLite expression.

**Attributes:**

- **supports_returning** (`bool`) – Whether it can return the rows it wrote (`INSERT ... RETURNING`).
- **supports_row_constructor** (`bool`) – Whether it understands `(a, b) IN ((...), (...))`; if not, the emitter uses the OR-of-ANDs.
- **supports_transactional_ddl** (`bool`) – Whether DDL goes inside the transaction: with it, an N-step migration is all-or-nothing.
- **supports_upsert** (`bool`) – Whether it can do an INSERT that is idempotent on conflict. Without it, `upsert()` raises: emulating it is a race.
- **supports_add_constraint** (`bool`) – Whether it accepts `ALTER TABLE ... ADD CONSTRAINT`. It decides the SHAPE of the migration plan.
- **supports_alter_column** (`bool`) – Whether it can change the type or nullability of an existing column.
- **supports_schemas** (`bool`) – Whether it has named schemas (`CREATE SCHEMA`).
- **supports_stored_functions** (`bool`) – Whether it stores named functions/procedures.
- **supports_row_locking** (`bool`) – Whether it can lock ROWS (`SELECT ... FOR UPDATE`).
- **supports_comments** (`bool`) – Whether it STORES table and column comments — not whether it spells them `COMMENT ON`.
- **supports_replace_view** (`bool`) – Whether it can do `CREATE OR REPLACE VIEW`. Without it, altering a view is drop+create.
- **supports_parenthesised_compound** (`bool`) – Whether the branches of a UNION/EXCEPT/INTERSECT accept parentheses (which make the LIMIT belong to the branch).
- **supports_cte_in_compound_branch** (`bool`) – Whether a `WITH RECURSIVE` may be a BRANCH of a UNION/EXCEPT/INTERSECT. Only Postgres.
- **supports_ilike** (`bool`) – Whether it spells the case-insensitive match `ILIKE`, or needs `LOWER(a) LIKE LOWER(b)`.
- **triggers_are_table_scoped** (`bool`) – `DROP TRIGGER x ON t` versus `DROP TRIGGER x`. Grammar, not capability.
- **max_bind_params** (`int`) – Ceiling of placeholders per statement.
- **max_numeric_precision** (`int | None`) – Total digits of a NUMERIC/DECIMAL, or `None` if the engine ignores the parameter.
- **max_numeric_scale** (`int | None`) – Decimal places of a NUMERIC/DECIMAL, or `None`.
- **max_fractional_seconds** (`int | None`) – Fractional-second digits of a date, or `None`.

#### `drop_all_sql`

```python
drop_all_sql(tables: Sequence[str]) -> tuple[str, ...]
```

Plain drops, with the key checking POSTPONED to the COMMIT.

No `CASCADE`: SQLite does not parse the keyword and answers a syntax error.

And not `PRAGMA foreign_keys = OFF` either. MEASURED, it makes nothing work: the pragma is a
no-op inside a transaction — the same finding written twenty lines above, about
`defer_constraints_statement` — and `SQLiteDriver._ensure_tx` opens one before every
statement that reaches this engine, so the value still reads 1 immediately after the OFF is
sent.

`defer_foreign_keys` is the pragma built for this and the one `syntax` already names: it
takes effect INSIDE the transaction and moves every check to the COMMIT, by which point
every table is gone and there is nothing left to violate. That also covers the case no
ordering can reach — two tables pointing at each other — which is what Postgres's `CASCADE`
and MySQL's switch survive today. And it resets ITSELF at that COMMIT, so unlike MySQL's
switch there is nothing to put back: no session is ever handed over with its keys disarmed.

It is a COMMIT-time promise, so the one thing it asks of the caller is the one thing the
Protocol already asks: run the batch as it comes. A caller that committed between two drops
would be back to needing a safe order — which is what `fresh` used to do, and it died here
with `FOREIGN KEY constraint failed` halfway through, schema half gone, because a model
declared BEFORE the one pointing at it is perfectly legal.

#### `explain_sql`

```python
explain_sql(sql: str) -> str
```

`EXPLAIN QUERY PLAN`, and the two words matter.

A bare `EXPLAIN` here dumps the VDBE bytecode — a real answer to a different question, and
the one a user reading "explain" never wants.

#### `statement_timeout_sql`

```python
statement_timeout_sql(milliseconds: int) -> str | None
```

None: SQLite has no server-side statement timeout, and `busy_timeout` is not one.

`busy_timeout` waits for a LOCK to be released; it does nothing about a query that is simply
slow. Returning it here would be answering a different question with a value that looks
right, which is worse than answering nothing.

#### `register_type`

```python
register_type(python_type: object, sql_type: str) -> None
```

Adds (or rewrites) the SQL spelling of a Python type in THIS dialect.

See `SnakeDialect.register_type`. It goes per dialect because the same Python type is
written differently on each engine: an `Inet` is `INET` on Postgres and `TEXT` here.

#### `placeholder`

```python
placeholder(index: int) -> str
```

SQLite uses a positional '?' (like psycopg2's `%s`): params in TEXTUAL ORDER for both.

#### `trigger_statements`

```python
trigger_statements(name: str, body: str) -> tuple[list[str], str]
```

`BEGIN ... END` around the body. Without them SQLite answers `near "UPDATE": syntax error`.

Measured: it is not optional even for a single statement, which is the difference from MySQL
and the reason this is three implementations and not two.

A body that ALREADY carries them is left alone, the same rule PostgreSQL applies to a body
that already calls a function. Wrapping blindly produced `BEGIN BEGIN SELECT 1; END END` and
SQLite answered `near "BEGIN": syntax error` — the asymmetry was written into this very
method, in the same session that had just fixed it one file over.

#### `quote_ident`

```python
quote_ident(name: str) -> str
```

Quotes with double quotes and doubles the inner ones (SQLite accepts the standard).

#### `json_get_sql`

```python
json_get_sql(source: str, key_path: tuple[str, ...], as_type: type) -> str
```

`json_extract` with a `$.a.b` path. The CAST is kept even though SQLite types the result.

Keeping it is not belt and braces: SQLite's `json_extract` gives back whatever the document
held, so a `"5"` stored as text comes back as text and the comparison would be lexicographic
— the very failure the declared type exists to stop, and the one SQLite is most prone to.

#### `date_shift_sql`

```python
date_shift_sql(source: str, amount_placeholder: str, unit: str, keeps_time: bool) -> str
```

`date(col, ? || ' days')` — the modifier is TEXT, built in SQL and never in Python.

`keeps_time` is what picks the function, and it is the only dialect that needs it: SQLite has
no date type to inspect, and `date()` on a timestamp would silently drop the clock. The
compiled type stamped on the expression is what answers it.

The plural is not cosmetic: SQLite's modifiers are `days`, `months`, `years`.

#### `string_agg_sql`

```python
string_agg_sql(value: str, separator: str, order_by: str, params: list[object]) -> str
```

`group_concat(col, ? ORDER BY ...)`: a different NAME, the same shape as Postgres.

The `ORDER BY` inside the call only arrived in SQLite 3.44, which is why it was measured
rather than assumed.

#### `integer_division_op`

```python
integer_division_op() -> str
```

`/` — measured: `SELECT 45/50` is `0` here too. SQLite agrees with PostgreSQL on this.

#### `cast_sql`

```python
cast_sql(source: str, as_type: type) -> str
```

`CAST(x AS REAL)` — and REAL is the point, not a detail.

MEASURED: `CAST(45 AS NUMERIC) / 50` answers `0` here and `0.9` on PostgreSQL. SQLite's
NUMERIC affinity converts back to an integer when the value is integral, so the tempting
single spelling for the three engines would lose the decimals on this one, in silence.

#### `map_type`

```python
map_type(python_type: object, autoincrement: bool = False, params: SnakeTypeParams | None = None) -> str
```

Translates the Python type into one of SQLite's five storage classes.

With `autoincrement` it returns `INTEGER`: SQLite's autoincrement is `INTEGER PRIMARY KEY`
(an alias of ROWID). The `params` are accepted but IGNORED: SQLite has a single affinity per
class, so a width, a length or a precision have nowhere to be written. They are accepted so
that the same model works on both engines; that they change nothing here is said by the
dialect's fidelity warning, not by silence.

#### `limit_offset`

```python
limit_offset(limit: int | None, offset: int | None, params: list[object]) -> str
```

A parametrised `LIMIT ? OFFSET ?`. With `offset` and no `limit` it uses `LIMIT -1`: SQLite does not accept a bare OFFSET.

#### `on_conflict_clause`

```python
on_conflict_clause(conflict_columns: Sequence[str], update_columns: Sequence[str]) -> str
```

`ON CONFLICT (<cols>) DO NOTHING` / `DO UPDATE SET c = excluded.c`. Like Postgres, but with `excluded` in lower case.

#### `literal`

```python
literal(value: object) -> str
```

Formats a value as a SQLite SQL literal (DDL, no params).
A bool goes as 0/1: SQLite has no boolean type, it stores integers.

#### `function_name`

```python
function_name(func: SnakeFunc) -> str
```

Translates the agnostic name of a scalar function into SQLite's own.

#### `index_method`

```python
index_method(method: SnakeIndexMethod) -> str
```

SQLite has ONE kind of index: there is no `USING`.
It is rejected instead of ignored: accepting `method=GIN` and emitting a plain index would lie in silence.

#### `server_default_sql`

```python
server_default_sql(value: SnakeServerDefault) -> str
```

Translates the server-side default into its SQLite expression.

#### `supports_returning`

```python
supports_returning: bool
```

Whether it can return the rows it wrote (`INSERT ... RETURNING`).

#### `supports_row_constructor`

```python
supports_row_constructor: bool
```

Whether it understands `(a, b) IN ((...), (...))`; if not, the emitter uses the OR-of-ANDs.

#### `supports_transactional_ddl`

```python
supports_transactional_ddl: bool
```

Whether DDL goes inside the transaction: with it, an N-step migration is all-or-nothing.

#### `supports_upsert`

```python
supports_upsert: bool
```

Whether it can do an INSERT that is idempotent on conflict. Without it, `upsert()` raises: emulating it is a race.

#### `supports_add_constraint`

```python
supports_add_constraint: bool
```

Whether it accepts `ALTER TABLE ... ADD CONSTRAINT`. It decides the SHAPE of the migration plan.

#### `supports_alter_column`

```python
supports_alter_column: bool
```

Whether it can change the type or nullability of an existing column.

#### `supports_schemas`

```python
supports_schemas: bool
```

Whether it has named schemas (`CREATE SCHEMA`).

#### `supports_stored_functions`

```python
supports_stored_functions: bool
```

Whether it stores named functions/procedures.

It is a capability of its OWN, and it was not before: the plan used to ask about
`supports_schemas` to decide whether it could create a function. It matched on all three
engines and that is why nobody noticed, but they are different things and the catalogue puts
it out in the open.

#### `supports_row_locking`

```python
supports_row_locking: bool
```

Whether it can lock ROWS (`SELECT ... FOR UPDATE`).

#### `supports_comments`

```python
supports_comments: bool
```

Whether it STORES table and column comments — not whether it spells them `COMMENT ON`.

The distinction is the bug this property was read through: MySQL has no `COMMENT ON` and
keeps comments perfectly well, and answering `False` here dropped a `db_comment` on a server
that stores it. The spelling is `syntax.comment_style`.

#### `supports_replace_view`

```python
supports_replace_view: bool
```

Whether it can do `CREATE OR REPLACE VIEW`. Without it, altering a view is drop+create.

#### `supports_parenthesised_compound`

```python
supports_parenthesised_compound: bool
```

Whether the branches of a UNION/EXCEPT/INTERSECT accept parentheses (which make the LIMIT belong to the branch).

#### `supports_cte_in_compound_branch`

```python
supports_cte_in_compound_branch: bool
```

Whether a `WITH RECURSIVE` may be a BRANCH of a UNION/EXCEPT/INTERSECT. Only Postgres.

#### `supports_ilike`

```python
supports_ilike: bool
```

Whether it spells the case-insensitive match `ILIKE`, or needs `LOWER(a) LIKE LOWER(b)`.

Read off the SYNTAX and no longer off `Cap.ILIKE`, which is the whole of that fix: what the
emitter needs here is which SHAPE to write, and the catalogue answers a different question —
how good the result is. Reading one for the other is what let a `Nope` sit on something that
works.

#### `triggers_are_table_scoped`

```python
triggers_are_table_scoped: bool
```

`DROP TRIGGER x ON t` versus `DROP TRIGGER x`. Grammar, not capability.

#### `max_bind_params`

```python
max_bind_params: int
```

Ceiling of placeholders per statement.

#### `max_numeric_precision`

```python
max_numeric_precision: int | None
```

Total digits of a NUMERIC/DECIMAL, or `None` if the engine ignores the parameter.

#### `max_numeric_scale`

```python
max_numeric_scale: int | None
```

Decimal places of a NUMERIC/DECIMAL, or `None`.

#### `max_fractional_seconds`

```python
max_fractional_seconds: int | None
```

Fractional-second digits of a date, or `None`.

## Capability catalogue

### `Cap`

Bases: `Enum`

Everything an engine CAN do. Adding a member forces all three dialects to answer.

Two families, and the distinction matters because the plan treats them differently:

- The **structural** ones decide whether an operation can be executed. If they are missing, the
  ORM stops and shouts.
- The **type-fidelity** ones never stop anything: the type is stored all the same (falling back
  to TEXT if it has to) and the value comes back exact. What gets degraded is the SQL SEMANTICS
  —sorting, comparing, operating— and startup warns about that.

### `Full`

```python
Full() -> None
```

The engine does it, and does it properly. There is nothing to tell the user.

### `Degraded`

```python
Degraded(reason: str) -> None
```

The engine does it, but lying about something. It WORKS: the plan does not stop, the user
finds out.

It is the state of almost everything that falls back to TEXT on SQLite: the value goes in and
comes out exact, and what is lost is that the engine does not treat it as what it is when
sorting, comparing or operating.

### `Nope`

```python
Nope(reason: str) -> None
```

The engine does not do it. Any operation that needs it stops and the ORM explains why.

### `SnakeCapabilities`

```python
SnakeCapabilities(declared: Mapping[Cap, Support | Since], engine_version: tuple[int, ...] | None = None) -> None
```

What ONE engine answers to the whole catalogue. Incomplete, it does not get built.

Exhaustiveness is checked at construction time —that is, when the dialect is imported—, which
for practical purposes is the same moment a type-checker would fail, and in exchange it allows
iteration.

**Functions:**

- **support_for** – What this engine answers about a capability. Never `None`: the catalogue is complete.
- **can** – Whether the engine can, even if badly. `Degraded` is a YES: the model works.
- **caveats** – What the user has to be told: (capability, reason) for everything that is not full.

**Attributes:**

- **declared** (`Mapping[Cap, Support | Since]`) – What the dialect WROTE, `Since` included, so it can still be read as it was declared.
- **engine_version** (`tuple[int, ...] | None`) – The engine version, when it can be known without a connection (SQLite reads it from its
- **resolved** (`Mapping[Cap, Support]`) – What the engine ANSWERS: the same map with every `Since` collapsed. Everything reads here,

#### `declared`

```python
declared: Mapping[Cap, Support | Since]
```

What the dialect WROTE, `Since` included, so it can still be read as it was declared.

#### `engine_version`

```python
engine_version: tuple[int, ...] | None = None
```

The engine version, when it can be known without a connection (SQLite reads it from its
module). `Since` resolves against it; every other state ignores it.

#### `resolved`

```python
resolved: Mapping[Cap, Support] = field(init=False)
```

What the engine ANSWERS: the same map with every `Since` collapsed. Everything reads here,
which is why no caller ever has to know a version was involved.

#### `support_for`

```python
support_for(cap: Cap) -> Support
```

What this engine answers about a capability. Never `None`: the catalogue is complete.

#### `can`

```python
can(cap: Cap) -> bool
```

Whether the engine can, even if badly. `Degraded` is a YES: the model works.

Treating it as a no would forbid a `Decimal` on SQLite, which stores and returns the exact value.

#### `caveats`

```python
caveats() -> tuple[tuple[Cap, str], ...]
```

What the user has to be told: (capability, reason) for everything that is not full.

In catalogue order, which is stable, so the warning does not dance between runs.

### `SnakeSyntax`

```python
SnakeSyntax(triggers_are_table_scoped: bool, indexes_are_table_scoped: bool, alter_column_style: AlterColumnStyle, empty_insert_style: EmptyInsertStyle, comment_style: CommentStyle, defer_constraints_statement: str | None = None, has_nulls_ordering: bool = False, has_ilike: bool = False, round_casts_first_argument_to: str | None = None) -> None
```

SHAPE differences between engines. They are TRANSLATED in the emitter; they never stop the plan.

Kept apart from the capabilities on purpose. When `triggers_are_table_scoped` lived among the
`supports_*` it looked like a rare, lonely case, and its sibling for indexes was never written:
`emit_drop_index` emitted Postgres's shape and broke the rollback of any migration with an index
on MySQL. With the family declared, the gap is visible.

**Attributes:**

- **triggers_are_table_scoped** (`bool`) – `DROP TRIGGER x ON t` (Postgres) versus `DROP TRIGGER x` (MySQL and SQLite, without the table).
- **indexes_are_table_scoped** (`bool`) – `DROP INDEX x ON t` (MySQL) versus `DROP INDEX x` (Postgres, SQLite).
- **alter_column_style** (`AlterColumnStyle`) – How the change of an existing column is written.
- **empty_insert_style** (`EmptyInsertStyle`) – How an INSERT of a row that is all default values is written.
- **comment_style** (`CommentStyle`) – How a table's and a column's comment are spelled: a statement of their own, or a clause.
- **defer_constraints_statement** (`str | None`) – How this engine is told to postpone foreign key checking until the COMMIT, or `None`.
- **has_nulls_ordering** (`bool`) – Whether the engine spells `ORDER BY x ASC NULLS LAST`, or needs the portable form.
- **has_ilike** (`bool`) – Whether the engine spells a case-insensitive match `ILIKE`, or needs the portable fallback.
- **round_casts_first_argument_to** (`str | None`) – What `ROUND(x, digits)` has to cast its value to on this engine, or `None` for no cast.

#### `triggers_are_table_scoped`

```python
triggers_are_table_scoped: bool
```

`DROP TRIGGER x ON t` (Postgres) versus `DROP TRIGGER x` (MySQL and SQLite, without the table).

It used to put MySQL in the first group while `mysql.py` itself declares it `False`, with a
comment right next to it saying the opposite. The code was right; the prose explaining it was
lying, which is the worst combination: whoever reads the attribute in order to write a new
dialect trusts what is here.

#### `indexes_are_table_scoped`

```python
indexes_are_table_scoped: bool
```

`DROP INDEX x ON t` (MySQL) versus `DROP INDEX x` (Postgres, SQLite).

#### `alter_column_style`

```python
alter_column_style: AlterColumnStyle
```

How the change of an existing column is written.

#### `empty_insert_style`

```python
empty_insert_style: EmptyInsertStyle
```

How an INSERT of a row that is all default values is written.

#### `comment_style`

```python
comment_style: CommentStyle
```

How a table's and a column's comment are spelled: a statement of their own, or a clause.

#### `defer_constraints_statement`

```python
defer_constraints_statement: str | None = None
```

How this engine is told to postpone foreign key checking until the COMMIT, or `None`.

Only an engine that has to REMAKE a table to change a constraint needs it: mid-rebuild the old
table is dropped, and any key pointing at it is violated at that instant even though the table
comes back three statements later. Deferring moves the verdict to the COMMIT, where it is the
ENGINE that answers — so nothing is switched off and nothing is checked by a statement whose
rows nobody reads.

`None` on Postgres and MySQL, and not because they lack the feature: they can change a
constraint in place, so there is no window to hold open. Declaring it here rather than writing
the pragma into the emitter is what keeps a second engine without `ADD CONSTRAINT` from
inheriting SQLite's spelling.

#### `has_nulls_ordering`

```python
has_nulls_ordering: bool = False
```

Whether the engine spells `ORDER BY x ASC NULLS LAST`, or needs the portable form.

A SHAPE difference, and it belongs here for the same reason `has_ilike` does: all three engines
ORDER nulls, and what changes is how you ask. Filing it in the catalogue would say an engine
cannot do something it does — the mistake `Cap.ILIKE` was written to record.

Measured on both servers this dialect family serves, because `mysql.py` exists partly because it
"cannot promise what only one of them does": MariaDB 11.8.8 and MySQL 8.4.11 both answer
`ERROR 1064` to `NULLS LAST`, and both accept `ORDER BY (x IS NULL) ASC, x ASC` — inside a
UNION as well. So the two agree and the fallback covers them.

Defaults to `False` so an engine that says nothing gets the portable form that works everywhere,
rather than a keyword it may not have. Same default, same reason, as its neighbour.

#### `has_ilike`

```python
has_ilike: bool = False
```

Whether the engine spells a case-insensitive match `ILIKE`, or needs the portable fallback.

A SHAPE difference and it belongs here, not in the catalogue. All three engines DO match without
regard to case: Postgres with the keyword, the other two through `LOWER(a) LIKE LOWER(b)`, which
the emitter writes. Nothing is refused and no plan stops.

It used to be read off `Cap.ILIKE`, and that is what made `Nope` mean two things — see the note
on `Cap.ILIKE` itself. Defaults to `False` so an engine that says nothing gets the fallback that
works everywhere, rather than a keyword it may not have.

#### `round_casts_first_argument_to`

```python
round_casts_first_argument_to: str | None = None
```

What `ROUND(x, digits)` has to cast its value to on this engine, or `None` for no cast.

Postgres has `ROUND(double precision)` and `ROUND(numeric, int)` and NO
`ROUND(double precision, int)`, so asking a float for decimal places reached the server as
`function round(double precision, integer) does not exist` — the driver explaining a decision
this ORM made, which is what the project refuses everywhere else. It was bug #34's open half.

A SHAPE difference and not a capability, which is why it lives here: all three engines round to
a digit count, they just do not all spell it the same way. Declaring the target type rather than
a boolean is what stops the emitter from holding a Postgres spelling for everybody.

Applied unconditionally when there is a digit count, because the emitter cannot see the
argument's Python type —`SnakeFuncCall[T]` erases it— and does not need to: on Postgres the cast
is a no-op for a `numeric` and correct for a `float` or an `int`.

### `SnakeLimits`

```python
SnakeLimits(bind_params: int, numeric_precision: int | None, numeric_scale: int | None, fractional_seconds: int | None) -> None
```

The engine's NUMERIC ceilings. `None` is not "no ceiling": it is "it ignores the declared parameter".

It is SQLite's answer, which has a per-column affinity and nothing else. Any number would assert
a limit that does not exist, and a small one would reject models this engine stores just fine.

**Attributes:**

- **bind_params** (`int`) – Placeholders per statement. The bulk INSERT slices into batches with this. Postgres: 65535.
- **numeric_precision** (`int | None`) – TOTAL digits of a NUMERIC/DECIMAL. Postgres 1000, MySQL 65.
- **numeric_scale** (`int | None`) – Decimal places. NOT the same number as the precision: MySQL stops at 30 with a precision of 65.
- **fractional_seconds** (`int | None`) – Fractional-second digits of a date. Postgres and MySQL 6 (Python's `datetime`).

#### `bind_params`

```python
bind_params: int
```

Placeholders per statement. The bulk INSERT slices into batches with this. Postgres: 65535.

#### `numeric_precision`

```python
numeric_precision: int | None
```

TOTAL digits of a NUMERIC/DECIMAL. Postgres 1000, MySQL 65.

#### `numeric_scale`

```python
numeric_scale: int | None
```

Decimal places. NOT the same number as the precision: MySQL stops at 30 with a precision of 65.

#### `fractional_seconds`

```python
fractional_seconds: int | None
```

Fractional-second digits of a date. Postgres and MySQL 6 (Python's `datetime`).

### `AlterColumnStyle`

Bases: `Enum`

The SHAPE of an `ALTER TABLE ... ALTER COLUMN`. It is not a capability: it is grammar.

Postgres and MySQL both change a column's type; they write the statement differently. Filing
this under capabilities is what left `emit_alter_column` hard-wired to Postgres's shape.

**Attributes:**

- **POSTGRES_TYPE_USING** – `ALTER COLUMN c TYPE t USING c::t`, with `SET`/`DROP NOT NULL` in separate statements.
- **MYSQL_MODIFY** – `MODIFY COLUMN c t NOT NULL`: a single clause that rewrites the whole definition.
- **UNSUPPORTED** – The engine cannot (SQLite: it would require rebuilding the table). The plan stops before emitting.

#### `POSTGRES_TYPE_USING`

```python
POSTGRES_TYPE_USING = auto()
```

`ALTER COLUMN c TYPE t USING c::t`, with `SET`/`DROP NOT NULL` in separate statements.

#### `MYSQL_MODIFY`

```python
MYSQL_MODIFY = auto()
```

`MODIFY COLUMN c t NOT NULL`: a single clause that rewrites the whole definition.

#### `UNSUPPORTED`

```python
UNSUPPORTED = auto()
```

The engine cannot (SQLite: it would require rebuilding the table). The plan stops before emitting.

### `EmptyInsertStyle`

Bases: `Enum`

How an INSERT with NO values is written, that is, a row that is all defaults.

It is not a laboratory case: any join or event table whose only field of its own is the
autoincrement id triggers it. `DEFAULT VALUES` is the standard and MySQL does not have it, so
until this existed the ORM was writing MySQL something it rejects — and it only showed up when
seeding against a real server.

**Attributes:**

- **DEFAULT_VALUES** – `INSERT INTO t DEFAULT VALUES` (Postgres, SQLite).
- **EMPTY_ROW** – `INSERT INTO t () VALUES ()` (MySQL): empty column list and empty row.

#### `DEFAULT_VALUES`

```python
DEFAULT_VALUES = auto()
```

`INSERT INTO t DEFAULT VALUES` (Postgres, SQLite).

#### `EMPTY_ROW`

```python
EMPTY_ROW = auto()
```

`INSERT INTO t () VALUES ()` (MySQL): empty column list and empty row.

## Synchronous drivers

### `SnakeDriver`

Bases: `Protocol`

How the SQL is executed: wraps the DBAPI (connection, cursor, transaction).

SYNCHRONOUS. The SQL arrives already compiled (colourless) from `sql/`; the driver only
runs it. The day async is needed, an AsyncDriver is added WITHOUT touching the compiler,
the dialect or the AST. Adding a new engine = one implementation of this Protocol, with
no refactor.

**Functions:**

- **fetch_all** – Runs a query and returns every row (for SELECT / RETURNING).
- **fetch_iter** – Runs a query and yields the rows WITHOUT materialising them all.
- **execute** – Runs a statement fetching no rows and returns the rowcount (used by bulk writes).
- **commit** – Commits the transaction in progress.
- **rollback** – Rolls back the transaction in progress.
- **savepoint** – Marks a SAVEPOINT: lets you roll back ONLY a part (via `rollback_to_savepoint`) without aborting the transaction.
- **release_savepoint** – Releases (RELEASE) a savepoint: its work is folded into the transaction in progress.
- **rollback_to_savepoint** – Rolls back to a savepoint: discards what was done since it, without aborting the transaction.
- **close** – Closes the connection.

**Attributes:**

- **last_insert_id** (`int`) – The autoincrement id of the last INSERT. The session only uses it on engines WITHOUT

#### `fetch_all`

```python
fetch_all(sql: str, params: Sequence[object]) -> list[tuple[object, ...]]
```

Runs a query and returns every row (for SELECT / RETURNING).

#### `fetch_iter`

```python
fetch_iter(sql: str, params: Sequence[object], *, chunk: int = 1000) -> Iterator[tuple[object, ...]]
```

Runs a query and yields the rows WITHOUT materialising them all.

This is the streaming seam, and that is why it lives in the Protocol and not in some
loose method on one driver: with only `fetch_all`, a ten-million-row query built a
Python list of ten million tuples before returning the first one, and there was no way
to fix that without touching this contract.

`chunk` is how many rows the engine brings back per round trip: the knob that decides
the memory. Whoever can, uses a SERVER-SIDE CURSOR (the result stays over there);
whoever cannot, a `fetchmany`, which at least bounds the peak.

The cursor lives for as long as the iteration does, so the consumer must exhaust it or
close it.

#### `execute`

```python
execute(sql: str, params: Sequence[object]) -> int
```

Runs a statement fetching no rows and returns the rowcount (used by bulk writes).

#### `last_insert_id`

```python
last_insert_id: int
```

The autoincrement id of the last INSERT. The session only uses it on engines WITHOUT
`RETURNING` (MySQL); on Postgres/SQLite the PK comes back through RETURNING and this is
irrelevant (it may be 0).

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

#### `savepoint`

```python
savepoint(name: str) -> None
```

Marks a SAVEPOINT: lets you roll back ONLY a part (via `rollback_to_savepoint`) without aborting the transaction.

#### `release_savepoint`

```python
release_savepoint(name: str) -> None
```

Releases (RELEASE) a savepoint: its work is folded into the transaction in progress.

#### `rollback_to_savepoint`

```python
rollback_to_savepoint(name: str) -> None
```

Rolls back to a savepoint: discards what was done since it, without aborting the transaction.

#### `close`

```python
close() -> None
```

Closes the connection.

### `PsycopgDriver`

```python
PsycopgDriver(connection: _Connection) -> None
```

Synchronous driver over psycopg2. Implements the SnakeDriver Protocol.

**Functions:**

- **adopt** – Wraps a RAW psycopg2 connection, adapting it to our minimal DBAPI.
- **connect** – Opens a psycopg2 connection with the given DSN and wraps it (lazy import).
- **fetch_all** – Runs a query and returns all of its rows, closing the cursor.
- **fetch_iter** – Yields the rows in chunks using a NAMED cursor (server-side).
- **execute** – Runs a statement fetching no rows and returns the rowcount, closing the cursor.
- **commit** – Commits the transaction in progress.
- **rollback** – Rolls back the transaction in progress.
- **savepoint** – Emits `SAVEPOINT "n"`. The name is internal, but it is quoted for safety.
- **release_savepoint** – Emits `RELEASE SAVEPOINT "n"`: folds the savepoint into the transaction.
- **rollback_to_savepoint** – Emits `ROLLBACK TO SAVEPOINT "n"`: discards what was done since the savepoint.
- **close** – Closes the connection.

**Attributes:**

- **last_insert_id** (`int`) – The id of the last INSERT (see the Protocol). Unused: Postgres returns the PK through RETURNING.

#### `adopt`

```python
adopt(connection: object) -> PsycopgDriver
```

Wraps a RAW psycopg2 connection, adapting it to our minimal DBAPI.

This is THE edge where psycopg2's concrete type enters our world (`connect()` and the pool
both use it). The `cast` is legitimate: pyright does not narrow psycopg2's `cursor()` to
`_Connection`; the parameter is `object` because the incoming type is foreign and cannot be
narrowed.

#### `connect`

```python
connect(dsn: str) -> PsycopgDriver
```

Opens a psycopg2 connection with the given DSN and wraps it (lazy import).

#### `fetch_all`

```python
fetch_all(sql: str, params: Sequence[object]) -> list[tuple[object, ...]]
```

Runs a query and returns all of its rows, closing the cursor.

#### `fetch_iter`

```python
fetch_iter(sql: str, params: Sequence[object], *, chunk: int = 1000) -> Iterator[tuple[object, ...]]
```

Yields the rows in chunks using a NAMED cursor (server-side).

The name is not cosmetic: it is what turns psycopg2's cursor into a SERVER cursor. Without
it, psycopg2 pulls the whole result into the client's memory even if you call `fetchmany`,
and the streaming would be an illusion. With it, the result stays on Postgres and
`itersize` decides how many rows travel per round trip.

The name carries a counter because two named cursors alive at once on the same connection
would collide.

#### `execute`

```python
execute(sql: str, params: Sequence[object]) -> int
```

Runs a statement fetching no rows and returns the rowcount, closing the cursor.

`cursor.rowcount` is how many rows the statement affected (bulk writes read it). It is
captured BEFORE closing the cursor: after `close()` it is no longer available.

#### `last_insert_id`

```python
last_insert_id: int
```

The id of the last INSERT (see the Protocol). Unused: Postgres returns the PK through RETURNING.

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

#### `savepoint`

```python
savepoint(name: str) -> None
```

Emits `SAVEPOINT "n"`. The name is internal, but it is quoted for safety.

#### `release_savepoint`

```python
release_savepoint(name: str) -> None
```

Emits `RELEASE SAVEPOINT "n"`: folds the savepoint into the transaction.

#### `rollback_to_savepoint`

```python
rollback_to_savepoint(name: str) -> None
```

Emits `ROLLBACK TO SAVEPOINT "n"`: discards what was done since the savepoint.

#### `close`

```python
close() -> None
```

Closes the connection.

### `PyMySQLDriver`

```python
PyMySQLDriver(connection: _Connection) -> None
```

Synchronous driver over PyMySQL. Implements the SnakeDriver Protocol.

**Functions:**

- **server_version** – What the server calls itself: `11.8.8-MariaDB-ubu2404`, `8.0.46`.
- **adopt** – Wraps a raw PyMySQL connection, adapting it to our minimal DBAPI (the edge).
- **connect** – Opens a PyMySQL connection with the given kwargs (host, user, password, database, port...).
- **fetch_all** – Runs a query and returns all of its rows, closing the cursor.
- **fetch_iter** – Yields the rows in chunks using PyMySQL's UNBUFFERED cursor (`SSCursor`).
- **execute** – Runs a statement fetching no rows and returns the rowcount.
- **commit** – Commits the transaction in progress.
- **rollback** – Rolls back the transaction in progress.
- **savepoint** – Emits `SAVEPOINT \`n\``. MySQL supports savepoints; the name is quoted with backticks.
- **release_savepoint** – Emits `RELEASE SAVEPOINT \`n\``.
- **rollback_to_savepoint** – Emits `ROLLBACK TO SAVEPOINT \`n\``.
- **close** – Closes the connection.

**Attributes:**

- **last_insert_id** (`int`) – The autoincrement id of the last INSERT. The session uses it where there is no RETURNING.

#### `server_version`

```python
server_version() -> str
```

What the server calls itself: `11.8.8-MariaDB-ubu2404`, `8.0.46`.

Empty if it does not answer: a flavour read wrong is worse than none.

#### `adopt`

```python
adopt(connection: object) -> PyMySQLDriver
```

Wraps a raw PyMySQL connection, adapting it to our minimal DBAPI (the edge).

#### `connect`

```python
connect(**kwargs: Any) -> PyMySQLDriver
```

Opens a PyMySQL connection with the given kwargs (host, user, password, database, port...).
MySQL uses arguments, not a one-piece DSN. Lazy import: whoever only generates SQL does not need PyMySQL.

#### `fetch_all`

```python
fetch_all(sql: str, params: Sequence[object]) -> list[tuple[object, ...]]
```

Runs a query and returns all of its rows, closing the cursor.

#### `fetch_iter`

```python
fetch_iter(sql: str, params: Sequence[object], *, chunk: int = 1000) -> Iterator[tuple[object, ...]]
```

Yields the rows in chunks using PyMySQL's UNBUFFERED cursor (`SSCursor`).

`SSCursor` is the MySQL equivalent of Postgres's named cursor: the result stays on the
server and arrives on demand. With the normal cursor, PyMySQL pulls EVERYTHING to the
client on execute, and `fetchmany` would only be slicing a list that is already fully in
memory.

Its price, and you have to know it: while the unbuffered cursor is alive, that connection
cannot fire another query. That is why the cursor is closed once the iteration runs out.

#### `execute`

```python
execute(sql: str, params: Sequence[object]) -> int
```

Runs a statement fetching no rows and returns the rowcount.
It stores `lastrowid` (read BEFORE closing the cursor): on MySQL, which has no RETURNING, that is the only way to recover the generated PK.

#### `last_insert_id`

```python
last_insert_id: int
```

The autoincrement id of the last INSERT. The session uses it where there is no RETURNING.

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

#### `savepoint`

```python
savepoint(name: str) -> None
```

Emits `SAVEPOINT \`n\``. MySQL supports savepoints; the name is quoted with backticks.

#### `release_savepoint`

```python
release_savepoint(name: str) -> None
```

Emits `RELEASE SAVEPOINT \`n\``.

#### `rollback_to_savepoint`

```python
rollback_to_savepoint(name: str) -> None
```

Emits `ROLLBACK TO SAVEPOINT \`n\``.

#### `close`

```python
close() -> None
```

Closes the connection.

### `SQLiteDriver`

```python
SQLiteDriver(connection: Any) -> None
```

A connection to SQLite. A file, or `:memory:` for an ephemeral database (tests).
`sqlite3` is imported INSIDE `connect` (like psycopg2), so it is not loaded on every `import snakeorm`.

**Functions:**

- **connect** – Opens the database and leaves the connector in a state with no surprises.
- **fetch_all** – Runs the query and returns every row as tuples, closing the cursor.
- **fetch_iter** – Yields the rows in chunks with `fetchmany`.
- **execute** – Runs a statement fetching no rows and returns how many it affected.
- **commit** – Commits the transaction in progress (if any). The next statement opens another one.
- **rollback** – Rolls back the transaction in progress (if any). A no-op if nothing was open.
- **savepoint** – Opens a named savepoint. `execute` opens the transaction lazily, so a `SAVEPOINT` as the
- **release_savepoint** – Commits the savepoint (you can no longer go back to it).
- **rollback_to_savepoint** – Goes back to the savepoint, undoing what was done since it was opened.
- **close** – Closes the connection.

**Attributes:**

- **last_insert_id** (`int`) – The id of the last INSERT (see the Protocol). Unused: this engine returns the PK through RETURNING.

#### `connect`

```python
connect(database: str) -> SQLiteDriver
```

Opens the database and leaves the connector in a state with no surprises.

`database` is a NAME, not a DSN: a path, `:memory:`, or a `file:` URI. A `sqlite:` scheme
RAISES, because stripping it here would make this a SECOND place translating a DSN, and one
string would name two databases, silently (bug #38).

`uri=True` is passed unconditionally, and that is measured rather than assumed. SQLite reads
a connection string as a URI only when it begins with `file:`; everything else is a literal
filename, question marks included (`weird?name.db` is still that file). So there is no flag
and no heuristic about what the caller meant.

WITHOUT IT, `file:cache?mode=memory&cache=shared` — the standard spelling of a shared
in-memory database — is taken as a FILENAME, and SQLite creates a file called exactly that.
It does not fail; it opens the wrong database and carries on, and everything downstream
works because it IS a real database. With it, a MALFORMED `file:` DSN raises instead of
quietly creating a file named after the mistake.

#### `fetch_all`

```python
fetch_all(sql: str, params: Sequence[object]) -> list[tuple[object, ...]]
```

Runs the query and returns every row as tuples, closing the cursor.

#### `fetch_iter`

```python
fetch_iter(sql: str, params: Sequence[object], *, chunk: int = 1000) -> Iterator[tuple[object, ...]]
```

Yields the rows in chunks with `fetchmany`.

SQLite has no server-side cursors —the database IS the process—, so there is nothing to
leave over there. What this does avoid is building the whole result list in Python: the
memory peak becomes the chunk, not the result. Less than on Postgres, but real, and the
same contract for whoever calls it.

#### `execute`

```python
execute(sql: str, params: Sequence[object]) -> int
```

Runs a statement fetching no rows and returns how many it affected.

#### `last_insert_id`

```python
last_insert_id: int
```

The id of the last INSERT (see the Protocol). Unused: this engine returns the PK through RETURNING.

#### `commit`

```python
commit() -> None
```

Commits the transaction in progress (if any). The next statement opens another one.

#### `rollback`

```python
rollback() -> None
```

Rolls back the transaction in progress (if any). A no-op if nothing was open.

#### `savepoint`

```python
savepoint(name: str) -> None
```

Opens a named savepoint. `execute` opens the transaction lazily, so a `SAVEPOINT` as the
very first operation works too.

#### `release_savepoint`

```python
release_savepoint(name: str) -> None
```

Commits the savepoint (you can no longer go back to it).

#### `rollback_to_savepoint`

```python
rollback_to_savepoint(name: str) -> None
```

Goes back to the savepoint, undoing what was done since it was opened.

#### `close`

```python
close() -> None
```

Closes the connection.

### `SnakePool`

```python
SnakePool(borrow: Borrow, give_back: GiveBack, close_all: CloseAll, *, discard: Discard | None = None, pre_ping: bool = False, recycle_seconds: float | None = None, timeout_seconds: float | None = None, retry_interval: float = 0.05, clock: Clock = monotonic) -> None
```

Hands out connections and takes them back. Engine-agnostic: it receives the three operations
and delegates the real pooling (`psycopg2.pool` today). Only the rule lives here: one connection
per session, returned when it is done.

**Functions:**

- **acquire** – Lends a HEALTHY connection, wrapped: closing it sends it back to the pool.
- **connection** – Lends a connection and ALWAYS returns it, even if the block blows up (or it drains the pool bit by bit).
- **close** – Closes every connection in the pool.

#### `acquire`

```python
acquire() -> SnakeDriver
```

Lends a HEALTHY connection, wrapped: closing it sends it back to the pool.

With `timeout_seconds`, it retries until the deadline if the pool is drained instead of
giving up on the first attempt (which is what `psycopg2` does: it does not block, it
raises `PoolError` instantly). With `pre_ping` or `recycle_seconds`, it throws away
whatever is no good and keeps looking.

#### `connection`

```python
connection() -> Iterator[SnakeDriver]
```

Lends a connection and ALWAYS returns it, even if the block blows up (or it drains the pool bit by bit).

#### `close`

```python
close() -> None
```

Closes every connection in the pool.
### `psycopg_pool`

```python
psycopg_pool(dsn: str, *, minimum: int = 1, maximum: int = 10, pre_ping: bool = False, recycle_seconds: float | None = None, timeout_seconds: float | None = None) -> SnakePool
```

Builds a `SnakePool` on top of psycopg2's threaded pool.

`pre_ping` checks the pulse before lending (it costs a round trip, and it saves the deployment
where the database restarts and the pool carries on handing out dead connections).
`recycle_seconds` throws away connections older than that without asking. `timeout_seconds`
waits for one to be freed instead of giving up instantly, which is what psycopg2 does on its
own.

All three are OFF by default: turning them on costs round trips or throws away healthy
connections, and that is decided by whoever knows their deployment, not by the library.

Lazy import: do not force psycopg2 on whoever only generates SQL or migrations without
connecting.

### `LoggingDriver`

```python
LoggingDriver(inner: SnakeDriver, write: Writer = _silent, *, parameter_keys: frozenset[str] = frozenset()) -> None
```

Wraps a `SnakeDriver` and logs SQL, params and how much it affected. A pure decorator: it changes nothing.
It also logs the transaction boundaries (commit/rollback/savepoints); without them the log lies by omission.

**Functions:**

- **fetch_all** – Runs the query, logs the SQL and how many rows it returned.
- **fetch_iter** – Logs the SQL and yields the rows, counting them WHEN IT IS DONE.
- **execute** – Runs the statement, logs the SQL and how many rows it affected.
- **commit** – Commits the transaction and writes it down.
- **rollback** – Rolls the transaction back and writes it down.
- **savepoint** – Marks a savepoint and writes it down.
- **release_savepoint** – Releases a savepoint and writes it down.
- **rollback_to_savepoint** – Rolls back to a savepoint and writes it down.
- **close** – Closes the INNER driver: the decorator does not keep the connection.

**Attributes:**

- **last_insert_id** (`int`) – The id of the last INSERT (see the Protocol). Forwarded to the wrapped driver.

`parameter_keys` names the parameter positions to WRITE OUT, and there is no environment
variable for it.

That omission is the decision, and it is the same one `debug/otel/exporter.py` already made
for the same data: an environment variable is precisely the switch somebody flips in
production by accident, and this one would put user values into the log aggregator. It takes
an explicit line of code, key by key — the key of a positional parameter is its 0-based
index, as the OpenTelemetry convention spells it.

By default the values are hidden and the COUNT is written instead. The count leaks nothing
and it is half of what makes a log line readable.

#### `fetch_all`

```python
fetch_all(sql: str, params: Sequence[object]) -> list[tuple[object, ...]]
```

Runs the query, logs the SQL and how many rows it returned.

#### `fetch_iter`

```python
fetch_iter(sql: str, params: Sequence[object], *, chunk: int = 1000) -> Iterator[tuple[object, ...]]
```

Logs the SQL and yields the rows, counting them WHEN IT IS DONE.

The counter goes at the end and not at the start on purpose: writing "-> N rows" before
walking them would require materialising them, which is exactly what this path avoids.
What actually got consumed is what gets logged, and that is also the interesting figure
when somebody cuts out with a `break`.

#### `execute`

```python
execute(sql: str, params: Sequence[object]) -> int
```

Runs the statement, logs the SQL and how many rows it affected.

#### `last_insert_id`

```python
last_insert_id: int
```

The id of the last INSERT (see the Protocol). Forwarded to the wrapped driver.

#### `commit`

```python
commit() -> None
```

Commits the transaction and writes it down.

#### `rollback`

```python
rollback() -> None
```

Rolls the transaction back and writes it down.

#### `savepoint`

```python
savepoint(name: str) -> None
```

Marks a savepoint and writes it down.

#### `release_savepoint`

```python
release_savepoint(name: str) -> None
```

Releases a savepoint and writes it down.

#### `rollback_to_savepoint`

```python
rollback_to_savepoint(name: str) -> None
```

Rolls back to a savepoint and writes it down.

#### `close`

```python
close() -> None
```

Closes the INNER driver: the decorator does not keep the connection.

### `TimeoutDriver`

```python
TimeoutDriver(inner: SnakeDriver, dialect: SnakeDialect, *, statement_timeout_ms: int) -> None
```

Wraps a `SnakeDriver` and sets a `statement_timeout` for the whole connection: one hung
query drains the pool. The setting is emitted ONCE on wrapping (it is per CONNECTION, not per
statement).

**Functions:**

- **fetch_all** – Delegates the query; the limit is already set on the connection.
- **fetch_iter** – Delegates the streaming; the limit is already set on the connection.
- **execute** – Delegates the statement; the limit is already set on the connection.
- **commit** – Commits the inner driver's transaction.
- **rollback** – Rolls back the inner driver's transaction.
- **savepoint** – Marks a savepoint on the inner driver.
- **release_savepoint** – Releases a savepoint on the inner driver.
- **rollback_to_savepoint** – Rolls back to a savepoint on the inner driver.
- **close** – Closes the inner driver.

**Attributes:**

- **last_insert_id** (`int`) – The id of the last INSERT (see the Protocol). Forwarded to the wrapped driver.

#### `fetch_all`

```python
fetch_all(sql: str, params: Sequence[object]) -> list[tuple[object, ...]]
```

Delegates the query; the limit is already set on the connection.

#### `fetch_iter`

```python
fetch_iter(sql: str, params: Sequence[object], *, chunk: int = 1000) -> Iterator[tuple[object, ...]]
```

Delegates the streaming; the limit is already set on the connection.

#### `execute`

```python
execute(sql: str, params: Sequence[object]) -> int
```

Delegates the statement; the limit is already set on the connection.

#### `last_insert_id`

```python
last_insert_id: int
```

The id of the last INSERT (see the Protocol). Forwarded to the wrapped driver.

#### `commit`

```python
commit() -> None
```

Commits the inner driver's transaction.

#### `rollback`

```python
rollback() -> None
```

Rolls back the inner driver's transaction.

#### `savepoint`

```python
savepoint(name: str) -> None
```

Marks a savepoint on the inner driver.

#### `release_savepoint`

```python
release_savepoint(name: str) -> None
```

Releases a savepoint on the inner driver.

#### `rollback_to_savepoint`

```python
rollback_to_savepoint(name: str) -> None
```

Rolls back to a savepoint on the inner driver.

#### `close`

```python
close() -> None
```

Closes the inner driver.

## Asynchronous drivers

### `AsyncDriver`

Bases: `Protocol`

How the SQL is EXECUTED asynchronously. It cannot write it: that is the dialect.

**Functions:**

- **fetch_all** – Runs the query and returns every row as tuples.
- **fetch_iter** – Yields the rows WITHOUT materialising them all. Mirror of `SnakeDriver.fetch_iter`.
- **execute** – Runs a statement fetching no rows; returns how many it affected.
- **commit** – Commits the transaction in progress.
- **rollback** – Rolls back the transaction in progress.
- **savepoint** – Opens a named savepoint.
- **release_savepoint** – Commits the savepoint.
- **rollback_to_savepoint** – Goes back to the savepoint, undoing what was done since it was opened.
- **close** – Closes the connection.

**Attributes:**

- **last_insert_id** (`int`) – The autoincrement id of the last INSERT. Exact mirror of `SnakeDriver.last_insert_id`.

#### `fetch_all`

```python
fetch_all(sql: str, params: Sequence[object]) -> list[tuple[object, ...]]
```

Runs the query and returns every row as tuples.

#### `fetch_iter`

```python
fetch_iter(sql: str, params: Sequence[object], *, chunk: int = 1000) -> AsyncIterator[tuple[object, ...]]
```

Yields the rows WITHOUT materialising them all. Mirror of `SnakeDriver.fetch_iter`.

It is NOT an `async def`: it returns the async iterator directly. An `async def` that
were also a generator would force an `await` before the `async for`, and the contract
would end up different from the synchronous one for no reason at all.

#### `execute`

```python
execute(sql: str, params: Sequence[object]) -> int
```

Runs a statement fetching no rows; returns how many it affected.

#### `last_insert_id`

```python
last_insert_id: int
```

The autoincrement id of the last INSERT. Exact mirror of `SnakeDriver.last_insert_id`.

It was missing from this Protocol, and it bothered nobody because the only async driver
was the Postgres one, where the PK comes back through RETURNING and this is irrelevant.
It is on MySQL —where there is no RETURNING; MariaDB does have it— that the PK depends on this
value: without the member in the contract, an async MySQL driver would have been born
leaving the PK at `None` without saying a word.

It is NOT `async`: it does not travel to the database, the cursor of the last write
stored it.

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

#### `savepoint`

```python
savepoint(name: str) -> None
```

Opens a named savepoint.

#### `release_savepoint`

```python
release_savepoint(name: str) -> None
```

Commits the savepoint.

#### `rollback_to_savepoint`

```python
rollback_to_savepoint(name: str) -> None
```

Goes back to the savepoint, undoing what was done since it was opened.

#### `close`

```python
close() -> None
```

Closes the connection.

### `AsyncPsycopgDriver`

```python
AsyncPsycopgDriver(connection: Any) -> None
```

An asynchronous connection to PostgreSQL with psycopg 3.

**Functions:**

- **connect** – Opens the connection. Requires `snakeorm[async]` (psycopg 3) to be installed.
- **fetch_all** – Runs the query and returns every row as tuples, closing the cursor.
- **fetch_iter** – Yields the rows in chunks with a NAMED cursor (server-side).
- **execute** – Runs a statement fetching no rows and returns how many it affected.
- **commit** – Commits the transaction in progress.
- **rollback** – Rolls back the transaction in progress.
- **savepoint** – Opens a named savepoint.
- **release_savepoint** – Commits the savepoint.
- **rollback_to_savepoint** – Goes back to the savepoint, undoing what was done since it was opened.
- **close** – Closes the connection.

**Attributes:**

- **last_insert_id** (`int`) – The id of the last INSERT (see the Protocol). Unused: Postgres returns the PK through RETURNING.

#### `connect`

```python
connect(dsn: str) -> AsyncPsycopgDriver
```

Opens the connection. Requires `snakeorm[async]` (psycopg 3) to be installed.

#### `fetch_all`

```python
fetch_all(sql: str, params: Sequence[object]) -> list[tuple[object, ...]]
```

Runs the query and returns every row as tuples, closing the cursor.

#### `fetch_iter`

```python
fetch_iter(sql: str, params: Sequence[object], *, chunk: int = 1000) -> AsyncIterator[tuple[object, ...]]
```

Yields the rows in chunks with a NAMED cursor (server-side).

On psycopg3, just as on psycopg2, the name is what makes the result stay on Postgres
instead of travelling to the client whole. Without it, `fetchmany` would be slicing
something that is already in memory and the streaming would be decorative.

#### `execute`

```python
execute(sql: str, params: Sequence[object]) -> int
```

Runs a statement fetching no rows and returns how many it affected.

#### `last_insert_id`

```python
last_insert_id: int
```

The id of the last INSERT (see the Protocol). Unused: Postgres returns the PK through RETURNING.

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

#### `savepoint`

```python
savepoint(name: str) -> None
```

Opens a named savepoint.

#### `release_savepoint`

```python
release_savepoint(name: str) -> None
```

Commits the savepoint.

#### `rollback_to_savepoint`

```python
rollback_to_savepoint(name: str) -> None
```

Goes back to the savepoint, undoing what was done since it was opened.

#### `close`

```python
close() -> None
```

Closes the connection.

### `AsyncPyMySQLDriver`

Bases: `ThreadedAsyncDriver`

The MySQL driver wearing the `AsyncDriver` surface.

It is the engine where `last_insert_id` really matters: MySQL has no `RETURNING` (MariaDB
does), so there an INSERT's autoincrement PK comes from it. The async Protocol not declaring
it was a time bomb waiting for precisely this file.

**Functions:**

- **connect** – Opens the connection with PyMySQL's kwargs (host, user, password, database, port...).
- **server_version** – What the server calls itself, for the dialect to tell MariaDB from MySQL.
- **open** – Opens the connection INSIDE the adapter's thread and wraps it.
- **fetch_all** – Runs the query and returns every row as tuples.
- **fetch_iter** – Yields the rows WITHOUT materialising them all, crossing the thread once per CHUNK.
- **execute** – Runs a statement fetching no rows; returns how many it affected.
- **commit** – Commits the transaction in progress.
- **rollback** – Rolls back the transaction in progress.
- **savepoint** – Opens a named savepoint.
- **release_savepoint** – Commits the savepoint.
- **rollback_to_savepoint** – Goes back to the savepoint, undoing what was done since it was opened.
- **close** – Closes the connection AND shuts the thread down. Without the second, the process never ends.

**Attributes:**

- **last_insert_id** (`int`) – The autoincrement id of the last INSERT. It does not travel to the database: no thread needed.

#### `connect`

```python
connect(**kwargs: Any) -> AsyncPyMySQLDriver
```

Opens the connection with PyMySQL's kwargs (host, user, password, database, port...).

The connection is opened INSIDE the adapter's thread, just like on SQLite. PyMySQL does
not demand it —it only asks that two threads do not use it at once—, but opening it where
it is going to be used leaves ONE rule for both engines instead of an exception somebody
will have to remember.

And `connect` really does block (it opens a socket and negotiates): doing it on the thread
avoids stalling the event loop right at startup, which is when the most tasks are waiting.

#### `server_version`

```python
server_version() -> str
```

What the server calls itself, for the dialect to tell MariaDB from MySQL.

It goes to the thread because it is a query: the wrapped driver already knows how to ask.

#### `open`

```python
open(factory: Callable[[], SnakeDriver]) -> Self
```

Opens the connection INSIDE the adapter's thread and wraps it.

Having the thread that will use it open it is not a precaution: `sqlite3` TIES the
connection to its creating thread and raises `ProgrammingError` if another one touches it,
so building it outside and using it inside blew up on the first `close()`. With this, the
connection is born and dies on the same thread.

`max_workers=1` is what makes the wrapper correct, not a performance knob: a DBAPI
connection is not thread-safe, and a single thread serialises the calls by construction.

#### `fetch_all`

```python
fetch_all(sql: str, params: Sequence[object]) -> list[tuple[object, ...]]
```

Runs the query and returns every row as tuples.

#### `fetch_iter`

```python
fetch_iter(sql: str, params: Sequence[object], *, chunk: int = 1000) -> AsyncIterator[tuple[object, ...]]
```

Yields the rows WITHOUT materialising them all, crossing the thread once per CHUNK.

It stays LAZY, at the granularity of `chunk` — which is what `chunk` means everywhere else
in this ORM, the inner driver included (`sqlite.py` uses `fetchmany(chunk)`). That `chunk`
governs the round trip to the SERVER; this one governs the crossing of the thread.

Crossing per ROW instead —a Future, a callback on the loop and waking a thread, for every
row— measured 103 trips to the executor for 100 rows, where the chunked read costs a
handful. `islice` is what keeps the laziness and the chunking at the same time, and this is
the only async path two of the three first-class engines have.

What a `break` costs goes from one row to one chunk. It never costs the whole result: the
synchronous iterator is still only advanced as far as it is read.

#### `execute`

```python
execute(sql: str, params: Sequence[object]) -> int
```

Runs a statement fetching no rows; returns how many it affected.

#### `last_insert_id`

```python
last_insert_id: int
```

The autoincrement id of the last INSERT. It does not travel to the database: no thread needed.

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

#### `savepoint`

```python
savepoint(name: str) -> None
```

Opens a named savepoint.

#### `release_savepoint`

```python
release_savepoint(name: str) -> None
```

Commits the savepoint.

#### `rollback_to_savepoint`

```python
rollback_to_savepoint(name: str) -> None
```

Goes back to the savepoint, undoing what was done since it was opened.

#### `close`

```python
close() -> None
```

Closes the connection AND shuts the thread down. Without the second, the process never ends.

### `AsyncSQLiteDriver`

Bases: `ThreadedAsyncDriver`

The SQLite driver wearing the `AsyncDriver` surface.

**Functions:**

- **connect** – Opens the database (a file or `:memory:`) and wraps it.
- **open** – Opens the connection INSIDE the adapter's thread and wraps it.
- **fetch_all** – Runs the query and returns every row as tuples.
- **fetch_iter** – Yields the rows WITHOUT materialising them all, crossing the thread once per CHUNK.
- **execute** – Runs a statement fetching no rows; returns how many it affected.
- **commit** – Commits the transaction in progress.
- **rollback** – Rolls back the transaction in progress.
- **savepoint** – Opens a named savepoint.
- **release_savepoint** – Commits the savepoint.
- **rollback_to_savepoint** – Goes back to the savepoint, undoing what was done since it was opened.
- **close** – Closes the connection AND shuts the thread down. Without the second, the process never ends.

**Attributes:**

- **last_insert_id** (`int`) – The autoincrement id of the last INSERT. It does not travel to the database: no thread needed.

#### `connect`

```python
connect(path: str) -> AsyncSQLiteDriver
```

Opens the database (a file or `:memory:`) and wraps it.

It is `async` even though opening a file waits for nobody: the opening contract has to be
the same as the one for networked engines, or `SnakeConnectionConfig.open_async()` would
need a path per engine and we would be back to two ways of doing the same thing.

The connection is opened INSIDE the adapter's thread: `sqlite3` ties every connection to
its creating thread, so opening it here and using it over there blew up on the first
`close()`.

#### `open`

```python
open(factory: Callable[[], SnakeDriver]) -> Self
```

Opens the connection INSIDE the adapter's thread and wraps it.

Having the thread that will use it open it is not a precaution: `sqlite3` TIES the
connection to its creating thread and raises `ProgrammingError` if another one touches it,
so building it outside and using it inside blew up on the first `close()`. With this, the
connection is born and dies on the same thread.

`max_workers=1` is what makes the wrapper correct, not a performance knob: a DBAPI
connection is not thread-safe, and a single thread serialises the calls by construction.

#### `fetch_all`

```python
fetch_all(sql: str, params: Sequence[object]) -> list[tuple[object, ...]]
```

Runs the query and returns every row as tuples.

#### `fetch_iter`

```python
fetch_iter(sql: str, params: Sequence[object], *, chunk: int = 1000) -> AsyncIterator[tuple[object, ...]]
```

Yields the rows WITHOUT materialising them all, crossing the thread once per CHUNK.

It stays LAZY, at the granularity of `chunk` — which is what `chunk` means everywhere else
in this ORM, the inner driver included (`sqlite.py` uses `fetchmany(chunk)`). That `chunk`
governs the round trip to the SERVER; this one governs the crossing of the thread.

Crossing per ROW instead —a Future, a callback on the loop and waking a thread, for every
row— measured 103 trips to the executor for 100 rows, where the chunked read costs a
handful. `islice` is what keeps the laziness and the chunking at the same time, and this is
the only async path two of the three first-class engines have.

What a `break` costs goes from one row to one chunk. It never costs the whole result: the
synchronous iterator is still only advanced as far as it is read.

#### `execute`

```python
execute(sql: str, params: Sequence[object]) -> int
```

Runs a statement fetching no rows; returns how many it affected.

#### `last_insert_id`

```python
last_insert_id: int
```

The autoincrement id of the last INSERT. It does not travel to the database: no thread needed.

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

#### `savepoint`

```python
savepoint(name: str) -> None
```

Opens a named savepoint.

#### `release_savepoint`

```python
release_savepoint(name: str) -> None
```

Commits the savepoint.

#### `rollback_to_savepoint`

```python
rollback_to_savepoint(name: str) -> None
```

Goes back to the savepoint, undoing what was done since it was opened.

#### `close`

```python
close() -> None
```

Closes the connection AND shuts the thread down. Without the second, the process never ends.

### `AsyncSnakePool`

```python
AsyncSnakePool(borrow: AsyncBorrow, give_back: AsyncGiveBack, close_all: AsyncCloseAll, *, discard: AsyncDiscard | None = None, pre_ping: bool = False, recycle_seconds: float | None = None, timeout_seconds: float | None = None, retry_interval: float = 0.05, clock: Clock = monotonic) -> None
```

Hands out async connections and takes them back. Engine-agnostic, like its sibling.

**Functions:**

- **acquire** – Lends a HEALTHY connection, wrapped: closing it sends it back to the pool.
- **connection** – Lends a connection and ALWAYS returns it, even if the block blows up.
- **close** – Closes every connection in the pool.

#### `acquire`

```python
acquire() -> AsyncDriver
```

Lends a HEALTHY connection, wrapped: closing it sends it back to the pool.

While it waits for one to be freed, it hands control of the loop back (`asyncio.sleep`)
instead of blocking the thread. That is the only real difference from the synchronous
sibling, and it is what keeps one task waiting for a connection from stopping the other
ninety-nine.

#### `connection`

```python
connection() -> AsyncIterator[AsyncDriver]
```

Lends a connection and ALWAYS returns it, even if the block blows up.

#### `close`

```python
close() -> None
```

Closes every connection in the pool.

### `ThreadedAsyncDriver`

```python
ThreadedAsyncDriver(inner: SnakeDriver, *, executor: ThreadPoolExecutor) -> None
```

Wraps a `SnakeDriver` and exposes it as an `AsyncDriver`, on a dedicated thread.

**Functions:**

- **open** – Opens the connection INSIDE the adapter's thread and wraps it.
- **fetch_all** – Runs the query and returns every row as tuples.
- **fetch_iter** – Yields the rows WITHOUT materialising them all, crossing the thread once per CHUNK.
- **execute** – Runs a statement fetching no rows; returns how many it affected.
- **commit** – Commits the transaction in progress.
- **rollback** – Rolls back the transaction in progress.
- **savepoint** – Opens a named savepoint.
- **release_savepoint** – Commits the savepoint.
- **rollback_to_savepoint** – Goes back to the savepoint, undoing what was done since it was opened.
- **close** – Closes the connection AND shuts the thread down. Without the second, the process never ends.

**Attributes:**

- **last_insert_id** (`int`) – The autoincrement id of the last INSERT. It does not travel to the database: no thread needed.

#### `open`

```python
open(factory: Callable[[], SnakeDriver]) -> Self
```

Opens the connection INSIDE the adapter's thread and wraps it.

Having the thread that will use it open it is not a precaution: `sqlite3` TIES the
connection to its creating thread and raises `ProgrammingError` if another one touches it,
so building it outside and using it inside blew up on the first `close()`. With this, the
connection is born and dies on the same thread.

`max_workers=1` is what makes the wrapper correct, not a performance knob: a DBAPI
connection is not thread-safe, and a single thread serialises the calls by construction.

#### `fetch_all`

```python
fetch_all(sql: str, params: Sequence[object]) -> list[tuple[object, ...]]
```

Runs the query and returns every row as tuples.

#### `fetch_iter`

```python
fetch_iter(sql: str, params: Sequence[object], *, chunk: int = 1000) -> AsyncIterator[tuple[object, ...]]
```

Yields the rows WITHOUT materialising them all, crossing the thread once per CHUNK.

It stays LAZY, at the granularity of `chunk` — which is what `chunk` means everywhere else
in this ORM, the inner driver included (`sqlite.py` uses `fetchmany(chunk)`). That `chunk`
governs the round trip to the SERVER; this one governs the crossing of the thread.

Crossing per ROW instead —a Future, a callback on the loop and waking a thread, for every
row— measured 103 trips to the executor for 100 rows, where the chunked read costs a
handful. `islice` is what keeps the laziness and the chunking at the same time, and this is
the only async path two of the three first-class engines have.

What a `break` costs goes from one row to one chunk. It never costs the whole result: the
synchronous iterator is still only advanced as far as it is read.

#### `execute`

```python
execute(sql: str, params: Sequence[object]) -> int
```

Runs a statement fetching no rows; returns how many it affected.

#### `last_insert_id`

```python
last_insert_id: int
```

The autoincrement id of the last INSERT. It does not travel to the database: no thread needed.

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

#### `savepoint`

```python
savepoint(name: str) -> None
```

Opens a named savepoint.

#### `release_savepoint`

```python
release_savepoint(name: str) -> None
```

Commits the savepoint.

#### `rollback_to_savepoint`

```python
rollback_to_savepoint(name: str) -> None
```

Goes back to the savepoint, undoing what was done since it was opened.

#### `close`

```python
close() -> None
```

Closes the connection AND shuts the thread down. Without the second, the process never ends.

### `AsyncLoggingDriver`

```python
AsyncLoggingDriver(inner: AsyncDriver, write: Writer = _silent, *, parameter_keys: frozenset[str] = frozenset()) -> None
```

Wraps an `AsyncDriver` and logs every statement with its params and its duration.
In async the order of the coroutines is not the order of the code, so the log is sometimes the only way to know it.

**Functions:**

- **fetch_all** – Queries, logging how many rows came back and how long it took.
- **fetch_iter** – Yields the rows, logging how many were CONSUMED and how long it lasted.
- **execute** – Runs the statement, logging how many rows it affected and how long it took.
- **commit** – Commits, leaving a record of it.
- **rollback** – Rolls back, leaving a record of it.
- **savepoint** – Marks a savepoint and writes it down.
- **release_savepoint** – Releases a savepoint and writes it down.
- **rollback_to_savepoint** – Rolls back to a savepoint and writes it down.
- **close** – Closes the driver inside.

**Attributes:**

- **last_insert_id** (`int`) – Delegates the id of the last INSERT: a decorator does not invent, it passes through.

The same contract as `LoggingDriver`: the VALUES are opt-in, named by 0-based index.

Spelled out here rather than inherited because the two colours are separate classes, and
this is the half the fix originally missed — the synchronous one stopped writing user
values and this one carried on doing it, which is the drift the whole seam suffers from.

#### `fetch_all`

```python
fetch_all(sql: str, params: Sequence[object]) -> list[tuple[object, ...]]
```

Queries, logging how many rows came back and how long it took.

#### `fetch_iter`

```python
fetch_iter(sql: str, params: Sequence[object], *, chunk: int = 1000) -> AsyncIterator[tuple[object, ...]]
```

Yields the rows, logging how many were CONSUMED and how long it lasted.

It is written down at the end, as in the synchronous logging: counting beforehand would
require materialising, which is exactly what this path avoids, and in streaming what
matters is what was really walked (a `break` at the tenth row out of a million counts ten).

#### `execute`

```python
execute(sql: str, params: Sequence[object]) -> int
```

Runs the statement, logging how many rows it affected and how long it took.

#### `last_insert_id`

```python
last_insert_id: int
```

Delegates the id of the last INSERT: a decorator does not invent, it passes through.

#### `commit`

```python
commit() -> None
```

Commits, leaving a record of it.

#### `rollback`

```python
rollback() -> None
```

Rolls back, leaving a record of it.

#### `savepoint`

```python
savepoint(name: str) -> None
```

Marks a savepoint and writes it down.

It wrote NOTHING before. The class docstring of its synchronous twin says that without the
transaction boundaries "the log lies by omission", and this colour omitted three of them.

#### `release_savepoint`

```python
release_savepoint(name: str) -> None
```

Releases a savepoint and writes it down.

#### `rollback_to_savepoint`

```python
rollback_to_savepoint(name: str) -> None
```

Rolls back to a savepoint and writes it down.

#### `close`

```python
close() -> None
```

Closes the driver inside.

### `AsyncTimeoutDriver`

```python
AsyncTimeoutDriver(inner: AsyncDriver, *, statement_timeout_ms: int) -> None
```

Wraps an `AsyncDriver`, pinning the connection's `statement_timeout`.
It is applied with `apply_to`, not in the constructor: in async you cannot await inside `__init__`.

**Functions:**

- **apply_to** – Creates the decorator and LEAVES the timeout APPLIED on the connection.
- **fetch_all** – Delegates the query; the limit is already set on the connection.
- **fetch_iter** – Delegates the streaming; the limit is already set on the connection.
- **execute** – Delegates the statement.
- **commit** – Delegates the commit.
- **rollback** – Delegates the rollback.
- **savepoint** – Delegates the savepoint.
- **release_savepoint** – Delegates the release of the savepoint.
- **rollback_to_savepoint** – Delegates the return to the savepoint.
- **close** – Closes the driver inside.

**Attributes:**

- **last_insert_id** (`int`) – Delegates the id of the last INSERT: a decorator does not invent, it passes through.

#### `apply_to`

```python
apply_to(inner: AsyncDriver, dialect: SnakeDialect, *, statement_timeout_ms: int) -> AsyncTimeoutDriver
```

Creates the decorator and LEAVES the timeout APPLIED on the connection.

Both halves of this came from copying the synchronous driver's SHAPE without its reasons.
The `<= 0` guard was missing — on Postgres `statement_timeout = 0` means NO LIMIT, so
accepting a zero does the exact opposite of what was asked — and the statement was written
out as Postgres SQL, which MySQL and SQLite reject.

#### `fetch_all`

```python
fetch_all(sql: str, params: Sequence[object]) -> list[tuple[object, ...]]
```

Delegates the query; the limit is already set on the connection.

#### `fetch_iter`

```python
fetch_iter(sql: str, params: Sequence[object], *, chunk: int = 1000) -> AsyncIterator[tuple[object, ...]]
```

Delegates the streaming; the limit is already set on the connection.

#### `execute`

```python
execute(sql: str, params: Sequence[object]) -> int
```

Delegates the statement.

#### `last_insert_id`

```python
last_insert_id: int
```

Delegates the id of the last INSERT: a decorator does not invent, it passes through.

#### `commit`

```python
commit() -> None
```

Delegates the commit.

#### `rollback`

```python
rollback() -> None
```

Delegates the rollback.

#### `savepoint`

```python
savepoint(name: str) -> None
```

Delegates the savepoint.

#### `release_savepoint`

```python
release_savepoint(name: str) -> None
```

Delegates the release of the savepoint.

#### `rollback_to_savepoint`

```python
rollback_to_savepoint(name: str) -> None
```

Delegates the return to the savepoint.

#### `close`

```python
close() -> None
```

Closes the driver inside.

## Custom types

### `register_converter`

```python
register_converter(python_type: type[T], *, to_db: Callable[[T], object], from_db: Callable[[object], T]) -> None
```

Declares how a domain type travels: from Python to the driver and back.

Generic in the declared type, so whoever writes the converters works with THEIR type and not
with `object`: `to_db` receives an `Inet` and `from_db` returns an `Inet`, and the checker
verifies it. An ORM whose selling point is typing cannot ask for untyped lambdas in its own API.

`from_db` MUST be idempotent —`from_db(from_db(x)) == from_db(x)`— because the same converter
serves all three engines and each returns the column in one shape: Postgres may hand over the
object already and SQLite the text. It is checked here, at registration time, and not on the
first read in production.

It does not rewrite the types the ORM already handles. A global registry is an invitation for a
third-party library to change how a `Decimal` travels for the entire process just by being
imported.

