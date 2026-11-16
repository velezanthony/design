# Building queries

A query is a **value**: it does not execute, it has no connection, and every
method returns a new one. That is what lets the same query be run by the synchronous session or the
asynchronous one without knowing which — and what makes stacking fragments work without any extra
machinery.

Comparing a column does not give you a `bool`. `User.age > 18` is a `SnakeCondition`, and that is
the whole trick behind typed deep navigation.

:::note[Where this text comes from]
Everything below the headings is generated from the package's own docstrings, on every build.
:::

## Queries

### `SnakeQuery`

```python
SnakeQuery(model: type[T], *, registry: SnakeRegistry | None = None) -> None
```

Bases: `Generic[T]`

Typed query over a model. Immutable: every method returns a new query.

**Functions:**

- **filter** – Adds conditions (AND). Returns a NEW query; the current one is untouched.
- **order_by** – Adds ordering keys. A bare column orders ascending.
- **limit** – Sets the LIMIT (it replaces the previous one). Returns a new query.
- **offset** – Sets the OFFSET (it replaces the previous one). Returns a new query.
- **group_by** – Groups by the given columns. Returns a NEW query; the current one is untouched.
- **having** – Filters over the groups (cumulative with AND, just like `.filter()`).
- **distinct** – Marks the query as `SELECT DISTINCT`. Returns a new query.
- **only** – Brings ONLY these columns (plus the primary key). Returns a new query.
- **defer** – Brings everything EXCEPT these columns. Returns a new query.
- **for_update** – Locks the selected rows until the end of the transaction (`SELECT ... FOR UPDATE`).
- **join** – EXPLICITLY joins a collection (to-many) to get THE CHILD'S ROWS into the projection.
- **as_scalar** – Wraps the query as a scalar subquery of ONE column, for `.in_(...)`.
- **include** – Asks for relationships to be loaded (eagerly). Returns a new query.
- **prefetches** – Nested prefetch chains (deep to-many); the session resolves them level by level.
- **to_one_includes** – Includes that are to-one chains (loaded with a JOIN in the same query).
- **to_many_includes** – To-many relationships to load (resolved with a separate select-in, in the session).
- **include_segments** – Segments to load in order: root + each relationship prefix (parent before child).
- **to_include_sql** – Compiles the SELECT that loads the root + the included relationships (with their LEFT JOINs).
- **union** – `UNION`: the rows of both, WITHOUT duplicates.
- **union_all** – `UNION ALL`: the rows of both, KEEPING duplicates.
- **except_** – `EXCEPT`: the ones of this query that are NOT in the other. Trailing underscore: `except` is a reserved word.
- **intersect** – `INTERSECT`: only the rows that are in BOTH queries.
- **recursive** – Expands this query by following a hop onto ITSELF (`WITH RECURSIVE`).
- **to_sql** – Compiles the query to `(sql, params)`, generating JOINs if there is deep navigation.
- **to_count_sql** – Compiles a `SELECT COUNT(*)` with the same filters/JOINs (it ignores order and limit).
- **to_exists_sql** – Compiles a `SELECT EXISTS(...)` with the same filters/JOINs.
- **to_update_sql** – Compiles a BULK UPDATE with the query's WHERE (EXECUTION lives in the session).
- **to_delete_sql** – Compiles a BULK DELETE with the query's WHERE (EXECUTION lives in the session).
- **to_project_sql** – Compiles a `SELECT <columns>` (projection) with filters, GROUP BY/HAVING and their JOINs.
- **to_annotate_sql** – Compiles the SELECT of `annotate()`: base model columns + aggregates, grouping by the PK.

**Attributes:**

- **projected_columns** (`frozenset[str] | None`) – The columns `only()`/`defer()` asked for, or `None` for every one of them.
- **model** (`type[T]`) – The model being queried. The session uses it to map the rows back to T.
- **registry** (`SnakeRegistry`) – The registry this query resolves against: the model's own unless one was passed.
- **has_includes** (`bool`) – Tells whether the query asks for relationships to be loaded (it picks the session's route).
- **has_lock** (`bool`) – Tells whether the query asks for rows to be locked (`for_update`). The compound looks at this.
- **has_bounds** (`bool`) – Tells whether the query carries `limit`/`offset` of its own. The compound looks at this.
- **has_order** (`bool`) – Tells whether the query carries `order_by` of its own. The compound looks at this.
- **has_cte** (`bool`) – Whether the emitted SQL opens with a `WITH`. A plain query never does.

The query and the REGISTRY it resolves against, which is the model's unless told otherwise.

It used to ask the global registry unconditionally, so `@snake_model(registry=reg)`
produced a model that could not be queried — and said so with a message that MISDIRECTED:
"is it missing @snake_model?", with the decorator right there. The answer was one `getattr`
away the whole time.

`registry=` is for the case where the model itself does not say: a `SnakeRow`, or a query
built before the decorator ran. Otherwise the model's own answer wins, which is what makes
navigation, the session and the emitter agree without anybody threading it through.

#### `projected_columns`

```python
projected_columns: frozenset[str] | None
```

The columns `only()`/`defer()` asked for, or `None` for every one of them.

The session asks for this rather than counting the row's width: two columns of one table can
be projected two ways, and lining a plan up by counting is how a value lands on the wrong
attribute without anybody noticing.

#### `model`

```python
model: type[T]
```

The model being queried. The session uses it to map the rows back to T.

#### `filter`

```python
filter(*conditions: SnakeCondition) -> SnakeQuery[T]
```

Adds conditions (AND). Returns a NEW query; the current one is untouched.

#### `registry`

```python
registry: SnakeRegistry
```

The registry this query resolves against: the model's own unless one was passed.

Public because the SESSION has to ask it. Reaching for the global registry there is the same
defect one layer up: it works until two models share a class name, or until somebody uses
`@snake_model(registry=...)`, and then it is wrong in silence.

#### `order_by`

```python
order_by(*keys: SnakeExpr[Any] | SnakeOrder) -> SnakeQuery[T]
```

Adds ordering keys. A bare column orders ascending.

#### `limit`

```python
limit(limit: int) -> SnakeQuery[T]
```

Sets the LIMIT (it replaces the previous one). Returns a new query.

#### `offset`

```python
offset(offset: int) -> SnakeQuery[T]
```

Sets the OFFSET (it replaces the previous one). Returns a new query.

#### `group_by`

```python
group_by(*columns: SnakeValue[Any]) -> SnakeQuery[T]
```

Groups by the given columns. Returns a NEW query; the current one is untouched.

#### `having`

```python
having(condition: SnakeCondition) -> SnakeQuery[T]
```

Filters over the groups (cumulative with AND, just like `.filter()`).

#### `distinct`

```python
distinct() -> SnakeQuery[T]
```

Marks the query as `SELECT DISTINCT`. Returns a new query.

It applies to the full SELECT and to the projection. Standard `DISTINCT` only (no `DISTINCT ON`).

#### `only`

```python
only(*columns: SnakeValue[Any]) -> SnakeQuery[T]
```

Brings ONLY these columns (plus the primary key). Returns a new query.

What it buys is bytes on a wide table; what it costs is an instance that is not whole, and
reading a column left out RAISES rather than handing back the column's default. That refusal
is the feature: without it a deferred name reads as `None` and the caller never learns.

The PRIMARY KEY comes back whether it was named or not, and that is not a convenience. An
instance with no identity cannot be updated, deleted, or matched to the children of a
prefetch — it would be a tuple with methods.

When what you want is the VALUES rather than the model, `session.select(query, a, b)` is the
better tool: typed tuples, no half-built instance, and nothing that can raise later.

#### `defer`

```python
defer(*columns: SnakeValue[Any]) -> SnakeQuery[T]
```

Brings everything EXCEPT these columns. Returns a new query.

The other side of `only()`, and the same warning applies to what comes back. Deferring the
primary key is refused: see `only()`.

#### `for_update`

```python
for_update(*, nowait: bool = False, skip_locked: bool = False) -> SnakeQuery[T]
```

Locks the selected rows until the end of the transaction (`SELECT ... FOR UPDATE`).

It is HALF of concurrency control (the other half is the isolation level). `nowait` fails if
the row is already locked; `skip_locked` ignores it (the queue pattern): they are opposites,
asking for both is an error.

#### `join`

```python
join(collection: SnakeCollection[M], how: SnakeJoin = SnakeJoin.INNER) -> SnakeJoinedQuery[T, M]
```

EXPLICITLY joins a collection (to-many) to get THE CHILD'S ROWS into the projection.

It returns a `SnakeJoinedQuery`, a different type that only projects: a JOIN onto a
collection multiplies rows (a disaster for models), so it has no `.all()`/`.first()`. `how`
chooses whether childless parents show up.

#### `as_scalar`

```python
as_scalar(column: SnakeExpr[V]) -> SnakeSubquery[V]
```

Wraps the query as a scalar subquery of ONE column, for `.in_(...)`.

DIRECT column and flat WHERE only: navigating a relationship would demand a JOIN inside the
subquery, which is not built yet, so it gets rejected in plain words.

#### `include`

```python
include(*relations: type[Any] | SnakeCollection[Any] | SnakePrefetch[Any]) -> SnakeQuery[T]
```

Asks for relationships to be loaded (eagerly). Returns a new query.

To-one (`User.car`, proxies carrying a path) -> LEFT JOIN; to-many (`SnakeCollection`) ->
select-in. To nest to-many you pass a `SnakePrefetch(...).then(...)` (the collection does not
expose the child's relationships). Without `.include()`, touching the relationship blows up
with `SnakeRelationshipNotLoaded` (there is no silent N+1).

#### `has_includes`

```python
has_includes: bool
```

Tells whether the query asks for relationships to be loaded (it picks the session's route).

#### `has_lock`

```python
has_lock: bool
```

Tells whether the query asks for rows to be locked (`for_update`). The compound looks at this.

#### `has_bounds`

```python
has_bounds: bool
```

Tells whether the query carries `limit`/`offset` of its own. The compound looks at this.

#### `has_order`

```python
has_order: bool
```

Tells whether the query carries `order_by` of its own. The compound looks at this.

The same question as `has_bounds` and for the same reason: both need the branch's
parentheses to stay inside the branch, and only one of the two was being asked.

#### `has_cte`

```python
has_cte: bool
```

Whether the emitted SQL opens with a `WITH`. A plain query never does.

#### `prefetches`

```python
prefetches() -> tuple[SnakePrefetch[Any], ...]
```

Nested prefetch chains (deep to-many); the session resolves them level by level.

#### `to_one_includes`

```python
to_one_includes() -> tuple[tuple[str, ...], ...]
```

Includes that are to-one chains (loaded with a JOIN in the same query).

#### `to_many_includes`

```python
to_many_includes() -> tuple[SnakeRelationshipInfo, ...]
```

To-many relationships to load (resolved with a separate select-in, in the session).

#### `include_segments`

```python
include_segments() -> tuple[IncludeSegment, ...]
```

Segments to load in order: root + each relationship prefix (parent before child).

Each segment is `(prefix, model, table)`. It includes ALL the prefixes
(`.include(User.car.brand)` also loads `car`, so brand can be nested inside car).

#### `to_include_sql`

```python
to_include_sql(dialect: SnakeDialect) -> tuple[str, tuple[object, ...]]
```

Compiles the SELECT that loads the root + the included relationships (with their LEFT JOINs).

#### `union`

```python
union(other: SnakeCompoundBranch[T]) -> SnakeCompound[T]
```

`UNION`: the rows of both, WITHOUT duplicates.

The type demands the SAME model, a guarantee SQL does not give (it is happy if the columns line up).

#### `union_all`

```python
union_all(other: SnakeCompoundBranch[T]) -> SnakeCompound[T]
```

`UNION ALL`: the rows of both, KEEPING duplicates.

It is not an optimised `UNION`: a plain `UNION` deduplicates the whole result. Both exist so
the choice is made consciously.

#### `except_`

```python
except_(other: SnakeCompoundBranch[T]) -> SnakeCompound[T]
```

`EXCEPT`: the ones of this query that are NOT in the other. Trailing underscore: `except` is a reserved word.

#### `intersect`

```python
intersect(other: SnakeCompoundBranch[T]) -> SnakeCompound[T]
```

`INTERSECT`: only the rows that are in BOTH queries.

#### `recursive`

```python
recursive(*, on: tuple[SnakeExpr[Any], SnakeExpr[Any]], distinct: bool = False) -> SnakeRecursive[T]
```

Expands this query by following a hop onto ITSELF (`WITH RECURSIVE`).

This query is the ANCHOR and `on` is the pair of columns that chains each level: first the
one pointing upwards, then the one identifying the row reached. Swapping it walks the
ANCESTORS (perfectly legitimate).

    SnakeQuery(Category).filter(Category.id == 1).recursive(on=(Category.parent_id, Category.id))

`distinct` picks the operator joining each step: `False` (default) emits `UNION ALL`, what a
TREE wants; `True` emits `UNION`, so each step drops the rows already seen.

**Pass `distinct=True` if the data may have CYCLES**, which only the caller knows — a
self-referencing FK admits one. With `UNION ALL` a cyclic walk never ends: every lap yields
rows the engine counts as new, so it hangs instead of failing. `limit()` is NOT a
substitute — it bounds what comes back, not the walk. Measured on Postgres, a cyclic walk
with `order_by()` and `LIMIT 3` never returns.

#### `to_sql`

```python
to_sql(dialect: SnakeDialect) -> tuple[str, tuple[object, ...]]
```

Compiles the query to `(sql, params)`, generating JOINs if there is deep navigation.

#### `to_count_sql`

```python
to_count_sql(dialect: SnakeDialect) -> tuple[str, tuple[object, ...]]
```

Compiles a `SELECT COUNT(*)` with the same filters/JOINs (it ignores order and limit).

#### `to_exists_sql`

```python
to_exists_sql(dialect: SnakeDialect) -> tuple[str, tuple[object, ...]]
```

Compiles a `SELECT EXISTS(...)` with the same filters/JOINs.

IT GUARDS THE SAME KNOBS AS THE COUNT, and it did not until this line was written. `exists`
was the one read path that called no guard at all, so it swallowed `group_by`, `having`,
`distinct` and `lock` in silence — an EXISTS over groups is a different question from an
EXISTS over rows, and the caller who asked got the second one with no word about it.

It is the same shape as entry #18 of the bug journal, which is about `count()` being fixed
and its two brothers being left. This is the third brother, found by adding a tenth knob and
noticing that one path did not refuse it.

What it honours is what a COUNT honours, for the same reasons: order, limit and offset do not
change whether a row exists, and the includes are resolved afterwards by the session.

#### `to_update_sql`

```python
to_update_sql(dialect: SnakeDialect, values: Mapping[str, object]) -> tuple[str, tuple[object, ...]]
```

Compiles a BULK UPDATE with the query's WHERE (EXECUTION lives in the session).

The values arrive already as SQL column names. If the WHERE navigates a relationship it is
rewritten to `<pk> IN (subquery)` (no `UPDATE ... FROM`). The guards are put in place by
`_guard_bulk_write`.

#### `to_delete_sql`

```python
to_delete_sql(dialect: SnakeDialect) -> tuple[str, tuple[object, ...]]
```

Compiles a BULK DELETE with the query's WHERE (EXECUTION lives in the session).

Like `to_update_sql`: a WHERE that navigates is rewritten to `<pk> IN (subquery)` (no `DELETE ... FROM`).

#### `to_project_sql`

```python
to_project_sql(dialect: SnakeDialect, columns: Sequence[SnakeValue[Any]], explicit_joins: Sequence[tuple[tuple[str, ...], bool]] = ()) -> tuple[str, tuple[object, ...]]
```

Compiles a `SELECT <columns>` (projection) with filters, GROUP BY/HAVING and their JOINs.

The paths of columns, WHERE, GROUP BY and HAVING all go into the `JoinPlan` (that is how a
`group_by(Truck.maker.name)` generates its JOIN); `paths()` of a `COUNT(*)` is empty.
`explicit_joins` are the `.join()`s onto collections: if there are any, the plan is ALWAYS
built (the JOIN already demands aliases).

#### `to_annotate_sql`

```python
to_annotate_sql(dialect: SnakeDialect, aggregates: Sequence[SnakeValue[Any]]) -> tuple[str, tuple[object, ...]]
```

Compiles the SELECT of `annotate()`: base model columns + aggregates, grouping by the PK.

The remaining columns depend functionally on the PK (Postgres accepts that). An explicit
`group_by` is an error: to group by something else there is `select()` + `group_by()`.

### `SnakeJoinedQuery`

```python
SnakeJoinedQuery(query: SnakeQuery[T], joins: tuple[_JoinSpec, ...]) -> None
```

Bases: `Generic[T, M]`

Query with explicit JOIN(s) onto collections. Projectable only; immutable.

`T` is the ROOT model; `M` that of the last joined child (exposed by `.right`). It delegates the
normal state to a wrapped `SnakeQuery[T]` and adds the list of explicit JOINs.

**Functions:**

- **filter** – Adds conditions (AND) to the WHERE. Returns a NEW query; the current one is untouched.
- **order_by** – Adds ordering keys. It can order by the child's columns (`joined.right.col`).
- **limit** – Sets the LIMIT (it replaces the previous one). Returns a new query.
- **offset** – Sets the OFFSET (it replaces the previous one). Returns a new query.
- **distinct** – Marks the projection as `SELECT DISTINCT`. Returns a new query.
- **join** – Chains ANOTHER explicit JOIN (starting from `joined.right.<collection>`).
- **to_project_sql** – Compiles the projection combining the explicit JOINs with the column/WHERE/order paths.

**Attributes:**

- **model** (`type[T]`) – The ROOT model. The session uses it to qualify/coerce the projection.
- **right** (`type[M]`) – Right-hand side of the LAST JOIN, with the path already prefixed with the right alias.

#### `model`

```python
model: type[T]
```

The ROOT model. The session uses it to qualify/coerce the projection.

#### `right`

```python
right: type[M]
```

Right-hand side of the LAST JOIN, with the path already prefixed with the right alias.

Statically `type[M]` (`joined.right.name` re-triggers the class access -> `SnakeExpr`); at
runtime a `SnakePathProxy` whose path (`("makers","name")`) is qualified with the JOIN's
alias, not the root's.

#### `filter`

```python
filter(*conditions: SnakeCondition) -> SnakeJoinedQuery[T, M]
```

Adds conditions (AND) to the WHERE. Returns a NEW query; the current one is untouched.

#### `order_by`

```python
order_by(*keys: SnakeExpr[Any] | SnakeOrder) -> SnakeJoinedQuery[T, M]
```

Adds ordering keys. It can order by the child's columns (`joined.right.col`).

#### `limit`

```python
limit(limit: int) -> SnakeJoinedQuery[T, M]
```

Sets the LIMIT (it replaces the previous one). Returns a new query.

#### `offset`

```python
offset(offset: int) -> SnakeJoinedQuery[T, M]
```

Sets the OFFSET (it replaces the previous one). Returns a new query.

#### `distinct`

```python
distinct() -> SnakeJoinedQuery[T, M]
```

Marks the projection as `SELECT DISTINCT`. Returns a new query.

#### `join`

```python
join(collection: SnakeCollection[N], how: SnakeJoin = SnakeJoin.INNER) -> SnakeJoinedQuery[T, N]
```

Chains ANOTHER explicit JOIN (starting from `joined.right.<collection>`).

The new child `N` becomes the right-hand side of `.right`, with its accumulated prefix.

#### `to_project_sql`

```python
to_project_sql(dialect: SnakeDialect, columns: Sequence[SnakeValue[Any]]) -> tuple[str, tuple[object, ...]]
```

Compiles the projection combining the explicit JOINs with the column/WHERE/order paths.

### `SnakeJoin`

Bases: `Enum`

How a collection is joined in an explicit `.join()` (projection only). INNER and LEFT only.

Both preserve the ROOT as the non-nullable side (every row has its parent). RIGHT/FULL would
bring up rows with the root at NULL, impossible to hydrate: illegal states unrepresentable.

- INNER: only parents with at least one matching child (one row per child).
- LEFT: on top of that, each childless parent once with the child's columns at NULL.

### `SnakeCompound`

```python
SnakeCompound(operator: SnakeSetOp, left: SnakeCompoundBranch[T], right: SnakeCompoundBranch[T], order_by_keys: tuple[SnakeOrder, ...] = (), limit_value: int | None = None, offset_value: int | None = None) -> None
```

Bases: `Generic[T]`

Two queries joined by a set operation, with ordering and bounding belonging to the SET.

`order_by`/`limit`/`offset` belong to the set, and are emitted after the last branch. Closed over
itself: a compound recomposes with no special cases.

**Functions:**

- **order_by** – Orders the SET. A bare column orders ascending, just like in `SnakeQuery`.
- **limit** – Bounds the SET (it replaces the previous one). Returns a new compound.
- **offset** – Skips rows of the SET (it replaces the previous one). Returns a new compound.
- **union** – `UNION`: the rows of both, WITHOUT duplicates.
- **union_all** – `UNION ALL`: the rows of both, KEEPING duplicates. It does not deduplicate, and is cheaper.
- **except_** – `EXCEPT`: the left-hand ones that are NOT in the right-hand one. With a trailing underscore: it is a reserved word.
- **intersect** – `INTERSECT`: only the ones that are in BOTH.
- **to_sql** – Compiles to `(sql, params)` concatenating the branches in textual order.

**Attributes:**

- **model** (`type[T]`) – The model of the rows. Taken from the left one (both are of the same model, guaranteed by
- **projected_columns** (`frozenset[str] | None`) – The columns the branches PROJECT, or `None` when they bring whole rows.
- **has_includes** (`bool`) – Never: a compound loads no relationships. It is rejected at build time, not here.
- **has_lock** (`bool`) – Never: a compound locks no rows. It is rejected at build time, not here.
- **has_bounds** (`bool`) – Tells whether the SET carries `limit`/`offset` of its own, so a compound nested in
- **has_order** (`bool`) – Tells whether the SET carries `order_by` of its own.
- **has_cte** (`bool`) – Whether a `WITH RECURSIVE` is hiding anywhere inside. It travels UP: a recursion nested

#### `model`

```python
model: type[T]
```

The model of the rows. Taken from the left one (both are of the same model, guaranteed by
the type and by `_compose`): SQL only demands that the columns line up, so without that
guarantee it would instantiate the rows wrong.

#### `projected_columns`

```python
projected_columns: frozenset[str] | None
```

The columns the branches PROJECT, or `None` when they bring whole rows.

The session maps by asking for this instead of counting the row's width, and a compound
that could not answer was read as whole rows: the values of a narrowed branch landed on the
wrong attributes. Both branches project the same set (`_compose` refuses anything else), so
the left one answers for the pair.

#### `has_includes`

```python
has_includes: bool
```

Never: a compound loads no relationships. It is rejected at build time, not here.

#### `has_lock`

```python
has_lock: bool
```

Never: a compound locks no rows. It is rejected at build time, not here.

#### `has_bounds`

```python
has_bounds: bool
```

Tells whether the SET carries `limit`/`offset` of its own, so a compound nested in
another one answers the same question a query does.

#### `has_order`

```python
has_order: bool
```

Tells whether the SET carries `order_by` of its own.

#### `has_cte`

```python
has_cte: bool
```

Whether a `WITH RECURSIVE` is hiding anywhere inside. It travels UP: a recursion nested
two compounds deep still ends up written inside a branch of the outer one.

#### `order_by`

```python
order_by(*keys: SnakeExpr[Any] | SnakeOrder) -> SnakeCompound[T]
```

Orders the SET. A bare column orders ascending, just like in `SnakeQuery`.

The key has to name a column the set HAS: refused here, where the caller still knows what
they typed, rather than in the emitter where it turned into another column's name.

#### `limit`

```python
limit(limit: int) -> SnakeCompound[T]
```

Bounds the SET (it replaces the previous one). Returns a new compound.

#### `offset`

```python
offset(offset: int) -> SnakeCompound[T]
```

Skips rows of the SET (it replaces the previous one). Returns a new compound.

#### `union`

```python
union(other: SnakeCompoundBranch[T]) -> SnakeCompound[T]
```

`UNION`: the rows of both, WITHOUT duplicates.

#### `union_all`

```python
union_all(other: SnakeCompoundBranch[T]) -> SnakeCompound[T]
```

`UNION ALL`: the rows of both, KEEPING duplicates. It does not deduplicate, and is cheaper.

#### `except_`

```python
except_(other: SnakeCompoundBranch[T]) -> SnakeCompound[T]
```

`EXCEPT`: the left-hand ones that are NOT in the right-hand one. With a trailing underscore: it is a reserved word.

#### `intersect`

```python
intersect(other: SnakeCompoundBranch[T]) -> SnakeCompound[T]
```

`INTERSECT`: only the ones that are in BOTH.

#### `to_sql`

```python
to_sql(dialect: SnakeDialect) -> tuple[str, tuple[object, ...]]
```

Compiles to `(sql, params)` concatenating the branches in textual order.

Each branch inside parentheses: without them a branch's `LIMIT` would read as the set's. The
`ORDER BY` goes UNqualified: the result is no table, its columns are the projection's.

### `SnakeSetOp`

Bases: `Enum`

Set operation (standard SQL, agnostic).

`UNION` deduplicates (which forces sorting/hashing everything) and `UNION ALL` does not:
different enum values, to force a CHOICE instead of inheriting a default.

### `SnakeRecursive`

```python
SnakeRecursive(anchor: SnakeQuery[T], table: SnakeTableInfo, child_column: str, parent_column: str, distinct: bool = False, order_by_keys: tuple[SnakeOrder, ...] = (), limit_value: int | None = None, offset_value: int | None = None) -> None
```

Bases: `Generic[T]`

An ANCHOR query that expands itself by following a hop onto itself.

`child_column` points upwards (`parent_id`) and `parent_column` identifies the accumulated row
(`id`): the direction is fixed by which one goes first (swapping them walks the ancestors, a
perfectly legitimate query).

`distinct` picks the set operator that joins each step to what has already been accumulated:
`False` (the default) emits `UNION ALL`, `True` emits `UNION`. It is the difference between a
walk that ends over cyclic data and one that does not.

**Functions:**

- **order_by** – Orders the RESULT (not the anchor nor the step). A bare column orders ascending.
- **limit** – Bounds the RESULT, and only the result: it does NOT bound the traversal.
- **offset** – Skips rows of the result (it replaces the previous one).
- **to_sql** – Compiles to `(sql, params)`, with the ANCHOR's params first.

**Attributes:**

- **model** (`type[T]`) – The model of the rows: the same as the anchor's. The session uses it to instantiate them.
- **projected_columns** (`frozenset[str] | None`) – Never narrowed: the CTE's columns are the TABLE's, and a narrowed anchor is refused.
- **has_includes** (`bool`) – Never: an anchor with includes is rejected at build time, not here.
- **has_lock** (`bool`) – Never: a recursive CTE does not lock rows. It is rejected at build time.
- **has_bounds** (`bool`) – Tells whether it carries `limit`/`offset` of its own. The compound looks at this.
- **has_order** (`bool`) – Tells whether it carries `order_by` of its own. The compound looks at this.
- **has_cte** (`bool`) – Always: this is the `WITH RECURSIVE`. The compound asks so it can refuse where a CTE

#### `model`

```python
model: type[T]
```

The model of the rows: the same as the anchor's. The session uses it to instantiate them.

#### `projected_columns`

```python
projected_columns: frozenset[str] | None
```

Never narrowed: the CTE's columns are the TABLE's, and a narrowed anchor is refused.

#### `has_includes`

```python
has_includes: bool
```

Never: an anchor with includes is rejected at build time, not here.

#### `has_lock`

```python
has_lock: bool
```

Never: a recursive CTE does not lock rows. It is rejected at build time.

#### `has_bounds`

```python
has_bounds: bool
```

Tells whether it carries `limit`/`offset` of its own. The compound looks at this.

#### `has_order`

```python
has_order: bool
```

Tells whether it carries `order_by` of its own. The compound looks at this.

#### `has_cte`

```python
has_cte: bool
```

Always: this is the `WITH RECURSIVE`. The compound asks so it can refuse where a CTE
cannot be a branch, which is two of the three engines.

#### `order_by`

```python
order_by(*keys: SnakeExpr[Any] | SnakeOrder) -> SnakeRecursive[T]
```

Orders the RESULT (not the anchor nor the step). A bare column orders ascending.

The same guard the compound uses, and for the same reason: the `SELECT ... FROM cte` this
ordering hangs off has only the CTE's columns, so a key that navigates a relationship would
lose the hop and be written as another column's bare name.

#### `limit`

```python
limit(limit: int) -> SnakeRecursive[T]
```

Bounds the RESULT, and only the result: it does NOT bound the traversal.

It read as the safety net against a cycle until somebody measured it. Put an `order_by()`
in front of it —which is the normal way to ask for a hierarchy— and the engine has to
produce every row before it can sort them, so the bound never gets its turn and the query
hangs all the same. What ends a cyclic walk is `recursive(..., distinct=True)`.

#### `offset`

```python
offset(offset: int) -> SnakeRecursive[T]
```

Skips rows of the result (it replaces the previous one).

#### `to_sql`

```python
to_sql(dialect: SnakeDialect) -> tuple[str, tuple[object, ...]]
```

Compiles to `(sql, params)`, with the ANCHOR's params first.

That order is mandatory: the anchor comes earlier in the string and Postgres' `%s` is positional.

## Expressions

### `SnakeExpr`

```python
SnakeExpr(path: tuple[str, ...], python_type: type | None = None) -> None
```

Bases: `SnakeValue[T]`

Typed expression over ONE column.

`path` is the navigation down to the column (the last element is the column, the earlier ones
relationships: `("car", "brand", "name")`). The only column leaf node.

`python_type` is the COMPILED type of the column, carried here so the emitter can reason about
it: the generic `T` is erased at runtime, and without this the SQL layer cannot tell an integer
division from a decimal one. It is `None` when nobody stamped it — a hand-built node in a test,
or a path the compiler never saw — and everything that reads it treats `None` as "no proof" and
changes nothing.

**Functions:**

- **json_get** – Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.
- **in_** – `value IN (...)`: a set of values or a scalar SUBQUERY.
- **is_null** – `value IS NULL`. Valid for any expression.
- **is_not_null** – `value IS NOT NULL`. Valid for any expression.
- **like** – `value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).
- **ilike** – `value ILIKE pattern`: like `like`, but ignoring upper and lower case.
- **not_in** – `NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).
- **between** – `value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).
- **startswith** – `LIKE 'value%'`, with the wildcards of the VALUE escaped.
- **istartswith** – Like `startswith`, but ignoring case.
- **endswith** – `LIKE '%value'`, with the wildcards of the VALUE escaped.
- **iendswith** – Like `endswith`, but ignoring case.
- **contains** – `LIKE '%value%'`, with the wildcards of the VALUE escaped.
- **icontains** – Like `contains`, but ignoring case.
- **asc** – Ascending order key by this expression.
- **desc** – Descending order key by this expression.
- **paths** – A column contributes exactly its own path.

#### `json_get`

```python
json_get(*key_path: str, as_type: type[V]) -> SnakeJsonGet[V]
```

Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.

`as_type` is required and it is not ceremony. What the engines give back from a document is
text, so without a declared type the comparison below would be a TEXT comparison and
`'9' > '100'` would be true — the same trap the capability catalogue documents for a
`Decimal` ordered as text. The type is what makes the ORM emit the cast.

Several keys walk a nested path in ONE access (`json_get("owner", "name")`), because every
engine takes a path and two accesses would be two trips through the document.

The key is validated rather than parametrised: it is emitted inside a literal, where no
engine accepts a placeholder, so a key that is not a plain identifier is refused here.

#### `in_`

```python
in_(values: Iterable[T] | SnakeSubquery[T]) -> SnakeInList | SnakeInSubquery
```

`value IN (...)`: a set of values or a scalar SUBQUERY.

An iterable -> values typed to `T`, `SnakeInList`. A `SnakeSubquery[T]` (same `T`) -> `value
IN (SELECT ...)`, `SnakeInSubquery` (the checker rejects a subquery of another type).

#### `is_null`

```python
is_null() -> SnakeIsNull
```

`value IS NULL`. Valid for any expression.

#### `is_not_null`

```python
is_not_null() -> SnakeIsNotNull
```

`value IS NOT NULL`. Valid for any expression.

#### `like`

```python
like(pattern: str) -> SnakeLike
```

`value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).

#### `ilike`

```python
ilike(pattern: str) -> SnakeLike
```

`value ILIKE pattern`: like `like`, but ignoring upper and lower case.

#### `not_in`

```python
not_in(values: Iterable[T]) -> SnakeNot
```

`NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).

#### `between`

```python
between(low: T, high: T) -> SnakeAnd
```

`value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).

#### `startswith`

```python
startswith(value: str) -> SnakeLike
```

`LIKE 'value%'`, with the wildcards of the VALUE escaped.

#### `istartswith`

```python
istartswith(value: str) -> SnakeLike
```

Like `startswith`, but ignoring case.

#### `endswith`

```python
endswith(value: str) -> SnakeLike
```

`LIKE '%value'`, with the wildcards of the VALUE escaped.

#### `iendswith`

```python
iendswith(value: str) -> SnakeLike
```

Like `endswith`, but ignoring case.

#### `contains`

```python
contains(value: str) -> SnakeLike
```

`LIKE '%value%'`, with the wildcards of the VALUE escaped.

#### `icontains`

```python
icontains(value: str) -> SnakeLike
```

Like `contains`, but ignoring case.

#### `asc`

```python
asc() -> SnakeOrder
```

Ascending order key by this expression.

#### `desc`

```python
desc() -> SnakeOrder
```

Descending order key by this expression.

#### `paths`

```python
paths() -> tuple[tuple[str, ...], ...]
```

A column contributes exactly its own path.

### `SnakeCondition`

Boolean node of the query AST (WHERE, JOIN ON...).

It combines with `&` (AND), `|` (OR) and is negated with `~` (NOT).

### `SnakeOrder`

```python
SnakeOrder(expr: SnakeValue[Any], descending: bool, nulls: SnakeNulls | None = None) -> None
```

Ordering key: a value, its direction and where the NULLs go.

`nulls=None` leaves the engine default, which has a trap in it: Postgres puts the NULLs last in
ASC and first in DESC, so changing the direction moves the gaps around.

**Functions:**

- **nulls_first** – The same key, with the NULLs first.
- **nulls_last** – The same key, with the NULLs last.

#### `nulls_first`

```python
nulls_first() -> SnakeOrder
```

The same key, with the NULLs first.

#### `nulls_last`

```python
nulls_last() -> SnakeOrder
```

The same key, with the NULLs last.

### `SnakeValue`

Bases: `Generic[T]`

Base of every VALUE expression: it knows how to compare itself and operate arithmetically.

With no SQL identity of its own (the subclasses provide that). The comparators produce a
`SnakeCondition`; the arithmetic ones another `SnakeValue` (`SnakeArith`), chainable.

**Functions:**

- **json_get** – Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.
- **in_** – `value IN (...)`: a set of values or a scalar SUBQUERY.
- **is_null** – `value IS NULL`. Valid for any expression.
- **is_not_null** – `value IS NOT NULL`. Valid for any expression.
- **like** – `value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).
- **ilike** – `value ILIKE pattern`: like `like`, but ignoring upper and lower case.
- **not_in** – `NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).
- **between** – `value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).
- **startswith** – `LIKE 'value%'`, with the wildcards of the VALUE escaped.
- **istartswith** – Like `startswith`, but ignoring case.
- **endswith** – `LIKE '%value'`, with the wildcards of the VALUE escaped.
- **iendswith** – Like `endswith`, but ignoring case.
- **contains** – `LIKE '%value%'`, with the wildcards of the VALUE escaped.
- **icontains** – Like `contains`, but ignoring case.
- **asc** – Ascending order key by this expression.
- **desc** – Descending order key by this expression.
- **paths** – Column paths contained in this node. Each concrete subclass defines it.

#### `json_get`

```python
json_get(*key_path: str, as_type: type[V]) -> SnakeJsonGet[V]
```

Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.

`as_type` is required and it is not ceremony. What the engines give back from a document is
text, so without a declared type the comparison below would be a TEXT comparison and
`'9' > '100'` would be true — the same trap the capability catalogue documents for a
`Decimal` ordered as text. The type is what makes the ORM emit the cast.

Several keys walk a nested path in ONE access (`json_get("owner", "name")`), because every
engine takes a path and two accesses would be two trips through the document.

The key is validated rather than parametrised: it is emitted inside a literal, where no
engine accepts a placeholder, so a key that is not a plain identifier is refused here.

#### `in_`

```python
in_(values: Iterable[T] | SnakeSubquery[T]) -> SnakeInList | SnakeInSubquery
```

`value IN (...)`: a set of values or a scalar SUBQUERY.

An iterable -> values typed to `T`, `SnakeInList`. A `SnakeSubquery[T]` (same `T`) -> `value
IN (SELECT ...)`, `SnakeInSubquery` (the checker rejects a subquery of another type).

#### `is_null`

```python
is_null() -> SnakeIsNull
```

`value IS NULL`. Valid for any expression.

#### `is_not_null`

```python
is_not_null() -> SnakeIsNotNull
```

`value IS NOT NULL`. Valid for any expression.

#### `like`

```python
like(pattern: str) -> SnakeLike
```

`value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).

#### `ilike`

```python
ilike(pattern: str) -> SnakeLike
```

`value ILIKE pattern`: like `like`, but ignoring upper and lower case.

#### `not_in`

```python
not_in(values: Iterable[T]) -> SnakeNot
```

`NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).

#### `between`

```python
between(low: T, high: T) -> SnakeAnd
```

`value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).

#### `startswith`

```python
startswith(value: str) -> SnakeLike
```

`LIKE 'value%'`, with the wildcards of the VALUE escaped.

#### `istartswith`

```python
istartswith(value: str) -> SnakeLike
```

Like `startswith`, but ignoring case.

#### `endswith`

```python
endswith(value: str) -> SnakeLike
```

`LIKE '%value'`, with the wildcards of the VALUE escaped.

#### `iendswith`

```python
iendswith(value: str) -> SnakeLike
```

Like `endswith`, but ignoring case.

#### `contains`

```python
contains(value: str) -> SnakeLike
```

`LIKE '%value%'`, with the wildcards of the VALUE escaped.

#### `icontains`

```python
icontains(value: str) -> SnakeLike
```

Like `contains`, but ignoring case.

#### `asc`

```python
asc() -> SnakeOrder
```

Ascending order key by this expression.

#### `desc`

```python
desc() -> SnakeOrder
```

Descending order key by this expression.

#### `paths`

```python
paths() -> tuple[tuple[str, ...], ...]
```

Column paths contained in this node. Each concrete subclass defines it.

### `SnakeSubquery`

```python
SnakeSubquery(schema: str, name: str, column: str, where: SnakeCondition | None = None) -> None
```

Bases: `SnakeValue[T]`

Scalar subquery used as a VALUE: `(SELECT <column> FROM <table> [WHERE ...])`.

It is produced by `SnakeQuery.as_scalar(column)`. Primitives only (agnostic; it does not import
`SnakeQuery`, which avoids a cycle). It has its own FROM: it contributes no paths and does not
correlate. It is used in `.in_(...)`; its params are threaded into the outer numbering at emission.

**Functions:**

- **json_get** – Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.
- **in_** – `value IN (...)`: a set of values or a scalar SUBQUERY.
- **is_null** – `value IS NULL`. Valid for any expression.
- **is_not_null** – `value IS NOT NULL`. Valid for any expression.
- **like** – `value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).
- **ilike** – `value ILIKE pattern`: like `like`, but ignoring upper and lower case.
- **not_in** – `NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).
- **between** – `value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).
- **startswith** – `LIKE 'value%'`, with the wildcards of the VALUE escaped.
- **istartswith** – Like `startswith`, but ignoring case.
- **endswith** – `LIKE '%value'`, with the wildcards of the VALUE escaped.
- **iendswith** – Like `endswith`, but ignoring case.
- **contains** – `LIKE '%value%'`, with the wildcards of the VALUE escaped.
- **icontains** – Like `contains`, but ignoring case.
- **asc** – Ascending order key by this expression.
- **desc** – Descending order key by this expression.
- **paths** – A subquery has its own FROM: it references no columns of the outer query.

#### `json_get`

```python
json_get(*key_path: str, as_type: type[V]) -> SnakeJsonGet[V]
```

Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.

`as_type` is required and it is not ceremony. What the engines give back from a document is
text, so without a declared type the comparison below would be a TEXT comparison and
`'9' > '100'` would be true — the same trap the capability catalogue documents for a
`Decimal` ordered as text. The type is what makes the ORM emit the cast.

Several keys walk a nested path in ONE access (`json_get("owner", "name")`), because every
engine takes a path and two accesses would be two trips through the document.

The key is validated rather than parametrised: it is emitted inside a literal, where no
engine accepts a placeholder, so a key that is not a plain identifier is refused here.

#### `in_`

```python
in_(values: Iterable[T] | SnakeSubquery[T]) -> SnakeInList | SnakeInSubquery
```

`value IN (...)`: a set of values or a scalar SUBQUERY.

An iterable -> values typed to `T`, `SnakeInList`. A `SnakeSubquery[T]` (same `T`) -> `value
IN (SELECT ...)`, `SnakeInSubquery` (the checker rejects a subquery of another type).

#### `is_null`

```python
is_null() -> SnakeIsNull
```

`value IS NULL`. Valid for any expression.

#### `is_not_null`

```python
is_not_null() -> SnakeIsNotNull
```

`value IS NOT NULL`. Valid for any expression.

#### `like`

```python
like(pattern: str) -> SnakeLike
```

`value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).

#### `ilike`

```python
ilike(pattern: str) -> SnakeLike
```

`value ILIKE pattern`: like `like`, but ignoring upper and lower case.

#### `not_in`

```python
not_in(values: Iterable[T]) -> SnakeNot
```

`NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).

#### `between`

```python
between(low: T, high: T) -> SnakeAnd
```

`value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).

#### `startswith`

```python
startswith(value: str) -> SnakeLike
```

`LIKE 'value%'`, with the wildcards of the VALUE escaped.

#### `istartswith`

```python
istartswith(value: str) -> SnakeLike
```

Like `startswith`, but ignoring case.

#### `endswith`

```python
endswith(value: str) -> SnakeLike
```

`LIKE '%value'`, with the wildcards of the VALUE escaped.

#### `iendswith`

```python
iendswith(value: str) -> SnakeLike
```

Like `endswith`, but ignoring case.

#### `contains`

```python
contains(value: str) -> SnakeLike
```

`LIKE '%value%'`, with the wildcards of the VALUE escaped.

#### `icontains`

```python
icontains(value: str) -> SnakeLike
```

Like `contains`, but ignoring case.

#### `asc`

```python
asc() -> SnakeOrder
```

Ascending order key by this expression.

#### `desc`

```python
desc() -> SnakeOrder
```

Descending order key by this expression.

#### `paths`

```python
paths() -> tuple[tuple[str, ...], ...]
```

A subquery has its own FROM: it references no columns of the outer query.

### `SnakeFunc`

Bases: `Enum`

Supported scalar functions, with agnostic names that the dialect translates.

### `SnakeCase`

```python
SnakeCase(branches: tuple[SnakeCaseBranch[T], ...], default: SnakeValue[T] | T | None = None, has_default: bool = False) -> None
```

Bases: `SnakeValue[T]`

`CASE WHEN cond THEN value ... [ELSE default] END`.

The branches are evaluated in order and the first match wins (the order is meaningful). Without
a `default`, no `ELSE` is emitted (in SQL that already means NULL).

**Functions:**

- **paths** – Paths of the columns it mentions (conditions, results and default), for the JOIN planner.
- **json_get** – Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.
- **in_** – `value IN (...)`: a set of values or a scalar SUBQUERY.
- **is_null** – `value IS NULL`. Valid for any expression.
- **is_not_null** – `value IS NOT NULL`. Valid for any expression.
- **like** – `value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).
- **ilike** – `value ILIKE pattern`: like `like`, but ignoring upper and lower case.
- **not_in** – `NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).
- **between** – `value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).
- **startswith** – `LIKE 'value%'`, with the wildcards of the VALUE escaped.
- **istartswith** – Like `startswith`, but ignoring case.
- **endswith** – `LIKE '%value'`, with the wildcards of the VALUE escaped.
- **iendswith** – Like `endswith`, but ignoring case.
- **contains** – `LIKE '%value%'`, with the wildcards of the VALUE escaped.
- **icontains** – Like `contains`, but ignoring case.
- **asc** – Ascending order key by this expression.
- **desc** – Descending order key by this expression.

#### `paths`

```python
paths() -> tuple[tuple[str, ...], ...]
```

Paths of the columns it mentions (conditions, results and default), for the JOIN planner.

#### `json_get`

```python
json_get(*key_path: str, as_type: type[V]) -> SnakeJsonGet[V]
```

Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.

`as_type` is required and it is not ceremony. What the engines give back from a document is
text, so without a declared type the comparison below would be a TEXT comparison and
`'9' > '100'` would be true — the same trap the capability catalogue documents for a
`Decimal` ordered as text. The type is what makes the ORM emit the cast.

Several keys walk a nested path in ONE access (`json_get("owner", "name")`), because every
engine takes a path and two accesses would be two trips through the document.

The key is validated rather than parametrised: it is emitted inside a literal, where no
engine accepts a placeholder, so a key that is not a plain identifier is refused here.

#### `in_`

```python
in_(values: Iterable[T] | SnakeSubquery[T]) -> SnakeInList | SnakeInSubquery
```

`value IN (...)`: a set of values or a scalar SUBQUERY.

An iterable -> values typed to `T`, `SnakeInList`. A `SnakeSubquery[T]` (same `T`) -> `value
IN (SELECT ...)`, `SnakeInSubquery` (the checker rejects a subquery of another type).

#### `is_null`

```python
is_null() -> SnakeIsNull
```

`value IS NULL`. Valid for any expression.

#### `is_not_null`

```python
is_not_null() -> SnakeIsNotNull
```

`value IS NOT NULL`. Valid for any expression.

#### `like`

```python
like(pattern: str) -> SnakeLike
```

`value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).

#### `ilike`

```python
ilike(pattern: str) -> SnakeLike
```

`value ILIKE pattern`: like `like`, but ignoring upper and lower case.

#### `not_in`

```python
not_in(values: Iterable[T]) -> SnakeNot
```

`NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).

#### `between`

```python
between(low: T, high: T) -> SnakeAnd
```

`value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).

#### `startswith`

```python
startswith(value: str) -> SnakeLike
```

`LIKE 'value%'`, with the wildcards of the VALUE escaped.

#### `istartswith`

```python
istartswith(value: str) -> SnakeLike
```

Like `startswith`, but ignoring case.

#### `endswith`

```python
endswith(value: str) -> SnakeLike
```

`LIKE '%value'`, with the wildcards of the VALUE escaped.

#### `iendswith`

```python
iendswith(value: str) -> SnakeLike
```

Like `endswith`, but ignoring case.

#### `contains`

```python
contains(value: str) -> SnakeLike
```

`LIKE '%value%'`, with the wildcards of the VALUE escaped.

#### `icontains`

```python
icontains(value: str) -> SnakeLike
```

Like `contains`, but ignoring case.

#### `asc`

```python
asc() -> SnakeOrder
```

Ascending order key by this expression.

#### `desc`

```python
desc() -> SnakeOrder
```

Descending order key by this expression.

### `SnakeCoalesce`

```python
SnakeCoalesce(arguments: tuple[SnakeValue[T] | T, ...]) -> None
```

Bases: `SnakeValue[T]`

`COALESCE(a, b, ...)`: the first argument that is not NULL.

**Functions:**

- **paths** – Paths of the arguments that are columns.
- **json_get** – Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.
- **in_** – `value IN (...)`: a set of values or a scalar SUBQUERY.
- **is_null** – `value IS NULL`. Valid for any expression.
- **is_not_null** – `value IS NOT NULL`. Valid for any expression.
- **like** – `value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).
- **ilike** – `value ILIKE pattern`: like `like`, but ignoring upper and lower case.
- **not_in** – `NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).
- **between** – `value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).
- **startswith** – `LIKE 'value%'`, with the wildcards of the VALUE escaped.
- **istartswith** – Like `startswith`, but ignoring case.
- **endswith** – `LIKE '%value'`, with the wildcards of the VALUE escaped.
- **iendswith** – Like `endswith`, but ignoring case.
- **contains** – `LIKE '%value%'`, with the wildcards of the VALUE escaped.
- **icontains** – Like `contains`, but ignoring case.
- **asc** – Ascending order key by this expression.
- **desc** – Descending order key by this expression.

#### `paths`

```python
paths() -> tuple[tuple[str, ...], ...]
```

Paths of the arguments that are columns.

#### `json_get`

```python
json_get(*key_path: str, as_type: type[V]) -> SnakeJsonGet[V]
```

Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.

`as_type` is required and it is not ceremony. What the engines give back from a document is
text, so without a declared type the comparison below would be a TEXT comparison and
`'9' > '100'` would be true — the same trap the capability catalogue documents for a
`Decimal` ordered as text. The type is what makes the ORM emit the cast.

Several keys walk a nested path in ONE access (`json_get("owner", "name")`), because every
engine takes a path and two accesses would be two trips through the document.

The key is validated rather than parametrised: it is emitted inside a literal, where no
engine accepts a placeholder, so a key that is not a plain identifier is refused here.

#### `in_`

```python
in_(values: Iterable[T] | SnakeSubquery[T]) -> SnakeInList | SnakeInSubquery
```

`value IN (...)`: a set of values or a scalar SUBQUERY.

An iterable -> values typed to `T`, `SnakeInList`. A `SnakeSubquery[T]` (same `T`) -> `value
IN (SELECT ...)`, `SnakeInSubquery` (the checker rejects a subquery of another type).

#### `is_null`

```python
is_null() -> SnakeIsNull
```

`value IS NULL`. Valid for any expression.

#### `is_not_null`

```python
is_not_null() -> SnakeIsNotNull
```

`value IS NOT NULL`. Valid for any expression.

#### `like`

```python
like(pattern: str) -> SnakeLike
```

`value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).

#### `ilike`

```python
ilike(pattern: str) -> SnakeLike
```

`value ILIKE pattern`: like `like`, but ignoring upper and lower case.

#### `not_in`

```python
not_in(values: Iterable[T]) -> SnakeNot
```

`NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).

#### `between`

```python
between(low: T, high: T) -> SnakeAnd
```

`value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).

#### `startswith`

```python
startswith(value: str) -> SnakeLike
```

`LIKE 'value%'`, with the wildcards of the VALUE escaped.

#### `istartswith`

```python
istartswith(value: str) -> SnakeLike
```

Like `startswith`, but ignoring case.

#### `endswith`

```python
endswith(value: str) -> SnakeLike
```

`LIKE '%value'`, with the wildcards of the VALUE escaped.

#### `iendswith`

```python
iendswith(value: str) -> SnakeLike
```

Like `endswith`, but ignoring case.

#### `contains`

```python
contains(value: str) -> SnakeLike
```

`LIKE '%value%'`, with the wildcards of the VALUE escaped.

#### `icontains`

```python
icontains(value: str) -> SnakeLike
```

Like `contains`, but ignoring case.

#### `asc`

```python
asc() -> SnakeOrder
```

Ascending order key by this expression.

#### `desc`

```python
desc() -> SnakeOrder
```

Descending order key by this expression.

### `SnakeNullIf`

```python
SnakeNullIf(value: SnakeValue[Any], sentinel: SnakeValue[Any] | Any) -> None
```

Bases: `SnakeValue[T]`

`NULLIF(value, sentinel)`: NULL when the two are equal, and the value otherwise.

`T` is the type of the RESULT —which carries the `| None` this node introduces— and not that of
the operands, so the fields are stored untyped. Pinning them to `T` would demand a
`SnakeValue[int | None]` where the caller has a `SnakeValue[int]`, and invariance refuses it.
Same shape as `SnakeCoalesce`, which stores its arguments the same way and for the same reason:
the constructor in this module is what pins the types down, which is where they belong.

**Functions:**

- **paths** – Paths of the value and, if it is one, of the sentinel.
- **json_get** – Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.
- **in_** – `value IN (...)`: a set of values or a scalar SUBQUERY.
- **is_null** – `value IS NULL`. Valid for any expression.
- **is_not_null** – `value IS NOT NULL`. Valid for any expression.
- **like** – `value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).
- **ilike** – `value ILIKE pattern`: like `like`, but ignoring upper and lower case.
- **not_in** – `NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).
- **between** – `value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).
- **startswith** – `LIKE 'value%'`, with the wildcards of the VALUE escaped.
- **istartswith** – Like `startswith`, but ignoring case.
- **endswith** – `LIKE '%value'`, with the wildcards of the VALUE escaped.
- **iendswith** – Like `endswith`, but ignoring case.
- **contains** – `LIKE '%value%'`, with the wildcards of the VALUE escaped.
- **icontains** – Like `contains`, but ignoring case.
- **asc** – Ascending order key by this expression.
- **desc** – Descending order key by this expression.

#### `paths`

```python
paths() -> tuple[tuple[str, ...], ...]
```

Paths of the value and, if it is one, of the sentinel.

#### `json_get`

```python
json_get(*key_path: str, as_type: type[V]) -> SnakeJsonGet[V]
```

Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.

`as_type` is required and it is not ceremony. What the engines give back from a document is
text, so without a declared type the comparison below would be a TEXT comparison and
`'9' > '100'` would be true — the same trap the capability catalogue documents for a
`Decimal` ordered as text. The type is what makes the ORM emit the cast.

Several keys walk a nested path in ONE access (`json_get("owner", "name")`), because every
engine takes a path and two accesses would be two trips through the document.

The key is validated rather than parametrised: it is emitted inside a literal, where no
engine accepts a placeholder, so a key that is not a plain identifier is refused here.

#### `in_`

```python
in_(values: Iterable[T] | SnakeSubquery[T]) -> SnakeInList | SnakeInSubquery
```

`value IN (...)`: a set of values or a scalar SUBQUERY.

An iterable -> values typed to `T`, `SnakeInList`. A `SnakeSubquery[T]` (same `T`) -> `value
IN (SELECT ...)`, `SnakeInSubquery` (the checker rejects a subquery of another type).

#### `is_null`

```python
is_null() -> SnakeIsNull
```

`value IS NULL`. Valid for any expression.

#### `is_not_null`

```python
is_not_null() -> SnakeIsNotNull
```

`value IS NOT NULL`. Valid for any expression.

#### `like`

```python
like(pattern: str) -> SnakeLike
```

`value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).

#### `ilike`

```python
ilike(pattern: str) -> SnakeLike
```

`value ILIKE pattern`: like `like`, but ignoring upper and lower case.

#### `not_in`

```python
not_in(values: Iterable[T]) -> SnakeNot
```

`NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).

#### `between`

```python
between(low: T, high: T) -> SnakeAnd
```

`value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).

#### `startswith`

```python
startswith(value: str) -> SnakeLike
```

`LIKE 'value%'`, with the wildcards of the VALUE escaped.

#### `istartswith`

```python
istartswith(value: str) -> SnakeLike
```

Like `startswith`, but ignoring case.

#### `endswith`

```python
endswith(value: str) -> SnakeLike
```

`LIKE '%value'`, with the wildcards of the VALUE escaped.

#### `iendswith`

```python
iendswith(value: str) -> SnakeLike
```

Like `endswith`, but ignoring case.

#### `contains`

```python
contains(value: str) -> SnakeLike
```

`LIKE '%value%'`, with the wildcards of the VALUE escaped.

#### `icontains`

```python
icontains(value: str) -> SnakeLike
```

Like `contains`, but ignoring case.

#### `asc`

```python
asc() -> SnakeOrder
```

Ascending order key by this expression.

#### `desc`

```python
desc() -> SnakeOrder
```

Descending order key by this expression.

### `SnakeCast`

```python
SnakeCast(source: SnakeValue[Any], as_type: type) -> None
```

Bases: `SnakeValue[T]`

An EXPLICIT conversion: `CAST(<source> AS <type>)`, with the type named at the call site.

It exists because the arithmetic operators are `SnakeValue[T] | T -> SnakeArith[T]` — one single
`T` — and that is right: promoting `int` to `float` behind the user's back would be the ORM
deciding. But strictness only holds up with an explicit door, and there was none: `column * 1.0`
does not type-check, so a real division between two integer columns could not be written at all.

The TYPE NAME is the dialect's, not this node's. Measured: `CAST(x AS NUMERIC)` answers `0.9` on
PostgreSQL and `0` on SQLite, whose NUMERIC affinity collapses an integral value back to an
integer. One spelling would be right on two engines and silently wrong on the third.

**Functions:**

- **json_get** – Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.
- **in_** – `value IN (...)`: a set of values or a scalar SUBQUERY.
- **is_null** – `value IS NULL`. Valid for any expression.
- **is_not_null** – `value IS NOT NULL`. Valid for any expression.
- **like** – `value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).
- **ilike** – `value ILIKE pattern`: like `like`, but ignoring upper and lower case.
- **not_in** – `NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).
- **between** – `value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).
- **startswith** – `LIKE 'value%'`, with the wildcards of the VALUE escaped.
- **istartswith** – Like `startswith`, but ignoring case.
- **endswith** – `LIKE '%value'`, with the wildcards of the VALUE escaped.
- **iendswith** – Like `endswith`, but ignoring case.
- **contains** – `LIKE '%value%'`, with the wildcards of the VALUE escaped.
- **icontains** – Like `contains`, but ignoring case.
- **asc** – Ascending order key by this expression.
- **desc** – Descending order key by this expression.
- **paths** – What it wraps: a cast adds no navigation, and swallowing these would drop the JOIN.

#### `json_get`

```python
json_get(*key_path: str, as_type: type[V]) -> SnakeJsonGet[V]
```

Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.

`as_type` is required and it is not ceremony. What the engines give back from a document is
text, so without a declared type the comparison below would be a TEXT comparison and
`'9' > '100'` would be true — the same trap the capability catalogue documents for a
`Decimal` ordered as text. The type is what makes the ORM emit the cast.

Several keys walk a nested path in ONE access (`json_get("owner", "name")`), because every
engine takes a path and two accesses would be two trips through the document.

The key is validated rather than parametrised: it is emitted inside a literal, where no
engine accepts a placeholder, so a key that is not a plain identifier is refused here.

#### `in_`

```python
in_(values: Iterable[T] | SnakeSubquery[T]) -> SnakeInList | SnakeInSubquery
```

`value IN (...)`: a set of values or a scalar SUBQUERY.

An iterable -> values typed to `T`, `SnakeInList`. A `SnakeSubquery[T]` (same `T`) -> `value
IN (SELECT ...)`, `SnakeInSubquery` (the checker rejects a subquery of another type).

#### `is_null`

```python
is_null() -> SnakeIsNull
```

`value IS NULL`. Valid for any expression.

#### `is_not_null`

```python
is_not_null() -> SnakeIsNotNull
```

`value IS NOT NULL`. Valid for any expression.

#### `like`

```python
like(pattern: str) -> SnakeLike
```

`value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).

#### `ilike`

```python
ilike(pattern: str) -> SnakeLike
```

`value ILIKE pattern`: like `like`, but ignoring upper and lower case.

#### `not_in`

```python
not_in(values: Iterable[T]) -> SnakeNot
```

`NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).

#### `between`

```python
between(low: T, high: T) -> SnakeAnd
```

`value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).

#### `startswith`

```python
startswith(value: str) -> SnakeLike
```

`LIKE 'value%'`, with the wildcards of the VALUE escaped.

#### `istartswith`

```python
istartswith(value: str) -> SnakeLike
```

Like `startswith`, but ignoring case.

#### `endswith`

```python
endswith(value: str) -> SnakeLike
```

`LIKE '%value'`, with the wildcards of the VALUE escaped.

#### `iendswith`

```python
iendswith(value: str) -> SnakeLike
```

Like `endswith`, but ignoring case.

#### `contains`

```python
contains(value: str) -> SnakeLike
```

`LIKE '%value%'`, with the wildcards of the VALUE escaped.

#### `icontains`

```python
icontains(value: str) -> SnakeLike
```

Like `contains`, but ignoring case.

#### `asc`

```python
asc() -> SnakeOrder
```

Ascending order key by this expression.

#### `desc`

```python
desc() -> SnakeOrder
```

Descending order key by this expression.

#### `paths`

```python
paths() -> tuple[tuple[str, ...], ...]
```

What it wraps: a cast adds no navigation, and swallowing these would drop the JOIN.

### `SnakeDateShift`

```python
SnakeDateShift(value: SnakeValue[Any], amount: int, unit: SnakeDatePart) -> None
```

Bases: `SnakeValue[T]`

Moving a date or a timestamp by a fixed amount: `placed_on + 30 days`.

ONE node for both directions: subtracting is adding a negative `amount`, which the three engines
accept and which keeps the sign in the VALUE instead of in a second node. `T` is the type of the
SOURCE — shifting a date gives a date.

The three spellings share nothing (`+ INTERVAL`, `DATE_ADD`, a modifier string), so the SQL is
the dialect's business. It is the clearest case in the whole ORM for that seam.

**Functions:**

- **paths** – What it shifts: the amount is a literal and contributes no navigation of its own.
- **json_get** – Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.
- **in_** – `value IN (...)`: a set of values or a scalar SUBQUERY.
- **is_null** – `value IS NULL`. Valid for any expression.
- **is_not_null** – `value IS NOT NULL`. Valid for any expression.
- **like** – `value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).
- **ilike** – `value ILIKE pattern`: like `like`, but ignoring upper and lower case.
- **not_in** – `NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).
- **between** – `value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).
- **startswith** – `LIKE 'value%'`, with the wildcards of the VALUE escaped.
- **istartswith** – Like `startswith`, but ignoring case.
- **endswith** – `LIKE '%value'`, with the wildcards of the VALUE escaped.
- **iendswith** – Like `endswith`, but ignoring case.
- **contains** – `LIKE '%value%'`, with the wildcards of the VALUE escaped.
- **icontains** – Like `contains`, but ignoring case.
- **asc** – Ascending order key by this expression.
- **desc** – Descending order key by this expression.

#### `paths`

```python
paths() -> tuple[tuple[str, ...], ...]
```

What it shifts: the amount is a literal and contributes no navigation of its own.

#### `json_get`

```python
json_get(*key_path: str, as_type: type[V]) -> SnakeJsonGet[V]
```

Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.

`as_type` is required and it is not ceremony. What the engines give back from a document is
text, so without a declared type the comparison below would be a TEXT comparison and
`'9' > '100'` would be true — the same trap the capability catalogue documents for a
`Decimal` ordered as text. The type is what makes the ORM emit the cast.

Several keys walk a nested path in ONE access (`json_get("owner", "name")`), because every
engine takes a path and two accesses would be two trips through the document.

The key is validated rather than parametrised: it is emitted inside a literal, where no
engine accepts a placeholder, so a key that is not a plain identifier is refused here.

#### `in_`

```python
in_(values: Iterable[T] | SnakeSubquery[T]) -> SnakeInList | SnakeInSubquery
```

`value IN (...)`: a set of values or a scalar SUBQUERY.

An iterable -> values typed to `T`, `SnakeInList`. A `SnakeSubquery[T]` (same `T`) -> `value
IN (SELECT ...)`, `SnakeInSubquery` (the checker rejects a subquery of another type).

#### `is_null`

```python
is_null() -> SnakeIsNull
```

`value IS NULL`. Valid for any expression.

#### `is_not_null`

```python
is_not_null() -> SnakeIsNotNull
```

`value IS NOT NULL`. Valid for any expression.

#### `like`

```python
like(pattern: str) -> SnakeLike
```

`value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).

#### `ilike`

```python
ilike(pattern: str) -> SnakeLike
```

`value ILIKE pattern`: like `like`, but ignoring upper and lower case.

#### `not_in`

```python
not_in(values: Iterable[T]) -> SnakeNot
```

`NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).

#### `between`

```python
between(low: T, high: T) -> SnakeAnd
```

`value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).

#### `startswith`

```python
startswith(value: str) -> SnakeLike
```

`LIKE 'value%'`, with the wildcards of the VALUE escaped.

#### `istartswith`

```python
istartswith(value: str) -> SnakeLike
```

Like `startswith`, but ignoring case.

#### `endswith`

```python
endswith(value: str) -> SnakeLike
```

`LIKE '%value'`, with the wildcards of the VALUE escaped.

#### `iendswith`

```python
iendswith(value: str) -> SnakeLike
```

Like `endswith`, but ignoring case.

#### `contains`

```python
contains(value: str) -> SnakeLike
```

`LIKE '%value%'`, with the wildcards of the VALUE escaped.

#### `icontains`

```python
icontains(value: str) -> SnakeLike
```

Like `contains`, but ignoring case.

#### `asc`

```python
asc() -> SnakeOrder
```

Ascending order key by this expression.

#### `desc`

```python
desc() -> SnakeOrder
```

Descending order key by this expression.

### `SnakeDatePart`

Bases: `Enum`

A part of a date, for `DATE_TRUNC` and `EXTRACT`. Standard SQL names.

## Text functions

Seven scalar functions the three engines translate. What one of them cannot do is DECLARED with a reason, never left out — silence and 'not supported' would be indistinguishable.

```python
from snakeorm import SnakeQuery
from snakeorm.expressions import snake_concat, snake_length, snake_lower, snake_substring

rows = session.select(
    SnakeQuery(User).filter(snake_length(User.name) > 3),
    snake_lower(User.name),
    snake_concat(User.name, " <", User.email, ">"),
    snake_substring(User.email, 1, 5),
)
```

## Date functions

`DATE_TRUNC` and `EXTRACT` run where the engine has them and are REFUSED where it does not, and the two are not refused in the same places. `DATE_TRUNC` is PostgreSQL alone: MySQL and SQLite both declare they have none, so the plan stops instead of emitting SQL the engine would reject. `EXTRACT` is translated by PostgreSQL and MySQL, and only SQLite stops it. Naming one engine as "the one without them" would have been the tidier sentence and the wrong one — the refusal is per function, which is exactly why each dialect answers for it separately.

The part is a `SnakeDatePart`, not a string, and that is the point of the enum: it fixes the vocabulary to the parts the engines agree on, so the same call means the same thing on the three. Handed a `str`, the emitter reads a `.value` off it and dies of an `AttributeError` — a Python error where a readable refusal belongs, which is why the type is the one that keeps you out of it.

```python
from snakeorm import SnakeDatePart, SnakeQuery
from snakeorm.expressions import snake_date_trunc, snake_extract

rows = session.select(
    SnakeQuery(Visit),
    snake_date_trunc(SnakeDatePart.MONTH, Visit.created_at),  # PostgreSQL only
    snake_extract(SnakeDatePart.YEAR, Visit.created_at),      # PostgreSQL and MySQL
)
# On MySQL the first one stops the plan with a SnakeDialectError:
#   MySQLDialect cannot translate DATE_TRUNC: MySQL has no DATE_TRUNC. Reach for it through
#   `raw()` with the engine's own spelling.
# On SQLite BOTH stop, each naming its own function.
```

## Rounding and magnitude

`ABS` and `ROUND` ship with every build of every engine. Their absence from SQLite's table was bug #34, and that is exactly why a missing function has to be declared rather than left blank.

Asking `ROUND` for decimal places works on the three, and getting there took a dialect saying so: PostgreSQL has `ROUND(double precision)` and `ROUND(numeric, int)` and nothing in between, so it declares the type its two-argument form wants and the emitter casts. You write the same call everywhere.

```python
from snakeorm import SnakeQuery
from snakeorm.expressions import snake_abs, snake_round

rows = session.select(
    SnakeQuery(Reading),
    snake_abs(Reading.delta),        # the magnitude, sign dropped
    snake_round(Reading.amount),     # nearest whole number
    snake_round(Reading.amount, 2),  # to N places, on the three since bug #34 closed
)
```

## Maths that depend on the build

The three translate them, and on SQLite they are a COMPILE-TIME option (`ENABLE_MATH_FUNCTIONS`): a build without it answers `no such function: ceil` at runtime. That cannot be a capability — a capability is answered by the dialect class, which does not know which library got linked.

```python
from snakeorm import SnakeQuery
from snakeorm.expressions import snake_ceil, snake_floor, snake_power, snake_sqrt

rows = session.select(
    SnakeQuery(Reading),
    snake_ceil(Reading.amount),               # -8.76 -> -8, towards zero
    snake_floor(Reading.amount),              # -8.76 -> -9, away from zero
    snake_sqrt(snake_power(Reading.delta, 2)),  # the magnitude, the long way round
)
```

### `SnakeWindow`

```python
SnakeWindow(func: str, arg: SnakeValue[Any] | None = None, extra_args: tuple[object, ...] = (), partition_by: tuple[SnakeValue[Any], ...] = (), order_by: tuple[SnakeOrder, ...] = (), frame: SnakeFrame | None = None) -> None
```

Bases: `SnakeValue[T]`

`<func>(<arg>...) OVER (PARTITION BY ... ORDER BY ...)`.

`func` is the SQL NAME, kept as a string because two families live side by side (ranking, and
aggregates used as windows, which already have their own enum): a union enum would lie.
`extra_args` are literals of the function (the offset of `LAG`/`LEAD`), parametrised like every
other value.

**Functions:**

- **over** – The same function with its window defined. Without `over(...)`, the window is ALL the rows.
- **paths** – Paths of everything the window touches (argument, partition, order): all three plan JOINs.
- **json_get** – Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.
- **in_** – `value IN (...)`: a set of values or a scalar SUBQUERY.
- **is_null** – `value IS NULL`. Valid for any expression.
- **is_not_null** – `value IS NOT NULL`. Valid for any expression.
- **like** – `value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).
- **ilike** – `value ILIKE pattern`: like `like`, but ignoring upper and lower case.
- **not_in** – `NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).
- **between** – `value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).
- **startswith** – `LIKE 'value%'`, with the wildcards of the VALUE escaped.
- **istartswith** – Like `startswith`, but ignoring case.
- **endswith** – `LIKE '%value'`, with the wildcards of the VALUE escaped.
- **iendswith** – Like `endswith`, but ignoring case.
- **contains** – `LIKE '%value%'`, with the wildcards of the VALUE escaped.
- **icontains** – Like `contains`, but ignoring case.
- **asc** – Ascending order key by this expression.
- **desc** – Descending order key by this expression.

#### `over`

```python
over(*, partition_by: tuple[SnakeValue[Any], ...] | list[SnakeValue[Any]] = (), order_by: tuple[SnakeOrder, ...] | list[SnakeOrder] = (), frame: SnakeFrame | None = None) -> SnakeWindow[T]
```

The same function with its window defined. Without `over(...)`, the window is ALL the rows.

`frame` is what turns a running total into a MOVING one. Without it the default frame runs
from the start of the partition to the current row, which is one useful answer out of many:
a trailing average, a centred window or a look-ahead all need the frame said out loud.

A FRAME WITHOUT AN ORDER IS REFUSED. `6 PRECEDING` has to be preceding IN something, and with
no `ORDER BY` the engine picks an order of its own — so the same query answers differently on
two runs with nothing to show for it. That is the shape of failure this ORM does not ship.

It returns a NEW node (immutable AST): reusing a stored window holds no surprises.

#### `paths`

```python
paths() -> tuple[tuple[str, ...], ...]
```

Paths of everything the window touches (argument, partition, order): all three plan JOINs.

#### `json_get`

```python
json_get(*key_path: str, as_type: type[V]) -> SnakeJsonGet[V]
```

Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.

`as_type` is required and it is not ceremony. What the engines give back from a document is
text, so without a declared type the comparison below would be a TEXT comparison and
`'9' > '100'` would be true — the same trap the capability catalogue documents for a
`Decimal` ordered as text. The type is what makes the ORM emit the cast.

Several keys walk a nested path in ONE access (`json_get("owner", "name")`), because every
engine takes a path and two accesses would be two trips through the document.

The key is validated rather than parametrised: it is emitted inside a literal, where no
engine accepts a placeholder, so a key that is not a plain identifier is refused here.

#### `in_`

```python
in_(values: Iterable[T] | SnakeSubquery[T]) -> SnakeInList | SnakeInSubquery
```

`value IN (...)`: a set of values or a scalar SUBQUERY.

An iterable -> values typed to `T`, `SnakeInList`. A `SnakeSubquery[T]` (same `T`) -> `value
IN (SELECT ...)`, `SnakeInSubquery` (the checker rejects a subquery of another type).

#### `is_null`

```python
is_null() -> SnakeIsNull
```

`value IS NULL`. Valid for any expression.

#### `is_not_null`

```python
is_not_null() -> SnakeIsNotNull
```

`value IS NOT NULL`. Valid for any expression.

#### `like`

```python
like(pattern: str) -> SnakeLike
```

`value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).

#### `ilike`

```python
ilike(pattern: str) -> SnakeLike
```

`value ILIKE pattern`: like `like`, but ignoring upper and lower case.

#### `not_in`

```python
not_in(values: Iterable[T]) -> SnakeNot
```

`NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).

#### `between`

```python
between(low: T, high: T) -> SnakeAnd
```

`value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).

#### `startswith`

```python
startswith(value: str) -> SnakeLike
```

`LIKE 'value%'`, with the wildcards of the VALUE escaped.

#### `istartswith`

```python
istartswith(value: str) -> SnakeLike
```

Like `startswith`, but ignoring case.

#### `endswith`

```python
endswith(value: str) -> SnakeLike
```

`LIKE '%value'`, with the wildcards of the VALUE escaped.

#### `iendswith`

```python
iendswith(value: str) -> SnakeLike
```

Like `endswith`, but ignoring case.

#### `contains`

```python
contains(value: str) -> SnakeLike
```

`LIKE '%value%'`, with the wildcards of the VALUE escaped.

#### `icontains`

```python
icontains(value: str) -> SnakeLike
```

Like `contains`, but ignoring case.

#### `asc`

```python
asc() -> SnakeOrder
```

Ascending order key by this expression.

#### `desc`

```python
desc() -> SnakeOrder
```

Descending order key by this expression.

### `SnakeFrame`

```python
SnakeFrame(mode: SnakeFrameMode, start: SnakeFrameBound, end: SnakeFrameBound) -> None
```

`<mode> BETWEEN <start> AND <end>`: which neighbouring rows the function may look at.

**Functions:**

- **sql** – The whole clause. No dialect involved: it is the same on the three engines.

#### `sql`

```python
sql() -> str
```

The whole clause. No dialect involved: it is the same on the three engines.

### `SnakeFrameBound`

```python
SnakeFrameBound(offset: int | None, following: bool) -> None
```

One end of a frame. `offset=None` is UNBOUNDED; `offset=0` is the current row.

The offset reaches the STATEMENT rather than `params`, and that is measured rather than lazy:
PostgreSQL and SQLite take a placeholder in a bound and MariaDB rejects it outright, so the only
portable spelling is the literal. It is safe for the same reason the JSON key path is — the value
is an `int` from Python's own type system and it is checked when the bound is BUILT, before any
SQL exists. An integer carries no injection.

**Functions:**

- **sql** – The bound as standard SQL. The three engines spell this identically (measured).
- **rank** – Where this bound sits on the timeline, so a frame can check it does not run backwards.

#### `sql`

```python
sql() -> str
```

The bound as standard SQL. The three engines spell this identically (measured).

#### `rank`

```python
rank() -> tuple[int, int]
```

Where this bound sits on the timeline, so a frame can check it does not run backwards.

### `SnakeFrameMode`

Bases: `Enum`

`ROWS` counts ROWS, `RANGE` counts VALUES. With ties they answer differently.

Offering only `ROWS` would be the smaller API and the wrong one: somebody ordering by a day that
has several readings in it means RANGE, and handing them ROWS is a wrong answer with no error.

### `SNAKE_CURRENT_ROW`

```python
SNAKE_CURRENT_ROW = SnakeFrameBound(offset=0, following=False)
```

### `snake_rows`

```python
snake_rows(start: SnakeFrameBound, end: SnakeFrameBound) -> SnakeFrame
```

`ROWS BETWEEN start AND end`: counts ROWS, so ties are separate rows.

### `snake_range`

```python
snake_range(start: SnakeFrameBound, end: SnakeFrameBound) -> SnakeFrame
```

`RANGE BETWEEN start AND end`: counts VALUES, so tied rows come in together.

### `snake_preceding`

```python
snake_preceding(rows: int | None = None) -> SnakeFrameBound
```

`n PRECEDING`, or `UNBOUNDED PRECEDING` with no argument.

### `snake_following`

```python
snake_following(rows: int | None = None) -> SnakeFrameBound
```

`n FOLLOWING`, or `UNBOUNDED FOLLOWING` with no argument.
### `snake_case`

```python
snake_case(*branches: SnakeCaseBranch[T], default: SnakeValue[T] | T | object = _NO_DEFAULT) -> SnakeCase[T]
```

Builds a `CASE WHEN`. The branches are evaluated in order; the first match wins.

    snake_case((User.age < 18, "minor"), (User.age < 65, "adult"), default="retired")

Without a `default` it returns NULL when none of them match (SQL semantics).

### `snake_coalesce`

```python
snake_coalesce(first: SnakeValue[Any], *rest: SnakeValue[Any] | Any) -> SnakeCoalesce[Any]
```

Builds a `COALESCE(...)`: the first non-NULL argument.

The FIRST argument must be an expression: a literal there would never be NULL (it would always
return that literal) and it also anchors the type `T`.

THE MIDDLE OVERLOAD IS THE POINT: a `COALESCE` whose fallback is a LITERAL cannot be NULL, so it
drops the `| None`. `COALESCE(SUM(x), 0)` is an `int`, and that is the entire reason anybody
writes it — the value stops being nullable IN THE ENGINE, so it has to stop being nullable in the
type. Without it the declarator that exists to remove a `None` handed one back, and the caller
had to `cast()` in a project whose rule is zero `Any`.

The first overload is what keeps that from becoming a lie: with every argument an expression,
nothing guarantees a value and the nullability survives. Order matters — it has to be tried
before the literal one, or an expression fallback would be read as the literal.

### `snake_nullif`

```python
snake_nullif(value: SnakeValue[T], sentinel: SnakeValue[T] | T) -> SnakeNullIf[T | None]
```

Builds a `NULLIF(value, sentinel)`: turns a sentinel (the empty string) into NULL.

THE RESULT IS NULLABLE, and saying so is the whole point. This is the exact mirror of
`snake_coalesce`, which REMOVES a `None` and declares it: this one PUTS one in. It used to
return `SnakeNullIf[T]` — the same `T` it was given — so the declarator whose entire job is to
introduce a NULL was the one place the type did not mention it.

That is not a corner case. Guarding a division against zero is `x / snake_nullif(y, 0)`, and the
NULL it produces IS the guard working. Typing that `int` told the caller the result could not be
`None` in a project that asks people to trust the checker over the engine.

### `snake_cast`

```python
snake_cast(value: SnakeValue[Any], as_type: type[V]) -> SnakeCast[V]
```

`CAST(value AS <type>)`: an EXPLICIT change of type, named by whoever writes it.

THE ORM DOES NOT PROMOTE, and this is the door that makes that stance liveable. The arithmetic
operators carry one single `T` for both operands and the result, so `Stock.reserved /
Stock.on_hand` is an `int` — which is what SQL does, and sometimes what you want. When it is not,
you say so:

    snake_cast(Stock.reserved, float) / Stock.on_hand   ->  SnakeArith[float]

`as_type` is what the RESULT is typed as, so the conversion travels through the type system
instead of around it. The SQL name of that type is the dialect's business: measured, SQLite needs
`REAL` where `NUMERIC` would answer 0.

The whitelist refuses by name at the CALL SITE rather than at emission, which is where a refusal
is worth something: the alternative is SQL the engine rejects and a driver explaining a decision
this ORM made.

### `snake_date_add`

```python
snake_date_add(value: SnakeValue[T], amount: int, unit: SnakeDatePart) -> SnakeDateShift[T]
```

Moves a date FORWARD: `snake_date_add(Order.placed_on, 30, SnakeDatePart.DAY)`.

CALENDAR UNITS ARE NOT PORTABLE and the ORM says so rather than hiding it. Measured, `2026-01-31`
plus one month is `2026-02-28` on PostgreSQL and MySQL —both clamp— and `2026-03-03` on SQLite,
which overflows. That divergence is declared as `Cap.CALENDAR_INTERVAL`, so the session warns
once instead of letting whichever engine the developer happens to run be the one that gets
tested. DAY, HOUR, MINUTE, SECOND and WEEK are a fixed span and identical on all three.

Emulating the clamp was the alternative, and it is the wrong one: the ORM would be computing
dates in Python behind an expression that claims to be SQL.

### `snake_date_sub`

```python
snake_date_sub(value: SnakeValue[T], amount: int, unit: SnakeDatePart) -> SnakeDateShift[T]
```

Moves a date BACKWARD. Same node with the sign flipped, because that is all it is.

### `snake_substring`

```python
snake_substring(value: SnakeValue[str], start: int, length: int) -> SnakeFuncCall[str]
```

`SUBSTRING(value, start, length)`: a slice of text, counted from ONE like SQL does.

The bounds are VALUES and travel as parameters, which is not obvious enough to leave unsaid: a
slice computed from user input with the numbers written into the statement is the shape an
injection takes when nobody is looking at strings.

### `snake_replace`

```python
snake_replace(value: SnakeValue[str], old: str, new: str) -> SnakeFuncCall[str]
```

`REPLACE(value, old, new)`: every occurrence, not the first. Both strings are parameters.

### `snake_ceil`

```python
snake_ceil(value: SnakeValue[T]) -> SnakeFuncCall[T]
```

`CEIL(value)`: rounds UP, keeping the type of its argument.

`T -> T` and not `-> int`, and that was measured rather than assumed: `CEIL(1.2)` answers `2` on
PostgreSQL and MySQL and `2.0` on SQLite. Declaring `int` would be false on one engine of three,
which is the exact family of bug the integer-division work removed. Keeping the argument's type
is true everywhere — a float in, a float back.

### `snake_floor`

```python
snake_floor(value: SnakeValue[T]) -> SnakeFuncCall[T]
```

`FLOOR(value)`: rounds DOWN, keeping the type of its argument. Same measurement as `CEIL`.

### `snake_sqrt`

```python
snake_sqrt(value: SnakeValue[Any]) -> SnakeFuncCall[float]
```

`SQRT(value)`: always a float. Measured `double precision` on PostgreSQL and a real on SQLite.

### `snake_power`

```python
snake_power(value: SnakeValue[Any], exponent: float) -> SnakeFuncCall[float]
```

`POWER(value, exponent)`: always a float, and the exponent travels as a parameter.

## Composite IN

### `snake_keys`

```python
snake_keys(model: type[M]) -> SnakeKeys[M]
```

Starts a composite IN over this model. Feed it the keys with `.in_([...])`.

### `snake_key`

```python
snake_key(model: type[M]) -> SnakeKey[M]
```

Starts one row of a composite IN. Chain `.set(column, value)` once per column.

### `SnakeKeys`

```python
SnakeKeys(model: type[M]) -> None
```

Bases: `Generic[M]`

The left-hand side: the tuple of columns, taken from the keys themselves.

It carries only the model, because the columns are whatever the keys declare — which is what
lets one API serve any width. What it does is CHECK that they all declare the same ones.

**Functions:**

- **in_** – `(c1, c2, ...) IN ((v1a, v2a, ...), ...)`, refusing anything that would not be that.

#### `in_`

```python
in_(keys: Iterable[SnakeKey[M]]) -> SnakeCondition
```

`(c1, c2, ...) IN ((v1a, v2a, ...), ...)`, refusing anything that would not be that.

### `SnakeKey`

```python
SnakeKey(model: type[M], slots: tuple[_Slot, ...] = ()) -> None
```

Bases: `Generic[M]`

ONE row of the right-hand side: a column paired with its value, as many times as needed.

Immutable — `set` returns a new key. A shared prefix is a natural thing to write
(`base.set(a, 1)` and `base.set(a, 2)` off the same partial key), and with mutation the second
branch would either overwrite the first or trip the duplicate guard for no reason at all.

`M` is invariant, which is what makes a `SnakeKey[Truck]` inside a list of `SnakeKey[Province]`
a type error under both checkers. That is the guard that matters; the runtime one below is for
whoever runs no checker.

**Functions:**

- **set** – Pairs one column (or scalar expression) with the value this row compares it against.

#### `set`

```python
set(slot: SnakeScalar[T], value: T) -> Self
```

Pairs one column (or scalar expression) with the value this row compares it against.

`T` is bound by the SLOT, so the value has to match the column's type: this is the whole
reason the API is not a positional tuple.

## Aggregates

`string_agg` joins a group's values into one string. The `order_by` inside the call is not cosmetic: without it the order within a group belongs to the engine, and the three would answer differently for a reason that has nothing to do with your query.

```python
from snakeorm import SnakeQuery
from snakeorm.expressions import string_agg

rows = session.select(
    SnakeQuery(Sale).group_by(Sale.region).order_by(Sale.region.asc()),
    Sale.region,
    string_agg(Sale.seller, ",", order_by=[Sale.seller.asc()]),
)
# postgres string_agg   mysql GROUP_CONCAT   sqlite group_concat  -> one answer
```

### `SnakeStringAgg`

```python
SnakeStringAgg(arg: SnakeValue[Any], separator: str, order_by: tuple[SnakeOrder, ...] = ()) -> None
```

Bases: `SnakeValue[T]`

`STRING_AGG(arg, sep ORDER BY ...)`: a group's values joined into ONE string.

It gets its own node instead of a member of `SnakeAggFunc` because it is not shaped like the
others. `SnakeAggregate` emits `FUNC(arg)` uniformly, and this one has a second argument whose
POSITION differs per engine — and on MySQL is not an argument at all but the `SEPARATOR` keyword.
Squeezing it into the uniform node would mean the node knowing about engines, which is the one
thing the graph must never do.

`order_by` is not decoration: without it the concatenation comes back in whatever order the
engine chose, so a value somebody READS changes between runs.

**Functions:**

- **json_get** – Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.
- **in_** – `value IN (...)`: a set of values or a scalar SUBQUERY.
- **is_null** – `value IS NULL`. Valid for any expression.
- **is_not_null** – `value IS NOT NULL`. Valid for any expression.
- **like** – `value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).
- **ilike** – `value ILIKE pattern`: like `like`, but ignoring upper and lower case.
- **not_in** – `NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).
- **between** – `value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).
- **startswith** – `LIKE 'value%'`, with the wildcards of the VALUE escaped.
- **istartswith** – Like `startswith`, but ignoring case.
- **endswith** – `LIKE '%value'`, with the wildcards of the VALUE escaped.
- **iendswith** – Like `endswith`, but ignoring case.
- **contains** – `LIKE '%value%'`, with the wildcards of the VALUE escaped.
- **icontains** – Like `contains`, but ignoring case.
- **asc** – Ascending order key by this expression.
- **desc** – Descending order key by this expression.
- **paths** – The argument's and the order's: both of them plan JOINs.

#### `json_get`

```python
json_get(*key_path: str, as_type: type[V]) -> SnakeJsonGet[V]
```

Reads a key INSIDE a JSON column, as the declared type: `meta.json_get("size", as_type=int)`.

`as_type` is required and it is not ceremony. What the engines give back from a document is
text, so without a declared type the comparison below would be a TEXT comparison and
`'9' > '100'` would be true — the same trap the capability catalogue documents for a
`Decimal` ordered as text. The type is what makes the ORM emit the cast.

Several keys walk a nested path in ONE access (`json_get("owner", "name")`), because every
engine takes a path and two accesses would be two trips through the document.

The key is validated rather than parametrised: it is emitted inside a literal, where no
engine accepts a placeholder, so a key that is not a plain identifier is refused here.

#### `in_`

```python
in_(values: Iterable[T] | SnakeSubquery[T]) -> SnakeInList | SnakeInSubquery
```

`value IN (...)`: a set of values or a scalar SUBQUERY.

An iterable -> values typed to `T`, `SnakeInList`. A `SnakeSubquery[T]` (same `T`) -> `value
IN (SELECT ...)`, `SnakeInSubquery` (the checker rejects a subquery of another type).

#### `is_null`

```python
is_null() -> SnakeIsNull
```

`value IS NULL`. Valid for any expression.

#### `is_not_null`

```python
is_not_null() -> SnakeIsNotNull
```

`value IS NOT NULL`. Valid for any expression.

#### `like`

```python
like(pattern: str) -> SnakeLike
```

`value LIKE pattern`. Only over text expressions (self: SnakeValue[str]).

#### `ilike`

```python
ilike(pattern: str) -> SnakeLike
```

`value ILIKE pattern`: like `like`, but ignoring upper and lower case.

#### `not_in`

```python
not_in(values: Iterable[T]) -> SnakeNot
```

`NOT (value IN (...))`: the NEGATION of the IN, not a new node (one more node would be one more place to forget something).

#### `between`

```python
between(low: T, high: T) -> SnakeAnd
```

`value BETWEEN low AND high` (inclusive), as an AND of two comparisons (no node of its own: equivalent SQL).

#### `startswith`

```python
startswith(value: str) -> SnakeLike
```

`LIKE 'value%'`, with the wildcards of the VALUE escaped.

#### `istartswith`

```python
istartswith(value: str) -> SnakeLike
```

Like `startswith`, but ignoring case.

#### `endswith`

```python
endswith(value: str) -> SnakeLike
```

`LIKE '%value'`, with the wildcards of the VALUE escaped.

#### `iendswith`

```python
iendswith(value: str) -> SnakeLike
```

Like `endswith`, but ignoring case.

#### `contains`

```python
contains(value: str) -> SnakeLike
```

`LIKE '%value%'`, with the wildcards of the VALUE escaped.

#### `icontains`

```python
icontains(value: str) -> SnakeLike
```

Like `contains`, but ignoring case.

#### `asc`

```python
asc() -> SnakeOrder
```

Ascending order key by this expression.

#### `desc`

```python
desc() -> SnakeOrder
```

Descending order key by this expression.

#### `paths`

```python
paths() -> tuple[tuple[str, ...], ...]
```

The argument's and the order's: both of them plan JOINs.

### `string_agg`

```python
string_agg(value: SnakeValue[Any], separator: str = ',', *, order_by: tuple[SnakeOrder, ...] | list[SnakeOrder] = ()) -> SnakeStringAgg[str | None]
```

Joins a group's values into one string: `string_agg(Tag.name, ", ", order_by=[...])`.

`str | None` because an aggregate over no rows is NULL on every engine, exactly like `sum_`.

THE SEPARATOR DOES NOT TRAVEL THE SAME WAY ON THE THREE, which is why the dialect writes this.
On PostgreSQL and SQLite it is a normal argument and goes in `params`; on MySQL it is the
`SEPARATOR` keyword, which was measured to reject a placeholder, so that dialect escapes it
through the same `literal()` the DDL defaults use.

`order_by` is worth passing whenever a person reads the result: without it the order is the
engine's business and can differ between two runs of the same query.

### `count`

```python
count(arg: SnakeValue[Any] | None = None, *, distinct: bool = False) -> SnakeAggregate[int]
```

`COUNT(*)` with no argument; `COUNT(col)` or `COUNT(DISTINCT col)` with one. Always `int`.

### `sum_`

```python
sum_(arg: SnakeValue[T]) -> SnakeAggregate[T | None]
```

`SUM(col)`. Preserves the column's type and adds `None`: with no rows to add up, it is NULL.

### `avg`

```python
avg(arg: SnakeValue[Any]) -> SnakeAggregate[float | None]
```

`AVG(col)`. The average is a real number (`float`), and it is NULL if there are no rows to average.

### `min_`

```python
min_(arg: SnakeValue[T]) -> SnakeAggregate[T | None]
```

`MIN(col)`. Preserves the column's type and adds `None`: with no rows, it is NULL.

### `max_`

```python
max_(arg: SnakeValue[T]) -> SnakeAggregate[T | None]
```

`MAX(col)`. Preserves the column's type and adds `None`: with no rows, it is NULL.

## Window functions

### `row_number`

```python
row_number() -> SnakeWindow[int]
```

`ROW_NUMBER()`: position within the partition, with no ties (1, 2, 3, 4...).

### `rank`

```python
rank() -> SnakeWindow[int]
```

`RANK()`: position with ties, SKIPPING the gaps (1, 2, 2, 4...).

### `dense_rank`

```python
dense_rank() -> SnakeWindow[int]
```

`DENSE_RANK()`: position with ties and NO gaps (1, 2, 2, 3...).

### `lag`

```python
lag(value: SnakeValue[T], offset: int = 1) -> SnakeWindow[T | None]
```

`LAG(value, n)`: the value of the row n positions BEFORE in the window.

Optional: on the first n rows there is no previous one and the result is NULL.

### `lead`

```python
lead(value: SnakeValue[T], offset: int = 1) -> SnakeWindow[T | None]
```

`LEAD(value, n)`: the value of the row n positions AFTER. Optional for the same reason.

## Prefetch

### `SnakePrefetch`

```python
SnakePrefetch(root: SnakeCollection[M]) -> None
```

Bases: `Generic[M]`

EXPLICIT chain of nested (eager) loading that starts at a to-many (`Nation.makers`).

A collection does not expose the child's relations, so the chain is not navigated: it is
declared with `SnakePrefetch(Nation.makers).then(Maker.trucks)`. Generic in the model of the
LAST hop so that `.then(...)` only accepts relations of THAT child. The session resolves it
with ONE query per LEVEL (never N+1).

**Functions:**

- **then** – Chain one more hop onto the current child: to-many (`SnakeCollection`) or to-one
- **filter** – Narrow WHICH CHILDREN get loaded at the CURRENT level (the last hop), WITHOUT dropping
- **hops** – The normalised hops in order (root first). The session walks them, one per level.

#### `then`

```python
then(relation: SnakeCollection[Any] | type[Any]) -> SnakePrefetch[Any]
```

Chain one more hop onto the current child: to-many (`SnakeCollection`) or to-one
(`type`).

It returns a NEW `SnakePrefetch` (immutable). A column (`SnakeExpr`) matches no overload:
`.then(Truck.model)` does not compile.

#### `filter`

```python
filter(condition: SnakeCondition) -> SnakePrefetch[M]
```

Narrow WHICH CHILDREN get loaded at the CURRENT level (the last hop), WITHOUT dropping
parents.

Different from `query.filter()` (which discards parents): it only narrows the select-in of
the level, a parent with no matching children gets [] but STILL comes back. It accumulates
with AND and returns a NEW `SnakePrefetch` (immutable) of the SAME type. The condition must
be over DIRECT columns of the model at THAT level; navigating or naming another column →
`SnakeUnknownColumn`.

#### `hops`

```python
hops() -> tuple[SnakePrefetchHop, ...]
```

The normalised hops in order (root first). The session walks them, one per level.

### `SnakePrefetchHop`

```python
SnakePrefetchHop(name: str, kind: SnakeRelationshipKind, parent_table: SnakeTableInfo, child_model: type[object], child_table: SnakeTableInfo, relationship: SnakeRelationshipInfo, child_filter: SnakeCondition | None = None) -> None
```

A normalised hop of a prefetch chain (already resolved against the metadata graph).

`SnakePrefetch` produces it at construction time (with the relations already linked). The
session consumes it level by level: to_many with select-in (a list per parent), to_one with an
extra query (an object per parent). It carries the parent's table and the child's model+table
(to instantiate it).

**Attributes:**

- **kind** (`SnakeRelationshipKind`) – The same cardinality (and the SAME type) as `SnakeRelationshipInfo`, not a copy of the enum.

#### `kind`

```python
kind: SnakeRelationshipKind
```

The same cardinality (and the SAME type) as `SnakeRelationshipInfo`, not a copy of the enum.

