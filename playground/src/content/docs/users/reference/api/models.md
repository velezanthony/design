# Declaring models

Everything you need to turn a Python class into a table: the decorator that
compiles it, the field specifiers that add SQL information to each column, and the descriptors that
give relationships their typed navigation.

The rule that governs all of it: **the type comes from Python**. A specifier never changes the type
nor contradicts the annotation — it only adds what SQL needs to know.

:::note[Where this text comes from]
Everything below the headings is generated from the package's own docstrings, on every build.
:::

## Model and view

A VIEW is a model whose body is a query, so it is rendered in the TARGET dialect — a compound view is written afresh per engine. Where `CREATE OR REPLACE VIEW` is not available the emitter does `DROP` + `CREATE`, which is a declared capability and not a guess.

```python
from snakeorm import (
    SnakeColumn,
    SnakeModel,
    SnakeQuery,
    SnakeView,
    snake_int,
    snake_model,
    snake_str,
    snake_view,
)

@snake_model(table="view_sales")
class Sale(SnakeModel):
    id: SnakeColumn[int] = snake_int(primary_key=True)
    seller: SnakeColumn[str] = snake_str(max_length=50)
    amount: SnakeColumn[int] = snake_int()

@snake_view(name="active_sellers", query=SnakeQuery(Sale).filter(Sale.amount > 0))
class ActiveSeller(SnakeView):
    id: SnakeColumn[int] = snake_int(primary_key=True)
    seller: SnakeColumn[str] = snake_str(max_length=50)
```

### `SnakeModel`

Model base: provides the table config at class level, TYPED.

The settings that reference columns or are documentation (table comment,
indexes, checks) are declared here and NOT in the decorator. They are annotated
as `ClassVar` so `dataclass_transform` does not mistake them for model columns.

**Attributes:**

- **aggregate** (`_AggregateNamespace`) – EMERGENCY EXIT to the annotated aggregates by dynamic name (`object`, demands a cast).

#### `aggregate`

```python
aggregate: _AggregateNamespace
```

EMERGENCY EXIT to the annotated aggregates by dynamic name (`object`, demands a cast).

Returns a per-instance namespace whose `__getattr__` gives `object` (NEVER `Any`): the checker
forces a `cast()` on you and gives you no IntelliSense. The typed road is `@snake_result`. If
the instance was not annotated, or the name does not exist, `SnakeAggregateNotLoaded` is raised.

### `SnakeView`

VIEW base: like `SnakeModel`, but it marks the model as READ-ONLY.

A database view (`@snake_view`) is queried and NAVIGATED exactly like a model, but it is NOT
written: `session.add/update/delete/...` do not accept it. The lock is one of TYPES — those
methods ask for a `SnakeModel`, and a `SnakeView` does NOT inherit from `SnakeModel`, so it does
not fit — backed by a reinforcing runtime guard in the session.

It carries its own `@dataclass_transform` (independent of `SnakeModel`'s) because it is also
INSTANTIATED: the user does not build it by hand, but the session does when HYDRATING each row of
the view. That way its generated `__init__` ends up typed just like a model's.
### `SnakeResult`

Bases: `Generic[TModel]`

Generic base of a `@snake_result` container; the parameter is the base model (the row).

A typing marker with no runtime (see the module note). `TModel` MUST match the base field
declared in the subclass (`@snake_result` verifies it).

### `SnakeRow`

Marker base for a `@snake_row`: a container of scalar rows, WITHOUT a base model.

A typing marker with no runtime: `session.call` bounds its `into` to `type[R]` with
`R: SnakeRow`, so a class that does not inherit from here is rejected IN THE CHECKER.

## Decorators

### `snake_model`

```python
snake_model(cls: type[T] | None = None, *, table: str | None = None, prefix: str | None = None, schema: str = DEFAULT_SCHEMA, database: str = 'default', discriminator_value: str | None = None, registry: SnakeRegistry = default_registry) -> Any
```

Compile the model, store its SnakeTableInfo and install the __init__ at runtime.

It is used bare (`@snake_model`) or parametric. The table name is `{prefix}_{table}`: `table=`
changes only the table (keeping the prefix), `prefix=` changes the namespace.

A `snake_discriminator()` column opens a POLYMORPHIC hierarchy: the whole family shares this
table and that column says what each row is. The children inherit it in Python and declare
their `discriminator_value=`; they do not pick a table, because there is none to pick.

```python
@snake_model(table="animals")
class Animal(SnakeModel):
    id: SnakeColumn[int] = snake_auto()
    kind: SnakeColumn[str] = snake_discriminator()

@snake_model(discriminator_value="dog")
class Dog(Animal):
    breed: SnakeColumn[str | None] = snake_str()
```

There is no `inherits=Animal`: Python inheritance ALREADY says who the base is (it avoids a
second source).

### `snake_view`

```python
snake_view(*, sql: str | None = None, query: SnakeViewBody | None = None, name: str | None = None, schema: str = DEFAULT_SCHEMA, depends_on: Sequence[type] = (), registry: SnakeRegistry = default_registry) -> Callable[[type[T]], type[T]]
```

Compile a `SnakeView` class as a READ-ONLY database VIEW.

The same TYPED columns as a model, but the node is marked `kind=SnakeTableKind.VIEW` and it
holds the SELECT (`view_definition`). Creating/editing/dropping it lives in the migrations, not
in the session. Relation navigation works in both directions as pure SQL generation: the DB
does not guarantee the FK of a view.

`depends_on` lists the OTHER `@snake_view` views that THIS one reads: the migration creates it
AFTER them (topological order) and drops it BEFORE. Only between views (a view gets created
after ALL the tables).

`registry` lets you declare it in an ISOLATED store, just like `@snake_model` and
`@snake_db_first`.

### `snake_abstract`

```python
snake_abstract(cls: type[T]) -> type[T]
```

Mark a class as an abstract BASE: it contributes columns to its children, and is no table.

Each child gets the base's columns IN ITS OWN TABLE; the base never shows up in migrations (it
is not registered). If the child redefines an attribute, the child's wins. There is no
parametric form: there is nothing to configure.

### `snake_db_first`

```python
snake_db_first(*, table: str | None = None, schema: str = DEFAULT_SCHEMA, database: str = 'default', registry: SnakeRegistry = default_registry) -> Callable[[type[T]], type[T]]
```

Declare a model that MIRRORS a table that ALREADY exists and that we do NOT govern (the
Django `managed=False`).

You query and write it like any other model, but migrations IGNORE it (`current_schema()`
excludes anything unmanaged): the source of truth of the schema is the DB, not the model.

There is NO in-place adoption: swapping `@snake_db_first` for `@snake_model` does NOT hand the
controls to the migrations; the history does not know the table and the autogen would only
emit a `CreateTable`, which against the existing table dies with `DuplicateTable`. It IS good
for TAKING the schema to ANOTHER database managed from scratch (there the `CreateTable` is
correct); the original DB is left untouched.

### `snake_table`

```python
snake_table(cls: type, reg: SnakeRegistry = default_registry) -> SnakeTableInfo
```

Return the compiled SnakeTableInfo of a @snake_model model.

### `snake_result`

```python
snake_result(cls: type[T]) -> type[T]
```

Compile the class into a typed result container and install its `__init__` (a dataclass).

The ONLY annotation that is a `@snake_model` is the base row; the rest are scalars. A scalar
`X | None` compiles to `X` (the correct declaration for SUM/AVG/MIN/MAX, NULL over zero rows;
the unwrapped type is the key of the coercion converter, and `coerce` does not touch nulls).

It fails with `SnakeModelDefinitionError` if: there are 0 or 2+ base models; it does not
inherit from `SnakeResult[Model]`; it inherits without parametrising; or the generic does not
match the base field.

### `snake_row`

```python
snake_row(cls: type[T]) -> type[T]
```

Compile the class into a typed row container and install its `__init__` (a dataclass).

A field `X | None` compiles to `X` (the key of the coercion converter; the `None` survives
because `coerce` does not touch nulls). It fails with `SnakeModelDefinitionError` if it does
not inherit from `SnakeRow`.

### `snake_function`

```python
snake_function(*, name: str, body: str, schema: str = DEFAULT_SCHEMA) -> SnakeRoutineInfo
```

Declare and register a desired routine; return its compiled `SnakeRoutineInfo`.

Registering the same `name` replaces the previous `body` (CREATE OR REPLACE semantics). Using
the returned object is optional: the source of truth is the registry, which the autodetect
consults.

### `snake_trigger`

```python
snake_trigger(*, name: str, table: str, timing: SnakeTriggerTiming, events: Sequence[SnakeTriggerEvent], body: str, schema: str = DEFAULT_SCHEMA, for_each_row: bool = True, registry: SnakeRegistry = default_registry) -> SnakeTriggerInfo
```

Declare and register a desired trigger; return its `SnakeTriggerInfo`.

`body` is raw, opaque SQL: the diff only compares it as a string. Redeclaring the same
`(table, name)` replaces the previous one; the key carries the table because in Postgres the
name of a trigger is not unique on its own.

## Descriptors

### `SnakeColumn`

```python
SnakeColumn(*, primary_key: bool = False, unique: bool = False, default: object = MISSING, default_factory: Callable[[], T] | None = None, index: bool = False, name: str | None = None, db_comment: str | None = None, type_params: SnakeTypeParams | None = None, declared_by: str | None = None, autoincrement: bool = False, is_discriminator: bool = False, server_default: SnakeServerDefault | None = None, server_default_sql: str | None = None) -> None
```

Bases: `Generic[T]`

Column descriptor.

CLASS access (`User.username`) → `SnakeExpr[T]` (an expression for queries).
INSTANCE access (`user.username`) → the stored value (`T`).
It also holds the SQL metadata the compiler will read to build the graph.

**Attributes:**

- **declared_by** – The specifier the USER wrote, for the guards' messages.
- **column_name** (`str`) – SQL name of the column: the override if one was given, otherwise the property's.
- **attr_name** (`str`) – Python attribute name (for the SQL→Python trip back when mapping rows).
- **has_default** (`bool`) – Whether the column has a default LITERAL (the one that goes to the DDL as DEFAULT).
- **has_default_factory** (`bool`) – Whether the column has a factory (a callable) that fills the value in Python.
- **has_server_default** (`bool`) – Whether the DB supplies the value: the column is excluded from `__init__` and INSERT.

#### `declared_by`

```python
declared_by = declared_by
```

The specifier the USER wrote, for the guards' messages.

It sits on the descriptor and NOT on `type_params`, which travels into the metadata
graph and is compared by equality — a field there would read as a phantom diff in
every migration. `None` means the family's own declarator is the right answer.

#### `column_name`

```python
column_name: str
```

SQL name of the column: the override if one was given, otherwise the property's.

#### `attr_name`

```python
attr_name: str
```

Python attribute name (for the SQL→Python trip back when mapping rows).

#### `has_default`

```python
has_default: bool
```

Whether the column has a default LITERAL (the one that goes to the DDL as DEFAULT).

#### `has_default_factory`

```python
has_default_factory: bool
```

Whether the column has a factory (a callable) that fills the value in Python.

#### `has_server_default`

```python
has_server_default: bool
```

Whether the DB supplies the value: the column is excluded from `__init__` and INSERT.

### `SnakeToOne`

```python
SnakeToOne(*source_columns: SnakeColumn[Any], on_delete: SnakeFkAction = SnakeFkAction.NO_ACTION, on_update: SnakeFkAction = SnakeFkAction.NO_ACTION) -> None
```

Bases: `Generic[M]`

To-one relation descriptor.

CLASS access (`House.owner`) → `type[M]` (for navigation/queries).
INSTANCE access (`house.owner`) → the related object (`M`).
It also holds the local FK columns and the referential actions for the compiler.

**Functions:**

- **local_column_names** – SQL names of the local FK columns (resolved at compile time).

#### `local_column_names`

```python
local_column_names() -> tuple[str, ...]
```

SQL names of the local FK columns (resolved at compile time).

### `SnakeToMany`

```python
SnakeToMany(fk_name: str, *, through: str | type | None = None, via: str | None = None, to: str | None = None) -> None
```

Bases: `Generic[M]`

To-many relation descriptor: the INVERSE of an FK on the child.

CLASS access (`Country.cities`) → `SnakeCollection[M]`; INSTANCE access → `list[M]`.
It holds the NAME of the child FK to reverse (`fk_name`); the linker resolves the child from
the `SnakeToMany[Child]` annotation and the FK columns from that relation.

### `SnakeCollection`

```python
SnakeCollection(parent_table: SnakeTableInfo, child_table: SnakeTableInfo, relationship: SnakeRelationshipInfo, attr_name: str, reg: SnakeRegistry) -> None
```

Bases: `Generic[M]`

COLLECTION view: what CLASS access to a to-many returns (`Nation.makers`).

A to-many changes the cardinality, so it does NOT expose the child's columns (implicit
navigation): only collection operations — `.any(...)` (a correlated EXISTS) and the scalar
aggregates `.count()/.sum_()/.avg()/.min_()/.max_()`. That way `Nation.makers.name` is a TYPE
error, not unrunnable SQL. Generic in `M` so the child's type travels into the condition.

**Functions:**

- **any** – Correlated EXISTS: does the parent have at least one child [matching `condition`]?
- **count** – Scalar `COUNT(*)` subquery over the correlated children. Comparable (`.count() > 3`).
- **sum_** – `SUM(col)` over the correlated children. The child column's type, plus `None`.
- **avg** – `AVG(col)` over the correlated children. The average is real (`float`), or NULL with no children.
- **min_** – `MIN(col)` over the correlated children. The child column's type, or NULL with no children.
- **max_** – `MAX(col)` over the correlated children. The child column's type, or NULL with no children.

**Attributes:**

- **path** (`tuple[str, ...]`) – One-hop path for `.include(...)` (select-in resolves it as a to-many).

#### `path`

```python
path: tuple[str, ...]
```

One-hop path for `.include(...)` (select-in resolves it as a to-many).

#### `any`

```python
any(condition: SnakeCondition | None = None) -> SnakeExists
```

Correlated EXISTS: does the parent have at least one child [matching `condition`]?

The condition is over the CHILD MODEL (relative paths, re-anchored at emission time). It
can navigate the child's to-one relations (`Maker.nation.name`): those JOINs are resolved
here and emitted INSIDE the EXISTS with their own alias space. See
`_resolve_exists_joins`.

#### `count`

```python
count() -> SnakeSubqueryAggregate[int]
```

Scalar `COUNT(*)` subquery over the correlated children. Comparable (`.count() > 3`).

No `| None`: a parent without children counts 0, not NULL. The only aggregate that gets
away with it; the rest carry `| None` because they aggregate zero rows. See `sum_`.

#### `sum_`

```python
sum_(column: SnakeExpr[N]) -> SnakeSubqueryAggregate[N | None]
```

`SUM(col)` over the correlated children. The child column's type, plus `None`.

The `None` is not theoretical: a parent without children aggregates zero rows, and `SUM`
of zero rows is NULL.

#### `avg`

```python
avg(column: SnakeExpr[Any]) -> SnakeSubqueryAggregate[float | None]
```

`AVG(col)` over the correlated children. The average is real (`float`), or NULL with no children.

#### `min_`

```python
min_(column: SnakeExpr[N]) -> SnakeSubqueryAggregate[N | None]
```

`MIN(col)` over the correlated children. The child column's type, or NULL with no children.

#### `max_`

```python
max_(column: SnakeExpr[N]) -> SnakeSubqueryAggregate[N | None]
```

`MAX(col)` over the correlated children. The child column's type, or NULL with no children.

## Field specifiers

### `snake_column`

```python
snake_column(*, primary_key: bool = False, unique: bool = False, default: object = MISSING, default_factory: Callable[[], Any] | None = None, index: bool = False, name: str | None = None, db_comment: str | None = None, server_default: SnakeServerDefault | None = None, server_default_sql: str | None = None, init: Literal[False] = False) -> Any
```

Declare a column WITHOUT type parameters: `bool`, `date`, `UUID`, `bytes`, `timedelta`...

The type comes from the annotation; this only adds type-agnostic SQL metadata.

There are NO type-specific knobs. `int_size`, `max_length`, `json_storage` and
`precision`/`scale` each live in the specifier of THEIR family (`snake_int`, `snake_str`,
`snake_json`, `snake_decimal`): offering them here made them autocomplete on EVERY column, and
a `max_length` on an integer is an illegal state that could be written. The type rules.

There is NO `nullable`: nullability is stated by the annotation alone
(`SnakeColumn[str | None]`); two sources would allow a type that lies.

`name` renames the SQL column. `default` is a DDL literal; `default_factory` a Python callable
that never touches the DDL. `server_default`/`server_default_sql` (a portable enum or raw SQL)
declare a SERVER value: the column is excluded from `__init__` and INSERT (RETURNING brings it
back). All the default sources are mutually exclusive.

`init` is not passed by hand: it is the `Literal[False]` signal that excludes from the
constructor the columns with `server_default` (through the overloads), just like `snake_auto`.

### `snake_auto`

```python
snake_auto(*, name: str | None = None, db_comment: str | None = None, int_size: SnakeIntSize = SnakeIntSize.BIGINT, init: Literal[False] = False) -> Any
```

Declare an autoincrementing PK: the DB generates the value.

It is excluded from the constructor (the `init: Literal[False]` is the typing signal): the id
shows up after the INSERT (RETURNING). For an explicit id, assign it as an attribute.

`int_size` fixes the width of the PK (default `BIGINT` → `BIGSERIAL`); lower it to `INTEGER` on
small catalogues.

### `snake_int`

```python
snake_int(*, size: SnakeIntSize = SnakeIntSize.BIGINT, default: object = MISSING, default_factory: Callable[[], int] | None = None, primary_key: bool = False, unique: bool = False, index: bool = False, name: str | None = None, db_comment: str | None = None, server_default: SnakeServerDefault | None = None, server_default_sql: str | None = None, init: Literal[False] = False) -> Any
```

Declare an integer column, choosing its WIDTH in the database.

    stock: SnakeColumn[int] = snake_int(size=SnakeIntSize.SMALLINT)

`size` is the only parameter specific to this family: it picks SMALLINT/INTEGER/BIGINT. The
default is `BIGINT`, the widest of the supported engines, so that Python's unbounded `int`
means the same thing in Postgres and in SQLite. For an autoincrementing PK use `snake_auto()`,
which on top of that excludes the column from the constructor.

### `snake_str`

```python
snake_str(*, max_length: int | None = None, fixed: bool = False, default: object = MISSING, default_factory: Callable[[], str] | None = None, primary_key: bool = False, unique: bool = False, index: bool = False, name: str | None = None, db_comment: str | None = None, server_default: SnakeServerDefault | None = None, server_default_sql: str | None = None, init: Literal[False] = False) -> Any
```

Declare a text column, optionally with a maximum length.

    name: SnakeColumn[str] = snake_str(max_length=50)

Without `max_length` the column is TEXT. With it Postgres emits `VARCHAR(n)`, which is not
faster than TEXT: it STATES a domain rule and the database enforces it. SQLite ignores it.

With `fixed=True` the column is `CHAR(n)`, of FIXED length. It is not a stricter VARCHAR: it
pads with spaces up to `n` and compares ignoring that padding, which is exactly what someone
storing country codes or a hash of known length wants. It demands `max_length`: a CHAR without
a length is CHAR(1) in SQL, and guessing that 1 would be deciding for whoever did not decide.

### `snake_float`

```python
snake_float(*, size: int = 8, default: object = MISSING, default_factory: Callable[[], float] | None = None, primary_key: bool = False, unique: bool = False, index: bool = False, name: str | None = None, db_comment: str | None = None, server_default: SnakeServerDefault | None = None, server_default_sql: str | None = None, init: Literal[False] = False) -> Any
```

Declare a floating-point column, optionally 4 bytes instead of 8.

    price: SnakeColumn[float] = snake_float(size=4)

The default is 8 —double precision, which is what a Python `float` IS— and it does not change:
lowering it would make an already written model silently lose precision on upgrade. With
`size=4` the column takes half the space, which on a table of millions of rows is the
difference you are after.

SQLite emits `REAL` for both: it has a single floating-point class, and its degraded capability
says so, instead of faking a precision the engine does not deliver.

### `snake_decimal`

```python
snake_decimal(*, precision: int, scale: int | None = None, default: object = MISSING, default_factory: Callable[[], Decimal] | None = None, primary_key: bool = False, unique: bool = False, index: bool = False, name: str | None = None, db_comment: str | None = None, server_default: SnakeServerDefault | None = None, server_default_sql: str | None = None, init: Literal[False] = False) -> Any
```

Declare a NUMERIC column with its precision and scale.

    price: SnakeColumn[Decimal] = snake_decimal(precision=12, scale=2)

`precision` is MANDATORY, and on purpose: a `NUMERIC` without precision accepts any number of
digits, so the rounding of money stops being declared and starts depending on whatever comes
in. Whoever wants that behaviour asks for it explicitly with `snake_column()`.

### `snake_json`

```python
snake_json(*, storage: SnakeJsonStorage = SnakeJsonStorage.JSONB, default_factory: Callable[[], dict[str, Any]] | None = None, primary_key: bool = False, unique: bool = False, index: bool = False, name: str | None = None, db_comment: str | None = None, server_default: SnakeServerDefault | None = None, server_default_sql: str | None = None, init: Literal[False] = False) -> Any
```

Declare a JSON column, choosing how the engine backs it.

    meta: SnakeColumn[dict[str, object]] = snake_json(storage=SnakeJsonStorage.JSON)

`JSONB` (the default) normalises and indexes; `JSON` preserves the exact text that came in.
SQLite collapses both to TEXT.

There is no `default`: a mutable literal shared between instances is the classic Python
defaults bug, and in the DDL a `DEFAULT '{}'` is rarely what you want. For an initial value use
`default_factory=dict`, which builds a fresh one per instance and never touches the DDL.

### `snake_enum`

```python
snake_enum(enum_type: type[E], *, storage: SnakeEnumStorage = SnakeEnumStorage.CHECK, default: E | object = MISSING, primary_key: bool = False, unique: bool = False, index: bool = False, name: str | None = None, db_comment: str | None = None) -> Any
```

Declare a column whose value is a member of a `StrEnum` or an `IntEnum`.

    status: SnakeColumn[Status] = snake_enum(Status, default=Status.ACTIVE)
    reason: SnakeColumn[Status | None] = snake_enum(Status)   # nullable by the annotation

`default=Status.ACTIVE` must be a MEMBER of the enum: passing `"active"` or `42` is rejected by
a runtime guard (the `| object` in the signature stops the checker from catching it; without
the guard, an invalid default reached the DDL silently).

No `nullable` (the annotation states nullability). `storage` picks which DB object backs the
rule (see `SnakeEnumStorage`).

### `snake_datetime`

```python
snake_datetime(*, precision: int | None = None, default_factory: Callable[[], datetime] | None = None, primary_key: bool = False, unique: bool = False, index: bool = False, name: str | None = None, db_comment: str | None = None, server_default: SnakeServerDefault | None = None, server_default_sql: str | None = None, init: Literal[False] = False) -> Any
```

Declare a `TIMESTAMP` column: it stores a WALL-CLOCK TIME, without a zone.

    opens_at: SnakeColumn[datetime] = snake_datetime()

A wall-clock time identifies no instant until somebody says which zone it belongs to: it is
what you want for opening hours or a local holiday, and what you do NOT want for a
`created_at`. That is what `snake_datetimetz()` is for.

The annotation has to be plain `datetime`, and the compiler demands it: a `SnakeUtc` here
would lose its `tzinfo` on save, silently.

`precision` is the fractional-second digits. SQLite ignores it.

There is no literal `default`: a fixed date in the DDL is almost never what you want.

### `snake_datetimetz`

```python
snake_datetimetz(*, precision: int | None = None, default_factory: Callable[[], datetime] | None = None, primary_key: bool = False, unique: bool = False, index: bool = False, name: str | None = None, db_comment: str | None = None, server_default: SnakeServerDefault | None = None, server_default_sql: str | None = None, init: Literal[False] = False) -> Any
```

Declare a `TIMESTAMPTZ` column: it stores an INSTANT, with a zone.

    occurred_at: SnakeColumn[SnakeUtc] = snake_datetimetz()

The annotation has to be `SnakeUtc`, and the compiler demands it. Each one covers what the
other cannot: the declarator says which COLUMN gets created, whereas `SnakeUtc` says which
VALUE is admitted and the checker enforces that before anything runs. The guard ties the two
together, so the redundancy cannot lie. Same treatment as `snake_enum(Status)`.

`TIMESTAMPTZ` stores the moment, NOT the offset it was written with: that is why it only
admits UTC, and to get there you have `SnakeUtc.parse()`, `.from_zone()`, `.of()` and
`.now()`.

`precision` is the fractional-second digits: `0` whole seconds, `3` milliseconds, `6` the
Postgres default (exactly the resolution of Python's `datetime`). SQLite ignores it.

There is no literal `default`: a fixed date in the DDL is almost never what you want. For
"now" use `server_default=SnakeServerDefault.NOW` or `default_factory=SnakeUtc.now`.

### `snake_time`

```python
snake_time(*, default: object = MISSING, default_factory: Callable[[], time] | None = None, primary_key: bool = False, unique: bool = False, index: bool = False, name: str | None = None, db_comment: str | None = None, server_default: SnakeServerDefault | None = None, server_default_sql: str | None = None) -> Any
```

Declare a time of day WITHOUT a zone (`TIME`).

    opens_at: SnakeColumn[time] = snake_time()

It is the time on a wall clock: nine o'clock is nine o'clock wherever it gets read. If what
you are storing is a moment of the day tied to an offset, use `snake_timetz()`.

### `snake_timetz`

```python
snake_timetz(*, default: object = MISSING, default_factory: Callable[[], time] | None = None, primary_key: bool = False, unique: bool = False, index: bool = False, name: str | None = None, db_comment: str | None = None, server_default: SnakeServerDefault | None = None, server_default_sql: str | None = None) -> Any
```

Declare a time of day WITH a zone (`TIMETZ`).

    opens_at: SnakeColumn[time] = snake_timetz()

Two declarators and not a knob, same as with the dates: the column SAYS which type it creates,
instead of it depending on whether the first value that arrived carried an offset. A plain
`TIME` throws the zone away, and an opening hour seen from somewhere else stops meaning the
same thing.

Where the engine has no `TIMETZ` (MySQL, SQLite) the column falls back to TEXT and keeps the
offset inside the ISO text — which is more than a native `TIME` would keep.

### `snake_to_one`

```python
snake_to_one(*source_columns: SnakeColumn[Any], on_delete: SnakeFkAction = SnakeFkAction.NO_ACTION, on_update: SnakeFkAction = SnakeFkAction.NO_ACTION, init: Literal[False] = False) -> Any
```

Declare a to-one relation (FK). It references the model's local FK columns.

The target comes from the `SnakeToOne[Target]` annotation; the mapping to the PK is resolved
in the linker. It is excluded from the constructor (it gets loaded with `.include(...)`): the
`init: Literal[False]` is the typing signal — without it the checker read it as "a field with
a default" and blessed a line that the runtime rejects with `TypeError`.

### `snake_to_many`

```python
snake_to_many(fk_name: str, *, init: Literal[False] = False) -> Any
```

Declare a to-many relation: the inverse of the child's FK relation `fk_name`.

The child comes out of the `SnakeToMany[Child]` annotation. It is EXCLUDED from the
constructor (you do not build it, you load it with `.include(...)`): the `init:
Literal[False]` is the signal that mypy and pyright read. It has to be a string because the
child is usually defined AFTER the parent.

### `snake_to_many_through`

```python
snake_to_many_through(*, through: str | type, via: str, to: str, init: Literal[False] = False) -> Any
```

Declare a MANY-TO-MANY that crosses a DECLARED bridge table.

    tags: SnakeToMany["Tag"] = snake_to_many_through(
        through="PostTag", via="post", to="tag"
    )

`through` is the BRIDGE model (a normal one), `via` the bridge relation pointing at THIS model
and `to` the one pointing at the target. The bridge is a real model (not an implicit
Django-style m2m): adding a column to it is just one more field. It is NAVIGATION, not writing:
linking means inserting the bridge row with `add()`.

`through` takes a NAME or the CLASS. The name is the usual way, because the bridge is normally
declared after the model that crosses it and there is no class to hand over yet. The class is
the way out when the name is ambiguous: two apps can each declare a `Tagging`, and a name is
resolved through an index kept by whichever registered LAST — the same index that produced bug
#14. With the class there is nothing to look up, so nothing to get wrong. Handing it over means
declaring the bridge first, with string annotations pointing back.

### `snake_discriminator`

```python
snake_discriminator(*, name: str | None = None, index: bool = True, db_comment: str | None = None, init: Literal[False] = False) -> Any
```

Declare the column that says WHICH CLASS each row is in a polymorphic hierarchy.

Here, and not as a parameter of the decorator: the `init: Literal[False]` excludes it from
`__init__` (the runtime fills it in by itself). Its value comes from the CLASS: each subclass
its own in `@snake_model(discriminator_value=...)`, the base its name in lowercase.

`index=True` by default because every query on a subclass carries
`WHERE <discriminator> = ...`: without an index the whole hierarchy gets scanned on each read.

## Indexes and constraints

### `SnakeIndex`

```python
SnakeIndex(*columns: SnakeColumn[Any] | SnakeExpr[Any], unique: bool = False, name: str | None = None, where: SnakeCondition | None = None, method: SnakeIndexMethod | None = None) -> None
```

Declare an index referencing the model's LOCAL columns (typed, no strings).

It holds references to the descriptors; the names get resolved at compile time, once
`__set_name__` has run. `where` (a PARTIAL index) and `method` are also declared here.

**Functions:**

- **column_names** – SQL names of the index columns, whether they come as a DESCRIPTOR or as an EXPRESSION.

#### `column_names`

```python
column_names() -> tuple[str, ...]
```

SQL names of the index columns, whether they come as a DESCRIPTOR or as an EXPRESSION.

Both cases because of the project's dual behaviour: inside the body, `name` is the raw
descriptor (its name resolved at compile time); outside, `Customer.name` is CLASS access →
`SnakeExpr`. Accepting only the descriptor left `SnakeIndex` useless outside the body,
which is exactly where a PARTIAL index gets declared.

### `SnakeIndexMethod`

Bases: `Enum`

Structure the engine builds the index with.

Agnostic values (the dialect translates). `BTREE` is the de facto default and is emitted
IMPLICITLY (no `USING`).

### `snake_indexes`

```python
snake_indexes(model: type, *indexes: SnakeIndex) -> None
```

Add indexes to an ALREADY decorated model, referencing its TYPED columns.

    snake_indexes(Customer, SnakeIndex(Customer.name, unique=True, where=Customer.closed_at.is_null()))

Same reason as `snake_checks`: a PARTIAL index needs a condition, which is built on the spot
and does not fit in the `SnakeIndexes` of the body. It re-registers the model instead of
mutating an attribute (assigning `SnakeIndexes` after the decorator never reaches the graph:
it has already compiled).

### `snake_check`

```python
snake_check(condition: SnakeCondition, *, name: str | None = None) -> SnakeCheckInfo
```

Declare a typed CHECK constraint: the condition is the same `SnakeCondition` as
`.filter()`.

It gets validated here, at declaration time, and not when generating the migration: a
condition with a subquery or an EXISTS does not fit in a CHECK, and the useful place to find
out is where you wrote it.

### `snake_checks`

```python
snake_checks(model: type, *checks: SnakeCheckInfo) -> None
```

Add CHECK constraints to an ALREADY decorated model, referencing its TYPED columns.

    snake_checks(Person, snake_check(Person.age >= 18, name="adult"))

Outside the class body (not inside it like `SnakeIndexes`) because a condition is built on the
spot and inside the body `age` is the raw descriptor, with `__set_name__` not yet run: it does
not know its name yet. Once decorated, `Person.age` is CLASS access → `SnakeExpr[int]`, which
preserves the typing.

## Linking

### `snake_link`

```python
snake_link(reg: SnakeRegistry = registry) -> None
```

Links every model: pass 1 (to-one/FK), pass 2 (to-many/inverses).

### `SnakeRegistry`

```python
SnakeRegistry() -> None
```

A class → SnakeTableInfo store (and name → SnakeRoutineInfo alongside it).

@snake_model populates it (Phase 1); the linker reads it and replaces the already-linked tables
(Phase 2). The routines from `snake_function(...)` live apart (`_routines`): they are not
models, just a DESIRED function the diff compares against.

**Functions:**

- **register** – Registers (or replaces) a model's compiled table.
- **polymorphic_map** – Every subclass of that table, indexed by its discriminator value.
- **table_of** – Returns a model's compiled table, or None if it is not registered.
- **table_by_name** – Returns the table by the model's name (to resolve relation targets).
- **model_by_name** – Returns the model's CLASS by its name (to instantiate related objects in .include()).
- **table_by_qualified** – Returns the table by its QUALIFIED name (`schema.table`), which IS unique.
- **model_by_qualified** – Returns the CLASS that owns a qualified table. Counterpart of `table_by_qualified`.
- **resolve_relationship** – Resolves a relation's target to `(table, class)`, unambiguously when ambiguity exists.
- **models** – Lists the registered models.
- **register_routine** – Registers (or replaces) a DESIRED routine declared with `snake_function(...)`.
- **routine_by_name** – Returns the desired routine by name, or None if it is not declared.
- **routines** – Lists the registered desired routines (autodetect's code-first source of truth).
- **register_trigger** – Registers (or replaces) a DESIRED trigger declared with `snake_trigger(...)`.
- **triggers** – Lists the registered desired triggers.

#### `register`

```python
register(model: type, table: SnakeTableInfo) -> None
```

Registers (or replaces) a model's compiled table.

Guard: two DIFFERENT models cannot map to the same qualified name (re-registering the SAME
model is fine, e.g. after snake_link). Exception: a polymorphic hierarchy shares a table on
purpose; it is recognised from the metadata (`is_polymorphic_child`), not from a flag, so
nobody gets to skip the guard "just this once".

#### `polymorphic_map`

```python
polymorphic_map(table: SnakeTableInfo) -> dict[str, type]
```

Every subclass of that table, indexed by its discriminator value.

The WHOLE map is returned (not one class per value) because the mapper asks for it ONCE and
resolves each row with `dict.get`; asking per row was 55% slower on the hottest path. A
value with no subclass simply is not in the map, and that is NOT an error: it is hydrated as
the base class (you lose the subclass's fields, not the row).

#### `table_of`

```python
table_of(model: type) -> SnakeTableInfo | None
```

Returns a model's compiled table, or None if it is not registered.

#### `table_by_name`

```python
table_by_name(name: str) -> SnakeTableInfo | None
```

Returns the table by the model's name (to resolve relation targets).

#### `model_by_name`

```python
model_by_name(name: str) -> type | None
```

Returns the model's CLASS by its name (to instantiate related objects in .include()).

#### `table_by_qualified`

```python
table_by_qualified(qualified: str) -> SnakeTableInfo | None
```

Returns the table by its QUALIFIED name (`schema.table`), which IS unique.

The class name is not (two apps can each have their own `Customer`, and the index keyed by
`__name__` is kept by whichever comes last). The qualified one is protected by the collision
guard in `register()`.

#### `model_by_qualified`

```python
model_by_qualified(qualified: str) -> type | None
```

Returns the CLASS that owns a qualified table. Counterpart of `table_by_qualified`.

#### `resolve_relationship`

```python
resolve_relationship(relationship: SnakeRelationshipInfo) -> tuple[SnakeTableInfo | None, type | None]
```

Resolves a relation's target to `(table, class)`, unambiguously when ambiguity exists.

It prefers the linker's qualified `target_table`; it falls back to the class name only when
there is none (a relation rebuilt from a migration, which does not carry it). Centralised
here so that fixing the wrong target is ONE change and not twelve copies.

#### `models`

```python
models() -> tuple[type, ...]
```

Lists the registered models.

#### `register_routine`

```python
register_routine(routine: SnakeRoutineInfo) -> None
```

Registers (or replaces) a DESIRED routine declared with `snake_function(...)`.

Keyed by `name`: redeclaring the same name replaces the `body`, like a `CREATE OR REPLACE`.

#### `routine_by_name`

```python
routine_by_name(name: str) -> SnakeRoutineInfo | None
```

Returns the desired routine by name, or None if it is not declared.

#### `routines`

```python
routines() -> tuple[SnakeRoutineInfo, ...]
```

Lists the registered desired routines (autodetect's code-first source of truth).

#### `register_trigger`

```python
register_trigger(trigger: SnakeTriggerInfo) -> None
```

Registers (or replaces) a DESIRED trigger declared with `snake_trigger(...)`.

Keyed by (table, name): by name alone, a trigger of the same name on another table would
stomp on it.

#### `triggers`

```python
triggers() -> tuple[SnakeTriggerInfo, ...]
```

Lists the registered desired triggers.
### `registry`

The Registry: the store of compiled models (class → SnakeTableInfo).

**Classes:**

- **SnakeRegistry** – A class → SnakeTableInfo store (and name → SnakeRoutineInfo alongside it).

**Functions:**

- **registry_of** – The registry where the model lives (the decorator put it there), or the global one.

**Attributes:**

- **registry** – The default global registry that @snake_model populates.

#### `SnakeRegistry`

```python
SnakeRegistry() -> None
```

A class → SnakeTableInfo store (and name → SnakeRoutineInfo alongside it).

@snake_model populates it (Phase 1); the linker reads it and replaces the already-linked tables
(Phase 2). The routines from `snake_function(...)` live apart (`_routines`): they are not
models, just a DESIRED function the diff compares against.

**Functions:**

- **register** – Registers (or replaces) a model's compiled table.
- **polymorphic_map** – Every subclass of that table, indexed by its discriminator value.
- **table_of** – Returns a model's compiled table, or None if it is not registered.
- **table_by_name** – Returns the table by the model's name (to resolve relation targets).
- **model_by_name** – Returns the model's CLASS by its name (to instantiate related objects in .include()).
- **table_by_qualified** – Returns the table by its QUALIFIED name (`schema.table`), which IS unique.
- **model_by_qualified** – Returns the CLASS that owns a qualified table. Counterpart of `table_by_qualified`.
- **resolve_relationship** – Resolves a relation's target to `(table, class)`, unambiguously when ambiguity exists.
- **models** – Lists the registered models.
- **register_routine** – Registers (or replaces) a DESIRED routine declared with `snake_function(...)`.
- **routine_by_name** – Returns the desired routine by name, or None if it is not declared.
- **routines** – Lists the registered desired routines (autodetect's code-first source of truth).
- **register_trigger** – Registers (or replaces) a DESIRED trigger declared with `snake_trigger(...)`.
- **triggers** – Lists the registered desired triggers.

##### `register`

```python
register(model: type, table: SnakeTableInfo) -> None
```

Registers (or replaces) a model's compiled table.

Guard: two DIFFERENT models cannot map to the same qualified name (re-registering the SAME
model is fine, e.g. after snake_link). Exception: a polymorphic hierarchy shares a table on
purpose; it is recognised from the metadata (`is_polymorphic_child`), not from a flag, so
nobody gets to skip the guard "just this once".

##### `polymorphic_map`

```python
polymorphic_map(table: SnakeTableInfo) -> dict[str, type]
```

Every subclass of that table, indexed by its discriminator value.

The WHOLE map is returned (not one class per value) because the mapper asks for it ONCE and
resolves each row with `dict.get`; asking per row was 55% slower on the hottest path. A
value with no subclass simply is not in the map, and that is NOT an error: it is hydrated as
the base class (you lose the subclass's fields, not the row).

##### `table_of`

```python
table_of(model: type) -> SnakeTableInfo | None
```

Returns a model's compiled table, or None if it is not registered.

##### `table_by_name`

```python
table_by_name(name: str) -> SnakeTableInfo | None
```

Returns the table by the model's name (to resolve relation targets).

##### `model_by_name`

```python
model_by_name(name: str) -> type | None
```

Returns the model's CLASS by its name (to instantiate related objects in .include()).

##### `table_by_qualified`

```python
table_by_qualified(qualified: str) -> SnakeTableInfo | None
```

Returns the table by its QUALIFIED name (`schema.table`), which IS unique.

The class name is not (two apps can each have their own `Customer`, and the index keyed by
`__name__` is kept by whichever comes last). The qualified one is protected by the collision
guard in `register()`.

##### `model_by_qualified`

```python
model_by_qualified(qualified: str) -> type | None
```

Returns the CLASS that owns a qualified table. Counterpart of `table_by_qualified`.

##### `resolve_relationship`

```python
resolve_relationship(relationship: SnakeRelationshipInfo) -> tuple[SnakeTableInfo | None, type | None]
```

Resolves a relation's target to `(table, class)`, unambiguously when ambiguity exists.

It prefers the linker's qualified `target_table`; it falls back to the class name only when
there is none (a relation rebuilt from a migration, which does not carry it). Centralised
here so that fixing the wrong target is ONE change and not twelve copies.

##### `models`

```python
models() -> tuple[type, ...]
```

Lists the registered models.

##### `register_routine`

```python
register_routine(routine: SnakeRoutineInfo) -> None
```

Registers (or replaces) a DESIRED routine declared with `snake_function(...)`.

Keyed by `name`: redeclaring the same name replaces the `body`, like a `CREATE OR REPLACE`.

##### `routine_by_name`

```python
routine_by_name(name: str) -> SnakeRoutineInfo | None
```

Returns the desired routine by name, or None if it is not declared.

##### `routines`

```python
routines() -> tuple[SnakeRoutineInfo, ...]
```

Lists the registered desired routines (autodetect's code-first source of truth).

##### `register_trigger`

```python
register_trigger(trigger: SnakeTriggerInfo) -> None
```

Registers (or replaces) a DESIRED trigger declared with `snake_trigger(...)`.

Keyed by (table, name): by name alone, a trigger of the same name on another table would
stomp on it.

##### `triggers`

```python
triggers() -> tuple[SnakeTriggerInfo, ...]
```

Lists the registered desired triggers.

#### `registry`

```python
registry = SnakeRegistry()
```

The default global registry that @snake_model populates.

#### `registry_of`

```python
registry_of(model: type) -> SnakeRegistry
```

The registry where the model lives (the decorator put it there), or the global one.

It is what makes `@snake_model(registry=reg)` work: everything downstream —typed navigation,
the query, the session— has to resolve against THAT registry and not the global one, or a model
in its own registry is registered and unreachable.

It lives here rather than in `fields/` because it answers a REGISTRY question, and because two
other packages were already importing the private `_registry_of` across a package boundary,
which is the shape a helper takes just before it becomes public by accident.

## Declaration enums

### `SnakeIntSize`

Bases: `StrEnum`

How many bits an `int` reserves in the database.

Python always uses an unbounded `int`; this only decides how much room the engine takes. The
members are the SQL STANDARD (which is why the `StrEnum` earns its type); the dialect
translates (SQLite collapses them all to `INTEGER`). `BIGINT` is the default on purpose: it is
the widest of both engines, so Python's uncapped `int` lines up in Postgres and SQLite. You
step it down by hand when saving bytes matters.

### `SnakeJsonStorage`

Bases: `StrEnum`

The DB object that stores a `dict`.

Members = the literal name of the type in Postgres; the dialect translates (SQLite collapses
both to TEXT).

- `JSONB` (default): binary, indexable, NORMALISES (reorders keys, drops duplicates, loses
  `100.0` vs `100`). What nearly every real case wants.
- `JSON`: stores the text as-is (not indexable, preserved bit for bit). It also makes Postgres
  line up with SQLite.

### `SnakeEnumStorage`

Bases: `Enum`

Which DB object checks that the column only ever holds valid enum members.

Engine-agnostic values (the dialect translates), like `SnakeServerDefault`/`SnakeFkAction`.

- `CHECK` (default): the base type plus a `CHECK col IN (...)`. Adding a value is reversible;
  removing one fails at `migrate` if rows are still using it.
- `PLAIN`: base type only, no validation. An invalid value slipped in through raw SQL blows up
  ON READ.

The BASE TYPE is not spelled out here, and the omission is deliberate: this class picks the DB
object that validates the column, not the SQL type, and the type is the dialect's answer to
`storage_type`. Measured on the three: `SnakeColumnInfo.__post_init__` derives a text enum's
width from its longest member, so a text-backed enum is `VARCHAR(n)` on PostgreSQL and MySQL
and `TEXT` only on SQLite, which has affinities and no widths; an int-backed one is `BIGINT` on
the first two and `INTEGER` on SQLite for the same reason.

There is no `NATIVE` on purpose: in Postgres `ADD VALUE` has no inverse (recreating the type
rewrites the table under `ACCESS EXCLUSIVE`), the value cannot be used in the same transaction
that adds it (and migrations are transactional), and if two models share the enum they share
the type. With `CHECK` none of that happens. A `NATIVE` that throws when used would be dead
metadata.

### `SnakeServerDefault`

Bases: `Enum`

Default value generated by the DATABASE when the row is inserted.

Unlike `default` (a literal in the INSERT) and `default_factory` (a client-side callable), it
OMITS the column from the INSERT so the server fills it in, and the RETURNING brings it back.
Engine-agnostic values (not SQL): the dialect translates (`dialect.server_default_sql`).

### `SnakeFkAction`

Bases: `Enum`

Referential action of an FK, valid for both ON DELETE and ON UPDATE.

Typed constants instead of magic strings. Each member's `value` is its SQL
fragment, ready for the DDL generator.

### `SnakeIntParams`

```python
SnakeIntParams(size: SnakeIntSize = SnakeIntSize.BIGINT) -> None
```

Parameters of an `int` column: how much room it takes in the database.

**Functions:**

- **accepts** – The family covers EXACTLY its type. By identity, not by inheritance: `bool` is a

**Attributes:**

- **python_type** (`type`) – The Python type this family belongs to. The compiler's guard uses it.
- **declarator** (`str`) – The name of the field specifier that declares them. It goes into the error messages, so

#### `python_type`

```python
python_type: type
```

The Python type this family belongs to. The compiler's guard uses it.

#### `accepts`

```python
accepts(python_type: object) -> bool
```

The family covers EXACTLY its type. By identity, not by inheritance: `bool` is a
subclass of `int` and accepting it would size a boolean column as an integer.

The ORIGIN is what gets compared, so `dict[str, object]` is a `dict` — which is the only
way to declare a JSON column without a bare `dict` and the `Any` it drags in. It does not
loosen the identity: `get_origin(bool)` is `None`, so `bool` still compares as itself.

#### `declarator`

```python
declarator: str
```

The name of the field specifier that declares them. It goes into the error messages, so
the warning says WHAT to write and not just what is wrong.

### `SnakeStrParams`

```python
SnakeStrParams(max_length: int | None = None, fixed: bool = False) -> None
```

Parameters of a `str` column: its maximum length, if it declares one.

The CEILING is set by each engine (Postgres and MySQL do not agree, and MySQL's even depends on
the collation); here we only head off what means nothing on any of them.

**Functions:**

- **accepts** – The family covers EXACTLY its type. By identity, not by inheritance: `bool` is a

**Attributes:**

- **fixed** (`bool`) – FIXED length (`CHAR(n)`) instead of variable (`VARCHAR(n)`).
- **python_type** (`type`) – The Python type this family belongs to. The compiler's guard uses it.
- **declarator** (`str`) – The name of the field specifier that declares them. It goes into the error messages, so

#### `fixed`

```python
fixed: bool = False
```

FIXED length (`CHAR(n)`) instead of variable (`VARCHAR(n)`).

It is not a stricter VARCHAR: `CHAR` pads with spaces up to `n` and compares ignoring that
padding. Whoever stores country codes, ISINs or a hash of known length wants it for exactly that
reason, and everybody else should not pay for it — which is why the default is still VARCHAR.

#### `python_type`

```python
python_type: type
```

The Python type this family belongs to. The compiler's guard uses it.

#### `accepts`

```python
accepts(python_type: object) -> bool
```

The family covers EXACTLY its type. By identity, not by inheritance: `bool` is a
subclass of `int` and accepting it would size a boolean column as an integer.

The ORIGIN is what gets compared, so `dict[str, object]` is a `dict` — which is the only
way to declare a JSON column without a bare `dict` and the `Any` it drags in. It does not
loosen the identity: `get_origin(bool)` is `None`, so `bool` still compares as itself.

#### `declarator`

```python
declarator: str
```

The name of the field specifier that declares them. It goes into the error messages, so
the warning says WHAT to write and not just what is wrong.

### `SnakeDecimalParams`

```python
SnakeDecimalParams(precision: int, scale: int | None = None) -> None
```

Parameters of a `Decimal` column: the NUMERIC's digits.

`precision` is mandatory: a NUMERIC without it accepts any number of digits, so rounding stops
being declared and starts depending on whatever comes in.

Only what is absurd on ANY engine is rejected here. The ceiling —1000 digits in Postgres, 65 in
MySQL— is engine knowledge and lives in its dialect, like `max_bind_params`.

On scale: Postgres 15 accepts negative scales and scales greater than the precision, as its own
extension. It is not exposed, on purpose. The standard demands `0 <= scale <= precision`, MySQL
demands it, and Postgres demanded it up to 15; opening it would make a model stop being portable
depending on the VERSION of the server behind it, which is exactly what the Dialect/Driver axis
avoids.

**Functions:**

- **accepts** – The family covers EXACTLY its type. By identity, not by inheritance: `bool` is a

**Attributes:**

- **python_type** (`type`) – The Python type this family belongs to. The compiler's guard uses it.
- **declarator** (`str`) – The name of the field specifier that declares them. It goes into the error messages, so

#### `python_type`

```python
python_type: type
```

The Python type this family belongs to. The compiler's guard uses it.

#### `accepts`

```python
accepts(python_type: object) -> bool
```

The family covers EXACTLY its type. By identity, not by inheritance: `bool` is a
subclass of `int` and accepting it would size a boolean column as an integer.

The ORIGIN is what gets compared, so `dict[str, object]` is a `dict` — which is the only
way to declare a JSON column without a bare `dict` and the `Any` it drags in. It does not
loosen the identity: `get_origin(bool)` is `None`, so `bool` still compares as itself.

#### `declarator`

```python
declarator: str
```

The name of the field specifier that declares them. It goes into the error messages, so
the warning says WHAT to write and not just what is wrong.

### `SnakeFloatParams`

```python
SnakeFloatParams(size: int = 8) -> None
```

Parameters of a `float` column: its WIDTH in bytes.

A Python `float` is double precision, so 8 is the default and it does not change: changing it
would make an already-written model lose precision silently on upgrade. Declaring 4 is a storage
decision —half the bytes per row— taken knowing what you lose.

**Functions:**

- **accepts** – The family covers EXACTLY its type, by identity and not by inheritance.

**Attributes:**

- **python_type** (`type`) – The Python type this family belongs to. The compiler's guard uses it.
- **declarator** (`str`) – The name of the field specifier that declares them, so the error says WHAT to write.

#### `python_type`

```python
python_type: type
```

The Python type this family belongs to. The compiler's guard uses it.

#### `accepts`

```python
accepts(python_type: object) -> bool
```

The family covers EXACTLY its type, by identity and not by inheritance.

#### `declarator`

```python
declarator: str
```

The name of the field specifier that declares them, so the error says WHAT to write.

### `SnakeJsonParams`

```python
SnakeJsonParams(storage: SnakeJsonStorage = SnakeJsonStorage.JSONB) -> None
```

Parameters of a `dict` column: which DB object backs it.

**Functions:**

- **accepts** – The family covers EXACTLY its type. By identity, not by inheritance: `bool` is a

**Attributes:**

- **python_type** (`type`) – The Python type this family belongs to. The compiler's guard uses it.
- **declarator** (`str`) – The name of the field specifier that declares them. It goes into the error messages, so

#### `python_type`

```python
python_type: type
```

The Python type this family belongs to. The compiler's guard uses it.

#### `accepts`

```python
accepts(python_type: object) -> bool
```

The family covers EXACTLY its type. By identity, not by inheritance: `bool` is a
subclass of `int` and accepting it would size a boolean column as an integer.

The ORIGIN is what gets compared, so `dict[str, object]` is a `dict` — which is the only
way to declare a JSON column without a bare `dict` and the `Any` it drags in. It does not
loosen the identity: `get_origin(bool)` is `None`, so `bool` still compares as itself.

#### `declarator`

```python
declarator: str
```

The name of the field specifier that declares them. It goes into the error messages, so
the warning says WHAT to write and not just what is wrong.

### `SnakeDateTimeParams`

```python
SnakeDateTimeParams(tz: bool = False, precision: int | None = None) -> None
```

Parameters of a date column: whether the column carries a zone, and its resolution.

`tz` is NOT a knob you pick by hand: the declarator sets it (`snake_datetimetz()` sets it to
`True`, `snake_datetime()` to `False`) and a compiler guard demands it match the annotation.
That way the MODEL says which column gets created —just as `snake_int(size=SMALLINT)` says
SMALLINT— without the redundancy being able to lie. Same treatment as `snake_enum(Status)` over
a `SnakeColumn[Status]`.

`precision` is the fractional-second digits: `0` whole seconds, `3` milliseconds, `6` the
Postgres default (exactly the resolution of Python's `datetime`).

Only what means nothing on ANY engine is rejected here —a negative digit count—. The CEILING is
set by each dialect: Postgres and MySQL stop at 6, SQL Server reaches 7 and Oracle 9, so pinning
it here would put a specific engine inside the model, and the project's golden rule is that the
metadata graph stays agnostic.

**Functions:**

- **accepts** – The family covers `datetime` AND `SnakeUtc`, which is a subclass of it.

**Attributes:**

- **python_type** (`type`) – The Python type this family belongs to. The compiler's guard uses it.
- **declarator** (`str`) – The name of the field specifier that declares them. It goes into the error messages, so

#### `python_type`

```python
python_type: type
```

The Python type this family belongs to. The compiler's guard uses it.

#### `accepts`

```python
accepts(python_type: object) -> bool
```

The family covers `datetime` AND `SnakeUtc`, which is a subclass of it.

The other families compare by identity; this one cannot, because `SnakeUtc` is the same data
type with a guarantee on top.

#### `declarator`

```python
declarator: str
```

The name of the field specifier that declares them. It goes into the error messages, so
the warning says WHAT to write and not just what is wrong.

### `SnakeTimeParams`

```python
SnakeTimeParams(with_timezone: bool = False) -> None
```

Parameters of a `time` column: whether it carries a ZONE.

Two declarators, as with dates (`snake_datetime` / `snake_datetimetz`), and for the same reason:
the column SAYS which type it creates instead of it depending on whether the first value that
arrived carried an offset. A bare `TIME` throws the zone away, and an opening time stops meaning
the same thing when seen from somewhere else.

**Functions:**

- **accepts** – The family covers EXACTLY its type, by identity and not by inheritance.

**Attributes:**

- **python_type** (`type`) – The Python type this family belongs to. The compiler's guard uses it.
- **declarator** (`str`) – The name of the field specifier that declares them, so the error says WHAT to write.

#### `python_type`

```python
python_type: type
```

The Python type this family belongs to. The compiler's guard uses it.

#### `accepts`

```python
accepts(python_type: object) -> bool
```

The family covers EXACTLY its type, by identity and not by inheritance.

#### `declarator`

```python
declarator: str
```

The name of the field specifier that declares them, so the error says WHAT to write.

## Compiled metadata

The graph the compiler builds once and every other piece reads. You do not write these by hand, but
they are public because a migration, a check or a trigger you inspect at runtime hands them to you.

### `SnakeRelationshipKind`

Bases: `Enum`

Cardinality of a relationship. An enum, not a `Literal[...]` of strings, on purpose.

A `Literal` protects assignment but NOT comparison, and every use of the field is a comparison
(`rel.kind == "to_onee"` compiles clean in both checkers and switches off a branch without
warning: a JOIN that never gets emitted, an FK that never gets created). The enum makes the typo
unwritable. Same decision as `SnakeTableKind`.

- `TO_ONE`: FK. This model points to ONE on the other side.
- `TO_MANY`: the inverse. N on the other side point here.
- `TO_MANY_THROUGH`: many-to-many via a DECLARED bridge model.

**Functions:**

- **coerce** – Accepts the enum, or the string carried by already-generated history.

#### `coerce`

```python
coerce(value: object) -> SnakeRelationshipKind
```

Accepts the enum, or the string carried by already-generated history.

Old migrations carry the literal string (`"to_one"`) and are immutable; without converting,
`is` comparisons would return `False` (the very silent failure the enum came to kill off).
An unknown value blows up HERE, not twelve branches later.

### `SnakeThroughInfo`

```python
SnakeThroughInfo(table: str, to_parent: tuple[tuple[str, str], ...], to_target: tuple[tuple[str, str], ...]) -> None
```

The BRIDGE of a many-to-many: its table and both hops, already resolved.

`to_parent`/`to_target` are `(bridge_column, endpoint_column)` pairs, resolved by the linker and
not by name (bug #14: resolving by class name sent the FK to a different table with the same
name). A composite FK fits with no special case: tuples of pairs, as in `SnakeForeignKeyInfo`.

**Attributes:**

- **table** (`str`) – The bridge's table, QUALIFIED (`schema.table`).

#### `table`

```python
table: str
```

The bridge's table, QUALIFIED (`schema.table`).

### `SnakeCheckInfo`

```python
SnakeCheckInfo(condition: SnakeCondition, name: str | None = None) -> None
```

A `CHECK (...)` rule over the table's columns.

It stores the `SnakeCondition` as an AST, not as emitted SQL: that keeps the metadata
engine-agnostic (the dialect supplies quoting and syntax) and the condition is the SAME one
`.filter()` takes, so it is validated at type-check time (`User.age >= 18` stops compiling if
you rename `age`).

**Functions:**

- **resolved_name** – The name the DB knows the constraint by: the explicit one, or `ck_{table}_{columns}`.

#### `resolved_name`

```python
resolved_name(table_name: str) -> str
```

The name the DB knows the constraint by: the explicit one, or `ck_{table}_{columns}`.

Creation, removal and diff must agree on the name or you create duplicates and drop things
that do not exist. The columns come from the condition, deduplicated (`age > 0 AND
age < 150` -> `ck_users_age`).

### `SnakeTriggerInfo`

```python
SnakeTriggerInfo(name: str, table: str, timing: SnakeTriggerTiming, events: tuple[SnakeTriggerEvent, ...], body: str, schema: str = DEFAULT_SCHEMA, for_each_row: bool = True) -> None
```

A trigger on a table: when, on what, and what it runs.

`body` is raw and opaque (`EXECUTE FUNCTION audit()`), as in `SnakeRoutineInfo`: the diff only
compares the string (typing PL/pgSQL would mean putting a whole language inside the ORM).
`for_each_row` tells a per-ROW trigger apart from a per-STATEMENT one; per row by default
(required for `NEW`/`OLD`).

### `SnakeTriggerEvent`

Bases: `Enum`

Which operation fires it.

### `SnakeTriggerTiming`

Bases: `Enum`

When it fires relative to the operation. Engine-agnostic: all three are standard SQL.
