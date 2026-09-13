// Deliberately small Python-like AST. No eval, imported code, attributes or unbounded loops.
export const variable = (name) => ({ var: name });
export const expression = (op, a, b) => ({ op, a, b });
export function value(x, env) {
  if (typeof x !== 'object' || x === null) return x;
  if (Array.isArray(x)) return x.map((v) => value(v, env));
  if (x.var) return env[x.var];
  const a = value(x.a, env),
    b = value(x.b, env);
  switch (x.op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '==':
      return a === b;
    case '!=':
      return a !== b;
    case 'index':
      return a[b];
    default:
      throw Error('Unknown expression');
  }
}
export function python(x) {
  if (Array.isArray(x)) return `[${x.map(python).join(', ')}]`;
  if (typeof x === 'boolean') return x ? 'True' : 'False';
  if (typeof x === 'number') return String(x);
  if (x.var) return x.var;
  if (x.op === 'index') return `${python(x.a)}[${python(x.b)}]`;
  return `${x.a?.op && x.a.op !== 'index' ? `(${python(x.a)})` : python(x.a)} ${x.op} ${x.b?.op && x.b.op !== 'index' ? `(${python(x.b)})` : python(x.b)}`;
}
export function render(program) {
  const lines = [],
    lineIds = [];
  const visit = (nodes, depth) => {
    for (const n of nodes) {
      const put = (s) => {
        lines.push('    '.repeat(depth) + s);
        lineIds.push(n.id);
      };
      if (n.type === 'set') put(`${n.name} = ${python(n.value)}`);
      if (n.type === 'print') put(`print(${python(n.value)})`);
      if (n.type === 'if') {
        put(`if ${python(n.test)}:`);
        visit(n.yes, depth + 1);
        if (n.no?.length) {
          lines.push('    '.repeat(depth) + 'else:');
          lineIds.push(null);
          visit(n.no, depth + 1);
        }
      }
      if (n.type === 'for') {
        put(`for ${n.name} in ${python(n.values)}:`);
        visit(n.body, depth + 1);
      }
    }
  };
  visit(program, 0);
  return { code: lines.join('\n'), lineIds };
}
export function executeProgram(program) {
  const env = {},
    trace = [];
  let output,
    operations = 0;
  const visit = (nodes) => {
    for (const n of nodes) {
      if (++operations > 150) throw Error('Program bound exceeded');
      if (n.type === 'set') {
        env[n.name] = value(n.value, env);
        trace.push({ id: n.id, name: n.name, value: env[n.name] });
      } else if (n.type === 'print') output = python(value(n.value, env));
      else if (n.type === 'if') visit(value(n.test, env) ? n.yes : n.no || []);
      else if (n.type === 'for') {
        const items = value(n.values, env);
        if (!Array.isArray(items) || items.length > 5) throw Error('Invalid loop');
        for (const item of items) {
          env[n.name] = item;
          visit(n.body);
        }
      }
    }
  };
  visit(program);
  return { output, trace, env };
}
export function replaceStatement(program, id, replacement) {
  return program.map((n) =>
    n.id === id
      ? { ...replacement, id }
      : {
          ...n,
          ...(n.yes
            ? {
                yes: replaceStatement(n.yes, id, replacement),
                no: replaceStatement(n.no || [], id, replacement),
              }
            : {}),
          ...(n.body ? { body: replaceStatement(n.body, id, replacement) } : {}),
        },
  );
}
