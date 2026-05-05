# Code Guidelines

- Avoid using `!` — use `== false` or `== null` instead
- Use `val` as local variable in lambdas instead of `it`
- Add empty line before `return` and `expect`
- Use empty line before and after `if` that returns, unless several are in a row
- Use flat structure for `if` statements instead of nested when possible
- Break early with `if return` at the top of a function to avoid wrapping the rest
- Use lambda functions when functions are short or straightforward
- Use helper functions instead of computations in templates — templates are for representation, not logic
- Avoid single-letter variables — use short descriptive names: `num`, `val`, `evt`, etc.
- File names use lowercase with underscores: `list_view.jsx`, `image_cache.js`
- Class / component names use PascalCase: `ListView`, `ItemsList`, `App`
