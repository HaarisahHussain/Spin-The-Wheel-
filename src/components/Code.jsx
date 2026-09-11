import Prism from 'prismjs';
import { useMemo } from 'react';
import { cx } from './ui';
const colours = {
  keyword: 'text-[#164CAD]',
  string: 'text-[#9B321B]',
  number: 'text-[#176A46]',
  boolean: 'text-[#164CAD]',
  function: 'text-[#795400]',
  comment: 'text-[#62625C]',
  operator: 'text-[#252525]',
  punctuation: 'text-[#62625C]',
  property: 'text-[#315C77]',
};
function Tokens({ tokens }) {
  return tokens.map((token, i) =>
    typeof token === 'string' ? (
      token
    ) : (
      <span key={i} className={colours[token.type] || 'text-[#252525]'}>
        {Array.isArray(token.content) ? <Tokens tokens={token.content} /> : token.content}
      </span>
    ),
  );
}
export function Code({
  code,
  selectable = false,
  selected = null,
  onSelect,
  locked = false,
  display = false,
  correctLine = null,
}) {
  const lines = useMemo(
    () => code.split('\n').map((line) => Prism.tokenize(line, Prism.languages.javascript)),
    [code],
  );
  return (
    <div
      className={cx(
        'overflow-x-auto rounded-xl border border-[#DDDDD5] bg-white py-4 font-mono leading-relaxed',
        display ? 'text-[clamp(16px,1.8vw,27px)]' : 'text-sm sm:text-base',
      )}
    >
      {lines.map((tokens, i) => {
        const classes = cx(
          'flex min-w-max items-start gap-4 px-4 py-1 text-left',
          selectable &&
            'min-h-11 w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-[#365E53]',
          String(selected) === String(i) && 'bg-[#E9EDE6]',
          String(correctLine) === String(i) && 'bg-[#DDEBE0]',
        );
        const content = (
          <>
            <span aria-hidden="true" className="w-5 shrink-0 select-none text-right text-[#818177]">
              {i + 1}
            </span>
            <span className="whitespace-pre">
              <Tokens tokens={tokens} />
            </span>
          </>
        );
        return selectable ? (
          <button
            key={i}
            type="button"
            aria-label={`Line ${i + 1}`}
            aria-pressed={String(selected) === String(i)}
            disabled={locked}
            onClick={() => onSelect(String(i))}
            className={classes}
          >
            {content}
          </button>
        ) : (
          <div key={i} className={classes}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
