import { tqAsset } from '@/apps/tq-enhancement/lib/bank';
import type { AddedVariant, QuestionWork, TqItem, TqVariant, VariantNote } from '@/apps/tq-enhancement/lib/types';
import { emptyNote } from '@/apps/tq-enhancement/lib/types';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function Verdict({
  isGood,
  label,
  onChange,
}: {
  isGood: boolean | null;
  label: string;
  onChange: (next: boolean | null) => void;
}) {
  return (
    <div className="tq-verdict" role="group" aria-label={label}>
      <button
        type="button"
        className={isGood === true ? 'good on' : 'good'}
        aria-pressed={isGood === true}
        onClick={() => onChange(isGood === true ? null : true)}
      >
        Good
      </button>
      <button
        type="button"
        className={isGood === false ? 'bad on' : 'bad'}
        aria-pressed={isGood === false}
        onClick={() => onChange(isGood === false ? null : false)}
      >
        Not good
      </button>
    </div>
  );
}

function VariantBody({ item, variant }: { item: TqItem; variant: TqVariant }) {
  const showKeyed = item.group !== 'intake';

  return (
    <>
      <p className="tq-stem">{variant.stem}</p>
      {variant.image ? (
        <img
          className="tq-figure"
          src={tqAsset(variant.image)}
          alt={`${variant.label} for question ${item.order}`}
          loading="lazy"
        />
      ) : null}
      {variant.figure ? <p className="tq-figure-note">{variant.figure}</p> : null}
      {variant.choices.length > 0 ? (
        <ol className="tq-choices">
          {variant.choices.map((choice) => (
            <li key={choice.letter} className={showKeyed && choice.keyed ? 'keyed' : ''}>
              <span className="tq-letter">{choice.letter}</span>
              <span>
                {choice.image ? (
                  <img
                    className="tq-choice-image"
                    src={tqAsset(choice.image)}
                    alt={`Choice ${choice.letter} for question ${item.order}`}
                    loading="lazy"
                  />
                ) : null}
                {choice.text}
                {showKeyed && choice.keyed ? <span className="tq-keyed">Keyed</span> : null}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="tq-empty">Open response</p>
      )}
    </>
  );
}

function BankVariantCard({
  item,
  variant,
  note,
  onChange,
}: {
  item: TqItem;
  variant: TqVariant;
  note: VariantNote;
  onChange: (next: VariantNote, immediate?: boolean) => void;
}) {
  const tone = note.isGood === true ? ' good' : note.isGood === false ? ' not-good' : '';

  return (
    <article className={`tq-card${tone}`}>
      <h3>{variant.label}</h3>
      <VariantBody item={item} variant={variant} />
      <Verdict
        isGood={note.isGood}
        label={`Is ${variant.label} good?`}
        onChange={(isGood) => onChange({ ...note, isGood }, true)}
      />
      <label className="tq-comment">
        <span>Comment on {variant.label}</span>
        <textarea
          value={note.comment}
          rows={3}
          placeholder="What works, or what should change."
          onChange={(event) => onChange({ ...note, comment: event.target.value })}
        />
      </label>
    </article>
  );
}

function AddedVariantCard({
  item,
  variant,
  index,
  recommendation,
  onChange,
  onRemove,
}: {
  item: TqItem;
  variant: AddedVariant;
  index: number;
  recommendation: boolean;
  onChange: (next: AddedVariant, immediate?: boolean) => void;
  onRemove: () => void;
}) {
  const noun = recommendation ? 'recommendation' : 'variant';
  const tone = variant.isGood === true ? ' good' : variant.isGood === false ? ' not-good' : '';

  function setChoice(choiceIndex: number, text: string) {
    const choices = variant.choices.slice();
    choices[choiceIndex] = text;
    onChange({ ...variant, choices });
  }

  return (
    <article className={`tq-card tq-added${tone}`}>
      <header className="tq-item-head">
        <h3>Your {noun} {index + 1}</h3>
        <button type="button" className="tq-remove" onClick={onRemove}>
          Remove
        </button>
      </header>
      <label className="tq-comment">
        <span>Stem</span>
        <textarea
          value={variant.stem}
          rows={3}
          onChange={(event) => onChange({ ...variant, stem: event.target.value })}
        />
      </label>
      <label className="tq-comment">
        <span>Figure note</span>
        <textarea
          value={variant.figure}
          rows={2}
          placeholder="Describe the image if this variant needs one."
          onChange={(event) => onChange({ ...variant, figure: event.target.value })}
        />
      </label>
      <fieldset className="tq-edit">
        <legend>Choices</legend>
        {variant.choices.map((choice, choiceIndex) => (
          <label key={`${variant.id}-${choiceIndex}`}>
            <span>{String.fromCharCode(97 + choiceIndex)}</span>
            <textarea
              value={choice}
              rows={2}
              onChange={(event) => setChoice(choiceIndex, event.target.value)}
            />
          </label>
        ))}
        <div className="tq-verdict">
          <button
            type="button"
            onClick={() => onChange({ ...variant, choices: [...variant.choices, ''] })}
          >
            Add a choice
          </button>
          {variant.choices.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange({ ...variant, choices: variant.choices.slice(0, -1) })}
            >
              Remove last choice
            </button>
          ) : null}
        </div>
      </fieldset>
      {recommendation ? null : (
        <Verdict
          isGood={variant.isGood}
          label={`Is your ${noun} ${index + 1} good?`}
          onChange={(isGood) => onChange({ ...variant, isGood }, true)}
        />
      )}
      <label className="tq-comment">
        <span>Comment</span>
        <textarea
          value={variant.comment}
          rows={3}
          placeholder={recommendation ? 'Anything else about this recommendation.' : 'Why you added this, or what still needs work.'}
          onChange={(event) => onChange({ ...variant, comment: event.target.value })}
        />
      </label>
      {item.variants[0]?.choices.length ? (
        <p className="tq-empty">Keep the keyed choice in the same position as the original.</p>
      ) : null}
    </article>
  );
}

export function QuestionReview({
  item,
  work,
  status,
  onFeedback,
  onAddedChange,
  onAdd,
  onRemove,
}: {
  item: TqItem;
  work: QuestionWork;
  status: SaveState;
  onFeedback: (variantKey: string, note: VariantNote, immediate?: boolean) => void;
  onAddedChange: (variant: AddedVariant, immediate?: boolean) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const statusText =
    status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved to your copy' : status === 'error' ? 'Could not save' : '';
  const recommend = item.mode === 'recommend';
  const marked = item.variants.filter((variant) => work.feedback[variant.id]?.isGood != null).length;
  const original = item.variants.find((variant) => variant.id === 'original') ?? item.variants[0];

  return (
    <section className="tq-item" id={`q${item.order}`} data-group={item.group}>
      <header className="tq-item-head">
        <div>
          <h2>Question {item.order}</h2>
          <p className="tq-meta">
            {item.category} · {item.scoring} · {item.qtype.replaceAll('_', ' ')}
            {marked > 0 ? ` · ${marked} marked` : ''}
          </p>
        </div>
        <p className={`tq-save${status === 'error' ? ' bad' : ''}`} aria-live="polite">
          {statusText}
        </p>
      </header>

      {item.note ? <p className="tq-note">{item.note}</p> : null}
      {recommend ? <p className="tq-note">Drafts are off for this question. Add your recommendation below.</p> : null}

      <div className="tq-grid">
        {recommend && original ? (
          <article className="tq-card">
            <h3>Original</h3>
            <VariantBody item={item} variant={original} />
          </article>
        ) : (
          item.variants.map((variant) => (
            <BankVariantCard
              key={variant.id}
              item={item}
              variant={variant}
              note={work.feedback[variant.id] ?? emptyNote()}
              onChange={(note, immediate) => onFeedback(variant.id, note, immediate)}
            />
          ))
        )}
      </div>

      <div className="tq-added-list">
        {work.added.map((variant, index) => (
          <AddedVariantCard
            key={variant.id}
            item={item}
            variant={variant}
            index={index}
            recommendation={recommend}
            onChange={onAddedChange}
            onRemove={() => onRemove(variant.id)}
          />
        ))}
      </div>

      <button type="button" className="tq-add" onClick={onAdd}>
        {recommend ? 'Add a recommendation' : 'Add a variant'}
      </button>
    </section>
  );
}
