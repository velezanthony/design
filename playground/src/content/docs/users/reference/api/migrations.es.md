# Migraciones

Los ficheros de migración son **Python**, no YAML ni JSON, y no es una
elección de estilo: `python_type` es un tipo de Python, y serializarlo a JSON exigiría un registro
nombre↔tipo — un segundo sistema de tipos, peor. En `.py` es un import y una referencia.

Cada operación sabe aplicarse y sabe deshacerse. Lo que un motor no puede hacer se para en el PLAN,
con un motivo legible, en vez de a mitad de un despliegue.

:::note[De dónde sale este texto]
Todo lo que hay bajo los títulos se genera desde los docstrings del propio paquete, en cada
build.

Los títulos sí están escritos a mano, así que esta página puede quedarse atrás respecto al
módulo — se había quedado, por siete operaciones. La lista que no puede quedarse atrás es la del
propio módulo:

```bash
rg -n '^class ' src/snakeorm/migration/operations.py
```
:::

## Runners

Una migración declara detrás de QUÉ va, y el cargador convierte esas declaraciones en un solo orden entre paquetes. Un ciclo se rechaza en voz alta, nombrando las migraciones que lo cierran — elegir un orden y confiar es lo único que no hace.

```python
from snakeorm.migration import Migration

class AddOrderTotals(Migration):
    """A migration from another package can be named as a dependency."""

    depends_on = ["billing.0003_add_plans"]
    operations = [...]
```

### `Migration`

```python
Migration(version: str, operations: tuple[SnakeMigrationOperation, ...], replaces: tuple[str, ...] = ()) -> None
```

A versioned unit of operations (schema and/or data). The order comes from its number.

**Attributes:**

- **replaces** (`tuple[str, ...]`) – Versions this migration REPLACES (a squash). Empty in a normal migration.

#### `replaces`

```python
replaces: tuple[str, ...] = ()
```

Versions this migration REPLACES (a squash). Empty in a normal migration.

It allows a history to be collapsed without breaking the databases where the originals were
already applied: there the squash is marked applied without being executed. See `apply`.

### `MigrationRunner`

```python
MigrationRunner(driver: SnakeDriver, dialect: SnakeDialect) -> None
```

Applies/reverts migrations and records the applied ones in `snake_migrations`.

**Functions:**

- **ensure_tracking_table** – Creates the tracking table if it does not exist (idempotent).
- **applied_versions** – Returns the set of versions already applied.
- **apply** – Applies the pending migrations in order. Returns the versions applied just now.
- **rollback** – Reverts a migration (operations in reverse order) and deletes its record.

#### `ensure_tracking_table`

```python
ensure_tracking_table() -> None
```

Creates the tracking table if it does not exist (idempotent).

The DDL itself is `tracking_table_ddl`, shared with the async runner. It used to live here,
and the async one carried its own copy with the MySQL bug this one had already fixed — which
is the reason it is a loose function now and not a method on each.

#### `applied_versions`

```python
applied_versions() -> set[str]
```

Returns the set of versions already applied.

#### `apply`

```python
apply(migrations: list[Migration]) -> list[str]
```

Applies the pending migrations in order. Returns the versions applied just now.

Every migration is ATOMIC: its operations and the version record go together. With
transactional DDL a failure halfway does a `rollback()`; without it, how many were applied is
reported.

#### `rollback`

```python
rollback(migration: Migration) -> None
```

Reverts a migration (operations in reverse order) and deletes its record.

### `AsyncMigrationRunner`

```python
AsyncMigrationRunner(driver: AsyncDriver, dialect: SnakeDialect) -> None
```

Applies/reverts migrations over an `AsyncDriver`, with the same tracking as the sync one.

**Functions:**

- **ensure_tracking_table** – Creates the tracking table if it does not exist (idempotent).
- **applied_versions** – Returns the set of versions already applied.
- **apply** – Applies the pending migrations in order. Returns the versions applied just now.
- **rollback** – Reverts a migration (operations in reverse order) and deletes its record.

#### `ensure_tracking_table`

```python
ensure_tracking_table() -> None
```

Creates the tracking table if it does not exist (idempotent).

#### `applied_versions`

```python
applied_versions() -> set[str]
```

Returns the set of versions already applied.

#### `apply`

```python
apply(migrations: list[Migration]) -> list[str]
```

Applies the pending migrations in order. Returns the versions applied just now.

Same semantics as the synchronous one: idempotent, atomic per migration with transactional
DDL, and a hard stop if a squash replaces a history that was applied HALFWAY.

#### `rollback`

```python
rollback(migration: Migration) -> None
```

Reverts a migration (operations in reverse order) and deletes its record.

## Autodetección

### `autodetect`

Django-style autogen: rebuilds the state by replaying migrations and diffs it.

`replay` applies the operations of every migration onto an empty SchemaState -> the state the
schema SHOULD have according to the history. `autodetect` diffs that against the current
metadata (the code-first source of truth) and returns the operations for the new migration.
Neither snapshots nor reflection: the migration history IS the record of the state.

**Functions:**

- **current_schema** – The current metadata (code-first source of truth): the tables of the registered models.
- **current_routines** – The desired routines (code-first source of truth): those declared with `snake_function`.
- **current_triggers** – The DESIRED triggers: those declared with `snake_trigger(...)`.
- **replay** – Rebuilds the schema state by applying the migrations' operations in order.
- **autodetect** – Diffs the state replayed from the history against the current metadata -> new operations.

#### `current_schema`

```python
current_schema(reg: SnakeRegistry = registry, *, database: str | None = None, include_unmanaged: bool = False) -> list[SnakeTableInfo]
```

The current metadata (code-first source of truth): the tables of the registered models.

Excludes MIRROR models (`@snake_db_first`): they are not a source of truth, and autogen must not
touch them. With `database`, only those of THAT connection (which avoids creating every table in
every DB). `include_unmanaged=True` returns them too: drift detection uses it (comparing the
mirror against the DB), but MIGRATIONS never touch them (the default behaviour).

#### `current_routines`

```python
current_routines(reg: SnakeRegistry = registry) -> list[SnakeRoutineInfo]
```

The desired routines (code-first source of truth): those declared with `snake_function`.

#### `current_triggers`

```python
current_triggers(reg: SnakeRegistry = registry) -> list[SnakeTriggerInfo]
```

The DESIRED triggers: those declared with `snake_trigger(...)`.

#### `replay`

```python
replay(migrations: Iterable[Migration]) -> SchemaState
```

Rebuilds the schema state by applying the migrations' operations in order.

#### `autodetect`

```python
autodetect(migrations: Iterable[Migration], current: Iterable[SnakeTableInfo], routines: Iterable[SnakeRoutineInfo] | None = None, triggers: Iterable[SnakeTriggerInfo] | None = None) -> list[SnakeOperation]
```

Diffs the state replayed from the history against the current metadata -> new operations.

Resolves FK targets by model name through the global registry. Global order: tables -> FKs ->
views (topological) -> functions -> triggers (each one depends on the ones before it).

### `replay`

```python
replay(migrations: Iterable[Migration]) -> SchemaState
```

Rebuilds the schema state by applying the migrations' operations in order.

### `diff_schema`

```python
diff_schema(before: Iterable[SnakeTableInfo], after: Iterable[SnakeTableInfo], resolve_target: ResolveTarget | None = None, resolve_qualified: ResolveTarget | None = None, triggers: Iterable[SnakeTriggerInfo] = ()) -> list[SnakeOperation]
```

Derives the operations to get from schema `before` to `after`.

Order: tables (create/drop/columns) -> FKs -> views (which depend on the tables). Views are not
mixed in with columns or FKs; if their definition changes the whole thing is replaced (AlterView).

`triggers` are the ones the schema ALREADY has — the replayed state's, which is the only place
that knows they exist, since `SnakeTableInfo` has no field for one. They are not diffed here
(`diff_triggers` does that, afterwards): they are handed to any `RebuildTable` this call emits,
because on an engine with no `ALTER TABLE ADD CONSTRAINT` that rebuild DROPS the table and takes
them with it. Filling them in the same call that builds the operation is what keeps a rebuild
from coming out headless — nobody has to remember a second step.

THE VIEWS ARE NOT HANDED OVER, and the difference from the triggers is a fact against a guess.
A `SnakeTriggerInfo` has a `.table`, so "the triggers of this table" is a question the state
answers exactly. Nothing says which TABLES a view reads: `depends_on` is view->view only and is
refused for tables on purpose, and a view declared with `sql=` is raw text. So the generator
emits the rebuild bare: the engine refuses it, the migration rolls back whole, and
`explain_rebuild_failure` says to put a `DropView` before it and a `CreateView` after it.

### `render_migration`

```python
render_migration(version: str, operations: Sequence[SnakeMigrationOperation], replaces: Sequence[str] = ()) -> str
```

Generates the text of a migration file that rebuilds `operations` when it is imported.

It exposes `version`, `operations` and `migration: Migration`. `replaces` are the versions that
this file SUPERSEDES (a squash); it is written only when there is one (a normal migration does not
shift a single byte) and it must be written: the runner needs it so as not to rerun a squash over
a DB that is already migrated.

### `load`

```python
load(directory: str | Path) -> list[Migration]
```

Discovers, validates and loads a directory's migrations, ordered by number.

Returns `[]` if the directory does not exist or has no migrations. Raises `SnakeMigrationError`
if there are duplicate numbers or gaps in the sequence.

### `drop_order`

```python
drop_order(tables: list[SnakeTableInfo]) -> list[SnakeTableInfo]
```

Orders tables so the one HOLDING a foreign key is dropped before the one it points at.

Two of the three engines refuse `DROP TABLE` while a key points at the table — measured:
PostgreSQL says other objects depend on it, MariaDB answers error 1451, and only SQLite accepts
it and leaves the key dangling. It is not a dialect difference to translate in the emitter: the
SQL is correct and what matters is the ORDER.

It is the exact mirror of the creation order the planner already derives from the same FKs, and
of `topological_view_order`, which drops views in reverse of the order it creates them in.

Only edges INSIDE this set count: a key into a table that is not being dropped constrains
nothing here. A table pointing at ITSELF (`parent_id`, the commonest tree there is) imposes no
order either — its own edge cannot make it wait for itself. A real cycle between two tables
cannot be ordered at all, so it stops and names THE WHOLE LOOP: naming one end sends the reader
to look at half of it, and the half they cannot see is the one holding the other key.

## Esquemas

### `CreateSchema`

```python
CreateSchema(schema: str) -> None
```

Creates a schema; its reverse drops it. It goes BEFORE any table using it.

### `DropSchema`

```python
DropSchema(schema: str) -> None
```

Drops a schema; its reverse recreates it.

## Operaciones de tabla

### `CreateTable`

```python
CreateTable(table: SnakeTableInfo) -> None
```

Creates a table; its reverse drops it.

### `DropTable`

```python
DropTable(table: SnakeTableInfo) -> None
```

Drops a table; its reverse recreates it.

### `RenameTable`

```python
RenameTable(table: SnakeTableInfo, new_name: str) -> None
```

Renames a table KEEPING its rows; its reverse gives it the old name back.

Written BY HAND, like `RenameColumn` and for the same reason one level up: the diff sees a
rename as `CreateTable` + `DropTable`, which is correct SQL and destroys every row in the table.
The diff is not taught to guess it — guessing wrong keeps a table somebody asked to destroy,
with another table's data inside.

THE OLD NAME IS `table.name` and there is no second field holding it. Two spellings of one fact
are two things that can disagree, and this repository has already paid for a pair broken in half
inside the linker; here the table being renamed IS the table this operation carries, so the
question does not arise. `RenameColumn` needs an `old_name` because a table has many columns and
the table alone cannot say which one.

It renames WITHIN a schema. Moving a table to another schema is `ALTER TABLE ... SET SCHEMA`, a
different statement, and Postgres refuses to spell it as a qualified RENAME (measured).

### `RebuildTable`

```python
RebuildTable(before: SnakeTableInfo, after: SnakeTableInfo, triggers: tuple[SnakeTriggerInfo, ...] = ()) -> None
```

Takes a table from one CONSTRAINT shape to another; its reverse takes it back.

AN OPERATION AND NOT A SIDE EFFECT. SQLite has no `ALTER TABLE ADD/DROP CONSTRAINT`, so
changing a CHECK or a foreign key means remaking the table. It is in the file, with a name and
both snapshots, so a reader knows which table gets remade and a revert gets the other shape back.

The file stays engine-agnostic: each dialect spells it — the minimal `ALTER` on Postgres and
MySQL, the whole rebuild on SQLite.

THE TWO SNAPSHOTS MAY ONLY DIFFER IN CONSTRAINTS, checked here rather than trusted. A pair
disagreeing about a column would apply on SQLite (which recreates from `after`) and not on
Postgres (whose minimal change emits no `ALTER COLUMN`), leaving two engines on different
schemas without a word. Columns have their own operations; renaming has `RenameTable`.

THE TRIGGERS RIDE IN A THIRD FIELD, and that asymmetry is forced: indexes come back because
they live inside the snapshot, and `SnakeTableInfo` has no `triggers`. They are filled by the
caller that holds the state (`diff_schema`) and recreated by `_remake_table`.

THE VIEWS DO NOT TRAVEL: a trigger knows its `.table`, a view does not. The consequence is
translated rather than hidden — SQLite's closing `ALTER TABLE ... RENAME TO` reparses the
schema, so a standing view that READS this table fails the migration whole
(`error in view <v>: no such table`), and `explain_rebuild_failure` turns that line into the one
that says what to write: a `DropView` before and a `CreateView` after.

**Functions:**

- **apply_to_state** – Leaves the `after` snapshot in the state — and REFUSES to drop a trigger on the floor.

**Attributes:**

- **triggers** (`tuple[SnakeTriggerInfo, ...]`) – The triggers hanging off this table, which the rebuild has to put back after dropping it.

#### `triggers`

```python
triggers: tuple[SnakeTriggerInfo, ...] = ()
```

The triggers hanging off this table, which the rebuild has to put back after dropping it.

#### `apply_to_state`

```python
apply_to_state(state: SchemaState) -> None
```

Leaves the `after` snapshot in the state — and REFUSES to drop a trigger on the floor.

THIS IS WHERE THE QUESTION CAN BE ASKED AT ALL. The operation cannot see the triggers by
itself: `up_sql` gets a dialect and nothing else, and the file that builds it is imported
with no state anywhere near it. `apply_to_state` is the one place a rebuild of ANY
provenance — autodetected or written by hand — meets a `SchemaState`, and `replay` walks
every operation of every migration through it on each `makemigrations` and each `squash`.

So a rebuild whose table has triggers the payload does not carry stops the replay and names
them, instead of leaving the state believing in triggers the `DROP TABLE` already ate. The
normal path never gets here with the question open: `diff_schema` receives the state's
triggers in the same call that builds the operation.

### `AlterTableComment`

```python
AlterTableComment(table: SnakeTableInfo, previous: str | None) -> None
```

Changes an existing table's `COMMENT ON TABLE`; its reverse restores the previous one.

The COLUMN one is already covered by `AlterColumn`; this is the TABLE one. On an engine without
comments (SQLite) up/down come out empty: the operation exists in the history but emits nothing.

### `AddColumn`

```python
AddColumn(table: SnakeTableInfo, column: SnakeColumnInfo) -> None
```

Adds a column to a table; its reverse drops it.

### `DropColumn`

```python
DropColumn(table: SnakeTableInfo, column: SnakeColumnInfo) -> None
```

Drops a column from a table; its reverse recreates it (with its original info).

### `RenameColumn`

```python
RenameColumn(table: SnakeTableInfo, old_name: str, new_name: str) -> None
```

Renames a column KEEPING its data; its reverse gives it the old name back.

It is written BY HAND, replacing the `DropColumn` + `AddColumn` the diff generates (correct but
catastrophic: it drops the old column along with its data).

### `AlterColumn`

```python
AlterColumn(table: SnakeTableInfo, old: SnakeColumnInfo, new: SnakeColumnInfo) -> None
```

Changes an existing column (type/nullable); its reverse undoes the change.

`RebuildTable` lleva una tabla de una forma de CONSTRAINTS a otra, y ahí está la salida de SQLite: no
tiene `ALTER TABLE ADD/DROP CONSTRAINT` ni lo tendrá, así que un CHECK o una clave ajena sobre una
tabla que YA EXISTE solo puede llegar rehaciendo la tabla a su alrededor — crear la nueva, copiar las
filas, tirar la vieja, renombrar. La operación no nombra ningún motor: Postgres y MySQL reciben el
`ALTER TABLE ... ADD CONSTRAINT` mínimo y solo, SQLite recibe la reconstrucción entera.

Recibe dos snapshots `SnakeTableInfo` ENTEROS, más los triggers que cuelgan de la tabla — la
reconstrucción se los lleva con ella y se los debe de vuelta. Y RECHAZA un par que discrepe en algo
que no sean CHECK y claves ajenas, nombrando lo que discrepa: una diferencia en columnas se aplicaría
en SQLite (que recrea la tabla desde `after`) y no en Postgres (cuyo `ALTER` mínimo no emite nada
para eso), dejando a los dos motores con esquemas distintos y a ninguno diciendo nada. Las columnas
tienen sus propias operaciones, y tirar una que sujeta una clave ajena NO es esta operación: SQLite
tampoco tiene `DROP CONSTRAINT` para quitar la clave de en medio antes, así que eso es un `RunSQL`
escrito a mano, y es decisión del usuario — ver [límites conocidos](../limits.es.md).

```python
from dataclasses import replace

from snakeorm.metadata import (
    SnakeColumnInfo,
    SnakeForeignKeyInfo,
    SnakePrimaryKeyInfo,
    SnakeRelationshipInfo,
    SnakeRelationshipKind,
    SnakeTableInfo,
)
from snakeorm.migration import RebuildTable

tag_id = SnakeColumnInfo(name="id", python_type=int, attr_name="id", autoincrement=True)
parent_id = SnakeColumnInfo(
    name="parent_id", python_type=int, nullable=True, attr_name="parent_id"
)

# The WHOLE table as this migration finds it: on SQLite the rebuild recreates it from `after`, so
# anything left out of the snapshot is structure lost without a word.
tags = SnakeTableInfo(
    name="tags",
    columns=(tag_id, parent_id),
    primary_key=SnakePrimaryKeyInfo(columns=(tag_id,)),
)
parent = SnakeRelationshipInfo(
    name="parent",
    target="Tag",
    kind=SnakeRelationshipKind.TO_ONE,
    foreign_key=SnakeForeignKeyInfo(target="Tag", pairs=(("parent_id", "id"),)),
    target_table="public.tags",
)

operations = [
    RebuildTable(
        before=tags,
        after=replace(tags, relationships=(parent,)),
        triggers=(),
    ),
]
```

## Constraints e índices

### `CreateIndex`

```python
CreateIndex(table: SnakeTableInfo, index: SnakeIndexInfo) -> None
```

Creates an index on an ALREADY existing table; its reverse drops it.

It only appears when the table is already in the state: a NEW table's indexes are emitted by
`CreateTable.up_sql` itself, and duplicating them here would make the migration fail on apply.

### `DropIndex`

```python
DropIndex(table: SnakeTableInfo, index: SnakeIndexInfo) -> None
```

Drops an index; its reverse recreates it (with its original info: columns, unique, name).

### `AddCheck`

```python
AddCheck(table: SnakeTableInfo, check: SnakeCheckInfo) -> None
```

Adds a CHECK constraint to an ALREADY existing table; its reverse drops it.

A NEW table's checks are emitted by its own `CreateTable`, just as its indexes are.

### `DropCheck`

```python
DropCheck(table: SnakeTableInfo, check: SnakeCheckInfo) -> None
```

Drops a CHECK constraint; its reverse recreates it with its original condition.

### `AddForeignKey`

```python
AddForeignKey(table: SnakeTableInfo, relationship: SnakeRelationshipInfo, target: SnakeTableInfo) -> None
```

Adds an FK (at the end, after the tables are created); its reverse drops it.

### `DropForeignKey`

```python
DropForeignKey(table: SnakeTableInfo, relationship: SnakeRelationshipInfo, target: SnakeTableInfo) -> None
```

Drops an FK; its reverse recreates it (with the original target table).

## Vistas, funciones y triggers

### `CreateView`

```python
CreateView(view: SnakeTableInfo) -> None
```

Creates a view (`CREATE VIEW ... AS <def>`); its reverse drops it.

### `DropView`

```python
DropView(view: SnakeTableInfo) -> None
```

Drops a view (`DROP VIEW`); its reverse recreates it with its original definition.

### `AlterView`

```python
AlterView(old: SnakeTableInfo, new: SnakeTableInfo) -> None
```

Changes a view's definition; its reverse restores the old one.

A changed FILTER is a `CREATE OR REPLACE VIEW`. A changed PROJECTION is not: no engine's
replacement can rename an output column — measured on PostgreSQL, `cannot change name of view
column "a" to "x"` — so the view has to be dropped and made again.

That is decided by comparing the two column lists and NOT by asking the dialect what it supports,
because it is not a capability question. PostgreSQL and MySQL both declare `Cap.REPLACE_VIEW` and
both refuse this: `Cap` answers "can this engine do X", and what is being asked here is "can X
express the change". The two agreed until a view's projection moved.

### `CreateFunction`

```python
CreateFunction(definition: SnakeRoutineInfo) -> None
```

Creates (or replaces) a routine by emitting its `body`; its reverse drops it (DROP FUNCTION).

### `DropFunction`

```python
DropFunction(definition: SnakeRoutineInfo) -> None
```

Drops a routine (DROP FUNCTION); its reverse recreates it with its original `body`.

### `AlterFunction`

```python
AlterFunction(old: SnakeRoutineInfo, new: SnakeRoutineInfo) -> None
```

Changes a routine (CREATE OR REPLACE with the new `body`); its reverse restores the old one.

### `CreateTrigger`

```python
CreateTrigger(definition: SnakeTriggerInfo) -> None
```

Creates a trigger. Its inverse is dropping it.

**Functions:**

- **up_sql** – `CREATE TRIGGER ...`.
- **down_sql** – `DROP TRIGGER ...`.
- **apply_to_state** – Adds the trigger to the replayed state.

#### `up_sql`

```python
up_sql(dialect: SnakeDialect) -> list[str]
```

`CREATE TRIGGER ...`.

#### `down_sql`

```python
down_sql(dialect: SnakeDialect) -> list[str]
```

`DROP TRIGGER ...`.

#### `apply_to_state`

```python
apply_to_state(state: SchemaState) -> None
```

Adds the trigger to the replayed state.

### `DropTrigger`

```python
DropTrigger(definition: SnakeTriggerInfo) -> None
```

Drops a trigger. Its inverse is creating it again.

**Functions:**

- **up_sql** – `DROP TRIGGER ...`.
- **down_sql** – `CREATE TRIGGER ...`.
- **apply_to_state** – Removes the trigger from the replayed state.

#### `up_sql`

```python
up_sql(dialect: SnakeDialect) -> list[str]
```

`DROP TRIGGER ...`.

#### `down_sql`

```python
down_sql(dialect: SnakeDialect) -> list[str]
```

`CREATE TRIGGER ...`.

#### `apply_to_state`

```python
apply_to_state(state: SchemaState) -> None
```

Removes the trigger from the replayed state.

### `AlterTrigger`

```python
AlterTrigger(old: SnakeTriggerInfo, new: SnakeTriggerInfo) -> None
```

Replaces a trigger: it is DROPPED and created again.

With no portable `CREATE OR REPLACE TRIGGER`, it is done in two steps. The `down` recreates the
OLD one, so undoing gives back exactly the trigger that was there.

**Functions:**

- **up_sql** – Drops the old one and creates the new one.
- **down_sql** – Drops the new one and restores the old one.
- **apply_to_state** – Leaves the NEW trigger in the replayed state.

#### `up_sql`

```python
up_sql(dialect: SnakeDialect) -> list[str]
```

Drops the old one and creates the new one.

#### `down_sql`

```python
down_sql(dialect: SnakeDialect) -> list[str]
```

Drops the new one and restores the old one.

#### `apply_to_state`

```python
apply_to_state(state: SchemaState) -> None
```

Leaves the NEW trigger in the replayed state.

## Escotillas

### `RunSQL`

```python
RunSQL(up: str | tuple[str, ...], down: str | tuple[str, ...] | None = None) -> None
```

RAW data SQL: it runs `up`'s statements, and `down`'s as the reverse (or nothing).

An escape hatch: bare SQL, NOT portable between engines. It fits `SnakeOperation` (it emits SQL)
but it is a DATA migration: `apply_to_state` is a no-op (it mutates rows, not the abstract schema).

**Functions:**

- **up_sql** – `up`'s statements (raw: the dialect does not touch them).
- **down_sql** – `down`'s statements, or `[]` if no reverse was declared.
- **apply_to_state** – No-op: a data migration does not change the abstract state's tables.

#### `up_sql`

```python
up_sql(dialect: SnakeDialect) -> list[str]
```

`up`'s statements (raw: the dialect does not touch them).

#### `down_sql`

```python
down_sql(dialect: SnakeDialect) -> list[str]
```

`down`'s statements, or `[]` if no reverse was declared.

#### `apply_to_state`

```python
apply_to_state(state: SchemaState) -> None
```

No-op: a data migration does not change the abstract state's tables.

### `RunPython`

```python
RunPython(forward: Callable[[SnakeSession], None], backward: Callable[[SnakeSession], None] | None = None) -> None
```

A DATA operation running Python code with the typed ORM (a `SnakeSession`).

`forward`/`backward` receive a `SnakeSession` and migrate data with the ORM. They MUST be
module-level functions (importable), not lambdas or closures: the renderer writes them by
reference. Without `backward` the migration is not reversible and `unrun` says so plainly.

**Functions:**

- **run** – Applies the data migration: it invokes `forward` with the session.
- **unrun** – Undoes the data migration with `backward`; without it, raises `SnakeMigrationError`.
- **apply_to_state** – No-op: a data migration does not change the abstract state's tables.

#### `run`

```python
run(session: SnakeSession) -> None
```

Applies the data migration: it invokes `forward` with the session.

#### `unrun`

```python
unrun(session: SnakeSession) -> None
```

Undoes the data migration with `backward`; without it, raises `SnakeMigrationError`.

#### `apply_to_state`

```python
apply_to_state(state: SchemaState) -> None
```

No-op: a data migration does not change the abstract state's tables.

