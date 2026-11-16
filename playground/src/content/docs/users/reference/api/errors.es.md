# Errores y avisos

Este ORM **grita**: no arregla por su cuenta ni degrada en silencio. Cada
excepción de aquí abajo marca una decisión que tiene que tomar alguien, y su mensaje dice qué
escribir en su lugar — no solo qué ha ido mal.

`SnakeWarning` es un `UserWarning` propio para que
`filterwarnings("ignore", category=SnakeWarning)` silencie el ORM y nada más.

:::note[De dónde sale este texto]
Todo lo que hay bajo los títulos se genera desde los docstrings del propio paquete, en cada
build.
:::

## Base

### `SnakeError`

Bases: `Exception`

Root of every SnakeORM error.

## Declaración

### `SnakeModelError`

Bases: `SnakeError`, `TypeError`

Something without `@snake_model` was passed as a model: the type is inappropriate.

### `SnakeModelDefinitionError`

Bases: `SnakeError`, `ValueError`

The model carries `@snake_model` but is declared wrong (with no PK, for instance).

It is a valid class with invalid content: hence `ValueError` and not `TypeError`.

### `SnakeRegistryError`

Bases: `SnakeError`, `ValueError`

Trouble in the registry: unregistered model or table collision.

### `SnakeDtoError`

Bases: `SnakeError`, `ValueError`

A generated DTO cannot be honoured: its declaration is contradictory, it names a column the
model does not have, or the file it has to be written into holds something the generator does
not manage. It is raised at DECLARATION time whenever it can be, so the mistake dies where it
was written and never becomes a body that quietly lost a column.

### `SnakeUnknownColumn`

Bases: `SnakeError`, `ValueError`

A column the table does not declare was named.

### `SnakeUnknownRelationship`

Bases: `SnakeError`, `ValueError`

A relation the table does not declare was named.

### `SnakeUnlinkedRelationship`

Bases: `SnakeError`, `RuntimeError`

A relation was used before calling `snake_link()`.

## Ejecución

### `SnakeValueError`

Bases: `SnakeError`, `ValueError`

A value does not fit its declared column (e.g. a `Decimal` with more decimals than the
`scale`). Raised on WRITE, before touching the DB, so the engine does not round it or store it
half-way silently.

### `SnakeEmitError`

Bases: `SnakeError`, `ValueError`

Valid SQL cannot be emitted from what was given (an INSERT with no columns...).
### `SnakeNodeError`

Bases: `SnakeError`, `TypeError`

The emitter received an AST node it does not know how to translate into SQL.

### `SnakeRelationshipNotLoaded`

Bases: `SnakeError`, `AttributeError`

A relation the query did not load was accessed (the anti-N+1 lock).

### `SnakeAggregateNotLoaded`

Bases: `SnakeError`, `AttributeError`

An aggregate asked for through the escape hatch (`obj.aggregate.x`) was not loaded (a missing
`annotate`, or a missing name).

### `SnakeColumnNotLoaded`

Bases: `SnakeError`, `AttributeError`

A column left out by `only()`/`defer()` was read on the instance.

The sibling of `SnakeRelationshipNotLoaded`, and it exists for the same reason: the alternative
is the descriptor falling through to the column's DEFAULT, which hands back `None` or `0` for a
value nobody loaded. A wrong answer with no error is the one outcome this ORM does not produce.

### `SnakeUnsupportedFeature`

Bases: `SnakeError`, `ValueError`

The combination asked for exists in the design but is not built yet.

## Restricciones

Una restricción que rechaza una escritura lanza la MISMA excepción en los tres motores. Cada una se clasifica por el código que manda el motor —un SQLSTATE, un errno de MySQL o un nombre de resultado extendido de SQLite—, nunca por el mensaje y nunca por la clase de excepción del driver: en MySQL un `CHECK` llega como `OperationalError` y los otros tres como `IntegrityError`.

La excepción del driver va encadenada, no escondida. Se queda en `__cause__` y, dicha por su nombre, en `driver_error`; `code` dice qué código decidió el subtipo.

```python
from snakeorm import SnakeIntegrityError, SnakeUniqueViolation

try:
    session.add(User(email="taken@example.com"))
    session.commit()
except SnakeUniqueViolation as refused:
    # the same exception on PostgreSQL, MySQL and SQLite
    print(refused.code)          # "23505" | 1062 | "SQLITE_CONSTRAINT_UNIQUE"
    print(refused.driver_error)  # the DBAPI's own, also in __cause__
except SnakeIntegrityError:
    # the coarse catch: any constraint at all
    session.rollback()
```

### `SnakeIntegrityError`

```python
SnakeIntegrityError(message: str, *, driver_error: BaseException | None = None, code: str | int | None = None) -> None
```

Bases: `SnakeError`

A constraint refused the write. ONE exception where the three drivers raised three.

A duplicate key came back as `psycopg2.errors.UniqueViolation`, `pymysql.err.IntegrityError` and
`sqlite3.IntegrityError`, so the `except` handling it was the one part of an application that
could not be moved between engines.

The driver's exception is CHAINED, never swallowed: it stays in `__cause__` and the traceback
prints both. Whoever catches gets a portable name, whoever debugs still gets the server's own
words.

Catch this one to be coarse, or a subtype below to be precise. Every engine says which
constraint broke, so the subtype is read off a CODE and never off the message: reading text is
how a detector fails open.

It KEEPS what it was built from, in `driver_error` and `code`, so the classification is testable
without an engine — checking that MariaDB's 4025 lands in `SnakeCheckViolation` needs no
MariaDB, while `__cause__` proves the chaining and says nothing about the DECISION. The engine
tests then check the other half, that the engine really does send that code.

**Attributes:**

- **driver_error** – The exception the DBAPI raised, kept whole. Also reachable as `__cause__`.
- **code** – The engine's own code that decided the subtype: a SQLSTATE, a MySQL errno or an SQLite

#### `driver_error`

```python
driver_error = driver_error
```

The exception the DBAPI raised, kept whole. Also reachable as `__cause__`.

#### `code`

```python
code = code
```

The engine's own code that decided the subtype: a SQLSTATE, a MySQL errno or an SQLite
extended-result name. What was READ, not what was guessed — so a wrong classification can be
argued with rather than re-derived.

### `SnakeUniqueViolation`

Bases: `SnakeIntegrityError`

A UNIQUE constraint or a primary key already holds that value.

**Attributes:**

- **driver_error** – The exception the DBAPI raised, kept whole. Also reachable as `__cause__`.
- **code** – The engine's own code that decided the subtype: a SQLSTATE, a MySQL errno or an SQLite

### `SnakeForeignKeyViolation`

Bases: `SnakeIntegrityError`

A foreign key points at a row that is not there, or a referenced row was removed.

**Attributes:**

- **driver_error** – The exception the DBAPI raised, kept whole. Also reachable as `__cause__`.
- **code** – The engine's own code that decided the subtype: a SQLSTATE, a MySQL errno or an SQLite

### `SnakeNotNullViolation`

Bases: `SnakeIntegrityError`

A NOT NULL column was given nothing.

Rare from a typed model —`SnakeColumn[int]` refuses a `None` long before any driver sees it— and
that is exactly why it is here: it arrives from what the type system does not cover, such as raw
SQL or a column a migration added.

**Attributes:**

- **driver_error** – The exception the DBAPI raised, kept whole. Also reachable as `__cause__`.
- **code** – The engine's own code that decided the subtype: a SQLSTATE, a MySQL errno or an SQLite

### `SnakeCheckViolation`

Bases: `SnakeIntegrityError`

A CHECK constraint said no.

The one that proves the classification cannot key on the driver's exception CLASS: MySQL raises
`OperationalError` for this and `IntegrityError` for the other three.

**Attributes:**

- **driver_error** – The exception the DBAPI raised, kept whole. Also reachable as `__cause__`.
- **code** – The engine's own code that decided the subtype: a SQLSTATE, a MySQL errno or an SQLite

## Motor y migraciones

### `SnakeDialectError`

Bases: `SnakeError`, `ValueError`

The dialect does not know how to translate something (a Python type, a SQL literal).

### `SnakeMigrationError`

Bases: `SnakeError`, `ValueError`

Trouble with the migration history on disk: duplicated numbering, gaps, a file that does not
expose `migration`, or a migration that fails while being applied without transactional DDL
(leaving the DB half done).

### `SnakeConfigError`

Bases: `SnakeError`, `ValueError`

Configuration is missing to operate (e.g. there is no way to determine the DSN).

### `SnakePoolTimeout`

Bases: `SnakeError`, `TimeoutError`

The pool could not hand over a healthy connection within the deadline.

It has a name of its own because the engine's raw error ("connection pool exhausted") does not
tell apart two situations that call for opposite actions: "there is no slot right now" (wait, or
raise the pool size) and "I have spent thirty seconds failing to get a live one" (the database
is down). It inherits from `TimeoutError` so a generic retry treats it as what it is.

## Avisos

### `SnakeWarning`

Bases: `UserWarning`

An ORM warning that does not stop you, but is worth seeing: a bulk write that fires no
signals, or an engine with less fidelity than another. It inherits from `UserWarning` so that
`filterwarnings("ignore", category=SnakeWarning)` silences ONLY the ORM's.

