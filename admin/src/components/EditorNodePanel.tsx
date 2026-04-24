import { useEffect, useRef, useState } from 'react';
import { STATUS_COLORS, STATUS_COLORS_BUTTON, STATUS_LABELS, EDGE_COLORS, CHROME, getStatusKey } from '../config/theme';
import { decodeEntities } from '../utils/htmlUtils';
import DecisionPathCards from './DecisionPathCards';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import type { Node, Edge } from 'reactflow';
import type { StepData, EdgeData, Legislation } from '../types';

interface EditorNodePanelProps {
  node: Node<StepData>;
  outgoingEdges?: Edge<EdgeData>[];
  onClose: () => void;
  editPostUrl?: string;
  onUpdateNode: (nodeId: string, patch: Partial<StepData>) => void;
  onUpdateEdge: (edgeId: string, patch: Record<string, unknown>) => void;
  onDeleteEdge: (edgeId: string, answer: string, sourceNodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onMarkTerminal: (nodeId: string) => void;
  onSetStart: (nodeId: string) => void;
  onUnmarkTerminal: (nodeId: string) => void;
  onClearStart: () => void;
  onSelectNode?: (nodeId: string) => void;
}

export default function EditorNodePanel({ node, outgoingEdges = [], onClose, editPostUrl, onUpdateNode, onUpdateEdge, onDeleteEdge, onDeleteNode, onMarkTerminal, onSetStart, onUnmarkTerminal, onClearStart, onSelectNode }: EditorNodePanelProps) {
  const d         = node.data;
  const postId    = node.id.replace('sm-', '');
  const statusKey = getStatusKey(d);
  const color      = STATUS_COLORS[statusKey] || '#888';
  const label      = STATUS_LABELS[statusKey] || 'Unknown';

  const yesEdge = outgoingEdges.find(e => e.data?.answer === 'Yes');
  const noEdges  = outgoingEdges.filter(e => e.data?.answer === 'No');

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

  // Legislation management has more complex state due to the array structure and JSON import mode
  const [editingLeg,   setEditingLeg]   = useState(false);
  const [legDraft,     setLegDraft]     = useState<Legislation[]>([]);
  const [legSaving,    setLegSaving]    = useState(false);
  const [legJsonMode,  setLegJsonMode]  = useState(false);
  const [legJsonDraft, setLegJsonDraft] = useState('');
  const [legJsonError, setLegJsonError] = useState('');
  const [legCopied,    setLegCopied]    = useState(false);

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft,   setNotesDraft]   = useState(d.adminNotes || '');
  const [savingNotes,  setSavingNotes]  = useState(false);

  const [editingPaths,  setEditingPaths]  = useState(false);
  const [yesDraft,      setYesDraft]      = useState(yesEdge?.data?.label || '');
  // noDrafts: map of edgeId → label draft (supports multiple No edges)
  const [noDrafts,      setNoDrafts]      = useState<Record<string, string>>(
    () => Object.fromEntries(noEdges.map(e => [e.id, e.data?.label || '']))
  );
  const [savingPaths,   setSavingPaths]   = useState(false);

  useEffect(() => {
    setQuestionDraft(d.question || '');
    setCalloutDraft(d.callout || '');
    setBodyDraft(d.rawContent || d.content || '');
    setNotesDraft(d.adminNotes || '');
    setYesDraft(yesEdge?.data?.label || '');
    setNoDrafts(Object.fromEntries(noEdges.map(e => [e.id, e.data?.label || ''])));
  }, [d.question, d.callout, d.rawContent, d.content, d.adminNotes, yesEdge?.data?.label, JSON.stringify(noEdges.map(e => e.id + (e.data?.label || '')))]);

  const saveQuestion = async () => {
    setSaving(true);
    try {
      const restUrl = window.dt?.restUrl;
      if (restUrl) {
        await fetch(`${restUrl}node/${postId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.dt?.nonce || '' },
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
      const restUrl = window.dt?.restUrl;
      if (restUrl) {
        await fetch(`${restUrl}node/${postId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.dt?.nonce || '' },
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
      const restUrl = window.dt?.restUrl;
      if (restUrl) {
        await fetch(`${restUrl}node/${postId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.dt?.nonce || '' },
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

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const restUrl = window.dt?.restUrl;
      if (restUrl) {
        await fetch(`${restUrl}node/${postId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.dt?.nonce || '' },
          body: JSON.stringify({ admin_notes: notesDraft }),
        });
      }
      onUpdateNode?.(node.id, { adminNotes: notesDraft });
      setEditingNotes(false);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSavingNotes(false);
    }
  };

  const copyLegJson = async (items: Legislation[]) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(items, null, 2));
      setLegCopied(true);
      setTimeout(() => setLegCopied(false), 1500);
    } catch (e) {
      console.error('Clipboard write failed', e);
    }
  };

  const persistLeg = async (items: Legislation[]) => {
    setLegSaving(true);
    try {
      const restUrl = window.dt?.restUrl;
      if (restUrl) {
        await fetch(`${restUrl}node/${postId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.dt?.nonce || '' },
          body: JSON.stringify({ legislation: items }),
        });
      }
      onUpdateNode?.(node.id, { legislation: items });
      setEditingLeg(false);
      setLegJsonMode(false);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setLegSaving(false);
    }
  };

  const importLegJson = (mode: string) => {
    let parsed;
    try {
      parsed = JSON.parse(legJsonDraft);
      if (!Array.isArray(parsed)) throw new Error('Must be a JSON array [ ... ]');
      parsed = parsed.map(l => ({
        act:     String(l.act     || ''),
        section: String(l.section || ''),
        url:     String(l.url     || ''),
      }));
    } catch (e: unknown) {
      setLegJsonError((e as Error).message);
      return;
    }
    setLegDraft(mode === 'append' ? [...legDraft, ...parsed] : parsed);
    setLegJsonMode(false);
    setLegJsonError('');
  };

  const savePaths = async () => {
    setSavingPaths(true);
    try {
      const restUrl = window.dt?.restUrl;
      if (restUrl) {
        if (yesEdge) {
          await fetch(`${restUrl}node/${postId}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.dt?.nonce || '' },
            body: JSON.stringify({ decision_label: { answer: 'Yes', text: yesDraft } }),
          });
          onUpdateEdge(yesEdge.id, { label: yesDraft });
        }
        // TODO: PHP `decision_label` endpoint matches by answer only — with multiple No edges
        // all rows get the same label. Per-row editing needs target_id support server-side.
        for (const noEdge of noEdges) {
          const draft = noDrafts[noEdge.id] || '';
          await fetch(`${restUrl}node/${postId}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.dt?.nonce || '' },
            body: JSON.stringify({ decision_label: { answer: 'No', text: draft } }),
          });
          onUpdateEdge(noEdge.id, { label: draft });
        }
      }
      setEditingPaths(false);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSavingPaths(false);
    }
  };

  const saveBody = async () => {
    setSavingBody(true);
    try {
      const restUrl = window.dt?.restUrl;
      if (restUrl) {
        await fetch(`${restUrl}node/${postId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.dt?.nonce || '' },
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
    <div className='node-panel' style={{
      width: '35%', maxWidth: 415, padding: 16, borderLeft: `1px solid ${CHROME.panelBorder}`,
      background: CHROME.panelBg, overflowY: 'auto', fontSize: 13, flexShrink: 0      
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
                style={{ width: '100%', fontSize: 13, fontWeight: 700, padding: '3px 6px', borderRadius: 3, border: `1px solid ${CHROME.inputBorder}`, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                <button onClick={saveTitle} disabled={savingTitle}
                  style={{ background: STATUS_COLORS_BUTTON.start, color: '#fff', border: 'none', borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                  {savingTitle ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditingTitle(false)}
                  style={{ background: CHROME.btnNeutralBg, color: CHROME.btnNeutralText, border: 'none', borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <h3 style={{ margin: 0, fontSize: 14, lineHeight: 1.4 }}>
              {decodeEntities(d.label)}
              <button onClick={() => { setTitleDraft(d.label); setEditingTitle(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: STATUS_COLORS_BUTTON.start, fontWeight: 600, marginLeft: 6, padding: 0 }}
                title="Edit title"
              >✎</button>
            </h3>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: CHROME.textSubtle, flexShrink: 0 }}
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Status badge */}
      <span style={{
        display: 'inline-block', padding: '2px 9px', borderRadius: 12,
        background: color.base, color: '#fff', fontSize: 11, marginBottom: 10,
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
                style={{ background: 'none', border: `1px solid ${STATUS_COLORS_BUTTON.start}`, color: STATUS_COLORS_BUTTON.start, borderRadius: 4, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                ↺ Unset start
              </button>
            )}
            {canSetStart && (
              <button
                onClick={() => onSetStart(node.id)}
                style={{ background: STATUS_COLORS_BUTTON.start, color: '#fff', border: 'none', borderRadius: 4, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                ▶ Set as start
              </button>
            )}
            {canMarkEnd && (
              <button
                onClick={() => onMarkTerminal(node.id)}
                style={{ background: STATUS_COLORS_BUTTON.terminal, color: '#fff', border: 'none', borderRadius: 4, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                ■ Mark as end
              </button>
            )}
            {canUnmark && (
              <button
                onClick={() => onUnmarkTerminal(node.id)}
                style={{ background: 'none', border: `1px solid ${STATUS_COLORS_BUTTON.terminal}`, color: STATUS_COLORS_BUTTON.terminal, borderRadius: 4, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
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
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: STATUS_COLORS_BUTTON.start, fontWeight: 600 }}
              title="Edit question"
            >
              ✎ edit
            </button>
          )}
        </span>
      }>
        {editingQ ? (
          <div>
            <RichTextEditor
              value={questionDraft}
              onChange={setQuestionDraft}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
              <button
                onClick={saveQuestion}
                disabled={saving}
                style={{ background: STATUS_COLORS_BUTTON.start, color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setEditingQ(false)}
                style={{ background: CHROME.btnNeutralBg, color: CHROME.btnNeutralText, border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          d.question
            ? <div style={{ margin: 0, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: d.question }} />
            : <p style={{ margin: 0, color: d.isTerminal ? '#888' : '#c0392b', fontStyle: 'italic' }}>
                {d.isTerminal ? 'End node — no question' : '⚠ No question_text set'}
              </p>
        )}
      </Section>

      {/* Best practice callout — always shown, editable */}
      <Section title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Best practice callout
          {!editingCallout && (
            <button
              onClick={() => { setCalloutDraft(d.callout || ''); setEditingCallout(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: STATUS_COLORS_BUTTON.start, fontWeight: 600 }}
            >
              ✎ {d.callout ? 'Edit' : 'Add'}
            </button>
          )}
        </span>
      }>
        {editingCallout ? (
          <div>
            <RichTextEditor
              value={calloutDraft}
              onChange={setCalloutDraft}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
              <button onClick={saveCallout} disabled={savingCallout}
                style={{ background: STATUS_COLORS_BUTTON.start, color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                {savingCallout ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditingCallout(false)}
                style={{ background: CHROME.btnNeutralBg, color: CHROME.btnNeutralText, border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          d.callout
            ? <div style={{ margin: 0, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: d.callout }} />
            : <p style={{ margin: 0, color: CHROME.textPlaceholder, fontStyle: 'italic', fontSize: 12 }}>None set</p>
        )}
      </Section>

      {/* Body content — always shown, editable (plain text / HTML) */}
      <Section title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Body content
          {!editingBody && (
            <button
              onClick={() => { setBodyDraft(d.rawContent || d.content || ''); setEditingBody(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: STATUS_COLORS_BUTTON.start, fontWeight: 600 }}
            >
              ✎ {(d.rawContent || d.content) ? 'Edit' : 'Add'}
            </button>
          )}
        </span>
      }>
        {editingBody ? (
          <div>
            <RichTextEditor
              value={bodyDraft}
              onChange={setBodyDraft}
            />
            {/* <p style={{ margin: '4px 0 5px', fontSize: 10, color: CHROME.textPlaceholder }}>HTML tags are allowed (p, strong, em, ul, li…)</p> */}
            <div style={{ display: 'flex', margin: '4px 0 5px', gap: 6 }}>
              <button onClick={saveBody} disabled={savingBody}
                style={{ background: STATUS_COLORS_BUTTON.start, color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                {savingBody ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditingBody(false)}
                style={{ background: CHROME.btnNeutralBg, color: CHROME.btnNeutralText, border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          d.content
            ? <div style={{ lineHeight: 1.55, fontSize: 12, color: CHROME.textPrimary }} dangerouslySetInnerHTML={{ __html: d.content }} />
            : <p style={{ margin: 0, color: CHROME.textPlaceholder, fontStyle: 'italic', fontSize: 12 }}>None set</p>
        )}
      </Section>

      {/* Legislation — full CRUD + JSON copy/import */}
      <Section title={
        <span className='legislation' style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          Legislation{d.legislation?.length > 0 ? ` (${d.legislation.length})` : ''}
          {!editingLeg && (
            <button
              onClick={() => { setLegDraft((d.legislation || []).map(l => ({ ...l }))); setEditingLeg(true); setLegJsonMode(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: STATUS_COLORS_BUTTON.start, fontWeight: 600 }}
            >
              ✎ {d.legislation?.length > 0 ? 'Manage' : 'Add'}
            </button>
          )}
          {!editingLeg && d.legislation?.length > 0 && (
            <button
              onClick={() => copyLegJson(d.legislation)}
              title="Copy all as JSON"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: legCopied ? STATUS_COLORS.start.base : 'inherit', fontWeight: 600 }}
            >
              {legCopied ? '✓ Copied' : '⎘ Copy'}
            </button>
          )}
        </span>
      }>
        {editingLeg ? (
          <div>
            {legDraft.map((item, i) => (
              <div key={i} style={{ marginBottom: 8, padding: '7px 8px', background: CHROME.rowBg, borderRadius: 4, position: 'relative' }}>
                <button
                  onClick={() => setLegDraft(prev => prev.filter((_, j) => j !== i))}
                  style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 'none', color: STATUS_COLORS_BUTTON.orphan, cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}
                  title="Remove item"
                >×</button>
                <input
                  placeholder="Act name"
                  value={item.act}
                  onChange={e => setLegDraft(prev => prev.map((x, j) => j === i ? { ...x, act: e.target.value } : x))}
                  style={{ width: '100%', fontSize: 12, padding: '3px 5px', borderRadius: 3, border: `1px solid ${CHROME.inputBorder}`, boxSizing: 'border-box', marginBottom: 3 }}
                />
                <input
                  placeholder="Section reference"
                  value={item.section}
                  onChange={e => setLegDraft(prev => prev.map((x, j) => j === i ? { ...x, section: e.target.value } : x))}
                  style={{ width: '100%', fontSize: 11, padding: '3px 5px', borderRadius: 3, border: `1px solid ${CHROME.inputBorder}`, boxSizing: 'border-box', marginBottom: 3 }}
                />
                <input
                  placeholder="URL"
                  value={item.url}
                  onChange={e => setLegDraft(prev => prev.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                  style={{ width: '100%', fontSize: 11, padding: '3px 5px', backgroundColor: CHROME.inputBgReadonly, borderRadius: 3, border: `1px solid ${CHROME.inputBorder}`, boxSizing: 'border-box' }}
                />
              </div>
            ))}

            <button
              onClick={() => setLegDraft(prev => [...prev, { act: '', section: '', url: '' }])}
              style={{ fontSize: 11, color: STATUS_COLORS_BUTTON.start, background: 'none', border: `1px dashed ${STATUS_COLORS_BUTTON.start}`, borderRadius: 3, padding: '3px 8px', cursor: 'pointer', marginBottom: 8, width: '100%' }}
            >
              + Add item
            </button>

            {/* JSON import toggle */}
            {!legJsonMode ? (
              <button
                onClick={() => { setLegJsonDraft(JSON.stringify(legDraft, null, 2)); setLegJsonMode(true); setLegJsonError(''); }}
                style={{ fontSize: 11, color: CHROME.textSecondary, background: 'none', border: `1px solid ${CHROME.panelBorder}`, borderRadius: 3, padding: '3px 8px', cursor: 'pointer', marginBottom: 8, width: '100%' }}
              >
                📋 Import / paste JSON
              </button>
            ) : (
              <div style={{ marginBottom: 8 }}>
                <textarea
                  value={legJsonDraft}
                  onChange={e => { setLegJsonDraft(e.target.value); setLegJsonError(''); }}
                  rows={6}
                  placeholder='[{"act": "", "section": "", "url": ""}]'
                  style={{ width: '100%', fontSize: 11, boxSizing: 'border-box', padding: 5, borderRadius: 3, border: `1px solid ${CHROME.inputBorder}`, resize: 'vertical', fontFamily: 'monospace' }}
                />
                {legJsonError && <p style={{ margin: '3px 0 4px', fontSize: 10, color: STATUS_COLORS_BUTTON.orphan }}>⚠ {legJsonError}</p>}
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={() => importLegJson('replace')} style={{ background: STATUS_COLORS_BUTTON.terminal, color: '#fff', border: 'none', borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>Replace all</button>
                  <button onClick={() => importLegJson('append')}  style={{ background: CHROME.textSecondary,    color: '#fff', border: 'none', borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>Append</button>
                  <button onClick={() => setLegJsonMode(false)}    style={{ background: CHROME.btnNeutralBg,    color: CHROME.btnNeutralText, border: 'none', borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={() => persistLeg(legDraft)} disabled={legSaving}
                style={{ background: STATUS_COLORS_BUTTON.start, color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                {legSaving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditingLeg(false); setLegJsonMode(false); }}
                style={{ background: CHROME.btnNeutralBg, color: CHROME.btnNeutralText, border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => copyLegJson(legDraft)} title="Copy draft as JSON"
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: legCopied ? STATUS_COLORS.start.base : CHROME.textPrimary, fontWeight: 600, padding: 0 }}>
                {legCopied ? '✓ Copied' : '⎘ Copy'}
              </button>
            </div>
          </div>
        ) : (
          d.legislation?.length > 0 ? (() => {
            // Group by act name for readability when multiple sections share the same act
            const groups: { act: string; items: Legislation[] }[] = [];
            const seen: Record<string, Legislation[]> = {};
            for (const l of d.legislation) {
              const key = l.act || '(No act)';
              if (!seen[key]) { seen[key] = []; groups.push({ act: key, items: seen[key] }); }
              seen[key].push(l);
            }
            return (
              <div>
                {groups.map((g, gi) => (
                  <div key={gi} style={{ marginBottom: gi < groups.length - 1 ? 8 : 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: CHROME.textPrimary, marginBottom: 3 }}>{g.act}</div>
                    <ul style={{ margin: 0, paddingLeft: 14 }}>
                      {g.items.map((l: Legislation, li: number) => (
                        <li key={li} style={{ marginBottom: 3, lineHeight: 1.4 }}>
                          {l.url
                            ? <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: STATUS_COLORS_BUTTON.terminal, fontSize: 12 }}>{l.section || l.url}</a>
                            : <span style={{ fontSize: 12, color: CHROME.textSecondary }}>{l.section || '—'}</span>
                          }
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })() : (
            <p style={{ margin: 0, color: CHROME.textPlaceholder, fontStyle: 'italic', fontSize: 12 }}>None set</p>
          )
        )}
      </Section>

      {/* Admin notes — editor-only, never shown in viewer or wizard */}
      <Section title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Admin notes
          <span style={{ fontSize: 9, background: CHROME.btnNeutralBg, color: CHROME.textSubtle, borderRadius: 3, padding: '1px 5px', fontWeight: 600, letterSpacing: '0.04em' }}>EDITOR ONLY</span>
          {!editingNotes && (
            <button
              onClick={() => { setNotesDraft(d.adminNotes || ''); setEditingNotes(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: STATUS_COLORS_BUTTON.start, fontWeight: 600 }}
            >
              ✎ {d.adminNotes ? 'Edit' : 'Add'}
            </button>
          )}
        </span>
      }>
        {editingNotes ? (
          <div>
            <RichTextEditor
              value={notesDraft}
              onChange={setNotesDraft}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
              <button onClick={saveNotes} disabled={savingNotes}
                style={{ background: STATUS_COLORS_BUTTON.start, color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                {savingNotes ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditingNotes(false)}
                style={{ background: CHROME.btnNeutralBg, color: CHROME.btnNeutralText, border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          d.adminNotes
            ? <div style={{ margin: 0, lineHeight: 1.5, fontSize: 12, color: CHROME.textSecondary }} dangerouslySetInnerHTML={{ __html: d.adminNotes }} />
            : <p style={{ margin: 0, color: CHROME.textPlaceholder, fontStyle: 'italic', fontSize: 12 }}>None</p>
        )}
      </Section>

      {/* Decision paths — large nav buttons at bottom */}
      {!d.isTerminal && (
        <Section title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Decision paths
            {!editingPaths && (yesEdge || noEdges.length > 0) && (
              <button
                onClick={() => { setYesDraft(yesEdge?.data?.label || ''); setNoDrafts(Object.fromEntries(noEdges.map(e => [e.id, e.data?.label || '']))); setEditingPaths(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: STATUS_COLORS_BUTTON.start, fontWeight: 600 }}
              >✎ edit labels</button>
            )}
          </span>
        }>
          {editingPaths ? (
            <div>
              {yesEdge && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: EDGE_COLORS.yes.text, marginBottom: 3 }}>Yes label</label>
                  <input
                    value={yesDraft}
                    onChange={e => setYesDraft(e.target.value)}
                    placeholder="Label for Yes path…"
                    style={{ width: '100%', fontSize: 12, padding: '3px 6px', borderRadius: 3, border: `1px solid ${CHROME.inputBorder}`, boxSizing: 'border-box' }}
                  />
                </div>
              )}
              {noEdges.map(noEdge => (
                <div key={noEdge.id} style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: EDGE_COLORS.no.text, marginBottom: 3 }}>
                    No label{noEdges.length > 1 ? ` — ${noEdge.data?.label || noEdge.target}` : ''}
                  </label>
                  <input
                    value={noDrafts[noEdge.id] || ''}
                    onChange={e => setNoDrafts(prev => ({ ...prev, [noEdge.id]: e.target.value }))}
                    placeholder="Label for No path…"
                    style={{ width: '100%', fontSize: 12, padding: '3px 6px', borderRadius: 3, border: `1px solid ${CHROME.inputBorder}`, boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button onClick={savePaths} disabled={savingPaths}
                  style={{ background: STATUS_COLORS_BUTTON.start, color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                  {savingPaths ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditingPaths(false)}
                  style={{ background: CHROME.btnNeutralBg, color: CHROME.btnNeutralText, border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 11, color: CHROME.textPlaceholder, fontStyle: 'italic' }}>
                Drag from a node handle to create a new connection.
              </p>
            </div>
          ) : (
            <div>
              <DecisionPathCards yesEdge={yesEdge} noEdges={noEdges} onSelectNode={onSelectNode} />
              <p style={{ margin: '8px 0 0', fontSize: 11, color: CHROME.textPlaceholder, fontStyle: 'italic' }}>
                Click a card to go to that step. Drag from a node handle to create a connection.
              </p>
            </div>
          )}
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
            background: STATUS_COLORS_BUTTON.start, color: '#fff', borderRadius: 4,
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
              background: 'none', border: `1px solid ${STATUS_COLORS_BUTTON.orphan}`, color: STATUS_COLORS_BUTTON.orphan,
              borderRadius: 4, padding: '7px 12px 4px 12px', fontSize: 12,
              cursor: 'pointer', width: '100%',
            }}
          >
            🗑 Delete this step
          </button>
          <p style={{ margin: '5px 0 0', fontSize: 10, color: CHROME.textPlaceholder, textAlign: 'center' }}>
            Moves to WP trash. Existing connections to this step will be removed.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className='section' style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em',
        color: CHROME.textPrimary, marginBottom: 5, fontWeight: 600,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (!containerRef.current || quillRef.current) return;

    quillRef.current = new Quill(containerRef.current, {
      theme: 'snow',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          [{ header: [1, 2, 3, false] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'blockquote'],
          ['clean'],
        ],
      },
    });

    quillRef.current.on('text-change', () => {
      onChange(quillRef.current!.root.innerHTML);
    });
  }, [onChange]);

  useEffect(() => {
    const q = quillRef.current;
    if (!q) return;
    const html = value || '';
    if (q.root.innerHTML !== html) {
      q.root.innerHTML = html;
    }
  }, [value]);

  return <div ref={containerRef} style={{ minHeight: 120, border: `1px solid ${CHROME.inputBorder}`, borderRadius: 4 }} />;
}




// Editable path row with inline label editing and delete connection option
interface EditablePathRowProps {
  answer: string;
  textColour: string;
  borderColour?: string;
  bg: string;
  label?: string;
  warn?: boolean;
  edgeId?: string;
  sourcePostId?: string;
  onUpdateEdge?: (edgeId: string, patch: Record<string, unknown>) => void;
  onDelete?: () => void;
}
function EditablePathRow({ answer, borderColour, textColour, bg, label, warn, edgeId, sourcePostId, onUpdateEdge, onDelete }: EditablePathRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(label || '');
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const restUrl = window.dt?.restUrl;
      if (restUrl) {
        await fetch(`${restUrl}node/${sourcePostId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.dt?.nonce || '' },
          body: JSON.stringify({ decision_label: { answer, text: draft } }),
        });
      }
      if (edgeId) onUpdateEdge?.(edgeId, { label: draft });
      setEditing(false);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='editable-path-row' style={{ marginBottom: 8, fontSize: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          background: bg, border: `1px solid ${borderColour}`, color: textColour,
          borderRadius: 10, padding: '1px 7px', fontWeight: 700,
          fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {answer}
        </span>
        {!editing && !warn && (
          <>
            <span style={{ color: CHROME.textPrimary, flex: 1 }}>{label || '—'}</span>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              {edgeId && (
                <button
                  onClick={() => { setDraft(label || ''); setEditing(true); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: STATUS_COLORS_BUTTON.start, fontWeight: 600 }}
                  title="Edit label"
                >✎</button>
              )}
              {edgeId && onDelete && (
                <button
                  onClick={() => window.confirm(`Remove the ${answer} connection from this node?`) && onDelete()}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, color: STATUS_COLORS_BUTTON.orphan, fontWeight: 700, lineHeight: 1 }}
                  title="Remove connection"
                >×</button>
              )}
            </div>
          </>
        )}
        {!editing && warn && (
          <span style={{ color: STATUS_COLORS_BUTTON.orphan, fontStyle: 'italic' }}>{label}</span>
        )}
      </div>
      {editing && (
        <div style={{ marginTop: 5 }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            autoFocus
            style={{ width: '100%', fontSize: 12, padding: '3px 6px', borderRadius: 3, border: `1px solid ${CHROME.inputBorder}`, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
            <button onClick={save} disabled={saving}
              style={{ background: STATUS_COLORS_BUTTON.start, color: '#fff', border: 'none', borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)}
              style={{ background: CHROME.btnNeutralBg, color: CHROME.btnNeutralText, border: 'none', borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Keep plain PathRow for any other uses
function PathRow({ answer, color, bg, label, warn }: { answer: string; color: string; bg: string; label?: string; warn?: boolean }) {
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
      <span style={{ color: warn ? STATUS_COLORS.orphan.base : CHROME.textPrimary, fontStyle: warn ? 'italic' : 'normal' }}>
        {label || '—'}
      </span>
    </div>
  );
}
