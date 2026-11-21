import { useId, useState, type FormEvent } from "react";
import { createId } from "../lib/ids.ts";
import { symbolChoices, symbolName } from "../lib/symbols.ts";
import { useBoard } from "../state/BoardContext.tsx";
import { MAX_BRIEF, MAX_CATEGORY, MAX_FULL, MAX_LABEL, type Category, type Phrase } from "../types.ts";
import { StatusLine } from "./StatusLine.tsx";
import { Symbol } from "./Symbol.tsx";

interface PhraseFields {
  label: string;
  brief: string;
  full: string;
  categoryId: string;
  symbol: string;
}

const emptyFields: PhraseFields = { label: "", brief: "", full: "", categoryId: "", symbol: "" };

function fieldErrors(fields: PhraseFields, categories: Category[]): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!fields.label.trim()) errors.label = "Add a short name for this button.";
  else if (fields.label.trim().length > MAX_LABEL) errors.label = `Use ${MAX_LABEL} characters or fewer.`;
  if (!fields.brief.trim() && !fields.full.trim()) errors.brief = "Add the words this button should insert.";
  if (fields.brief.trim().length > MAX_BRIEF) errors.brief = `Use ${MAX_BRIEF} characters or fewer.`;
  if (fields.full.trim().length > MAX_FULL) errors.full = `Use ${MAX_FULL} characters or fewer.`;
  if (!categories.some((category) => category.id === fields.categoryId)) errors.categoryId = "Choose a category.";
  return errors;
}

export function EditBoard({
  categories,
  phrases,
  active,
}: {
  categories: Category[];
  phrases: Phrase[];
  active: string;
}) {
  const { dispatch } = useBoard();
  const [status, setStatus] = useState("");
  const [undo, setUndo] = useState<Phrase | null>(null);
  const fallback = categories.find((category) => category.id === "mine")?.id ?? categories[0]?.id ?? "";
  const defaultCategory = active === "favorites" ? fallback : active;

  function undoDelete() {
    if (!undo) return;
    if (!categories.some((category) => category.id === undo.categoryId)) {
      setStatus("That category is gone, so the button stayed deleted.");
      setUndo(null);
      return;
    }
    dispatch({ type: "restore-phrase", phrase: undo });
    setStatus(`Brought “${undo.label}” back.`);
    setUndo(null);
  }

  return (
    <div className="editor">
      <p className="help">
        Editing this board. Buttons are not added to the message until you go back to Using buttons.
      </p>
      <StatusLine message={status}>
        {undo ? (
          <button type="button" className="btn" onClick={undoDelete}>
            Undo delete
          </button>
        ) : null}
      </StatusLine>

      {categories.length === 0 ? (
        <p className="help">Add a category below before you add a button.</p>
      ) : (
        <NewPhraseForm
          categories={categories}
          defaultCategory={defaultCategory}
          onAdded={(label) => {
            setUndo(null);
            setStatus(`Added “${label}”.`);
          }}
        />
      )}

      {active === "favorites" ? (
        <p className="help">Reorder a button from its own category. Favorite and calm mode can be changed here.</p>
      ) : null}

      {phrases.length === 0 ? (
        <p className="help">
          {active === "favorites" ? "No favorites yet." : "No buttons in this category yet."}
        </p>
      ) : (
        <ul className="edit-list">
          {phrases.map((phrase, index) => (
            <li key={phrase.id}>
              <PhraseCard
                phrase={phrase}
                categories={categories}
                canMove={active !== "favorites"}
                canMoveUp={index > 0}
                canMoveDown={index < phrases.length - 1}
                onDelete={(item) => {
                  setUndo(item);
                  dispatch({ type: "delete-phrase", id: item.id });
                  setStatus(`Deleted “${item.label}”.`);
                }}
                onStatus={setStatus}
              />
            </li>
          ))}
        </ul>
      )}

      <CategoryEditor categories={categories} onStatus={setStatus} />
    </div>
  );
}

function NewPhraseForm({
  categories,
  defaultCategory,
  onAdded,
}: {
  categories: Category[];
  defaultCategory: string;
  onAdded: (label: string) => void;
}) {
  const { dispatch } = useBoard();
  const baseId = useId();
  const [fields, setFields] = useState<PhraseFields>({ ...emptyFields, categoryId: defaultCategory });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categorySource, setCategorySource] = useState(defaultCategory);

  if (defaultCategory !== categorySource) {
    setCategorySource(defaultCategory);
    setFields((current) => ({ ...current, categoryId: defaultCategory }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = fieldErrors(fields, categories);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const label = fields.label.trim();
    const brief = fields.brief.trim() || fields.full.trim();
    dispatch({
      type: "add-phrase",
      phrase: {
        id: createId("phrase"),
        categoryId: fields.categoryId,
        label,
        brief,
        full: fields.full.trim(),
        symbol: fields.symbol,
        sample: false,
        favorite: false,
        calm: false,
        order: 0,
      },
    });
    setFields({ ...emptyFields, categoryId: fields.categoryId, symbol: "" });
    setErrors({});
    onAdded(label);
  }

  return (
    <form className="edit-card" onSubmit={submit}>
      <h3>New button</h3>
      <PhraseFieldsForm
        baseId={baseId}
        fields={fields}
        errors={errors}
        categories={categories}
        onChange={(next) => {
          setFields(next);
          setErrors({});
        }}
      />
      <button type="submit" className="btn btn-primary">
        Add button
      </button>
    </form>
  );
}

function PhraseCard({
  phrase,
  categories,
  canMove,
  canMoveUp,
  canMoveDown,
  onDelete,
  onStatus,
}: {
  phrase: Phrase;
  categories: Category[];
  canMove: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDelete: (phrase: Phrase) => void;
  onStatus: (message: string) => void;
}) {
  const { dispatch } = useBoard();
  const baseId = useId();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [fields, setFields] = useState<PhraseFields>({
    label: phrase.label,
    brief: phrase.brief,
    full: phrase.full,
    categoryId: phrase.categoryId,
    symbol: phrase.symbol,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const categoryName = categories.find((category) => category.id === phrase.categoryId)?.name;

  function patch(partial: Partial<Phrase>, message: string) {
    dispatch({ type: "update-phrase", phrase: { ...phrase, ...partial } });
    onStatus(message);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const nextErrors = fieldErrors(fields, categories);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    dispatch({
      type: "update-phrase",
      phrase: {
        ...phrase,
        label: fields.label.trim(),
        brief: fields.brief.trim() || fields.full.trim(),
        full: fields.full.trim(),
        symbol: fields.symbol,
        categoryId: fields.categoryId,
      },
    });
    setEditing(false);
    onStatus(`Saved changes to “${fields.label.trim()}”.`);
  }

  return (
    <article className="edit-card">
      <div className="edit-preview">
        <Symbol id={phrase.symbol} label={phrase.label} />
        <p className="phrase-title">{phrase.label}</p>
      </div>
      <p className="phrase-body">{phrase.brief}</p>
      {phrase.full && phrase.full !== phrase.brief ? <p className="help">{phrase.full}</p> : null}
      <p className="flag">
        {categoryName}
        {phrase.sample ? " · Sample" : ""}
        {phrase.favorite ? " · Favorite" : ""}
        {phrase.calm ? " · In calm mode" : ""}
      </p>
      <div className="actions">
        {canMove ? (
          <>
            <button
              type="button"
              className="btn"
              disabled={!canMoveUp}
              onClick={() => dispatch({ type: "move-phrase", id: phrase.id, direction: -1 })}
            >
              Move up
            </button>
            <button
              type="button"
              className="btn"
              disabled={!canMoveDown}
              onClick={() => dispatch({ type: "move-phrase", id: phrase.id, direction: 1 })}
            >
              Move down
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="btn"
          aria-pressed={phrase.favorite}
          onClick={() => patch({ favorite: !phrase.favorite }, phrase.favorite ? "Removed from favorites." : "Marked as a favorite.")}
        >
          {phrase.favorite ? "Favorite" : "Not a favorite"}
        </button>
        <button
          type="button"
          className="btn"
          aria-pressed={phrase.calm}
          onClick={() =>
            patch(
              { calm: !phrase.calm },
              phrase.calm ? "Removed from calm mode." : "This button will show in calm mode.",
            )
          }
        >
          {phrase.calm ? "In calm mode" : "Not in calm mode"}
        </button>
        <button
          type="button"
          className="btn"
          aria-expanded={editing}
          onClick={() => {
            setEditing((open) => !open);
            setConfirming(false);
            setFields({
              label: phrase.label,
              brief: phrase.brief,
              full: phrase.full,
              categoryId: phrase.categoryId,
              symbol: phrase.symbol,
            });
            setErrors({});
          }}
        >
          {editing ? "Close editor" : "Edit this button"}
        </button>
        {confirming ? (
          <>
            <button type="button" className="btn btn-danger" onClick={() => onDelete(phrase)}>
              Delete
            </button>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              Keep
            </button>
          </>
        ) : (
          <button type="button" className="btn" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </div>
      {editing ? (
        <form className="stack" onSubmit={save}>
          <PhraseFieldsForm
            baseId={baseId}
            fields={fields}
            errors={errors}
            categories={categories}
            onChange={(next) => {
              setFields(next);
              setErrors({});
            }}
          />
          <div className="actions">
            <button type="submit" className="btn btn-primary">
              Save changes
            </button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}

function PhraseFieldsForm({
  baseId,
  fields,
  errors,
  categories,
  onChange,
}: {
  baseId: string;
  fields: PhraseFields;
  errors: Record<string, string>;
  categories: Category[];
  onChange: (fields: PhraseFields) => void;
}) {
  return (
    <div className="stack">
      <div className="field">
        <span className="field-label" id={`${baseId}-picture`}>
          Picture
        </span>
        <div className="symbol-picker" role="group" aria-labelledby={`${baseId}-picture`}>
          <button
            type="button"
            className="symbol-choice"
            aria-pressed={fields.symbol === ""}
            aria-label="Letter placeholder"
            onClick={() => onChange({ ...fields, symbol: "" })}
          >
            <Symbol id="" label={fields.label || "A"} />
          </button>
          {symbolChoices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="symbol-choice"
              aria-pressed={fields.symbol === choice.id}
              aria-label={choice.name}
              onClick={() => onChange({ ...fields, symbol: choice.id })}
            >
              <Symbol id={choice.id} label="" />
            </button>
          ))}
        </div>
        <p className="help">
          {fields.symbol ? symbolName(fields.symbol) : "Letter placeholder"}. The short name stays under the picture.
        </p>
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${baseId}-label`}>
          Short name
        </label>
        <input
          id={`${baseId}-label`}
          value={fields.label}
          maxLength={MAX_LABEL}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(errors.label)}
          aria-describedby={errors.label ? `${baseId}-label-error` : undefined}
          onChange={(event) => onChange({ ...fields, label: event.target.value })}
        />
        {errors.label ? (
          <p id={`${baseId}-label-error`} className="error">
            {errors.label}
          </p>
        ) : null}
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${baseId}-brief`}>
          Direct and brief
        </label>
        <textarea
          id={`${baseId}-brief`}
          value={fields.brief}
          maxLength={MAX_BRIEF}
          rows={3}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(errors.brief)}
          aria-describedby={`${baseId}-brief-help${errors.brief ? ` ${baseId}-brief-error` : ""}`}
          onChange={(event) => onChange({ ...fields, brief: event.target.value })}
        />
        <p id={`${baseId}-brief-help`} className="help">
          The shorter line. Used when Direct and brief is on.
        </p>
        {errors.brief ? (
          <p id={`${baseId}-brief-error`} className="error">
            {errors.brief}
          </p>
        ) : null}
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${baseId}-full`}>
          Full context
        </label>
        <textarea
          id={`${baseId}-full`}
          value={fields.full}
          maxLength={MAX_FULL}
          rows={3}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(errors.full)}
          aria-describedby={`${baseId}-full-help${errors.full ? ` ${baseId}-full-error` : ""}`}
          onChange={(event) => onChange({ ...fields, full: event.target.value })}
        />
        <p id={`${baseId}-full-help`} className="help">
          Optional. If you leave this empty, both modes add the direct line.
        </p>
        {errors.full ? (
          <p id={`${baseId}-full-error`} className="error">
            {errors.full}
          </p>
        ) : null}
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${baseId}-category`}>
          Category
        </label>
        <select
          id={`${baseId}-category`}
          value={fields.categoryId}
          aria-invalid={Boolean(errors.categoryId)}
          aria-describedby={errors.categoryId ? `${baseId}-category-error` : undefined}
          onChange={(event) => onChange({ ...fields, categoryId: event.target.value })}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.categoryId ? (
          <p id={`${baseId}-category-error`} className="error">
            {errors.categoryId}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CategoryEditor({
  categories,
  onStatus,
}: {
  categories: Category[];
  onStatus: (message: string) => void;
}) {
  const { board, dispatch } = useBoard();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function addCategory(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name the category.");
      return;
    }
    if (trimmed.length > MAX_CATEGORY) {
      setError(`Use ${MAX_CATEGORY} characters or fewer.`);
      return;
    }
    if (categories.some((category) => category.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("There's already a category with that name.");
      return;
    }
    dispatch({ type: "add-category", id: createId("category"), name: trimmed });
    setName("");
    setError("");
    onStatus(`Added the category “${trimmed}”.`);
  }

  return (
    <div className="category-editor">
      <h3>Categories</h3>
      <p className="help">Sample categories stay on the board. You can rename them, and you can add your own.</p>
      <ul className="edit-list">
        {categories.map((category, index) => (
          <CategoryRow
            key={category.id}
            category={category}
            phraseCount={board.phrases.filter((phrase) => phrase.categoryId === category.id).length}
            canMoveUp={index > 0}
            canMoveDown={index < categories.length - 1}
            onStatus={onStatus}
          />
        ))}
      </ul>
      <form className="stack" onSubmit={addCategory}>
        <div className="field">
          <label className="field-label" htmlFor="new-category">
            New category
          </label>
          <input
            id="new-category"
            value={name}
            maxLength={MAX_CATEGORY}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "new-category-error" : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
          {error ? (
            <p id="new-category-error" className="error">
              {error}
            </p>
          ) : null}
        </div>
        <button type="submit" className="btn">
          Add category
        </button>
      </form>
    </div>
  );
}

function CategoryRow({
  category,
  phraseCount,
  canMoveUp,
  canMoveDown,
  onStatus,
}: {
  category: Category;
  phraseCount: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onStatus: (message: string) => void;
}) {
  const { board, dispatch } = useBoard();
  const [name, setName] = useState(category.name);
  const [sourceName, setSourceName] = useState(category.name);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const inputId = `rename-${category.id}`;

  if (category.name !== sourceName) {
    setSourceName(category.name);
    setName(category.name);
  }

  function rename(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name the category.");
      return;
    }
    if (trimmed === category.name) return;
    if (
      board.categories.some(
        (item) => item.id !== category.id && item.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      setError("There's already a category with that name.");
      return;
    }
    dispatch({ type: "rename-category", id: category.id, name: trimmed });
    onStatus(`Renamed to “${trimmed}”.`);
  }

  const deleteReason = category.sample
    ? "Sample categories stay, so the board always has a place to start."
    : phraseCount > 0
      ? `Move or delete the ${phraseCount} ${phraseCount === 1 ? "button" : "buttons"} in this category first.`
      : "";

  return (
    <li className="edit-card">
      <form className="rename-row" onSubmit={rename}>
        <div className="field">
          <label className="field-label" htmlFor={inputId}>
            Category name
          </label>
          <input
            id={inputId}
            value={name}
            maxLength={MAX_CATEGORY}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
          {error ? <p className="error">{error}</p> : null}
        </div>
        <button type="submit" className="btn">
          Rename
        </button>
      </form>
      <div className="actions">
        <button
          type="button"
          className="btn"
          disabled={!canMoveUp}
          onClick={() => dispatch({ type: "move-category", id: category.id, direction: -1 })}
        >
          Move up
        </button>
        <button
          type="button"
          className="btn"
          disabled={!canMoveDown}
          onClick={() => dispatch({ type: "move-category", id: category.id, direction: 1 })}
        >
          Move down
        </button>
        {deleteReason ? (
          <p className="help">{deleteReason}</p>
        ) : confirming ? (
          <>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                dispatch({ type: "delete-category", id: category.id });
                onStatus(`Deleted the category “${category.name}”.`);
              }}
            >
              Delete category
            </button>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              Keep
            </button>
          </>
        ) : (
          <button type="button" className="btn" onClick={() => setConfirming(true)}>
            Delete category
          </button>
        )}
      </div>
    </li>
  );
}
