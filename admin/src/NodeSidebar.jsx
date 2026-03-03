import { useState } from 'react';
import { STATUS_COLORS, STATUS_LABELS, getStatusKey } from './nodeStatus';

export default function NodeSidebar({ node, outgoingEdges = [], onClose, editPostUrl, onUpdateNode, onUpdateEdge, onDeleteEdge, onDeleteNode, onMarkTerminal, onSetStart, onUnmarkTerminal, onClearStart }) {
  const d         = node.data;
  const postId    = node.id.replace('sm-', '');
  const statusKey = getStatusKey(d);
  const color     = STATUS_COLORS[statusKey] || '#888';
  const label     = STATUS_LABELS[statusKey] || 'Unknown';

  const yesEdge = outgoingEdges.find(e => e.data?.answer === 'Yes');
  const noEdge  = outgoingEdges.find(e => e.data?.answer === 'No');

  const [editingQ,      setEditingQ]      = useState(false);
  const [questionDraft, setQuestionDraft] = useState(d.question || '');
  const [saving,        setSaving]        = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft,   setTitleDraft]   = useState(d.label || '');
  const [savingTitle,  setSavingTitle]  = useState(false);

  const [editingCallout, setEditingCallout] = useState(false);
  const [calloutDraft,   setCalloutDraft]   = useState(d.callout || '');
  const [savingCallout,  setSavingCallout]  = useState(false);

  const [editingBody, setEditingBody] = useState(false);
  const [bodyDraft,   setBodyDraft]   = useState(d.rawContent || '');
  const [savingBody,  setSavingBody]  = useState(false);

  const saveQuestion = async () => {
    setSaving(true);
    try {
      const restUrl = window.ctDT?.restUrl;
      if (restUrl) {
        await fetch(`${restUrl}node/${postId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.ctDT?.nonce || '' },
          body: JSON.stringify({ question_text: questionDraft }),
        });
      }
      onUpdateNode?.(node.id, { question: questionDraft });
      setEditingQ(false);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  };

  const saveTitle = async () => {
    setSavingTitle(true);
    try {
      const restUrl = window.ctDT?.restUrl;
      if (restUrl) {
        await fetch(`${restUrl}node/${postId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.ctDT?.nonce || '' },
          body: JSON.stringify({ title: titleDraft }),
        });
      }
      onUpdateNode?.(node.id, { label: titleDraft });
      setEditingTitle(false);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSavingTitle(false);
    }
  };

  const saveCallout = async () => {
    setSavingCallout(true);
    try {
      const restUrl = window.ctDT?.restUrl;
      if (restUrl) {
        await fetch(`${restUrl}node/${postId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.ctDT?.nonce || '' },
          body: JSON.stringify({ callout: calloutDraft }),
        });
      }
      onUpdateNode?.(node.id, { callout: calloutDraft || null });
      setEditingCallout(false);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSavingCallout(false);
    }
  };

  const saveBody = async () => {
    setSavingBody(true);
    try {
      const restUrl = window.ctDT?.restUrl;
      if (restUrl) {
        await fetch(`${restUrl}node/${postId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.ctDT?.nonce || '' },
          body: JSON.stringify({ body_content: bodyDraft }),
        });
      }
      onUpdateNode?.(node.id, { rawContent: bodyDraft, content: bodyDraft });
      setEditingBody(false);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSavingBody(false);
    }
  };

  return (
    <div style={{
      width: 300, padding: 16, borderLeft: '1px solid #ddd',
      background: '#fafafa', overflowY: 'auto', fontSize: 13, flexShrink: 0,
    }}>
      {/* Header with editable title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ flex: 1, paddingRight: 8 }}>
          {editingTitle ? (
            <div>
              <input
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                autoFocus
                style={{ width: '100%', fontSize: 13, fontWeight: 700, padding: '3px 6px', borderRadius: 3, border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                <button onClick={saveTitle} disabled={savingTitle}
                  style={{ background: '#2c6e49', color: '#fff', border: 'none', borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                  {savingTitle ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditingTitle(false)}
                  style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <h3 style={{ margin: 0, fontSize: 14, lineHeight: 1.4 }}>
              {d.label}
              <button onClick={() => { setTitleDraft(d.label); setEditingTitle(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#2c6e49', fontWeight: 600, marginLeft: 6, padding: 0 }}
                title="Edit title"
              >✎</button>
            </h3>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: '#888', flexShrink: 0 }}
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Status badge */}
      <span style={{
        display: 'inline-block', padding: '2px 9px', borderRadius: 12,
        background: color, color: '#fff', fontSize: 11, marginBottom: 10,
      }}>
        {label}
      </span>

      {/* Node actions — contextual buttons based on status */}
      {(() => {
        const canMarkEnd      = statusKey === 'empty'    && !!onMarkTerminal;
        const canUnmark       = statusKey === 'terminal' && !!onUnmarkTerminal;
        const canSetStart     = statusKey !== 'start' && !d.hasIncoming && !!onSetStart;
        const canRemoveStart  = statusKey === 'start' && !!onClearStart;
        if (!canMarkEnd && !canUnmark && !canSetStart && !canRemoveStart) return null;
        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {canRemoveStart && (
              <button
                onClick={() => onClearStart()}
                style={{ background: 'none', border: '1px solid #2c6e49', color: '#2c6e49', borderRadius: 4, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                ↺ Unset start
              </button>
            )}
            {canSetStart && (
              <button
                onClick={() => onSetStart(node.id)}
                style={{ background: '#2c6e49', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                ▶ Set as start
              </button>
            )}
            {canMarkEnd && (
              <button
                onClick={() => onMarkTerminal(node.id)}
                style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                ■ Mark as end
              </button>
            )}
            {canUnmark && (
              <button
                onClick={() => onUnmarkTerminal(node.id)}
                style={{ background: 'none', border: '1px solid #2563eb', color: '#2563eb', borderRadius: 4, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                Remove end
              </button>
            )}
          </div>
        );
      })()}

      {/* Question — inline editable */}
      <Section title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Question prompt
          {!d.isTerminal && !editingQ && (
            <button
              onClick={() => { setQuestionDraft(d.question || ''); setEditingQ(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: '#2c6e49', fontWeight: 600 }}
              title="Edit question"
            >
              ✎ edit
            </button>
          )}
        </span>
      }>
        {editingQ ? (
          <div>
            <textarea
              value={questionDraft}
              onChange={e => setQuestionDraft(e.target.value)}
              rows={4}
              style={{ width: '100%', fontSize: 12, boxSizing: 'border-box', padding: 6, borderRadius: 3, border: '1px solid #ccc', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
              <button
                onClick={saveQuestion}
                disabled={saving}
                style={{ background: '#2c6e49', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setEditingQ(false)}
                style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          d.question
            ? <p style={{ margin: 0, lineHeight: 1.5 }}>{d.question}</p>
            : <p style={{ margin: 0, color: d.isTerminal ? '#888' : '#c0392b', fontStyle: 'italic' }}>
                {d.isTerminal ? 'End node — no question' : '⚠ No question_text set'}
              </p>
        )}
      </Section>

      {/* Yes / No decision paths — editable labels + remove */}
      {!d.isTerminal && (
        <Section title="Decision paths">
          {yesEdge ? (
            <EditablePathRow
              answer="Yes" color="#2c6e49" bg="#eefaf2"
              label={yesEdge.data?.label} edgeId={yesEdge.id}
              sourcePostId={postId} onUpdateEdge={onUpdateEdge}
              onDelete={() => onDeleteEdge?.(yesEdge.id, 'Yes', node.id)}
            />
          ) : (
            <EditablePathRow answer="Yes" color="#c0392b" bg="#fef0f0" label="⚠ not linked" warn />
          )}
          {noEdge ? (
            <EditablePathRow
              answer="No" color="#c0392b" bg="#fef0f0"
              label={noEdge.data?.label} edgeId={noEdge.id}
              sourcePostId={postId} onUpdateEdge={onUpdateEdge}
              onDelete={() => onDeleteEdge?.(noEdge.id, 'No', node.id)}
            />
          ) : (
            <EditablePathRow answer="No" color="#c0392b" bg="#fef0f0" label="⚠ not linked" warn />
          )}
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#aaa', fontStyle: 'italic' }}>
            Drag from a node handle to create a new connection.
          </p>
        </Section>
      )}

      {/* Best practice callout — always shown, editable */}
      <Section title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Best practice callout
          {!editingCallout && (
            <button
              onClick={() => { setCalloutDraft(d.callout || ''); setEditingCallout(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: '#2c6e49', fontWeight: 600 }}
            >
              ✎ {d.callout ? 'edit' : 'add'}
            </button>
          )}
        </span>
      }>
        {editingCallout ? (
          <div>
            <textarea
              value={calloutDraft}
              onChange={e => setCalloutDraft(e.target.value)}
              rows={3}
              placeholder="Best practice note…"
              style={{ width: '100%', fontSize: 12, boxSizing: 'border-box', padding: 6, borderRadius: 3, border: '1px solid #ccc', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
              <button onClick={saveCallout} disabled={savingCallout}
                style={{ background: '#2c6e49', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                {savingCallout ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditingCallout(false)}
                style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          d.callout
            ? <p style={{ margin: 0, lineHeight: 1.5 }}>{d.callout}</p>
            : <p style={{ margin: 0, color: '#aaa', fontStyle: 'italic', fontSize: 12 }}>None set</p>
        )}
      </Section>

      {/* Body content — always shown, editable (plain text / HTML) */}
      <Section title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Body content
          {!editingBody && (
            <button
              onClick={() => { setBodyDraft(d.rawContent || ''); setEditingBody(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: '#2c6e49', fontWeight: 600 }}
            >
              ✎ {d.rawContent ? 'edit' : 'add'}
            </button>
          )}
        </span>
      }>
        {editingBody ? (
          <div>
            <textarea
              value={bodyDraft}
              onChange={e => setBodyDraft(e.target.value)}
              rows={6}
              placeholder="Body copy (HTML supported)…"
              style={{ width: '100%', fontSize: 12, boxSizing: 'border-box', padding: 6, borderRadius: 3, border: '1px solid #ccc', resize: 'vertical', fontFamily: 'monospace' }}
            />
            <p style={{ margin: '4px 0 5px', fontSize: 10, color: '#aaa' }}>HTML tags are allowed (p, strong, em, ul, li…)</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={saveBody} disabled={savingBody}
                style={{ background: '#2c6e49', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                {savingBody ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditingBody(false)}
                style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          d.content
            ? <div style={{ lineHeight: 1.55, fontSize: 12, color: '#444' }} dangerouslySetInnerHTML={{ __html: d.content }} />
            : <p style={{ margin: 0, color: '#aaa', fontStyle: 'italic', fontSize: 12 }}>None set</p>
        )}
      </Section>

      {/* Legislation */}
      {d.legislation && d.legislation.length > 0 && (
        <Section title={`Legislation (${d.legislation.length})`}>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {d.legislation.map((l, i) => (
              <li key={i} style={{ marginBottom: 5, lineHeight: 1.4 }}>
                <a href={l.url} target="_blank" rel="noopener noreferrer"
                   style={{ color: '#2563eb', fontSize: 12 }}>
                  {l.act}{l.section ? ` — ${l.section}` : ''}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Edit link */}
      {editPostUrl && (
        <a
          href={`${editPostUrl}?post=${postId}&action=edit`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block', marginTop: 14, padding: '7px 14px',
            background: '#2c6e49', color: '#fff', borderRadius: 4,
            textDecoration: 'none', fontSize: 12,
          }}
        >
          Edit in WP Admin ↗
        </a>
      )}

      {/* Danger zone */}
      {onDeleteNode && (
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #f5c6c6' }}>
          <button
            onClick={() => onDeleteNode(node.id)}
            style={{
              background: 'none', border: '1px solid #c0392b', color: '#c0392b',
              borderRadius: 4, padding: '6px 12px', fontSize: 12,
              cursor: 'pointer', width: '100%',
            }}
          >
            🗑 Delete this step
          </button>
          <p style={{ margin: '5px 0 0', fontSize: 10, color: '#aaa', textAlign: 'center' }}>
            Moves to WP trash. Existing connections to this step will be removed.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em',
        color: '#999', marginBottom: 5, fontWeight: 600,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function EditablePathRow({ answer, color, bg, label, warn, edgeId, sourcePostId, onUpdateEdge, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(label || '');
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const restUrl = window.ctDT?.restUrl;
      if (restUrl) {
        await fetch(`${restUrl}node/${sourcePostId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.ctDT?.nonce || '' },
          body: JSON.stringify({ decision_label: { answer, text: draft } }),
        });
      }
      onUpdateEdge?.(edgeId, { label: draft });
      setEditing(false);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginBottom: 8, fontSize: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          background: bg, border: `1px solid ${color}`, color,
          borderRadius: 10, padding: '1px 7px', fontWeight: 700,
          fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {answer}
        </span>
        {!editing && !warn && (
          <>
            <span style={{ color: '#444', flex: 1 }}>{label || '—'}</span>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              {edgeId && (
                <button
                  onClick={() => { setDraft(label || ''); setEditing(true); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: '#2c6e49', fontWeight: 600 }}
                  title="Edit label"
                >✎</button>
              )}
              {edgeId && onDelete && (
                <button
                  onClick={() => window.confirm(`Remove the ${answer} connection from this node?`) && onDelete()}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, color: '#c0392b', fontWeight: 700, lineHeight: 1 }}
                  title="Remove connection"
                >×</button>
              )}
            </div>
          </>
        )}
        {!editing && warn && (
          <span style={{ color: '#c0392b', fontStyle: 'italic' }}>{label}</span>
        )}
      </div>
      {editing && (
        <div style={{ marginTop: 5 }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            autoFocus
            style={{ width: '100%', fontSize: 12, padding: '3px 6px', borderRadius: 3, border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
            <button onClick={save} disabled={saving}
              style={{ background: '#2c6e49', color: '#fff', border: 'none', borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)}
              style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Keep plain PathRow for any other uses
function PathRow({ answer, color, bg, label, warn }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 6,
      marginBottom: 6, fontSize: 12,
    }}>
      <span style={{
        background: bg, border: `1px solid ${color}`, color,
        borderRadius: 10, padding: '1px 7px', fontWeight: 700,
        fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {answer}
      </span>
      <span style={{ color: warn ? '#c0392b' : '#444', fontStyle: warn ? 'italic' : 'normal' }}>
        {label || '—'}
      </span>
    </div>
  );
}
